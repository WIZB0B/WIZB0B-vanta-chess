// Vanta Chess chat moderation, "moderate" (mid) setting. One pure ES module shared by the `chess`
// Edge Function (Deno) and the browser (src/moderation.js re-exports it). No I/O; the only clock
// read is the `now` default.
//
// WHAT IS CHECKED
//   moderateText(text) folds the text first: lower case, accents stripped, look-alike letters
//   (Cyrillic/Greek homoglyphs, fullwidth, small caps, regional-indicator letters) mapped to Latin,
//   leetspeak mapped (0 o, 1 | i/l, 3 e, 4 @ a, 5 $ s, 7 t, 8 b, 9 g, interior ! i), zero-width
//   characters dropped, 3+ repeated letters collapsed, and words split by separators rejoined
//   ("f.u.c.k", "f u c k", "f-u-c-k"). Matching is per word, never a raw substring scan: most terms
//   must be the whole word (plus simple endings); a few unambiguous roots may sit inside a longer
//   word, with an allowlist for real words that contain them (Scunthorpe, shiitake, snigger...).
//
// POLICY
//   Allowed: all chess talk ("mate", "hang", "sac", "kill the bishop", "Bxh7+"), normal sentences,
//     and MILD words: damn, hell, crap, sucks, wtf, ffs, ass, piss, and rude words aimed at nobody
//     ("stupid move", "I'm such an idiot", "you suck"). Mild words are reported as severity 'mild'
//     but the message goes out unchanged and nobody is punished.
//   Blocked, STRONG: profanity (the f-word in every spelling, "what the f..." spelled out
//     included), sexual or explicit content, and insults aimed at the other player ("you are
//     trash", "ur an idiot", "you clown", "stfu").
//   Blocked, SEVERE (severity 'slur'): slurs (racial, homophobic and transphobic, ableist), hate
//     slogans, threats, and telling someone to harm themselves ("kys", "kill yourself").
//   Words the writer already masked ("f*ck", "sh*t") read like our own masking and are allowed,
//     except slurs and threats, which are caught even when masked.
//
// MUTE LADDER
//   A blocked message is never sent and adds strikes: strong = 1, slur or threat = 2 (it skips a
//   step). The total picks the sanction:
//     strike 1   warning only (no mute)       strike 5   muted 1 month (30 days)
//     strike 2   muted 2 hours                strike 6   muted 6 months (180 days)
//     strike 3   muted 1 day                  strike 7   muted 1 year
//     strike 4   muted 1 week                 strike 8+  muted permanently
//   Strikes clear together after STRIKE_DECAY_DAYS without a new strike, counted from the end of
//   the last mute (so a 6-month mute can't quietly run out the clock on the record).
import { isReactionBody } from './reaction-ids.js';
export { isReactionBody };

const HOUR = 3600000, DAY = 24 * HOUR;
export const STRIKE_DECAY_DAYS = 180;
const DECAY_MS = STRIKE_DECAY_DAYS * DAY;
export const SLUR_STRIKES = 2;
// muted_until is a timestamptz; store this for a permanent mute so existing "muted until" checks
// keep working (nextSanction itself reports permanent: true and mutedUntil: null).
export const PERMANENT_MUTE_UNTIL = '9999-12-31T23:59:59.000Z';
// Longer input is cut to this many characters before checking (chat bodies are at most 280).
export const MODERATION_MAX_CHARS = 2000;

const rung = (strike, label, ms, duration, mute) => Object.freeze({ strike, label, ms, duration, mute });
export const MUTE_LADDER = Object.freeze([
  rung(1, 'Warning', 0, null, 'warning'),
  rung(2, 'Muted for 2 hours', 2 * HOUR, '2 hours', '2-hour mute'),
  rung(3, 'Muted for 1 day', DAY, '1 day', '1-day mute'),
  rung(4, 'Muted for 1 week', 7 * DAY, '1 week', '1-week mute'),
  rung(5, 'Muted for 1 month', 30 * DAY, '1 month', '1-month mute'),
  rung(6, 'Muted for 6 months', 180 * DAY, '6 months', '6-month mute'),
  rung(7, 'Muted for 1 year', 365 * DAY, '1 year', '1-year mute'),
  rung(8, 'Muted permanently', null, null, 'permanent mute'),
]);

