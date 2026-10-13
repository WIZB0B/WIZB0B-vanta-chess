import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DICTIONARY, LANGUAGES, RTL, loadLanguage, translateText } from '../src/i18n.js';

const CODES = Object.keys(LANGUAGES).filter(code => code !== 'en');
const source = readFileSync(new URL('../src/i18n.js', import.meta.url), 'utf8');
const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const locale = code => import(new URL(`../src/locales/${code}.js`, import.meta.url));

test('the language menu: English plus eleven languages, each in its own name', () => {
  assert.deepEqual(LANGUAGES, {
    en: 'English', de: 'Deutsch', es: 'Español', fr: 'Français', it: 'Italiano', pt: 'Português', tr: 'Türkçe',
    ru: 'Русский', ar: 'العربية', hi: 'हिन्दी', zh: '简体中文', ja: '日本語',
  });
  assert.deepEqual([...RTL], ['ar'], 'only Arabic is right-to-left');
});

test('every language translates every row and every pattern, in the same order', async () => {
  const files = Object.fromEntries(await Promise.all(CODES.map(async code => [code, await locale(code)])));
  const keys = new Set(), sources = files.fr.PATTERNS.map(p => p[0]);
  for (const code of CODES) for (const [en] of files[code].ROWS) keys.add(en);
  assert.ok(keys.size > 1400, `${keys.size} rows`);
  for (const code of CODES) {
    const { ROWS, PATTERNS } = files[code];
    const seen = new Set();
    for (const row of ROWS) {
      assert.equal(row.length, 2, `${code}: ${row[0]}`);
      const [en, out] = row;
      assert.ok(typeof out === 'string' && out.trim(), `${code}: empty translation for ${en}`);
      assert.ok(!seen.has(en), `${code}: ${en} twice`);
      seen.add(en);
    }
    assert.equal(seen.size, keys.size, `${code} is missing ${[...keys].filter(k => !seen.has(k)).slice(0, 5).join(' | ')}`);
    assert.deepEqual(PATTERNS.map(p => p[0]), sources, `${code}: the same patterns in the same order (the first match wins)`);
    for (const [src, out] of PATTERNS) {
      assert.ok(out && out.trim(), `${code}: ${src}`);
      const groups = new RegExp(`${src}|`).exec('').length - 1;
      const used = [...out.matchAll(/[$%&](\d)/g)].map(m => Number(m[1]));
      for (const n of used) assert.ok(n >= 1 && n <= groups, `${code}: ${src} uses $${n}`);
      for (let n = 1; n <= groups; n++) assert.ok(used.includes(n), `${code}: ${src} drops $${n}: ${out}`);
    }
  }
});

test('names stay as they are: VCH, Stockfish, Vanta Dark, Blackout Blitz, Chess960', async () => {
  await Promise.all(CODES.map(loadLanguage));
  const names = ['VCH', 'Stockfish', 'Vanta Dark', 'Blackout Blitz', 'Chess960', 'Freestyle 960'];
  for (const code of CODES) for (const [en, out] of DICTIONARY[code]) {
    for (const name of names) if (en.includes(name)) assert.ok(out.toLowerCase().includes(name.toLowerCase()), `${code}: "${en}" -> "${out}" lost ${name}`);
    if (code === 'ar') continue; // Arabic writes "two" and "one" as words in a few sentences
    for (const n of en.match(/\d+/g) || []) assert.ok(out.includes(n), `${code}: "${en}" -> "${out}" lost ${n}`);
  }
});

