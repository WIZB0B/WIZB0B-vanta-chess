import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LIVE_KEY, checkLive, endedFor, liveFrom, loadLive, returnLabel, saveLive, sideToMove } from '../src/live-game.js';

const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const ID = '0f4b5c1e-2a3d-4e5f-8a9b-0c1d2e3f4a5b';
const active = { id: ID, status: 'active', invite_code: 'K7Q2', fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1' };
const memory = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), m }; };

test('the game kept: one you sit in, online, with its clocks running', () => {
  assert.deepEqual(liveFrom(active, { seat: 'w', mode: 'match' }), { id: ID, mode: 'match', room: 'K7Q2', seat: 'w' });
  assert.equal(liveFrom(active, { seat: null, mode: 'match' }), null, 'a spectator keeps nothing');
  assert.equal(liveFrom(active, { seat: 'b', mode: 'computer' }), null, 'a computer game is not an online one');
  assert.equal(liveFrom({ ...active, status: 'waiting' }, { seat: 'w', mode: 'room' }), null, 'a room still waiting for an opponent is not one yet');
  assert.equal(liveFrom({ ...active, status: 'white_won' }, { seat: 'w', mode: 'room' }), null, 'nor a finished game');
  assert.equal(liveFrom({ ...active, id: 'not-a-game' }, { seat: 'w', mode: 'room' }), null);
  assert.equal(liveFrom({ ...active, invite_code: '<script>' }, { seat: 'w', mode: 'room' }).room, null, 'an odd room code is not kept');
});

test('it is kept on this device, and only what looks like a game comes back', () => {
  const s = memory();
  assert.equal(loadLive(s), null);
  saveLive({ id: ID, mode: 'room', room: 'K7Q2', seat: 'b' }, s);
  assert.deepEqual(loadLive(s), { id: ID, mode: 'room', room: 'K7Q2', seat: 'b' });
  saveLive(null, s);
  assert.equal(loadLive(s), null, 'let go when the game ends');
  s.setItem(LIVE_KEY, '{"id":"x","seat":"w"}'); assert.equal(loadLive(s), null);
  s.setItem(LIVE_KEY, `{"id":"${ID}","seat":"z"}`); assert.equal(loadLive(s), null, 'a seat is white or black');
  s.setItem(LIVE_KEY, '{broken'); assert.equal(loadLive(s), null);
  assert.equal(checkLive({ id: ID, mode: 'arena', seat: 'w' }).mode, 'room');
  const throwing = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } };
  assert.equal(loadLive(throwing), null, 'storage that throws (a private window) loses nothing else');
  assert.doesNotThrow(() => saveLive({ id: ID, mode: 'match', seat: 'w' }, throwing));
});

test('whose move, what the button says, and how a game ended for you', () => {
  assert.equal(sideToMove(active), 'b');
  assert.equal(sideToMove({ move_count: 3 }), 'b');
  assert.equal(sideToMove({}), null);
  const live = { id: ID, mode: 'match', room: null, seat: 'b' };
  assert.equal(returnLabel(live, active), 'Your move · back to your game');
  assert.equal(returnLabel({ ...live, seat: 'w' }, active), 'Back to your game');
  assert.equal(returnLabel(null, active), '');
  assert.equal(endedFor(live, active), null, 'still on');
  assert.equal(endedFor(live, { status: 'black_won', result: '0-1' }), 'won');
  assert.equal(endedFor(live, { status: 'white_won', result: '1-0' }), 'lost');
  assert.equal(endedFor(live, { status: 'draw', result: '1/2-1/2' }), 'draw');
  assert.equal(endedFor(live, { status: 'aborted' }), 'ended');
});

test('leaving the board for anything else keeps your game: it beats, it waits, it comes back', () => {
  // The bug (owner, 2026-10-13): the Computer tab stopped the game's heartbeat, so the opponent
  // could claim it, and nothing led back to it.
  assert.match(main, /function liveBeat\(\)\{[\s\S]*?api\.heartbeat\(live\.id\)/, 'your game beats while the board shows something else');
  assert.match(main, /setInterval\(\(\)=>void liveBeat\(\),5000\)/, 'every five seconds, like the board itself');
  assert.match(main, /function liveOnBoard\(\)\{return !!liveGame&&isOnlineGame\(\)&&serverGameId===liveGame\.id\}/, 'not twice while the board shows it');
  assert.match(main, /playQueuedPremove\(\);afterBoardPaint\(\(\)=>void maybePlayBot\(\)\);\n  keepLiveGame\(state\);/, 'every server state the board applies keeps (or lets go of) the game');
  assert.match(main, /if\(liveGame\?\.id===state\.id&&state\.status!=='active'&&state\.status!=='waiting'\)\{forgetLiveGame\(\);return\}/, 'a game that ended is let go');
  assert.match(main, /id="returnGame" class="return-game hidden"/, 'a button to go back, on a computer');
  assert.match(main, /\$\('#mReturnGame'\)\.onclick=\(\)=>liveAway\(\)\?void returnToLiveGame\(\):setMView\('game'\);/, 'and on a phone');
  assert.match(main, /async function returnToLiveGame\(target=liveGame\)\{[\s\S]*?leaveBoardActivity\(\);[\s\S]*?await activateLeftMode\(target\.mode\);[\s\S]*?applyServerState\(payload/, 'going back puts whatever was on the board aside and the game on it');
  assert.match(main, /else if\(liveGame&&!location\.search\)await resumeLiveGame\(\)/, 'VCH opened again goes straight back to a game still on');
});

test('nothing else takes the board from your game: a computer game, a new match or room, a puzzle', () => {
  assert.match(main, /function onlineGameBusy\(\)\{\n  const here=isOnlineGame\(\)&&liveGameOn\(\),away=liveAway\(\);/, 'the guard knows your game when the board shows something else');
  assert.match(main, /function startComputerGame\(opts=\{\}\)\{\n  if\(!opts\|\|opts instanceof Event\)opts=\{\};\n  if\(onlineGameBusy\(\)\)return;/);
  assert.match(main, /async function beginMatchSearch\(\)\{\n  if\(searching\)\{await cancelMatchSearch\(\);return\}\n  if\(onlineGameBusy\(\)\)return;/);
  assert.match(main, /\$\('#create'\)\.onclick=async\(\)=>\{if\(onlineGameBusy\(\)\)return;/);
});
