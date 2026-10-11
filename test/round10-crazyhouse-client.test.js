import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
test('crazyhouse client: shared rules, drops instead of moves, mate that counts drops', () => {
  assert.match(readFileSync(new URL('../src/crazyhouse.js', import.meta.url), 'utf8'), /export \* from '\.\.\/supabase\/functions\/chess\/crazyhouse\.js';/);
  assert.match(main, /<option value="crazyhouse">Crazyhouse/); assert.match(main, /data-cv="crazyhouse"/);
  assert.match(main, /const state=await api\.move\(serverGameId,version,\{drop:type,to,clientMoveAt:Date\.now\(\)\}\);/);
  assert.match(main, /function boardOver\(\)\{return isZhGame\(\)\?zhStatus\(Chess,game,zhClientState\(\)\)\.over:game\.isGameOver\(\)\}/);
  assert.match(main, /reviewState\.viewing\|\|localGameOver\|\|boardOver\(\)\|\|/, 'a check you can block by a drop is not the end');
  assert.match(main, /if\(entry\.variant==='crazyhouse'\)return toast/);
  assert.doesNotMatch(main, /data-computer-variant="crazyhouse"/, 'Stockfish does not play Crazyhouse here');
});
