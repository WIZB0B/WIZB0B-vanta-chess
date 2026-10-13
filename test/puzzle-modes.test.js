import test from 'node:test';
import assert from 'node:assert/strict';
import { SKIP_MAX, SKIP_START, clockLabel, earnMilestone, loadBestSurvival, loadSkips, saveBestSurvival, spendSkip, survivalLeft, survivalSeconds } from '../src/puzzle-modes.js';

const memory = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) } };
const day = d => new Date(`2026-10-${String(d).padStart(2, '0')}T12:00:00Z`);

test('survival: less time as puzzles get harder; the countdown never goes negative', () => {
  assert.equal(survivalSeconds(0), 45);
  assert.ok(survivalSeconds(14) < survivalSeconds(3));
  assert.equal(survivalLeft(0, 1000, 1000 + 45000 + 5000), 0);
  assert.equal(survivalLeft(0, 0, 10000), 35000);
});
test('clock labels are m:ss', () => {
  assert.equal(clockLabel(0), '0:00');
  assert.equal(clockLabel(65400), '1:05');
  assert.equal(clockLabel(-5), '0:00');
});
test('skip tokens: two to start, one more per day, spending, milestones and the cap', () => {
  const s = memory();
  assert.equal(loadSkips(s, day(1)).tokens, SKIP_START);
  assert.equal(loadSkips(s, day(1)).daily, false, 'the first visit starts the purse');
  const next = loadSkips(s, day(2));
  assert.equal(next.tokens, SKIP_START + 1); assert.equal(next.daily, true);
  assert.equal(loadSkips(s, day(2)).daily, false, 'once a day');
  assert.equal(spendSkip(s, day(2)).tokens, SKIP_START);
  assert.equal(earnMilestone(9, s, day(2)), null);
  assert.equal(earnMilestone(10, s, day(2)).tokens, SKIP_START + 1);
  for (let d = 3; d < 12; d++) loadSkips(s, day(d));
  assert.equal(loadSkips(s, day(12)).tokens, SKIP_MAX, 'never more than the cap');
  assert.equal(earnMilestone(20, s, day(12)), null);
  for (let i = 0; i < SKIP_MAX; i++) assert.ok(spendSkip(s, day(12)));
  assert.equal(spendSkip(s, day(12)), null, 'no tokens, no skip');
});
test('the best survival run is kept', () => {
  const s = memory();
  assert.equal(loadBestSurvival(s), 0);
  assert.equal(saveBestSurvival(7, s), 7);
  assert.equal(saveBestSurvival(3, s), 7);
});
