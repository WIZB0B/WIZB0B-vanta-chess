import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { emptyPockets, zhDrops, zhPlay, zhReplay, zhState, zhStatus } from '../supabase/functions/chess/crazyhouse.js';
import { isoWeek, previousWeek } from '../supabase/functions/chess/rules.js';

const fn = readFileSync(new URL('../supabase/functions/chess/index.ts', import.meta.url), 'utf8');
const sql = readFileSync(new URL('../supabase/migrations/20261011150000_round10_crazyhouse_ladder_commentary.sql', import.meta.url), 'utf8');
const play = (moves) => { let fen = new Chess().fen(), st = { pockets: emptyPockets(), promoted: [] }, last = null; for (const mv of moves) { const r = zhPlay(Chess, fen, st, mv); assert.ok(r, JSON.stringify(mv)); fen = r.fen; st = r.state; last = r.move; } return { fen, st, last }; };

test('crazyhouse: captures fill the pocket, drops spend it, turn passes', () => {
  const a = play([{ from: 'e2', to: 'e4' }, { from: 'd7', to: 'd5' }, { from: 'e4', to: 'd5' }]);
  assert.deepEqual(a.st.pockets, { w: { p: 1 }, b: {} });
  const b = zhPlay(Chess, a.fen, a.st, { drop: 'p', to: 'e4' });
  assert.equal(b, null, "it's Black's turn: White can't drop");
  const c = play([{ from: 'e2', to: 'e4' }, { from: 'd7', to: 'd5' }, { from: 'e4', to: 'd5' }, { from: 'd8', to: 'd5' }, { drop: 'p', to: 'e4' }]);
  assert.equal(c.last.san, 'P@e4'); assert.equal(new Chess(c.fen).turn(), 'b'); assert.deepEqual(c.st.pockets.w, {});
  assert.equal(zhPlay(Chess, c.fen, c.st, { drop: 'p', to: 'e1' }), null, 'no drops on occupied squares or back ranks');
});
test('crazyhouse: pawns never on the first or last rank; a drop can block mate; promoted pieces return as pawns', () => {
  const st = zhState({ w: { p: 1 }, b: {} }, []);
  const drops = zhDrops(Chess, new Chess('4k3/8/8/8/8/8/8/4K3 w - - 0 1'), st);
  assert.ok(drops.every(d => !/[18]$/.test(d.to))); assert.equal(drops.length, 48 - 0);
  const c = new Chess('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1'); c.move('Ra8');
  assert.equal(zhStatus(Chess, c, zhState({ w: {}, b: { n: 1 } }, [])).over, false, 'N@f8 or similar blocks');
  assert.equal(zhStatus(Chess, c, zhState({}, [])).result, '1-0');
  const promo = zhPlay(Chess, '7r/4P3/8/8/8/8/k7/4K3 w - - 0 1', zhState({}, []), { from: 'e7', to: 'e8', promotion: 'q' });
  assert.deepEqual(promo.state.promoted, ['e8']);
  const back = zhPlay(Chess, '4Q2r/8/8/8/8/8/k7/4K3 b - - 0 1', zhState({}, ['e8']), { from: 'h8', to: 'e8' });
  assert.deepEqual(back.state.pockets.b, { p: 1 }, 'the captured promoted queen is a pawn again');
  const r = zhReplay(Chess, [{ from: 'e2', to: 'e4', san: 'e4' }, { from: 'd7', to: 'd5' }, { from: 'e4', to: 'd5' }]);
  assert.equal(r.positions.length, 4); assert.deepEqual(r.state.pockets.w, { p: 1 });
});
test('ladder weeks are ISO weeks', () => {
  assert.equal(isoWeek(new Date('2026-10-11T12:00:00Z')), '2026-W41');
  assert.equal(isoWeek(new Date('2026-01-01T00:00:00Z')), '2026-W01');
  assert.equal(isoWeek(new Date('2027-01-01T00:00:00Z')), '2026-W53');
  assert.equal(previousWeek(new Date('2026-10-11T12:00:00Z')), '2026-W40');
});
test('server wiring: crazyhouse moves, no takebacks or explorer for it, ladder, commentary rights', () => {
  assert.match(fn, /const r=zhPlay\(Chess,g\.fen,zhState\(g\.zh_pockets,g\.zh_promoted\),b\.drop\?\{drop:b\.drop,to:b\.to\}:/);
  assert.match(fn, /let o:any=g\.variant==="bughouse"&&zhNext\?bughouseStatus\(Chess,c,zhNext\):zhNext\?zhStatus\(Chess,c,zhNext\):outcome\(c\)/, 'mate counts drops');
  assert.match(fn, /if\(g\.variant==="crazyhouse"\)throw fail\("Takebacks aren't available in Crazyhouse\.",409\);/);
  assert.match(fn, /g\.variant!=="standard"\|\|g\.start_fen\|\|Number\(g\.move_count\|\|0\)<6\)return;/, 'the explorer skips Crazyhouse (and every variant)');
  assert.match(fn, /if\(p\.role==="admin"\|\|t\.created_by===p\.id\)return true;/);
  assert.match(fn, /if\(t\.ladder\)EdgeRuntime\.waitUntil\(ladderRecord\(t\)/);
  for (const a of ['player_openings', 'battle_queue', 'battle_queue_status', 'battle_ladder', 'commentary_post']) assert.match(fn, new RegExp(`case "${a}":out=await`));
  assert.match(sql, /check \(variant in \('standard','freestyle','crazyhouse'\)\)/);
  assert.match(sql, /'freestyle','crazyhouse'\)\);/);
  for (const t of ['chess_battle_queue', 'chess_battle_ladder', 'chess_battle_weeks', 'chess_commentary']) assert.match(sql, new RegExp(`alter table public\\.${t} enable row level security`));
});
