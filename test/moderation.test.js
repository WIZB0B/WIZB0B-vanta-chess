import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as client from '../src/moderation.js';
import {
  MUTE_LADDER, MODERATION_MAX_CHARS, PERMANENT_MUTE_UNTIL, SLUR_STRIKES, STRIKE_DECAY_DAYS,
  activeStrikes, isReactionBody, ladderStep, moderateText, nextSanction, normalizeForModeration,
  reviewTerms, sanctionMessage, strikeWeight, strikesInForce,
} from '../supabase/functions/chess/moderation.js';

// Offensive test words are written backwards, like the lists in moderation.js, so this file
// doesn't read as a list of insults: w('kcuf') is the f-word.
const w = s => [...s].reverse().join('');
const F = w('kcuf'), S = w('tihs');
const HOUR = 3600000, DAY = 24 * HOUR;
const NOW = Date.parse('2026-10-12T12:00:00.000Z');
const blocked = (text, severity = 'strong') => {
  const r = moderateText(text);
  assert.equal(r.ok, false, `should block: ${JSON.stringify(text)}`);
  assert.equal(r.severity, severity, `severity of ${JSON.stringify(text)}`);
  return r;
};
const allowed = (text, severity = null) => {
  const r = moderateText(text);
  assert.equal(r.ok, true, `should allow: ${JSON.stringify(text)} (matched ${r.terms.join(', ')})`);
  assert.equal(r.severity, severity, `severity of ${JSON.stringify(text)} (matched ${r.terms.join(', ')})`);
  assert.equal(r.masked, text);
  return r;
};

