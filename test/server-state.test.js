import test from 'node:test';
import assert from 'node:assert/strict';
import { createClockSnapshot, projectedClocks, seatFromEnvelope } from '../src/server-state.js';

test('seat is read from the authoritative envelope and can be derived from player ids', () => {
  assert.equal(seatFromEnvelope({ seat: 'white', game: {} }), 'w');
  assert.equal(seatFromEnvelope({ player: { id: 'p2' }, game: { white_player_id: 'p1', black_player_id: 'p2' } }), 'b');
});

test('authoritative clocks use v11 fields and server time', () => {
  const payload = { serverNow: '2026-10-03T12:00:10.000Z', game: { white_time_ms: 300000, black_time_ms: 280000, last_move_at: '2026-10-03T12:00:08.000Z', fen: '8/8/8/8/8/8/8/K6k b - - 0 1', status: 'active', move_count: 12 } };
  const received = Date.parse('2026-10-03T12:00:09.000Z');
  const snapshot = createClockSnapshot(payload, received);
  assert.deepEqual(projectedClocks(snapshot, received), { w: 300000, b: 278000 });
  assert.deepEqual(projectedClocks(snapshot, received + 1000), { w: 300000, b: 277000 });
});

test('clocks stand still until both sides have made their first move', () => {
  const at = Date.parse('2026-10-03T12:00:09.000Z');
  const base = { white_time_ms: 60000, black_time_ms: 60000, last_move_at: '2026-10-03T12:00:00.000Z', fen: '8/8/8/8/8/8/8/K6k b - - 0 1', status: 'active' };
  assert.deepEqual(projectedClocks(createClockSnapshot({ serverNow: '2026-10-03T12:00:09.000Z', game: { ...base, move_count: 1 } }, at), at + 5000), { w: 60000, b: 60000 });
  assert.equal(projectedClocks(createClockSnapshot({ serverNow: '2026-10-03T12:00:09.000Z', game: { ...base, move_count: 2 } }, at), at).b < 60000, true);
});
