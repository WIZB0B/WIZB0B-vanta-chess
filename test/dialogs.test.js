import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

const main=await readFile(new URL('../src/main.js',import.meta.url),'utf8');
const dialog=await readFile(new URL('../src/vch-dialog.js',import.meta.url),'utf8');
const css=await readFile(new URL('../src/style.css',import.meta.url),'utf8');

test('src contains no native confirm alert or prompt calls',async()=>{
  const srcDir=new URL('../src/',import.meta.url),files=(await readdir(srcDir)).filter(name=>name.endsWith('.js'));
  for(const file of files){
    const source=await readFile(new URL(file,srcDir),'utf8');
    assert.doesNotMatch(source,/\b(?:confirm|alert|prompt)\s*\(/,`${file} still uses a native browser dialog call`);
  }
});

test('vchDialog provides glass actions, safe dismissal, focus trap, and transitions',()=>{
  assert.match(dialog,/export function vchDialog\(\{title,body,actions=\[\],dismissible=true\}\)/);
  assert.match(dialog,/event\.key==='Escape'&&dismissible/);
  assert.match(dialog,/event\.key!=='Tab'/);
  assert.match(dialog,/event\.target===layer/);
  assert.match(dialog,/action\.primary\?'primary':'secondary'/);
  assert.match(dialog,/classList\.add\('closing'\)/);
  assert.match(dialog,/requestAnimationFrame\(\(\)=>\{layer\.classList\.add\('open'\)/);
  assert.match(css,/\.vch-dialog-panel\{/);
  assert.match(css,/\.vch-dialog-action\.primary\{/);
  assert.match(css,/\.vch-dialog-action\.secondary\{/);
});

test('game over modal covers results, reasons, players, ratings and actions',()=>{
  for(const text of ["'by checkmate'","'on time'","'by resignation'","'by abandonment'","'by stalemate'","'by repetition'","'by insufficient material'","'by 50-move rule'","'by agreement'"])assert.ok(main.includes(text),`missing end reason ${text}`);
  assert.match(main,/return won\?'You won':'You lost'/);
  assert.match(main,/if\(info\.result==='1\/2-1\/2'\)return 'Draw'/);
  assert.match(main,/whiteRating:ratingSummary\(serverGame,'w'\),blackRating:ratingSummary\(serverGame,'b'\)/);
  assert.match(main,/label:'Game Review'/);
  assert.match(main,/info\.online\?\[\{label:'Rematch'/);
  assert.match(main,/label:'New game'/);
  assert.match(main,/mated-king/);
  assert.match(css,/\.board \.square\.mated-king/);
  assert.match(main,/playUiSound\(title==='Draw'\?'draw':won\?'win':'lose'\)/);
});

test('game start banner covers computer and online starts for about two seconds',()=>{
  assert.match(main,/Game started · You play \$\{color==='w'\?'White':'Black'\} · \$\{formatTimeControl\(seconds,increment\)\}/);
  assert.match(main,/gameStartBannerTimer=setTimeout\(\(\)=>banner\.classList\.remove\('show'\),2100\)/);
  assert.match(main,/showGameStartBanner\(computerSide,600,0,/);
  assert.match(main,/showGameStartBanner\(myColor,state\.time_control_seconds\|\|state\.base_seconds\|\|600,state\.increment_seconds\|\|0,/);
  assert.match(main,/playUiSound\('start'\)/);
  assert.match(css,/\.game-start-banner\.show/);
});
