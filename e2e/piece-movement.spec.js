import { test, expect } from '@playwright/test';
import { center, clickAt, mockBackend, piece, startComputerGame } from './board-helpers.js';

async function press(page,sq){const c=await center(page,sq);await page.mouse.move(c.x,c.y);await page.mouse.down()}

test('pieces follow the pointer, snap back from illegal squares, and drop onto legal ones',async({page})=>{
  test.skip(test.info().project.name==='mobile','mouse dragging is covered on desktop');
  await mockBackend(page);await startComputerGame(page);

  // A plain click selects, a second click deselects.
  await clickAt(page,'e2');
  await expect(page.locator('[data-sq="e2"]')).toHaveClass(/selected/);
  await expect(page.locator('[data-sq="e4"]')).toHaveClass(/legal/);
  await clickAt(page,'e2');
  await expect(page.locator('[data-sq="e2"]')).not.toHaveClass(/selected/);

  // Mid-drag: the piece rides under the pointer and its own piece is hidden.
  await press(page,'e2');
  const e5=await center(page,'e5');
  await page.mouse.move(e5.x,e5.y,{steps:4});
  const float=page.locator('.drag-layer .drag-float');
  await expect(float).toHaveCount(1);
  const fb=await float.boundingBox();
  expect(Math.abs(fb.x+fb.width/2-e5.x)).toBeLessThan(3);
  expect(Math.abs(fb.y+fb.height/2-e5.y)).toBeLessThan(3);
  await expect(piece(page,'e2')).toHaveClass(/drag-origin/);
  await expect(page.locator('[data-sq="e5"]')).toHaveClass(/drag-over/);
  expect(await page.evaluate(()=>getComputedStyle(document.body).cursor)).toBe('grabbing');

  // Illegal drop: back to e2, still selected, no move played.
  await page.mouse.up();
  await expect(page.locator('.drag-float')).toHaveCount(0);
  await expect(piece(page,'e2').locator('.piece.w.piece-p')).toBeVisible();
  await expect(piece(page,'e2')).not.toHaveClass(/drag-origin/);
  await expect(page.locator('[data-sq="e2"]')).toHaveClass(/selected/);
  await expect(page.locator('#moves .move-pair-row')).toHaveCount(0);

  // Legal drop plays the move straight away.
  await press(page,'e2');
  const e4=await center(page,'e4');
  await page.mouse.move(e4.x,e4.y,{steps:4});await page.mouse.up();
  await expect(piece(page,'e4').locator('.piece.w.piece-p')).toBeVisible();
  await expect(piece(page,'e2')).toHaveCount(0);
  await expect(page.locator('.drag-float')).toHaveCount(0);
  await expect.poll(async()=>page.locator('#moves .move-pair-row').count(),{timeout:12000}).toBe(1);
});

test('Escape cancels a drag in progress',async({page})=>{
  test.skip(test.info().project.name==='mobile','mouse dragging is covered on desktop');
  await mockBackend(page);await startComputerGame(page);
  await press(page,'g1');
  const f3=await center(page,'f3');
  await page.mouse.move(f3.x,f3.y,{steps:4});
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(page.locator('.drag-float')).toHaveCount(0);
  await expect(piece(page,'g1').locator('.piece.w.piece-n')).toBeVisible();
  await expect(piece(page,'f3')).toHaveCount(0);
  await expect(page.locator('[data-sq="g1"]')).not.toHaveClass(/selected/);
});

test('tap-to-move works on touch screens',async({page})=>{
  test.skip(test.info().project.name!=='mobile','touch is covered on mobile');
  await mockBackend(page);await startComputerGame(page);
  await piece(page,'d2').tap();
  await expect(page.locator('[data-sq="d2"]')).toHaveClass(/selected/);
  await page.locator('[data-sq="d4"]').tap();
  await expect(piece(page,'d4').locator('.piece.w.piece-p')).toBeVisible();
});
