import { test, expect } from '@playwright/test';

// A computer game saved in this browser's archive: Black fell for the scholar's mate.
const ENTRY = { id: 'local-test', source: 'computer', pgn: '1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7#', result: '1-0', white: 'Scout', black: 'Me', myColor: 'b',
  whiteRating: 900, blackRating: null, rated: false, base: 600, inc: 0, date: new Date().toISOString(), moves: 7 };

test('My games: open a past game, get its story, replay the toughest moment', async ({ page }) => {
  test.setTimeout(90000);
  await page.addInitScript(entry => { localStorage.setItem('vch.intro-seen', '1'); localStorage.setItem('vanta.flagPrompt', '1'); localStorage.setItem('vch.archive.local', JSON.stringify([entry])) }, ENTRY);
  await page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', route => route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ games: [], player: { id: 'me' } }) }));
  await page.goto('/');
  if (test.info().project.name === 'mobile') { await page.locator('[data-m-tab="more"]').click(); await page.locator('#mSheetItems button', { hasText: 'My games' }).click(); }
  else await page.locator('[data-nav="review"]').click();
  await expect(page.locator('.archive-row')).toHaveCount(1);
  await expect(page.locator('.archive-row')).toHaveClass(/outcome-loss/);
  await expect(page.locator('.form-dot.loss')).toHaveCount(1);
  await page.locator('.archive-row').click();
  await expect(page.locator('#storyCard')).toBeVisible({ timeout: 60000 });
  await expect(page.locator('.story-chapters li')).not.toHaveCount(0);
  await expect(page.locator('.story-moments .moment').first()).toBeVisible();
  await expect(page.locator('#bottomPlayerName')).toHaveText('Me');
  // Replay: the board returns to the position before 3...Nf6 with Black to move.
  await page.locator('.story-retry').click();
  await expect(page.locator('.board-piece[data-square="g8"]')).toHaveCount(1);
  await expect(page.locator('.board-piece[data-square="f6"]')).toHaveCount(0);
  // Back in the archive, the game now shows its accuracy.
  if (test.info().project.name === 'mobile') return;
  await page.locator('[data-nav="review"]').click();
  await expect(page.locator('.archive-side i').first()).toContainText('%');
});
