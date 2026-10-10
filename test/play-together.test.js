import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { arenaPhase, isWeeklyArena, sortArenas, standingsRows } from '../src/arena.js';

const server = readFileSync('supabase/functions/chess/index.ts', 'utf8');
const main = readFileSync('src/main.js', 'utf8');

test('arena phases read naturally', () => {
  const now = Date.parse('2026-10-10T12:00:00Z');
  assert.equal(arenaPhase({ starts_at: '2026-10-10T18:00:00Z', ends_at: '2026-10-10T19:30:00Z' }, now).label, 'Starts in 6h 0m');
  assert.equal(arenaPhase({ starts_at: '2026-10-10T11:00:00Z', ends_at: '2026-10-10T12:52:00Z' }, now).label, 'Live · ends in 52m');
  assert.equal(arenaPhase({ starts_at: '2026-01-01T00:00:00Z', ends_at: '2027-01-01T00:00:00Z' }, now).label, 'Open now');
  assert.equal(arenaPhase({ status: 'finished' }, now).phase, 'finished');
  const sorted = sortArenas([{ slug: 'open-arena', starts_at: '2026-01-01', ends_at: '2027-01-01' }, { slug: 'weekly-arena-2026-10-10', starts_at: '2026-10-10T18:00:00Z', ends_at: '2026-10-10T19:30:00Z' }], now);
  assert.ok(isWeeklyArena(sorted[0]));
  assert.deepEqual(standingsRows([{ username: 'a', points: 4, wins: 2 }])[0], { rank: 1, name: 'a', points: 4, record: '2W 0D 0L', fire: false, berserks: 0 });
  assert.equal(standingsRows([{ username: 'b', streak: 3 }])[0].fire, true);
});

test('server: takebacks only in casual human games, cleared by any move', () => {
  assert.match(server, /if\(g\.rated\|\|g\.bot_player_id\|\|g\.tournament_id\)throw fail\("Takebacks are for casual games between two players\.",409\)/);
  assert.match(server, /draw_offer_by:null,takeback_offer_by:null,takeback_offer_version:null,/);
  assert.match(server, /Number\(g\.takeback_offer_version\)!==Number\(g\.version\)/, 'an offer lapses once the game moves on');
});

test('server: Watch lists only public games and hides player ids', () => {
  assert.match(server, /\.in\("source",\["queue","tournament"\]\)/);
  const fields = server.match(/const WATCH_FIELDS="([^"]+)"/)[1].split(',');
  for (const secret of ['white_player_id', 'black_player_id', 'invite_code', 'white_last_seen_at', 'draw_offer_by']) assert.ok(!fields.includes(secret), secret);
});

test('server: weekly arena every Saturday 18:00 UTC, and arenas only open in their window', () => {
  assert.match(server, /const WEEKLY_ARENA=\{hourUtc:18,minutes:90,base:180,inc:2,pool:"blitz"\}/);
  assert.match(server, /arenaOpen\(tournament\)/);
});

test('client: spectators cannot move and get no engine help', () => {
  assert.match(main, /if\(mode==='watch'\)return; \/\/ spectators can't move/);
  assert.match(main, /if\(browse\|\|mode==='watch'\|\|mode==='archive'\)return '';/);
  assert.match(main, /if\(mode==='watch'\)return \['active','playing','in_progress'\]\.includes\(watchSession\?\.state\?\.status\);/);
});
