import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const main=await readFile(new URL('../src/main.js',import.meta.url),'utf8');
const css=await readFile(new URL('../src/style.css',import.meta.url),'utf8');

test('visible clocks are position-neutral and mapped to each player color',()=>{
  assert.doesNotMatch(main,/id="whiteClock"|id="blackClock"/);
  assert.match(main,/id="topClock" data-color="b"/);
  assert.match(main,/id="bottomClock" data-color="w"/);
  assert.match(main,/function playerBarClockColors\(\)/);
  assert.match(main,/const bottom=myColor==='b'\?'b':'w'/);
  assert.match(main,/element\.dataset\.color=color/);
  assert.match(main,/topBar\.dataset\.color=colors\.top/);
  assert.match(main,/bottomBar\.dataset\.color=colors\.bottom/);
});

test('running clock highlight follows the active chess color',()=>{
  assert.match(main,/element\.classList\.toggle\('running',active===color\)/);
  assert.match(main,/return computerStarted\?game\.turn\(\):null/);
  assert.match(css,/\.player time\.running\{/);
});
