import { test, expect } from '@playwright/test';

const tap = async (page, sq) => {
  const b = await page.locator(`[data-sq="${sq}"]`).boundingBox();
  if (test.info().project.name === 'mobile') await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
  else await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
};
const ctrl = (page, kind) => test.info().project.name === 'mobile'
  ? page.locator(`.m-movebar [data-browse="${kind}"]`) : page.locator(`.move-nav [data-browse="${kind}"]`);

test('computer game: look back without taking back, then Undo', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('vch.intro-seen', '1'); localStorage.setItem('vanta.flagPrompt', '1') });
  await page.goto('/');
  await page.locator('[data-mode="computer"]').click();
  await page.locator('#computerStart').click();
  await expect(page.locator('.board-piece')).toHaveCount(32);
  await page.locator('.board').scrollIntoViewIfNeeded();
  await tap(page, 'e2'); await tap(page, 'e4');
  await expect(page.locator('.board-piece[data-square="e4"]')).toHaveCount(1);
  // wait for the engine's reply (black has moved: 2 plies)
  await expect.poll(() => page.evaluate(() => document.querySelectorAll('.board-piece.b').length && [...document.querySelectorAll('.board-piece.b')].some(el => !/[78]$/.test(el.dataset.square))), { timeout: 15000 }).toBe(true);

  // Back two moves: the start position, outlined; the e-pawn is home again.
  await ctrl(page, 'prev').click(); await ctrl(page, 'prev').click();
  await expect(page.locator('.board')).toHaveClass(/browsing/);
  await expect(page.locator('.board-piece[data-square="e2"]')).toHaveCount(1);
  await expect(page.locator('.board-piece[data-square="e4"]')).toHaveCount(0);
  // Nothing can be moved while looking back; a tap returns to the game.
  await tap(page, 'd2');
  await expect(page.locator('.board')).not.toHaveClass(/browsing/);
  await expect(page.locator('.board-piece[data-square="e4"]')).toHaveCount(1);

  // Undo takes back the engine's reply and your move.
  if (test.info().project.name === 'mobile') await page.locator('[data-m-action="undo"]').click();
  else await page.locator('#undoMove').click();
  await expect(page.locator('.board-piece[data-square="e2"]')).toHaveCount(1);
  await expect(page.locator('.board-piece[data-square="e4"]')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => [...document.querySelectorAll('.board-piece.b')].every(el => /[78]$/.test(el.dataset.square)))).toBe(true);
});

test('Undo is not offered in online games', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('vch.intro-seen', '1'));
  await page.goto('/');
  await expect(page.locator('#undoMove')).toBeHidden();
  await expect(page.locator('[data-m-action="undo"]')).toBeHidden();
});
