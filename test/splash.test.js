import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { FIRST_VISIT_SPLASH, SPLASH_SEEN_KEY, STANDALONE_SPLASH, dismissSplash, isStandaloneDisplay, splashMarkup, splashPlan } from '../src/splash.js';

const main=await readFile(new URL('../src/main.js',import.meta.url),'utf8');

function memoryStorage(initial={}){
  const data={...initial};
  return {data,getItem:key=>key in data?data[key]:null,setItem:(key,value)=>{data[key]=String(value);}};
}

test('installed app launches always show the full splash',()=>{
  const storage=memoryStorage({[SPLASH_SEEN_KEY]:'1'});
  assert.equal(splashPlan({standalone:true,storage}),STANDALONE_SPLASH);
});

test('a first web visit shows a splash under 600ms, then a refresh renders immediately',()=>{
  const storage=memoryStorage();
  const plan=splashPlan({standalone:false,storage});
  assert.equal(plan,FIRST_VISIT_SPLASH);
  assert.ok(plan.holdMs+plan.fadeMs<600,'first-visit splash including its fade stays under 600ms');
  assert.equal(storage.data[SPLASH_SEEN_KEY],'1');
  assert.equal(splashPlan({standalone:false,storage}),null);
  assert.equal(splashMarkup(null),'');
});

test('blocked storage skips the splash rather than showing it on every refresh',()=>{
  const storage={getItem(){throw new Error('blocked');},setItem(){throw new Error('blocked');}};
  assert.equal(splashPlan({standalone:false,storage}),null);
  const readOnly={getItem:()=>null,setItem(){throw new Error('quota');}};
  assert.equal(splashPlan({standalone:false,storage:readOnly}),null,'unwritable storage also skips it');
});

test('standalone detection covers display-mode media query and iOS home-screen apps',()=>{
  assert.equal(isStandaloneDisplay({matchMedia:q=>({matches:q==='(display-mode: standalone)'})}),true);
  assert.equal(isStandaloneDisplay({matchMedia:()=>({matches:false}),navigator:{standalone:true}}),true);
  assert.equal(isStandaloneDisplay({matchMedia:()=>({matches:false}),navigator:{}}),false);
});

test('the splash fades out and is removed after its hold and fade',()=>{
  const calls=[],classes=[];let removed=false;
  const element={classList:{add:name=>classes.push(name)},remove:()=>{removed=true;}};
  dismissSplash(element,FIRST_VISIT_SPLASH,(fn,ms)=>calls.push([fn,ms]));
  assert.deepEqual(calls.map(([,ms])=>ms),[FIRST_VISIT_SPLASH.holdMs,FIRST_VISIT_SPLASH.holdMs+FIRST_VISIT_SPLASH.fadeMs]);
  calls.forEach(([fn])=>fn());
  assert.deepEqual(classes,['done']);
  assert.equal(removed,true);
  assert.match(splashMarkup(FIRST_VISIT_SPLASH),/--splash-fade:200ms/);
});

test('main.js renders the splash only through the splash plan',()=>{
  assert.doesNotMatch(main,/<div id="brandSplash"/);
  assert.doesNotMatch(main,/setTimeout\(\(\)=>brandSplash/);
  assert.match(main,/splashPlan\(\{standalone:isStandaloneDisplay\(window\)/);
});
