import { test, expect } from '@playwright/test';

// Resonance (src/resonance.js): Chladni figures in sand on the board and in the Resonance room.
test('Resonance: the setting puts sand on the board, and the room plays the music library', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop layout; the same code runs on phones');
  test.setTimeout(60000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => { localStorage.setItem('vch.intro-seen', '1'); localStorage.setItem('vanta.flagPrompt', '1') });
  await page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', r => r.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ player: { id: 'me' } }) }));
  await page.goto('/');
  await expect(page.locator('#board canvas.resonance-layer')).toHaveCount(0, { timeout: 2000 });
  await page.locator('#theme').click();
  await page.locator('#resonanceSetting').selectOption('vivid');
  await page.locator('#closeTheme').click();
  await expect(page.locator('#board canvas.resonance-layer')).toHaveCount(1);
  await expect(page.locator('#board')).toHaveAttribute('data-resonance', 'vivid');
  expect(await page.evaluate(() => localStorage.getItem('vch.resonance'))).toBe('vivid');
  // The sand is painted (not an empty canvas), under the pieces and never in the way of a click.
  await page.locator('[data-mode="computer"]').click();
  await page.locator('#computerStart').click();
  const tap = async sq => { const b = await page.locator(`[data-sq="${sq}"]`).boundingBox(); await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2) };
  await tap('e2'); await tap('e4');
  await expect(page.locator('.board-piece[data-square="e4"]')).toHaveCount(1);
  await expect.poll(() => page.evaluate(() => { const c = document.querySelector('#board canvas.resonance-layer'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let lit = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) lit++; return lit; }), { timeout: 8000 }).toBeGreaterThan(500);
  expect(await page.locator('#board canvas.resonance-layer').evaluate(c => getComputedStyle(c).pointerEvents)).toBe('none');
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
  // Off removes the layer.
  await page.locator('#theme').click();
  await page.locator('#resonanceSetting').selectOption('off');
  await page.locator('#closeTheme').click();
  await expect(page.locator('#board canvas.resonance-layer')).toHaveCount(0);
  expect(errors).toEqual([]);
});
