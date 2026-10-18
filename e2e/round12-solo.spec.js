import { test, expect } from '@playwright/test';

// Round 12 single-player features: the Vanta Campaign, Oaths, Veteran pieces, Living atmosphere
// and Adaptive music. All of it lives on this device, so the server is mocked.
const api = page => page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', route => route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ player: { id: 'me' }, bots: [], games: [] }) }));
const VETERANS = { ids: ['seed'], totals: {
  'w-n-g1': { games: 30, captures: 20, forks: 4, checks: 6, mates: 1, promotions: 0, fell: 9, value: 60 }, // 37 deeds: Champion
  'w-p-e2': { games: 30, captures: 6, forks: 0, checks: 0, mates: 0, promotions: 0, fell: 20, value: 6 }, // Veteran
  'w-q-d1': { games: 30, captures: 30, forks: 6, checks: 10, mates: 3, promotions: 0, fell: 8, value: 90 }, // Legend
} };
const boot = async (page, extra = null, arg = null) => {
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript(() => { localStorage.setItem('vch.intro-seen', '1'); localStorage.setItem('vanta.flagPrompt', '1') });
  if (extra) await page.addInitScript(extra, arg);
  await api(page); await page.goto('/');
  return errors;
};
const resign = async page => { await page.locator('#resign').click(); await page.getByRole('button', { name: 'Resign' }).last().click(); };
const dark = page => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--dark').trim());

test('Vanta Campaign: the first realm lends its board and weather, and a loss leaves it open', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop left panel');
  const errors = await boot(page);
  const before = await dark(page);
  await page.locator('[data-mode="computer"]').click();
  await page.locator('.computer-campaign').click();
  await expect(page.locator('.camp-realm')).toHaveCount(5);
  await expect(page.locator('.camp-realm.locked')).toHaveCount(4);
  await expect(page.locator('.camp-fight')).toHaveCount(1);
  await page.locator('.camp-fight').click();
  await expect(page.locator('#topPlayerName')).toHaveText('The Cinder Squire');
  await expect.poll(() => dark(page)).toBe('#3b2a24');
  await expect(page.locator('#atmosphere')).toHaveAttribute('data-realm', 'embers');
  await expect(page.locator('body')).toHaveAttribute('data-realm', 'ashen');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('vch.campaign')).pending)).toEqual({ realm: 'ashen', i: 0 });
  await resign(page);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('vch.campaign')).pending)).toBe(null);
  await expect(page.locator('#atmosphere')).toHaveAttribute('data-mood', 'dusk');
  await page.locator('#gameEndPanel .ge-close').click();
  await expect(page.locator('#gameEndPanel')).toHaveCount(0);
  // An ordinary game gives your own board back.
  await page.locator('#computerStart').click();
  await expect.poll(() => dark(page)).toBe(before);
  await expect(page.locator('body')).not.toHaveAttribute('data-realm', /.+/);
  expect(errors).toEqual([]);
});

test('Vanta Campaign: freeing a realm opens the next one, stars add up', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop left panel');
  await boot(page, () => localStorage.setItem('vch.campaign', JSON.stringify({ won: { 'ashen-0': { stars: 3 }, 'ashen-1': { stars: 1 }, 'ashen-2': { stars: 2 } } })));
  await page.locator('[data-mode="computer"]').click();
  await page.locator('.computer-campaign').click();
  await expect(page.locator('.campaign .gauntlet-head')).toContainText('6 / 45');
  await expect(page.locator('.campaign .gauntlet-head')).toContainText('1 / 5');
  await expect(page.locator('.camp-realm.freed')).toHaveCount(1);
  await expect(page.locator('.camp-realm.locked')).toHaveCount(3);
  await expect(page.locator('.camp-realm[data-realm="ashen"] .camp-stars i.on')).toHaveCount(6);
  await page.locator('.camp-realm[data-realm="tidal"] .camp-fight').click();
  await expect(page.locator('#topPlayerName')).toHaveText('The Bell Ringer');
  await expect(page.locator('#atmosphere')).toHaveAttribute('data-realm', 'rain');
});

test('Oaths: three a day, sworn at the start, judged at the end', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop left panel');
  await boot(page);
  await expect(page.locator('#oathPick option')).toHaveCount(4);
  await page.locator('#oathPick').selectOption({ index: 1 });
  const name = (await page.locator('#oathPick option').nth(1).textContent()).split(' · ')[0];
  await expect(page.locator('#oathVow b')).not.toBeEmpty();
  await page.locator('[data-mode="computer"]').click();
  await page.locator('#computerStart').click();
  await expect(page.locator('#oathLine')).toBeVisible();
  await expect(page.locator('#oathLine b')).toHaveText(name);
  await expect(page.locator('#oathLine em')).toHaveText(/Holding|Sworn/);
  await resign(page);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('vch.oaths') || '{}').sworn)).toBe(1);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('vch.oaths')).history[0].status)).toBe('failed');
  await expect(page.locator('#oathLine')).toBeHidden();
});

