import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('DOM collection handlers use selector-all helper',async()=>{
  const source=await readFile(new URL('../src/main.js',import.meta.url),'utf8');
  const bad=[...source.matchAll(/(?<!\$)\$\([^\n;]+\)\.forEach/g)].map(m=>m[0]);
  assert.deepEqual(bad,[],`Single-element selector used as a collection: ${bad.join(', ')}`);
});

test('reference artwork stays local in runtime markup',async()=>{
  const source=await readFile(new URL('../src/main.js',import.meta.url),'utf8');
  assert.match(source,/\/assets\/vch\/ui\/reference-ui\.png/);
  assert.doesNotMatch(source,/d2ol7oe51mr4n9\.cloudfront\.net/);
});
