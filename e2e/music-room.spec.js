import { test, expect } from '@playwright/test';

// The cinematic score (src/music.js) and the room that follows it (src/main.js roomPulse).
const setup = async (page, music = true) => {
  await page.addInitScript(on => { localStorage.setItem('vch.intro-seen', '1'); localStorage.setItem('vanta.flagPrompt', '1'); localStorage.setItem('vch.music', JSON.stringify({ on, volume: 0.4 })) }, music);
  await page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', r => r.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ player: { id: 'me' } }) }));
};

test('with Music on the score plays between games too, and the board glows with its chords', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop: the board is on the first screen');
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await setup(page);
  await page.goto('/');
  // Browsers start sound only after a tap.
  await page.locator('.hero h1').click();
  await expect(page.locator('.board-shell.with-aura .board-aura')).toHaveCount(1, { timeout: 8000 });
  // It keeps time: the glow comes and goes with the chords.
  await expect.poll(() => page.evaluate(() => document.querySelector('.board-aura').getAnimations().length), { timeout: 12000 }).toBeGreaterThan(0);
  // A move is heard where it lands (no errors from the 3D knock), and the music carries on.
  const tap = async sq => { const b = await page.locator(`[data-sq="${sq}"]`).boundingBox(); await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2) };
  await tap('e2'); await tap('e4');
  await expect(page.locator('.board-piece[data-square="e4"]')).toHaveCount(1);
  await page.waitForTimeout(400);
  expect(errors).toEqual([]);
});

test('Music off, or reduced motion: no glow round the board', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop: the board is on the first screen');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await setup(page);
  await page.goto('/');
  await page.locator('.hero h1').click();
  await page.waitForTimeout(2500);
  await expect(page.locator('.board-aura')).toHaveCount(0);
});
