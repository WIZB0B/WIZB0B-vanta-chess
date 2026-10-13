import { test, expect } from '@playwright/test';

// Puzzle runs (round 13): Streak counts up, Survival counts down and ends at zero, and skip
// tokens replace the single skip.
async function boot(page) {
  await page.clock.install();
  await page.addInitScript(() => { localStorage.setItem('vch.intro-seen', '1'); localStorage.setItem('vanta.flagPrompt', '1') });
  const served = { n: 0 };
  await page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', async route => {
    let body = {}; try { body = route.request().postDataJSON() } catch {}
    let payload = {};
    if (body.action === 'puzzle_next') { served.n++; payload = { puzzle: { id: `p${served.n}`, fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', solution: ['e2e4'], rating: 900, themes: ['opening'] } } }
    await route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(payload) });
  });
  await page.goto('/');
  await page.locator('[data-nav="puzzles"]').click();
  await expect(page.locator('.start-survival')).toBeVisible();
  return served;
}

test('Puzzle Streak: the clock counts up, in the card and under the board', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop panel');
  await boot(page);
  await page.locator('.start-streak').click();
  await expect(page.locator('.run-streak .run-clock b')).toHaveText('0:00');
  await page.clock.fastForward(5000);
  await expect(page.locator('.run-streak .run-clock b')).toHaveText('0:05');
  await expect(page.locator('#bottomClock')).toHaveText('0:05');
  await expect(page.locator('#bottomClock')).toBeVisible();
});

test('Puzzle Survival: running out of time ends the run', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop panel');
  await boot(page);
  await page.locator('.start-survival').click();
  await expect(page.locator('.run-survival .run-clock b')).toHaveText('0:45');
  await page.clock.fastForward(40000);
  await expect(page.locator('body')).toHaveClass(/puzzle-hurry/);
  await page.clock.fastForward(6000);
  await expect(page.locator('.streak-over h4')).toHaveText("Time's up");
  await expect(page.locator('.streak-over .streak-count small')).toHaveText('SURVIVAL');
});

test('skip tokens: two to start; a skip spends one and serves the next puzzle', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop panel');
  const served = await boot(page);
  await page.locator('.start-streak').click();
  await expect(page.locator('.skip-tokens i.on')).toHaveCount(2);
  const before = served.n;
  await page.locator('.skip-puzzle').click();
  await expect.poll(() => served.n).toBe(before + 1);
  await expect(page.locator('.skip-tokens i.on')).toHaveCount(1);
  await page.locator('.skip-puzzle').click();
  await expect(page.locator('.skip-tokens i.on')).toHaveCount(0);
  await expect(page.locator('.skip-puzzle')).toBeDisabled();
});
