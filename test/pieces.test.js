import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const css=await readFile(new URL('../src/style.css',import.meta.url),'utf8');
const main=await readFile(new URL('../src/main.js',import.meta.url),'utf8');
const task5=css.slice(css.indexOf('/* Backlog task 5: pieces rest on their squares.'));
const layers=css.slice(css.indexOf('/* Board layers (backlog V1-fix + V1b)'));

test('board pieces have no filter halo; depth comes from a contact shadow that travels with the piece',()=>{
  assert.ok(layers.length>0,'board layers block exists');
  assert.match(layers,/\.board-piece \.piece\{display:block;filter:none;pointer-events:none\}/);
  const shadow=layers.match(/\.board-piece::before\{([^}]*)\}/)?.[1]||'';
  assert.match(shadow,/left:20%;width:60%;/,'about 60% of the square wide, centred');
  assert.match(shadow,/top:calc\(var\(--piece-baseline\) - 6%\);height:12%;/,'12% tall, centred on the baseline');
  assert.match(shadow,/radial-gradient\(ellipse at center,rgba\(0,0,0,\.35\)/,'opacity about .35');
  assert.match(shadow,/filter:blur\(1\.5px\)/,'slightly blurred');
  // The shadow belongs to the piece element, not to a square, so it can't arrive before it.
  assert.doesNotMatch(css,/\.square:has\(\.piece/);
});

test('a dragged piece is drawn crisp and opaque like a board piece; nothing lifts or transitions',()=>{
  assert.match(layers,/\.drag-layer \.board-piece\{transition:none;pointer-events:none;opacity:1\}/);
  assert.match(layers,/\.drag-layer \.board-piece::before\{display:none\}/,'no blurred shadow under the dragged piece');
  assert.doesNotMatch(layers,/\.drag-layer[^{]*\{[^}]*(scale|blur|filter:[^n])/,'no scale, blur or filter on the dragged piece');
  assert.doesNotMatch(css,/\.piece\.dragging|\.drag-float\{|\.piece-ghost|:hover \.piece|piece-arriving/,'old duplicate drag/ghost/hover rules are gone');
  assert.doesNotMatch(css,/\.piece\{[^}]*transition/,'the artwork never transitions; the .board-piece transform does');
  assert.doesNotMatch(main,/piece-arriving|piece-ghost|animateRenderedPiece|fadeCapturedPiece/);
});

test('every piece in every style is centred on one shared baseline',()=>{
  const rules=[...task5.matchAll(/:root\[data-piece-style="([a-z0-9-]+)"\] \.board-piece \.piece\.([wb])\.piece-([kqrbnp])\{translate:(-?[\d.]+)% (-?[\d.]+)%\}/g)];
  assert.equal(rules.length,12,'Heritage: 2 colours x 6 pieces (the other sets are seated in their artwork)');
  assert.ok(rules.every(([,style])=>style==='heritage'));
  for(const [,style,color,type,dx,dy] of rules){
    assert.ok(Math.abs(Number(dx))<=15,`${style} ${color}${type} horizontal offset stays small`);
    assert.ok(Number(dy)<=0&&Number(dy)>=-8,`${style} ${color}${type} is raised onto the 90% baseline`);
  }
  assert.match(layers,/\.board-piece\{\s*--piece-baseline:90%;/);
});

test('the Ink sets stay flat: no contact shadow',()=>{
  assert.match(layers,/:root\[data-piece-style\$="-ink"\] \.board-piece::before\{display:none\}/);
});

test('board geometry is untouched',()=>{
  assert.doesNotMatch(task5.slice(0,task5.indexOf('/* Board layers')),/aspect-ratio|grid-template-columns/);
  assert.match(css,/\.board\{width:100%;aspect-ratio:1;display:grid;grid-template-columns:repeat\(8,1fr\)/);
});
