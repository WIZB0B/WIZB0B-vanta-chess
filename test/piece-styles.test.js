import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { DEFAULT_PIECE_STYLE, PIECE_SET_VERSION, PIECE_STYLES, migratePieceStyle, normalizePieceStyle, pieceAssetFor, pieceStyleOptions } from '../src/piece-styles.js';
import { splitPieceSheet } from '../scripts/split-piece-svg.mjs';

const css=await readFile(new URL('../src/style.css',import.meta.url),'utf8');
const sets=css.slice(css.indexOf('/* Piece sets (src/piece-styles.js).'),css.indexOf('/* V1b: square marks'));
const IDS=['wk','wq','wr','wb','wn','wp','bk','bq','br','bb','bn','bp'];

test('menu: Vanta (default) and Vanta Ink; the slender sets are hidden; no 2D/3D in any label',()=>{
  assert.deepEqual(PIECE_STYLES,[['vanta','Vanta'],['vanta-ink','Vanta Ink']]);
  for(const hidden of ['monarch','monarch-ink','heritage'])assert.equal(normalizePieceStyle(hidden),'vanta',hidden);
  assert.doesNotMatch(pieceStyleOptions(),/[23]D/i);
  assert.equal(DEFAULT_PIECE_STYLE,'vanta');
  for(const retired of ['nonsense',undefined,'vanta-3d','vanta-2d','vanta-classic-3d','staunton-2d','3d'])assert.equal(normalizePieceStyle(retired),'vanta',String(retired));
  assert.equal(normalizePieceStyle('vanta-ink'),'vanta-ink');
});

test('saved choices move to Vanta once, then every choice is kept',()=>{
  for(const saved of ['vanta-3d','vanta-2d','vanta-classic-2d','staunton-3d','staunton-2d','3d',undefined]){
    const theme={pieceStyle:saved,pieceSetVersion:2};
    assert.equal(migratePieceStyle(theme),'vanta',String(saved));
    assert.equal(theme.pieceSetVersion,PIECE_SET_VERSION);
  }
  const theme={pieceStyle:'vanta-ink',pieceSetVersion:PIECE_SET_VERSION};
  assert.equal(migratePieceStyle(theme),'vanta-ink');
  assert.equal(migratePieceStyle({pieceStyle:'monarch',pieceSetVersion:PIECE_SET_VERSION}),'vanta','a hidden set falls back to Vanta');
});

test('portraits use one vector per piece; Heritage keeps its images',()=>{
  assert.equal(pieceAssetFor('vanta','bn'),'/assets/vch/pieces/vanta-2d/bn.svg');
  assert.equal(pieceAssetFor('vanta-ink','bn'),'/assets/vch/pieces/vanta-2d/bn.svg');
  assert.equal(pieceAssetFor('monarch','bn'),'/assets/vch/pieces/vanta-premium-2d/bn.svg');
  assert.equal(pieceAssetFor('monarch-ink','bn'),'/assets/vch/pieces/vanta-premium-2d/bn.svg');
  assert.equal(pieceAssetFor('heritage','bn'),'/assets/vch/pieces/3d/bn.webp');
});

