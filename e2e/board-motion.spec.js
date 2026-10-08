import { test, expect } from '@playwright/test';
import { center, clickAt, mockBackend, nextFrame, piece, releaseBotMove, startComputerGame, useScriptedEngine } from './board-helpers.js';

const desktopOnly=()=>test.skip(test.info().project.name==='mobile','mouse input is covered on desktop');

async function openingAfterE4D5(page){
  await mockBackend(page);await useScriptedEngine(page);await startComputerGame(page);
  await clickAt(page,'e2');await clickAt(page,'e4');
  await releaseBotMove(page,'d7d5',1);
  await expect(piece(page,'d5')).toHaveCount(1);
}

// Backlog V1-fix, bug 1 and 2: the queen used to vanish under the squares in flight and the
// main thread stalled at move time. Every animation frame of the move is sampled in the page.
test('a queen move across the board is on top in every frame, moves monotonically, and frames keep coming',async({page})=>{
  await openingAfterE4D5(page);
  await clickAt(page,'d1');
  await expect(page.locator('[data-sq="d1"]')).toHaveClass(/selected/);
  const d1=await center(page,'d1'),h5=await center(page,'h5');
  await page.evaluate(()=>{
    const queen=document.querySelector('.board-piece[data-square="d1"]');
    window.__queen=queen;window.__frames=[];
    const sample=time=>{
      const r=queen.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,hit=document.elementFromPoint(x,y);
      window.__frames.push({time,x,y,onTop:!!hit&&queen.contains(hit),square:queen.dataset.square,connected:queen.isConnected,visibility:getComputedStyle(queen).visibility,opacity:Number(getComputedStyle(queen).opacity)});
      if(window.__frames.length<56)requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await clickAt(page,'h5');
  await page.waitForFunction(()=>window.__frames.length>=56,null,{timeout:5000});
  const frames=await page.evaluate(()=>window.__frames);
  const moving=frames.filter(f=>f.square==='h5');
  expect(moving.length).toBeGreaterThan(20);

  // The same element flew from d1 to h5 (it was not re-created on the target square).
  expect(await page.evaluate(()=>window.__queen===document.querySelector('.board-piece[data-square="h5"]'))).toBe(true);
  for(const f of frames){
    expect(f.connected).toBe(true);
    expect(f.visibility).toBe('visible');
    expect(f.opacity).toBe(1);
    expect(f.onTop,`queen hidden at ${f.x.toFixed(1)},${f.y.toFixed(1)}`).toBe(true);
  }
  // Monotonic: right and up, never backwards, from d1 to h5.
  for(let i=1;i<frames.length;i++){
    expect(frames[i].x).toBeGreaterThanOrEqual(frames[i-1].x-.5);
    expect(frames[i].y).toBeLessThanOrEqual(frames[i-1].y+.5);
  }
  const inFlight=moving.filter(f=>Math.abs(f.x-d1.x)>2&&Math.abs(f.x-h5.x)>2);
  expect(inFlight.length,'the move is animated, not a jump').toBeGreaterThanOrEqual(2);
  const last=frames.at(-1);
  expect(Math.abs(last.x-h5.x)).toBeLessThan(2);expect(Math.abs(last.y-h5.y)).toBeLessThan(2);
  // The slide is short (~120ms): settled within ~250ms of the first moving frame.
  const settled=moving.find(f=>Math.abs(f.x-h5.x)<1&&Math.abs(f.y-h5.y)<1);
  expect(settled.time-moving[0].time).toBeLessThan(250);
  // Frames keep coming around the move: no long main-thread stall.
  const gaps=frames.slice(1).map((f,i)=>f.time-frames[i].time);
  expect(Math.max(...gaps),`frame gaps ${gaps.map(g=>g.toFixed(0)).join(',')}`).toBeLessThan(40);
  // The user's recording saw ~11 frames in 650ms around a move; at 60Hz there are ~39.
  const firstMoving=moving[0].time;
  expect(frames.filter(f=>f.time>=firstMoving-100&&f.time<=firstMoving+550).length).toBeGreaterThanOrEqual(30);
  await expect(page.locator('#moves')).toContainText('Qh5');
});

test('the move animation only touches transform: no layout or filter changes on the moving piece',async({page})=>{
  await openingAfterE4D5(page);
  await clickAt(page,'d1');
  await clickAt(page,'h5');
  const style=await page.evaluate(()=>{const q=document.querySelector('.board-piece[data-square="h5"]'),s=getComputedStyle(q);return {property:s.transitionProperty,duration:s.transitionDuration,timing:s.transitionTimingFunction,artFilter:getComputedStyle(q.firstElementChild).filter}});
  expect(style.property).toBe('transform');
  expect(parseFloat(style.duration)).toBeGreaterThan(.08);expect(parseFloat(style.duration)).toBeLessThan(.16);
  expect(style.timing).toMatch(/cubic-bezier/);
  expect(style.artFilter).toBe('none');
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
  await page.mouse.up();
  await expect(piece(page,'f3').locator('.piece.w.piece-n')).toBeVisible();
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
  await expect(page.locator('#board .square.mark')).toHaveCount(0);

  // A move clears them too.
  await rightDrag(page,'a2','a4');await rightDrag(page,'h6','h6');
  await expect(arrows).toHaveCount(1);
  await expect(page.locator('#board .square.mark')).toHaveCount(1);
  const e2=await center(page,'e2'),e4=await center(page,'e4');
  await page.mouse.move(e2.x,e2.y);await page.mouse.down();await page.mouse.move(e4.x,e4.y,{steps:4});await page.mouse.up();
  await expect(piece(page,'e4')).toHaveCount(1);
  await expect(arrows).toHaveCount(0);
  await expect(page.locator('#board .square.mark')).toHaveCount(0);
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
