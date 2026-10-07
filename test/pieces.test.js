import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const css=await readFile(new URL('../src/style.css',import.meta.url),'utf8');
const main=await readFile(new URL('../src/main.js',import.meta.url),'utf8');
const task5=css.slice(css.indexOf('/* Backlog task 5: pieces rest on their squares.'));

test('board pieces have no filter halo; depth comes from a contact shadow',()=>{
  assert.ok(task5.length>0,'task 5 piece block exists');
  assert.match(task5,/:root\[data-piece-style\] \.board \.piece\{\s*filter:none;/);
  const shadow=task5.match(/\.board \.square:has\(\.piece\)::before\{([^}]*)\}/)?.[1]||'';
  assert.match(shadow,/left:20%;width:60%;/,'about 60% of the square wide, centred');
  assert.match(shadow,/top:calc\(var\(--piece-baseline\) - 6%\);height:12%;/,'12% tall, centred on the baseline');
  assert.match(shadow,/radial-gradient\(ellipse at center,rgba\(0,0,0,\.35\)/,'opacity about .35');
  assert.match(shadow,/filter:blur\(1\.5px\)/,'slightly blurred');
});

test('lifting a piece raises it and softens the shadow; motion settings are respected',()=>{
  assert.match(task5,/\.board \.piece\.dragging\{transform:translateY\(-6%\) scale\(1\.03\)\}/);
  assert.match(task5,/\.board \.square\.selected:has\(\.piece\)::before,\n\.board \.square:has\(\.piece\.dragging\)::before\{transform:scale\(\.8\);opacity:\.5;filter:blur\(3px\)\}/);
  assert.match(task5,/transition-duration:calc\(var\(--motion\) \* \.4\)/);
  assert.match(task5,/@media\(prefers-reduced-motion:reduce\)\{\s*\.board \.piece,\.board \.square::before\{transition-duration:0ms!important\}/);
  assert.match(main,/destination\.classList\.add\('piece-arriving'\)/,'shadow fades in as a sliding piece arrives');
});

test('every piece in every style is centred on one shared baseline',()=>{
  const rules=[...task5.matchAll(/:root\[data-piece-style="([a-z0-9-]+)"\] \.board \.piece\.([wb])\.piece-([kqrbnp])\{translate:(-?[\d.]+)% (-?[\d.]+)%\}/g)];
  assert.equal(rules.length,48,'4 styles x 2 colours x 6 pieces');
  for(const [,style,color,type,dx,dy] of rules){
    assert.ok(Math.abs(Number(dx))<=15,`${style} ${color}${type} horizontal offset stays small`);
    assert.ok(Number(dy)<=0&&Number(dy)>=-8,`${style} ${color}${type} is raised onto the 90% baseline`);
  }
  assert.match(task5,/\.board \.square\{--piece-baseline:90%\}/);
});

test('2D styles stay flat: no contact shadow and no lift',()=>{
  assert.match(task5,/:root\[data-piece-style="vanta-classic-2d"\] \.board \.square:has\(\.piece\)::before,\n:root\[data-piece-style="staunton-2d"\] \.board \.square:has\(\.piece\)::before\{display:none\}/);
  assert.match(task5,/:root\[data-piece-style\$="-2d"\] \.board \.square \.piece\.dragging\{transform:none\}/);
});

test('board geometry is untouched',()=>{
  assert.doesNotMatch(task5,/aspect-ratio|grid-template-columns/);
});
