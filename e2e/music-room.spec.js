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
  await expect(page.locator('#musicSetting option')).toHaveText(['Off', 'Follows the game', 'Dark cinematic', 'Focus', 'Opera', 'Electric', 'Songs', 'Old worlds', 'Everything', 'Liked']);
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

test('a world from Theme Studio: its own theme in the menus at once, and kept', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop theme dialog');
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const worlds = { tracks: [LIBRARY.tracks[0], { id: 'test-rome', title: 'Latrunculi · Test', file: 'test-rome.mp3', station: 'worlds', place: 'lobby', theme: 'rome' }, LIBRARY.tracks[1]] };
  await setup(page, { library: worlds });
  await page.goto('/');
  await page.locator('.hero h1').click();
  await page.locator('#theme').click();
  const now = page.locator('#musicNow');
  // Vanta (no world): a world's theme is not one of the menus' pieces.
  await expect(now).toHaveText('Now playing · Test Beat', { timeout: 8000 });
  await expect(page.locator('#worldSetting option')).toHaveText(['Vanta Chess', 'Mehen · Ancient Egypt', 'Petteia · Ancient Greece', 'Latrunculi · Ancient Rome', 'Liubo · Ancient China', 'Heian · Old Japan', 'Chatrang · Ancient Persia', 'Etemenanki · Babylon', 'Igodomigodo · Kingdom of Benin']);
  await page.locator('#worldSetting').selectOption('rome');
  await expect(now).toHaveText('Now playing · Latrunculi · Test');
  expect(await page.evaluate(() => localStorage.getItem('vch.world'))).toBe('rome');
  // Kept: VCH opened again plays the world's theme in the menus.
  await page.reload();
  await page.locator('.hero h1').click();
  await page.locator('#theme').click();
  await expect(page.locator('#worldSetting')).toHaveValue('rome');
  await expect(now).toHaveText('Now playing · Latrunculi · Test', { timeout: 8000 });
  expect(errors).toEqual([]);
});

test('the now-playing panel: dim until hovered, with Like, Next and Not for me; and the music list', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop: hover');
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const two = { tracks: [LIBRARY.tracks[0], { id: 'test-hall', title: 'Test Hall', file: 'test-hall.mp3', station: 'cinematic', place: 'lobby' }, LIBRARY.tracks[1]] };
  await setup(page, { library: two });
  await page.goto('/');
  await page.locator('.hero h1').click();
  const panel = page.locator('#nowPlaying');
  await expect(panel).toBeVisible({ timeout: 8000 });
  const first = await panel.locator('.np-title').textContent();
  expect(['Test Beat', 'Test Hall']).toContain(first);
  const other = first === 'Test Beat' ? 'Test Hall' : 'Test Beat';
  await expect(panel.locator('.np-next')).toHaveText(`Next · ${other}`);
  // Dim in its corner until the pointer comes to it.
  await page.mouse.move(700, 300);
  await expect.poll(() => panel.evaluate(el => Number(getComputedStyle(el).opacity))).toBeLessThan(0.5);
  await panel.hover();
  await expect.poll(() => panel.evaluate(el => Number(getComputedStyle(el).opacity))).toBeGreaterThan(0.95);
  // Like: kept on this device.
  await panel.locator('[data-np="like"]').click();
  await expect(panel.locator('[data-np="like"]')).toHaveAttribute('aria-pressed', 'true');
  const firstId = first === 'Test Beat' ? 'test-beat' : 'test-hall', otherId = firstId === 'test-beat' ? 'test-hall' : 'test-beat';
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('vch.music.likes')))).toEqual({ liked: [firstId], hidden: [] });
  // Next: the other track. Not for me: it gives way and is remembered.
  await panel.locator('[data-np="next"]').click();
  await expect(panel.locator('.np-title')).toHaveText(other);
  await panel.locator('[data-np="hide"]').click();
  await expect(panel.locator('.np-title')).toHaveText(first);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('vch.music.likes')))).toEqual({ liked: [firstId], hidden: [otherId] });
  // The corner is yours; Off hides the panel.
  await page.locator('#theme').click();
  await page.locator('#nowPlayingSetting').selectOption('tr');
  await expect(panel).toHaveAttribute('data-corner', 'tr');
  await page.locator('#nowPlayingSetting').selectOption('off');
  await expect(panel).toBeHidden();
  await page.locator('#nowPlayingSetting').selectOption('bl');
  // The music list: every track, with its like and its Not for me; Listen plays it now.
  await page.locator('#openMusicList').click();
  const list = page.locator('#dynamicView .music-list');
  await expect(list.locator('.music-row')).toHaveCount(3);
  await expect(list.locator(`[data-track="${firstId}"] [data-music-like]`)).toHaveAttribute('aria-pressed', 'true');
  await expect(list.locator(`[data-track="${otherId}"]`)).toHaveClass(/put-away/);
  await list.locator('[data-track="test-song"] [data-music-play]').click();
  await expect(panel.locator('.np-title')).toHaveText('Test Song');
  await expect(list.locator('[data-track="test-song"] [data-music-play]')).toHaveText('On now');
  expect(errors).toEqual([]);
});

