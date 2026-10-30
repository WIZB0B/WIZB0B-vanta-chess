import { test, expect } from '@playwright/test';

// Bug pass (2026-10-30): phones and overlays. The page now draws to the screen's edges
// (viewport-fit=cover) and its bars keep clear of the notch and the home indicator; the More
// sheet closes on Escape and gives focus back; the closed chat can't be tabbed into; and a slow
// load can't take over the screen you have since moved to.
const PUZZLE = { id: 'p1', fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4', solution: ['h5f7'], rating: 1200, themes: ['mateIn1'] };

async function setup(page, extra = {}) {
  await page.addInitScript(() => { localStorage.setItem('vch.intro-seen', '1'); localStorage.setItem('vanta.flagPrompt', '1'); });
  await page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', async route => {
    let body = {}; try { body = route.request().postDataJSON(); } catch {}
    const reply = extra[body.action];
    const out = typeof reply === 'function' ? await reply(body) : reply ?? (body.action === 'profile' ? { player: { id: 'me' } } : {});
    await route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(out) });
  });
}

test('phone: the tab bar and the top bar keep clear of the home indicator and the notch', async ({ page }) => {
  test.skip(test.info().project.name !== 'mobile', 'Phone shell');
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 47, bottom: 34, left: 0, right: 0 } });
  await setup(page);
  await page.goto('/');
  await expect(page.locator('.m-tabs')).toBeVisible();
  expect(await page.locator('.m-tabs').evaluate(el => getComputedStyle(el).paddingBottom)).toBe('34px');
  expect(await page.locator('.topbar').evaluate(el => getComputedStyle(el).paddingTop)).toBe('53px');
  // The tabs stay whole above the indicator.
  const tabs = await page.locator('.m-tabs').boundingBox(), vh = page.viewportSize().height;
  expect(Math.round(tabs.y + tabs.height)).toBe(vh);
  expect(tabs.height).toBeGreaterThanOrEqual(60 + 34 - 1);
});

test('phone: Escape closes the More sheet and gives focus back to the More tab', async ({ page }) => {
  test.skip(test.info().project.name !== 'mobile', 'Phone shell');
  await setup(page);
  await page.goto('/');
  await page.locator('[data-m-tab="more"]').focus();
  await page.locator('[data-m-tab="more"]').click();
  await expect(page.locator('#mSheet')).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.getElementById('mSheet').contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.locator('#mSheet')).toBeHidden();
  expect(await page.evaluate(() => document.activeElement?.dataset?.mTab)).toBe('more');
});

test('the closed chat can not be tabbed into; opened, it can', async ({ page }) => {
  test.skip(test.info().project.name !== 'desktop', 'Desktop game menu');
  await setup(page);
  await page.goto('/');
  expect(await page.locator('#chatDrawer').evaluate(el => el.inert)).toBe(true);
  await page.evaluate(() => document.getElementById('openChat').click());
  await expect(page.locator('#chatDrawer')).toHaveClass(/open/);
  expect(await page.locator('#chatDrawer').evaluate(el => el.inert)).toBe(false);
  await page.locator('#message').focus();
  await expect(page.locator('#message')).toBeFocused();
});

test('a puzzle that arrives after you started a computer game does not replace it', async ({ page }) => {
  test.skip(test.info().project.name !== 'desktop', 'Desktop navigation');
  let release; const held = new Promise(r => { release = r; });
  let asked = 0;
  await setup(page, { puzzle_next: async () => { asked++; await held; return { puzzle: PUZZLE }; } });
  await page.goto('/');
  await page.locator('[data-nav="puzzles"]').click();
  await expect.poll(() => asked).toBeGreaterThan(0);
  await page.locator('[data-nav="play"]').click();
  await page.locator('[data-mode="computer"]').click();
  await page.locator('#computerStart').click();
  await expect(page.locator('.board-piece')).toHaveCount(32);
  release();
  await page.waitForTimeout(800);
  // Still the computer game from the start position, not the puzzle.
  await expect(page.locator('.board-piece')).toHaveCount(32);
  await expect(page.locator('.board-piece[data-square="h5"]')).toHaveCount(0);
  await expect(page.locator('#state')).not.toContainText('Find the best move');
});