// ---- Word lists ----------------------------------------------------------------------------
// Each row: "<term written backwards> <severity> <category> <mode> [endings] [unless-next]".
//   severity  M mild (allowed), S strong (blocked), X severe (blocked, counts double)
//   mode      word  = the whole word, optionally plus one of the '|'-separated endings
//                     (default "|s": the word or its plural; "|" = the bare word only)
//             start = any word that starts with the term
//             any   = the term anywhere inside a word (only for roots no real word contains,
//                     apart from those on ALLOW)
//   unless-next  comma-separated next words that make it innocent ("chink in the armour").
// Terms are stored reversed only so the file doesn't read as a list of insults; to review them:
//   node -e "import('./supabase/functions/chess/moderation.js').then(m=>console.log(m.reviewTerms()))"
const TERMS = [
  'kcuf S profanity any',
  'kcf S profanity start',
  'kuf S profanity start',
  'quf S profanity start',
  'kcuhp S profanity start',
  'kuhp S profanity start',
  'kucf S profanity start',
  'tihs S profanity any',
  'tnuc S profanity any',
  'hctib S profanity any',
  'elohssa S profanity any',
  'elohesra S profanity any',
  'dratsab S profanity word',
  'tawt S profanity word',
  'knaw S profanity start',
  'kcoc S profanity word',
  'kcuskcoc S profanity any',
  'kcid S profanity word |s|head|heads|face|wad|wads',
  'ufts S harassment word |',
  'oftg S harassment word |',
  'akyc S profanity word |',
  'taylb S profanity word |',
  'daylb S profanity word |',
  'awruk S profanity word |',
  'atup S profanity word',
  'otup S profanity word',
  'adreim S profanity word |',
  'redoj S profanity word |',
  'ojednep S profanity word',
  'norbac S profanity word |es',
  'agrev S profanity word',
  'ozzac S profanity word |',
  'ohlarac S profanity word |',
  'adrem S profanity word |',
  'edrem S profanity word |',
  'niatup S profanity word |',
  'drannoc S profanity word',
  'epolas S profanity word',
  'essiehcs S profanity word |',
  'hcolhcsra S profanity word |',
  'nhosneruh S profanity word |',
  'adzip S profanity word |',
  'upsoro S profanity word |',
  'dohcnehb S profanity word |',
  'dohcneheb S profanity word |',
  'dohcradam S profanity word |',
  'ayituhc S profanity word |',
  'nrop S sexual start',
  'ssup S sexual word y|ies',
  'sinep S sexual word |es',
  'anigav S sexual word',
  'tilc S sexual word |s|oris',
  'odlid S sexual word |s|es',
  'bojwolb S sexual word',
  'bojdnah S sexual word',
  'bojmir S sexual word',
  'muc S sexual word |s|ming|shot|shots',
  'zzij S sexual start',
  'ynroh S sexual word |',
  'boob S sexual word s|ies',
  'tit S sexual word s|ties|ty',
  'iatneh S sexual word |',
  'flim S sexual word',
  'msdb S sexual word |',
  'tuls S sexual any',
  'erohw S sexual any',
  'eoh S sexual word',
  'toht S sexual word',
  'knaks S sexual word |s|y',
  'epar S sexual word |d|s',
  'gnipar S sexual word |',
  'tsipar S sexual word',
  'tselom S sexual start',
  'odep S sexual start',
  'odeap S sexual start',
  'msagro S sexual start',
  'tabrutsam S sexual start',
  'ggin X slur any',
  'gin X slur word',
  'nooc X slur word',
  'knihc X slur word  in',
  'koog X slur word',
  'cips X slur word |s|k|ks and,n',
  'kcabtew X slur word',
  'renaeb X slur word',
  'ekik X slur word',
  'daehgar X slur word',
  'daehlewot X slur word',
  'ikap X slur word',
  'ogad X slur word |s|es',
  'daehreppiz X slur word',
  'ggaf X slur any',
  'gaf X slur word',
  'ekyd X slur word',
  'nnart X slur word y|ies',
  'elamehs X slur word',
  'obsel X slur word',
  'omoh X slur word  sapiens,erectus,habilis',
  'retfoop X slur word',
  'nociram X slur word |es',
  'drater X slur start',
  'drat X slur word',
  'zaps X slur word |z|zes|zed',
  'diolognom X slur word',
  'syk X threat word |',
  'nmad M profanity any',
  'timmad M profanity word |',
  'lleh M profanity word',
  'kceh M profanity word |',
  'parc M profanity word |s|py|ped',
  'kcus M profanity word |s|ed|er|ers|ing|y',
  'ftw M profanity word |',
  'htw M profanity word |',
  'gfmo M profanity word |',
  'sff M profanity word |',
  'oafml M profanity word |',
  'ssa M profanity word |es',
  'esra M profanity word',
  'ydoolb M profanity word |',
  'reggub M profanity word |s|ed',
  'ssip M profanity word |ed|es|ing',
  'wercs M profanity word |ed',
  'kcirf M profanity word |in|ing|en',
  'gnikaerf M profanity word |',
  'nikaerf M profanity word |',
  'nrad M profanity word |',
  'skcollob M profanity word |',
  'sb M profanity word |',
  'krej M insult word',
  'toidi M insult word |s|ic',
  'norom M insult word |s|ic',
  'diputs M insult word |',
  'bmud M insult word |',
  'ssabmud M insult word |es',
  'ssakcaj M insult word |es',
  'ehcuod M insult word |s|bag|bags',
  'kcirp M insult word',
  'gabmucs M insult word',
];

// Real words (and common names) that contain a "start"/"any" root; a hit fully inside one of
// these is ignored. Prefixes work too: "snigg" covers snigger, sniggers, sniggering.
const ALLOW = [
  'scunthorpe', 'mishit', 'shitake', 'shitzu', 'dikshit', 'matsushita', 'ashita', 'shitai', 'shittu',
  'shittah', 'shittim', 'snigg', 'niggl', 'niggard', 'retardant', 'pedometer', 'wankel',
  'fukushima', 'fukuoka', 'fukuda', 'fukui', 'fukuyama', 'fukuzawa', 'fuqua',
];

