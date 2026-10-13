import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { ENGINES, LOZZA_BOTS, LOZZA_LEVELS, LOZZA_MAX_ELO, LOZZA_MIN_ELO, engineFor, engineName, lozzaBudget, lozzaNodes } from '../src/engine-roster.js';
import { REALMS } from '../src/campaign.js';

const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const worker = readFileSync(new URL('../public/lozza.worker.js', import.meta.url), 'utf8');

test('Lozza levels: measured, rising, and interpolated on a log scale', () => {
  for (let i = 1; i < LOZZA_LEVELS.length; i++) {
    assert.ok(LOZZA_LEVELS[i].elo > LOZZA_LEVELS[i - 1].elo && LOZZA_LEVELS[i].nodes > LOZZA_LEVELS[i - 1].nodes);
  }
  for (const level of LOZZA_LEVELS) assert.equal(lozzaNodes(level.elo), level.nodes);
  assert.equal(lozzaNodes(900), LOZZA_LEVELS[0].nodes, 'below the range: the lowest budget');
  assert.equal(lozzaNodes(3000), LOZZA_LEVELS.at(-1).nodes);
  const mid = lozzaNodes((LOZZA_LEVELS[1].elo + LOZZA_LEVELS[2].elo) / 2);
  assert.ok(mid > LOZZA_LEVELS[1].nodes && mid < LOZZA_LEVELS[2].nodes);
  assert.equal(lozzaBudget(1780, 0.5), 1000);
  assert.equal(lozzaBudget(1780, 0), 800);
  assert.ok(lozzaBudget(1780, 0.999) <= 1200);
});

test('engineFor: Lozza plays standard chess in its range; Stockfish plays everything else', () => {
  const lozza = { engine: 'lozza', elo: 1800 };
  assert.equal(engineFor(lozza, 'standard'), 'lozza');
  for (const rules of ['dark', 'blackout', 'freestyle']) assert.equal(engineFor(lozza, rules), 'stockfish19', rules);
  assert.equal(engineFor({ engine: 'lozza', elo: LOZZA_MIN_ELO - 1 }), 'stockfish19');
  assert.equal(engineFor({ engine: 'lozza', elo: LOZZA_MAX_ELO + 1 }), 'stockfish19');
  assert.equal(engineFor({ elo: 1800 }), 'stockfish19');
  assert.equal(engineFor(null), 'stockfish19');
  assert.equal(engineName('lozza'), 'Lozza 2.5');
  assert.equal(engineName('nope'), 'Stockfish 19');
  assert.deepEqual(Object.values(ENGINES).map(e => e.license), ['GPL-3.0', 'MIT', 'GPL-3.0']);
});

test('every Lozza opponent is inside the measured range', () => {
  for (const bot of LOZZA_BOTS) assert.equal(engineFor(bot, 'standard'), 'lozza', bot.slug);
  const battles = REALMS.flatMap(r => r.battles);
  const lozza = battles.filter(b => b.engine === 'lozza');
  assert.ok(lozza.length >= 4);
  for (const b of lozza) assert.equal(engineFor(b, b.rules), 'lozza', b.name);
  for (const b of battles.filter(b => b.boss)) assert.notEqual(b.engine, 'lozza', `${b.name}: bosses bend the rules, which takes Stockfish`);
});

test('the Lozza worker and its vendored engine', () => {
  assert.match(worker, /new Worker\('\/engines\/lozza-2\.5\.js'\)/);
  assert.match(worker, /engine\.terminate\(\)/, 'a search that cannot be stopped is ended with its worker');
  assert.doesNotMatch(worker, /\beval\(|new Function|importScripts|fetch\(/);
  assert.ok(existsSync(new URL('../vendor/lozza/LICENSE', import.meta.url)));
  assert.match(readFileSync(new URL('../vendor/lozza/LICENSE', import.meta.url), 'utf8'), /^MIT License/);
  assert.match(main, /const lozza=!blind&&engineFor\(currentBot,computerRules\)==='lozza',worker=lozza\?lozzaEngine:stockfish;/);
  assert.match(main, /if\(lozza\)worker\.postMessage\(\{mode:'bot',fen,nodes:lozzaBudget\(requestedElo\),requestId:id\}\);/);
});
