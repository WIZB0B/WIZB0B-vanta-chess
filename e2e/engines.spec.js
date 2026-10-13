import { test, expect } from '@playwright/test';

// Round 13: a second open-source engine. Lozza 2.5 plays the Fruitwood and Ironbark opponents
// and the campaign's later guards, in its own worker, under the same strict CSP.
test('Lozza 2.5 plays a computer opponent in its own worker', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop layout; the engine is the same on phones');
  test.setTimeout(60000);
  await page.addInitScript(() => { localStorage.setItem('vch.intro-seen', '1'); localStorage.setItem('vanta.flagPrompt', '1') });
  await page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', route => route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ player: { id: 'me' }, bots: [] }) }));
  const loaded = [];
  page.on('request', r => { const u = new URL(r.url()); if (/lozza|stockfish/.test(u.pathname)) loaded.push(u.pathname) });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && /Content Security Policy|lozza/i.test(m.text())) errors.push(m.text()) });
  await page.goto('/');
  await page.locator('[data-mode="computer"]').click();
  const card = page.locator('[data-bot-slug="lozza-fruitwood"]');
  await expect(card).toContainText('Lozza 2.5');
  await card.click();
  await page.locator('[data-computer-side="b"]').click();
  await page.locator('#computerStart').click();
  // Lozza (White) opens, from /lozza.worker.js. (Stockfish may still load for the live evaluation.)
  await expect.poll(async () => page.locator('#moves .move-pair-row').count(), { timeout: 20000 }).toBeGreaterThan(0);
  await expect(page.locator('#turn')).toContainText('Black to move');
  expect(loaded).toContain('/lozza.worker.js');
  expect(loaded).toContain('/engines/lozza-2.5.js');
  // And it answers a move.
  const tap = async sq => { const b = await page.locator(`[data-sq="${sq}"]`).boundingBox(); await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2) };
  const from = await page.locator('.board-piece[data-square="e7"]').count() ? 'e7' : 'd7';
  await tap(from); await tap(from[0] + '5');
  await expect.poll(async () => page.locator('#moves .move-pair-row').count(), { timeout: 20000 }).toBe(2);
  await expect(page.locator('#turn')).toContainText('Black to move');
  expect(errors).toEqual([]);
});

test('the campaign names the engine behind each battle', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop layout');
  await page.addInitScript(() => { localStorage.setItem('vch.intro-seen', '1'); localStorage.setItem('vanta.flagPrompt', '1') });
  await page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', route => route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ player: { id: 'me' } }) }));
  await page.goto('/');
  await page.locator('[data-mode="computer"]').click();
  await page.locator('.computer-campaign').click();
  await expect(page.locator('.camp-realm')).toHaveCount(5);
  await expect(page.locator('.camp-battles li', { hasText: 'The Glass Page' })).toContainText('Lozza 2.5');
  await expect(page.locator('.camp-battles li', { hasText: 'The Vanta King' })).toContainText('Stockfish 19');
});
