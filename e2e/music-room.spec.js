import { test, expect } from '@playwright/test';

// The music (src/music.js plays the tracks public/assets/vch/music/library.json lists) and the
// room that follows it (src/main.js roomPulse). The tests serve their own small library: a drum
// track made here (a kick every half second over a soft chord), so the room has a beat to follow.
function drumTrack(seconds = 30, rate = 22050) {
  const n = seconds * rate, wav = Buffer.alloc(44 + n * 2);
  wav.write('RIFF', 0); wav.writeUInt32LE(36 + n * 2, 4); wav.write('WAVE', 8); wav.write('fmt ', 12);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
  wav.write('data', 36); wav.writeUInt32LE(n * 2, 40);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / rate, beat = t % 0.5;
    phase += 2 * Math.PI * (50 + 110 * Math.exp(-beat * 35)) / rate;
    const kick = Math.sin(phase) * Math.exp(-beat * 10), pad = 0.1 * Math.sin(2 * Math.PI * 220 * t) + 0.07 * Math.sin(2 * Math.PI * 277.2 * t);
    wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, 0.75 * kick + pad)) * 32000), 44 + i * 2);
  }
  return wav;
}
const LIBRARY = { tracks: [
  { id: 'test-beat', title: 'Test Beat', file: 'test-beat.mp3', station: 'cinematic', place: 'lobby' },
  { id: 'test-song', title: 'Test Song', file: 'test-song.mp3', station: 'songs', place: 'focus' },
] };
const setup = async (page, { music = true, library = LIBRARY } = {}) => {
  await page.addInitScript(on => { localStorage.setItem('vch.intro-seen', '1'); localStorage.setItem('vanta.flagPrompt', '1'); localStorage.setItem('vch.music', JSON.stringify({ on, volume: 0.4 })) }, music);
  await page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', r => r.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ player: { id: 'me' } }) }));
  await page.route('**/assets/vch/music/library.json', r => r.fulfill({ contentType: 'application/json', body: JSON.stringify(library) }));
  const wav = drumTrack();
  await page.route('**/assets/vch/music/*.mp3', r => r.fulfill({ contentType: 'audio/wav', body: wav }));
};

test('with Music on the music plays, the board glows with its beat, and a station plays its own', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop: the board is on the first screen');
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await setup(page);
  await page.goto('/');
  // Browsers start sound only after a tap.
  await page.locator('.hero h1').click();
  await expect(page.locator('.board-shell.with-aura .board-aura')).toHaveCount(1, { timeout: 8000 });
  // The player hears each drum stroke, and each one lights the glow again.
  const pulses = await page.evaluate(() => new Promise(resolve => {
    const seen = new Set(), aura = document.querySelector('.board-aura'), t0 = performance.now();
    const look = () => { for (const a of aura.getAnimations()) seen.add(a); if (performance.now() - t0 > 4500) resolve(seen.size); else requestAnimationFrame(look); };
    look();
  }));
  expect(pulses).toBeGreaterThan(3);
  // The Theme Studio says what is playing; a station plays its own tracks.
  await page.locator('#theme').click();
  await expect(page.locator('#musicNow')).toHaveText('Now playing · Test Beat');
  await expect(page.locator('#musicSetting option')).toHaveText(['Off', 'Follows the game', 'Dark cinematic', 'Focus', 'Opera', 'Electric', 'Songs', 'Everything']);
  await page.locator('#musicSetting').selectOption('songs');
  await expect(page.locator('#musicNow')).toHaveText('Now playing · Test Song');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('vch.music')))).toMatchObject({ on: true, station: 'songs' });
  await page.locator('#closeTheme').click();
  // A move is heard where it lands (no errors from the 3D knock), and the music carries on.
  const tap = async sq => { const b = await page.locator(`[data-sq="${sq}"]`).boundingBox(); await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2) };
  await tap('e2'); await tap('e4');
  await expect(page.locator('.board-piece[data-square="e4"]')).toHaveCount(1);
  await page.waitForTimeout(400);
  expect(errors).toEqual([]);
});

test('the music waits a moment to be sure you are staying, then turns to where you are', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop: the Relic sets from Theme Studio');
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  // The test beat is 120 BPM (a kick every half second), its first downbeat at the start.
  await setup(page, { library: { tracks: [{ ...LIBRARY.tracks[0], bpm: 120, beat: 0 }, LIBRARY.tracks[1], { id: 'test-relic', title: 'Test Relic', file: 'test-relic.mp3', station: 'cinematic', place: 'skin', bpm: 120, beat: 0 }] } });
  await page.goto('/');
  await page.locator('.hero h1').click();
  const now = page.locator('#musicNow');
  await expect(now).toHaveText('Now playing · Test Beat', { timeout: 8000 });
  // Passing through the Relic sets and straight back: the music stays.
  await page.locator('#theme').click(); await page.locator('#openRelics').click();
  await page.locator('#dynamicView .back-view').click();
  await page.waitForTimeout(2500);
  await expect(now).toHaveText('Now playing · Test Beat');
  // Staying: after a moment, the Relic sets' own music.
  await page.locator('#theme').click(); await page.locator('#openRelics').click();
  const t0 = Date.now();
  await expect(now).toHaveText('Now playing · Test Relic', { timeout: 8000 });
  expect(Date.now() - t0).toBeGreaterThan(900);
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

test('before the library has music, the setting says it is on its way', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop theme dialog');
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await setup(page, { library: { tracks: [] } });
  await page.goto('/');
  await page.locator('.hero h1').click();
  await page.locator('#theme').click();
  await expect(page.locator('#musicNow')).toHaveText('The music library is on its way');
  await page.locator('#musicSetting').selectOption('off');
  await expect(page.locator('#musicNow')).toHaveText('');
  expect(errors).toEqual([]);
});