// Phrases: [severity, category, skip after a negation ("don't kill yourself over it"), pattern].
// {a|b} expands to alternatives; an alternative may be several words.
const PHRASE_ROWS = [
  ['X', 'threat', 1, 'kill {yourself|yourselves|urself|urselves|your self|ur self|yo self|yoself|youself|uself|u self|thyself}'],
  ['X', 'threat', 1, '{hang|neck|end|unalive|off|shoot|stab} {yourself|urself|your self|ur self|u self|yoself}'],
  ['X', 'threat', 1, 'end {your|ur} life'],
  ['X', 'threat', 1, 'drink bleach'],
  ['X', 'threat', 1, 'go die'],
  ['X', 'threat', 0, '{hope|wish} {you|u} {die|dies|get cancer|got cancer}'],
  ['X', 'threat', 0, '{you|u} should {die|be dead}'],
  ['X', 'threat', 0, 'die in a {fire|hole}'],
  ['X', 'threat', 0, 'i know where {you|u} live'],
  ['X', 'threat', 0, '{kill|find|hurt|shoot} {you|u} irl'],
  ['X', 'threat', 0, 'kill {your|ur} {family|mom|mum|mother|dad|father|kids}'],
  ['X', 'threat', 0, 'rape {you|u|your|ur}'],
  ['X', 'slur', 0, 'heil hitler'],
  ['X', 'slur', 0, 'sieg heil'],
  ['X', 'slur', 0, 'gas the jews'],
  ['X', 'slur', 0, 'porch monkey'],
  ['X', 'slur', 0, 'jungle bunny'],
  ['S', 'sexual', 0, 'send {nudes|noods}'],
  ['S', 'sexual', 0, '{have|had|having|wanna|want} sex'],
  ['S', 'sexual', 0, 'sex with {me|you|u}'],
  ['S', 'sexual', 0, 'suck my {balls|nuts}'],
  ['S', 'sexual', 0, 'blow me'],
  ['S', 'sexual', 0, '{jerk|jack|jerking|jacking|jerked} off'],
  ['S', 'sexual', 0, '{anal|oral} sex'],
  ['S', 'sexual', 0, 'sit on my face'],
  ['M', 'rude', 0, 'shut up'],
  ['M', 'rude', 0, 'screw {you|u}'],
  ['M', 'rude', 0, '{you|u} suck'],
  ['M', 'rude', 0, 'piss off'],
  ['M', 'rude', 0, 'go to hell'],
];

// Insults aimed at the other player: "you (are) (a) X", "you're X", "ur a X", "are you X".
const words = s => new Set(s.split(' '));
const YOU = words('you u ya yu yuo');
const YOU_ARE = words('youre ure');
const YOUR = words('ur your yur yor yer'); // "your trash" often means "you're trash"
const ARE = words('are r re is iz ar');
const FILLERS = words('a an such so the really literally just actually total totally complete completely absolute absolutely utter utterly freaking freakin fricking frickin damn bloody very truly big huge little lil pure straight being acting one definitely clearly obviously honestly also too still always');
const VOCATIVE_FILLERS = words('little lil absolute complete total utter big freaking damn bloody');
const INSULT_WORDS = 'idiot idiots moron morons clown clowns loser losers scum scumbag scumbags imbecile imbeciles cretin cretins dumbass jackass prick pricks jerk jerks douche douchebag douchebags freak freaks dumbo pig pigs creep creeps parasite parasites stupid dumb ugly pathetic useless worthless braindead brainless disgusting subhuman';
const VOCATIVE = words(INSULT_WORDS); // "you idiot" (at the start of a clause)
const INSULTS = words(INSULT_WORDS + ' trash garbage failure disgrace joke waste embarrassment');
const TAIL = words('lol lmao lmfao haha hah xd bro bruh dude man kid noob at player af tbh fr honestly ok irl ngl too');
const LEADS = words('hey oi yo ok okay lol lmao bro man dude omg wow ugh haha shut up damn god bruh ah oh listen look');
const NEGATIONS = words('dont not never didnt wont doesnt shouldnt cant no wouldnt');
// One- and two-letter chat words: a spelled-out run made only of these is left alone ("go ok").
const COMMON_SHORT = words('a i u r k n y o x b c am an as at be by do go gg gl hf he hi if in is it me my no of oh ok on or so to up us we wp ya ye yo ur im id ty np gj um uh eh ah ha hm mm xd lo');

const SEVERITY = { M: 'mild', S: 'strong', X: 'slur' };
const RANK = { mild: 1, strong: 2, slur: 3 };
const flip = s => [...s].reverse().join('');

const ENTRIES = TERMS.map(row => {
  const [reversed, sev, cat, mode, endings = '', unless = ''] = row.split(' ');
  const term = flip(reversed);
  const forms = mode === 'word' ? [...new Set((endings || '|s').split('|').map(end => term + end))] : [term];
  return { term, name: forms[0], sev: SEVERITY[sev], cat, mode, forms, unlessNext: unless ? unless.split(',') : null, allow: [] };
});
const WORD_FORMS = new Map();
const STARTS = [], ANYWHERE = [];
for (const e of ENTRIES) {
  if (e.mode === 'word') for (const f of e.forms) WORD_FORMS.set(f, e);
  else (e.mode === 'start' ? STARTS : ANYWHERE).push(e);
  if (e.mode !== 'word') for (const a of ALLOW) for (let off = a.indexOf(e.term); off >= 0; off = a.indexOf(e.term, off + 1)) e.allow.push({ a, off });
}
const SEVERE_FORMS = [...WORD_FORMS].filter(([, e]) => e.sev === 'slur');
const SEVERE_ROOTS = [...STARTS, ...ANYWHERE].filter(e => e.sev === 'slur');

