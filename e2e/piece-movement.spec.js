import { test, expect } from '@playwright/test';

async function startComputerGame(page){
  await page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', async route=>{
    let body={};try{body=route.request().postDataJSON()}catch{}
    const payload=body.action==='profile'?{player:{id:'move-player',display_name:'Guest-MV',ratings:{rapid:1200}}}:{};
    await route.fulfill({contentType:'application/json',body:JSON.stringify(payload)});
  });
  await page.addInitScript(()=>localStorage.setItem('vch.intro-seen','1'));
  await page.goto('/');
  await page.locator('[data-mode="computer"]').click();
  await page.locator('[data-bot-slug="gambit"]').click();
  await page.locator('#computerStart').click();
}
async function press(page,sq){await page.locator(`[data-sq="${sq}"] .piece`).hover();await page.mouse.down()}
async function center(page,sq){const b=await page.locator(`[data-sq="${sq}"]`).boundingBox();return {x:b.x+b.width/2,y:b.y+b.height/2}}

test('pieces follow the pointer, snap back from illegal squares, and drop onto legal ones',async({page})=>{
  test.skip(test.info().project.name==='mobile','mouse dragging is covered on desktop');
  await startComputerGame(page);

  // A plain click selects, a second click deselects.
  await page.locator('[data-sq="e2"]').click();
  await expect(page.locator('[data-sq="e2"]')).toHaveClass(/selected/);
  await expect(page.locator('[data-sq="e4"]')).toHaveClass(/legal/);
  await page.locator('[data-sq="e2"]').click();
  await expect(page.locator('[data-sq="e2"]')).not.toHaveClass(/selected/);

  // Mid-drag: the piece rides under the pointer and its square is empty-looking.
  // Press first: hovering may scroll the page, so target points are measured afterwards.
  await press(page,'e2');
  const e5=await center(page,'e5');
  await page.mouse.move(e5.x,e5.y,{steps:4});
  const float=page.locator('.drag-float');
  await expect(float).toHaveCount(1);
  const fb=await float.boundingBox();
  expect(Math.abs(fb.x+fb.width/2-e5.x)).toBeLessThan(3);
  expect(Math.abs(fb.y+fb.height/2-e5.y)).toBeLessThan(3);
  await expect(page.locator('[data-sq="e2"] .piece')).toHaveClass(/drag-origin/);
  await expect(page.locator('[data-sq="e5"]')).toHaveClass(/drag-over/);

  // Illegal drop: back to e2, still selected, no move played.
  await page.mouse.up();
  await expect(page.locator('.drag-float')).toHaveCount(0);
  await expect(page.locator('[data-sq="e2"] .piece.w.piece-p')).toBeVisible();
  await expect(page.locator('[data-sq="e2"]')).toHaveClass(/selected/);
  await expect(page.locator('#moves .move-pair-row')).toHaveCount(0);

  // Legal drop plays the move straight away.
  await press(page,'e2');
  const e4=await center(page,'e4');
  await page.mouse.move(e4.x,e4.y,{steps:4});await page.mouse.up();
  await expect(page.locator('[data-sq="e4"] .piece.w.piece-p')).toBeVisible();
  await expect(page.locator('[data-sq="e2"] .piece')).toHaveCount(0);
  await expect(page.locator('.drag-float')).toHaveCount(0);
  await expect.poll(async()=>page.locator('#moves .move-pair-row').count(),{timeout:12000}).toBe(1);
});

test('Escape cancels a drag in progress',async({page})=>{
  test.skip(test.info().project.name==='mobile','mouse dragging is covered on desktop');
  await startComputerGame(page);
  await press(page,'g1');
  const f3=await center(page,'f3');
  await page.mouse.move(f3.x,f3.y,{steps:4});
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(page.locator('.drag-float')).toHaveCount(0);
  await expect(page.locator('[data-sq="g1"] .piece.w.piece-n')).toBeVisible();
  await expect(page.locator('[data-sq="f3"] .piece')).toHaveCount(0);
  await expect(page.locator('[data-sq="g1"]')).not.toHaveClass(/selected/);
});

test('tap-to-move works on touch screens',async({page})=>{
  test.skip(test.info().project.name!=='mobile','touch is covered on mobile');
  await startComputerGame(page);
  await page.locator('[data-sq="d2"]').tap();
  await expect(page.locator('[data-sq="d2"]')).toHaveClass(/selected/);
  await page.locator('[data-sq="d4"]').tap();
  await expect(page.locator('[data-sq="d4"] .piece.w.piece-p')).toBeVisible();
});
