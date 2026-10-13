import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const api = readFileSync(new URL('../src/vch-api.js', import.meta.url), 'utf8');

test('battle: puzzle moves route to the battle, polling stops when you leave', () => {
  assert.match(main, /if\(puzzleSession\.kind==='battle'\)return battleMiss\(move\);/);
  assert.equal((main.match(/if\(puzzleSession\.kind==='battle'\)return battleSolved\(\);/g) || []).length, 2, 'both the solved paths');
  assert.match(main, /if\(currentRightView!=='battle'&&battle\.status!=='live'\)\{stopBattle\(\);return\}/);
  assert.match(main, /if\(params\.get\('battle'\)\)setTimeout\(\(\)=>void joinBattle\(/);
  for (const m of ['battleCreate', 'battleJoin', 'battleState', 'battleProgress', 'battleCancel', 'simulList', 'simulCreate', 'simulJoin', 'simulLeave', 'simulStart', 'simulState', 'vacation']) assert.match(api, new RegExp(`  ${m}\\(`));
});
test('simuls: no abandon claim or first-move abort card on simul boards; host bar', () => {
  assert.match(main, /!serverGame\?\.daily_days&&!serverGame\?\.simul_id&&!currentBot;/);
  assert.match(main, /!serverGame\?\.daily_days&&!serverGame\?\.simul_id&&Number\(serverGame\?\.move_count\|\|0\)<2/);
  assert.match(main, /<div id="simulBar" class="simul-bar hidden" role="status">/);
  assert.match(main, /const on=!!simulSession&&!!serverGame\?\.simul_id&&serverGame\.simul_id===simulSession\.id;/);
});
