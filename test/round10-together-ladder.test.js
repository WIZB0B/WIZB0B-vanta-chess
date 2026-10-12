import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cleanShapes, isNewer } from '../src/analysis-sync.js';

const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
test('analyse together: the higher counter wins, ties go to the higher id; shapes are cleaned', () => {
  assert.equal(isNewer({ seq: 3, id: 'a' }, { seq: 2 }, 'b'), true);
  assert.equal(isNewer({ seq: 2, id: 'a' }, { seq: 2 }, 'b'), false);
  assert.equal(isNewer({ seq: 2, id: 'c' }, { seq: 2 }, 'b'), true);
  assert.equal(isNewer({ seq: 1, id: 'z' }, { seq: 2 }, 'b'), false);
  assert.deepEqual(cleanShapes([{ from: 'e2', to: 'e4', brush: 'green' }, { from: 'z9' }, { from: 'd4', brush: '<script>' }, null]), [{ from: 'e2', to: 'e4', brush: 'green' }, { from: 'd4', brush: 'orange' }]);
  assert.equal(cleanShapes([...Array(40)].map(() => ({ from: 'a1' }))).length, 24);
});
test('wiring: shared board, ladder queue, commentary', () => {
  assert.match(main, /realtimeClient\.channel\(`analysis:\$\{code\}`/);
  assert.match(main, /if\(analysis&&!remote\)return analysisMove\(move\);/);
  assert.match(main, /if\(kind!=='analysis'&&analysis\)leaveAnalysis\(\);/);
  assert.match(main, /if\(params\.get\('analysis'\)\)/);
  assert.match(main, /\.on\('broadcast',\{event:'battle'\}/);
  assert.match(main, /if\(typing&&\(typing\.value\|\|document\.activeElement===typing\)\)return;/, "the lobby refresh doesn't wipe a comment being written");
});
test('the shared analysis board is a free board', () => {
  assert.match(main, /function freeBoard\(\)\{return !!planSession\|\|!!studySession\?\.editing\|\|!!exploreSession\|\|!!repEdit\|\|!!analysis\}/);
});
