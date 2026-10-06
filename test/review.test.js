import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { REVIEW_DEPTH, CLASSIFICATION_META, classifyMove, formatMoveDuration, lichessWinPercent, winPercentageLoss } from '../src/review.js';

const main=await readFile(new URL('../src/main.js',import.meta.url),'utf8');
const worker=await readFile(new URL('../public/stockfish.worker.js',import.meta.url),'utf8');

test('Lichess open win-percentage curve is symmetric and centered',()=>{
  assert.equal(REVIEW_DEPTH,16);
  assert.ok(Math.abs(lichessWinPercent(0)-50)<1e-9);
  assert.ok(lichessWinPercent(200)>50);
  assert.ok(Math.abs((lichessWinPercent(200)+lichessWinPercent(-200))-100)<1e-9);
  assert.ok(winPercentageLoss(250,-250,'w')>20);
});

test('all required review classifications are represented',()=>{
  for(const key of ['brilliant','great','best','excellent','good','book','inaccuracy','mistake','miss','blunder'])assert.ok(CLASSIFICATION_META[key]?.label);
  assert.equal(classifyMove({isBook:true}),'book');
  assert.equal(classifyMove({beforeCp:500,afterCp:-500,color:'w'}),'blunder');
  assert.equal(classifyMove({beforeCp:0,afterCp:0,color:'w',isBest:true,isSacrifice:true}),'brilliant');
  assert.equal(formatMoveDuration(3040),'3s');
});

test('Batch 6 drives Stockfish depth 16 across every review position with progress',()=>{
  assert.match(main,/reviewWorker\.postMessage\(\{mode:'analysis',fen,depth:REVIEW_DEPTH,requestId:id\}\)/);
  assert.match(main,/for\(let index=0;index<built\.positions\.length;index\+\+\)/);
  assert.match(main,/id="reviewProgress"/);
  assert.match(main,/id="reviewProgressFill"/);
  assert.match(main,/id="reviewGame"/);
  assert.match(worker,/go depth/);
  assert.match(worker,/requestId/);
});

test('classification badges render in both move list and destination square',async()=>{
  assert.match(main,/reviewBadgeMarkup\(reviewResult\)/);
  assert.match(main,/board-review-badge/);
  assert.match(main,/classificationAsset\(result\.classification\)/);
  for(const name of ['brilliant','great','best','excellent','good','inaccuracy','mistake','miss','blunder']){
    await access(new URL('../public/assets/vch/icons/review/'+name+'.svg',import.meta.url));
  }
});
