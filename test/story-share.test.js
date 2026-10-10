import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CARD_H, CARD_W, PIECE_FILES, clipSchedule, drawStoryFrame, fenSquares, pieceUrl, squareBox, storyFileName } from '../src/story-share.js';

const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');

test('board geometry: a1 bottom-left for White, top-right for Black', () => {
  const sq = fenSquares('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  assert.equal(sq[0], 'br'); assert.equal(sq[60], 'wk'); assert.equal(sq.filter(Boolean).length, 32);
  const w = squareBox('a1', 'w'), b = squareBox('a1', 'b'), h8 = squareBox('h8', 'w');
  assert.ok(w.y > h8.y && w.x < h8.x);
  assert.ok(b.x > w.x && b.y < w.y);
});
test('clip schedule: slower on key moments, holds the last frame', () => {
  const f = clipSchedule(4, [{ ply: 3 }]);
  assert.deepEqual(f.map(x => x.ply), [0, 1, 2, 3, 4]);
  assert.ok(f[3].ms > f[2].ms);
  assert.ok(f[4].ms > 2000);
  assert.equal(clipSchedule(200, [], { maxPlies: 80 }).length, 81);
});
test('file names and piece images are VCH files', () => {
  assert.equal(storyFileName('Joshua A.', 'Rival <x>', 'png'), 'vch-Joshua-A-vs-Rival-x.png');
  assert.equal(PIECE_FILES.length, 12);
  for (const code of PIECE_FILES) assert.ok(readFileSync(new URL(`../public${pieceUrl(code)}`, import.meta.url)).length > 100);
});
test('a frame draws without errors on a recording context', () => {
  const ops = [];
  const ctx = new Proxy({ measureText: t => ({ width: String(t).length * 10 }), createRadialGradient: () => ({ addColorStop() {} }) }, {
    get(target, k) { return k in target ? target[k] : (...a) => ops.push(k) },
    set(target, k, v) { target[k] = v; return true },
  });
  drawStoryFrame(ctx, { fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', lastMove: { from: 'e2', to: 'e4' }, orientation: 'b', info: { white: 'A', black: 'B', result: '1–0', accuracy: { mine: 91, theirs: 70 }, mine: 'b' }, pieces: { wp: {} } });
  assert.ok(ops.includes('drawImage') && ops.includes('fillRect'));
  assert.equal(CARD_W, 1080); assert.equal(CARD_H, 1350);
});
test('wiring: share buttons on the story card, trainer in My games, trainer drills never post puzzle attempts', () => {
  assert.match(main, /data-story="share-card"/); assert.match(main, /data-story="share-clip"/);
  assert.match(main, /class="archive-trainer"/);
  assert.match(main, /if\(!session\|\|session\.trainer\|\|/);
});