test('chess words are each language\'s standard ones', async () => {
  await Promise.all(CODES.map(loadLanguage));
  const words = {
    Knight: { fr: 'Cavalier', es: 'Caballo', pt: 'Cavalo', ar: 'حصان', de: 'Springer', it: 'Cavallo', ru: 'Конь', tr: 'At', zh: '马', ja: 'ナイト', hi: 'घोड़ा' },
    Bishop: { fr: 'Fou', es: 'Alfil', pt: 'Bispo', ar: 'فيل', de: 'Läufer', it: 'Alfiere', ru: 'Слон', tr: 'Fil', zh: '象', ja: 'ビショップ', hi: 'ऊँट' },
    Rook: { fr: 'Tour', es: 'Torre', pt: 'Torre', ar: 'رخ', de: 'Turm', it: 'Torre', ru: 'Ладья', tr: 'Kale', zh: '车', ja: 'ルーク', hi: 'हाथी' },
    Queen: { fr: 'Dame', es: 'Dama', pt: 'Dama', ar: 'وزير', de: 'Dame', it: 'Donna', ru: 'Ферзь', tr: 'Vezir', zh: '后', ja: 'クイーン', hi: 'वज़ीर' },
    King: { fr: 'Roi', es: 'Rey', pt: 'Rei', ar: 'ملك', de: 'König', it: 'Re', ru: 'Король', tr: 'Şah', zh: '王', ja: 'キング', hi: 'राजा' },
    Pawn: { fr: 'Pion', es: 'Peón', pt: 'Peão', ar: 'بيدق', de: 'Bauer', it: 'Pedone', ru: 'Пешка', tr: 'Piyon', zh: '兵', ja: 'ポーン', hi: 'प्यादा' },
    Check: { fr: 'Échec', es: 'Jaque', pt: 'Xeque', ar: 'كش', de: 'Schach', it: 'Scacco', ru: 'Шах', tr: 'Şah', zh: '将军', ja: 'チェック', hi: 'शह' },
    Checkmate: { fr: 'Échec et mat', es: 'Jaque mate', pt: 'Xeque-mate', ar: 'كش مات', de: 'Schachmatt', it: 'Scacco matto', ru: 'Мат', tr: 'Şah mat', zh: '将死', ja: 'チェックメイト', hi: 'शह-मात' },
    Stalemate: { fr: 'Pat', es: 'Ahogado', pt: 'Afogamento', ar: 'تعادل بالجمود', de: 'Patt', it: 'Stallo', ru: 'Пат', tr: 'Pat', zh: '逼和', ja: 'ステイルメイト' },
    Castle: { fr: 'Roque', es: 'Enroque', pt: 'Roque', ar: 'التبييت', de: 'Rochade', it: 'Arrocco', ru: 'Рокировка', tr: 'Rok', zh: '王车易位', ja: 'キャスリング', hi: 'कैसलिंग' },
    Draw: { fr: 'Nulle', es: 'Tablas', pt: 'Empate', ar: 'تعادل', de: 'Remis', it: 'Patta', ru: 'Ничья' },
  };
  for (const [en, byLang] of Object.entries(words)) for (const [code, want] of Object.entries(byLang)) assert.equal(translateText(en, code), want, `${en} in ${code}`);
});

test('the new screens and patterns translate in every language', async () => {
  await Promise.all(CODES.map(loadLanguage));
  for (const code of CODES) {
    for (const s of ['Live Game', 'Real time  •  Casual game', 'WAITING', 'LOCAL', 'ENGINE', 'LIVE', 'Find the best move', 'Puzzle complete', 'Puzzle', 'Daily puzzle', 'Puzzle Streak', 'Puzzle Battle', 'Computer game', 'Watching', 'Game review', 'Endgame drill', 'Study', 'Explorer', 'Enter a room code first', 'Finish your game first']) {
      assert.ok(translateText(s, code), `${s} in ${code}`);
    }
    const now = translateText('Now playing The Lantern · Vanta Dark. Choose an opponent below for a regular game.', code);
    assert.ok(now && now.includes('The Lantern · Vanta Dark') && !now.includes('Choose an opponent'), `${code}: ${now}`);
    assert.ok(translateText('●   Live Game', code).startsWith('●   '), code);
    assert.ok(!/Live Game/.test(translateText('●   Live Game', code)), `${code}: the first-paint kicker too`);
    assert.ok(translateText('e2 white pawn', code).startsWith('e2 '), code);
    assert.ok(translateText('Real time · Rated game', code).includes(' · '), code);
  }
  assert.equal(translateText('Round 3 is ready', 'de'), 'Runde 3 ist bereit');
  assert.equal(translateText('●   Live Game', 'ja'), '●   ライブ対局');
  assert.equal(translateText('Knight of g1', 'ru'), 'Конь g1');
  assert.equal(translateText('Game over · Time expired', 'it'), 'Partita finita · Tempo scaduto');
  assert.equal(translateText('Mistake: Nf3. Best was e4 — it preserves more winning chances.', 'fr'), 'Erreur : Nf3. Le meilleur coup était e4 — il préserve davantage de chances de gain.');
});

