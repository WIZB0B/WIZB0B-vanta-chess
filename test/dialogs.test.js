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
  assert.ok(main.includes("vchDialog({title:'Game over',body:gameOverBody(info,title),actions})"));
  assert.ok(main.includes('class="game-over-avatar"'));
});

test('game start card: who plays whom, your colour and the clock, over the board for under two seconds',()=>{
  // Owner, 2026-10-14: not a tune, a brief trumpet call and an obvious "game started" panel.
  assert.ok(main.includes('<p class="gs-title">Game started</p>${row(\'top\')}<p class="gs-vs"><span>vs</span></p>${row(\'bottom\')}'),'both players, opponent above you, with vs between');
  assert.ok(main.includes("card.querySelector('.gs-side').textContent=color==='w'?'You play White':'You play Black';"));
  assert.ok(main.includes("card.querySelector('.gs-clock').textContent=formatTimeControl(seconds,increment);"));
  assert.ok(main.includes("const shell=$('.game .board-shell');(shell||document.body).append(card);"),'over the board');
  assert.ok(main.includes("queueMicrotask(()=>{fillGameStartPlayers(card);void card.offsetWidth;card.classList.add('show')});"),'filled once the player bars show this game');
  assert.match(main,/gameStartBannerTimer=setTimeout\(\(\)=>card\.classList\.remove\('show'\),1900\)/);
  assert.match(main,/row\.querySelector\('b'\)\.textContent=side==='bottom'\?ownPlayerName\(\):\$\('#topPlayerName'\)\?\.textContent\|\|''/);
  assert.match(main,/showGameStartBanner\(computerSide,computerRules==='blackout'\?BLACKOUT_SECONDS:600,0,/);
  assert.match(main,/showGameStartBanner\(myColor,state\.time_control_seconds\|\|state\.base_seconds\|\|600,state\.increment_seconds\|\|0,/);
  assert.match(main,/cue\('start','start'\)/,'the start sting with the music on, or the start sound');
  const rule=css.slice(css.indexOf('.game-start-card{'),css.indexOf('}',css.indexOf('.game-start-card{')));
  assert.match(rule,/position:absolute;inset:0/);assert.match(rule,/pointer-events:none/,'it never takes a click');
  assert.match(css,/\.game-start-card\.show\{opacity:1;visibility:visible/);
  assert.match(css,/\.game-start-card,\.game-start-card\.show,\.gs-panel,\.gs-title::after\{transition-duration:0ms!important\}/,'reduced motion: no movement');
});
