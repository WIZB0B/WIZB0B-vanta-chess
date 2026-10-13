import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadLanguage, translateText } from '../src/i18n.js';

const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const api = readFileSync(new URL('../src/vch-api.js', import.meta.url), 'utf8');

test('round 11 translations: screens, toasts and patterns', async () => {
  await Promise.all(['fr', 'es', 'pt', 'ar'].map(loadLanguage));
  assert.equal(translateText('Vanta Moment of the Week', 'fr'), 'Le moment Vanta de la semaine');
  assert.equal(translateText('Lights out · 2 blind moves', 'es'), 'Luces apagadas · 2 jugadas a ciegas');
  assert.equal(translateText('Stage cleared · next: The Lantern', 'pt'), 'Etapa superada · próximo: The Lantern');
  assert.equal(translateText('They lead 3–1', 'fr'), 'Il mène 3–1');
  assert.equal(translateText('5 games · draws 1 · you score 40%', 'es'), '5 partidas · tablas 1 · puntúas un 40 %');
  assert.equal(translateText('Checkmate while 7 points down', 'pt'), 'Mate com 7 ponto(s) a menos');
  assert.ok(translateText('Relic earned: Umbra', 'ar').includes('Umbra'));
  for (const s of ['Your Shadow', 'The Vanta Gauntlet', 'Blackout Blitz', 'Relic sets', 'Rivals', 'Start a run', 'Equip', 'Replay the game']) assert.ok(translateText(s, 'fr'), s);
});
test('rivals and the moment are wired: community tab, watch card, menu card, admin pick', () => {
  assert.match(main, /\['rivals','Rivals'\]/);
  assert.match(main, /if\(k==='rivals'\)void renderRivals\(\)/);
  assert.match(main, /target\.innerHTML=watchTabs\(\)\+momentHtml\(moment\)\+/);
  assert.match(main, /id="menuMoment" class="menu-moment hidden"/);
  assert.match(main, /const admin=isAdmin\(\)/, 'only admins see the pick form (the server checks the role too)');
  assert.match(api, /momentOfWeek\(\) \{ return this\.request\('moment_of_week'\); \}/);
  assert.match(main, /earnRelic\('rivalry'\)/);
});
test('round 11 modes stay fair: no engine help in the dark or a blackout', () => {
  assert.match(main, /if\(computerRules!=='standard'&&computerRules!=='freestyle'&&computerLive\(\)\)return true; \/\/ no evaluation/);
  assert.match(main, /if\(computerRules==='dark'\|\|computerRules==='blackout'\)return toast\('No hints in this mode'\)/);
  assert.match(main, /moods would give hidden pieces away/);
  assert.match(main, /const position=sight&&!darkOnline\?fogPosition\(fullPosition,sight,computerSide\):fullPosition;/, 'hidden pieces are not in the DOM at all (online, the server never sends them)');
});
