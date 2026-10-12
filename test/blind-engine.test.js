import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { beliefFen, blackoutBelief, capturedBy, engineBlind, lookAround, piecesOf, sharedMoves, startMemory } from '../src/blind-engine.js';

const START = new Chess().fen();
test('dark: the computer remembers your army from the start and sees only what its pieces see', () => {
  const mem = startMemory(Chess, START, 'b');
  assert.equal(mem.size, 16);
  const c = new Chess(); c.move('e4'); c.move('e5'); c.move('Nf3'); // White moved a knight out of Black's sight
  const { memory, seen } = lookAround(Chess, c.fen(), 'b', mem, { turn: 2 });
  assert.ok(memory.has('g1'), 'the knight is still believed to be on g1 (Black cannot see f3)');
  assert.ok(!seen.has('f3'));
  assert.ok(memory.has('e2') && !memory.has('e4'), 'a pawn does not see the square it is blocked on: e4 is dark, the e-pawn is still believed on e2');
  const later = new Chess(c.fen()); later.move('Bc5'); later.move('Ng5'); // the knight jumps into the bishop's sight? (no: f7 is seen by the king)
  const look2 = lookAround(Chess, later.fen(), 'b', memory, { turn: 3 });
  assert.equal(look2.seen.has('g5'), true, 'the queen on d8 sees g5 along the diagonal');
  assert.ok(look2.memory.has('g5') && !look2.memory.has('g1') && !look2.memory.has('f3'), 'seen at g5: the remembered knights are reconciled (two at most)') ;
});
test('dark: the believed board never has the enemy king in check on the engine\'s turn', () => {
  // Black remembers the white king on e1, but a black rook now attacks e1: the king must have moved.
  const real = '4k3/8/8/8/8/8/5K2/r7 b - - 0 40';
  const enemy = new Map([['e1', { type: 'k' }]]);
  const fen = beliefFen(Chess, real, 'b', enemy, { seen: new Set(['a2', 'a3', 'b1', 'c1', 'd1', 'e1', 'f1', 'g1', 'h1']) });
  assert.ok(fen, 'a position can still be built');
  const c = new Chess(fen), king = c.board().flat().find(p => p && p.type === 'k' && p.color === 'w').square;
  assert.ok(!c.isAttacked(king, 'b'), `the guessed king (${king}) is not in check`);
  assert.notEqual(king, 'e1');
});
test('the engine only picks moves legal on both boards', () => {
  // Real: a hidden white knight blocks d7-d5? (no) — a hidden pawn on e6 makes Black's bishop move f8-a3 impossible.
  const real = 'rnbqkbnr/pppp1ppp/4P3/8/8/8/PPPP1PPP/RNBQKBNR b KQkq - 0 3';
  const believed = 'rnbqkbnr/pppp1ppp/8/8/8/8/PPPP1PPP/RNBQKBNR b KQkq - 0 3';
  const moves = sharedMoves(Chess, real, believed);
  const realLegal = new Chess(real).moves({ verbose: true }).map(m => m.from + m.to + (m.promotion || ''));
  assert.ok(moves.every(m => realLegal.includes(m)), 'every candidate is legal for real');
  assert.ok(!moves.includes('d7e6') && !moves.includes('f7e6'), 'it does not capture a piece it cannot see');
  assert.deepEqual(sharedMoves(Chess, real, null).length, realLegal.length);
});
test('blackout: the engine plays from the board as it was when its lights went out', () => {
  const c = new Chess(); for (const m of ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6']) c.move(m);
  const snapshot = c.fen(); // Black's lights go out here (after four moves each)
  c.move('d4'); // White plays in the dark: Black should not know
  const fen = blackoutBelief(Chess, snapshot, [], c.fen(), 'b');
  const believed = piecesOf(Chess, fen);
  assert.equal(believed.get('d2')?.type, 'p', 'the white d-pawn is still believed on d2');
  assert.ok(!believed.has('d4'));
  assert.equal(engineBlind(c.history(), 'b'), true, 'Black has made four moves: its next two are blind');
  assert.equal(engineBlind(['e4', 'e5'], 'b'), false);
  assert.deepEqual(capturedBy(new Chess().moves({ verbose: true }).slice(0, 0), 'w'), {});
});
test('wired: the computer gets the believed board and only shared moves', () => {
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  const worker = readFileSync(new URL('../public/stockfish.worker.js', import.meta.url), 'utf8');
  assert.match(main, /blindSearch\(\)/);
  assert.match(worker, /return `go nodes \$\{clamp\(request\.nodes,MIN_NODES,MAX_NODES,100000\)\}\$\{request\.searchmoves\.length\?` searchmoves/);
});
