import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { AMBUSH_MAX_BELIEF_LOSS, AMBUSH_MIN_LOSS, FOG_REVIEW_VARIANTS, beliefAfter, fogBeliefs, isAmbush } from '../src/fog-review.js';
import { CLASSIFICATION_META, classificationAsset, gameAccuracy } from '../src/review.js';
import { keyMoments, worstMoment, chapterAccuracy } from '../src/game-story.js';

function played(sans) {
  const c = new Chess(), positions = [c.fen()], moves = [];
  for (const san of sans) { moves.push(c.move(san)); positions.push(c.fen()); }
  return { positions, moves };
}
const at = (fen, sq) => { const c = new Chess(fen); return c.get(sq) || null; };

test('Vanta Dark beliefs: the start is known; a piece that moved out of sight stays where it was last seen', () => {
  const { positions, moves } = played(['e4', 'b6', 'd4', 'Bb7', 'Nc3']);
  const beliefs = fogBeliefs(Chess, positions, moves, 'dark');
  assert.equal(beliefs.length, moves.length);
  assert.equal(beliefs[0].fen.split(' ')[0], positions[0].split(' ')[0], 'White knows the starting position');
  // Before 3.Nc3, White has not seen the b-pawn or the bishop move.
  const b = beliefs[4];
  assert.ok(b && b.fen.split(' ')[1] === 'w');
  assert.deepEqual(at(b.fen, 'c8'), { type: 'b', color: 'b' }, 'the bishop is still believed on c8');
  assert.equal(at(b.fen, 'b7')?.type, 'p', 'and the pawn on b7');
  assert.equal(at(positions[4], 'b7')?.type, 'b', '(really the bishop is on b7)');
  // White's own pieces are always where they are.
  for (const sq of ['e4', 'd4', 'g1', 'e1']) assert.deepEqual(at(b.fen, sq), at(positions[4], sq), sq);
  // The moves offered are legal on both boards.
  const real = new Set(new Chess(positions[4]).moves({ verbose: true }).map(m => m.from + m.to + (m.promotion || '')));
  assert.ok(b.searchmoves.length && b.searchmoves.every(m => real.has(m)));
});

test('Blackout beliefs: nothing to excuse with the lights on; blind moves see the board from when the lights went out', () => {
  // White's moves 1-4 with the lights on, then two blind ones (5 and 6).
  const { positions, moves } = played(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'd3', 'Nf6', 'Nc3', 'd6', 'Bg5', 'h6']);
  const beliefs = fogBeliefs(Chess, positions, moves, 'blackout');
  for (const i of [0, 2, 4, 6]) assert.equal(beliefs[i], null, `White's lit move at ply ${i}`);
  const blind = beliefs[8];
  assert.ok(blind, 'White\'s fifth move is blind');
  // The lights went out before White's fourth move had an answer: Black's ...Nf6 is unknown.
  assert.equal(at(blind.fen, 'g8')?.type, 'n', 'the knight is still believed on g8');
  assert.equal(at(positions[8], 'f6')?.type, 'n');
  assert.equal(at(blind.fen, 'f6'), null);
  assert.equal(at(blind.fen, 'd3')?.type, 'p', 'White knows its own fourth move');
  assert.ok(beliefs[10], 'the sixth move is blind too');
  assert.equal(beliefs[1], null, 'Black\'s first moves are lit');
});

test('fogBeliefs ignores other variants', () => {
  const { positions, moves } = played(['e4', 'e5']);
  assert.deepEqual(fogBeliefs(Chess, positions, moves, 'standard'), [null, null]);
  assert.ok(FOG_REVIEW_VARIANTS.has('dark') && FOG_REVIEW_VARIANTS.has('blackout') && !FOG_REVIEW_VARIANTS.has('crazyhouse'));
});

