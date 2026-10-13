import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DICTIONARY, LANGUAGES, RTL, detectLanguage, loadLanguage, translateText } from '../src/i18n.js';
import { bestDivision, unlockedSets } from '../src/season-themes.js';

const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
test('every language translates every row; Arabic is right-to-left', async () => {
  await Promise.all(Object.keys(LANGUAGES).map(loadLanguage));
  const sizes = Object.values(DICTIONARY).map(d => d.size);
  assert.ok(sizes.every(n => n === sizes[0] && n > 1000));
  for (const [lang, dict] of Object.entries(DICTIONARY)) for (const [en, tr] of dict) assert.ok(tr && tr.trim(), `${lang}: ${en}`);
  assert.deepEqual(Object.keys(LANGUAGES), ['en', 'de', 'es', 'fr', 'it', 'pt', 'tr', 'ru', 'ar', 'hi', 'zh', 'ja']);
  assert.deepEqual([...RTL], ['ar']);
  assert.equal(translateText('Resign', 'fr'), 'Abandonner');
  assert.equal(translateText('Resign', 'en'), null);
  assert.equal(translateText('Some name', 'es'), null);
});
test('language choice: saved, then the browser, then English', () => {
  assert.equal(detectLanguage('pt', ['fr-FR']), 'pt');
  assert.equal(detectLanguage(null, ['es-MX', 'en']), 'es');
  assert.equal(detectLanguage(null, ['de-DE']), 'de');
  assert.equal(detectLanguage(null, ['ja-JP']), 'ja');
  assert.equal(detectLanguage(null, ['zh-CN']), 'zh');
  assert.equal(detectLanguage(null, ['zh-TW', 'en-US']), 'en', 'Traditional Chinese readers are not given Simplified');
  assert.equal(detectLanguage(null, ['sv-SE']), 'en');
  assert.equal(detectLanguage('xx', ['hi-IN']), 'hi');
});
test('the board stays left-to-right in right-to-left languages', () => {
  assert.match(css, /\[dir="rtl"\] \.board-shell,\[dir="rtl"\] \.board,/);
  assert.match(main, /document\.documentElement\.dir=RTL\.has\(uiLang\)\?'rtl':'ltr'/);
});
test('board sets unlock by league division or season badge', () => {
  assert.equal(bestDivision(null), -1);
  assert.deepEqual(unlockedSets({ account: true, league_division: 1 }).filter(s => s.unlocked).map(s => s.id), ['classic', 'bronze', 'silver']);
  assert.deepEqual(unlockedSets({ account: true, league_division: 0, achievements: [{ id: 'season-2026-09-gold' }] }).filter(s => s.unlocked).map(s => s.id), ['classic', 'bronze', 'silver', 'gold']);
  assert.deepEqual(unlockedSets({ account: false }).filter(s => s.unlocked).map(s => s.id), ['classic']);
});
