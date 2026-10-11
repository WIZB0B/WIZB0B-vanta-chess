import { test, expect } from '@playwright/test';

const api = page => page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', route => route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ player: { id: 'me' }, bots: [], games: [] }) }));
const boot = async (page, extra = () => {}) => {
  await page.addInitScript(extra);
  await page.addInitScript(() => { localStorage.setItem('vch.intro-seen', '1'); localStorage.setItem('vanta.flagPrompt', '1') });
  await api(page); await page.goto('/');
};
const clickSq = async (page, sq) => { const b = await page.locator(`[data-sq="${sq}"]`).boundingBox(); await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2) };
const plies = page => page.locator('#moves .move-cell:not(.empty)');

test('Vanta Dark: the enemy is hidden, their moves are "?" and the board shows again at the end', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop left panel');
  await boot(page);
  await page.locator('[data-mode="computer"]').click();
  await page.locator('[data-computer-variant="dark"]').click();
  await expect(page.locator('#computerVariantNote')).toContainText('only see your own pieces');
  await page.locator('#computerStart').click();
  await expect(page.locator('.board-piece.b')).toHaveCount(0);
  await expect(page.locator('.board-piece.w')).toHaveCount(16);
  await expect(page.locator('.square.fog')).toHaveCount(32);
  await clickSq(page, 'e2'); await clickSq(page, 'e4');
  await expect(plies(page)).toHaveCount(2, { timeout: 15000 });
  await expect(page.locator('#moves .move-cell').nth(1).locator('.move-san b')).toHaveText('?');
  await expect(page.locator('#moves .move-cell').first().locator('.move-san b')).toHaveText('e4');
  page.once('dialog', d => d.accept());
  await page.locator('#resign').click();
  await page.getByRole('button', { name: 'Resign' }).last().click();
  await expect(page.locator('.board-piece.b')).toHaveCount(16);
  await expect(page.locator('.square.fog')).toHaveCount(0);
});

test('Blackout Blitz: three minutes, and after four moves the pieces disappear', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop left panel');
  await boot(page);
  await page.locator('[data-mode="computer"]').click();
  await page.locator('[data-computer-variant="blackout"]').click();
  await page.locator('#computerStart').click();
  await expect(page.locator('#bottomClock')).toHaveText('3:00');
  const mine = [['a2', 'a3'], ['h2', 'h3'], ['b2', 'b3'], ['g2', 'g3']];
  for (const [i, [from, to]] of mine.entries()) {
    await expect(plies(page)).toHaveCount(2 * i, { timeout: 15000 });
    await expect(page.locator('#board')).not.toHaveClass(/blackout/);
    await clickSq(page, from); await clickSq(page, to);
  }
  await expect(page.locator('#board')).toHaveClass(/blackout/);
  await expect(page.locator('#moves .move-cell').first().locator('.move-san b')).toHaveText('•');
});

test('Vanta Gauntlet: a run starts at The Gate, a resignation costs a life', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop left panel');
  await boot(page);
  await page.locator('[data-mode="computer"]').click();
  await page.locator('.computer-gauntlet').click();
  await expect(page.locator('.gauntlet-stages li')).toHaveCount(7);
  await page.locator('.gauntlet-start').click();
  await expect(page.locator('#topPlayerName')).toHaveText('The Gate');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('vch.gauntlet')).run.pending)).toBe(0);
  await page.locator('#resign').click();
  await page.getByRole('button', { name: 'Resign' }).last().click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('vch.gauntlet')).run.lives)).toBe(2);
});

test('Your Shadow opens with your own first move', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop left panel');
  await boot(page, () => localStorage.setItem('vch.archive.local', JSON.stringify([{ id: 'l1', source: 'computer', pgn: '1. c4 e5 2. Nc3 *', result: '1-0', myColor: 'w', date: '2026-10-01T00:00:00Z' }])));
  await page.locator('[data-mode="computer"]').click();
  await page.locator('.computer-shadow').click();
  await expect(page.locator('.shadow')).toContainText('1.c4 e5');
  await page.locator('[data-shadow="b"]').click();
  await expect(page.locator('#topPlayerName')).toHaveText('Your Shadow');
  await expect(page.locator('#moves .move-cell').first().locator('.move-san b')).toHaveText('c4', { timeout: 10000 });
});

test('Relic sets: an earned relic restyles the board and comes off again', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop theme dialog');
  await boot(page, () => localStorage.setItem('vch.relics', JSON.stringify({ unlocked: { umbra: '2026-10-11' } })));
  await page.locator('#theme').click();
  await page.locator('#openRelics').click();
  await expect(page.locator('.relic')).toHaveCount(6);
  await expect(page.locator('.relic.locked')).toHaveCount(5);
  const dark = () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--dark').trim());
  const before = await dark();
  await page.locator('[data-relic="umbra"]').click();
  await expect.poll(dark).toBe('#23262f');
  await page.locator('[data-relic-off]').click();
  await expect.poll(dark).toBe(before);
});
