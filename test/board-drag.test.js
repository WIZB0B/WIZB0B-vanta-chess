import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DRAG_THRESHOLD_PX, dragDistanceExceeded, dropOutcome, squareFromPoint } from '../src/board-drag.js';

const main=await readFile(new URL('../src/main.js',import.meta.url),'utf8');
const css=await readFile(new URL('../src/style.css',import.meta.url),'utf8');
const rect={left:100,top:50,width:800,height:800};

test('points map to squares for both orientations',()=>{
  assert.equal(squareFromPoint(rect,105,845),'a1');
  assert.equal(squareFromPoint(rect,895,55),'h8');
  assert.equal(squareFromPoint(rect,450,650),'d2');
  assert.equal(squareFromPoint(rect,105,845,true),'h8');
  assert.equal(squareFromPoint(rect,895,55,true),'a1');
  assert.equal(squareFromPoint(rect,450,650,true),'e7');
});

test('points off the board map to no square',()=>{
  assert.equal(squareFromPoint(rect,99,400),null);
  assert.equal(squareFromPoint(rect,400,850),null);
  assert.equal(squareFromPoint(null,400,400),null);
  assert.equal(squareFromPoint({left:0,top:0,width:0,height:0},0,0),null);
});

test('a press only becomes a drag after a few pixels',()=>{
  assert.equal(dragDistanceExceeded(10,10,10+DRAG_THRESHOLD_PX-1,10),false);
  assert.equal(dragDistanceExceeded(10,10,10,10+DRAG_THRESHOLD_PX),true);
});

test('drops play legal moves and return everything else',()=>{
  const legalTargets=['e3','e4'];
  assert.equal(dropOutcome({from:'e2',to:'e4',legalTargets}),'move');
  assert.equal(dropOutcome({from:'e2',to:'e5',legalTargets}),'return');
  assert.equal(dropOutcome({from:'e2',to:null,legalTargets}),'return');
  assert.equal(dropOutcome({from:'e2',to:'e2',legalTargets}),'return');
  assert.equal(dropOutcome({from:'e2',to:'e2',legalTargets,wasSelected:true}),'deselect');
});

test('the board uses pointer dragging instead of native drag and drop',()=>{
  assert.doesNotMatch(main,/draggable="true"/);
  assert.doesNotMatch(main,/addEventListener\('dragstart'/);
  assert.match(main,/boardEl\.addEventListener\('pointerdown'/);
  assert.match(main,/window\.addEventListener\('pointercancel',cancelPointerDrag\)/);
  assert.match(css,/\.board-piece\{[^}]*touch-action:none/);
  assert.match(css,/\.drag-layer\{[^}]*pointer-events:none/);
});

test('a dropped piece is not slid in again, and clicking a selected piece deselects it',()=>{
  // A drop re-renders with instant:true, which places the piece without a transition.
  assert.match(main,/const durationMs=instant\?0:moveAnimationMs\(\)/);
  assert.match(main,/if\(outcome==='move'\)\{\n\s*selected=drag\.from;void clickSquare\(to,game\.get\(to\),\{instant:true\}\)/);
  // A promotion drop waits for the piece choice: the pawn is revealed on its square meanwhile.
  assert.match(main,/if\(boardDom\?\.pieces\.element\(drag\.from\)\?\.classList\.contains\('drag-origin'\)\)renderBoard\(\);/);
  assert.match(main,/if\(sq===selected\)\{selected=null;render\(\);return\}/);
  assert.match(main,/instantMoveAnimation=instant;\n  try\{makeMove\(/);
});

test('a cancelled drag restores the selection it started from, premoves included',()=>{
  assert.match(main,/if\(!drag\.wasSelected\)\{if\(drag\.kind==='premove'\)premoves\.cancel\(\);else selected=null\}/);
  assert.match(main,/finishPointerDrag\(null,\{cancelled:true\}\)/);
});
