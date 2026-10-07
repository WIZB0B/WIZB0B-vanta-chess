import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { BOT_NODE_LEVELS, ANALYSIS_MAX_DEPTH, ANALYSIS_MIN_DEPTH, botSearchNodes } from '../src/engine-config.js';

const main=await readFile(new URL('../src/main.js',import.meta.url),'utf8');
const workerSource=await readFile(new URL('../public/stockfish.worker.js',import.meta.url),'utf8');
const START='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// Runs the real worker bridge against a fake Stockfish engine that records UCI commands.
function loadBridge(){
  const sent=[],posted=[];let engine;
  class FakeEngine{constructor(){engine=this}postMessage(command){sent.push(command)}}
  const self={postMessage:message=>posted.push(message)};
  vm.runInNewContext(workerSource,{self,Worker:FakeEngine,Number,Math,String});
  return {
    sent,posted,
    request:data=>self.onmessage({data}),
    engineSays:line=>engine.onmessage({data:line})
  };
}

test('bot search size is fixed per level, never time based',()=>{
  assert.deepEqual([900,1200,1500,1800,2200,2700].map(botSearchNodes),[20000,40000,80000,150000,250000,400000]);
  for(let i=1;i<BOT_NODE_LEVELS.length;i++)assert.ok(BOT_NODE_LEVELS[i].nodes>BOT_NODE_LEVELS[i-1].nodes,'stronger bots search more');
  assert.equal(botSearchNodes('not a number'),80000);
  assert.doesNotMatch(main,/movetime/,'no time-based searches remain in the app');
  assert.doesNotMatch(workerSource,/go movetime/);
});

test('bot requests keep UCI_Elo / Skill Level and search a fixed node count',()=>{
  const bridge=loadBridge();
  bridge.request({mode:'bot',fen:START,elo:1800,nodes:150000,requestId:'bot-1'});
  assert.deepEqual(bridge.sent.slice(1),[
    'setoption name Skill Level value 20','setoption name UCI_LimitStrength value true','setoption name UCI_Elo value 1800',
    `position fen ${START}`,'go nodes 150000'
  ]);
  bridge.engineSays('bestmove e2e4');
  bridge.request({mode:'bot',fen:START,elo:900,nodes:20000,requestId:'bot-2'});
  assert.deepEqual(bridge.sent.slice(-4),['setoption name UCI_LimitStrength value false','setoption name Skill Level value 0',`position fen ${START}`,'go nodes 20000']);
});

test('analysis runs at full strength and searches to the requested depth',()=>{
  const bridge=loadBridge();
  bridge.request({mode:'analysis',fen:START,depth:ANALYSIS_MAX_DEPTH,requestId:'analysis-1'});
  assert.deepEqual(bridge.sent.slice(1),['setoption name UCI_LimitStrength value false','setoption name Skill Level value 20',`position fen ${START}`,'go depth 18']);
  assert.ok(ANALYSIS_MIN_DEPTH===10&&ANALYSIS_MAX_DEPTH===18);
  bridge.request({mode:'analysis',fen:START,requestId:'analysis-2'});
  bridge.engineSays('bestmove e2e4');
  assert.equal(bridge.sent.at(-1),'go depth 18','a missing depth no longer collapses to depth 1');
});

test('a new request stops the running search and output is tagged with the right request',()=>{
  const bridge=loadBridge();
  bridge.request({mode:'analysis',fen:START,depth:18,requestId:'a'});
  bridge.engineSays('info depth 7 score cp 20 pv e2e4');
  bridge.request({mode:'analysis',fen:START,depth:18,requestId:'b'});
  assert.equal(bridge.sent.at(-1),'stop');
  bridge.engineSays('info depth 8 score cp 22 pv e2e4');
  bridge.engineSays('bestmove e2e4');
  bridge.engineSays('info depth 1 score cp 30 pv d2d4');
  assert.deepEqual(bridge.posted.map(message=>message.requestId),['a','a','a','b']);
  assert.equal(bridge.sent.at(-1),'go depth 18');
});

test('bot, live analysis and review each use their own Stockfish worker',()=>{
  assert.match(main,/const stockfish=new Worker\('\/stockfish\.worker\.js'\);\nconst analysisWorker=new Worker\('\/stockfish\.worker\.js'\);\nconst reviewWorker=new Worker\('\/stockfish\.worker\.js'\);/);
  assert.match(main,/stockfish\.postMessage\(\{mode:'bot',fen,elo:requestedElo,nodes:botSearchNodes\(requestedElo\),requestId:id\}\)/);
  assert.match(main,/analysisWorker\.postMessage\(\{mode:'analysis',fen,depth:ANALYSIS_MAX_DEPTH,requestId:analysisRequest\.id\}\)/);
  assert.match(main,/reviewWorker\.postMessage\(\{mode:'analysis',fen,depth:REVIEW_DEPTH,requestId:id\}\)/);
  assert.doesNotMatch(main,/stockfish\.postMessage\(\{mode:'analysis'/);
  assert.doesNotMatch(main,/analysisWorker\.postMessage\(\{mode:'bot'/);
});

test('live analysis shows the real depth, ignores stale lines and never goes backwards',()=>{
  const start=main.indexOf('function updateAnalysisFromUci(text,request)'),body=main.slice(start,main.indexOf('function scheduleAnalysis',start));
  assert.match(body,/if\(!request\|\|request\.fen!==game\.fen\(\)\)return/);
  assert.match(body,/if\(depth<request\.depth\)return/);
  assert.match(body,/depthEl\.textContent=String\(depth\)/);
  assert.match(main,/if\(!analysisRequest\|\|data\.requestId!==analysisRequest\.id\)return/);
  assert.match(main,/if\(!force&&analysisRequest\?\.fen===fen\)return/,'an unchanged position keeps deepening instead of restarting');
});
