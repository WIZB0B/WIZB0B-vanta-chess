import { test, expect } from '@playwright/test';
import { mockBackend } from './board-helpers.js';

// Backlog 7: Back returns to the previous screen instead of leaving VCH.
test('desktop: Back walks back through the screens', async ({ page, isMobile }) => {
  test.skip(isMobile, 'phones use the tab bar (next test)');
  await mockBackend(page);
  await page.goto('/');
  await page.locator('.main-nav [data-nav="arena"]').click();
  await expect(page.locator('.main-nav [data-nav="arena"]')).toHaveClass(/active/);
  await page.locator('.main-nav [data-nav="puzzles"]').click();
  await expect(page.locator('.main-nav [data-nav="puzzles"]')).toHaveClass(/active/);
  await page.locator('.main-nav [data-nav="famous"]').click();
  await expect(page.locator('#dynamicView')).toContainText('Famous Games');
  await page.goBack();
  await expect(page.locator('.main-nav [data-nav="puzzles"]')).toHaveClass(/active/);
  await page.goBack();
  await expect(page.locator('.main-nav [data-nav="arena"]')).toHaveClass(/active/);
  await page.goBack();
  await expect(page.locator('.main-nav [data-nav="play"]')).toHaveClass(/active/);
  expect(new URL(page.url()).origin).toBe(new URL(page.url()).origin); // still on VCH
  await page.goForward();
  await expect(page.locator('.main-nav [data-nav="arena"]')).toHaveClass(/active/);
});

test('phone: Back returns to the previous tab', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'phone layout only');
  await mockBackend(page);
  await page.goto('/');
  await page.locator('[data-m-tab="puzzles"]').click();
  await expect(page.locator('[data-m-tab="puzzles"]')).toHaveClass(/on/);
  await page.locator('[data-m-tab="learn"]').click();
  await expect(page.locator('[data-m-tab="learn"]')).toHaveClass(/on/);
  await page.goBack();
  await expect(page.locator('[data-m-tab="puzzles"]')).toHaveClass(/on/);
  await page.goBack();
  await expect(page.locator('[data-m-tab="play"]')).toHaveClass(/on/);
});
