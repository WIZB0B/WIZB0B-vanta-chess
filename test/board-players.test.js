import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pieceStyleOptions } from '../src/piece-styles.js';

const main=await readFile(new URL('../src/main.js',import.meta.url),'utf8');
const css=await readFile(new URL('../src/style.css',import.meta.url),'utf8');

test('player bars expose avatar, flag, rating, live state, clock, and online-only ping',()=>{
  for(const id of ['topAvatar','topPlayerName','topFlag','topRating','topPresence','topClock','bottomAvatar','bottomPlayerName','bottomFlag','bottomRating','bottomPresence','bottomConnection','bottomPingBars','bottomPing','bottomClock']){
    assert.match(main,new RegExp(`id="${id}"`),`missing player-bar element #${id}`);
  }
  assert.match(main,/function isOnlineGame\(\)/);
  assert.match(main,/mode!==\'computer\'/);
  assert.match(main,/const online=isOnlineGame\(\)/);
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

test('board supports the persisted piece sets with baked-in sizing',()=>{
  const batch=css.slice(css.lastIndexOf('/* Batch 4:'));
  for(const [value,label] of [['vanta','Vanta'],['vanta-ink','Vanta Ink'],['monarch','Monarch'],['monarch-ink','Monarch Ink'],['heritage','Heritage']]){
    assert.ok(pieceStyleOptions().includes(`<option value="${value}">${label}</option>`),`missing piece set ${label}`);
  }
  assert.ok(main.includes('<select id="pieceStyle">${pieceStyleOptions()}</select>'));
  assert.ok(main.includes("document.documentElement.dataset.pieceStyle='vanta';"));
  assert.match(main,/savedTheme\.pieceStyle=applyPieceStyle\(migratePieceStyle\(savedTheme\)\)/);
  assert.ok(main.includes("savedTheme.pieceTint=0;"));
  assert.match(main,/savedTheme\.pieceStyle=applyPieceStyle\(e\.target\.value\)/);
  assert.ok(css.includes(":root[data-piece-style=\"heritage\"] .piece.w.piece-k{--piece-image:url('/assets/vch/pieces/3d/wk.webp')}"));
  assert.ok(css.includes('--piece-tint:0'));
  // Pieces are .board-piece elements one square in size in the piece layer; the artwork fills them.
  assert.match(css,/\.board-piece\{[^}]*width:12\.5%;height:12\.5%;/);
  assert.match(css,/\.piece\{font-size:0;width:100%;height:100%;/);
  assert.match(css,/\.board-piece::before\{/);
  assert.ok(css.includes(':root[data-piece-style$="-ink"] .board-piece::before{display:none}'));
  assert.match(batch,/\.board \.square\.last-move\{\s*box-shadow:inset 0 0 0 999px rgba\(200,216,61,\.56\);/);
});
