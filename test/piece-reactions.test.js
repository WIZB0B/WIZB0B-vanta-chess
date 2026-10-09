import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { GESTURES, GESTURE_MS, MAX_LEAN, MAX_PULL, PieceReactions, leanFor, offsetInSquare, pullFor } from '../src/piece-reactions.js';

const css=await readFile(new URL('../src/style.css',import.meta.url),'utf8');
const main=await readFile(new URL('../src/main.js',import.meta.url),'utf8');

test('every piece type has its own gesture that starts and ends at rest',()=>{
  assert.deepEqual(Object.keys(GESTURES).sort(),['b','k','n','p','q','r']);
  const signatures=new Set();
  for(const [type,frames] of Object.entries(GESTURES)){
    assert.equal(frames[0].transform,'none',type);assert.equal(frames.at(-1).transform,'none',type);
    assert.ok(GESTURE_MS[type]>=300&&GESTURE_MS[type]<=600,`${type} is short`);
    signatures.add(JSON.stringify(frames.slice(1,-1)));
  }
  assert.equal(signatures.size,6,'no two pieces share a gesture');
});

test('lean and pull are bounded and point toward the cursor',()=>{
  assert.equal(leanFor(0),0);assert.equal(leanFor(1),MAX_LEAN);assert.equal(leanFor(-3),-MAX_LEAN);assert.equal(leanFor(.5),MAX_LEAN/2);
  assert.deepEqual(pullFor(1,-1),{x:MAX_PULL,y:-MAX_PULL});assert.deepEqual(pullFor(0,0),{x:0,y:0});
  assert.deepEqual(offsetInSquare({left:100,top:100,width:50,height:50},125,100),{x:0,y:-1});
  assert.deepEqual(offsetInSquare(null,1,1),{x:0,y:0});
});

function fakeEl(piece){
  const classes=new Set(),props={},animations=[];
  const art={animate:(frames,opts)=>{const a={frames,opts,cancel(){}};animations.push(a);return a},getAnimations:()=>[]};
  return {dataset:{piece},firstElementChild:art,animations,classList:{add:c=>classes.add(c),remove:c=>classes.delete(c),has:c=>classes.has(c)},style:{setProperty:(k,v)=>{props[k]=v},removeProperty:k=>{delete props[k]}},props,getBoundingClientRect:()=>({left:0,top:0,width:100,height:100})};
}
test('hover plays the gesture once, leans toward the cursor, and clears on leave; press pulls',()=>{
  const knight=fakeEl('wn'),sq=fakeEl('');let enabled=true;
  const r=new PieceReactions({pieceAt:s=>s==='g1'?knight:null,canPick:s=>s==='g1',squareEl:()=>sq,enabled:()=>enabled});
  r.hover('g1',90,50);
  assert.ok(knight.classList.has('hovered'));assert.ok(sq.classList.has('hover-piece'));
  assert.equal(knight.animations.length,1);assert.equal(knight.animations[0].frames,GESTURES.n);
  assert.equal(knight.props['--lean'],`${leanFor(.8)}deg`);
  r.hover('g1',10,50);
  assert.equal(knight.animations.length,1,'moving within the square only changes the lean');
  assert.equal(knight.props['--lean'],`${leanFor(-.8)}deg`);
  r.press('g1',100,0);
  assert.ok(knight.classList.has('pressed'));assert.equal(knight.props['--pull-x'],`${MAX_PULL}%`);assert.equal(knight.props['--pull-y'],`${-MAX_PULL}%`);
  r.release();assert.ok(!knight.classList.has('pressed'));
  r.hover('e4',0,0);
  assert.ok(!knight.classList.has('hovered'));assert.ok(!('--lean' in knight.props));
  enabled=false;r.hover('g1',90,50);
  assert.equal(knight.animations.length,1,'no gesture with reduced motion');
  assert.ok(!('--lean' in knight.props));
});

test('the board wires hover, press and hint swell, and keeps their classes across redraws',()=>{
  assert.match(main,/boardEl\.addEventListener\('pointermove',event=>\{\s*if\(pointerDrag\|\|event\.pointerType==='touch'\|\|event\.buttons\)return;/);
  assert.ok(main.includes("reactions.press(square,event.clientX,event.clientY);"));
  assert.ok(main.includes("${reactions.hoverSquare===sq?' hover-piece':''}${reactions.hintSquare===sq&&legal.has(sq)?' hint-hover':''}"));
  assert.ok(main.includes("enabled:()=>!prefersReducedMotion()&&motionScale()>0"));
  assert.ok(css.includes('.board-piece.hovered .piece{translate:0 -3%;scale:1.04;rotate:var(--lean,0deg)}'));
  assert.ok(css.includes('.board .square.legal.hint-hover::after,.board .square.legal.drag-over::after{scale:1.8;'));
  assert.match(css,/@media \(prefers-reduced-motion:reduce\)\{\s*\.board-piece \.piece,\.board-piece::before\{transition:none\}/);
});
