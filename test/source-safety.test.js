import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';

test('DOM collection handlers use selector-all helper',async()=>{
  const source=await readFile(new URL('../src/main.js',import.meta.url),'utf8');
  const bad=[...source.matchAll(/(?<!\$)\$\([^\n;]+\)\.forEach/g)].map(m=>m[0]);
  assert.deepEqual(bad,[],`Single-element selector used as a collection: ${bad.join(', ')}`);
});

test('reference artwork is test-only and dedicated UI art is used at runtime',async()=>{
  const source=await readFile(new URL('../src/main.js',import.meta.url),'utf8');
  assert.doesNotMatch(source,/reference-ui\.png/);
  for(const name of ['hero-knight','live-banner','opening-card','famous-card','review-card','practice-card']){
    assert.match(source,new RegExp('/assets/vch/ui/'+name+'\\.webp'));
  }
  await access(new URL('../e2e/fixtures/reference-ui.png',import.meta.url));
  assert.doesNotMatch(source,/d2ol7oe51mr4n9\.cloudfront\.net/);
});
