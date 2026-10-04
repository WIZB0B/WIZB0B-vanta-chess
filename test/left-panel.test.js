import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const main=await readFile(new URL('../src/main.js',import.meta.url),'utf8');
const css=await readFile(new URL('../src/style.css',import.meta.url),'utf8');

test('left panel exposes distinct Match, Room, and Computer views',()=>{
  assert.equal((main.match(/data-mode-view="/g)||[]).length,3);
  for(const mode of ['match','room','computer'])assert.match(main,new RegExp(`data-mode-view="${mode}"`));
  assert.match(css,/\.lpanel \.mode-view\.active\{display:block/);
});

test('Match view has the five requested clocks and explicit matchmaking controls',()=>{
  for(const control of ['60-0','180-0','300-0','600-0','900-10'])assert.match(main,new RegExp(`data-match-time="${control}"`));
  assert.match(main,/id="findOpponent"/);
  assert.match(main,/id="matchSearch"/);
  assert.match(main,/data-match-rated="false"/);
  assert.match(main,/data-match-rated="true"/);
});

test('Room code stays collapsed until a room is created',()=>{
  assert.match(main,/class="room room-created hidden"/);
  assert.match(main,/roomCreated=true/);
  assert.match(main,/classList\.toggle\('hidden',!roomCreated\)/);
});

test('Computer view exposes bot cards, side choice, and a start action',()=>{
  assert.match(main,/id="botGrid"/);
  assert.match(main,/id="computerStart"/);
  for(const side of ['w','b','random'])assert.match(main,new RegExp(`data-computer-side="${side}"`));
  assert.match(main,/function startComputerGame\(\)/);
  assert.match(main,/if\(game\.turn\(\)!==computerSide\)setTimeout\(engineMove,280\)/);
});
