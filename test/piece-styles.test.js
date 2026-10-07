import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DEFAULT_PIECE_STYLE, PIECE_SET_VERSION, PIECE_STYLES, migratePieceStyle, normalizePieceStyle, pieceAssetFor } from '../src/piece-styles.js';
import { splitPieceSheet } from '../scripts/split-piece-svg.mjs';

const css=await readFile(new URL('../src/style.css',import.meta.url),'utf8');
const v2=css.slice(css.indexOf('/* Vanta pieces v2 (default).'));

test('menu order: Vanta 3D (default), Vanta 2D, Vanta Classic 3D/2D, Staunton 3D/2D',()=>{
  assert.deepEqual(PIECE_STYLES.map(([value])=>value),['vanta-3d','vanta-2d','vanta-classic-3d','vanta-classic-2d','staunton-3d','staunton-2d']);
  assert.equal(DEFAULT_PIECE_STYLE,'vanta-3d');
  assert.equal(normalizePieceStyle('nonsense'),'vanta-3d');
  assert.equal(normalizePieceStyle(undefined),'vanta-3d');
  assert.equal(normalizePieceStyle('vanta-classic-2d'),'vanta-classic-2d');
});

test('saved choices move to the v2 sets once, then every choice is kept',()=>{
  for(const [saved,expected] of [['vanta-3d','vanta-3d'],['vanta-2d','vanta-2d'],['3d','vanta-3d'],['2d','vanta-2d'],['staunton-2d','staunton-2d'],[undefined,'vanta-3d']]){
    const theme={pieceStyle:saved};
    assert.equal(migratePieceStyle(theme),expected,String(saved));
    assert.equal(theme.pieceSetVersion,PIECE_SET_VERSION);
  }
  // After the migration ran, a Classic choice is respected forever.
  const theme={pieceStyle:'vanta-classic-3d',pieceSetVersion:PIECE_SET_VERSION};
  assert.equal(migratePieceStyle(theme),'vanta-classic-3d');
});

test('portraits use the v2 2D vectors; other styles keep their single-piece images',()=>{
  assert.equal(pieceAssetFor('vanta-2d','bn'),'/assets/vch/pieces/vanta-2d/bn.svg');
  assert.equal(pieceAssetFor('vanta-3d','bn'),'/assets/vch/pieces/3d/bn.webp');
  assert.equal(pieceAssetFor('staunton-2d','bn'),'/assets/vch/pieces/2d/bn.webp');
});

test('Vanta 3D reads the 6x2 sheet: 600% 200%, x = col*20%, y = row*100%',()=>{
  assert.match(v2,/:root\[data-piece-style="vanta-3d"\] \.piece\{\s*--piece-image:url\('\/assets\/vch\/pieces\/vanta-3d\.png'\);\s*background-size:600% 200%;\s*background-position:var\(--piece-x\) var\(--piece-y\);/);
  ['k','q','r','b','n','p'].forEach((type,col)=>assert.ok(v2.includes(`:root[data-piece-style="vanta-3d"] .piece-${type}{--piece-x:${col*20}%}`),type));
  assert.ok(v2.includes(':root[data-piece-style="vanta-3d"] .piece.w{--piece-y:0%}'));
  assert.ok(v2.includes(':root[data-piece-style="vanta-3d"] .piece.b{--piece-y:100%}'));
});

test('Vanta 2D uses one SVG per piece, contained',()=>{
  assert.ok(v2.includes(':root[data-piece-style="vanta-2d"] .piece{background-size:contain;background-position:center}'));
  for(const color of 'wb')for(const type of 'kqrbnp')
    assert.ok(v2.includes(`:root[data-piece-style="vanta-2d"] .piece.${color}.piece-${type}{--piece-image:url('/assets/vch/pieces/vanta-2d/${color}${type}.svg')}`));
});

test('v2 sets have no filters, offsets, blend or tint layers; only 3D keeps the contact shadow',()=>{
  assert.match(v2,/:root\[data-piece-style="vanta-3d"\] \.piece,\n:root\[data-piece-style="vanta-2d"\] \.piece\{\s*filter:none;translate:none;mix-blend-mode:normal;/);
  assert.ok(v2.includes(':root[data-piece-style="vanta-3d"] .piece::after,\n:root[data-piece-style="vanta-2d"] .piece::after{display:none}'));
  assert.ok(v2.includes(':root[data-piece-style="vanta-2d"] .board .square:has(.piece)::before{display:none}'));
  assert.doesNotMatch(v2,/data-piece-style="vanta-3d"\] \.board \.square:has\(\.piece\)::before\{display:none/);
  assert.match(v2,/:root\[data-piece-style="vanta-3d"\] \.drag-float,\n:root\[data-piece-style="vanta-2d"\] \.drag-float\{filter:none\}/);
  // Only the Classic and Staunton sets carry the measured per-piece offsets.
  assert.doesNotMatch(css,/data-piece-style="vanta-[23]d"\] \.board \.piece\.[wb]\.piece-[kqrbnp]\{translate/);
  assert.match(css,/:root\{--white-piece:#f0d9a4;--black-piece:#342019;--piece-tint:0\}/);
});

const sheet=`<svg xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g"><stop offset="0" stop-color="#fff"/></linearGradient></defs>${['wk','wq','wr','wb','wn','wp','bk','bq','br','bb','bn','bp'].map(id=>`<symbol id="${id}" viewBox="0 0 100 100"><path d="M10 90h80" fill="url(#g)"/></symbol>`).join('')}</svg>`;
test('the 2D sheet splits into 12 standalone vector files with the shared defs',()=>{
  const files=splitPieceSheet(sheet);
  assert.equal(Object.keys(files).length,12);
  assert.equal(files.bp,'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g"><stop offset="0" stop-color="#fff"/></linearGradient></defs><path d="M10 90h80" fill="url(#g)"/></svg>\n');
});

test('the splitter refuses sheets with scripts, handlers, external references or missing pieces',()=>{
  assert.throws(()=>splitPieceSheet(sheet.replace('</svg>','<script>alert(1)</script></svg>')),/scripts/);
  assert.throws(()=>splitPieceSheet(sheet.replace('<path ','<path onload="x()" ')),/scripts/);
  assert.throws(()=>splitPieceSheet(sheet.replace('<path ','<image href="https://example.com/a.png"/><path ')),/external/);
  assert.throws(()=>splitPieceSheet(sheet.replace(/<symbol id="bp"[\s\S]*?<\/symbol>/,'')),/missing symbols: bp/);
});
