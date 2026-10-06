import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PremoveQueue, consumeLegalPremove } from '../src/premove.js';

const main=await readFile(new URL('../src/main.js',import.meta.url),'utf8');
const gameWithMoves=moves=>({moves:()=>moves});

test('premove plays when legal',()=>{
  const queue=new PremoveQueue();queue.select('e2');queue.queue('e4');
  assert.deepEqual(consumeLegalPremove(queue,gameWithMoves([{from:'e2',to:'e4'}])),{from:'e2',to:'e4'});
  assert.equal(queue.move,null);
  const start=main.indexOf('function playQueuedPremove'),end=main.indexOf('async function clickSquare',start),body=main.slice(start,end);
  assert.ok(body.indexOf('const move=consumeLegalPremove(premoves,game)')>=0);
  assert.ok(body.indexOf('return makeMove(move)')>body.indexOf('const move=consumeLegalPremove(premoves,game)'));
});

test('premove is cleared when illegal',()=>{
  const queue=new PremoveQueue();queue.select('e2');queue.queue('e4');
  assert.equal(consumeLegalPremove(queue,gameWithMoves([])),null);
  assert.equal(queue.move,null);assert.equal(queue.selected,null);
  const start=main.indexOf('function playQueuedPremove'),end=main.indexOf('async function clickSquare',start),body=main.slice(start,end);
  assert.match(body,/if\(!move\)\{render\(\);return null\}/);
});

test('premove cancel clears state and is wired to click, right-click and Escape',()=>{
  const queue=new PremoveQueue();queue.select('g1');queue.queue('f3');queue.cancel();
  assert.equal(queue.move,null);assert.equal(queue.selected,null);
  assert.match(main,/if\(premoves\.move\?\.from===sq\)\{cancelPremove\(\);return\}/);
  assert.match(main,/boardEl\.addEventListener\('contextmenu',event=>\{if\(cancelPremove\(\)\)\{event\.preventDefault\(\)\}\}\)/);
  assert.match(main,/if\(event\.key==='Escape'&&cancelPremove\(\)\)\{event\.preventDefault\(\);return\}/);
});

test('premoves stay disabled in puzzles and review analysis',()=>{
  const start=main.indexOf('function premoveBlocked'),end=main.indexOf('function canQueuePremove',start),body=main.slice(start,end);
  assert.match(body,/puzzleSession/);assert.match(body,/mode==='puzzle'/);assert.match(body,/reviewState\.running/);assert.match(body,/reviewState\.viewing/);assert.match(body,/currentRightView==='review'/);
});
