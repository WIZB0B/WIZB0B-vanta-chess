import { test, expect } from '@playwright/test';

// Round 13: a second open-source engine. Lozza 2.5 plays the campaign's guards from the Mirror
// Court on, in its own worker, under the same strict CSP; no engine is named on screen.
const CAMPAIGN_TO_MIRROR_COURT = { won: { 'ashen-0': { stars: 1 }, 'ashen-1': { stars: 1 }, 'ashen-2': { stars: 1 }, 'tidal-0': { stars: 1 }, 'tidal-1': { stars: 1 }, 'tidal-2': { stars: 1 } } };
test('Lozza 2.5 plays a campaign guard in its own worker', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop layout; the engine is the same on phones');
  test.setTimeout(60000);
  await page.addInitScript(st => { localStorage.setItem('vch.intro-seen', '1'); localStorage.setItem('vanta.flagPrompt', '1'); localStorage.setItem('vch.campaign', JSON.stringify(st)) }, CAMPAIGN_TO_MIRROR_COURT);
  await page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', route => route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ player: { id: 'me' }, bots: [] }) }));
  const loaded = [];
  page.on('request', r => { const u = new URL(r.url()); if (/lozza|stockfish/.test(u.pathname)) loaded.push(u.pathname) });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && /Content Security Policy|lozza/i.test(m.text())) errors.push(m.text()) });
  await page.goto('/');
  await page.locator('[data-mode="computer"]').click();
  await page.locator('.computer-campaign').click();
  // The Glass Page: the Mirror Court's first guard; you play White.
  await page.locator('.camp-realm[data-realm="court"] .camp-fight').first().click();
  const tap = async sq => { const b = await page.locator(`[data-sq="${sq}"]`).boundingBox(); await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2) };
  await tap('e2'); await tap('e4');
  await expect.poll(async () => page.locator('#moves .move-pair-row').count(), { timeout: 20000 }).toBe(1);
  await expect(page.locator('#turn')).toContainText('White to move', { timeout: 20000 });
  expect(loaded).toContain('/lozza.worker.js');
  // The engine itself loads inside that worker (newer Chromium doesn't report a nested worker's
  // request to the page), so check that it is served.
  expect(await page.evaluate(async () => (await fetch('/engines/lozza-2.5.js', { method: 'HEAD' })).status)).toBe(200);
  expect(errors).toEqual([]);
});

test('the campaign names no engine', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop layout');
  await page.addInitScript(() => { localStorage.setItem('vch.intro-seen', '1'); localStorage.setItem('vanta.flagPrompt', '1') });
  await page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', route => route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ player: { id: 'me' } }) }));
  await page.goto('/');
  await page.locator('[data-mode="computer"]').click();
  await page.locator('.computer-campaign').click();
  await expect(page.locator('.camp-realm')).toHaveCount(5);
  await expect(page.locator('.camp-map')).toContainText('The Glass Page');
  await expect(page.locator('.camp-map')).not.toContainText(/Stockfish|Lozza/);
});

test('hovering a section, a way to play or a variant explains it', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Hover is for mouse users; phones show labels');
  await page.addInitScript(() => { localStorage.setItem('vch.intro-seen', '1'); localStorage.setItem('vanta.flagPrompt', '1') });
  await page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', route => route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ player: { id: 'me' } }) }));
  await page.goto('/');
  const card = page.locator('#hoverGuide');
  await page.locator('[data-nav="arena"]').hover();
  await expect(card).toBeVisible();
  await expect(card.locator('b')).toHaveText('Arena');
  await expect(card).toContainText('Tournaments');
  await expect(page.locator('[data-nav="arena"]')).toHaveAttribute('aria-describedby', 'hoverGuide');
  await page.locator('[data-mode="match"]').click();
  await page.locator('[data-match-variant="dark"]').hover();
  await expect(card.locator('b')).toHaveText('Vanta Dark');
  await expect(page.locator('[data-match-variant="dark"]')).not.toHaveAttribute('title', /./, { timeout: 2000 });
  await page.locator('[data-match-time="180-0"]').hover();
  await expect(card.locator('b')).toHaveText('Blitz · 3+0');
  await page.mouse.move(5, 700);
  await page.mouse.down(); await page.mouse.up();
  await expect(card).toBeHidden();
  await expect(page.locator('[data-match-variant="dark"]')).toHaveAttribute('title', /Fog of war/);
});
