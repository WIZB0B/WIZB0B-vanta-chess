import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
test('crazyhouse client: shared rules, drops instead of moves, mate that counts drops', () => {
  assert.match(readFileSync(new URL('../src/crazyhouse.js', import.meta.url), 'utf8'), /export \* from '\.\.\/supabase\/functions\/chess\/crazyhouse\.js';/);
  assert.match(main, /<option value="crazyhouse">Crazyhouse/); assert.match(main, /data-cv="crazyhouse"/);
  assert.match(main, /const state=await api\.move\(serverGameId,version,\{drop:type,to,clientMoveAt:Date\.now\(\)\}\);/);
  // Round 12: drop games ask zhGameStatus, which is Crazyhouse's zhStatus (or Bughouse's own mate rule).
  assert.match(main, /function boardOver\(\)\{return isZhGame\(\)\?zhGameStatus\(\)\.over:game\.isGameOver\(\)\}/);
  assert.match(main, /function zhGameStatus\(\)\{const st=zhClientState\(\);return \(watchSession\?\.state\|\|serverGame\)\?\.variant==='bughouse'\?bughouseStatus\(Chess,game,st\):zhStatus\(Chess,game,st\)\}/);
  assert.match(main, /reviewState\.viewing\|\|localGameOver\|\|boardOver\(\)\|\|/, 'a check you can block by a drop is not the end');
  // Round 13: archived Crazyhouse games replay with their drops and are reviewed by the variant engine.
  assert.match(main, /const zh=entry\.variant==='crazyhouse'\?zhRecordsFromSans\(Chess,entry\.sans,entry\.startFen\):null;/);
  assert.doesNotMatch(main, /data-computer-variant="crazyhouse"/, 'Stockfish does not play Crazyhouse here');
});