function expand(pattern) {
  const m = pattern.match(/\{([^{}]*)\}/);
  if (!m) return [pattern];
  return m[1].split('|').flatMap(alt => expand(pattern.slice(0, m.index) + alt + pattern.slice(m.index + m[0].length)));
}
const PHRASES = PHRASE_ROWS.flatMap(([sev, cat, guard, pattern]) => {
  const all = expand(pattern);
  return all.map(p => ({ toks: p.split(' '), name: all[0], sev: SEVERITY[sev], cat, guard: !!guard }));
});
const PHRASES_BY_FIRST = new Map();
for (const p of PHRASES) {
  if (!PHRASES_BY_FIRST.has(p.toks[0])) PHRASES_BY_FIRST.set(p.toks[0], []);
  PHRASES_BY_FIRST.get(p.toks[0]).push(p);
}
const SEVERE_PHRASES = PHRASES.filter(p => p.sev === 'slur');

// The decoded lists, for review only (see the note above TERMS).
export function reviewTerms() {
  return {
    terms: ENTRIES.map(e => ({ term: e.term, severity: e.sev, category: e.cat, mode: e.mode, forms: e.forms, unlessNext: e.unlessNext })),
    phrases: PHRASE_ROWS.map(([sev, cat, guard, pattern]) => ({ pattern, severity: SEVERITY[sev], category: cat, negationGuard: !!guard })),
    allow: [...ALLOW],
  };
}

