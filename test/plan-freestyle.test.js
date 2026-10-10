import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { planReady, planText } from '../src/plan-moves.js';
import { freestyleFen, isFreestyleRank } from '../src/freestyle.js';
import { browseLine } from '../src/move-browse.js';

const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
test('plans read as moves and must end on your reply', () => {
  const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
  assert.equal(planText(fen, ['e7e5', 'g1f3']), '1… e5 2. Nf3');
  assert.equal(planReady(['e7e5']), false); assert.equal(planReady(['e7e5', 'g1f3']), true);
  assert.equal(planReady(Array(14).fill('e2e4')), false);
});
test('freestyle positions replay from their own start', () => {
  const fen = freestyleFen('nrbkqbrn');
  assert.ok(isFreestyleRank('nrbkqbrn'));
  const line = browseLine(['e4', 'e5', 'Nb3'], null, fen);
  assert.equal(line.moves.length, 3, 'Nb3 is only legal from the freestyle start');
  assert.equal(new Chess(line.positions[0]).fen(), fen);
});
test('wiring: plans take over the board only while planning; reviews use the real start', () => {
  assert.match(main, /if\(planSession&&!remote\)return planMove\(move\);/);
  assert.match(main, /if\(state\.id===planSession\.gameId&&Number\(state\.version\)===Number\(planSession\.version\)\)\{serverGame=\{\.\.\.serverGame,\.\.\.state\};return\}/);
  assert.match(main, /function buildReviewGame\(records=currentReviewRecords\(\),startFen=reviewStartFen\(\)\)/);
  assert.match(main, /rated,variant:\$\('#variant'\)\.value\}/, 'Freestyle rooms can be rated (own pool)');
});
