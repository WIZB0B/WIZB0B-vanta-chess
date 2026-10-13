import { test, expect } from '@playwright/test';
import { clickAt, piece } from './board-helpers.js';

async function mock(page, handlers, signed = true) {
  await page.addInitScript(s => { localStorage.setItem('vch.intro-seen', '1'); localStorage.setItem('vanta.flagPrompt', '1'); if (s) localStorage.setItem('vanta.auth-session', JSON.stringify({ access_token: 't', refresh_token: 'r' })) }, signed);
  const calls = [];
  await page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', async route => {
    let body = {}; try { body = route.request().postDataJSON() } catch {}
    calls.push(body);
    const base = { profile: { player: { id: 'me', username: 'me', account: signed } }, challenges: { incoming: [], outgoing: [], accepted: [] }, daily_games: { games: [] }, notifications: { notifications: [], unread: 0 } };
    await route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(handlers[body.action]?.(body) ?? base[body.action] ?? {}) });
  });
  return calls;
}
const move = async (page, from, to) => { await clickAt(page, from); await clickAt(page, to); };

test('repertoire: add a line on the board, then drill it (guest, saved on this device)', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop navigation');
  await mock(page, {}, false);
  await page.goto('/');
  await page.locator('.main-nav [data-nav="openings"]').click();
  await page.locator('.rep-open').click();
  await expect(page.locator('.repertoire .menu-empty')).toBeVisible();
  await page.locator('.rep-add').click();
  await move(page, 'e2', 'e4'); await move(page, 'e7', 'e5'); await move(page, 'g1', 'f3');
  await expect(page.locator('.rep-edit .explorer-line')).toHaveText('1.e4 e5 2.Nf3');
  await page.locator('.rep-save').click();
  await expect(page.locator('.rep-line')).toHaveCount(1);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('vch.repertoire')).w)).toEqual([['e4', 'e5', 'Nf3']]);
  await page.locator('.rep-drill').click();
  await expect(page.locator('.trainer-drill h4')).toHaveText('Play your prepared moves');
  await move(page, 'd2', 'd4');
  await expect(page.locator('#toast')).toContainText('Not your prepared move');
  await move(page, 'e2', 'e4');
  await expect(piece(page, 'e5')).toHaveCount(1); // the prepared reply
  await move(page, 'g1', 'f3');
  await expect(page.locator('#toast')).toContainText('Line complete');
});
test('insights: summary, leaks with actions, rating line', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop header');
  const g = (i, o = {}) => ({ at: `2026-10-0${i}T10:00:00Z`, pool: 'blitz', rated: true, color: 'w', score: 0, reason: 'timeout', plies: 40, rating: 1500 - i, opp: 1500, bot: false, variant: 'standard', sans: ['e4', 'c5', 'Nf3'], ...o });
  const calls = await mock(page, { insights: () => ({ games: [g(1), g(2), g(3, { score: 1, reason: 'resign' }), g(4, { color: 'b', score: 1, sans: ['d4', 'd5'] }), g(5, { color: 'b', score: 0.5, sans: ['d4', 'd5'] }), g(6, { reason: 'checkmate', plies: 100 })] }), repertoire_get: () => ({ w: [['e4', 'c5', 'Nc3']], b: [] }) });
  await page.goto('/');
  await page.evaluate(() => document.querySelector('#profileMenuInsights').click());
  await expect(page.locator('.ins-head')).toContainText('6');
  await expect(page.locator('.ins-leak').first()).toContainText('% of your losses are on time');
  await expect(page.locator('.ins-chart')).toHaveCount(1);
  await expect(page.locator('.ins-note')).toContainText('You left your repertoire in');
  await page.locator('.ins-leak button', { hasText: 'Open repertoire' }).first().click();
  await expect(page.locator('.repertoire')).toBeVisible();
  expect(calls.some(c => c.action === 'insights')).toBe(true);
});
