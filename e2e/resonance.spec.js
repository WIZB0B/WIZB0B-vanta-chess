import { test, expect } from '@playwright/test';

// Resonance (src/resonance.js): Chladni figures in sand behind the page, never on the board, that
// answer the game, the pointer and the music; and big in the Resonance room (the music library).
// The room plays the music library; the browsers Playwright runs cannot play its AAC files, so
// the test serves a small library of its own: a tone with a beat, as WAV under an .mp3 name.
function toneTrack(seconds = 20, rate = 22050) {
  const n = seconds * rate, wav = Buffer.alloc(44 + n * 2);
  wav.write('RIFF', 0); wav.writeUInt32LE(36 + n * 2, 4); wav.write('WAVE', 8); wav.write('fmt ', 12);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
  wav.write('data', 36); wav.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) { const t = i / rate, beat = t % 0.5; wav.writeInt16LE(Math.round((0.5 * Math.sin(2 * Math.PI * 110 * t) * Math.exp(-beat * 6) + 0.15 * Math.sin(2 * Math.PI * 330 * t)) * 30000), 44 + i * 2); }
  return wav;
}
const mockLibrary = async page => {
  const tracks = ['calm', 'tense', 'storm'].map(part => ({ id: `test-ember-${part}`, title: `Test Ember ${part}`, file: `test-ember-${part}.mp3`, station: 'cinematic', place: 'game', part, theme: 'ember', bpm: 120, beat: 0 }));
  tracks.push({ id: 'test-hall', title: 'Test Hall', file: 'test-hall.mp3', station: 'cinematic', place: 'lobby', bpm: 120, beat: 0 });
  await page.route('**/assets/vch/music/library.json', r => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ tracks }) }));
  const wav = toneTrack();
  await page.route('**/assets/vch/music/*.mp3', r => r.fulfill({ contentType: 'audio/wav', body: wav }));
};
const mockSupabase = page => page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', r => r.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ player: { id: 'me' } }) }));
const sandPixels = page => page.evaluate(() => { const c = document.querySelector('#resonanceBg .resonance-sand'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let lit = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) lit++; return lit; });
const sandImage = page => page.evaluate(() => document.querySelector('#resonanceBg .resonance-sand').toDataURL());
// The sand at rest: nothing answering, and the same picture twice, 400ms apart (a slow swell
// crosses it now and then on its own).
const restingImage = async page => {
  let last = null;
  for (let k = 0; k < 90; k++) {
    const s = await page.evaluate(() => ({ active: !!document.querySelector('#resonanceBg').dataset.active, url: document.querySelector('#resonanceBg .resonance-sand').toDataURL() }));
    if (!s.active && s.url === last) return s.url;
    last = s.active ? null : s.url;
    await page.waitForTimeout(400);
  }
  throw new Error('the sand never came to rest');
};

test('Resonance: a living background behind the page that rings with each move and parts under the pointer; the room plays the music library', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop layout; the same code runs on phones');
  test.setTimeout(120000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => { localStorage.setItem('vch.intro-seen', '1'); localStorage.setItem('vanta.flagPrompt', '1') });
  await mockSupabase(page);
  await mockLibrary(page);
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
  expect(await layer.evaluate(el => [...el.querySelectorAll('canvas')].map(c => c.className))).toEqual(['resonance-glow', 'resonance-sand']);
  expect(await sandPixels(page)).toBeGreaterThan(2000);
  // A move rings out through the sand as the piece lands, then the sand lies exactly as it lay
  // (with the music off and no capture, the figure stays the theme's).
  await page.locator('[data-mode="computer"]').click();
  await page.locator('#computerStart').click();
  const before = await restingImage(page);
  const tap = async sq => { const b = await page.locator(`[data-sq="${sq}"]`).boundingBox(); await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2) };
  await tap('e2'); await tap('e4');
  await expect(page.locator('.board-piece[data-square="e4"]')).toHaveCount(1);
  await expect(layer).toHaveAttribute('data-react', 'move', { timeout: 5000 });
  await expect(layer).toHaveAttribute('data-active', '1');
  await expect.poll(() => page.locator('#moves .move-pair-row').count(), { timeout: 20000 }).toBe(1);
  await expect.poll(async () => Number(await layer.getAttribute('data-rings')), { timeout: 5000 }).toBe(2); // the reply rings too
  expect(await restingImage(page)).toBe(before);
  // The pointer parts the sand where it shows (the gap beside the panels), and it flows back.
  await page.mouse.move(6, 200);
  for (let y = 200; y <= 560; y += 24) await page.mouse.move(6 + (y % 48 ? 4 : 0), y);
  await expect(layer).toHaveAttribute('data-active', '1');
  expect(await sandImage(page)).not.toBe(before);
  await page.mouse.move(640, 360); // over the board: nothing
  expect(await restingImage(page)).toBe(before);
  // A new theme (a relic set) has its own figure: the sand drifts to it, then rests again.
  await page.evaluate(() => localStorage.setItem('vch.relics', JSON.stringify({ unlocked: { ember: '2026-10-13T00:00:00Z' }, equipped: 'ember' })));
  await expect.poll(async () => (await sandImage(page)) !== before, { timeout: 6000 }).toBe(true);
  expect(await restingImage(page)).not.toBe(before);
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

test('Resonance in the dark: your moves ring from where they land, the hidden opponent\'s from the middle of the board', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop layout; the same code runs on phones');
  test.setTimeout(60000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => { localStorage.setItem('vch.intro-seen', '1'); localStorage.setItem('vanta.flagPrompt', '1'); localStorage.setItem('vch.resonance', 'on') });
  await mockSupabase(page);
  await page.goto('/');
  const layer = page.locator('#resonanceBg');
  await expect(layer).toHaveAttribute('data-ready', '1', { timeout: 8000 });
  await page.locator('[data-mode="computer"]').click();
  await page.locator('[data-computer-variant="dark"]').click();
  await page.locator('#computerStart').click();
  const tap = async sq => { const b = await page.locator(`[data-sq="${sq}"]`).boundingBox(); await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2) };
  await tap('e2'); await tap('e4');
  await expect(layer).toHaveAttribute('data-react', 'move', { timeout: 5000 });
  await expect(layer).toHaveAttribute('data-react', 'hidden', { timeout: 20000 });
  expect(errors).toEqual([]);
});
