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

test('board supports persisted Vanta and Staunton piece styles with baked-in sizing',()=>{
  const batch=css.slice(css.lastIndexOf('/* Batch 4:'));
  for(const [value,label] of [['vanta-3d','Vanta 3D'],['vanta-2d','Vanta 2D'],['staunton-3d','Staunton 3D'],['staunton-2d','Staunton 2D']]){
    assert.ok(main.includes(`<option value="${value}">${label}</option>`),`missing piece style ${label}`);
  }
  assert.ok(main.includes("if(value==='3d'||value==='2d')return 'vanta-3d';"));
  assert.ok(main.includes("document.documentElement.dataset.pieceStyle='vanta-3d';"));
  assert.match(main,/savedTheme\.pieceStyle=applyPieceStyle\(savedTheme\.pieceStyle\)/);
  assert.ok(main.includes("savedTheme.pieceTint=0;"));
  assert.match(main,/savedTheme\.pieceStyle=applyPieceStyle\(e\.target\.value\)/);
  assert.ok(css.includes("/assets/vch/pieces/2c49bffb-4bcc-4fb7-b053-b559c7b7e4fc.png"));
  assert.ok(css.includes("background-size:600% 400%;"));
  for(const position of ['--piece-x:0%','--piece-x:20%','--piece-x:40%','--piece-x:60%','--piece-x:80%','--piece-x:100%','--piece-y:0%','--piece-y:33.3333%','--piece-y:66.6666%','--piece-y:99.9999%']){
    assert.ok(css.includes(position),`missing sprite position ${position}`);
  }
  assert.ok(css.includes(":root[data-piece-style=\"staunton-3d\"] .piece.w.piece-k{--piece-image:url('/assets/vch/pieces/3d/wk.webp')}"));
  assert.ok(css.includes(":root[data-piece-style=\"staunton-2d\"] .piece.w.piece-k{--piece-image:url('/assets/vch/pieces/2d/wk.webp')}"));
  assert.ok(css.includes('--piece-tint:0'));
  assert.match(batch,/\.board \.piece\{[\s\S]*?width:100%;[\s\S]*?height:100%;/);
  assert.match(batch,/\.board \.square:has\(\.piece\)::before\{/);
  assert.match(batch,/drop-shadow\(0 8px 3px rgba\(0,0,0,\.35\)\)/);
  assert.ok(css.includes(':root[data-piece-style="vanta-2d"] .board .square:has(.piece)::before,'));
  assert.ok(css.includes(':root[data-piece-style="staunton-2d"] .board .square:has(.piece)::before{display:none}'));
  assert.ok(css.includes('drop-shadow(0 1px 1px rgba(0,0,0,.48))'));
  assert.match(batch,/\.board \.square\.last-move\{\s*box-shadow:inset 0 0 0 999px rgba\(200,216,61,\.56\);/);
});
