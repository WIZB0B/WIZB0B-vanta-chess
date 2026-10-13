import { test, expect } from '@playwright/test';
import { mockBackend } from './board-helpers.js';

// The sound effects (src/sfx.js; public/assets/vch/sfx/): the real recorded sounds load, decode
// and play: the interface's on every screen change, press, dialog and switch, each piece's on its
// move, and every one of them in the Sound test. The page notes each recorded sound it starts
// (its length in milliseconds, which tells which sound it was).
const setup = async page => {
  await mockBackend(page);
  await page.addInitScript(() => {
    localStorage.setItem('vanta.flagPrompt', '1');
    window.__sfx = [];
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args) { if (this.buffer?.duration > 0.04) window.__sfx.push(Math.round(this.buffer.duration * 1000)); return start.apply(this, args); };
  });
};
const count = page => page.evaluate(() => window.__sfx.length);
const since = (page, n) => page.evaluate(n => window.__sfx.slice(n), n);
const lengthsOf = async page => { const m = JSON.parse(await (await page.request.get('/assets/vch/sfx/sfx.json')).text()); return (set, name) => Math.round(m.sets[set].sounds[name].seconds * 1000); };
const near = (list, ms) => list.some(x => Math.abs(x - ms) <= 25);

test('every sound in the Sound test is a real recording that plays', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop theme dialog');
  test.setTimeout(90000); // thirty sounds, one after another
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await setup(page);
  await page.goto('/');
  await page.locator('.hero h1').click();
  await page.locator('#theme').click();
  await expect(page.locator('#pieceSoundSetting option')).toHaveText(['Wood', 'Crystal', 'Tidal', 'Gilded', 'Ember', 'Match my relic set', 'Classic']);
  await expect(page.locator('#uiSoundSetting')).toBeChecked();
  await expect(page.locator('#musicSetting option')).toHaveText(['Off', 'Follows the game', 'Dark cinematic', 'Focus', 'Opera', 'Electric', 'Songs', 'Everything']);
  await page.locator('#openSoundTest').click();
  const view = page.locator('#dynamicView .sound-test');
  await expect(view.locator('[data-ui-sound]')).toHaveCount(17);
  await expect(view.locator('[data-piece-sound]')).toHaveCount(12);
  await expect(view.locator('[data-sting]')).toHaveCount(12);
  const ms = await lengthsOf(page);
  // Each interface sound and each wooden piece's, one after another: the right recording each time.
  for (const [set, attr, names] of [['ui', 'data-ui-sound', await view.locator('[data-ui-sound]').evaluateAll(b => b.map(x => x.dataset.uiSound))], ['wood', 'data-piece-sound', await view.locator('[data-piece-sound]').evaluateAll(b => b.map(x => x.dataset.pieceSound))]]) {
    for (const name of names) {
      const n = await count(page);
      await view.locator(`[${attr}="${name}"]`).click();
      await expect.poll(() => since(page, n), { message: `${set} ${name}` }).toContainEqual(expect.any(Number));
      expect(near(await since(page, n), ms(set, name)), `${set} ${name}`).toBe(true);
    }
  }
  // Another set: its own recordings.
  await view.locator('[data-sound-set]').selectOption('crystal');
  const n = await count(page);
  await view.locator('[data-piece-sound="promote"]').click();
  await expect.poll(async () => near(await since(page, n), ms('crystal', 'promote'))).toBe(true);
  expect(errors).toEqual([]);
});

test('a new screen turns a page, a dialog opens, a switch clicks, and a move sounds like its piece', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop navigation');
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await setup(page);
  const loaded = new Set();
  page.on('requestfinished', r => { const m = /\/assets\/vch\/sfx\/(.+\.mp3)$/.exec(r.url()); if (m) loaded.add(m[1]); });
  await page.goto('/');
  await page.locator('.hero h1').click(); // the first touch: the sounds load while the page is idle
  await expect.poll(() => loaded.size, { timeout: 20000 }).toBeGreaterThanOrEqual(29); // the interface's and the wooden pieces'
  const ms = await lengthsOf(page);
  // A new screen: the page turning (not the tap that led there).
  let n = await count(page);
  await page.locator('.main-nav [data-nav="puzzles"]').click();
  await expect.poll(async () => near(await since(page, n), ms('ui', 'page'))).toBe(true);
  expect(near(await since(page, n), ms('ui', 'tap'))).toBe(false);
  // Back.
  n = await count(page);
  await page.goBack();
  await expect.poll(async () => near(await since(page, n), ms('ui', 'back'))).toBe(true);
  // A dialog opens; a switch clicks.
  n = await count(page);
  await page.locator('#theme').click();
  await expect.poll(async () => near(await since(page, n), ms('ui', 'open'))).toBe(true);
  n = await count(page);
  await page.locator('#speakMoves').check();
  await expect.poll(async () => near(await since(page, n), ms('ui', 'toggle-on'))).toBe(true);
  await page.locator('#speakMoves').uncheck();
  // Interface sounds off: the dialog closes quietly, and screens change quietly.
  await page.locator('#uiSoundSetting').uncheck();
  await page.waitForTimeout(150); n = await count(page);
  await page.locator('#closeTheme').click();
  await page.locator('.main-nav [data-nav="learn"]').click();
  await page.waitForTimeout(400);
  expect(await since(page, n)).toEqual([]);
  // A move still sounds: the pawn's knock.
  await page.locator('.main-nav [data-nav="play"]').click();
  const tap = async sq => { const b = await page.locator(`[data-sq="${sq}"]`).boundingBox(); await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2); };
  n = await count(page);
  await tap('e2'); await tap('e4');
  await expect(page.locator('.board-piece[data-square="e4"]')).toHaveCount(1);
  await expect.poll(async () => near(await since(page, n), ms('wood', 'pawn'))).toBe(true);
  expect(errors).toEqual([]);
});
