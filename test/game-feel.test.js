import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Chess } from 'chess.js';
import { HAPTICS, REVIEW_REACTION, capturedPieces, endingCast, hapticFor } from '../src/game-feel.js';

const main=await readFile(new URL('../src/main.js',import.meta.url),'utf8');
const css=await readFile(new URL('../src/style.css',import.meta.url),'utf8');

test('captured trays list what each side took, biggest first, with the material lead',()=>{
  assert.deepEqual(capturedPieces(new Chess().board()),{w:[],b:[],lead:{w:0,b:0}});
  // 1.e4 d5 2.exd5 Qxd5 3.Nc3 Qxg2?? 4.Bxg2: White took a pawn and the queen; Black two pawns.
  const c=new Chess();for(const m of ['e4','d5','exd5','Qxd5','Nc3','Qxg2','Bxg2'])c.move(m);
  const caps=capturedPieces(c.board());
  assert.deepEqual(caps.w,['q','p']);assert.deepEqual(caps.b,['p','p']);
  assert.deepEqual(caps.lead,{w:8,b:0});
});

test('game end: the winner cheers and the losing king topples; a draw bows',()=>{
  assert.deepEqual(endingCast('1-0'),{winner:'w',loser:'b'});
  assert.deepEqual(endingCast('0-1'),{winner:'b',loser:'w'});
  assert.deepEqual(endingCast('1/2-1/2'),{draw:true});
  assert.equal(endingCast('*'),null);
  assert.ok(main.includes('await playEnding(info);'));
  assert.match(css,/\.board-piece\[data-ending="topple"\] \.piece\{[^}]*animation:vch-topple/);
});

test('review: good moves triumph, bad ones slump; haptics only fire on touch',()=>{
  assert.equal(REVIEW_REACTION.brilliant,'triumph');assert.equal(REVIEW_REACTION.blunder,'despair');assert.equal(REVIEW_REACTION.good,null);
  assert.deepEqual(hapticFor({captured:'p'},false),HAPTICS.capture);
  assert.deepEqual(hapticFor({},true),HAPTICS.check);
  assert.equal(hapticFor({},false),HAPTICS.move);
  assert.ok(main.includes("if(lastPointerType==='mouse'||!expressionsEnabled())return;"));
});
