import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadBestStreak, saveBestStreak, streakDifficulty } from '../src/puzzle-streak.js';

const memory = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) } };
const main = readFileSync('src/main.js', 'utf8');

test('streak puzzles get harder every three solves', () => {
  assert.deepEqual([0, 2, 3, 6, 9, 12, 40].map(streakDifficulty), ['easiest', 'easiest', 'easier', 'normal', 'harder', 'hardest', 'hardest']);
});

test('the best streak only goes up', () => {
  const s = memory();
  assert.equal(loadBestStreak(s), 0);
  assert.equal(saveBestStreak(5, s), 5); assert.equal(saveBestStreak(3, s), 5); assert.equal(loadBestStreak(s), 5);
});

test('puzzle moves match the solution even though taps always send a queen promotion', () => {
  assert.match(main, /if\(uci!==expected&&!\(expected\?\.length===4&&uci===expected\+'q'\)\)\{if\(streakSession\)return endStreak\(move\);/);
});
