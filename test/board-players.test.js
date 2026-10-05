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

test('board uses reference-scale pieces, contact shadows, and stronger last-move color',()=>{
  const batch=css.slice(css.lastIndexOf('/* Batch 4:'));
  assert.match(batch,/\.board \.piece\{[\s\S]*?width:85%;[\s\S]*?height:85%;/);
  assert.match(batch,/\.board \.square:has\(\.piece\)::before\{/);
  assert.match(batch,/drop-shadow\(0 8px 3px rgba\(0,0,0,\.35\)\)/);
  assert.match(batch,/\.board \.square\.last-move\{\s*box-shadow:inset 0 0 0 999px rgba\(200,216,61,\.56\);/);
});
