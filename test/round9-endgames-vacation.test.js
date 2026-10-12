import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { DRILLS, drillById, drillStatus, starsFor, yourColor } from '../src/endgames.js';

const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const play = (fen, sans) => { const c = new Chess(fen); let last = null; for (const s of sans) last = c.move(s); return { c, last }; };

test('drills: legal positions, sensible goals', () => {
  for (const d of DRILLS) {
    const c = new Chess(d.fen);
    assert.ok(!c.isGameOver(), d.id);
    assert.ok(d.limit >= d.par, d.id);
    assert.ok(['mate', 'promote', 'hold'].includes(d.goal));
  }
  assert.equal(yourColor(drillById('kp-k-hold')), 'b', 'you defend; Stockfish moves first');
  assert.equal(yourColor(drillById('kq-k')), 'w');
});
test('drill status: mate, promotion that can be taken, stalemate, holding', () => {
  const kq = drillById('kq-k');
  const mated = play('7k/8/6K1/8/8/8/8/5Q2 w - - 0 1', ['Qf8#']);
  assert.deepEqual(drillStatus(kq, mated.c, 5, mated.last), { done: true, success: true, reason: 'mate' });
  const stale = play('7k/8/6K1/8/8/8/8/5Q2 w - - 0 1', ['Qf7']);
  assert.equal(drillStatus(kq, stale.c, 5, stale.last).reason, 'stalemate');
  assert.equal(drillStatus(kq, new Chess(kq.fen), kq.limit).reason, 'out of moves');
  const kp = drillById('kp-k-win');
  const hung = play('8/4Pk2/3K4/8/8/8/8/8 w - - 0 1', ['e8=Q+']);
  assert.equal(drillStatus(kp, hung.c, 4, hung.last).done, false, 'the king takes the new queen');
  const safe = play('8/3KP3/5k2/8/8/8/8/8 w - - 0 1', ['e8=Q']);
  assert.deepEqual(drillStatus(kp, safe.c, 5, safe.last), { done: true, success: true, reason: 'promoted' });
  const hold = drillById('kp-k-hold');
  assert.equal(drillStatus(hold, new Chess(hold.fen), 25).reason, 'held');
  const queened = new Chess('8/8/8/8/8/2k5/8/4Q1K1 b - - 0 1');
  assert.equal(drillStatus(hold, queened, 10).reason, 'queened');
  assert.equal(starsFor(kq, 9, true), 3); assert.equal(starsFor(kq, 15, true), 2); assert.equal(starsFor(kq, 20, true), 1); assert.equal(starsFor(kq, 5, false), 0);
});
test('wiring: drills own their engine worker; vacation in the daily list', () => {
  assert.match(main, /const egWorker=lazyWorker\('\/stockfish\.worker\.js'\)/);
  assert.match(main, /if\(egSession&&!remote\)return egMove\(move\);/);
  assert.match(main, /if\(kind!=='endgames'&&egSession\)endEndgame\(\);/);
  assert.match(main, /drawVacation\(daily\)/); assert.match(main, /On vacation until/);
  assert.match(main, /const leakActions=\{endgames:\(\)=>renderEndgames\(\),/);
});
