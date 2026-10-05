import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { REVIEW_DEPTH, accuracyFromLosses } from '../src/review.js';

const main=await readFile(new URL('../src/main.js',import.meta.url),'utf8');
const css=await readFile(new URL('../src/style.css',import.meta.url),'utf8');

test('requested review punctuation is correct',async()=>{
  const expected={brilliant:'!!',great:'!',inaccuracy:'?!',mistake:'?',blunder:'??'};
  for(const [name,label] of Object.entries(expected)){
    const svg=await readFile(new URL('../public/assets/vch/icons/review/'+name+'.svg',import.meta.url),'utf8');
    assert.ok(svg.includes('>'+label+'</text>'),name+' icon should show '+label);
  }
});

test('review header stays on the real depth 16',()=>{
  assert.equal(REVIEW_DEPTH,16);
  assert.match(main,/depthEl\.textContent=String\(REVIEW_DEPTH\)/);
  assert.match(main,/if\(reviewState\.running\|\|reviewState\.viewing\)/);
});

test('move list exposes six rows before scrolling and move times are seconds',()=>{
  const batch=css.slice(css.lastIndexOf('/* Batch 7:'));
  assert.match(batch,/\.moves\{\s*height:260px/);
  assert.match(main,/return formatMoveDuration\(raw\)\|\|'1s'/);
  assert.match(main,/target\.scrollTop=0/);
});

test('Batch 7 exposes arrows, vertical eval bar, graph, accuracy, step controls and explanations',()=>{
  for(const id of ['reviewEvalBar','reviewEvalFill','reviewArrows','reviewGraph','whiteAccuracy','blackAccuracy','reviewCounts','reviewFirst','reviewPrev','reviewNext','reviewLast','reviewExplanation']){
    assert.match(main,new RegExp('id="'+id+'"'));
  }
  assert.match(main,/reviewArrowLine\(bestFrom,bestTo,'best'\)/);
  assert.match(main,/reviewArrowLine\(result\.from,result\.to,'played'\)/);
  assert.match(main,/graph\.querySelectorAll\('\[data-review-ply\]'\)/);
  assert.match(main,/event\.key==='ArrowLeft'/);
  assert.match(main,/event\.key==='ArrowRight'/);
  assert.match(main,/Best was \$\{best\}/);
});

test('accuracy falls as average win-percentage loss rises',()=>{
  assert.equal(accuracyFromLosses([]),100);
  assert.equal(accuracyFromLosses([0,0]),100);
  assert.ok(accuracyFromLosses([2,2])>accuracyFromLosses([12,12]));
  assert.ok(accuracyFromLosses([12,12])>accuracyFromLosses([30,30]));
});
