import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';

const main=await readFile(new URL('../src/main.js',import.meta.url),'utf8');
const css=await readFile(new URL('../src/style.css',import.meta.url),'utf8');

test('Batch 5 move table renders paired rows with real metadata and book markers',async()=>{
  assert.match(main,/class="moves-head"><span>#<\/span><span>White<\/span><span>Black<\/span>/);
  assert.match(main,/class="move-pair-row"/);
  assert.match(main,/function recordEval\(record,index\)/);
  assert.match(main,/function recordTime\(record,index\)/);
  assert.match(main,/function isBookMove\(records,index\)/);
  assert.match(main,/\/assets\/vch\/icons\/book\.svg/);
  await access(new URL('../public/assets/vch/icons/book.svg',import.meta.url));
});

test('Live Game card has no Draw or Chat buttons and those actions live in the board overflow menu',()=>{
  const live=main.match(/<section class="live-card">([\s\S]*?)<\/section>/)?.[1]||'';
  assert.doesNotMatch(live,/id="draw"|id="openChat"/);
  assert.match(main,/class="game-more"/);
  assert.match(main,/id="draw"/);
  assert.match(main,/id="openChat"/);
});

test('feature cards use SVG icon tiles over their art',async()=>{
  for(const name of ['opening','famous','review','learn']){
    assert.match(main,new RegExp('/assets/vch/icons/'+name+'\\.svg'));
    await access(new URL('../public/assets/vch/icons/'+name+'.svg',import.meta.url));
  }
  assert.equal((main.match(/class="feature-icon-tile"/g)||[]).length,4);
  assert.match(css,/\.feature-card \.feature-icon-tile\{/);
});

test('board coordinates are larger than the old 9px treatment',()=>{
  const batch=css.slice(css.lastIndexOf('/* Batch 5 + requested regressions:'));
  assert.match(batch,/\.board-coords\{font-size:11px/);
});

test('move row 1 stays visible and move times render as seconds',()=>{
  assert.match(main,/target\.scrollTop=0/);
  assert.doesNotMatch(main,/target\.scrollTop=target\.scrollHeight/);
  assert.match(main,/return formatMoveDuration\(raw\)\|\|'0s'/);
  const batch=css.slice(css.lastIndexOf('/* Batch 6:'));
  assert.match(batch,/\.moves\{\s*padding-top:4px/);
});