test('Veteran pieces: your ranked pieces wear their marks and tell their story', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop hover');
  await boot(page, v => localStorage.setItem('vch.veterans', JSON.stringify(v)), VETERANS);
  await page.locator('[data-mode="computer"]').click();
  await page.locator('#computerStart').click();
  await expect(page.locator('.board-piece[data-square="g1"]')).toHaveAttribute('data-veteran', 'champion');
  await expect(page.locator('.board-piece[data-square="e2"]')).toHaveAttribute('data-veteran', 'veteran');
  await expect(page.locator('.board-piece[data-square="d1"]')).toHaveAttribute('data-veteran', 'legend');
  await expect(page.locator('.board-piece[data-veteran]')).toHaveCount(3);
  await expect(page.locator('.board-piece.b[data-veteran]')).toHaveCount(0);
  await page.locator('.board-piece[data-square="g1"]').hover();
  await expect(page.locator('#veteranCard')).toHaveClass(/show/);
  await expect(page.locator('#veteranCard')).toContainText('Knight of g1');
  await expect(page.locator('#veteranCard')).toContainText('Kingslayer');
  // The knight keeps its rank when it moves.
  const clickSq = async s => { const b = await page.locator(`[data-sq="${s}"]`).boundingBox(); await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2) };
  await clickSq('g1'); await clickSq('f3');
  await expect(page.locator('.board-piece[data-square="f3"]')).toHaveAttribute('data-veteran', 'champion');
  // Turned off in Theme Studio, the marks go.
  await page.locator('#theme').click();
  await page.locator('#veteranSetting').selectOption('off');
  await expect(page.locator('.board-piece[data-veteran]')).toHaveCount(0);
});

test('Your army lists every piece and its deeds', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop panel');
  await boot(page, v => localStorage.setItem('vch.veterans', JSON.stringify(v)), VETERANS);
  await page.locator('[data-nav="review"]').click();
  await page.locator('.archive-army').click();
  await expect(page.locator('.army-piece')).toHaveCount(3);
  await expect(page.locator('.army-piece').first()).toContainText('The Queen');
  await expect(page.locator('.army-piece.rank-legend')).toHaveCount(1);
});

test('Living atmosphere and music: settings stick, the layer sits behind the app', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop theme dialog');
  const errors = await boot(page);
  const layer = page.locator('#atmosphere');
  await expect(layer).toHaveAttribute('data-level', 'full');
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('#atmosphere')).zIndex)).toBe('-1');
  expect(await page.evaluate(() => getComputedStyle(document.body).isolation)).toBe('isolate');
  await page.locator('#theme').click();
  await page.locator('#atmosphereSetting').selectOption('off');
  await expect(layer).toBeHidden();
  await page.locator('#musicSetting').selectOption('on');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('vch.music')).on)).toBe(true);
  await page.locator('#closeTheme').click();
  await page.locator('[data-mode="computer"]').click();
  await page.locator('#computerStart').click();
  await page.locator('.game-more>summary').click();
  await expect(page.locator('#musicToggle')).toHaveText('Music: on');
  await page.locator('#musicToggle').click();
  await expect(page.locator('#musicToggle')).toHaveText('Music: off');
  await page.reload();
  expect(await page.evaluate(() => [JSON.parse(localStorage.getItem('vch.r12')).atmosphere, JSON.parse(localStorage.getItem('vch.music')).on])).toEqual(['off', false]);
  // ...and are read back after the reload (the first render must not fall back to defaults).
  await expect(layer).toBeHidden();
  expect(await page.locator('#atmosphereSetting').inputValue()).toBe('off');
  expect(errors).toEqual([]);
});

test('Phones: the Campaign, the Gauntlet and Your Shadow open on the panel screen', async ({ page }) => {
  test.skip(test.info().project.name !== 'mobile', 'Phone shell');
  const errors = await boot(page);
  await page.locator('[data-mode="computer"]').click();
  await page.locator('.computer-campaign').click();
  await expect(page.locator('.camp-realm').first()).toBeVisible();
  await page.locator('.camp-fight').click();
  await expect(page.locator('#board')).toBeVisible();
  await expect(page.locator('#topPlayerName')).toHaveText('The Cinder Squire');
  await expect(page.locator('#oathLine')).toBeHidden(); // no oath sworn
  await page.goto('/'); // a computer game is not kept across a reload
  await page.locator('[data-mode="computer"]').click();
  await page.locator('.computer-gauntlet').click();
  await expect(page.locator('.gauntlet-stages')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