// Round 13: the Learn library, famous-game lessons, puzzle runs, profile editor, chat tray,
// streamers and the new toasts, in every language.
test('round 13: the new screens translate in every language, with nothing left in English', async () => {
  await Promise.all(CODES.map(loadLanguage));
  const rows = [
    'Course library', 'Sources', 'Finish lesson', 'Correct!', 'Also good! Here is the idea:', 'Good. Keep going.', 'Not that one. Try again.',
    'Not quite. Look again: that is not the move this position asks for.', 'Flawless: no mistakes, no hints.', 'All lessons', 'Again',
    'What would you play?', 'Show choices', 'Show me', 'Next moment', 'See your score', 'Replay the whole game', 'Try again',
    'Puzzle Survival', 'SURVIVAL', 'This puzzle', 'Skip puzzle', 'End run', "Time's up", 'Daily skip token added', 'No skip tokens left · one more tomorrow',
    'Edit profile', 'Portrait & profile', 'Display name', 'VCH portrait', 'About you', 'Please keep your name and About line friendly',
    'Emoji and reactions', 'Reactions', 'Emoji', "That message wasn't sent: keep chat friendly",
    'VCH games', 'Streamers live', 'Watch on Twitch', 'Watch on YouTube', 'No streamers live right now',
    'Classic chess', 'Vanta Dark · fog of war (own rating)', 'Blackout Blitz · the lights go out (own rating)', 'This variant is played live, not as a daily game', 'Rematch is unavailable',
  ];
  const patterns = [
    'TACTICS · LESSON 1 OF 5', 'Step 2 of 5', 'Tactics · all lessons', 'Forks · complete', '2 mistakes · 1 hint', '1 of 5 lessons in Tactics', 'Next: Pins and skewers',
    'INTERMEDIATE · 40 MIN · 5 LESSONS', 'Intermediate · 40 min', '1 of 5 lessons', '4 lessons', '14 classic games · 0 done', '7 moments', 'MOMENT 2 OF 7',
    'Paul Morphy to move · play it on the board or pick one', 'Paul Morphy played Qb3.', 'Yes! Nxb5 is what Paul Morphy played.',
    'Good move! The engine likes it too. Paul Morphy played Qb3.', 'You found 1 of 7 moves · 2 of 14 points.', 'London (casual game) 1851',
    'Best 4', '45s per puzzle', 'Run 0:12', 'Run time 1:02', 'Skipped · 1 token left', '10 solved · a skip token earned', '2 skip tokens',
    'Skip tokens: one more each day you visit, one for every 10 solved in a run, up to 5.', 'easiest · one wrong move ends the run', 'Puzzle 3 · harder',
    'No time limit · best 4', 'Beat the countdown · best 2', 'Knight · emerald', 'Queen · crimson', 'Mate in 2', 'Fork · Pin',
    'Captured: queen, rook, pawn, ahead by 3', 'Captured: knight', 'Nice move: A knight does a backflip',
  ];
  const english = /\b(lessons?|played|skip|tokens?|captured|queen|rook|knight|emerald|crimson|mistakes?|hints?|run|best|move)\b/i;
  for (const code of CODES) {
    for (const s of [...rows, ...patterns]) {
      // A pattern whose translation reads the same ("7 moments" in French) gives null: the text stays.
      const out = translateText(s, code) || (patterns.includes(s) ? s : null);
      assert.ok(out, `${code}: ${s}`);
      assert.doesNotMatch(out, english, `${code}: "${s}" -> "${out}" still has English`);
    }
  }
  assert.equal(translateText('Course library', 'fr'), 'Bibliothèque de cours', 'e2e/a11y-i18n.spec.js looks for it');
  assert.equal(translateText('Captured: queen, rook, pawn, ahead by 3', 'fr'), 'Prises : dame, tour, pion, avance de 3');
  assert.equal(translateText('Captured: queen, rook, pawn', 'zh'), '已吃：后、车、兵', 'lists are joined the way each language writes them');
  assert.equal(translateText('Captured: queen, pawn', 'ar'), 'المأسور: وزير، بيدق');
  assert.equal(translateText('TACTICS · LESSON 1 OF 5', 'tr'), 'TAKTİK · DERS 1 / 5', 'upper-case titles use the language\'s own case rules');
  assert.equal(translateText('Paul Morphy played Qb3.', 'ar'), 'لعب Paul Morphy ⁦Qb3⁩.', 'Arabic keeps move notation left-to-right');
});

