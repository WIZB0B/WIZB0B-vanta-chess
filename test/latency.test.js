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
  assert.match(main,/\.on\('broadcast',\{event:'state'\},message=>\{refreshFromRealtime\(message\)\}\)/);
  assert.match(main,/\.on\('broadcast',\{event:'moved'\},message=>\{refreshFromRealtime\(message\)\}\)/);
  assert.match(main,/realtimeChannel\.send\(\{type:'broadcast',event:'moved',payload:\{gameId,version:Number\(version\)\}\}\)/);
  assert.match(main,/const authoritative=await api\.heartbeat\(requestedGameId\)/);
  assert.match(main,/if\(authoritativeVersion>serverVersion\)\{applyServerState\(authoritative\);playTone\(\)\}/);
  assert.doesNotMatch(main,/\.on\('broadcast',\{event:'state'\},message=>\{[\s\S]{0,400}applyServerState\(/);
  assert.match(main,/broadcastMoved\(movedGameId,incomingVersion\);if\(incomingVersion>serverVersion\)\{applyServerState\(state\);playTone\(\)\}/);
  assert.match(main,/setInterval\(async\(\)=>\{[\s\S]*?api\.heartbeat\(serverGameId\)[\s\S]*?\},5000\)/);
  assert.match(main,/realtimeReady=false;latencyMs=null;realtimeRefreshPromise=null/);
  assert.match(main,/function stopOnlineSync\(\)/);
  assert.match(main,/if\(!isOnlineGame\(\)\)\{stopOnlineSync\(\);return\}/);
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
