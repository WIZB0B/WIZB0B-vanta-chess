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
      const used = [...out.matchAll(/[$%](\d)/g)].map(m => Number(m[1]));
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
