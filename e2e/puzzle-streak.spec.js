import { test, expect } from '@playwright/test';

// Mocked puzzles: 1. e4 is the only move. The first is solved, the second is missed.
test('Puzzle Streak: solve one, miss the next, see the result', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('vch.intro-seen', '1'); localStorage.setItem('vanta.flagPrompt', '1') });
  let served = 0, attempts = [];
  await page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', async route => {
    let body = {}; try { body = route.request().postDataJSON() } catch {}
    let payload = {};
    if (body.action === 'puzzle_next') { served++; payload = { puzzle: { id: `p${served}`, fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', solution: ['e2e4'], rating: 900, themes: ['opening'] } } }
    if (body.action === 'puzzle_attempt') { attempts.push(body); payload = { stats: {} } }
    await route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(payload) });
  });
  const mobile = test.info().project.name === 'mobile';
  const tap = async sq => { const b = await page.locator(`[data-sq="${sq}"]`).boundingBox(); if (mobile) await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); else await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2) };
  await page.goto('/');
  if (mobile) await page.locator('[data-m-tab="puzzles"]').click(); else await page.locator('[data-nav="puzzles"]').click();
  if (mobile) await page.locator('[data-m-action="puzzle-streak"]').click(); else await page.locator('.start-streak').click();
  await expect.poll(() => served).toBe(2);
  if (!mobile) await expect(page.locator('.streak-count b')).toHaveText('0');
  await page.locator('.board').scrollIntoViewIfNeeded();
  await tap('e2'); await tap('e4');
  await expect.poll(() => served, { timeout: 8000 }).toBe(3);
  if (!mobile) await expect(page.locator('.streak-count b')).toHaveText('1');
  else await expect(page.locator('#mGameTitle')).toHaveText('Puzzle Streak · 1');
  await expect(page.locator('.board-piece[data-square="e2"]')).toHaveCount(1);
  await tap('d2'); await tap('d4');
  await expect(page.locator('.streak-over')).toBeVisible({ timeout: 8000 });
  await expect(page.locator('.streak-over .streak-count b')).toHaveText('1');
  await expect(page.locator('.arrow-layer .arrow-green')).toHaveCount(mobile ? 1 : 1);
  await expect.poll(() => attempts.some(a => a.success === false)).toBe(true);
});