// ---- Folding ---------------------------------------------------------------------------------
// Folded text is lower case; these two capitals mark a character that could be "i" or "l":
// I reads as "i" by default (1, |, a stray capital I), L as "l" (a small l among capitals).
const AMBIGUOUS = 'I', AMBIGUOUS_L = 'L';
const isAmbiguous = c => c === AMBIGUOUS || c === AMBIGUOUS_L;
const plainLetter = c => (c === AMBIGUOUS ? 'i' : c === AMBIGUOUS_L ? 'l' : c);
const LEET = { '0': 'o', '1': AMBIGUOUS, '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '9': 'g', '@': 'a', '$': 's', '\u20ac': 'e', '\u00a2': 'c' };
const INNER_LEET = { '!': 'i', '|': AMBIGUOUS, '+': 't' }; // only between two letters ("sh!t", not "gg!")
const JOINERS = new Set(["'", '\u2018', '\u2019', '`', '\u00b4', '\u02bc']); // "you're" -> "youre"
const MASKS = new Set(['*', '#']);
const BREAKS = new Set(['.', '!', '?', ',', ';', ':', '\u2026']); // a clause ends after these
const HOMOGLYPHS = {
  // Cyrillic
  '\u0430': 'a', '\u0432': 'b', '\u0433': 'r', '\u0435': 'e', '\u04bb': 'h', '\u0456': 'i', '\u0458': 'j', '\u043a': 'k',
  '\u043c': 'm', '\u043d': 'h', '\u043e': 'o', '\u043f': 'n', '\u0440': 'p', '\u0441': 'c', '\u0455': 's', '\u0442': 't',
  '\u0443': 'y', '\u0445': 'x', '\u044c': 'b', '\u051b': 'q', '\u051d': 'w',
  // Greek
  '\u03b1': 'a', '\u03b2': 'b', '\u03b3': 'y', '\u03b5': 'e', '\u03b7': 'n', '\u03b9': 'i', '\u03ba': 'k', '\u03bc': 'u',
  '\u03bd': 'v', '\u03bf': 'o', '\u03c1': 'p', '\u03c4': 't', '\u03c5': 'u', '\u03c7': 'x', '\u03c9': 'w',
  // Latin letters without a decomposition, IPA and small capitals
  '\u00f8': 'o', '\u0142': 'l', '\u0111': 'd', '\u0127': 'h', '\u0131': 'i', '\u00df': 'ss', '\u00e6': 'ae', '\u0153': 'oe',
  '\u0251': 'a', '\u0261': 'g', '\u1d00': 'a', '\u0299': 'b', '\u1d04': 'c', '\u1d05': 'd', '\u1d07': 'e', '\ua730': 'f',
  '\u0262': 'g', '\u029c': 'h', '\u026a': 'i', '\u1d0a': 'j', '\u1d0b': 'k', '\u029f': 'l', '\u1d0d': 'm', '\u0274': 'n',
  '\u1d0f': 'o', '\u1d18': 'p', '\u0280': 'r', '\ua731': 's', '\u1d1b': 't', '\u1d1c': 'u', '\u1d20': 'v', '\u1d21': 'w',
  '\u028f': 'y', '\u1d22': 'z',
};
const INVISIBLE = /^[\u00ad\u034f\u061c\u115f\u1160\u17b4\u17b5\u180b-\u180f\u200b-\u200f\u202a-\u202e\u2060-\u206f\u3164\ufe00-\ufe0f\ufeff\uffa0]$/;
const COMBINING = /\p{M}/gu;
const LETTER_OR_NUMBER = /^[\p{L}\p{N}]$/u;
const SPACE = /^\s$/u;
const FOLDED = new Map();

// One character of input -> zero or more lower-case characters.
function foldChar(ch) {
  const cp = ch.codePointAt(0);
  if (cp < 0x80) return ch.toLowerCase();
  let out = FOLDED.get(ch);
  if (out !== undefined) return out;
  if (INVISIBLE.test(ch) || (cp >= 0xe0000 && cp <= 0xe01ef)) out = '';
  else if (cp >= 0x1f1e6 && cp <= 0x1f1ff) out = String.fromCharCode(97 + cp - 0x1f1e6); // regional indicators
  else if (cp >= 0x1f130 && cp <= 0x1f189) out = String.fromCharCode(97 + ((cp - 0x1f130) % 0x20)); // squared / circled capitals
  else {
    out = '';
    for (const c of ch.normalize('NFKD').replace(COMBINING, '').toLowerCase()) out += HOMOGLYPHS[c] ?? c;
  }
  if (FOLDED.size > 4096) FOLDED.clear();
  FOLDED.set(ch, out);
  return out;
}
const isWordChar = c => (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || (c > '\x7f' && LETTER_OR_NUMBER.test(c));
const isCore = c => c !== undefined && (isWordChar(c) || Object.hasOwn(LEET, c));
const squash = s => s.replace(/(.)\1\1+/g, '$1$1'); // "fuuuuck" -> "fuuck", "asssss" -> "ass"

// Text -> tokens (whitespace-separated), each with its word parts, original span and clause break.
function scan(text) {
  const chars = Array.from(text);
  const raw = [];
  let cur = null;
  for (let i = 0; i < chars.length; i++) {
    for (const c of foldChar(chars[i])) {
      if (SPACE.test(c)) { if (cur) raw.push(cur); cur = null; continue; }
      (cur ||= []).push({ c, i, o: chars[i] });
    }
  }
  if (cur) raw.push(cur);
  const tokens = [];
  for (const units of raw) {
    const t = buildToken(units);
    if (t.word) tokens.push(t);
    else if (t.brk && tokens.length) tokens[tokens.length - 1].brk = true; // a lone "!!!" ends the clause
  }
  return { chars, tokens };
}

function buildToken(units) {
  const n = units.length;
  // Odd casing hides l/I swaps: "sIut" (capital I among small letters, not the first letter) or
  // "SlUT" (small l among capitals). Ordinary capitals ("Idiot", "Plan") read normally.
  let upper = 0, lower = 0, firstLetter = -1;
  units.forEach(({ o }, k) => {
    if (o >= 'A' && o <= 'Z') upper++; else if (o >= 'a' && o <= 'z') lower++; else return;
    if (firstLetter < 0) firstLetter = k;
  });
  const kinds = new Array(n), outs = new Array(n);
  for (let k = 0; k < n; k++) {
    const { c, o } = units[k];
    if (c >= 'a' && c <= 'z') {
      kinds[k] = 'w';
      outs[k] = o === 'I' && lower > upper && k !== firstLetter ? AMBIGUOUS : o === 'l' && upper > lower ? AMBIGUOUS_L : c;
    }
    else if (Object.hasOwn(LEET, c)) { kinds[k] = 'w'; outs[k] = LEET[c]; }
    else if (isWordChar(c)) { kinds[k] = 'w'; outs[k] = c; }
    else if (Object.hasOwn(INNER_LEET, c) && isCore(units[k - 1]?.c) && isCore(units[k + 1]?.c)) { kinds[k] = 'w'; outs[k] = INNER_LEET[c]; }
    else if (JOINERS.has(c) && isCore(units[k - 1]?.c) && isCore(units[k + 1]?.c)) kinds[k] = 'join';
    else kinds[k] = MASKS.has(c) ? 'mask' : 'sep';
  }
  // A run of * or # counts as a mask only between letters ("f*ck"); elsewhere it separates ("*sigh*").
  for (let k = 0; k < n; k++) {
    if (kinds[k] !== 'mask') continue;
    let m = k;
    while (m + 1 < n && kinds[m + 1] === 'mask') m++;
    if (kinds[k - 1] !== 'w' || kinds[m + 1] !== 'w') for (let x = k; x <= m; x++) kinds[x] = 'sep';
    k = m;
  }
  const parts = [], wilds = [];
  let part = null, seg = null, lastWord = -1;
  const endPart = () => { if (part) { part.s = squash(part.s); parts.push(part); } part = null; };
  const endSeg = () => { if (seg?.wild) { seg.s = squash(seg.s); wilds.push(seg); } seg = null; };
  for (let k = 0; k < n; k++) {
    const kind = kinds[k], i = units[k].i;
    if (kind === 'w') {
      part ||= { s: '', start: i, end: i }; part.s += outs[k]; part.end = i;
      seg ||= { s: '', start: i, end: i, wild: false }; seg.s += outs[k]; seg.end = i;
      lastWord = k;
    } else if (kind === 'mask') { endPart(); seg.s += '?'; seg.wild = true; seg.end = i; }
    else if (kind === 'sep') { endPart(); endSeg(); }
  }
  endPart(); endSeg();
  let brk = false;
  for (let k = lastWord + 1; k < n; k++) if (BREAKS.has(units[k].c)) brk = true;
  const masked = wilds.length > 0;
  const compact = !masked && parts.length > 1
    ? { s: squash(parts.map(p => p.s).join('')), start: parts[0].start, end: parts[parts.length - 1].end }
    : null;
  const main = masked ? wilds[0] : compact || parts[0] || null;
  return { parts, compact, wilds, masked, word: main ? main.s : '', start: main ? main.start : -1, end: main ? main.end : -1, brk, forms: null };
}

// Spellings to compare with the lists: i/l readings of ambiguous characters, and (for strong and
// severe terms only) doubled letters read singly ("fuuck", "shiit").
function variants(s) {
  const out = [], seen = new Set();
  const add = (v, dd) => { if (!seen.has(v)) { seen.add(v); out.push([v, dd]); } };
  let bases = [s];
  const ambiguous = [...s].filter(isAmbiguous).length;
  if (ambiguous > 3) bases = [s.replace(/[IL]/g, 'i'), s.replace(/[IL]/g, 'l')];
  else if (ambiguous) {
    bases = [''];
    for (const ch of s) bases = isAmbiguous(ch) ? bases.flatMap(b => [b + 'i', b + 'l']) : bases.map(b => b + ch);
  }
  for (const b of bases) add(b, false);
  for (const b of bases) for (const d of singleLetters(b)) add(d, true);
  return out;
}
function singleLetters(s) {
  const runs = [];
  for (let k = 0; k + 1 < s.length; k++) if (s[k] === s[k + 1] && s[k] >= 'a' && s[k] <= 'z') { runs.push(k); k++; }
  if (!runs.length) return [];
  if (runs.length > 3) return [s.replace(/([a-z])\1/g, '$1')];
  const out = [];
  for (let mask = 1; mask < 1 << runs.length; mask++) {
    let v = '', from = 0;
    runs.forEach((r, j) => { if (mask & (1 << j)) { v += s.slice(from, r); from = r + 1; } });
    out.push(v + s.slice(from));
  }
  return out;
}
const formsOf = t => t.forms ||= t.masked ? new Set() : new Set(variants(t.word).map(([v]) => v));
const has = (tokens, k, set) => {
  const t = tokens[k];
  if (!t || t.masked) return null;
  for (const f of formsOf(t)) if (set.has(f)) return f;
  return null;
};
const covered = (e, v, p) => e.allow.some(({ a, off }) => p >= off && v.startsWith(a, p - off));
const nextBlocks = (e, tokens, j) => !!e.unlessNext && !tokens[j].brk && !!tokens[j + 1] && e.unlessNext.some(w => formsOf(tokens[j + 1]).has(w));

// Compare a masked word ("n?gg?r") with a term: same letters where not masked, at most half the
// term masked, and the first letter shown.
function wildEq(w, pos, term) {
  let masked = 0;
  for (let k = 0; k < term.length; k++) {
    const c = w[pos + k];
    if (c === undefined) return false;
    if (c === '?') masked++;
    else if (c !== term[k] && !(isAmbiguous(c) && (term[k] === 'i' || term[k] === 'l'))) return false;
  }
  return w[pos] !== '?' && masked <= term.length >> 1 && term.length - masked >= 2;
}

// ---- Matching -----------------------------------------------------------------------------
// Words to test: each part, each token's parts joined ("f.u.c.k"), masked words, and runs of
// one- or two-letter tokens spelled out across spaces ("f u c k", "sh it").
function candidates(tokens) {
  const out = [];
  tokens.forEach((t, ti) => {
    for (const p of t.parts) out.push({ ...p, tj: ti });
    if (t.compact) out.push({ ...t.compact, tj: ti });
    for (const w of t.wilds) out.push({ ...w, tj: ti, wild: true });
  });
  const short = t => !!t && !t.masked && t.word.length <= 2;
  for (let a = 0; a < tokens.length; a++) {
    if (!short(tokens[a])) continue;
    let s = tokens[a].word, odd = !COMMON_SHORT.has(s);
    for (let b = a + 1; short(tokens[b]) && s.length < 24; b++) {
      s += tokens[b].word;
      odd ||= !COMMON_SHORT.has(tokens[b].word);
      if (odd) out.push({ s: squash(s), start: tokens[a].start, end: tokens[b].end, tj: b });
    }
  }
  return out;
}

function matchWord(c, tokens, hits) {
  const found = new Set();
  const hit = (e, v) => { if (!found.has(e)) { found.add(e); hits.push({ name: e.name, sev: e.sev, cat: e.cat, start: c.start, end: c.end, first: v[0] }); } };
  for (const [v, dd] of variants(c.s)) {
    const e = WORD_FORMS.get(v);
    if (e && !(dd && e.sev === 'mild') && !nextBlocks(e, tokens, c.tj)) hit(e, v);
    for (const e of STARTS) if (!(dd && e.sev === 'mild') && v.startsWith(e.term) && !covered(e, v, 0)) hit(e, v);
    for (const e of ANYWHERE) {
      if (dd && e.sev === 'mild') continue;
      for (let p = v.indexOf(e.term); p >= 0; p = v.indexOf(e.term, p + 1)) if (!covered(e, v, p)) { hit(e, v); break; }
    }
  }
}

function matchMasked(c, tokens, hits) {
  const w = c.s;
  const hit = e => hits.push({ name: e.name, sev: e.sev, cat: e.cat, start: c.start, end: c.end, first: w[0] });
  for (const [form, e] of SEVERE_FORMS) if (form.length === w.length && wildEq(w, 0, form) && !nextBlocks(e, tokens, c.tj)) return hit(e);
  for (const e of SEVERE_ROOTS) {
    const last = e.mode === 'start' ? 0 : w.length - e.term.length;
    for (let p = 0; p <= last; p++) if (wildEq(w, p, e.term)) return hit(e);
  }
}

function tokenIs(t, word, severe) {
  if (!t) return false;
  if (!t.masked) return formsOf(t).has(word);
  return severe && t.word.length === word.length && wildEq(t.word, 0, word);
}
function matchPhrases(tokens, hits) {
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i], options = new Set();
    if (!t.masked) for (const f of formsOf(t)) for (const p of PHRASES_BY_FIRST.get(f) || []) options.add(p);
    else for (const p of SEVERE_PHRASES) if (tokenIs(t, p.toks[0], true)) options.add(p);
    for (const p of options) {
      let ok = true;
      for (let k = 1; ok && k < p.toks.length; k++) ok = !tokens[i + k - 1].brk && tokenIs(tokens[i + k], p.toks[k], p.sev === 'slur');
      if (ok && p.guard) for (let back = 1; back <= 2; back++) {
        const prev = tokens[i - back];
        if (!prev || prev.brk) break;
        if (has(tokens, i - back, NEGATIONS)) { ok = false; break; }
      }
      if (!ok) continue;
      for (let k = 0; k < p.toks.length; k++) hits.push({ name: p.name, sev: p.sev, cat: p.cat, start: tokens[i + k].start, end: tokens[i + k].end, first: p.toks[k][0] });
    }
  }
}