test('round 13: every course, lesson, era and famous game is translated in every language', async () => {
  await Promise.all(CODES.map(loadLanguage));
  const { COURSES, COURSE_LEVELS } = await import('../src/courses.js');
  const { FAMOUS_ERAS, FAMOUS_LESSONS } = await import('../src/famous-lessons.js');
  const texts = [...COURSE_LEVELS, ...COURSE_LEVELS.map(l => l.toUpperCase())];
  for (const c of COURSES) {
    texts.push(c.title, c.title.toUpperCase(), c.summary, ...c.sources.map(s => s.note).filter(Boolean));
    for (const l of c.lessons) texts.push(l.title, l.goal);
  }
  for (const e of FAMOUS_ERAS) texts.push(e.label, e.years, e.blurb);
  for (const g of FAMOUS_LESSONS) texts.push(g.title, g.theme, g.intro, g.ending, g.event, `${g.event} ${g.year}`);
  for (const code of CODES) for (const s of texts) {
    if (s === 'Freestyle 960' || s === 'FREESTYLE 960') continue; // a name
    const out = translateText(s, code);
    assert.ok(out && out !== s, `${code}: ${s}`);
  }
  // The lesson player's "<player> to move" and "<player> played <move>." name the players, so a
  // new famous game needs its players added to those two patterns (in every language).
  const players = [...new Set(FAMOUS_LESSONS.flatMap(g => [g.white, g.black]))];
  for (const code of CODES) for (const name of players) {
    assert.ok(translateText(`${name} to move`, code)?.includes(name), `${code}: ${name} to move`);
    assert.ok(translateText(`${name} played Nf3.`, code)?.includes('Nf3'), `${code}: ${name} played Nf3.`);
    // Untranslated English that merely contains "played" is left alone, not half-translated.
    assert.equal(translateText('You played a different move that is also in your repertoire: the rest of the drill follows it.', code), null);
  }
});

