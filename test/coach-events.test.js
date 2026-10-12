import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { coachNote, describeMove } from '../src/coach.js';

const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
test('coach: plain words from the move itself', () => {
  assert.deepEqual(describeMove(START, 'e2e4').phrases, ['claims the centre']);
  assert.deepEqual(describeMove(START, 'g1f3').phrases, ['develops a piece']);
  assert.deepEqual(describeMove('r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4', 'h5f7').phrases.slice(0, 1), ['is checkmate']);
  assert.deepEqual(describeMove('4k3/8/8/3q1r2/8/8/2N5/4K3 w - - 0 1', 'c2e3').phrases, ['attacks the queen and the rook at once']);
  const note = coachNote({ fenBefore: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', playedUci: 'd1h5', playedSan: 'Qh5', bestUci: 'g1f3', classification: 'inaccuracy' });
  assert.equal(note.title, 'Qh5 · Inaccuracy'); assert.equal(note.text, 'Nf3 was stronger: it develops a piece.'); assert.equal(note.best, 'g1f3');
  assert.equal(coachNote({ fenBefore: START, playedUci: 'e2e4', playedSan: 'e4', bestUci: 'e2e4', classification: 'best' }).tone, 'good');
});
test('wiring: coach only after your own moves against the computer; reactions only in Watch and only known labels', () => {
  assert.match(main, /if\(!coachOn\(\)\|\|mode!=='computer'\|\|!made\?\.before\)return;/);
  assert.match(main, /if\(mode==='computer'&&!remote&&made\)void coachAfterMove\(made\);/);
  assert.match(main, /const label=REACTIONS\.find\(\(\[r\]\)=>r===id\)\?\.\[1\];if\(!label\)return;/);
  assert.match(main, /if\(mode!=='watch'\|\|!watchSession\)\{bar\?\.classList\.add\('hidden'\);return\}/);
  assert.match(main, /class="arena-create"/);
});
