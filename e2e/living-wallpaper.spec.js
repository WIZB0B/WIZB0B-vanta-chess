import { test, expect } from '@playwright/test';

// The living wallpaper (src/wallpaper-lights.js) and glass that clears (owner, 2026-10-13).
const setup = async page => {
  await page.addInitScript(() => { localStorage.setItem('vch.intro-seen', '1'); localStorage.setItem('vanta.flagPrompt', '1') });
  await page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', r => r.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ player: { id: 'me' } }) }));
};

test('the candles in the wallpaper flicker, answer a move, and go out with the living atmosphere', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop layout; the phone layout has its own check below');
  test.setTimeout(60000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await setup(page);
  await page.goto('/');
  const layer = page.locator('#wallLights');
  await expect(layer).toHaveCount(1);
  expect(await layer.evaluate(el => ({ n: el.children.length, pe: getComputedStyle(el).pointerEvents, under: el.nextElementSibling?.id, running: [...el.querySelectorAll('b')].filter(b => b.getAnimations().length).length })))
    .toEqual(expect.objectContaining({ pe: 'none', under: 'atmosphere' }));
  expect(await layer.evaluate(el => el.children.length)).toBeGreaterThan(20);
  expect(await layer.evaluate(el => [...el.querySelectorAll('b')].every(b => b.getAnimations().length > 0))).toBe(true);
  // Every light sits on the screen (the picture covers the window).
  expect(await layer.evaluate(el => [...el.children].every(i => { const r = i.getBoundingClientRect(), c = [r.x + r.width / 2, r.y + r.height / 2]; return c[0] > -r.width && c[0] < innerWidth + r.width && c[1] > -r.height && c[1] < innerHeight + r.height; }))).toBe(true);
  // A move in a live game: the room breathes.
  await page.locator('[data-mode="computer"]').click();
  await page.locator('#computerStart').click();
  const tap = async sq => { const b = await page.locator(`[data-sq="${sq}"]`).boundingBox(); await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2) };
  await tap('e2'); await tap('e4');
  await expect(layer).toHaveAttribute('data-react', /breath|gutter|flare/, { timeout: 5000 });
  // The pointer stirs the flames it passes.
  const lit = await layer.evaluate(el => { const i = el.children[0].getBoundingClientRect(); return [i.x + i.width / 2, i.y + i.height / 2]; });
  await page.mouse.move(lit[0] - 30, lit[1]); await page.mouse.move(lit[0] + 5, lit[1] + 2, { steps: 4 });
  await expect(page.locator('#wallLights i.stir').first()).toBeAttached({ timeout: 2000 });
  // Living atmosphere Off: no candles.
  await page.locator('#theme').click();
  await page.locator('#atmosphereSetting').selectOption('off');
  await page.locator('#closeTheme').click();
  await expect(layer).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('glass that clears: the cards in the panels let the room through, and the blur thins', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop panels');
  await setup(page);
  await page.goto('/');
  const read = () => page.evaluate(() => {
    const a = c => { const m = /rgba?\(([^)]+)\)/.exec(c); if (!m) return 0; const p = m[1].split(/[ ,/]+/).filter(Boolean); return p.length > 3 ? Number(p[3]) : 1; };
    return { glass: document.documentElement.dataset.glass, moves: a(getComputedStyle(document.querySelector('#moves')).backgroundColor), blur: getComputedStyle(document.querySelector('.rpanel')).backdropFilter };
  });
  const before = await read();
  await page.locator('#theme').click();
  await page.locator('[data-theme="--glass"]').fill('20');
  await page.locator('[data-theme="--glass"]').dispatchEvent('input');
  await page.locator('#closeTheme').click();
  const after = await read();
  expect(before.glass).toBe('solid');
  expect(after.glass).toBe('clear');
  expect(after.moves).toBeLessThan(0.15);
  expect(after.blur).toMatch(/blur\(([3-5](\.\d+)?)px\)/);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('vanta.theme'))['--glass'])).toBe('0.2');
});

test('on a phone the candles follow the picture: fixed with it, or scrolling with it', async ({ page }) => {
  test.skip(test.info().project.name !== 'mobile', 'Phone layout');
  await setup(page);
  await page.goto('/');
  const layer = page.locator('#wallLights');
  await expect(layer).toHaveCount(1);
  const got = await layer.evaluate(el => ({ fixedPicture: /fixed/.test(getComputedStyle(document.body).backgroundAttachment), pos: getComputedStyle(el).position, wide: Math.abs(el.offsetWidth - (el.classList.contains('scroll') ? document.body.clientWidth : innerWidth)) <= 1 }));
  expect(got.pos).toBe(got.fixedPicture ? 'fixed' : 'absolute');
  expect(got.wide).toBe(true);
  expect(await layer.evaluate(el => el.children.length)).toBeGreaterThan(5);
});