test('round 13: every chat sanction the server can send is translated in full', async () => {
  await Promise.all(CODES.map(loadLanguage));
  const { nextSanction, sanctionMessage } = await import('../supabase/functions/chess/moderation.js');
  const messages = new Set();
  for (let strikes = 0; strikes <= 8; strikes++) for (const severity of ['strong', 'slur']) messages.add(sanctionMessage(nextSanction({ strikes, severity, now: 0 })));
  messages.delete('');
  assert.ok(messages.size >= 14, `${messages.size} messages`);
  for (const code of CODES) for (const m of messages) {
    const out = translateText(m, code);
    assert.ok(out, `${code}: ${m}`);
    assert.doesNotMatch(out, /wasn't sent|muted|mute\b|Next time|strikes|insults/i, `${code}: "${m}" -> "${out}"`);
  }
});

test('round 13: chess terms for the new screens are each language\'s standard ones', async () => {
  await Promise.all(CODES.map(loadLanguage));
  const words = {
    Fork: { fr: 'Fourchette', es: 'Ataque doble', pt: 'Garfo', ar: 'شوكة', de: 'Gabel', it: 'Forchetta', ru: 'Вилка', tr: 'Çatal', zh: '捉双', ja: 'フォーク', hi: 'फ़ोर्क' },
    Pin: { fr: 'Clouage', es: 'Clavada', pt: 'Cravada', ar: 'تسمير', de: 'Fesselung', it: 'Inchiodatura', ru: 'Связка', tr: 'Açmaz', zh: '牵制', ja: 'ピン', hi: 'पिन' },
    Skewer: { fr: 'Enfilade', es: 'Ensartada', pt: 'Espeto', ar: 'سيخ', de: 'Spieß', it: 'Infilata', ru: 'Сквозной удар', tr: 'Şiş', zh: '串击', ja: 'スキュアー', hi: 'स्क्यूअर' },
    'Smothered mate': { fr: 'Mat étouffé', es: 'Mate de la coz', pt: 'Mate sufocado', de: 'Ersticktes Matt', it: 'Matto affogato', ru: 'Спёртый мат', zh: '闷杀', ja: 'スマザードメイト' },
    'The opposition': { fr: "L'opposition", es: 'La oposición', pt: 'A oposição', ar: 'المعارضة', de: 'Die Opposition', it: "L'opposizione", ru: 'Оппозиция', tr: 'Muhalefet', zh: '对王', ja: 'オポジション', hi: 'अपोज़िशन' },
    'Puzzle Survival': { fr: 'Survie de problèmes', es: 'Supervivencia de problemas', de: 'Puzzle-Überleben', ru: 'Задачи на выживание', ja: 'パズルサバイバル' },
    'fog of war (own rating)': { fr: 'brouillard de guerre (classement séparé)', es: 'niebla de guerra (rating propio)', de: 'Nebel des Krieges (eigene Wertung)', ru: 'туман войны (отдельный рейтинг)', zh: '战争迷雾（独立等级分）' },
  };
  for (const [en, byLang] of Object.entries(words)) for (const [code, want] of Object.entries(byLang)) assert.equal(translateText(en, code), want, `${en} in ${code}`);
});

test('loadLanguage downloads only the language asked for, once', async () => {
  const fresh = await import(`../src/i18n.js?only-de-${Date.now()}`);
  assert.deepEqual(fresh.loadedLanguages(), []);
  assert.equal(await fresh.loadLanguage('en'), false, 'English needs no dictionary');
  assert.equal(await fresh.loadLanguage('xx'), false);
  const first = fresh.loadLanguage('de');
  assert.equal(fresh.loadLanguage('de'), first, 'a second call reuses the same download');
  assert.equal(await first, true);
  assert.deepEqual(fresh.loadedLanguages(), ['de']);
  assert.ok(fresh.DICTIONARY.de.size > 1400);
  for (const code of CODES.filter(c => c !== 'de')) assert.equal(fresh.DICTIONARY[code].size, 0, `${code} stays unloaded`);
  assert.equal(fresh.translateText('Resign', 'fr'), null);
  assert.equal(fresh.translateText('Resign', 'de'), 'Aufgeben');
});

test('each dictionary is its own chunk: one explicit import() per language, none static', () => {
  for (const code of CODES) assert.ok(source.includes(`${code}: () => import('./locales/${code}.js')`), code);
  assert.doesNotMatch(source, /import\s*\(\s*`/, 'no template-string import (Vite could not split it per language)');
  assert.doesNotMatch(source, /^import .* from '\.\/locales\//m);
  assert.doesNotMatch(main, /i18n-more|(import\(|from )['"]\.\/locales\//);
  assert.match(main, /import \{[^}]*\bloadLanguage\b[^}]*\} from '\.\/i18n\.js';/);
});
