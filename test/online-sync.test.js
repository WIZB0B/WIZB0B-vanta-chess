import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CONFIRM_WAIT_MS, PROVISIONAL_GRACE_MS, confirms, isExpired, isStale, provisionalMove, waiter } from '../src/online-sync.js';

const main = readFileSync('src/main.js', 'utf8');

test('an older server state cannot take back a move that is waiting for confirmation', () => {
  const p = provisionalMove('g1', 8, 1000);
  assert.equal(isStale(p, { id: 'g1', version: 7 }, 1200), true);
  assert.equal(isStale(p, { id: 'g1', version: 8 }, 1200), false);
  assert.equal(isStale(p, { id: 'g2', version: 1 }, 1200), false, 'another game is never stale');
  assert.equal(isStale(p, { id: 'g1', version: 7 }, 1000 + PROVISIONAL_GRACE_MS), false, 'after the grace period the server wins');
  assert.equal(isStale(null, { id: 'g1', version: 1 }, 0), false);
});

test('a server state at or past the provisional version confirms it', () => {
  const p = provisionalMove('g1', 8, 0);
  assert.equal(confirms(p, { id: 'g1', version: 8 }), true);
  assert.equal(confirms(p, { id: 'g1', version: 9 }), true);
  assert.equal(confirms(p, { id: 'g1', version: 7 }), false);
  assert.equal(isExpired(p, PROVISIONAL_GRACE_MS - 1), false);
  assert.equal(isExpired(p, PROVISIONAL_GRACE_MS), true);
});

test('waiter resolves on confirmation or after its timeout', async () => {
  const fast = waiter(1000);fast.resolve('hint');
  assert.equal(await fast.promise, 'hint');
  const slow = waiter(5);
  assert.equal(await slow.promise, 'timeout');
  assert.ok(CONFIRM_WAIT_MS <= 3000, 'a reply never waits long for a confirmation');
});

test('the mover relays the move to the opponent before the server round trip', () => {
  const start = main.indexOf('if(serverGameId&&!remote){'), end = main.indexOf('return}let made,localElapsedMs=null', start), body = main.slice(start, end);
  const relay = body.indexOf('broadcastMoved(moveGameId,expectedVersion+1,lastLocalRealtimeMove,{early:true})');
  const request = body.indexOf('const state=await api.move(');
  assert.ok(relay > 0 && request > relay, 'early relay must go out before the move request');
  assert.match(body, /setProvisional\(moveGameId,expectedVersion\+1\)/);
  assert.match(body, /broadcastAux\('move_void',\{from:realtimeClientId,version:expectedVersion\+1\}\)/, 'a rejected move is withdrawn');
  assert.match(body, /if\(relayConfirm\)await relayConfirm\.promise;[\s\S]{0,40}const state=await api\.move\(/, 'a reply to an unconfirmed move waits briefly for it');
});

test('the opponent shows a provisional move at once and the server state stays the authority', () => {
  assert.match(main, /if\(isStale\(provisional,state,performance\.now\(\)\)\)return;/);
  assert.match(main, /\.on\('broadcast',\{event:'move_void'\},message=>\{handleMoveVoid\(message\)\}\)/);
  const fn = main.slice(main.indexOf('function applyRealtimeMove('), main.indexOf('async function refreshFromRealtime('));
  assert.match(fn, /legalMove=game\.moves\(\{square:incoming\.from,verbose:true\}\)/, 'relayed moves are checked for legality first');
  assert.match(fn, /if\(incoming\.provisional\)\{[\s\S]*?awaitRelayConfirmation\(incoming\.gameId,incoming\.version\)/);
});