test('beliefAfter plays the move on the believed board, or says it was not playable there', () => {
  const start = new Chess().fen();
  assert.match(beliefAfter(Chess, start, { from: 'e2', to: 'e4' }), / b /);
  assert.equal(beliefAfter(Chess, start, { from: 'e2', to: 'd3' }), null, 'a pawn capture onto a square believed empty');
  assert.equal(beliefAfter(Chess, 'not a fen', { from: 'e2', to: 'e4' }), null);
});

test('isAmbush: costly on the real board, sound on the believed one', () => {
  assert.equal(isAmbush({ realLoss: 30, played: 'e2e4', beliefBest: 'e2e4' }), true, 'the best move you could know');
  assert.equal(isAmbush({ realLoss: 30, beliefLoss: AMBUSH_MAX_BELIEF_LOSS - 1 }), true);
  assert.equal(isAmbush({ realLoss: 30, beliefLoss: AMBUSH_MAX_BELIEF_LOSS }), false, 'a real error even on your own board');
  assert.equal(isAmbush({ realLoss: AMBUSH_MIN_LOSS - 1, beliefLoss: 0 }), false, 'only mistakes and worse get a second look');
  assert.equal(isAmbush({ realLoss: 30, beliefLoss: null, played: 'e2e4', beliefBest: 'd2d4' }), false);
  assert.equal(isAmbush(), false);
});

test('Ambushed moves count as their player could judge them, but still show as the moments that turned the game', () => {
  assert.equal(CLASSIFICATION_META.ambushed.label, 'Ambushed');
  assert.match(classificationAsset('ambushed'), /^data:image\/svg\+xml,/, 'drawn in code (CSP allows data: images)');
  // White blunders 300 cp on its first move: as seen, and when Ambushed with a 2-point loss on its board.
  const cps = [0, -300, -300, -300];
  const plain = gameAccuracy(cps, 'w').w, fair = gameAccuracy(cps, 'w', { losses: [2, null, null] }).w;
  assert.ok(fair > plain + 30, `${fair} > ${plain}`);
  assert.deepEqual(gameAccuracy(cps, 'w', { losses: [null, null, null] }), gameAccuracy(cps, 'w'));
  const results = [
    { beforeCp: 0, afterCp: -300, loss: 2, realLoss: 36, fogLoss: 2, classification: 'ambushed', bestMove: 'd2d4' },
    { beforeCp: -300, afterCp: -300, loss: 0, classification: 'best', bestMove: 'e7e5' },
    { beforeCp: -300, afterCp: -300, loss: 0, classification: 'best', bestMove: 'g1f3' },
  ];
  const moves = [{ color: 'w', san: 'e4' }, { color: 'b', san: 'e5' }, { color: 'w', san: 'Nf3' }];
  const moments = keyMoments(results, moves);
  assert.equal(moments[0]?.label, 'Ambushed');
  assert.equal(moments[0]?.loss, 36);
  assert.equal(worstMoment(results, moves, 'w'), null, 'not offered as your worst moment to replay');
  assert.ok(chapterAccuracy(results, moves, { from: 1, to: 3 }, 'w') > 90);
});

test('the review runs the fog pass in Vanta Dark and Blackout Blitz games', () => {
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(main, /fog:FOG_REVIEW_VARIANTS\.has\(variant\)\?variant:null/);
  assert.match(main, /if\(reviewState\.fog\)\{[\s\S]{0,200}await fogReviewPass\(built,token\)/);
  assert.match(main, /const beliefs=fogBeliefs\(Chess,built\.positions,built\.records,reviewState\.fog\)/);
  assert.match(main, /analyzeReviewFen\(belief\.fen,`fog-\$\{i\}`,token,\{searchmoves:belief\.searchmoves\}\)/);
  assert.match(main, /return mode==='computer'\?computerRules\|\|'standard':'standard';/, 'games against the computer are reviewed under their rules');
  assert.match(main, /reason:info\.reason,variant:computerRules\|\|'standard'\}\)/, 'and archived with them');
  assert.match(main, /if\(!built\.variant&&!reviewState\.fog\)try\{rememberMistakes\(\)\}/, 'fog positions are not drilled with the whole board in view');
});