test('moderation: the browser re-exports the server module; the module stays pure and ASCII', () => {
  assert.equal(client.moderateText, moderateText);
  assert.equal(client.nextSanction, nextSanction);
  assert.match(readFileSync(new URL('../src/moderation.js', import.meta.url), 'utf8'), /export \* from '\.\.\/supabase\/functions\/chess\/moderation\.js'/);
  const source = readFileSync(new URL('../supabase/functions/chess/moderation.js', import.meta.url), 'utf8');
  assert.deepEqual([...source.matchAll(/^import .* from '([^']+)'/gm)].map(m => m[1]), ['./reaction-ids.js']);
  assert.doesNotMatch(source, /\bDeno\.|\bprocess\.|\bfetch\(|\brequire\(|localStorage|document\./);
  assert.ok([...source].every(c => c.codePointAt(0) < 128), 'non-ASCII characters are written as escapes');
  const { terms, phrases } = reviewTerms();
  for (const term of terms) assert.match(term.term, /^[a-z]+$/, 'lists hold folded words only');
  const forms = terms.flatMap(t => t.forms);
  assert.equal(new Set(forms).size, forms.length, 'no word form is listed twice');
  for (const p of phrases) assert.match(p.pattern, /^[a-z {|}]+$/, p.pattern);
});

test('normalizeForModeration folds case, accents, look-alikes, leetspeak, repeats and separators', () => {
  assert.equal(normalizeForModeration(`${w('K.C.U.F')} y0u!!`), `${F} you`);
  for (const spaced of ['f u c k', 'f-u-c-k', 'f_u_c_k', 'f.u.c.k', "f'u'c'k"]) assert.equal(normalizeForModeration(spaced), F, spaced);
  assert.equal(normalizeForModeration('sh1t'), S);
  assert.equal(normalizeForModeration('$h!t'), S);
  assert.equal(normalizeForModeration('\u015c\u01271T'), S); // accented S, barred h, digit one
  assert.equal(normalizeForModeration('\uff46\uff55\uff43\uff4b'), F); // fullwidth
  assert.equal(normalizeForModeration('\u{1D41F}\u{1D42E}\u{1D41C}\u{1D424}'), F); // mathematical bold
  assert.equal(normalizeForModeration('\ua730\u1d1c\u1d04\u1d0b'), F); // small capitals
  assert.equal(normalizeForModeration('\u{1F1EB}\u{1F1FA}\u{1F1E8}\u{1F1F0}'), F); // regional indicator letters
  assert.equal(normalizeForModeration('f\u200bu\u00adck'), F); // zero-width space, soft hyphen
  assert.equal(normalizeForModeration('\u0441\u0443\u043a\u0430'), 'cyka'); // Cyrillic look-alikes
  assert.equal(normalizeForModeration('fuuuuuuuck'), 'fuuck'); // 3+ repeats collapse to 2
  assert.equal(normalizeForModeration('asssss'), 'ass');
  assert.equal(normalizeForModeration("You're GREAT, Plan A or B?"), 'youre great plan a or b');
  assert.equal(normalizeForModeration(''), '');
  assert.equal(normalizeForModeration(null), '');
});

test('leetspeak, look-alike letters, repeats and split words are caught', () => {
  const evasions = [
    w('kcuF'), w('KCUF'), `${w('kcuF')} you`, `what the ${F} man`, w('kcf'), w('ffo kuf'), w('kcuhp'), w('gnikcuf'),
    w('k.c.u.f'), w('k c u f'), w('k-c-u-f'), w('k_c_u_f'), w('kc uf'), w('g.n.i.k.c.u.f'), 'what the f u c k',
    'sh1t', '$h!t', '5h1t', 'S H I T', 'sh it', w('tiiiiiihs'), w('kcuuuuuuuuuuuf'), w('tihhhhs'),
    '\uff53\uff48\uff49\uff54', 'f\u00fcck', 'f\u200buck', '\u0441' + w('tnu'), // Cyrillic first letter
    '\u{1D41F}\u{1D42E}\u{1D41C}\u{1D424}', '\u{1F1EB}\u{1F1FA}\u{1F1E8}\u{1F1F0}', '\u24d5\u24e4\u24d2\u24da',
    w('hctib'), 'b1tch', 'b!tch', 'b i t c h', w('elohssa'), 'a$$hole', '@sshole', w('kc0c'), w('kc1d'), w('daehkcid'),
    w('yssup'), 'pu$$y', w('nr0p'), w('onrop'), w('TUlS'), w('tuIs'), w('tu1s'), w('erohw a era uoy'),
    w('rekcufrehtom'), w('rekcuf-rehtom'), w('tihsllub'), w('xXrekcufXx'), w('ygrene_kcid_gib'),
    w('ufts'), w('boon oftg'), w('taylb akyc'), w('erdam atup'), w('e\u00dfiehcs'),
    'send nudes', 'wanna have sex', '\u{1F595}',
  ];
  for (const text of evasions) blocked(text);
});

test('chess talk and everyday sentences pass untouched', () => {
  const clean = [
    'gg wp', 'good game, well played', 'glhf', 'Hello from Brazil', 'nice move', 'That was a brilliant sacrifice',
    'mate in 3 was there', 'Checkmate! What a finish', 'Smothered mate is the prettiest', 'you hung your queen',
    'I hang a piece every game', 'Hang your rook and you lose', 'nice sac', 'Kill the bishop pair early',
    'I will kill your king', "I'm going to kill you in this endgame", "Let me find you a better line",
    'My knight forks your rook and queen', 'The Fried Liver attack is risky', 'I play the Scotch and the Dutch',
    'The Caro-Kann is solid', 'Bongcloud lol', 'O-O-O and push the pawns', '1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Bg5 Be7',
    'Bxf7+ Kxf7 Ng5+', 'Rxh7# what a finish', 'Qxf7#', 'en passant is forced', 'Hurry up please, I have to go',
    'Draw?', 'Rematch?', 'I fat-fingered it, mouse slip', 'Your position is lost, resign?', 'You are a strong player',
    "You're a legend", 'Are you a bot? that was accurate', 'That pawn structure is crippled', 'Hit the f7 square',
    'Shoot, I forgot the clock', 'Brutal, absolutely brutal', 'You crushed me', "Let's analyse the game",
    'Analysis board please', 'The engine says +3', 'Your bishop is useless here', 'Your trash opening still worked',
    'Thank you, trash talk is fun', 'You trash talk a lot', 'The knight is a clown piece', 'Loser buys coffee',
    'go ok', 'is it ok', 'U ok?', 'r u there', 'Plan A, B or C', 'hello \u{1F600} world', 'that was a sexy move',
    "Don't kill yourself over a blitz game", 'I boobed there', 'tit for tat', 'woop woop!',
  ];
  for (const text of clean) allowed(text);
});

test('Scunthorpe-style words, names and places pass', () => {
  const words = [
    'Scunthorpe', 'assassin', 'class', 'classic', 'cocktail', 'cockpit', 'peacock', 'Hancock', 'Hitchcock', 'shiitake',
    'shitake mushrooms', 'Dickens', 'therapist', 'grape', 'analysis', 'Sussex', 'Essex', 'pussycat', 'snigger',
    'sniggering', 'niggle', 'niggling', 'fire retardant', 'pedometer', 'Fukushima', 'Matsushita', 'Penistone',
    'Cumberland', 'cucumber', 'document', 'assess the position', 'bass guitar', 'passage', 'Arsenal', 'shell',
    'hello', 'a chink in the armour', 'homo sapiens', 'raccoon', 'spick and span', 'Niger', 'Nigeria', 'mishit',
  ];
  for (const text of words) allowed(text);
});

test('mild words are allowed, reported as mild, and never masked', () => {
  for (const [text, term] of [['damn', 'damn'], ['what the hell', 'hell'], ['oh crap, my queen', 'crap'], ['this opening sucks', 'suck'], ['wtf was that', 'wtf'], ['ffs not again', 'ffs'], ['bloody hell', 'hell'], ["I'm such an idiot", 'idiot'], ['stupid move by me', 'stupid'], ['you suck at bullet lol', 'suck'], ['shut up and play', 'shut up']]) {
    assert.ok(allowed(text, 'mild').terms.includes(term), `${text} reports ${term}`);
  }
});

test('insults aimed at the other player are blocked; the same words aimed at nobody are not', () => {
  for (const text of ['you are trash', 'ur trash', 'your trash lol', 'u r trash', "you're an idiot", 'youre garbage', 'you idiot', 'hey you clown', 'you absolute moron', 'you are such a loser', 'ur a loser lol', 'u r a clown', 'ur so dumb', 'are you stupid?', 'r u dumb', 'you are a waste of space', 'you are being pathetic']) {
    const r = blocked(text);
    assert.ok(r.categories.includes('harassment'), text);
  }
  for (const text of ['your trash opening still worked', 'your stupid bishop got me', 'you are not an idiot', 'thank you, trash talk is fun', 'he is an idiot', 'you are joking', 'you are wasting time']) {
    assert.equal(moderateText(text).ok, true, text);
  }
});

test('threats and self-harm count as severe; advice with a negation is not a threat', () => {
  for (const text of ['kys', 'KYS', 'k y s', 'k.y.s', 'ky5', 'kill yourself', 'kill urself', 'kill ur self', 'go hang yourself', 'just drink bleach', 'go die', 'i hope you die', 'i know where you live', 'k*ll yourself', 'k*s']) {
    assert.ok(blocked(text, 'slur').categories.includes('threat'), text);
  }
  for (const text of ["don't kill yourself over it", 'never hang yourself on one loss', 'go. die is the cast']) allowed(text);
});

test('slurs are severe, even when masked; writer-masked profanity is allowed', () => {
  const slurs = [w('reggin'), 'n1gg3r', 'n i g g e r', w('aggin'), w('@ggin'), w('toggaf'), w('togg@f'), 'f a g', w('g4f'), w('drater'), w('dedrater'), 'r e t a r d', w('ekik'), w('ynnart'), w('regg*n'), w('agg*n'), w('g*f'), w('drat*r')];
  for (const text of slurs) assert.ok(blocked(text, 'slur').categories.includes('slur'), text);
  for (const text of ['f*ck you', 'sh*t', 'what the f***', 'motherf***er', '*sigh*', 'f***']) allowed(text);
  for (const text of ['heil hitler', 'sieg heil']) blocked(text, 'slur');
});

test('masked text keeps each blocked word\'s first letter and stars the rest', () => {
  assert.equal(moderateText(`what the ${F} man`).masked, 'what the f*** man');
  assert.equal(moderateText(`${w('K.C.U.F')} you`).masked, 'F****** you');
  assert.equal(moderateText('f u c k').masked, 'f * * *');
  assert.equal(moderateText('$h!t happens').masked, 's*** happens');
  assert.equal(moderateText('f\u200buck').masked, 'f***');
  assert.equal(moderateText('kill yourself').masked, 'k*** y*******');
  assert.equal(moderateText('you are trash').masked, 'you are t****');
  assert.equal(moderateText(w('ygrene_kcid_gib')).masked, 'big_d***_energy');
  assert.equal(moderateText(w('drat*r')).masked, 'r*****');
  assert.equal(moderateText(`damn, ${F}`).masked, 'damn, f***');
  assert.equal(moderateText('\u{1F595}').masked, '*');
});

test('reaction bodies pass and are recognised by the shared helper', () => {
  assert.equal(isReactionBody(':r:gg'), true);
  assert.equal(isReactionBody(':r:nope'), false);
  allowed(':r:gg');
});

test('mute ladder: warning, 2 hours, 1 day, 1 week, 1 month, 6 months, 1 year, permanent', () => {
  assert.deepEqual(MUTE_LADDER.map(s => [s.strike, s.label, s.ms]), [
    [1, 'Warning', 0],
    [2, 'Muted for 2 hours', 2 * HOUR],
    [3, 'Muted for 1 day', DAY],
    [4, 'Muted for 1 week', 7 * DAY],
    [5, 'Muted for 1 month', 30 * DAY],
    [6, 'Muted for 6 months', 180 * DAY],
    [7, 'Muted for 1 year', 365 * DAY],
    [8, 'Muted permanently', null],
  ]);
  assert.ok(Object.isFrozen(MUTE_LADDER) && MUTE_LADDER.every(Object.isFrozen));
  assert.equal(ladderStep(0), null);
  assert.equal(ladderStep(12), MUTE_LADDER[7]);
  assert.equal(STRIKE_DECAY_DAYS, 180);
  assert.equal(SLUR_STRIKES, 2);
});

test('nextSanction walks the ladder one strike at a time and is deterministic', () => {
  const expected = [
    [1, true, false, null],
    [2, false, false, '2026-10-12T14:00:00.000Z'],
    [3, false, false, '2026-10-13T12:00:00.000Z'],
    [4, false, false, '2026-10-19T12:00:00.000Z'],
    [5, false, false, '2026-11-11T12:00:00.000Z'],
    [6, false, false, '2027-04-10T12:00:00.000Z'],
    [7, false, false, '2027-10-12T12:00:00.000Z'],
    [8, false, true, null],
    [9, false, true, null],
  ];
  expected.forEach(([strikes, warning, permanent, mutedUntil], before) => {
    const s = nextSanction({ strikes: before, severity: 'strong', now: NOW });
    assert.deepEqual([s.strikes, s.warning, s.permanent, s.mutedUntil, s.blocked, s.added], [strikes, warning, permanent, mutedUntil, true, 1], `from ${before}`);
    assert.equal(s.label, ladderStep(strikes).label);
    assert.deepEqual(nextSanction({ strikes: before, severity: 'strong', now: new Date(NOW) }), s);
    assert.deepEqual(nextSanction({ strikes: before, severity: 'strong', now: new Date(NOW).toISOString() }), s);
  });
  assert.equal(nextSanction({ strikes: 0, severity: 'strong', now: NOW }).next, '2-hour mute');
  assert.equal(nextSanction({ strikes: 6, severity: 'strong', now: NOW }).next, 'permanent mute');
  assert.equal(nextSanction({ strikes: 7, severity: 'strong', now: NOW }).next, null);
  assert.throws(() => nextSanction({ strikes: 0, severity: 'strong', now: 'not a date' }), RangeError);
});

test('a slur or threat counts as two strikes; mild and clean messages add nothing', () => {
  assert.equal(strikeWeight('slur'), 2);
  assert.equal(strikeWeight('strong'), 1);
  assert.equal(strikeWeight('mild'), 0);
  assert.equal(strikeWeight(null), 0);
  const first = nextSanction({ strikes: 0, severity: moderateText('kys').severity, now: NOW });
  assert.deepEqual([first.strikes, first.added, first.warning, first.mutedUntil], [2, 2, false, '2026-10-12T14:00:00.000Z']);
  assert.equal(nextSanction({ strikes: 6, severity: 'slur', now: NOW }).permanent, true);
  for (const severity of ['mild', null, undefined]) {
    const s = nextSanction({ strikes: 3, severity, now: NOW });
    assert.deepEqual([s.strikes, s.blocked, s.mutedUntil, s.label], [3, false, null, null]);
  }
});

test('strikes clear after STRIKE_DECAY_DAYS clean days, counted from the end of the last mute', () => {
  const at = days => new Date(NOW + days * DAY).toISOString();
  assert.equal(activeStrikes([], NOW), 0);
  assert.equal(activeStrikes([at(-10)], NOW), 1);
  assert.equal(activeStrikes([at(-179)], NOW), 1);
  assert.equal(activeStrikes([at(-181)], NOW), 0); // a lone warning ages from the strike itself
  assert.equal(activeStrikes([at(-400), at(-300), at(-10)], NOW), 1); // a long gap starts a fresh record
  assert.equal(activeStrikes([at(-200), at(-100), at(-10)], NOW), 3); // each strike came within 180 days of the last
  // Six strikes ending in a 6-month mute: the record is still there when the mute ends.
  const six = [-420, -415, -410, -400, -380, -340].map(at);
  assert.equal(activeStrikes(six, NOW + 0), 6); // muted until day -160, so clean for 160 days only
  assert.equal(activeStrikes(six, NOW + 19 * DAY), 6);
  assert.equal(activeStrikes(six, NOW + 21 * DAY), 0);
  // A slur logged as two rows with one time, or one row with weight 2.
  assert.equal(activeStrikes([at(-1), at(-1)], NOW), 2);
  assert.equal(activeStrikes([{ at: at(-1), weight: 2 }], NOW), 2);
  // Permanent never clears; future and invalid entries are ignored.
  assert.equal(activeStrikes(Array.from({ length: 8 }, (_, i) => at(-3000 + i)), NOW), 8);
  assert.equal(activeStrikes([at(5), 'nonsense', null], NOW), 0);
});

test('strikesInForce: the two-column model clears with the same rule', () => {
  const at = days => new Date(NOW + days * DAY).toISOString();
  assert.equal(strikesInForce({ strikes: 3, lastStrikeAt: at(-30), mutedUntil: at(-29), now: NOW }), 3);
  assert.equal(strikesInForce({ strikes: 3, lastStrikeAt: at(-200), mutedUntil: at(-199), now: NOW }), 0);
  assert.equal(strikesInForce({ strikes: 6, lastStrikeAt: at(-300), mutedUntil: at(-120), now: NOW }), 6); // clock starts at the mute's end
  assert.equal(strikesInForce({ strikes: 8, lastStrikeAt: at(-3000), mutedUntil: PERMANENT_MUTE_UNTIL, now: NOW }), 8);
  assert.equal(strikesInForce({ strikes: 0, now: NOW }), 0);
  assert.equal(Date.parse(PERMANENT_MUTE_UNTIL) > Date.parse('9999-01-01'), true);
});

test('sanctionMessage explains the outcome and the next step', () => {
  const at = strikes => nextSanction({ strikes, severity: 'strong', now: NOW });
  assert.equal(sanctionMessage(at(0)), "That message wasn't sent: keep chat friendly. Next time it's a 2-hour mute.");
  assert.equal(sanctionMessage(at(1)), "That message wasn't sent. You're muted for 2 hours for insults or explicit language. Next time it's a 1-day mute.");
  assert.equal(sanctionMessage(at(6)), "That message wasn't sent. You're muted for 1 year for insults or explicit language. Next time it's a permanent mute.");
  assert.match(sanctionMessage(at(7)), /Chat is now off for your account for good/);
  assert.match(sanctionMessage(nextSanction({ strikes: 0, severity: 'slur', now: NOW })), /muted for 2 hours.*count as two strikes.*1-day mute/);
  assert.equal(sanctionMessage(nextSanction({ strikes: 2, severity: 'mild', now: NOW })), '');
  assert.equal(sanctionMessage(null), '');
});

test('odd input is handled and checking stays fast', () => {
  for (const value of [undefined, null, '', '   ', 42, {}]) assert.equal(moderateText(value).ok, true);
  assert.equal(moderateText(`${'a '.repeat(MODERATION_MAX_CHARS)}${F}`).ok, true, 'text past the limit is not read');
  const hard = ['I1|'.repeat(93), 'f u c k '.repeat(35), '1I1I1Il '.repeat(40), 'aabbccddeeffgghhiijj'.repeat(14), 'x'.repeat(5000)];
  const started = performance.now();
  for (const text of hard) moderateText(text);
  assert.ok(performance.now() - started < 1500, 'pathological messages are checked quickly');
});
