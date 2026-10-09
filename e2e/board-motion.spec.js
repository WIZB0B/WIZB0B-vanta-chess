import { test, expect } from '@playwright/test';
import { center, clickAt, mockBackend, nextFrame, openingAfterE4D5, piece, recordQueenMove, releaseBotMove, startComputerGame, useScriptedEngine } from './board-helpers.js';

const desktopOnly=()=>test.skip(test.info().project.name==='mobile','mouse input is covered on desktop');

// Backlog V1-fix: the queen used to vanish under the squares in flight. Every animation frame
// of Qd1-h5 is sampled in the page. (Frame timing is asserted in e2e/board-timing.spec.js,
// which runs on its own so other tests' load can't drop frames from the measurement.)
test('a queen move across the board stays on top and visible in every frame and moves monotonically',async({page})=>{
  await openingAfterE4D5(page);
  const {frames,progress,log,h5}=await recordQueenMove(page);
  expect(await page.evaluate(()=>window.__queen===document.querySelector('.board-piece[data-square="h5"]')),'the same element flew from d1 to h5').toBe(true);
  for(const f of frames){
    expect(f.connected).toBe(true);
    expect(f.visibility).toBe('visible');
    expect(f.opacity).toBe(1);
    expect(f.onTop,`queen hidden at ${f.x.toFixed(1)},${f.y.toFixed(1)}`).toBe(true);
  }
  for(let i=1;i<frames.length;i++){
    expect(frames[i].x).toBeGreaterThanOrEqual(frames[i-1].x-.5);
    expect(frames[i].y).toBeLessThanOrEqual(frames[i-1].y+.5);
  }
  expect(frames.filter(f=>progress(f)>.005&&progress(f)<.995).length,log).toBeGreaterThanOrEqual(4);
  const last=frames.at(-1);
  expect(Math.abs(last.x-h5.x)).toBeLessThan(1);expect(Math.abs(last.y-h5.y)).toBeLessThan(1);
  await expect(page.locator('#moves')).toContainText('Qh5');
});

test('the move is a Web Animations API transform animation with CSS ease, longer for longer moves',async({page})=>{
  await openingAfterE4D5(page);
  // Sample the piece that is moving to `square`: the bot's d7-d5 pawn may still be finishing
  // its own slide when the queen is clicked.
  const sample=square=>page.evaluate(square=>{
    const q=document.querySelector(`.board-piece.moving[data-square="${square}"]`);if(!q)return null;
    const animations=q.getAnimations().map(a=>({timing:a.effect.getTiming(),props:[...new Set(a.effect.getKeyframes().flatMap(k=>Object.keys(k).filter(p=>!['offset','easing','composite','computedOffset'].includes(p))))]}));
    return {animations,transition:getComputedStyle(q).transitionDuration,artFilter:getComputedStyle(q.firstElementChild).filter};
  },square);
  await clickAt(page,'d1');
  await clickAt(page,'h5');
  const long=await sample('h5');
  expect(long.animations).toHaveLength(1);
  expect(long.animations[0].props).toEqual(['transform']);
  expect(long.animations[0].timing.easing).toBe('ease');
  expect(long.animations[0].timing.duration).toBeGreaterThan(180);expect(long.animations[0].timing.duration).toBeLessThanOrEqual(250);
  expect(long.transition).toBe('0s');
  expect(long.artFilter).toBe('none');
  await releaseBotMove(page,'a7a6',2);
  await expect(piece(page,'a6')).toHaveCount(1);
  await clickAt(page,'a2');await clickAt(page,'a3');
  const short=await sample('a3');
  expect(short.animations[0].timing.duration).toBe(150);
});