function matchInsults(tokens, hits) {
  const open = k => !!tokens[k] && !tokens[k].brk;
  const skip = (k, set = FILLERS) => { for (let n = 0; n < 3 && open(k) && has(tokens, k, set); n++) k++; return k; };
  for (let i = 0; i < tokens.length; i++) {
    if (!open(i)) continue;
    let j = -1, set = INSULTS, strict = false;
    if (has(tokens, i, YOU)) {
      if (has(tokens, i + 1, ARE) && open(i + 1)) j = skip(i + 2);
      else if (i === 0 || tokens[i - 1].brk || has(tokens, i - 1, LEADS)) { j = skip(i + 1, VOCATIVE_FILLERS); set = VOCATIVE; }
    } else if (has(tokens, i, YOU_ARE)) j = skip(i + 1);
    else if (has(tokens, i, YOUR)) {
      j = skip(i + 1);
      strict = j === i + 1; // "ur a clown" is "you're"; bare "ur trash" only when it ends the clause
    } else if (has(tokens, i, ARE) && has(tokens, i + 1, YOU) && open(i + 1)) j = skip(i + 2);
    if (j < 0 || !tokens[j]) continue;
    const word = has(tokens, j, set);
    if (!word) continue;
    if (strict && !(tokens[j].brk || j === tokens.length - 1 || has(tokens, j + 1, TAIL))) continue;
    hits.push({ name: word, sev: 'strong', cat: 'harassment', start: tokens[j].start, end: tokens[j].end, first: word[0] });
  }
}

