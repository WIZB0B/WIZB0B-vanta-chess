import { test, expect } from '@playwright/test';

// Captured pieces, alive (src/capture-tray.js): a capture flies from its square into its place in
// the capturer's tray as the capturing piece lands, and the lead counts up when it lands.
const setup = async page => {
  await page.addInitScript(() => { localStorage.setItem('vch.intro-seen', '1'); localStorage.setItem('vanta.flagPrompt', '1') });
  await page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', r => r.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ player: { id: 'me' } }) }));
};
// Records every piece that takes flight: where it set off and where it landed.
const watchFlights = page => page.evaluate(() => {
  window.__flights = [];
  new MutationObserver(list => { for (const m of list) for (const n of m.addedNodes) if (n.classList?.contains('capture-flight')) { const f = { start: null, end: null }; window.__flights.push(f); const track = () => { if (!n.isConnected) return; const r = n.getBoundingClientRect(); f.start ??= [r.left + r.width / 2, r.top + r.height / 2]; f.end = [r.left + r.width / 2, r.top + r.height / 2]; requestAnimationFrame(track); }; requestAnimationFrame(track); } }).observe(document.body, { childList: true });
});

test('a captured piece flies from its square into its place in the tray, and the lead counts up as it lands', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop board on the first screen');
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await setup(page);
  await page.goto('/');
  const tap = async sq => { const b = await page.locator(`[data-sq="${sq}"]`).boundingBox(); await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2) };
  await tap('e2'); await tap('e4'); await tap('d7'); await tap('d5');
  await expect(page.locator('.board-piece[data-square="d5"]')).toHaveCount(1);
  await watchFlights(page);
  await tap('e4'); await tap('d5');
  const place = page.locator('#bottomCaptured .tray-group[data-type="p"] img');
  await expect(place).toHaveCount(1);
  await expect.poll(() => page.evaluate(() => window.__flights.length)).toBe(1);
  await expect(page.locator('.capture-flight')).toHaveCount(0, { timeout: 4000 });
  await expect(place).not.toHaveClass(/arriving/);
  await expect(page.locator('#bottomCaptured .tray-lead')).toHaveText('+1');
  // It set off from d5 and landed on its place.
  const [flight] = await page.evaluate(() => window.__flights);
  const sq = await page.locator('[data-sq="d5"]').boundingBox(), img = await place.boundingBox();
  expect(Math.hypot(flight.start[0] - (sq.x + sq.width / 2), flight.start[1] - (sq.y + sq.height / 2))).toBeLessThan(sq.width * 0.6);
  // (the last frame seen can come a frame or two before it lands on a busy machine)
  expect(Math.hypot(flight.end[0] - (img.x + img.width / 2), flight.end[1] - (img.y + img.height / 2))).toBeLessThan(img.width * 0.75);
  // The reply takes back material: the white pawn flies to the top tray and the lead goes.
  await tap('d8'); await tap('d5');
  await expect(page.locator('#topCaptured .tray-group[data-type="p"] img')).toHaveCount(1);
  await expect(page.locator('#bottomCaptured .tray-lead')).toHaveCount(0);
  // The pawn sets off once the queen has landed: wait for it to take flight, then to land.
  await expect.poll(() => page.evaluate(() => window.__flights.length), { timeout: 8000 }).toBe(2);
  await expect(page.locator('.capture-flight')).toHaveCount(0, { timeout: 4000 });
  expect(errors).toEqual([]);
});

test('with reduced motion the trays fill without flights', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop board on the first screen');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await setup(page);
  await page.goto('/');
  const tap = async sq => { const b = await page.locator(`[data-sq="${sq}"]`).boundingBox(); await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2) };
  await tap('e2'); await tap('e4'); await tap('d7'); await tap('d5');
  await expect(page.locator('.board-piece[data-square="d5"]')).toHaveCount(1);
  await watchFlights(page);
  await tap('e4'); await tap('d5');
  await expect(page.locator('#bottomCaptured .tray-group[data-type="p"] img')).toHaveCount(1);
  await expect(page.locator('#bottomCaptured .tray-lead')).toHaveText('+1');
  await page.waitForTimeout(600);
  expect(await page.evaluate(() => window.__flights.length)).toBe(0);
});
