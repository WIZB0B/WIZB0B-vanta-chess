import { test, expect } from '@playwright/test';

// Mocked puzzles: 1. e4 is the only move. A miss counts once against the rating; the stats
// page lists themes and lets you train one.
const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
test('puzzle rating: a miss counts once, then solving finishes without a second rating change', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop puzzle panel; phones share the same flow');
  await page.addInitScript(() => { localStorage.setItem('vch.intro-seen', '1'); localStorage.setItem('vanta.flagPrompt', '1') });
  const attempts = [], nexts = [];
  let rating = 1500;
  await page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', async route => {
    let body = {}; try { body = route.request().postDataJSON() } catch {}
    let payload = {};
    if (body.action === 'profile') payload = { player: { id: 'me', display_name: 'Me', puzzle_rating: rating } };
    if (body.action === 'puzzle_next') { nexts.push(body); payload = { puzzle: { id: `p${nexts.length}`, fen: START, solution: ['e2e4'], rating: 1500, themes: ['backRankMate'] } } }
    if (body.action === 'puzzle_attempt') { attempts.push(body); const first = attempts.length === 1, before = rating; if (first) rating -= 9; payload = { rating: { before, after: rating, counted: first }, stats: {} } }
    if (body.action === 'puzzle_stats') payload = { rating, games: 31, best_streak: 7, history: [1500, 1512, 1498, 1491], themes: [{ theme: 'fork', tries: 6, solved: 5, rate: 83 }, { theme: 'backRankMate', tries: 4, solved: 1, rate: 25 }] };
    await route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(payload) });
  });
  const tap = async sq => { const b = await page.locator(`[data-sq="${sq}"]`).boundingBox(); await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2) };
  await page.goto('/');
  await page.locator('[data-nav="puzzles"]').click();
  await expect(page.locator('#puzzleRatingNow')).toHaveText('1500');
  expect(nexts[0].difficulty).toBe('normal');
  await tap('d2'); await tap('d4');
  await expect(page.locator('#puzzleRatingDelta')).toHaveText('−9');
  await expect(page.locator('#puzzleRatingNow')).toHaveText('1491');
  await tap('d2'); await tap('d4');
  await tap('e2'); await tap('e4');
  await page.waitForTimeout(400);
  expect(attempts.map(a => a.success)).toEqual([false]);
  await page.locator('.puzzle-stats').click();
  await expect(page.locator('.puzzle-stat-row')).toContainText('31');
  await expect(page.locator('.puzzle-spark polyline')).toHaveCount(1);
  await expect(page.locator('.theme-chips button')).toHaveText(['Back rank mate · 25%', 'Fork · 83%']);
  await page.locator('.theme-chips button').first().click();
  await expect.poll(() => nexts.at(-1)?.angle).toBe('backRankMate');
  await expect(page.locator('.puzzle-theme-pick')).toContainText('Back rank mate');
});
