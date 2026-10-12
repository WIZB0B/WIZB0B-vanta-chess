import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { applyCastle, castleForMove, castleOptions, initialRights, replay960, rightsAfterMove } from '../supabase/functions/chess/castle960.js';
import { freestyleBackRank, freestyleFen, swissPairs } from '../supabase/functions/chess/rules.js';

const fn = readFileSync(new URL('../supabase/functions/chess/index.ts', import.meta.url), 'utf8');
const sql = readFileSync(new URL('../supabase/migrations/20261010220000_round6_moderation_studies_swiss.sql', import.meta.url), 'utf8');
const START = 'nrkbqbrn/pppppppp/8/8/8/8/PPPPPPPP/NRKBQBRN w - - 0 1';

test('960 rights: outermost rooks either side of the king; standard is HAha', () => {
  assert.equal(initialRights(new Chess().fen()), 'HAha');
  assert.equal(initialRights(START), 'GBgb');
});
test('960 castling: the king lands on c/g, the rook on d/f, all paths clear', () => {
  const r = replay960(Chess, START, ['e3', 'e6', 'Bde2', 'Bde7']);
  const opts = castleOptions(r.chess, r.rights, Chess);
  assert.deepEqual(opts.map(o => [o.san, o.kingFrom, o.kingTo, o.rookFrom, o.rookTo]), [['O-O-O', 'c1', 'c1', 'b1', 'd1']]);
  const after = new Chess(applyCastle(r.chess.fen(), opts[0]));
  assert.equal(after.get('d1').type, 'r'); assert.equal(after.get('c1').type, 'k'); assert.ok(!after.get('b1'));
  assert.equal(after.turn(), 'b');
  assert.equal(castleForMove(opts, 'c1', 'b1')?.san, 'O-O-O', 'king onto its own rook castles');
});
test('960 castling is refused through check, attacked squares or pieces', () => {
  // Standard start, kingside: f1/g1 occupied.
  const c = new Chess();
  assert.deepEqual(castleOptions(c, 'HAha', Chess), []);
  // Cleared kingside, but a black rook on the f-file attacks f1.
  const attacked = new Chess('4k3/8/8/8/8/8/8/R3K2R w - - 0 1'); attacked.put({ type: 'r', color: 'b' }, 'f8');
  attacked.remove('f2');
  assert.deepEqual(castleOptions(attacked, 'HA', Chess).map(o => o.san), ['O-O-O']);
});
test('rights: a king move loses both, a rook move or capture loses one', () => {
  assert.equal(rightsAfterMove('HAha', { color: 'w', piece: 'k', from: 'e1', to: 'e2' }), 'ha');
  assert.equal(rightsAfterMove('HAha', { color: 'w', piece: 'r', from: 'h1', to: 'h3' }), 'Aha');
  assert.equal(rightsAfterMove('HAha', { color: 'w', piece: 'b', from: 'b7', to: 'a8', captured: 'r' }), 'HAh');
});
test('random 960 starts always give both sides two castling rooks', () => {
  for (let i = 0; i < 200; i++) assert.equal(initialRights(freestyleFen(freestyleBackRank())).length, 4);
});
test('Swiss: no rematches while avoidable, a bye for the lowest without one, colours balance', () => {
  const p = id => ({ id, opponents: [], whites: 0, games: 0, byes: 0 });
  const r1 = swissPairs([p('a'), p('b'), p('c'), p('d'), p('e')]);
  assert.equal(r1.bye, 'e'); assert.equal(r1.pairs.length, 2);
  const players = [{ id: 'a', opponents: ['b'], whites: 1, games: 1 }, { id: 'b', opponents: ['a'], whites: 0, games: 1 }, { id: 'c', opponents: ['d'], whites: 1, games: 1 }, { id: 'd', opponents: ['c'], whites: 0, games: 1 }];
  const r2 = swissPairs(players);
  for (const [w, b] of r2.pairs) assert.ok(!players.find(x => x.id === w).opponents.includes(b), 'no rematch');
  const bal = id => { const x = players.find(y => y.id === id); return x.whites - (x.games - x.whites) };
  for (const [w, b] of r2.pairs) assert.ok(bal(w) <= bal(b), 'White goes to whoever had it less');
  assert.deepEqual(swissPairs([{ id: 'a', whites: 1, games: 1 }, { id: 'b', whites: 0, games: 1 }]).pairs, [['b', 'a']]);
  assert.equal(swissPairs([{ id: 'x', opponents: ['y'] }, { id: 'y', opponents: ['x'] }]).pairs.length, 1, 'rematch only when unavoidable');
});
test('server wiring: moderation is admin-only and audited; suspended and muted players are stopped', () => {
  assert.match(fn, /if\(p\.role!=="admin"\)throw fail\("Not found\.",404\)/);
  assert.match(fn, /await admin\.from\("chess_mod_actions"\)\.insert\(\{moderator_id:mod\.id,player_id:id,action,note\}\)/);
  for (const a of ['mod_queue', 'mod_player', 'mod_action', 'study_save', 'study_get', 'study_list', 'study_delete', 'tournament_create', 'account_export', 'account_delete']) assert.match(fn, new RegExp(`case "${a}":out=await`));
  assert.match(fn, /assertAllowed\(p,"chat"\)/);
  assert.match(fn, /\.is\("banned_at",null\)/, 'suspended players leave the leaderboard');
  assert.match(fn, /const \{device_hash,auth_user_id,\.\.\.profile\}=p;/, 'exports never include the device hash or auth id');
  assert.match(fn, /if\(String\(b\.confirm\|\|""\)\.trim\(\)\.toLowerCase\(\)!==String\(p\.username\|\|""\)\.toLowerCase\(\)\)/);
  assert.match(fn, /if\(g\.variant==="freestyle"&&b\.castle\)\{/);
  assert.match(fn, /if\(tournament\.format==="swiss"\)throw fail/);
  for (const t of ['chess_mod_actions', 'chess_studies']) assert.match(sql, new RegExp(`'${t}'`));
  assert.match(sql, /alter table public\.chess_studies enable row level security/);
});
