import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { addLine, lineText, removeLine, repContinue, repDeviation, repDrill, repMovesAt, repStats } from '../src/repertoire.js';
import { insightSummary, lossReason, phaseOf, poolsPlayed, ratingChartSvg, ratingSeries } from '../src/insights.js';

const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const start = new Chess().fen();

test('repertoire: lines merge, transpositions meet, drills follow your tree', () => {
  let lines = addLine([], ['e4', 'e5', 'Nf3']);
  lines = addLine(lines, ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5']); // extends the first line: replaces it
  assert.deepEqual(lines, [['e4', 'e5', 'Nf3', 'Nc6', 'Bb5']]);
  assert.equal(addLine(lines, ['e4', 'e5']), lines, 'already covered');
  assert.equal(addLine(lines, ['e4', 'e4']), null, 'illegal lines are refused');
  lines = addLine(lines, ['e4', 'c5', 'Nf3', 'd6', 'd4']);
  assert.deepEqual(repMovesAt(lines, start), ['e4']);
  assert.deepEqual(repMovesAt(lines, new Chess().move('e4') && 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1').sort(), ['c5', 'e5']);
  const viaD4 = addLine([], ['d4', 'Nf6', 'c4', 'e6']), viaC4 = addLine(viaD4, ['c4', 'e6', 'd4', 'Nf6', 'Nc3']);
  const after = new Chess(); for (const m of ['d4', 'Nf6', 'c4', 'e6']) after.move(m);
  assert.deepEqual(repMovesAt(viaC4, after.fen()), ['Nc3'], 'a transposition reaches the same node');
  const d = repDrill(lines, 'w', () => 0);
  assert.deepEqual(d.ucis.slice(0, 3), ['e2e4', 'e7e5', 'g1f3']);
  assert.equal(repDrill([], 'w'), null);
  const alt = repContinue(lines, new Chess().fen(), [], 'e2e4', () => 0.99);
  assert.equal(alt[0], 'e2e4'); assert.equal(alt[1], 'c7c5');
  assert.equal(repContinue(lines, start, [], 'd2d4'), null, 'a move outside your lines is a miss');
  assert.equal(lineText(['e4', 'e5', 'Nf3']), '1.e4 e5 2.Nf3');
  assert.deepEqual(removeLine([[1], [2], [3]], 1), [[1], [3]]);
  assert.deepEqual(repStats({ w: lines, b: [] }).w, 2);
  assert.deepEqual(repDeviation(lines, 'w', ['e4', 'e5', 'Bc4']), { ply: 2, played: 'Bc4', expected: ['Nf3'] });
  assert.equal(repDeviation(lines, 'w', ['e4', 'e6']), null, 'the opponent leaving your lines is not your deviation');
});
test('insights: scores, leaks and the rating line', () => {
  const g = (o) => ({ at: '2026-10-0' + (o.i || 1) + 'T10:00:00Z', pool: 'blitz', rated: true, color: 'w', score: 0, reason: 'timeout', plies: 40, rating: 1500, opp: 1500, bot: false, variant: 'standard', sans: ['e4', 'c5', 'Nf3'], ...o });
  const rows = [g({ i: 1, rating: 1490 }), g({ i: 2, rating: 1480 }), g({ i: 3, score: 1, reason: 'resign', rating: 1495 }), g({ i: 4, color: 'b', sans: ['d4', 'd5', 'c4'], score: 1, reason: 'checkmate', rating: 1505 }), g({ i: 5, color: 'b', sans: ['d4', 'd5', 'c4'], score: 0.5, reason: 'agreement', rating: 1504 }), g({ i: 6, score: 0, reason: 'checkmate', plies: 120, opp: 1300, rating: 1490 })];
  const s = insightSummary(rows);
  assert.equal(s.games, 6); assert.equal(s.score, 42); assert.equal(s.losses, 3);
  assert.deepEqual(s.lossReasons.map(r => [r.reason, r.n]), [['time', 2], ['checkmate', 1]]);
  assert.ok(s.leaks.some(l => l.kind === 'time'));
  assert.ok(s.leaks.some(l => l.kind === 'opening' && /as White/.test(l.text)));
  assert.equal(phaseOf(20), 'opening'); assert.equal(phaseOf(50), 'middlegame'); assert.equal(phaseOf(90), 'endgame');
  assert.equal(lossReason('abandoned'), 'left');
  assert.deepEqual(ratingSeries(rows, 'blitz').map(p => p.rating), [1490, 1480, 1495, 1505, 1504, 1490]);
  assert.deepEqual(poolsPlayed(rows), ['blitz']);
  assert.match(ratingChartSvg(ratingSeries(rows, 'blitz')), /^<svg class="ins-chart"/); assert.equal(ratingChartSvg([]), '');
});
test('wiring: free board while adding lines, drills accept any prepared move, explorer marks', () => {
  assert.match(main, /function freeBoard\(\)\{return !!planSession\|\|!!studySession\?\.editing\|\|!!exploreSession\|\|!!repEdit\}/);
  assert.match(main, /if\(puzzleSession\.kind==='repertoire'&&uci!==puzzleSession\.solution\[puzzleSession\.index\]\)\{const full=repContinue\(/);
  assert.match(main, /if\(kind!=='repertoire'&&repEdit\)endRepEdit\(\);/);
  assert.match(main, /markRepRows\(fen\);/); assert.match(main, /id="profileMenuInsights"/);
});
