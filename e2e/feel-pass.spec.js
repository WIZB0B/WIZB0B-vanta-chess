import { test, expect } from '@playwright/test';

// The smoothness pass (owner, 2026-10-17: "it feels choppy ... when you go to the menu ... it does
// not land naturally ... the elements on the board ... seem to be floating on the board", and
// "the game start screen and the game end screen"). Runs on desktop and on a phone.
async function setup(page, { firstVisit = false } = {}) {
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  await page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', route => route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ player: { id: 'me', display_name: 'Me', ratings: { rapid: 1200 } } }) }));
  if (!firstVisit) await page.addInitScript(() => { localStorage.setItem('vch.intro-seen', '1'); localStorage.setItem('vanta.flagPrompt', '1'); });
  return errors;
}
async function startComputerGame(page) {
  await page.locator('[data-mode="computer"]').first().click();
  await page.locator('#computerStart').click();
  await expect(page.locator('.board-piece')).toHaveCount(32);
}
async function resign(page) {
  const phone = await page.locator('body.m-app').count();
  await page.locator(phone ? '[data-m-action="resign"]' : '#resign').click();
  await page.locator('.vch-dialog-action.primary').click();
}

test('the page appears once: the veil covers loading, then lifts and leaves', async ({ page }) => {
  const errors = await setup(page);
  await page.goto('/');
  await expect(page.locator('#bootVeil')).toHaveCount(0, { timeout: 5000 });
  await expect(page.locator('html')).toHaveClass(/app-revealed/);
  // The web never shows the splash (only the installed app does).
  await expect(page.locator('#brandSplash')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('a game starts with the card over the empty squares, then the pieces settle; a touch on the board ends it at once', async ({ page }) => {
  await setup(page); await page.goto('/');
  await startComputerGame(page);
  const board = page.locator('#board');
  await expect(board).toHaveAttribute('data-arrival', /hold|clear|drop/);
  await expect(page.locator('#gameStartCard')).toHaveClass(/show/);
  // About a second and a half later, every piece is down and fully drawn; the card has gone.
  await expect(board).not.toHaveAttribute('data-arrival', /.+/, { timeout: 3000 });
  await expect(page.locator('#gameStartCard')).not.toHaveClass(/show/);
  const opacities = await page.locator('.board-piece').evaluateAll(els => els.map(el => getComputedStyle(el).opacity));
  expect(new Set(opacities)).toEqual(new Set(['1']));
  // Again, and this time touch the board straight away: the arrival ends there and then.
  if (!(await page.locator('body.m-app').count())) {
    await page.locator('#computerStart').click();
    await expect(board).toHaveAttribute('data-arrival', /.+/);
    const box = await page.locator('[data-sq="e2"]').boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(board).not.toHaveAttribute('data-arrival', /.+/);
    await expect(page.locator('[data-sq="e2"]')).toHaveClass(/selected/);
  }
});

test('on the flat board a piece has only its contact shadow, inside its own square', async ({ page }) => {
  await setup(page); await page.goto('/');
  await startComputerGame(page);
  const look = await page.locator('.board-piece[data-square="e2"]').evaluate(el => {
    const square = el.getBoundingClientRect(), before = getComputedStyle(el, '::before'), after = getComputedStyle(el, '::after');
    const top = parseFloat(before.top), height = parseFloat(before.height);
    return { cast: after.content, contact: before.content, bottom: (top + height) / square.height };
  });
  expect(look.cast).toBe('none');
  expect(look.contact).toBe('""');
  expect(look.bottom).toBeLessThanOrEqual(1.001);
});

test('the end of a game: a result card over the board that leaves the page free', async ({ page }) => {
  await setup(page); await page.goto('/');
  await startComputerGame(page);
  await expect(page.locator('#board')).not.toHaveAttribute('data-arrival', /.+/, { timeout: 3000 });
  await resign(page);
  const panel = page.locator('#gameEndPanel');
  await expect(panel).toBeVisible({ timeout: 5000 });
  await expect(panel).toHaveAttribute('aria-modal', 'false');
  await expect(panel.locator('.ge-title')).toHaveText('You lost');
  await expect(panel.locator('.ge-reason')).toContainText('by resignation');
  await expect(panel.locator('.ge-player')).toHaveCount(2);
  await expect(panel.locator('.ge-player[data-side="bottom"] .ge-score')).toHaveText('0');
  await expect(panel.locator('.ge-player[data-side="top"] .ge-score')).toHaveText('1');
  await expect(panel.locator('[data-ge="review"]')).toBeVisible();
  await expect(panel.locator('[data-ge="new"]')).toBeVisible();
  await expect(panel.locator('[data-ge="rematch"]')).toHaveCount(0, { timeout: 100 });
  // No modal layer: the rest of the page answers while the card is up.
  await expect(page.locator('.vch-dialog-layer')).toHaveCount(0);
  if (!(await page.locator('body.m-app').count())) {
    const before = await page.locator('.square').first().getAttribute('data-sq');
    await page.locator('#flip').click();
    await expect(page.locator('.square').first()).not.toHaveAttribute('data-sq', before);
  }
  // Escape closes it; the final position is there to see.
  await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0);
  await expect(page.locator('.board-piece').first()).toBeVisible();
});

test('the end card goes when a new game starts, and New game takes you back to the setup', async ({ page }) => {
  await setup(page); await page.goto('/');
  await startComputerGame(page);
  await resign(page);
  await expect(page.locator('#gameEndPanel')).toBeVisible({ timeout: 5000 });
  await page.locator('#gameEndPanel [data-ge="new"]').click();
  await expect(page.locator('#gameEndPanel')).toHaveCount(0);
  await startComputerGame(page);
  await expect(page.locator('#gameEndPanel')).toHaveCount(0);
});

test('a first visit lands with nothing popping up; the flag question waits for a first finished game', async ({ page, isMobile }) => {
  await setup(page, { firstVisit: true });
  await page.addInitScript(() => localStorage.setItem('vch.intro-seen', '1'));
  await page.goto('/');
  await page.waitForTimeout(4500); // past the old prompt's 2.5 s
  await expect(page.locator('.flag-prompt')).toHaveCount(0);
  if (isMobile) return; // phones ask on another tab after a game (e2e/flag-prompt.spec.js)
  await startComputerGame(page);
  await resign(page);
  await expect(page.locator('#gameEndPanel')).toBeVisible({ timeout: 5000 });
  expect(await page.evaluate(() => localStorage.getItem('vch.games-finished'))).toBe('1');
  await page.waitForTimeout(3000);
  await expect(page.locator('.flag-prompt'), 'never over the end card').toHaveCount(0);
  await page.locator('#gameEndPanel .ge-close').click();
  await expect(page.locator('.flag-prompt')).toBeVisible({ timeout: 9000 });
});
