import { test, expect } from '@playwright/test';

const FEN = 'rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2'; // Black mates with Qh4#
test('learn from your mistakes: a saved position is drilled and moves to the next box', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop panel');
  await page.addInitScript(fen => {
    localStorage.setItem('vch.intro-seen', '1'); localStorage.setItem('vanta.flagPrompt', '1');
    localStorage.setItem('vch.mistakes', JSON.stringify([{ id: 'g:4', fen, best: 'd8h4', played: 'Nc6', classification: 'miss', loss: 50, moveNo: 2, color: 'b', gameId: 'g', date: new Date().toISOString(), opponent: 'Scout', box: 0, due: 0, tries: 0, fixed: false }]));
  }, FEN);
  await page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', route => route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ games: [], player: { id: 'me' } }) }));
  await page.goto('/');
  await page.locator('[data-nav="review"]').click();
  await expect(page.locator('.archive-mistakes')).toContainText('1 due');
  await page.locator('.archive-mistakes').click();
  await page.locator('.mistakes-start').click();
  await expect(page.locator('.trainer-drill')).toContainText('you played Nc6');
  const click = async sq => { const b = await page.locator(`[data-sq="${sq}"]`).boundingBox(); await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2) };
  await click('d8'); await click('h4');
  await expect(page.locator('#toast')).toContainText('Fixed');
  const bank = await page.evaluate(() => JSON.parse(localStorage.getItem('vch.mistakes')));
  expect(bank[0].box).toBe(1); expect(bank[0].fixed).toBe(true);
});

test('offline: the app opens from the cache and the computer plays without a connection', async ({ page, context }) => {
  test.setTimeout(90000);
  test.skip(test.info().project.name === 'mobile', 'Same shell on phones');
  await page.addInitScript(() => { localStorage.setItem('vch.intro-seen', '1'); localStorage.setItem('vanta.flagPrompt', '1') });
  await page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', route => route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ player: { id: 'me' }, bots: [] }) }));
  await page.goto('/');
  await page.evaluate(async () => { const reg = await navigator.serviceWorker.ready; await new Promise(r => setTimeout(r, 500)); return !!reg.active });
  await expect.poll(() => page.evaluate(async () => (await (await caches.open('vanta-shell-v2')).keys()).some(r => r.url.endsWith('.wasm')))).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#offlineBar')).toBeVisible();
  await page.locator('#offlineBar button').click();
  await page.locator('[data-computer-side="b"]').click();
  await page.locator('#computerStart').click();
  // We play Black, so the engine (running from the cache) makes White's first move.
  await expect(page.locator('.board-piece[data-square$="3"], .board-piece[data-square$="4"]')).toHaveCount(1, { timeout: 30000 });
});
