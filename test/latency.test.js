import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { calculateMoveTiming, MAX_NETWORK_COMPENSATION_MS } from '../supabase/functions/chess/latency.js';

const main=await readFile(new URL('../src/main.js',import.meta.url),'utf8');
const edge=await readFile(new URL('../supabase/functions/chess/index.ts',import.meta.url),'utf8');
const pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));

test('online games use one Realtime channel and a 5s heartbeat fallback',()=>{
  assert.equal(pkg.dependencies['@supabase/supabase-js'],'2.109.0');
  assert.match(main,/createClient\(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY/);
  assert.match(main,/\.channel\(\`game:\$\{gameId\}\`,\{config:\{broadcast:\{self:true\}\}\}\)/);
  assert.match(main,/\.on\('broadcast',\{event:'state'\},message=>\{handleRealtimeMessage\(message\)\}\)/);
  assert.match(main,/\.on\('broadcast',\{event:'moved'\},message=>\{handleRealtimeMessage\(message\)\}\)/);
  assert.match(main,/realtimeChannel\.send\(\{type:'broadcast',event:'moved',payload:\{gameId,version:Number\(version\),from,to,promotion:promotion\|\|null,fenBefore\}\}\)/);
  assert.match(main,/const authoritative=await api\.heartbeat\(requestedGameId\)/);
  assert.match(main,/if\(authoritativeVersion>serverVersion\)\{applyServerState\(authoritative\);playTone\(\)\}/);
  assert.doesNotMatch(main,/\.on\('broadcast',\{event:'state'\},message=>\{[\s\S]{0,400}applyServerState\(/);
  assert.match(main,/broadcastMoved\(movedGameId,incomingVersion,lastLocalRealtimeMove\);[\s\S]{0,180}if\(moveGameId===serverGameId&&incomingVersion>serverVersion\)applyServerState\(state,\{animateMove:false\}\)/);
  assert.match(main,/setInterval\(async\(\)=>\{[\s\S]*?api\.heartbeat\(serverGameId\)[\s\S]*?\},5000\)/);
  assert.match(main,/realtimeReady=false;latencyMs=null;realtimeRefreshPromise=null/);
  assert.match(main,/function stopOnlineSync\(\)/);
  assert.match(main,/if\(!isOnlineGame\(\)\)\{stopOnlineSync\(\);return\}/);
});

test('online moves apply locally before waiting for the authoritative response',()=>{
  const start=main.indexOf('if(serverGameId&&!remote){'),end=main.indexOf('return}let made,localElapsedMs=null',start),body=main.slice(start,end);
  const validate=body.indexOf("game.moves({square:move.from,verbose:true}).find");
  const apply=body.indexOf('made=game.move(');
  const render=body.indexOf('switchOnlineClockOptimistically();render();playMoveAnimation(moveAnimation);playTone()');
  const request=body.indexOf('const state=await api.move(');
  assert.ok(validate>=0&&apply>validate&&render>apply&&request>render,'online move must validate, apply/render locally, then await the server');
  assert.match(body,/if\(onlineMovePending\)return/);
  assert.match(body,/onlineMovePending=true/);
  assert.match(body,/finally\{onlineMovePending=false\}/);
});

test('rejected optimistic moves roll back to the server state and show a short toast',()=>{
  const start=main.indexOf('if(serverGameId&&!remote){'),end=main.indexOf('return}let made,localElapsedMs=null',start),body=main.slice(start,end);
  assert.match(body,/catch\{\s*if\(moveGameId===serverGameId\)\{\s*await refreshServerState\(\);render\(\);toast\('Move not accepted'\);\s*\}\s*\}/);
});

test('valid remote move is applied instantly before server confirmation',()=>{
  const start=main.indexOf('function applyRealtimeMove'),end=main.indexOf('async function refreshFromRealtime',start),body=main.slice(start,end);
  assert.match(body,/incoming\.gameId!==serverGameId\|\|incoming\.version!==serverVersion\+1\|\|incoming\.fenBefore!==game\.fen\(\)/);
  const legal=body.indexOf("game.moves({square:incoming.from,verbose:true}).find");
  const apply=body.indexOf('made=game.move(');
  const render=body.indexOf('switchOnlineClockOptimistically();render();playMoveAnimation(moveAnimation);playTone()');
  const confirm=body.indexOf('void refreshServerState()');
  assert.ok(legal>=0&&apply>legal&&render>apply&&confirm>render,'remote move must validate, render immediately, then confirm in background');
});

test('mismatched realtime fen or version falls back to fetch-first sync',()=>{
  const applyStart=main.indexOf('function applyRealtimeMove'),applyEnd=main.indexOf('async function refreshFromRealtime',applyStart),applyBody=main.slice(applyStart,applyEnd);
  const handlerStart=main.indexOf('function handleRealtimeMessage'),handlerEnd=main.indexOf('function startRealtime',handlerStart),handler=main.slice(handlerStart,handlerEnd);
  const fallbackStart=main.indexOf('async function refreshFromRealtime'),fallbackEnd=main.indexOf('function handleRealtimeMessage',fallbackStart),fallback=main.slice(fallbackStart,fallbackEnd);
  assert.match(applyBody,/incoming\.version!==serverVersion\+1/);
  assert.match(applyBody,/incoming\.fenBefore!==game\.fen\(\)/);
  assert.ok(handler.indexOf('if(applyRealtimeMove(incoming))return')<handler.indexOf('refreshFromRealtime(message)'));
  assert.match(fallback,/const authoritative=await api\.heartbeat\(requestedGameId\)/);
});

test('own realtime move echo is ignored before apply or fetch',()=>{
  const ownStart=main.indexOf('function isOwnRealtimeMove'),ownEnd=main.indexOf('function applyRealtimeMove',ownStart),own=main.slice(ownStart,ownEnd);
  const handlerStart=main.indexOf('function handleRealtimeMessage'),handlerEnd=main.indexOf('function startRealtime',handlerStart),handler=main.slice(handlerStart,handlerEnd);
  assert.match(own,/const own=lastLocalRealtimeMove/);
  assert.match(own,/incoming\.gameId===own\.gameId&&incoming\.version===own\.version&&incoming\.from===own\.from&&incoming\.to===own\.to/);
  const ignore=handler.indexOf('if(isOwnRealtimeMove(incoming))return');
  const apply=handler.indexOf('if(applyRealtimeMove(incoming))return');
  const fetch=handler.indexOf('refreshFromRealtime(message)');
  assert.ok(ignore>=0&&apply>ignore&&fetch>apply,'own echo must return before optimistic apply or fallback fetch');
});

test('ping is measured only from a Realtime self echo',()=>{
  assert.match(main,/event:'ping'/);
  assert.match(main,/const nonce=crypto\.randomUUID\(\),started=performance\.now\(\)/);
  assert.match(main,/latencyMs=Math\.max\(1,Math\.round\(performance\.now\(\)-started\)\)/);
  assert.doesNotMatch(main,/latencyMs=.*api\.heartbeat/);
  assert.match(main,/if\(ping\)ping\.textContent='-- ms'/);
});

test('lag compensation is capped at 300 ms and records both timestamps',()=>{
  assert.equal(MAX_NETWORK_COMPENSATION_MS,300);
  const timing=calculateMoveTiming({
    clientMoveAt:'2026-10-06T10:00:00.000Z',
    lastMoveAt:'2026-10-06T09:59:59.000Z',
    serverReceivedAt:'2026-10-06T10:00:00.450Z',
  });
  assert.equal(timing.networkCompensationMs,300);
  assert.equal(timing.elapsedMs,1450);
  assert.equal(timing.chargedElapsedMs,1150);
  assert.equal(timing.clientMoveAt,'2026-10-06T10:00:00.000Z');
  assert.equal(timing.serverReceivedAt,'2026-10-06T10:00:00.450Z');
  assert.match(edge,/Deno\.serve\(async\(req\)=>\{\s*const serverReceivedMs=Date\.now\(\)/);
  assert.match(edge,/case \"move\":out=await makeMove\(req,b,serverReceivedMs\);break/);
  assert.match(edge,/client_move_at:timing\.clientMoveAt/);
  assert.match(edge,/server_received_at:timing\.serverReceivedAt/);
  assert.match(edge,/network_compensation_ms:timing\.networkCompensationMs/);
  assert.match(edge,/EdgeRuntime\.waitUntil\(broadcastGameState\(nextGame\)\)/);
  assert.match(edge,/\/realtime\/v1\/api\/broadcast/);
});

test('invalid or future client timestamps never create negative clock charge',()=>{
  const invalid=calculateMoveTiming({clientMoveAt:'bad',lastMoveAt:'2026-10-06T10:00:00.000Z',serverReceivedAt:'2026-10-06T10:00:01.000Z'});
  assert.equal(invalid.networkCompensationMs,0);
  assert.equal(invalid.chargedElapsedMs,1000);
  const future=calculateMoveTiming({clientMoveAt:'2026-10-06T10:00:02.000Z',lastMoveAt:'2026-10-06T10:00:00.000Z',serverReceivedAt:'2026-10-06T10:00:01.000Z'});
  assert.equal(future.networkCompensationMs,0);
  assert.equal(future.chargedElapsedMs,1000);
});