const MIDDLE_FINGER = '\u{1F595}';
function matchSymbols(chars, hits) {
  chars.forEach((ch, i) => { if (ch === MIDDLE_FINGER) hits.push({ name: 'middle finger', sev: 'strong', cat: 'profanity', start: i, end: i, first: '' }); });
}

// Keep the first letter of the span, star the rest; whitespace stays, invisible characters go.
function maskSpan(chars, out, { start, end, first }) {
  let kept = false;
  for (let i = start; i <= end; i++) {
    const ch = chars[i];
    if (SPACE.test(ch)) continue;
    if (foldChar(ch) === '') { out[i] = ''; continue; }
    if (!kept) { kept = true; out[i] = /\p{L}/u.test(ch) ? ch : plainLetter(first) || '*'; continue; }
    out[i] = '*';
  }
}

const clip = text => (typeof text === 'string' ? text : text == null ? '' : String(text)).slice(0, MODERATION_MAX_CHARS);

// Folded, comparable form of a text: "F.U.C.K y0u!!" -> "fuck you". Masked letters show as *.
export function normalizeForModeration(text) {
  const { tokens } = scan(clip(text));
  const out = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.word.length === 1 && !t.masked) {
      let j = i, s = '', odd = false;
      while (j < tokens.length && tokens[j].word.length === 1 && !tokens[j].masked) { s += tokens[j].word; odd ||= !COMMON_SHORT.has(tokens[j].word); j++; }
      if (j - i >= 2 && odd) { out.push(squash(s)); i = j - 1; continue; }
    }
    out.push(t.word);
  }
  return out.join(' ').replace(/[IL]/g, plainLetter).replaceAll('?', '*');
}

// { ok, severity: null|'mild'|'strong'|'slur', terms, categories, masked }
//   ok        false when the message must not be sent (any strong or severe match)
//   terms     what matched (mild ones too), in order of appearance
//   masked    the text with blocked words shown as first letter + asterisks (mild words untouched)
export function moderateText(text) {
  const input = clip(text);
  if (!input.trim() || isReactionBody(input.trim())) return { ok: true, severity: null, terms: [], categories: [], masked: input };
  const { chars, tokens } = scan(input);
  const hits = [];
  for (const c of candidates(tokens)) (c.wild ? matchMasked : matchWord)(c, tokens, hits);
  matchPhrases(tokens, hits);
  matchInsults(tokens, hits);
  matchSymbols(chars, hits);
  hits.sort((a, b) => a.start - b.start || RANK[b.sev] - RANK[a.sev]);
  let severity = null, span = null;
  const terms = [], categories = [], spans = [], out = chars.slice();
  for (const h of hits) {
    if (!severity || RANK[h.sev] > RANK[severity]) severity = h.sev;
    if (!terms.includes(h.name)) terms.push(h.name);
    if (!categories.includes(h.cat)) categories.push(h.cat);
    if (RANK[h.sev] < RANK.strong) continue;
    if (span && h.start <= span.end) span.end = Math.max(span.end, h.end); // overlapping hits mask as one word
    else spans.push(span = { start: h.start, end: h.end, first: h.first });
  }
  for (const s of spans) maskSpan(chars, out, s);
  const ok = !severity || RANK[severity] < RANK.strong;
  return { ok, severity, terms, categories, masked: ok ? input : out.join('') };
}

