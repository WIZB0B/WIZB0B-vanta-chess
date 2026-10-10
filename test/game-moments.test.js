import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CLAIM_AFTER_MS, LEFT_AFTER_MS, YOUR_MOVE_TITLE, abandonState, firstMoveOfLine, tabTitle, tickSecond } from '../src/game-moments.js';

const main = readFileSync('src/main.js', 'utf8');
const server = readFileSync('supabase/functions/chess/index.ts', 'utf8');

test('opponent-left card: warning first, claim after the server threshold', () => {
  const now = Date.parse('2026-10-10T12:00:00Z');
  const ago = ms => new Date(now - ms).toISOString();
  assert.equal(abandonState(ago(3000), now).state, 'here');
  const left = abandonState(ago(LEFT_AFTER_MS + 1000), now);
  assert.equal(left.state, 'left');assert.equal(left.secondsLeft, Math.ceil((CLAIM_AFTER_MS - LEFT_AFTER_MS - 1000) / 1000));
  assert.equal(abandonState(ago(CLAIM_AFTER_MS + 1), now).state, 'claimable');
  assert.equal(abandonState(null, now).state, 'here');
  assert.match(server, new RegExp(`const CLAIM_AFTER_MS=${CLAIM_AFTER_MS};`), 'client and server agree on the wait');
});

test('low-time tick only under 10 seconds on your running clock', () => {
  assert.equal(tickSecond(9.2, true), 10);
  assert.equal(tickSecond(4.01, true), 5);
  assert.equal(tickSecond(12, true), null);
  assert.equal(tickSecond(5, false), null);
  assert.equal(tickSecond(0, true), null);
});

test('tab title says "your move" only when the tab is hidden and it is your turn', () => {
  assert.equal(tabTitle('VCH', { hidden: true, yourTurn: true }), YOUR_MOVE_TITLE);
  assert.equal(tabTitle('VCH', { hidden: false, yourTurn: true }), 'VCH');
  assert.equal(tabTitle('VCH', { hidden: true, yourTurn: false }), 'VCH');
});

test('engine lines give the hint move', () => {
  assert.deepEqual(firstMoveOfLine('e2e4 e7e5 g1f3'), { from: 'e2', to: 'e4', promotion: null });
  assert.deepEqual(firstMoveOfLine('a7a8q'), { from: 'a7', to: 'a8', promotion: 'q' });
  assert.equal(firstMoveOfLine(''), null);
});

test('wiring: claim, hint only vs computer, wake lock, heartbeat keeps going in the background', () => {
  assert.match(main, /api\.claimWin\(serverGameId,outcome\)/);
  assert.match(main, /if\(mode!=='computer'\|\|!computerStarted\|\|localGameOver\|\|game\.isGameOver\(\)\)return toast\('Hints are for games against the computer'\)/);
  assert.match(main, /\$\('#hint'\)\?\.classList\.toggle\('hidden',mode!=='computer'\)/);
  assert.match(main, /navigator\.wakeLock\.request\('screen'\)/);
  assert.doesNotMatch(main, /if\(document\.hidden\|\|!isOnlineGame\(\)\|\|inFlight\)return/);
  assert.match(server, /case "claim_win":out=await claimWin\(req,b\);break;/);
  assert.match(server, /if\(Date\.now\(\)-seen<CLAIM_AFTER_MS\)throw fail\("Your opponent is still connected\.",409\)/);
});