test('Vanta and Monarch read their 6x2 sheets: 600% 200%, x = col*20%, y = row*100%',()=>{
  assert.match(sets,/:root\[data-piece-style="vanta"\] \.piece,\n:root\[data-piece-style="monarch"\] \.piece\{\s*background-size:600% 200%;\s*background-position:var\(--piece-x\) var\(--piece-y\);/);
  assert.ok(sets.includes(`:root[data-piece-style="vanta"] .piece{--piece-image:url('/assets/vch/pieces/vanta-3d.png')}`));
  assert.ok(sets.includes(`:root[data-piece-style="monarch"] .piece{--piece-image:url('/assets/vch/pieces/vanta-premium-3d.png')}`));
  // Browsers with image-set() get the 1x sheet on 1x screens and the 2x sheet on 2x/3x screens.
  for(const name of ['vanta-3d','vanta-premium-3d'])
    assert.ok(sets.includes(`image-set(url('/assets/vch/pieces/${name}-1x.png') 1x,url('/assets/vch/pieces/${name}.png') 2x)`),name);
  ['k','q','r','b','n','p'].forEach((type,col)=>assert.ok(sets.includes(`:root[data-piece-style="vanta"] .piece-${type},:root[data-piece-style="monarch"] .piece-${type}{--piece-x:${col*20}%}`),type));
  assert.ok(sets.includes(':root[data-piece-style="vanta"] .piece.w,:root[data-piece-style="monarch"] .piece.w{--piece-y:0%}'));
  assert.ok(sets.includes(':root[data-piece-style="vanta"] .piece.b,:root[data-piece-style="monarch"] .piece.b{--piece-y:100%}'));
});

test('the Ink sets use one SVG per piece, contained',()=>{
  assert.ok(sets.includes(':root[data-piece-style$="-ink"] .piece{background-size:contain;background-position:center}'));
  for(const [style,folder] of [['vanta-ink','vanta-2d'],['monarch-ink','vanta-premium-2d']])for(const id of IDS)
    assert.ok(sets.includes(`:root[data-piece-style="${style}"] .piece.${id[0]}.piece-${id[1]}{--piece-image:url('/assets/vch/pieces/${folder}/${id}.svg')}`),`${style} ${id}`);
});

test('the new sets have no filters, offsets, blend or tint layers; only Vanta and Monarch keep the contact shadow',()=>{
  assert.match(sets,/:root\[data-piece-style="monarch-ink"\] \.piece\{\s*filter:none;translate:none;mix-blend-mode:normal;/);
  assert.ok(sets.includes(':root[data-piece-style="monarch-ink"] .piece::after{display:none}'));
  assert.doesNotMatch(sets.replace(/\/\*[\s\S]*?\*\//g,''),/drop-shadow|blur\(|mix-blend-mode:(?!normal)|--piece-tint/);
  assert.ok(css.includes(':root[data-piece-style$="-ink"] .board-piece::before{display:none}'));
  assert.doesNotMatch(css,/data-piece-style="(vanta|monarch)[a-z-]*"\][^{]*\.board-piece::before/);
  assert.doesNotMatch(css,/data-piece-style="(vanta|monarch)[a-z-]*"\] \.board-piece \.piece\.[wb]\.piece-[kqrbnp]\{translate/);
  // The retired Vanta Classic sprite and the old style names are gone.
  assert.doesNotMatch(css,/2c49bffb|vanta-classic|staunton|data-piece-style\$?="[^"]*-[23]d"/);
});

test('the committed artwork is complete: 1x and 2x sheets per set and 12 standalone vectors per Ink set',async()=>{
  for(const [name,size] of [['vanta-3d.png',[1344,448]],['vanta-3d-1x.png',[672,224]],['vanta-premium-3d.png',[1344,448]],['vanta-premium-3d-1x.png',[672,224]]]){
    const png=await readFile(new URL(`../public/assets/vch/pieces/${name}`,import.meta.url));
    assert.equal(png.subarray(1,4).toString(),'PNG',name);
    assert.deepEqual([png.readUInt32BE(16),png.readUInt32BE(20)],size,name);
  }
  for(const folder of ['vanta-2d','vanta-premium-2d']){
    assert.deepEqual((await readdir(new URL(`../public/assets/vch/pieces/${folder}/`,import.meta.url))).sort(),IDS.map(id=>`${id}.svg`).sort());
    for(const id of IDS){
      const svg=await readFile(new URL(`../public/assets/vch/pieces/${folder}/${id}.svg`,import.meta.url),'utf8');
      assert.match(svg,/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="[^"]+">/,`${folder}/${id}`);
      assert.doesNotMatch(svg,/<script|<foreignObject|\son[a-z]+\s*=|<symbol/i,`${folder}/${id}`);
    }
  }
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

test('pieces stay inside their square: no set rises into the square behind it',async()=>{
  assert.doesNotMatch(css,/\.board-piece \.piece\{[^}]*height:1[0-9]{2}%/);
  assert.doesNotMatch(sets,/\.board\{overflow:visible\}/);
  assert.match(css,/\.board-piece\{[^}]*z-index:calc\(1 \+ var\(--row,0\)\);/);
  const layer=await readFile(new URL('../src/piece-layer.js',import.meta.url),'utf8');
  assert.match(layer,/el\.style\.setProperty\('--row',String\(coords\.row\)\)/);
});

test('Vanta Ink has the bold dark outline: a stroked silhouette under the artwork',async()=>{
  for(const folder of ['vanta-2d'])for(const id of IDS){
    const svg=await readFile(new URL(`../public/assets/vch/pieces/${folder}/${id}.svg`,import.meta.url),'utf8');
    assert.match(svg,/^<svg[^>]*><path fill="#16110d" stroke="#16110d" stroke-width="5\.6" stroke-linejoin="round" d="/,`${folder}/${id}`);
  }
});
