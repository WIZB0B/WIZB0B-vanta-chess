import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { flashSquareFor, illegalReason, kingSquare } from '../src/illegal-move.js';

const main = readFileSync('src/main.js', 'utf8');
const css = readFileSync('src/style.css', 'utf8');

test('a move that ignores check flashes the king', () => {
  const c = new Chess('rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3'); // white in check (fool's mate shape, Kf2 not possible)
  const r = illegalReason(c, 'a2', 'a3');
  assert.equal(r.kind, 'check');
  assert.equal(flashSquareFor(r), 'e1');
});

test('a pinned piece and a king stepping into attack flash the king', () => {
  const pinned = new Chess('4r1k1/8/8/8/8/8/4N3/4K3 w - - 0 1'); // knight e2 pinned by rook e8
  const r = illegalReason(pinned, 'e2', 'c3');
  assert.equal(r.kind, 'pin');assert.equal(flashSquareFor(r), 'e1');
  const king = new Chess('4k3/8/8/8/8/8/3r4/4K3 w - - 0 1'); // rook d2 covers d1 and f2
  const k = illegalReason(king, 'e1', 'f2');
  assert.ok(['king', 'rule'].includes(k.kind));
  assert.equal(illegalReason(king, 'e1', 'd2'), null, 'capturing the rook is legal');
  assert.equal(illegalReason(new Chess('4k3/8/8/8/8/8/8/R3K3 w - - 0 1'), 'e1', 'd1'), null);
  assert.equal(illegalReason(new Chess('4k3/8/8/8/8/5r2/8/4K3 w - - 0 1'), 'e1', 'f2').kind, 'king');
});

test('a plain impossible move only sounds; legal moves and empty squares are not illegal', () => {
  const c = new Chess();
  const r = illegalReason(c, 'b1', 'b3');
  assert.equal(r.kind, 'rule');assert.equal(flashSquareFor(r), null);
  assert.equal(illegalReason(c, 'e2', 'e4'), null);
  assert.equal(illegalReason(c, 'e4', 'e5'), null);
  assert.equal(kingSquare(c, 'b'), 'e8');
});

test('illegal drops sound and flash; plain taps elsewhere stay quiet unless the king is the reason', () => {
  assert.match(main, /if\(outcome==='return'&&to&&to!==drag\.from\)rejectMove\(drag\.from,to\);/);
  assert.match(main, /if\(!candidates\.length\)\{rejectMove\(selected,sq,\{quietRule:true\}\);/);
  assert.match(main, /if\(!reason\|\|\(quietRule&&reason\.kind==='rule'\)\)return;/);
  assert.match(css, /\.square \.illegal-flash\{/);
  assert.match(css, /@media \(prefers-reduced-motion:reduce\)\{\.square \.illegal-flash/);
});

test('the engine is locked during live online games and returns afterwards', () => {
  const lock = main.slice(main.indexOf('function engineLocked(){'), main.indexOf('let engineWasLocked'));
  assert.match(lock, /isOnlineGame\(\)&&!!myColor&&\['active','playing','in_progress'\]\.includes\(serverGame\?\.status\)/);
  assert.doesNotMatch(lock, /rated/, 'casual online games are locked too');
  assert.match(main, /if\(syncEngineLock\(\)\)return;/);
  assert.match(main, /function updateAnalysisFromUci\(text,request\)\{\n\s*if\(engineLocked\(\)\)return;/);
  assert.match(main, /function recordEval\(record,index\)\{\n\s*if\(engineLocked\(\)\)return '';/);
  assert.match(main, /analysisWorker\.postMessage\(\{action:'stop'\}\)/);
  assert.match(css, /\.analysis\.engine-locked \.analysis-row/);
});
