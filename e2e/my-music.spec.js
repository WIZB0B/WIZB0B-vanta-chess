import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

// My music (owner, 2026-10-14: players "add their own songs"): a song file added from the device
// is kept in the browser (never uploaded), played by the service worker from /my-music/<id>, and
// hands over from the music playing without the two sounding together. The test listens to what
// the page sends to the speakers: the library's music is a 220 Hz tone, the player's song 440 Hz.
function toneWav(hz, seconds, rate = 22050) {
  const n = seconds * rate, wav = Buffer.alloc(44 + n * 2);
  wav.write('RIFF', 0); wav.writeUInt32LE(36 + n * 2, 4); wav.write('WAVE', 8); wav.write('fmt ', 12);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
  wav.write('data', 36); wav.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) wav.writeInt16LE(Math.round(0.6 * Math.sin(2 * Math.PI * hz * i / rate) * 32000), 44 + i * 2);
  return wav;
}
async function listen(page) {
  await page.addInitScript(() => {
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
    window.__heard = [];
    const level = (a, hz) => { const bins = new Float32Array(a.frequencyBinCount); a.getFloatFrequencyData(bins); const i = Math.round(hz / (a.context.sampleRate / a.fftSize)); return Math.max(bins[i - 1], bins[i], bins[i + 1]); };
    setInterval(() => { const ears = window.__ears || []; if (!ears.length) return; window.__heard.push({ t: performance.now(), hall: Math.max(...ears.map(a => level(a, 220))), mine: Math.max(...ears.map(a => level(a, 440))) }); }, 50);
  });
}

test('my music: a song from your device is kept on it, plays on the My music station, and can be renamed and removed', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop: the Music list from Theme Studio');
  test.setTimeout(90000);
  const errors = [], uploads = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => { if (r.method() !== 'GET' && !r.url().includes('supabase.co')) uploads.push(r.url()); });
  await page.addInitScript(() => { localStorage.setItem('vch.intro-seen', '1'); localStorage.setItem('vanta.flagPrompt', '1'); if (!localStorage.getItem('vch.music')) localStorage.setItem('vch.music', JSON.stringify({ on: true, volume: 0.5 })); });
  await listen(page);
  await page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', r => r.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ player: { id: 'me' } }) }));
  // The page runs under the site's own Content-Security-Policy (netlify.toml; the local preview is
  // plain http, so without upgrade-insecure-requests): the songs must play without loosening it.
  const csp = /Content-Security-Policy = "([^"]+)"/.exec(readFileSync('netlify.toml', 'utf8'))[1].replace(/;\s*upgrade-insecure-requests/, '');
  await page.route(url => new URL(url).pathname === '/', async r => { const res = await r.fetch(); await r.fulfill({ response: res, headers: { ...res.headers(), 'content-security-policy': csp } }); });
  await page.addInitScript(() => { window.__violations = []; addEventListener('securitypolicyviolation', e => window.__violations.push(`${e.violatedDirective} ${e.blockedURI}`)); });
  const tracks = [{ id: 'test-hall', title: 'Test Hall', file: 'test-hall.mp3', station: 'cinematic', place: 'lobby' }];
  await page.route('**/assets/vch/music/library.json', r => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ tracks }) }));
  const hall = toneWav(220, 60);
  await page.route('**/assets/vch/music/test-hall.mp3', r => r.fulfill({ contentType: 'audio/wav', body: hall }));
  await page.goto('/');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), { timeout: 20000 }).toBe(true);
  await page.locator('.hero h1').click();
  await page.locator('#theme').click();
  await expect(page.locator('#musicNow')).toHaveText('Now playing · Test Hall', { timeout: 8000 });
  await page.locator('#openMusicList').click();
  const mine = page.locator('#dynamicView [data-my-music]');
  await expect(mine).toContainText('No songs yet');
  // Add a song (and a file that is not one).
  await mine.locator('[data-my-file]').setInputFiles([
    { name: '01 - Ocean_Drive.wav', mimeType: 'audio/wav', buffer: toneWav(440, 30) },
    { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('not a song') },
  ]);
  await expect(page.locator('#toast')).toContainText('Added 1 song · notes.txt: not a song file', { timeout: 15000 });
  await expect(mine.locator('.music-row.mine .mr-title')).toHaveText(['Ocean Drive']);
  await expect(mine.locator('.my-music-use')).toContainText('1 song · ');
  expect(uploads, 'nothing is uploaded').toEqual([]);
  // Play it: the hall fades away, then the song, never the two together.
  await page.waitForTimeout(1500);
  const t0 = await page.evaluate(() => performance.now());
  await mine.locator('[data-my-station]').click();
  await expect(page.locator('#musicNow')).toHaveText('Now playing · Ocean Drive', { timeout: 8000 });
  await page.waitForTimeout(4000);
  expect(await page.evaluate(() => window.__violations), "nothing the site's policy blocks").toEqual([]);
  const heard = (await page.evaluate(() => window.__heard)).filter(h => h.t >= t0).map(h => ({ ...h, t: (h.t - t0) / 1000 }));
  const on = db => db > -70;
  expect(heard.find(h => h.t < 0.1)?.hall, 'the hall was playing').toBeGreaterThan(-70);
  const songAt = heard.find(h => on(h.mine))?.t;
  expect(songAt, 'the song plays (served from the device)').toBeDefined();
  const both = heard.filter(h => on(h.hall) && on(h.mine));
  expect(both.length, `heard together at ${both.map(h => h.t.toFixed(2)).join(', ')}`).toBeLessThanOrEqual(2);
  expect(heard.filter(h => h.t > songAt + 0.3).every(h => !on(h.hall)), 'the hall is gone').toBe(true);
  // Renamed: the new name shows at once, and the song plays on.
  await mine.locator('[data-my-rename]').click();
  await mine.locator('.mr-rename').fill('Night Drive');
  await mine.locator('.mr-rename').press('Enter');
  await expect(mine.locator('.music-row.mine .mr-title')).toHaveText(['Night Drive']);
  await expect(page.locator('#musicNow')).toHaveText('Now playing · Night Drive');
  // Kept on the device: after a reload it is still there and the station plays it.
  await page.reload();
  await page.locator('.hero h1').click();
  await expect(page.locator('#musicNow')).toHaveText('Now playing · Night Drive', { timeout: 15000 });
  await page.locator('#theme').click();
  await page.locator('#openMusicList').click();
  // Removed, and put back with Undo.
  await mine.locator('[data-my-remove]').click();
  await expect(mine.locator('.music-row.mine')).toHaveCount(0);
  await expect(mine).toContainText('No songs yet');
  await page.locator('#toast .toast-action').click();
  await expect(mine.locator('.music-row.mine .mr-title')).toHaveText(['Night Drive']);
  expect(uploads, 'nothing is uploaded').toEqual([]);
  expect(errors).toEqual([]);
});
