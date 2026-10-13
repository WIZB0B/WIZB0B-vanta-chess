import { test, expect } from '@playwright/test';
import { clickAt } from './board-helpers.js';

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
// Stockfish stand-in: answers analysis requests with the next scripted move.
const engine = moves => `const replies=${JSON.stringify(moves)};let n=0;self.onmessage=({data})=>{if(!data||data.mode!=='analysis')return;self.postMessage({type:'uci',requestId:data.requestId,line:'bestmove '+(replies[n++]||'0000')})}`;

test('endgame drill: promote with the king in front, three stars, saved', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop navigation');
  await page.route('**/stockfish.worker.js', r => r.fulfill({ contentType: 'text/javascript', body: engine(['e8d8', 'd8e8', 'e8f7', 'f7f6']) }));
  await mock(page, {}, false);
  await page.goto('/');
  await page.locator('.main-nav [data-nav="learn"]').click();
  await page.locator('.open-endgames').click();
  await page.locator('[data-eg="kp-k-win"]').click();
  await expect(page.locator('.eg-drill h4')).toHaveText('King in front: promote');
  const mv = async (a, b) => { await clickAt(page, a); await clickAt(page, b); };
  await mv('e6', 'd6'); await expect(page.locator('.board-piece[data-square="d8"]')).toHaveCount(1);
  await mv('e5', 'e6'); await expect(page.locator('.board-piece[data-square="e8"]')).toHaveCount(1);
  await mv('e6', 'e7'); await expect(page.locator('.board-piece[data-square="f7"]')).toHaveCount(1);
  await mv('d6', 'd7'); await expect(page.locator('.board-piece[data-square="f6"]')).toHaveCount(1);
  await mv('e7', 'e8'); await page.locator('#promotion button[data-piece="q"]').click();
  await expect(page.locator('.eg-result.win')).toContainText('Promoted in 5 moves.');
  await expect(page.locator('.eg-result .eg-stars i.on')).toHaveCount(3);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('vch.endgames'))['kp-k-win'])).toBe(3);
});
test('vacation: start it from the daily list; an opponent away is marked', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop navigation');
  let v = { on: false, until: null, left: 14, perYear: 14 };
  const until = new Date(Date.now() + 3 * 864e5).toISOString();
  const calls = await mock(page, {
    daily_games: () => ({ vacation: v, games: [{ id: 'g', code: 'DAILY001', opponent: 'ana', seat: 'w', yourTurn: false, status: 'active', fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', daily_days: 3, deadline: until, moves: 1, rated: false, opponentAwayUntil: until }] }),
    vacation: b => { v = { on: true, until: new Date(Date.now() + b.days * 864e5).toISOString(), left: 14 - b.days, perYear: 14 }; return { vacation: v }; },
    friends: () => ({ following: [], followers: [] }),
  });
  await page.goto('/');
  await page.locator('.main-nav [data-nav="friends"]').click();
  await expect(page.locator('.daily-row .away-tag')).toContainText('On vacation until');
  await page.locator('.vacation-form select').selectOption('3');
  await page.locator('.vacation-form button').click();
  await expect(page.locator('.vacation-box')).toContainText('11 of 14 days left');
  await expect(page.locator('.vacation-end')).toBeVisible();
  expect(calls.find(c => c.action === 'vacation')?.days).toBe(3);
});
