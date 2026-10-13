import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { COMPUTER_LEVELS, DEFAULT_LEVEL, LEVEL_TIERS, beginnerMove, levelBot, levelBySlug } from '../src/computer-levels.js';
const seeded = (seed = 1) => { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; };

const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');

test('twelve levels, Beginner to Maximum, each stronger than the last', () => {
  assert.equal(COMPUTER_LEVELS.length, 12);
  assert.equal(COMPUTER_LEVELS[0].name, 'Beginner');
  assert.equal(COMPUTER_LEVELS.at(-1).name, 'Maximum');
  for (let i = 1; i < COMPUTER_LEVELS.length; i++) assert.ok(COMPUTER_LEVELS[i].elo > COMPUTER_LEVELS[i - 1].elo);
  assert.equal(new Set(COMPUTER_LEVELS.map(l => l.slug)).size, 12);
  assert.deepEqual(COMPUTER_LEVELS.map(l => l.level), Array.from({ length: 12 }, (_, i) => i + 1), 'numbered 1 to 12');
  assert.ok(COMPUTER_LEVELS.every(l => !('portrait' in l)), 'no chess pieces stand for strength');
  for (const l of COMPUTER_LEVELS) {
    assert.doesNotMatch(`${l.name} ${l.about}`, /Stockfish|Lozza|engine|bot\b/i, 'how it plays, not what plays it');
    assert.ok(l.slip >= 0 && l.slip < 0.5);
    if (l.elo >= 1000) assert.equal(l.slip, 0, `${l.name} plays every move properly`);
  }
  assert.ok(COMPUTER_LEVELS[0].slip > COMPUTER_LEVELS[1].slip && COMPUTER_LEVELS[1].slip > COMPUTER_LEVELS[2].slip);
  assert.equal(levelBySlug(DEFAULT_LEVEL).elo, 1500);
  assert.equal(levelBySlug('nope'), null);
  assert.deepEqual(Object.keys(levelBot(COMPUTER_LEVELS[3])).sort(), ['about', 'display_name', 'elo', 'level', 'slip', 'slug', 'tier', 'title']);
});

test('tiers by rating, like chess sites, and the titles a player that strong would hold', () => {
  assert.deepEqual(LEVEL_TIERS.map(t => t.name), ['Beginner', 'Intermediate', 'Advanced', 'Masters', 'Full strength']);
  assert.deepEqual(LEVEL_TIERS.map(t => t.range), ['400–900', '1200–1500', '1800–2000', '2200–2800', '3200']);
  // Tiers never overlap and climb with the rating.
  let last = 0;
  for (const tier of LEVEL_TIERS) {
    const elos = COMPUTER_LEVELS.filter(l => l.tier === tier.name).map(l => l.elo);
    assert.ok(elos.length && Math.min(...elos) > last); last = Math.max(...elos);
  }
  assert.ok(COMPUTER_LEVELS.every(l => LEVEL_TIERS.some(t => t.name === l.tier)));
  // FIDE titles: CM from 2200, IM from 2400, GM from 2500; none below master strength or on the full-strength level.
  for (const l of COMPUTER_LEVELS) {
    const want = l.slug === 'maximum' || l.elo < 2200 ? '' : l.elo >= 2500 ? 'GM' : l.elo >= 2400 ? 'IM' : 'CM';
    assert.equal(l.title, want, l.name);
  }
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
  assert.doesNotMatch(main, /bot-engine|bot-portrait/);
  assert.match(main, /grid\.innerHTML=LEVEL_TIERS\.map\(tier=>/, 'cards grouped by tier');
  assert.match(main, /if\(Number\(currentBot\?\.slip\)>0&&Math\.random\(\)<Number\(currentBot\.slip\)\)\{/);
  assert.match(main, /if\(blind\)\{const pool=moves\.filter\(m=>blind\.searchmoves\.includes/, 'blind, a slip never prefers captures it could not see');
  assert.match(main, /const games=\(out\.games\|\|\[\]\)\.filter\(g=>!g\.bot_player_id&&/);
});
