import { test, expect } from '@playwright/test';

const FEN = '6k1/5ppp/8/8/8/8/q7/R5K1 b - - 1 20';
const moment = { gameId: 'g-moment', white: 'Ada', black: 'Bo', whiteRating: 1510, blackRating: 1490, result: '1-0', pool: 'blitz', fen: FEN, sans: ['e4', 'e5', 'Nf3', 'Nc6'], caption: 'Checkmate while 7 points down', picked: false };
const game = (opp, result, ended) => ({ id: `${opp}-${ended}`, result, status: 'finished', rated: true, white_player_id: 'me', black_player_id: opp, white_name: 'Me', black_name: opp === 'forge' ? 'Forge' : opp.toUpperCase(), ended_at: ended, move_count: 30, sans: ['e4', 'e5'] });
async function boot(page) {
  await page.addInitScript(() => {
    localStorage.setItem('vch.intro-seen', '1'); localStorage.setItem('vanta.flagPrompt', '1');
    localStorage.setItem('vanta.auth-session', JSON.stringify({ access_token: 'tok', refresh_token: 'r', expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: 'me' } }));
  });
  await page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', async route => {
    let body = {}; try { body = route.request().postDataJSON() } catch {}
    const games = [game('a', '1-0', '2026-10-01'), game('a', '0-1', '2026-10-02'), game('a', '1-0', '2026-10-03'), game('a', '0-1', '2026-10-04'), game('forge', '0-1', '2026-10-01'), game('forge', '0-1', '2026-10-02'), game('forge', '1-0', '2026-10-03')];
    const map = { profile: { player: { id: 'me', account: true, username: 'me' } }, history: { games }, moment_of_week: { week: '2026-W41', moment }, live_games: { games: [] } };
    await route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ serverNow: new Date().toISOString(), ...(map[body.action] || {}) }) });
  });
  await page.goto('/');
}

test('Rivals: close records with real players, matched bots left out', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop nav');
  await boot(page);
  await page.locator('.main-nav [data-nav="friends"]').click();
  await page.locator('[data-community="rivals"]').first().click();
  await expect(page.locator('.rival')).toHaveCount(1);
  await expect(page.locator('.rival-name')).toHaveText('A');
  await expect(page.locator('.rival')).toContainText('Level at 2–2');
});

test('Moment of the Week: on Watch with a replay', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop nav');
  await boot(page);
  await page.locator('.main-nav [data-nav="watch"]').click();
  await expect(page.locator('.vmoment h4')).toHaveText('Checkmate while 7 points down');
  await expect(page.locator('.moment-pick')).toHaveCount(0, { timeout: 1000 });
  await page.locator('.moment-replay').click();
  await expect(page.locator('#moves .move-cell:not(.empty)')).toHaveCount(4);
});
