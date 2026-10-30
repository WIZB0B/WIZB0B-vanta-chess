import { test, expect } from '@playwright/test';

// Bug pass (2026-10-30): the app must come up whatever the browser's storage does.
async function mockApi(page) {
  await page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', async route => {
    let body = {}; try { body = route.request().postDataJSON(); } catch {}
    await route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body.action === 'profile' ? { player: { id: 'me', display_name: 'Me', ratings: { rapid: 1200 } } } : {}) });
  });
}

test('with browser storage blocked the app still loads, plays, and nothing errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    for (const name of ['localStorage', 'sessionStorage']) Object.defineProperty(window, name, { configurable: true, get() { throw new DOMException('The operation is insecure.', 'SecurityError'); } });
  });
  await mockApi(page);
  await page.goto('/');
  await expect(page.locator('#bootVeil')).toHaveCount(0, { timeout: 8000 });
  await expect(page.locator('.square')).toHaveCount(64);
  // The intro (never seen, nothing remembered) leads into the game screen, and a computer game starts.
  if (await page.locator('#joinNow').isVisible()) await page.locator('#joinNow').click();
  await page.locator('[data-mode="computer"]').click();
  await page.locator('#computerStart').click();
  await expect(page.locator('.board-piece')).toHaveCount(32);
  expect(errors).toEqual([]);
});

test('damaged saved settings can not stop the app', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => { localStorage.setItem('vanta.theme', '{broken'); localStorage.setItem('vanta.auth-session', 'not json'); localStorage.setItem('vch.intro-seen', '1'); });
  await mockApi(page);
  await page.goto('/');
  // The veil lifts as soon as the page is built (not after the 6 s CSS fallback), and the controls work.
  await expect(page.locator('#bootVeil')).toHaveCount(0, { timeout: 4000 });
  await expect(page.locator('.square')).toHaveCount(64);
  // Controls wired after the saved theme is read (Theme Studio) work.
  if (test.info().project.name === 'desktop') {
    await page.locator('#theme').click();
    await expect(page.locator('#themeStudio')).toBeVisible();
  } else {
    await page.locator('[data-m-tab="more"]').click();
    await page.locator('#mSheetItems button', { hasText: 'Settings' }).click();
    await expect(page.locator('#themeStudio')).toBeVisible();
  }
  expect(errors).toEqual([]);
});
