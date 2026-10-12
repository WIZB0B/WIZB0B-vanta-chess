import { test, expect } from '@playwright/test';

const entry = (id, pgn, extra = {}) => ({ id, source: 'computer', pgn, result: '1-0', white: 'Me', black: 'Scout', myColor: 'w', whiteRating: null, blackRating: 900, rated: false, base: 600, inc: 0, date: new Date().toISOString(), moves: 9, ...extra });
async function setup(page, entries) {
  await page.addInitScript(list => { localStorage.setItem('vch.intro-seen', '1'); localStorage.setItem('vanta.flagPrompt', '1'); localStorage.setItem('vch.archive.local', JSON.stringify(list)) }, entries);
  await page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', route => route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ games: [], player: { id: 'me' } }) }));
}

test('opening trainer: your deviation becomes a drill; play the main line to finish it', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop panel; the same view opens from More on phones');
  await setup(page, [entry('a', '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. b4'), entry('b', '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. b4 d6', { result: '0-1' })]);
  await page.goto('/');
  await page.locator('[data-nav="review"]').click();
  await page.locator('.archive-trainer').click();
  await expect(page.locator('.trainer-row')).toHaveCount(1);
  await expect(page.locator('.trainer-row')).toContainText('You: b4');
  await expect(page.locator('.trainer-row')).toContainText('Book: d3');
  await expect(page.locator('.trainer-row')).toContainText('2 games');
  await expect(page.locator('.trainer-openings > div').first()).toContainText('Italian · Giuoco Pianissimo');
  await page.locator('.trainer-start').click();
  await expect(page.locator('.trainer-drill')).toContainText('you played b4');
  const click = async sq => { const b = await page.locator(`[data-sq="${sq}"]`).boundingBox(); await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2) };
  await click('b2'); await click('b4');
  await expect(page.locator('.board-piece[data-square="b2"]')).toHaveCount(1);
  await click('d2'); await click('d3');
  await expect(page.locator('.board-piece[data-square="d6"]')).toHaveCount(1, { timeout: 4000 });
  await click('e1'); await click('g1');
  await expect(page.locator('#toast')).toContainText('Main line found');
});

test('Game Story: share the image card (download fallback)', async ({ page }) => {
  test.setTimeout(90000);
  test.skip(test.info().project.name === 'mobile', 'Same card on phones');
  await setup(page, [entry('s', '1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7#', { white: 'Scout', black: 'Me', myColor: 'b', moves: 7 })]);
  await page.goto('/');
  await page.evaluate(() => { Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true }) });
  await page.locator('[data-nav="review"]').click();
  await page.locator('.archive-row').click();
  await expect(page.locator('#storyCard')).toBeVisible({ timeout: 60000 });
  const download = page.waitForEvent('download');
  await page.locator('[data-story="share-card"]').click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('vch-Scout-vs-Me.png');
  const path = await file.path();
  const { statSync } = await import('node:fs');
  expect(statSync(path).size).toBeGreaterThan(20000);
});
