import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FIRST_MOVE_MS, abortDue, explorerKey, firstMovesPending } from '../supabase/functions/chess/rules.js';

const fn = readFileSync(new URL('../supabase/functions/chess/index.ts', import.meta.url), 'utf8');
const sql = readFileSync(new URL('../supabase/migrations/20261011000000_round7_notifications_explorer.sql', import.meta.url), 'utf8');

test('first moves are untimed; no first move in 30s aborts (never in daily games)', () => {
  assert.equal(firstMovesPending(0), true); assert.equal(firstMovesPending(1), true); assert.equal(firstMovesPending(2), false);
  const t0 = Date.parse('2026-10-10T12:00:00Z');
  assert.equal(abortDue({ moveCount: 0, lastMoveAt: '2026-10-10T12:00:00Z', now: t0 + FIRST_MOVE_MS + 1 }), true);
  assert.equal(abortDue({ moveCount: 1, lastMoveAt: '2026-10-10T12:00:00Z', now: t0 + 5000 }), false);
  assert.equal(abortDue({ moveCount: 2, lastMoveAt: '2026-10-10T12:00:00Z', now: t0 + 600000 }), false);
  assert.equal(abortDue({ moveCount: 0, lastMoveAt: '2026-10-10T12:00:00Z', daily: true, now: t0 + 600000 }), false);
  assert.match(fn, /if\(!g\.daily_days&&firstMovesPending\(g\.move_count\)\)timing\.chargedElapsedMs=0;/);
  assert.match(fn, /status:"aborted",result:"\*",end_reason:"aborted"/);
});
test('explorer key ignores move counters', () => {
  assert.equal(explorerKey('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'), 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -');
});
test('server wiring: pipelined replies, inbox for every notification, explorer fairness, service-only RPC', () => {
  assert.match(fn, /if\(Number\(b\.expectedVersion\)===Number\(g\.version\)\+1&&g\.status==="active"\)\{/);
  assert.match(fn, /await inbox\(playerId,payload\)/);
  assert.match(fn, /The explorer is off for positions in your live games\./);
  for (const a of ['notifications', 'notifications_read', 'opening_explorer', 'explorer_backfill']) assert.match(fn, new RegExp(`case "${a}":out=await`));
  assert.match(sql, /revoke execute on function public\.chess_explorer_add\(jsonb\) from public, anon, authenticated;/);
  assert.match(sql, /url like '\/%' and url not like '\/\/%'/, 'notification links stay on this site');
  assert.match(sql, /alter table public\.chess_notifications enable row level security/);
});
