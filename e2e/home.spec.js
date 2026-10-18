import { test, expect } from '@playwright/test';

// The home screen (owner, 2026-10-18): the living pavilion, "Vchess", and the way in.
async function mockApi(page) {
  await page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ profile: { rating: 1200 } }) }));
}

test('a first visit opens on the pavilion; Play now goes in; the V leads back home', async ({ page }) => {
  test.setTimeout(60000); // decoding the 3840 px photograph is slow on a loaded test machine
  await mockApi(page);
  await page.goto('/');
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'intro');
  await expect(page.locator('#mainMenu .home-name')).toHaveText('Vchess');
  await expect(page.locator('#mainMenuTitle')).toHaveText('Play Better Chess');
  const photo = page.locator('#homeScene img');
  // (naturalWidth is in CSS pixels for a srcset choice, so only "decoded" is asked of it)
  await expect.poll(() => photo.evaluate(img => img.complete && img.naturalWidth > 0), { timeout: 20000 }).toBe(true);
  expect(await photo.evaluate(img => img.currentSrc)).toMatch(/\/assets\/vch\/home\/pavilion-(1920|2560|3840)\.webp$/);
  // nothing scrolls sideways, and the way in is on screen without scrolling
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const play = await page.locator('#joinNow').boundingBox();
  expect(play.y + play.height).toBeLessThanOrEqual(page.viewportSize().height);

  await page.locator('#joinNow').click();
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'game');
  await expect(page.locator('#homeScene')).toBeHidden();
  await page.locator('.vch-brand').click();
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'intro');
  await expect(page.locator('#mainMenu')).toBeVisible();
  await expect(page.locator('#gameWorkspace')).toBeHidden();
  await expect(page).toHaveURL(/\/$/);
});

test('a return visit opens on the game and never fetches the photograph until home is opened', async ({ page }) => {
  test.setTimeout(60000);
  await mockApi(page);
  const fetched = [];
  page.on('request', request => { if (request.url().includes('/assets/vch/home/')) fetched.push(request.url()); });
  await page.addInitScript(() => { localStorage.setItem('vch.intro-seen', '1'); localStorage.setItem('vanta.flagPrompt', '1'); });
  await page.goto('/');
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'game');
  await expect(page.locator('.board .square')).toHaveCount(64);
  await page.waitForTimeout(800);
  expect(fetched).toEqual([]);
  await page.locator('.vch-brand').click();
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'intro');
  await expect.poll(() => fetched.length).toBeGreaterThan(0);
  await expect.poll(() => page.locator('#homeScene img').evaluate(img => img.complete && img.naturalWidth > 0), { timeout: 20000 }).toBe(true);
});

test('Sign in on the home screen opens the account window', async ({ page }) => {
  await mockApi(page);
  await page.goto('/');
  await page.locator('#homeSignIn').click();
  await expect(page.locator('#accountDialog')).toBeVisible();
});
