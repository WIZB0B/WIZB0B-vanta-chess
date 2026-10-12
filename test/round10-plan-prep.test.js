import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { buildPlan, currentStreak, loadProgress, loadStreak, planComplete, tick } from '../src/training-plan.js';
import { prepReply, prepStats, prepSummary, prepTree } from '../src/prep.js';

const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const store = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) }; };

test('plan: built from your data; finishing it extends the streak, missing a day resets it', () => {
  const tasks = buildPlan({ repertoireLines: 2, mistakesDue: 1, endgames: [{ id: 'kq-k', title: 'Mate with the queen', stars: 3 }, { id: 'kr-k', title: 'Mate with the rook', stars: 1 }], weakTheme: 'fork', weakThemeLabel: 'Fork' });
  assert.deepEqual(tasks.map(t => t.id), ['puzzles', 'endgame', 'repertoire', 'mistakes', 'game']);
  assert.equal(tasks[1].drill, 'kr-k'); assert.equal(tasks[0].label, 'Solve 5 puzzles: Fork'); assert.equal(tasks[3].target, 1);
  const s = store(), small = buildPlan({});
  assert.deepEqual(small.map(t => t.id), ['puzzles', 'game']);
  for (let i = 0; i < 5; i++) tick(small, 'puzzles', s, '2026-10-10');
  let out = tick(small, 'game', s, '2026-10-10');
  assert.equal(out.completedNow, true); assert.equal(out.streak.days, 1);
  assert.equal(tick(small, 'game', s, '2026-10-10').completedNow, false, 'only once a day');
  for (let i = 0; i < 5; i++) tick(small, 'puzzles', s, '2026-10-11');
  out = tick(small, 'game', s, '2026-10-11');
  assert.equal(out.streak.days, 2); assert.equal(currentStreak(loadStreak(s), '2026-10-12'), 2);
  assert.equal(currentStreak(loadStreak(s), '2026-10-14'), 0, 'a missed day ends it');
  assert.equal(planComplete(small, loadProgress(s, '2026-10-12')), false, 'a new day starts empty');
});
test('prep: their moves by frequency, with their score', () => {
  const lines = [{ sans: ['e4', 'c5', 'Nf3'], score: 1 }, { sans: ['e4', 'c5', 'Nc3'], score: 0 }, { sans: ['e4', 'e5'], score: 0.5 }, { sans: ['d4', 'd5'], score: 1 }];
  const tree = prepTree(lines), start = new Chess().fen();
  assert.deepEqual(prepStats(tree, start).map(r => [r.san, r.n, r.share]), [['e4', 3, 75], ['d4', 1, 25]]);
  assert.equal(prepReply(tree, start, () => 0), 'e4'); assert.equal(prepReply(tree, start, () => 0.99), 'd4');
  const afterE4C5 = new Chess(); afterE4C5.move('e4'); afterE4C5.move('c5');
  assert.deepEqual(prepStats(tree, afterE4C5.fen()).map(r => r.score), [100, 0]);
  assert.equal(prepReply(tree, new Chess('8/8/8/8/8/8/8/K6k w - - 0 1').fen()), null, 'out of book');
  assert.deepEqual(prepSummary(lines)[0], { line: '1.e4 c5', n: 2 });
});
test('wiring: plan ticks from the places you train; prep owns the board', () => {
  for (const id of ['puzzles', 'game', 'repertoire', 'mistakes', 'endgame']) assert.match(main, new RegExp(`markPlan\\('${id}'\\)`));
  assert.match(main, /if\(prepSession&&!remote\)return prepMove\(move\);/);
  assert.match(main, /if\(kind!=='prep'&&prepSession\)endPrep\(\);/);
  assert.match(main, /<button class="pp-prep">Prep against/);
});
