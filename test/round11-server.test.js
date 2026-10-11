import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { materialOf, momentCaption, momentScore, MOMENT_MIN_PLIES } from '../supabase/functions/chess/rules.js';

const fn = readFileSync(new URL('../supabase/functions/chess/index.ts', import.meta.url), 'utf8');
const sql = readFileSync(new URL('../supabase/migrations/20261011180000_round11_moment_of_week.sql', import.meta.url), 'utf8');

test('moment of the week: material and scoring favour mates while down material', () => {
  assert.deepEqual(materialOf('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'), { w: 39, b: 39 });
  const down = momentScore({ fen: '6k1/5ppp/8/8/8/8/q7/R5K1 b - - 0 1', result: '1-0', mate: true, plies: 40 });
  const even = momentScore({ fen: '6k1/5ppp/8/8/8/8/8/R5K1 b - - 0 1', result: '1-0', mate: true, plies: 40 });
  assert.equal(down.down, 7); assert.ok(down.score > even.score);
  assert.equal(momentCaption(down), 'Checkmate while 7 points down');
  assert.equal(momentCaption(even), 'Checkmate in 20 moves');
  assert.equal(momentScore({ fen: '8/8/8/8/8/8/8/8 w - - 0 1', result: '1-0', mate: false, plies: 40 }), null, 'resignations are not moments');
  assert.equal(momentScore({ fen: '8/8/8/8/8/8/8/8 w - - 0 1', result: '1/2-1/2', mate: true, plies: 40 }), null);
  assert.equal(momentScore({ fen: '8/8/8/8/8/8/8/8 w - - 0 1', result: '0-1', mate: true, plies: MOMENT_MIN_PLIES - 1 }), null, 'too short');
  const fast = momentScore({ fen: '6k1/5ppp/8/8/8/8/8/R5K1 b - - 0 1', result: '1-0', mate: true, plies: 20 });
  assert.ok(fast.score > even.score, 'quicker mates rank higher at equal material');
});
test('moment of the week: server actions, admin-only pick, banned players excluded', () => {
  assert.match(fn, /case "moment_of_week":out=await momentOfWeek\(\);/);
  assert.match(fn, /case "moment_pick":out=await momentPick\(req,b\);/);
  assert.match(fn, /async function momentPick[\s\S]{0,200}p\.role!=="admin"\)throw fail\("Not found\.",404\)/);
  assert.match(fn, /bannedAmong/);
  assert.match(fn, /\.eq\("rated",true\)\.eq\("variant","standard"\)/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /using \(false\) with check \(false\)/);
});
