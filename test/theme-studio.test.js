import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const main=await readFile(new URL('../src/main.js',import.meta.url),'utf8');
const css=await readFile(new URL('../src/style.css',import.meta.url),'utf8');

test('Theme Studio glass opacity controls the visible panel and header gradients',()=>{
  assert.match(main,/Glass opacity <input data-theme="--glass" type="range" min="35" max="100"/);
  assert.match(main,/savedTheme\['--glass'\]=String\(clamp\(savedTheme\['--glass'\],\.35,1,\.94\)\)/);
  assert.match(main,/input\.dataset\.theme==='--glass'\?String\(clamp\(Number\(input\.value\)\/100,\.35,1,\.94\)\)/);
  const liveGlass=css.slice(css.lastIndexOf('/* Theme Studio: live glass opacity'));
  assert.match(liveGlass,/\.panel,\.game,\.topbar\{/);
  assert.match(liveGlass,/rgb\(8 19 21 \/ var\(--glass\)\)/);
  assert.match(liveGlass,/rgb\(5 15 17 \/ calc\(var\(--glass\) - \.04\)\)/);
  assert.match(liveGlass,/!important/);
});

test('Theme Studio motion maps 0-100 to 0-400ms and animates rendered moves',()=>{
  assert.match(css,/:root\{--glass:\.94;--motion:400ms\}/);
  assert.match(main,/motionCssValue=value=>\`\$\{Math\.round\(clamp\(value,0,100,100\)\*4\)\}ms\`/);
  assert.match(main,/function motionDurationMs\(\)/);
  assert.match(main,/Math\.max\(0,Math\.min\(400,milliseconds\)\)/);
  assert.match(main,/window\.matchMedia\?\.\('\(prefers-reduced-motion: reduce\)'\)/);
  // Move slides (150-250ms by distance) are scaled by the slider; reduced motion turns them off.
  assert.match(main,/motionScaleCache\?\?=motionDurationMs\(\)\/400;/);
  assert.match(main,/if\(input\.dataset\.theme==='--motion'\)motionScaleCache=null;/);
  assert.match(main,/render\(\{hint:made,instant:instantMoveAnimation\}\)/);
  assert.match(main,/syncRoomUi\(\);render\(\{hint:lastServerMove,instant:!animateMove\}\);afterBoardPaint\(updateMoves\)/);
  assert.match(main,/function motionScale\(\)\{\n\s*if\(prefersReducedMotion\(\)\)return 0;/);
});

test('Theme Studio Done button uses the gold primary treatment',()=>{
  assert.match(main,/<button id="closeTheme" class="gold theme-done">Done<\/button>/);
  const done=css.slice(css.lastIndexOf('#closeTheme.gold'));
  assert.match(done,/background:linear-gradient\(#efd59d,#d5ad64\)!important/);
  assert.match(done,/color:#10120e!important/);
  assert.doesNotMatch(done,/--white-piece|--black-piece|--piece-tint/);
});