// ---- Strikes and mutes ------------------------------------------------------------------------
function toMs(value) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Date.parse(value);
  return NaN;
}
function timeOf(now) {
  const ms = now === undefined || now === null ? Date.now() : toMs(now);
  if (!Number.isFinite(ms)) throw new RangeError('moderation: `now` must be a valid time');
  return ms;
}
const count = n => Math.max(0, Math.floor(Number(n) || 0));

// Strikes a severity adds: strong 1, slur or threat 2, mild or clean 0.
export function strikeWeight(severity) {
  return severity === 'slur' ? SLUR_STRIKES : severity === 'strong' ? 1 : 0;
}

// The ladder rung for a strike total (8 and above share the permanent rung), or null for 0.
export function ladderStep(strikes) {
  const n = count(strikes);
  return n ? MUTE_LADDER[Math.min(n, MUTE_LADDER.length) - 1] : null;
}

// What happens after a message with this severity, given the strikes already in force.
// -> { strikes, added, blocked, warning, permanent, mutedUntil, ms, label, next }
/** @param {{strikes?: number, severity?: string|null, now?: Date|number|string}} [options] */
export function nextSanction({ strikes = 0, severity = null, now } = {}) {
  const at = timeOf(now), before = count(strikes), added = strikeWeight(severity);
  if (!added) return { strikes: before, added: 0, blocked: false, warning: false, permanent: false, mutedUntil: null, ms: 0, label: null, next: null };
  const total = before + added, step = ladderStep(total);
  const permanent = step.ms === null, warning = step.ms === 0;
  return {
    strikes: total,
    added,
    blocked: true,
    warning,
    permanent,
    mutedUntil: permanent || warning ? null : new Date(at + step.ms).toISOString(),
    ms: step.ms,
    label: step.label,
    next: permanent ? null : ladderStep(total + 1).mute,
  };
}

// Strikes still in force from a list of strike times (a log table). Items are dates (Date, ISO
// string or ms) or { at, weight }; a slur may be logged as two rows with the same time or one row
// with weight 2. The ladder is replayed so each mute's end is known: the record clears once
// STRIKE_DECAY_DAYS pass after a mute ends (or after a warning) with no new strike.
export function activeStrikes(strikeDates, now) {
  const at = timeOf(now), events = [];
  for (const item of Array.isArray(strikeDates) ? strikeDates : []) {
    const record = item && typeof item === 'object' && !(item instanceof Date);
    const t = toMs(record ? item.at : item);
    if (Number.isFinite(t) && t <= at) events.push([t, record ? Math.max(1, count(item.weight ?? 1)) : 1]);
  }
  events.sort((a, b) => a[0] - b[0]);
  let total = 0, cleanFrom = -Infinity;
  for (let k = 0; k < events.length;) {
    const t = events[k][0];
    let weight = 0;
    while (k < events.length && events[k][0] === t) weight += events[k++][1];
    if (total && cleanFrom !== Infinity && t - cleanFrom >= DECAY_MS) total = 0;
    total += weight;
    const step = ladderStep(total);
    cleanFrom = step.ms === null ? Infinity : t + step.ms;
  }
  return total && cleanFrom !== Infinity && at - cleanFrom >= DECAY_MS ? 0 : total;
}

// The same rule for the two-column model (a strike counter plus the last strike time): the count
// stands until STRIKE_DECAY_DAYS have passed since the later of the last strike and the mute end.
/** @param {{strikes?: number, lastStrikeAt?: Date|number|string|null, mutedUntil?: Date|number|string|null, now?: Date|number|string}} [options] */
export function strikesInForce({ strikes = 0, lastStrikeAt = null, mutedUntil = null, now } = {}) {
  const n = count(strikes);
  if (!n || ladderStep(n).ms === null) return n;
  const at = timeOf(now);
  const clean = Math.max(...[toMs(lastStrikeAt), toMs(mutedUntil)].filter(Number.isFinite));
  return Number.isFinite(clean) && at - clean >= DECAY_MS ? 0 : n;
}

// Friendly text for the player after a blocked message.
export function sanctionMessage(sanction) {
  if (!sanction?.blocked) return '';
  const step = ladderStep(sanction.strikes);
  const double = sanction.added >= SLUR_STRIKES ? ' Slurs and threats count as two strikes.' : '';
  const next = sanction.next ? ` Next time it's a ${sanction.next}.` : '';
  if (sanction.permanent || step.ms === null) return `That message wasn't sent. Chat is now off for your account for good after repeated insults or explicit language.${double}`;
  if (sanction.warning) return `That message wasn't sent: keep chat friendly.${next}`;
  return `That message wasn't sent. You're muted for ${step.duration} for insults or explicit language.${double}${next}`;
}
