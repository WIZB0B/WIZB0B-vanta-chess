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


test('committed VCH wordmark is used for visible brand surfaces',async()=>{
  const source=await readFile(new URL('../src/main.js',import.meta.url),'utf8');
  const uses=(source.match(/\/assets\/vch\/brand\/vch-metal\.svg/g)||[]).length;
  assert.ok(uses>=7,'brand wordmark must be used in top bar, splash, menu, account, search, views, and loading states');
  assert.doesNotMatch(source,/VANTA CHESS ACCOUNT|VANTA CHESS<|Search Vanta Chess|Loading live Vanta tournaments/);
});
