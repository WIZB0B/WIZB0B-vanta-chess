import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { playablePuzzleFen, puzzleStartFen } from '../src/puzzle-start.js';

// A real Lichess puzzle (EaXfa) as the live server returned it on 2026-10-12: the FEN was built
// one ply early (White to move) while the solution starts with Black's Rxc8.
const PGN = 'd4 d5 Nc3 Nf6 Bg5 e6 a3 Be7 f3 O-O e4 c5 e5 Nfd7 Be3 cxd4 Bxd4 Nc6 f4 Nxd4 Qxd4 Bc5 Qd3 Qh4+ g3 Qe7 Nf3 Nb6 Ng5 g6 O-O-O Nc4 h4 Bxa3 h5 Bxb2+ Kb1 Qa3 Na2 Qc5 hxg6 hxg6 Nxf7 Rxf7 Qxg6+ Kf8 Rh8+ Ke7 Qg5+ Kd7 Qd8+ Kc6 Qxc8+';
const EARLY = 'r1bQ3R/pp3r2/2k1p3/2qpP3/2n2P2/6P1/NbP5/1K1R1B2 w - - 7 27';
const SOLUTION = ['a8c8', 'h8c8', 'f7c7', 'c8c7', 'c6c7'];

test('puzzles start after the move that sets them (initialPly + 1)', () => {
  const fen = puzzleStartFen(Chess, PGN, 52);
  assert.equal(fen.split(' ')[1], 'b', 'Black, the solver, is to move');
  const c = new Chess(fen);
  for (const u of SOLUTION) assert.ok(c.move({ from: u.slice(0, 2), to: u.slice(2, 4) }), u);
  assert.ok(c.isGameOver() || c.history().length === 5);
  assert.equal(puzzleStartFen(Chess, '', 3), null);
  assert.equal(puzzleStartFen(Chess, 'e4 e5 Qh7', 5), null, 'an unreadable game gives no position');
});
test('the playable start: keep a FEN that fits, rebuild one that does not, refuse the rest', () => {
  assert.equal(playablePuzzleFen(Chess, { fen: EARLY, solution: SOLUTION, gamePgn: PGN, initialPly: 52 }).split(' ')[1], 'b');
  const good = 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4';
  assert.equal(playablePuzzleFen(Chess, { fen: good, solution: ['h5f7'] }), good, 'a FEN that fits is kept as it is');
  assert.equal(playablePuzzleFen(Chess, { fen: EARLY, solution: SOLUTION }), null, 'no game to rebuild from: skip it');
  assert.equal(playablePuzzleFen(Chess, { fen: good, solution: ['<script>'] }), null);
});
test('the server and the app both use it', () => {
  const fn = readFileSync(new URL('../supabase/functions/chess/index.ts', import.meta.url), 'utf8');
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(fn, /function puzzleFen\(payload:any\)\{\n  return playablePuzzleFen\(Chess,/);
  assert.match(fn, /const fen=servedPuzzleFen\(pick\);if\(!fen\)throw fail/, 'the daily puzzle is rebuilt too');
  assert.match(fn, /select\("id,fen,solution,rating,game_pgn,initial_ply"\)/, 'battle puzzles are rebuilt too');
  assert.match(main, /const startFen=playablePuzzleFen\(Chess,\{fen:puzzle\.fen,solution:puzzle\.solution\|\|puzzle\.moves\|\|\[\],gamePgn:puzzle\.gamePgn,initialPly:puzzle\.initialPly\}\);/);
});
