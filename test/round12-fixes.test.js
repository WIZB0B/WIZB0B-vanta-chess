import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { boardEndReason, gamePgn, isFullPgn, positionKey, repetitionCount, PGN_START_FEN } from '../supabase/functions/chess/rules.js';

const fn = readFileSync(new URL('../supabase/functions/chess/index.ts', import.meta.url), 'utf8');

test('game record: every ending writes the whole game with its termination', () => {
  const moves = ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6', 'Qxf7#'].map(san => ({ san }));
  const pgn = gamePgn({ white_name: 'Ana', black_name: 'Ben', rated: true, time_control_seconds: 600, increment_seconds: 5, started_at: '2026-10-11T20:00:00Z' }, moves, '1-0', 'checkmate');
  assert.ok(isFullPgn(pgn));
  assert.match(pgn, /\[Event "VCH rated game"\]/);
  assert.match(pgn, /\[Date "2026\.10\.11"\]/);
  assert.match(pgn, /\[TimeControl "600\+5"\]/);
  assert.match(pgn, /\[Termination "checkmate"\]/);
  assert.match(pgn, /\n\n1\. e4 e5 2\. Bc4 Nc6 3\. Qh5 Nf6 4\. Qxf7# 1-0$/);
  // the stored record replays in chess.js (what Review and downloads use)
  const c = new Chess(); c.loadPgn(pgn); assert.equal(c.history().length, 7); assert.ok(c.isCheckmate());
  // a resignation keeps every move, not just the last one
  const resigned = gamePgn({}, moves.slice(0, 4), '0-1', 'resign');
  assert.match(resigned, /1\. e4 e5 2\. Bc4 Nc6 0-1$/);
  assert.match(resigned, /\[Termination "resignation"\]/);
  assert.match(gamePgn({}, [], '1/2-1/2', 'agreement'), /\[Termination "draw by agreement"\]/);
  assert.match(gamePgn({}, moves.slice(0, 2), '1-0', 'timeout'), /\[Termination "time forfeit"\]/);
});

test('game record: variants, set-up positions, daily games and unsafe names', () => {
  const zh = gamePgn({ variant: 'crazyhouse' }, ['e4', 'd5', 'exd5', 'Qxd5', 'P@c4'].map(san => ({ san })), '0-1', 'resign');
  assert.match(zh, /\[Event "VCH Crazyhouse"\]\n[\s\S]*\[Variant "Crazyhouse"\]/);
  assert.match(zh, /3\. P@c4 0-1$/);
  assert.doesNotMatch(zh, /\[FEN /);
  const start = 'bqnbrkrn/pppppppp/8/8/8/8/PPPPPPPP/BQNBRKRN w GEge - 0 1';
  const fs = gamePgn({ variant: 'freestyle', start_fen: start }, [{ san: 'e4' }, { san: 'O-O' }], '*');
  assert.match(fs, /\[Variant "Chess960"\]\n\[SetUp "1"\]\n\[FEN "bqnbrkrn/);
  const blackFirst = gamePgn({ start_fen: '4k3/8/8/8/8/8/8/4K2R b K - 0 30' }, [{ san: 'Kd7' }, { san: 'O-O' }], '*');
  assert.match(blackFirst, /\n\n30\.\.\. Kd7 31\. O-O \*$/);
  assert.doesNotMatch(gamePgn({ daily_days: 3, time_control_seconds: 259200 }, [], '*'), /TimeControl/);
  const odd = gamePgn({ white_name: 'x"]\n[Evil "1', black_name: '' }, [], '*');
  assert.match(odd, /\[White "x\]\[Evil 1"\]/, 'quotes, backslashes and newlines are stripped from names');
  assert.match(odd, /\[Black "Black"\]/);
  // long games wrap at 80 characters
  const long = gamePgn({}, Array.from({ length: 120 }, () => ({ san: 'Nf3' })), '*');
  assert.ok(long.split('\n\n')[1].split('\n').every(l => l.length <= 80));
  assert.equal(isFullPgn('1. e4'), false);
  assert.equal(PGN_START_FEN.split(' ').length, 6);
});

test('end reasons from the board', () => {
  assert.equal(boardEndReason(new Chess('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1')), 'stalemate');
  assert.equal(boardEndReason(new Chess('8/8/8/4k3/8/8/8/4K3 w - - 0 1')), 'insufficient_material');
  assert.equal(boardEndReason(new Chess('8/8/8/4k3/8/8/4P3/4K3 w - - 100 80')), 'fifty_moves');
  const mate = new Chess(); for (const m of ['f3', 'e5', 'g4', 'Qh4#']) mate.move(m);
  assert.equal(boardEndReason(mate), 'checkmate');
  assert.equal(boardEndReason(new Chess()), null);
});

test('threefold repetition is found across the stored game, not just the last board', () => {
  const play = (sans, start = PGN_START_FEN) => {
    const c = new Chess(start), history = [];
    let count = 0;
    for (const san of sans) {
      c.move(san);
      // the server rebuilds the board from a FEN each move, so chess.js alone never sees repeats
      assert.equal(new Chess(c.fen()).isThreefoldRepetition(), false);
      const key = positionKey(c.fen());
      history.push({ san, k: key });
      count = repetitionCount(history, key, positionKey(start), Number(c.fen().split(' ')[4]));
    }
    return count;
  };
  const shuffle = ['Nf3', 'Nf6', 'Ng1', 'Ng8'];
  assert.equal(play(shuffle), 2, 'start position seen twice');
  assert.equal(play([...shuffle, ...shuffle]), 3, 'third time: draw');
  assert.equal(play(['e4', 'e5', ...shuffle, ...shuffle.slice(0, 3)]), 2);
  assert.equal(play(['e4', 'e5', ...shuffle, ...shuffle]), 3, 'a run after a pawn move still counts');
  // a pawn move in between resets the run
  assert.equal(play(['Nf3', 'Nf6', 'Ng1', 'Ng8', 'e4', 'e5', 'Nf3', 'Nf6', 'Ng1', 'Ng8']), 2);
  // positions without stored keys (games from before this change) never draw by mistake
  assert.equal(repetitionCount([{}, {}, {}, {}, {}, {}, {}, {}], 'x', 'y', 8), 1);
  // castling rights are part of the position
  assert.notEqual(positionKey('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1'), positionKey('r3k2r/8/8/8/8/8/8/R3K2R w Kkq - 0 1'));
  assert.equal(positionKey('8/8/8/8/8/8/8/8 w - - 4 9', 'AHah'), '8/8/8/8/8/8/8/8 w - - AHah');
});

test('server: endings write the record, draws by agreement and board endings keep a reason, moves store keys', () => {
  assert.match(fn, /import \{ boardEndReason, gamePgn, isFullPgn, positionKey, repetitionCount \} from "\.\/rules\.js";/);
  assert.match(fn, /function fullPgn\(g:any,moves:any\[\],result:string,reason:string\|null=null\)\{return gamePgn\(g,moves,result,reason\)\}/);
  assert.match(fn, /\.\.\.endRecord\(g,patch\.result,"timeout"\),end_reason:"timeout"/);
  assert.match(fn, /\.\.\.endRecord\(g,patch\.result,"abandoned"\),end_reason:"abandoned"/);
  assert.match(fn, /async function resign[\s\S]{0,600}\.\.\.endRecord\(g,patch\.result,"resign"\)/);
  assert.match(fn, /async function respondDraw[\s\S]{0,1400}end_reason:"agreement",\.\.\.endRecord\(g,"1\/2-1\/2","agreement"\)/);
  assert.match(fn, /reason:"checkmate"/);
  assert.match(fn, /reason:boardEndReason\(c\)/);
  assert.match(fn, /\.\.\.\(o\.result!=="\*"\?\{end_reason:o\.reason\|\|null\}:\{\}\)/);
  assert.match(fn, /\.\.\.\(posKey\?\{k:posKey\}:\{\}\)/);
  assert.match(fn, /repetitionCount\(\[\.\.\.history,\{k:posKey\}\],posKey,startKey,/);
  assert.match(fn, /o=\{status:"draw",result:"1\/2-1\/2",reason:"repetition"\}/);
  // older records are repaired when the archive is read
  assert.match(fn, /async function gameHistory[\s\S]{0,900}finished&&!isFullPgn\(g\.pgn\)\?\{pgn:fullPgn\(/);
});
