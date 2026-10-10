import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Chess } from 'chess.js';
import { SHOCK_LEAD, analyzeMoods, bearing, distance, landingImpact, materialBalance } from '../src/piece-expressions.js';

const main=await readFile(new URL('../src/main.js',import.meta.url),'utf8');

test('fear: an attacked piece with no defender (or a cheaper attacker) trembles; a checked king too',()=>{
  // 1.e4 d5 2.exd5 Qxd5 3.Nc3: the queen is attacked by a knight.
  const c=new Chess();for(const m of ['e4','d5','exd5','Qxd5','Nc3'])c.move(m);
  const moods=analyzeMoods(c);
  assert.equal(moods.get('d5').mood,'fear');assert.equal(moods.get('d5').toward,'c3');
  assert.equal(moods.get('c3').mood,'attack');assert.equal(moods.get('c3').toward,'d5');
  const k=new Chess('4k3/8/8/8/8/8/8/4R1K1 b - - 0 1');
  assert.equal(analyzeMoods(k).get('e8').mood,'fear');
});

test('courage: attacked but defended by an equal or cheaper piece; quiet pieces have no mood',()=>{
  // 1.e4 e5 2.Nf3 Nc6: e5 is attacked by the knight and defended by the c6 knight.
  const c=new Chess();for(const m of ['e4','e5','Nf3','Nc6'])c.move(m);
  const moods=analyzeMoods(c);
  assert.equal(moods.get('e5').mood,'courage');
  assert.equal(moods.get('a2'),undefined);assert.equal(new Chess().moves().length,20);
  assert.equal(analyzeMoods(new Chess()).size,0,'the starting position is calm');
});

test('a landing shocks nearby enemy pieces only when the mover is ahead in material',()=>{
  const even=new Chess();even.move('e4');
  assert.deepEqual(landingImpact(even,'e4','w'),{ring:true,shock:false,lead:0,hit:[]});
  // White a rook up, queen lands on d7 next to the black king and pawns.
  const ahead=new Chess('rnbqkbn1/pppQpppp/8/8/8/8/PPPP1PPP/RNB1KBNR b KQq - 0 1');
  const impact=landingImpact(ahead,'d7','w');
  assert.ok(impact.lead>=SHOCK_LEAD);assert.equal(impact.shock,true);
  assert.equal(impact.hit[0].distance,1,'nearest first');
  assert.ok(impact.hit.every(h=>distance('d7',h.square)<=2));
  assert.equal(landingImpact(ahead,'d7','b').shock,false,'the side behind never sends a shockwave');
});

test('helpers: material, distance and screen bearing (flipped boards mirror it)',()=>{
  assert.equal(materialBalance(new Chess().board()),0);
  assert.equal(distance('a1','c2'),2);
  assert.equal(bearing('e4','e5'),0);assert.equal(bearing('e4','f4'),90);assert.equal(Math.abs(bearing('e4','e5',true)),180);
});

test('moods stay off in online games (fair play); landings and drag sway are wired',()=>{
  assert.ok(main.includes('function moodsAllowed(){return expressionsEnabled()&&!(serverGameId&&!localGameOver)}'));
  assert.ok(main.includes('if(motion.animated)motion.finished.then(()=>landingFx(made));else landingFx(made)'));
  assert.ok(main.includes('if(!drag.swayLoop&&expressionsEnabled())startSway(drag);'));
});
