import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { COMPUTER_LEVELS, DEFAULT_LEVEL, beginnerMove, levelBot, levelBySlug } from '../src/computer-levels.js';
const seeded = (seed = 1) => { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; };

const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');

test('twelve levels, Beginner to Maximum, each stronger than the last', () => {
  assert.equal(COMPUTER_LEVELS.length, 12);
  assert.equal(COMPUTER_LEVELS[0].name, 'Beginner');
  assert.equal(COMPUTER_LEVELS.at(-1).name, 'Maximum');
  for (let i = 1; i < COMPUTER_LEVELS.length; i++) assert.ok(COMPUTER_LEVELS[i].elo > COMPUTER_LEVELS[i - 1].elo);
  assert.equal(new Set(COMPUTER_LEVELS.map(l => l.slug)).size, 12);
  assert.equal(new Set(COMPUTER_LEVELS.map(l => l.portrait)).size, 12, 'a different piece for every level');
  for (const l of COMPUTER_LEVELS) {
    assert.doesNotMatch(`${l.name} ${l.about}`, /Stockfish|Lozza|engine|bot\b/i, 'how it plays, not what plays it');
    assert.ok(l.slip >= 0 && l.slip < 0.5);
    if (l.elo >= 1000) assert.equal(l.slip, 0, `${l.name} plays every move properly`);
  }
  assert.ok(COMPUTER_LEVELS[0].slip > COMPUTER_LEVELS[1].slip && COMPUTER_LEVELS[1].slip > COMPUTER_LEVELS[2].slip);
  assert.equal(levelBySlug(DEFAULT_LEVEL).elo, 1500);
  assert.equal(levelBySlug('nope'), null);
  assert.deepEqual(Object.keys(levelBot(COMPUTER_LEVELS[3])).sort(), ['about', 'display_name', 'elo', 'portrait', 'slip', 'slug']);
});

test('a beginner grabs captures and checks more often than not', () => {
  const moves = [{ san: 'a3' }, { san: 'h3' }, { san: 'Nf3' }, { san: 'Bxf7+', captured: 'p' }];
  const random = seeded(5); let grabs = 0;
  for (let i = 0; i < 400; i++) if (beginnerMove(moves, random).captured) grabs++;
  assert.ok(grabs > 200 && grabs < 360, `${grabs}`);
  assert.equal(beginnerMove([]), null);
  assert.equal(beginnerMove([{ san: 'e4' }]).san, 'e4');
});

test('the ladder is wired: no engine names on the cards, slips stay fair in the dark', () => {
  assert.match(main, /const DEFAULT_COMPUTER_BOTS=COMPUTER_LEVELS\.map\(levelBot\);/);
  assert.match(main, /data-about="\$\{escapeHtml\(bot\.about\|\|''\)\}"/);
  assert.doesNotMatch(main, /bot-engine/);
  assert.match(main, /if\(Number\(currentBot\?\.slip\)>0&&Math\.random\(\)<Number\(currentBot\.slip\)\)\{/);
  assert.match(main, /if\(blind\)\{const pool=moves\.filter\(m=>blind\.searchmoves\.includes/, 'blind, a slip never prefers captures it could not see');
  assert.match(main, /const games=\(out\.games\|\|\[\]\)\.filter\(g=>!g\.bot_player_id&&/);
});
