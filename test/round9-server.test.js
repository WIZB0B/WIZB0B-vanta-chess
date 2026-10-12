import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BATTLE_MAX_MISSES, VACATION_DAYS, battleOver, battleSet, battleWinner, cleanRepertoire, onVacation, vacationLeft, vacationOverlapMs } from '../supabase/functions/chess/rules.js';

const fn = readFileSync(new URL('../supabase/functions/chess/index.ts', import.meta.url), 'utf8');
const sql = readFileSync(new URL('../supabase/migrations/20261011120000_round9_repertoire_battle_simul_vacation.sql', import.meta.url), 'utf8');
const day = 86400000, t0 = Date.parse('2026-10-11T00:00:00Z');

test('vacation: 14 days a year, resets in January, overlap is added back to the move clock', () => {
  assert.equal(VACATION_DAYS, 14);
  assert.equal(vacationLeft({ vacation_year: 2026, vacation_used: 5 }, t0), 9);
  assert.equal(vacationLeft({ vacation_year: 2025, vacation_used: 14 }, t0), 14, 'a new year, a new allowance');
  const p = { vacation_from: new Date(t0 + day).toISOString(), vacation_until: new Date(t0 + 4 * day).toISOString() };
  assert.equal(onVacation(p, t0 + 2 * day), true); assert.equal(onVacation(p, t0 + 5 * day), false); assert.equal(onVacation(p, t0), false);
  assert.equal(vacationOverlapMs(p, t0, t0 + 10 * day), 3 * day);
  assert.equal(vacationOverlapMs(p, t0 + 2 * day, t0 + 10 * day), 2 * day, 'only the part during this move');
  assert.equal(vacationOverlapMs({}, t0, t0 + day), 0);
  assert.match(fn, /if\(away&&elapsed-vacationOverlapMs\(away,Date\.parse\(g\.last_move_at\)\)<remain\)return g/);
});
test('puzzle battle: easy to hard, three misses each ends it early, higher score wins', () => {
  const set = battleSet([...Array(50)].map((_, i) => ({ id: String(i), rating: 2000 - i * 20 })), 30, () => 0.5);
  assert.equal(set.length, 30); assert.ok(set.every((x, i) => !i || x.rating >= set[i - 1].rating));
  const live = { status: 'live', ends_at: new Date(t0 + 180000).toISOString(), host_misses: 1, guest_misses: 0 };
  assert.equal(battleOver(live, t0), false); assert.equal(battleOver(live, t0 + 180001), true);
  assert.equal(battleOver({ ...live, host_misses: BATTLE_MAX_MISSES, guest_misses: BATTLE_MAX_MISSES }, t0), true);
  assert.equal(battleWinner({ host_score: 7, guest_score: 9 }), 'guest'); assert.equal(battleWinner({ host_score: 4, guest_score: 4 }), 'draw');
});
test('repertoire lines: SAN only, deduplicated, capped', () => {
  assert.deepEqual(cleanRepertoire([['e4', 'e5', 'Nf3'], ['e4', 'e5', 'Nf3'], ['e4', 'drop table'], 'x', [], ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'Nf3', 'O-O']]), [['e4', 'e5', 'Nf3'], ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'Nf3', 'O-O']]);
  assert.equal(cleanRepertoire([...Array(400)].map((_, i) => ['e4', i % 2 ? 'e5' : 'c5', `a${(i % 6) + 3}`, String(i)])).length, 0, 'junk SAN is dropped');
  assert.match(fn, /const lines=cleanRepertoire\(b\.lines\)\.filter\(\(sans:string\[\]\)=>\{const c=new Chess\(\);/, 'every line is replayed for legality');
});
test('simuls: no first-move abort, no claiming against a host on another board; private boards', () => {
  assert.match(fn, /if\(!g\.daily_days&&!g\.simul_id&&firstMovesPending\(g\.move_count\)\)\{/);
  assert.match(fn, /if\(g\.simul_id\)throw fail\("In a simul the host moves between boards; the clock decides\.",409\);/);
  assert.match(fn, /createGame\(req,\{seconds:s\.base_seconds,increment:s\.increment_seconds,rated:false\},\{players:\[p,opp\],source:"private",simulId:s\.id\}\)/);
  assert.match(fn, /code:mine\?g\.invite_code:null/, 'room codes only for your own boards');
  for (const a of ['repertoire_get', 'repertoire_save', 'insights', 'battle_create', 'battle_join', 'battle_state', 'battle_progress', 'battle_cancel', 'simul_list', 'simul_create', 'simul_join', 'simul_leave', 'simul_start', 'simul_state', 'vacation']) assert.match(fn, new RegExp(`case "${a}":out=await`));
});
test('migration: server-only tables and bounded columns', () => {
  for (const t of ['chess_repertoires', 'chess_puzzle_battles', 'chess_simuls', 'chess_simul_entries']) assert.match(sql, new RegExp(`alter table public\\.${t} enable row level security`));
  assert.match(sql, /using \(false\) with check \(false\)/);
  assert.match(sql, /vacation_used integer not null default 0 check \(vacation_used between 0 and 14\)/);
  assert.match(sql, /jsonb_array_length\(lines\) <= 300/);
});
