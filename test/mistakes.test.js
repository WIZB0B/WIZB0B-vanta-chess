import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BOX_DAYS, MASTERED_BOX, collectMistakes, dueMistakes, gradeMistake, mergeMistakes, mistakeStats } from '../src/mistakes.js';

const sw = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const review = {
  mine: 'w', gameId: 'g1', opponent: 'Scout',
  moves: [{ color: 'w', san: 'f3' }, { color: 'b', san: 'e5' }, { color: 'w', san: 'g4' }],
  positions: [START, 'p1', 'p2', 'p3'],
  results: [{ classification: 'inaccuracy', bestMove: 'e2e4', loss: 4 }, { classification: 'blunder', bestMove: 'd8h4', loss: 40 }, { classification: 'blunder', bestMove: 'g1f3', loss: 60 }],
};

test('collects only your costly moves that have a better move', () => {
  const m = collectMistakes(review, 1000);
  assert.equal(m.length, 1);
  assert.deepEqual({ id: m[0].id, fen: m[0].fen, best: m[0].best, played: m[0].played, moveNo: m[0].moveNo, due: m[0].due }, { id: 'g1:3', fen: 'p2', best: 'g1f3', played: 'g4', moveNo: 2, due: 1000 });
});
test('merge keeps one entry per position, newest first', () => {
  const a = collectMistakes(review, 1), b = collectMistakes({ ...review, gameId: 'g2' }, 2);
  assert.equal(mergeMistakes(a, b).length, 1);
  assert.equal(mergeMistakes(a, b)[0].id, 'g2:3');
});
test('spaced repetition: right moves it along, wrong sends it back', () => {
  let m = collectMistakes(review, 0)[0];
  m = gradeMistake(m, true, 0); assert.equal(m.box, 1); assert.equal(m.due, BOX_DAYS[1] * 86400000); assert.equal(m.fixed, true);
  assert.equal(dueMistakes([m], 1000).length, 0);
  m = gradeMistake(m, false, 5); assert.equal(m.box, 0); assert.equal(m.due, 5);
  for (let i = 0; i < MASTERED_BOX; i++) m = gradeMistake(m, true, 0);
  assert.deepEqual(mistakeStats([m], 1e15), { total: 1, due: 0, mastered: 1, fixed: 1 });
});
test('offline: the service worker caches the engine and app bundles and serves the app shell', () => {
  assert.match(sw, /stockfish-19-lite-single\.wasm/);
  assert.match(sw, /appBundles\(\)/);
  assert.match(sw, /event\.request\.mode === 'navigate' \? caches\.match\('\/'\)/);
  assert.match(sw, /url\.pathname\.startsWith\('\/api\/'\)/, 'the geo lookup is never cached');
});
