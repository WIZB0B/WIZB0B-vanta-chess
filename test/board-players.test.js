import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const main=await readFile(new URL('../src/main.js',import.meta.url),'utf8');
const css=await readFile(new URL('../src/style.css',import.meta.url),'utf8');

test('player bars expose avatar, flag, rating, live state, clock, and online-only ping',()=>{
  for(const id of ['topAvatar','topPlayerName','topFlag','topRating','topPresence','topClock','bottomAvatar','bottomPlayerName','bottomFlag','bottomRating','bottomPresence','bottomConnection','bottomPingBars','bottomPing','bottomClock']){
    assert.match(main,new RegExp(`id="${id}"`),`missing player-bar element #${id}`);
  }
  assert.match(main,/const online=!!serverGameId&&mode!=='computer'/);
  assert.match(main,/connection\.classList\.toggle\('hidden',!online\)/);
  assert.match(main,/latencyMs<=100\?'good':latencyMs<=250\?'fair':'poor'/);
  assert.match(main,/setPresence\(\$\('#topPresence'\),currentBot\?'ENGINE'/);
});

test('player flags use a real SVG and disappear when no supported country is set',()=>{
  assert.match(main,/\/assets\/vch\/flags\/us\.svg/);
  assert.match(main,/element\.classList\.toggle\('hidden',!flagSrc\)/);
  assert.doesNotMatch(main,/class="player-flag is-placeholder"/);
  assert.doesNotMatch(main,/element\.textContent=normalized\|\|'--'/);
});

test('board supports persisted 3D and 2D piece styles with baked-in sizing',()=>{
  const batch=css.slice(css.lastIndexOf('/* Batch 4:'));
  assert.match(main,/id="pieceStyle"/);
  assert.match(main,/savedTheme\.pieceStyle=applyPieceStyle\(savedTheme\.pieceStyle\)/);
  assert.match(main,/savedTheme\.pieceStyle=applyPieceStyle\(e\.target\.value\)/);
  assert.match(css,/\/assets\/vch\/pieces\/3d\/wk\.webp/);
  assert.match(css,/\/assets\/vch\/pieces\/2d\/wk\.webp/);
  assert.doesNotMatch(main,/\/assets\/vch\/pieces\/[wb][kqrbnp]\.webp/);
  assert.doesNotMatch(css,/\/assets\/vch\/pieces\/[wb][kqrbnp]\.webp/);
  assert.match(batch,/\.board \.piece\{[\s\S]*?width:100%;[\s\S]*?height:100%;/);
  assert.match(batch,/\.board \.square:has\(\.piece\)::before\{/);
  assert.match(batch,/drop-shadow\(0 8px 3px rgba\(0,0,0,\.35\)\)/);
  assert.match(css,/:root\[data-piece-style="2d"\] \.board \.square:has\(\.piece\)::before\{display:none\}/);
  assert.match(css,/drop-shadow\(0 1px 0 rgba\(0,0,0,\.55\)\)/);
  assert.match(batch,/\.board \.square\.last-move\{\s*box-shadow:inset 0 0 0 999px rgba\(200,216,61,\.56\);/);
});
