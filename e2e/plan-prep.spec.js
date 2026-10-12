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
test("today's training: tasks from your data, a finished endgame drill ticks", async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop navigation');
  await page.route('**/stockfish.worker.js', r => r.fulfill({ contentType: 'text/javascript', body: "const r=['e8d8','d8e8','e8f7','f7f6'];let n=0;self.onmessage=({data})=>{if(data&&data.mode==='analysis')self.postMessage({type:'uci',requestId:data.requestId,line:'bestmove '+(r[n++]||'0000')})}" }));
  await mock(page, {}, false);
  await page.goto('/');
  await page.locator('.main-nav [data-nav="learn"]').click();
  await expect(page.locator('.plan-open')).toContainText('0 of 3 done');
  await page.locator('.plan-open').click();
  await expect(page.locator('.plan-task')).toHaveCount(3);
  await page.locator('[data-plan="endgame"]').click();
  await expect(page.locator('.eg-drill h4')).toHaveText('Mate with the queen');
  // Not this drill: jump to the king-and-pawn one, which the scripted engine plays.
  await page.evaluate(() => document.querySelector('.eg-back').click());
  await page.locator('[data-eg="kp-k-win"]').click();
  const mv = async (a, b) => { await clickAt(page, a); await clickAt(page, b); };
  await mv('e6', 'd6'); await expect(piece(page, 'd8')).toHaveCount(1);
  await mv('e5', 'e6'); await expect(piece(page, 'e8')).toHaveCount(1);
  await mv('e6', 'e7'); await expect(piece(page, 'f7')).toHaveCount(1);
  await mv('d6', 'd7'); await expect(piece(page, 'f6')).toHaveCount(1);
  await mv('e7', 'e8'); await page.locator('#promotion button[data-piece="q"]').click();
  await expect(page.locator('.eg-result.win')).toBeVisible();
  const progress = await page.evaluate(() => JSON.parse(localStorage.getItem('vch.plan')));
  expect(progress.done.endgame).toBe(1);
});
test('prep: their usual replies, their stats, out of book', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop navigation');
  await mock(page, {
    public_profile: () => ({ player: { id: 'p2', username: 'ana', ratings: {}, provisional_games: {}, achievements: [] }, history: [], bestWins: [], recent: [], headToHead: null, following: false, self: false, club: null, division: 'Bronze' }),
    player_openings: () => ({ player: { name: 'ana', rating: 1600 }, lines: { w: [{ sans: ['e4', 'e5', 'Nf3'], score: 1 }], b: [{ sans: ['e4', 'c5'], score: 1 }, { sans: ['e4', 'c5'], score: 0 }, { sans: ['d4', 'Nf6'], score: 1 }] } }),
  });
  await page.goto('/?player=ana');
  await page.locator('.pp-prep').click();
  await expect(page.locator('.prep-cols')).toContainText('1.e4 c5');
  await page.locator('[data-prep="w"]').click();
  await clickAt(page, 'e2'); await clickAt(page, 'e4');
  await expect(piece(page, 'c5')).toHaveCount(1);
  await expect(page.locator('.prep-live h4')).toHaveText('Your move');
  await clickAt(page, 'g1'); await clickAt(page, 'f3');
  await expect(page.locator('.prep-live h4')).toContainText('Out of their book after 3 moves');
});
