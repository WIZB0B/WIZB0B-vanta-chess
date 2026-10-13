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
  const layer = page.locator('canvas#wallLights');
  await expect(layer).toHaveCount(1);
  expect(await layer.evaluate(el => ({ pe: getComputedStyle(el).pointerEvents, under: el.nextElementSibling?.id, half: el.width === Math.ceil(innerWidth / 2) })))
    .toEqual({ pe: 'none', under: 'atmosphere', half: true });
  expect(Number(await layer.getAttribute('data-lights'))).toBeGreaterThan(20);
  // The glows are drawn, and they flicker: the picture changes from one moment to the next.
  const snap = () => layer.evaluate(el => { const d = el.getContext('2d').getImageData(0, 0, el.width, el.height).data; let lit = 0, sum = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) { lit++; sum += d[i]; } return { lit, sum }; });
  const a = await snap(); await page.waitForTimeout(400); const b = await snap();
  expect(a.lit).toBeGreaterThan(2000);
  expect(b.sum).not.toBe(a.sum);
  // A move in a live game: the room answers as the piece lands.
  await page.locator('[data-mode="computer"]').click();
  await page.locator('#computerStart').click();
  const tap = async sq => { const r = await page.locator(`[data-sq="${sq}"]`).boundingBox(); await page.mouse.click(r.x + r.width / 2, r.y + r.height / 2) };
  await tap('e2'); await tap('e4');
  await expect(layer).toHaveAttribute('data-react', /breath|gutter|flare/, { timeout: 5000 });
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
  expect(Number(await layer.getAttribute('data-lights'))).toBeGreaterThan(5);
});
