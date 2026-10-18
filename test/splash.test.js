import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { STANDALONE_SPLASH, dismissSplash, isStandaloneDisplay, splashMarkup, splashPlan } from '../src/splash.js';

const main=await readFile(new URL('../src/main.js',import.meta.url),'utf8');

test('installed app launches always show the full splash',()=>{
  assert.equal(splashPlan({standalone:true}),STANDALONE_SPLASH);
});

test('a browser visit never shows a splash, first visit or not: the veil covers loading instead',()=>{
  // Owner, 2026-10-17: the menu "does not land naturally" (a first visit showed the wallpaper,
  // then a short splash, then the page).
  assert.equal(splashPlan({standalone:false}),null);
  assert.equal(splashMarkup(null),'');
});

test('standalone detection covers display-mode media query and iOS home-screen apps',()=>{
  assert.equal(isStandaloneDisplay({matchMedia:q=>({matches:q==='(display-mode: standalone)'})}),true);
  assert.equal(isStandaloneDisplay({matchMedia:()=>({matches:false}),navigator:{standalone:true}}),true);
  assert.equal(isStandaloneDisplay({matchMedia:()=>({matches:false}),navigator:{}}),false);
});

test('the splash fades out and is removed after its hold and fade',()=>{
  const calls=[],classes=[];let removed=false;
  const element={classList:{add:name=>classes.push(name)},remove:()=>{removed=true;}};
  dismissSplash(element,STANDALONE_SPLASH,(fn,ms)=>calls.push([fn,ms]));
  assert.deepEqual(calls.map(([,ms])=>ms),[STANDALONE_SPLASH.holdMs,STANDALONE_SPLASH.holdMs+STANDALONE_SPLASH.fadeMs]);
  calls.forEach(([fn])=>fn());
  assert.deepEqual(classes,['done']);
  assert.equal(removed,true);
  assert.match(splashMarkup(STANDALONE_SPLASH),/--splash-fade:450ms/);
});

test('main.js renders the splash only through the splash plan',()=>{
  assert.doesNotMatch(main,/<div id="brandSplash"/);
  assert.doesNotMatch(main,/setTimeout\(\(\)=>brandSplash/);
  assert.match(main,/splashPlan\(\{standalone:isStandaloneDisplay\(window\)/);
});
