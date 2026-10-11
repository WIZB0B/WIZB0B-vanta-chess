import { test, expect } from '@playwright/test';

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
// An engine that scores every searchmove (a +0.25 step per line) and reports what it was asked.
const ENGINE = `self.onmessage=({data})=>{if(!data||data.mode!=='analysis')return;self.postMessage({type:'asked',requestId:data.requestId,searchmoves:data.searchmoves||[],multipv:data.multipv});
const moves=(data.searchmoves&&data.searchmoves.length)?data.searchmoves:['g1f3','e2e4','d2d4'];
moves.forEach((m,i)=>self.postMessage({type:'uci',requestId:data.requestId,line:'info depth 10 multipv '+(i+1)+' score cp '+(50-25*i)+' pv '+m}));
self.postMessage({type:'uci',requestId:data.requestId,line:'bestmove '+moves[0]})}`;

test('explorer: engine score on each row, and your games only', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop navigation');
  await page.route('**/stockfish.worker.js', r => r.fulfill({ contentType: 'text/javascript', body: ENGINE }));
  const calls = await mock(page, { opening_explorer: b => b.mine ? { moves: [{ san: 'd4', games: 4, white: 3, draws: 0, black: 1 }], total: 4, mine: true } : { moves: [{ san: 'e4', games: 30, white: 15, draws: 3, black: 12 }, { san: 'd4', games: 10, white: 5, draws: 5, black: 0 }], total: 40 } });
  await page.goto('/');
  await page.locator('.main-nav [data-nav="openings"]').click();
  await page.locator('.explorer-open').click();
  await expect(page.locator('.ex-row')).toHaveCount(2);
  await expect(page.locator('.ex-row[data-san="e4"] .ex-eval')).toHaveText('+0.5');
  await expect(page.locator('.ex-row[data-san="d4"] .ex-eval')).toHaveText('+0.3');
  await page.locator('.ex-src[data-src="mine"]').click();
  await expect(page.locator('.ex-row')).toHaveCount(1);
  await expect(page.locator('.ex-row[data-san="d4"] .ex-eval')).toHaveText('+0.5');
  expect(calls.some(c => c.action === 'opening_explorer' && c.mine === true)).toBe(true);
});
test('explorer: with no games here the engine suggests moves', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop navigation');
  await page.route('**/stockfish.worker.js', r => r.fulfill({ contentType: 'text/javascript', body: ENGINE }));
  await mock(page, { opening_explorer: () => ({ moves: [], total: 0 }) }, false);
  await page.goto('/');
  await page.locator('.main-nav [data-nav="openings"]').click();
  await page.locator('.explorer-open').click();
  await expect(page.locator('.ex-engine')).toHaveCount(3);
  await expect(page.locator('.ex-engine').first()).toContainText('Nf3');
  await page.locator('.ex-engine[data-san="Nf3"]').click();
  await expect(page.locator('.explorer-line')).toHaveText('Nf3');
  await page.locator('.ex-src[data-src="mine"]').click();
  await expect(page.locator('.explorer-table')).toContainText('Sign in to see your own games');
});
test('tournament lobby: live games, Swiss pairings, standings; refreshes', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop navigation');
  const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
  let lobbyCalls = 0;
  await mock(page, {
    tournaments: () => ({ tournaments: [{ id: 't1', name: 'Friday Swiss', format: 'swiss', status: 'active', rounds: 5, current_round: 2, pool: 'blitz', rated: true, base_seconds: 180, increment_seconds: 2, starts_at: new Date(Date.now() - 6e5).toISOString(), ends_at: new Date(Date.now() + 6e6).toISOString() }], memberships: [], myGames: [] }),
    tournament_lobby: () => { lobbyCalls++; return { tournament: { id: 't1', name: 'Friday Swiss', format: 'swiss', status: 'active', rounds: 5, current_round: 2, pool: 'blitz', rated: true, base_seconds: 180, increment_seconds: 2 }, standings: [{ username: 'ana', points: 2, wins: 2 }, { username: 'me', points: 1, wins: 1, losses: 1 }], clubs: [], games: [{ id: 'g1', white: 'ana', black: 'bo', whiteRating: 1900, blackRating: 1850, moves: 7, fen }, { id: 'g2', white: 'me', black: 'cy', whiteRating: 1500, blackRating: 1490, moves: 3, fen, mine: true }], pairings: [{ white: 'ana', black: 'bo', result: 'playing' }, { white: 'me', black: 'cy', result: 'playing', mine: true, code: 'AB12CD34' }] }; },
  });
  await page.goto('/');
  await page.locator('.main-nav [data-nav="arena"]').click();
  await page.locator('.arena-lobby').click();
  await expect(page.locator('.lobby-head b')).toHaveText('Friday Swiss');
  await expect(page.locator('.lobby-game')).toHaveCount(2);
  await expect(page.locator('.lobby-game.mine')).toContainText('Your game');
  await expect(page.locator('.lobby-pairings > div')).toHaveCount(2);
  await expect(page.locator('.lobby-pairings > div.me')).toContainText('cy');
  await expect(page.locator('.lobby-standings > div')).toHaveCount(2);
  await expect(page.locator('.lobby-mine')).toHaveText('Go to your game');
  await expect.poll(() => lobbyCalls, { timeout: 15000 }).toBeGreaterThanOrEqual(2);
});
test('league: clubs as teams', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop navigation');
  await mock(page, { league: () => ({ season: '2026-10', ends: new Date(Date.now() + 864e5 * 20).toISOString(), division: 0, divisions: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'], myDivision: 0, me: null, minGames: 5, zones: { promote: 1, relegate: 0 }, total: 1, standings: [{ rank: 1, name: 'ana', points: 9, games: 3 }], badges: [], clubTop: 10, clubs: [{ rank: 1, name: 'Knights', slug: 'knights', points: 40, players: 6 }, { rank: 2, name: 'Rooks', slug: 'rooks', points: 12, players: 2 }], myClub: { rank: 2, name: 'Rooks', slug: 'rooks', points: 12, players: 2 } }) });
  await page.goto('/');
  await page.locator('.main-nav [data-nav="friends"]').click();
  await page.locator('[data-community="league"]').first().click();
  await expect(page.locator('.club-league > div')).toHaveCount(2);
  await expect(page.locator('.club-league > div.me')).toContainText('Rooks');
});
