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
test('lobby commentary: the organiser posts on a game; the feed shows it', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop navigation');
  const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
  const feed = [];
  const lobby = () => ({ tournament: { id: 't1', name: 'Club night', format: 'arena', status: 'active', pool: 'blitz', rated: true, base_seconds: 180, increment_seconds: 2, starts_at: new Date(Date.now() - 6e5).toISOString(), ends_at: new Date(Date.now() + 6e6).toISOString() }, standings: [], clubs: [], games: [{ id: 'g1', white: 'ana', black: 'bo', whiteRating: 1900, blackRating: 1850, moves: 7, fen }], pairings: [], commentary: [...feed], canComment: true });
  const calls = await mock(page, {
    tournaments: () => ({ tournaments: [lobby().tournament], memberships: [], myGames: [] }),
    tournament_lobby: lobby,
    commentary_post: b => { feed.unshift({ id: 'c1', body: b.body, game: 'ana vs bo', gameId: b.gameId, ply: 7, author: 'me', at: new Date().toISOString() }); return { comment: feed[0] }; },
  });
  await page.goto('/');
  await page.locator('.main-nav [data-nav="arena"]').click();
  await page.locator('.arena-lobby').click();
  await page.locator('.cm-form select').selectOption('g1');
  await page.locator('.cm-input').fill('Ana sacrifices on f7!');
  await page.locator('.cm-form button').click();
  await expect(page.locator('.cm-item p')).toHaveText('Ana sacrifices on f7!');
  await expect(page.locator('.cm-item small')).toContainText('ana vs bo · move 4');
  expect(calls.find(c => c.action === 'commentary_post')?.gameId).toBe('g1');
});
test('battle ladder: queue, then matched into a battle; the weekly table', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop navigation');
  let polls = 0;
  const live = () => ({ id: 'b9', code: 'LAD123', status: 'live', seat: 'host', starts_at: new Date(Date.now() + 3000).toISOString(), ends_at: new Date(Date.now() + 183000).toISOString(), puzzles: [{ id: 'p', fen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', solution: ['d1d8'], rating: 1000 }], host: { name: 'me', score: 0, misses: 0 }, guest: { name: 'zed', score: 0, misses: 0 }, maxMisses: 3 });
  await mock(page, {
    puzzle_next: () => ({ puzzle: { id: 'p0', fen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', solution: ['d1d8'], rating: 900, themes: [] } }),
    battle_queue: () => ({ waiting: true }),
    battle_queue_status: b => (b.leave ? {} : ++polls >= 2 ? { battle: live() } : { waiting: true }),
    battle_state: () => ({ battle: live() }),
    battle_ladder: () => ({ week: '2026-W41', waiting: 1, standings: [{ rank: 1, name: 'zed', points: 6, wins: 3, battles: 3, solved: 40, me: false }, { rank: 2, name: 'me', points: 2, wins: 1, battles: 2, solved: 20, me: true }], lastWeek: { week: '2026-W40', podium: [{ name: 'ana', points: 12 }, { name: 'bo', points: 9 }, { name: 'cy', points: 7 }] } }),
  });
  await page.goto('/');
  await page.evaluate(() => document.querySelector('.main-nav [data-nav="puzzles"]').click());
  await page.locator('.start-battle').click();
  await page.locator('.battle-ladder').click();
  await expect(page.locator('.ladder-podium > div')).toHaveCount(3);
  await expect(page.locator('.league-table > div.me')).toContainText('me');
  await page.locator('.battle-queue').click();
  await expect(page.locator('.battle-score')).toContainText('zed', { timeout: 10000 });
});
test('analyse together: a shared board by link; moves update the line', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop clicks');
  await mock(page, {}, false);
  await page.goto('/');
  await page.locator('.main-nav [data-nav="learn"]').click();
  await page.locator('.open-together').click();
  await expect(page.locator('.analysis-together .battle-code b')).toHaveText(/^[A-Z0-9]{6,12}$/);
  expect(new URL(page.url()).searchParams.get('analysis')).toMatch(/^[A-Z0-9]{6,12}$/);
  await clickAt(page, 'e2'); await clickAt(page, 'e4');
  await expect(piece(page, 'e4')).toHaveCount(1);
  await expect(page.locator('.analysis-together .explorer-line')).toHaveText('1.e4');
  await clickAt(page, 'e7'); await clickAt(page, 'e5');
  await expect(page.locator('.analysis-together .explorer-line')).toHaveText('1.e4 e5');
  await page.locator('.an-back').click();
  await expect(page.locator('.analysis-together .explorer-line')).toHaveText('1.e4');
  await page.locator('.an-leave').click();
  expect(new URL(page.url()).searchParams.get('analysis')).toBeNull();
});