// Drag: the piece follows the pointer every animation frame with no transition.
test('a dragged piece is repositioned on every animation frame, exactly under the pointer',async({page})=>{
  desktopOnly();
  await mockBackend(page);await startComputerGame(page);
  const g1=await center(page,'g1'),f3=await center(page,'f3');
  await page.mouse.move(g1.x,g1.y);await page.mouse.down();
  await page.mouse.move(g1.x+8,g1.y-8);
  await expect(page.locator('.drag-layer .drag-float')).toHaveCount(1);
  await page.evaluate(()=>{
    window.__pointer=null;window.__dragFrames=[];window.__recording=true;
    addEventListener('pointermove',e=>{window.__pointer={x:e.clientX,y:e.clientY}},{capture:true});
    const sample=()=>{
      const float=document.querySelector('.drag-layer .drag-float');
      if(float&&window.__pointer){const r=float.getBoundingClientRect();window.__dragFrames.push({x:r.left+r.width/2,y:r.top+r.height/2,px:window.__pointer.x,py:window.__pointer.y,transition:getComputedStyle(float).transitionDuration})}
      if(window.__recording)requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  const steps=16;
  for(let i=1;i<=steps;i++){
    await page.mouse.move(g1.x+(f3.x-g1.x)*i/steps,g1.y+(f3.y-g1.y)*i/steps);
    await nextFrame(page);
  }
  const frames=await page.evaluate(()=>{window.__recording=false;return window.__dragFrames});
  expect(frames.length).toBeGreaterThanOrEqual(steps);
  for(const f of frames){
    expect(Math.abs(f.x-f.px),'float lags the pointer horizontally').toBeLessThan(1);
    expect(Math.abs(f.y-f.py),'float lags the pointer vertically').toBeLessThan(1);
    expect(f.transition).toBe('0s');
  }
  const distinct=new Set(frames.map(f=>`${f.x.toFixed(1)},${f.y.toFixed(1)}`));
  expect(distinct.size,'a new position for every pointer step').toBeGreaterThanOrEqual(steps);
  await expect(page.locator('[data-sq="f3"]')).toHaveClass(/drag-over/);
  expect(await page.evaluate(()=>getComputedStyle(document.body).cursor)).toBe('grabbing');
  // The origin square shows only its highlight (no piece left behind), and the dragged piece
  // is drawn fully opaque and crisp: no scale, opacity, blur, shadow or filter.
  const look=await page.evaluate(({x,y})=>{
    const hit=document.elementFromPoint(x,y),float=document.querySelector('.drag-layer .drag-float'),art=float.firstElementChild;
    const fs=getComputedStyle(float),as=getComputedStyle(art),shadow=getComputedStyle(float,'::before');
    return {hitSquare:hit?.dataset?.sq||null,hitClass:hit?.className||'',opacity:[fs.opacity,as.opacity],filter:[fs.filter,as.filter],transform:as.transform,shadow:shadow.display};
  },g1);
  expect(look.hitSquare).toBe('g1');
  expect(look.hitClass).toMatch(/selected/);
  expect(look.opacity).toEqual(['1','1']);
  expect(look.filter).toEqual(['none','none']);
  expect(look.transform).toBe('none');
  expect(look.shadow).toBe('none');
  await page.mouse.up();
  await expect(piece(page,'f3').locator('.piece.w.piece-n')).toBeVisible();
  expect(await page.evaluate(()=>getComputedStyle(document.body).cursor)).not.toBe('grabbing');
});

test('cursor is grab over your pieces and grabbing from the press; the dragged piece stays inside the board and a drop outside cancels',async({page})=>{
  desktopOnly();
  await mockBackend(page);await startComputerGame(page);
  const e2=await center(page,'e2');
  await page.mouse.move(e2.x,e2.y);
  expect(await piece(page,'e2').evaluate(el=>getComputedStyle(el).cursor)).toBe('grab');
  expect(await piece(page,'e7').evaluate(el=>getComputedStyle(el).cursor)).not.toBe('grab');
  await page.mouse.down();
  expect(await page.evaluate(()=>getComputedStyle(document.body).cursor),'grabbing from the press, before any movement').toBe('grabbing');
  // Drag far past the right edge: the piece slides along the edge instead of leaving the board.
  const board=await page.evaluate(()=>{const b=document.querySelector('#board'),r=b.getBoundingClientRect();return {left:r.left+b.clientLeft,top:r.top+b.clientTop,width:b.clientWidth,height:b.clientHeight}});
  await page.mouse.move(e2.x+40,e2.y,{steps:2});
  await page.mouse.move(board.left+board.width+150,e2.y-60,{steps:6});
  const fb=await page.locator('.drag-layer .drag-float').boundingBox();
  expect(Math.abs(fb.x+fb.width-(board.left+board.width))).toBeLessThanOrEqual(1);
  expect(Math.abs(fb.y+fb.height/2-(e2.y-60))).toBeLessThanOrEqual(1);
  await expect(page.locator('#board .square.drag-over')).toHaveCount(0);
  // Releasing outside the board cancels: the pawn is home, nothing played, nothing selected.
  await page.mouse.up();
  await expect(page.locator('.drag-float')).toHaveCount(0);
  await expect(piece(page,'e2').locator('.piece.w.piece-p')).toBeVisible();
  await expect(piece(page,'e2')).not.toHaveClass(/drag-origin/);
  await expect(page.locator('[data-sq="e2"]')).not.toHaveClass(/selected/);
  await expect(page.locator('#moves .move-pair-row')).toHaveCount(0);
});

test('legal-move hints are soft dark dots and rings; marks fill the square; arrows are bold',async({page})=>{
  desktopOnly();
  await openingAfterE4D5(page);
  await clickAt(page,'e4');
  const hint=sq=>page.locator(`[data-sq="${sq}"]`).evaluate(el=>{const a=getComputedStyle(el,'::after'),r=el.getBoundingClientRect();return {bg:a.backgroundColor,image:a.backgroundImage,width:parseFloat(a.width)/r.width,radius:a.borderRadius}});
  const dot=await hint('e5');
  expect(dot.bg).toBe('rgba(0, 0, 0, 0.16)');
  expect(dot.width).toBeGreaterThan(.2);expect(dot.width).toBeLessThan(.36);
  const ring=await hint('d5');
  expect(ring.image).toMatch(/radial-gradient\(circle closest-side, rgba\(0, 0, 0, 0\) 81%, rgba\(0, 0, 0, 0\.16\) 82%/);
  expect(ring.width).toBeCloseTo(1,2);
  // A red mark covers the whole square: same box as its neighbours, square corners.
  const a=await center(page,'h3');
  await page.mouse.move(a.x,a.y);await page.mouse.down({button:'right'});await page.mouse.up({button:'right'});
  const mark=await page.locator('[data-sq="h3"]').evaluate(el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect(),n=el.previousElementSibling.getBoundingClientRect();return {radius:s.borderRadius,shadow:s.boxShadow,w:r.width,h:r.height,nw:n.width,nh:n.height}});
  expect(mark.radius).toBe('0px');
  expect(mark.shadow).toMatch(/rgba\(235, 97, 80, 0\.8\) 0px 0px 0px 999px inset/);
  expect(Math.abs(mark.w-mark.nw)).toBeLessThan(.5);expect(Math.abs(mark.h-mark.nh)).toBeLessThan(.5);
  // Arrows: ~22% of a square thick, .85 opacity.
  const b=await center(page,'b1'),c=await center(page,'c3');
  await page.mouse.move(b.x,b.y);await page.mouse.down({button:'right'});await page.mouse.move(c.x,c.y,{steps:3});await page.mouse.up({button:'right'});
  const arrow=await page.locator('.arrow-layer .arrow').first().evaluate(g=>({opacity:getComputedStyle(g).opacity,stroke:getComputedStyle(g.querySelector('polyline')).strokeWidth}));
  expect(arrow.opacity).toBe('0.85');
  expect(parseFloat(arrow.stroke)).toBeCloseTo(.22,3);
});

// Backlog V1-fix, bug 4: a premove was lost when the opponent replied while it was being made.
test('a queued premove plays as soon as the bot replies',async({page})=>{
  await mockBackend(page);await useScriptedEngine(page);await startComputerGame(page);
  await clickAt(page,'e2');await clickAt(page,'e4');
  await clickAt(page,'d1');await clickAt(page,'h5');
  await expect(page.locator('[data-sq="h5"]')).toHaveClass(/premove/);
  await releaseBotMove(page,'d7d5',1);
  await expect(piece(page,'h5').locator('.piece.w.piece-q')).toBeVisible();
  await expect(page.locator('#moves')).toContainText('Qh5');
});

test('a premove drag in the air when the bot replies is played on drop',async({page})=>{
  desktopOnly();
  await mockBackend(page);await useScriptedEngine(page);await startComputerGame(page);
  await clickAt(page,'e2');await clickAt(page,'e4');
  const d1=await center(page,'d1');
  await page.mouse.move(d1.x,d1.y);await page.mouse.down();await page.mouse.move(d1.x+12,d1.y-12,{steps:2});
  await expect(page.locator('[data-sq="d1"]')).toHaveClass(/premove-selecting/);
  await releaseBotMove(page,'d7d5',1);
  await expect(piece(page,'d5')).toHaveCount(1);
  const h5=await center(page,'h5');
  await page.mouse.move(h5.x,h5.y,{steps:4});await page.mouse.up();
  await expect(piece(page,'h5').locator('.piece.w.piece-q')).toBeVisible();
  await expect(page.locator('#moves')).toContainText('Qh5');
  await expect.poll(()=>page.evaluate(()=>window.__botRequests)).toBe(2);
});

test('a piece picked for a premove stays selected when the bot replies, so the next click plays',async({page})=>{
  await mockBackend(page);await useScriptedEngine(page);await startComputerGame(page);
  await clickAt(page,'e2');await clickAt(page,'e4');
  await clickAt(page,'d1');
  await expect(page.locator('[data-sq="d1"]')).toHaveClass(/premove-selecting/);
  await releaseBotMove(page,'d7d5',1);
  await expect(page.locator('[data-sq="d1"]')).toHaveClass(/selected/);
  await clickAt(page,'h5');
  await expect(piece(page,'h5').locator('.piece.w.piece-q')).toBeVisible();
  await expect(page.locator('#moves')).toContainText('Qh5');
});

// Backlog V1b: arrows and square marks.
async function rightDrag(page,from,to){
  const a=await center(page,from),b=await center(page,to);
  await page.mouse.move(a.x,a.y);await page.mouse.down({button:'right'});
  await page.mouse.move(b.x,b.y,{steps:4});await page.mouse.up({button:'right'});
}
test('right-drag draws arrows (L-shaped for knights), right-click toggles red squares, modifiers recolour, left-click and moves clear',async({page})=>{
  desktopOnly();
  await mockBackend(page);await useScriptedEngine(page);await startComputerGame(page);
  const arrows=page.locator('.arrow-layer .arrow');

  await rightDrag(page,'e2','e4');
  await expect(page.locator('.arrow-layer .arrow.arrow-orange[data-from="e2"][data-to="e4"]')).toHaveCount(1);
  await rightDrag(page,'g1','f3');
  const knight=page.locator('.arrow-layer .arrow[data-from="g1"][data-to="f3"]');
  await expect(knight).toHaveAttribute('data-knight','true');
  expect((await knight.locator('polyline').getAttribute('points')).trim().split(/\s+/)).toHaveLength(3);
  // Drawing the same arrow again removes it.
  await rightDrag(page,'e2','e4');
  await expect(arrows).toHaveCount(1);

  await rightDrag(page,'e5','e5');
  await expect(page.locator('[data-sq="e5"]')).toHaveClass(/mark-red/);
  await rightDrag(page,'e5','e5');
  await expect(page.locator('[data-sq="e5"]')).not.toHaveClass(/mark/);

  await page.keyboard.down('Shift');await rightDrag(page,'d2','d4');await page.keyboard.up('Shift');
  await expect(page.locator('.arrow-layer .arrow.arrow-green[data-from="d2"][data-to="d4"]')).toHaveCount(1);
  await page.keyboard.down('Control');await rightDrag(page,'c7','c7');await page.keyboard.up('Control');
  await expect(page.locator('[data-sq="c7"]')).toHaveClass(/mark-blue/);
  await page.keyboard.down('Alt');await rightDrag(page,'b1','c3');await page.keyboard.up('Alt');
  await expect(page.locator('.arrow-layer .arrow.arrow-yellow')).toHaveCount(1);
  // No context menu over the board.
  expect(await page.evaluate(()=>{const e=new MouseEvent('contextmenu',{bubbles:true,cancelable:true});document.querySelector('#board .square').dispatchEvent(e);return e.defaultPrevented})).toBe(true);

  // A left-click clears everything.
  await clickAt(page,'h4');
  await expect(arrows).toHaveCount(0);
  await expect(page.locator('#board .square.shape-mark')).toHaveCount(0);

  // A move clears them too.
  await rightDrag(page,'a2','a4');await rightDrag(page,'h6','h6');
  await expect(arrows).toHaveCount(1);
  await expect(page.locator('#board .square.shape-mark')).toHaveCount(1);
  const e2=await center(page,'e2'),e4=await center(page,'e4');
  await page.mouse.move(e2.x,e2.y);await page.mouse.down();await page.mouse.move(e4.x,e4.y,{steps:4});await page.mouse.up();
  await expect(piece(page,'e4')).toHaveCount(1);
  await expect(arrows).toHaveCount(0);
  await expect(page.locator('#board .square.shape-mark')).toHaveCount(0);
});

// Review on PR #6: a pawn dropped on the last rank stayed hidden while the piece choice was open.
test('a pawn dragged onto the last rank stays visible while the promotion choice is open',async({page})=>{
  desktopOnly();
  await mockBackend(page);await useScriptedEngine(page);await startComputerGame(page);
  const play=async(from,to)=>{await clickAt(page,from);await clickAt(page,to);await expect(piece(page,to)).toHaveCount(1)};
  let reply=0;const bot=async uci=>{await releaseBotMove(page,uci,++reply);await expect(piece(page,uci.slice(2,4))).toHaveCount(1)};
  await play('h2','h4');await bot('g7g5');
  await play('h4','g5');await bot('a7a6');
  await play('g5','g6');await bot('a6a5');
  await play('g6','h7');await bot('a5a4');
  const h7=await center(page,'h7'),g8=await center(page,'g8');
  await page.mouse.move(h7.x,h7.y);await page.mouse.down();
  await page.mouse.move(g8.x,g8.y,{steps:4});await page.mouse.up();
  await expect(page.locator('#promotion')).toBeVisible();
  await expect(page.locator('.drag-float')).toHaveCount(0);
  await expect(piece(page,'h7')).not.toHaveClass(/drag-origin/);
  await expect(piece(page,'h7').locator('.piece.w.piece-p')).toBeVisible();
  // A real backdrop click (pressed and released outside the dialog) still cancels.
  await page.mouse.click(4,4);
  await expect(page.locator('#promotion')).toBeHidden();
  await expect(piece(page,'h7').locator('.piece.w.piece-p')).toBeVisible();
  await expect(piece(page,'g8').locator('.piece.b.piece-n')).toBeVisible();
  await page.mouse.move(h7.x,h7.y);await page.mouse.down();
  await page.mouse.move(g8.x,g8.y,{steps:4});await page.mouse.up();
  await expect(page.locator('#promotion')).toBeVisible();
  await page.locator('#promotion button[data-piece="q"]').click();
  await expect(piece(page,'g8').locator('.piece.w.piece-q')).toBeVisible();
  await expect(page.locator('#moves')).toContainText('hxg8=Q');
});