// Nothing plays over anything (owner, 2026-10-14: "when a game starts, the start tune overlaps
// with the currently playing music... Let everything flow naturally"). The test listens to what
// the page actually sends to the speakers: the music is a steady 220 Hz tone and the game-start
// sting a 1760 Hz one, so the two can be told apart in the sound itself.
function toneWav(hz, seconds, rate = 22050) {
  const n = seconds * rate, wav = Buffer.alloc(44 + n * 2);
  wav.write('RIFF', 0); wav.writeUInt32LE(36 + n * 2, 4); wav.write('WAVE', 8); wav.write('fmt ', 12);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
  wav.write('data', 36); wav.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) wav.writeInt16LE(Math.round(0.6 * Math.sin(2 * Math.PI * hz * i / rate) * 32000), 44 + i * 2);
  return wav;
}
test('a sting plays alone: the music fades away first, and comes back once it has rung out', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop: the Sound test from Theme Studio');
  test.setTimeout(60000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    localStorage.setItem('vch.intro-seen', '1'); localStorage.setItem('vanta.flagPrompt', '1'); localStorage.setItem('vch.music', JSON.stringify({ on: true, volume: 0.5 }));
    // Every sound the page sends to the speakers also reaches a listener of the test's own.
    const connect = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function (dest, ...rest) {
      const out = connect.call(this, dest, ...rest);
      if (dest instanceof AudioDestinationNode) {
        const ctx = this.context;
        if (!ctx.__ear) { const a = ctx.createAnalyser(); a.fftSize = 4096; a.smoothingTimeConstant = 0; ctx.__ear = a; (window.__ears ||= []).push(a); }
        connect.call(this, ctx.__ear);
      }
      return out;
    };
    // How loud each tone is (dB), twenty times a second.
    window.__heard = [];
    const level = (a, hz) => { const bins = new Float32Array(a.frequencyBinCount); a.getFloatFrequencyData(bins); const i = Math.round(hz / (a.context.sampleRate / a.fftSize)); return Math.max(bins[i - 1], bins[i], bins[i + 1]); };
    setInterval(() => { const ears = window.__ears || []; if (!ears.length) return; window.__heard.push({ t: performance.now(), music: Math.max(...ears.map(a => level(a, 220))), sting: Math.max(...ears.map(a => level(a, 1760))) }); }, 50);
  });
  await page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', r => r.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ player: { id: 'me' } }) }));
  const tracks = [
    { id: 'test-hall', title: 'Test Hall', file: 'test-hall.mp3', station: 'cinematic', place: 'lobby' },
    { id: 'test-start', title: 'Test Start', file: 'test-start.mp3', place: 'sting', part: 'start', seconds: 3, start: 0, end: 3 },
  ];
  await page.route('**/assets/vch/music/library.json', r => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ tracks }) }));
  const hall = toneWav(220, 40), sting = toneWav(1760, 3);
  await page.route('**/assets/vch/music/test-hall.mp3', r => r.fulfill({ contentType: 'audio/wav', body: hall }));
  await page.route('**/assets/vch/music/test-start.mp3', r => r.fulfill({ contentType: 'audio/wav', body: sting }));
  await page.goto('/');
  await page.locator('.hero h1').click();
  await page.locator('#theme').click();
  await expect(page.locator('#musicNow')).toHaveText('Now playing · Test Hall', { timeout: 8000 });
  await page.locator('#openSoundTest').click();
  const button = page.locator('#dynamicView .sound-test [data-sting="start"]');
  await expect(button).toBeVisible();
  await page.waitForTimeout(2500); // the music settles after the dialog
  const t0 = await page.evaluate(() => performance.now());
  await button.click();
  await page.waitForTimeout(7500);
  const heard = (await page.evaluate(() => window.__heard)).filter(h => h.t >= t0).map(h => ({ ...h, t: (h.t - t0) / 1000 }));
  const on = db => db > -70, both = heard.filter(h => on(h.music) && on(h.sting));
  const stingAt = heard.find(h => on(h.sting))?.t, stingEnd = heard.filter(h => on(h.sting)).at(-1)?.t;
  expect(stingAt, 'the sting plays').toBeDefined();
  expect(heard.find(h => h.t < 0.05)?.music, 'the music was playing').toBeGreaterThan(-70);
  // Never the two together (a sample or two at the very edges, at most).
  expect(both.length, `heard together at ${both.map(h => h.t.toFixed(2)).join(', ')}`).toBeLessThanOrEqual(2);
  expect(heard.filter(h => h.t > stingAt + 0.1 && h.t < stingEnd - 0.1).every(h => !on(h.music)), 'no music under the sting').toBe(true);
  // And the music is back once the sting has rung out.
  expect(heard.filter(h => h.t > stingEnd + 2.5).some(h => on(h.music)), 'the music comes back').toBe(true);
  expect(errors).toEqual([]);
});
