import { test, expect } from '@playwright/test';

// Resonance (src/resonance.js): Chladni figures in sand behind the page, never on the board, and
// big in the Resonance room (the music library).
const mockSupabase = page => page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', r => r.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ player: { id: 'me' } }) }));
const sandPixels = page => page.evaluate(() => { const c = document.querySelector('#resonanceBg canvas'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let lit = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) lit++; return lit; });
const sandImage = page => page.evaluate(() => document.querySelector('#resonanceBg canvas').toDataURL());

test('Resonance: a still background behind the page, untouched by moves; the room plays the music library', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop layout; the same code runs on phones');
  test.setTimeout(60000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => { localStorage.setItem('vch.intro-seen', '1'); localStorage.setItem('vanta.flagPrompt', '1') });
  await mockSupabase(page);
  await page.goto('/');
  await expect(page.locator('#resonanceBg')).toHaveCount(0);
  await page.locator('#theme').click();
  await page.locator('#resonanceSetting').selectOption('on');
  await page.locator('#closeTheme').click();
  const layer = page.locator('#resonanceBg');
  await expect(layer).toHaveAttribute('data-ready', '1', { timeout: 8000 });
  expect(await page.evaluate(() => localStorage.getItem('vch.resonance'))).toBe('on');
  // Behind everything, fixed to the window, never in the way of a click, and nothing on the board.
  expect(await layer.evaluate(el => { const s = getComputedStyle(el); return [s.position, s.zIndex, s.pointerEvents, el.parentElement === document.body]; })).toEqual(['fixed', '-2', 'none', true]);
  await expect(page.locator('#board canvas')).toHaveCount(0);
  expect(await sandPixels(page)).toBeGreaterThan(2000);
  // A move does not move the sand (with the music off it rests on the theme's figure).
  await page.locator('[data-mode="computer"]').click();
  await page.locator('#computerStart').click();
  const before = await sandImage(page);
  const tap = async sq => { const b = await page.locator(`[data-sq="${sq}"]`).boundingBox(); await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2) };
  await tap('e2'); await tap('e4');
  await expect(page.locator('.board-piece[data-square="e4"]')).toHaveCount(1);
  await expect.poll(() => page.locator('#moves .move-pair-row').count(), { timeout: 20000 }).toBe(1);
  await page.waitForTimeout(1500);
  expect(await sandImage(page)).toBe(before);
  // A new theme (a relic set) has its own figure: the sand drifts to it, then rests again.
  await page.evaluate(() => localStorage.setItem('vch.relics', JSON.stringify({ unlocked: { ember: '2026-10-13T00:00:00Z' }, equipped: 'ember' })));
  await expect.poll(async () => (await sandImage(page)) !== before, { timeout: 6000 }).toBe(true);
  await page.waitForTimeout(4500);
  const settled = await sandImage(page);
  await page.waitForTimeout(800);
  expect(await sandImage(page)).toBe(settled);
  // The room: seven themes, one at a time, and a Play button for the score.
  await page.locator('#theme').click();
  await page.locator('#openResonance').click();
  await expect(page.locator('.resonance-room')).toBeVisible();
  await expect(page.locator('[data-resonance-theme]')).toHaveCount(7);
  await page.locator('[data-resonance-theme="ember"]').click();
  await expect(page.locator('[data-resonance-theme="ember"]')).toHaveClass(/on/);
  await expect(page.locator('[data-resonance-theme].on')).toHaveCount(1);
  await page.locator('.resonance-play').click();
  await expect(page.locator('.resonance-play')).toHaveText('Stop');
  await expect(page.locator('.resonance-readout b')).toContainText('Mode', { timeout: 4000 });
  await page.locator('.resonance-play').click();
  await expect(page.locator('.resonance-play')).toHaveText('Play');
  // Off removes the background.
  await page.locator('#theme').click();
  await page.locator('#resonanceSetting').selectOption('off');
  await page.locator('#closeTheme').click();
  await expect(layer).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('Resonance: the board setting of an earlier build becomes the background, on phones too', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => { localStorage.setItem('vch.intro-seen', '1'); localStorage.setItem('vanta.flagPrompt', '1'); localStorage.setItem('vch.resonance', 'vivid') });
  await mockSupabase(page);
  await page.goto('/');
  await expect(page.locator('#resonanceBg')).toHaveAttribute('data-ready', '1', { timeout: 8000 });
  expect(await page.locator('#resonanceSetting').evaluate(s => s.value)).toBe('on');
  expect(await sandPixels(page)).toBeGreaterThan(1000);
  await expect(page.locator('#board canvas')).toHaveCount(0);
  expect(errors).toEqual([]);
});
