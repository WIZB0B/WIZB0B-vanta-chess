import test from 'node:test';
import assert from 'node:assert/strict';
import { accuracyFromLosses, gameAccuracy, lichessWinPercent, moveAccuracy } from '../src/review.js';
import { chapterAccuracy } from '../src/game-story.js';

// Accuracy follows the formula Lichess publishes (lichess.org/page/accuracy).
test('move accuracy: the published curve, plus one point for engine uncertainty',()=>{
  assert.equal(moveAccuracy(0),100);
  assert.equal(moveAccuracy(-3),100); // a move that gains chances is perfect
  const raw=drop=>103.1668*Math.exp(-0.04354*drop)-3.1669;
  for(const drop of [5,10,20,40,60])assert.ok(Math.abs(moveAccuracy(drop)-(raw(drop)+1))<0.05,`drop ${drop}`);
  assert.ok(Math.abs(moveAccuracy(20)-41)<0.5);
  assert.ok(moveAccuracy(100)>=0);
});
test('win percent: the published logistic curve, capped at ±1000 cp',()=>{
  assert.equal(lichessWinPercent(0),50);
  assert.ok(Math.abs(lichessWinPercent(100)-59.1)<0.1);
  assert.equal(lichessWinPercent(5000),lichessWinPercent(1000));
});
test('one blunder in an otherwise perfect game costs far more than an average would say',()=>{
  const losses=[...Array(19).fill(0),50];
  const old=100*Math.exp(-0.04*2.5); // the earlier VCH formula: about 90.5
  assert.ok(accuracyFromLosses(losses)<old-7,`got ${accuracyFromLosses(losses)}`);
  assert.equal(accuracyFromLosses([]),100);
});
test('game accuracy: each side scored on its own moves; volatile stretches weigh more',()=>{
  // White keeps a small edge; Black blunders a piece on move 3.
  const cps=[20,30,25,35,30,40,350,340,360,350,370];
  const acc=gameAccuracy(cps,'w');
  assert.ok(acc.w>95,`white ${acc.w}`);
  assert.ok(acc.b<70,`black ${acc.b}`);
  // Who made a move follows the side that started: the same swing to -300 is White's blunder
  // when White moved, and Black's good move when Black did.
  assert.ok(gameAccuracy([0,-300],'w').w<35); // a 25-point drop
  assert.deepEqual(gameAccuracy([0,-300],'b'),{w:null,b:100});
  assert.deepEqual(gameAccuracy([20],'w'),{w:null,b:null});
});
test('Game Story chapters use the same formula when evaluations are kept',()=>{
  const cps=[20,30,25,35,30,40,350,340,360,350,370];
  const moves=cps.slice(1).map((_,i)=>({color:i%2?'b':'w'}));
  const results=cps.slice(1).map((after,i)=>({beforeCp:cps[i],afterCp:after,loss:0}));
  const whole={from:1,to:moves.length};
  assert.equal(chapterAccuracy(results,moves,whole,'b'),gameAccuracy(cps,'w').b);
  assert.equal(chapterAccuracy(results,moves,{from:2,to:2},'w'),null);
});
