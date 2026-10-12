import { test, expect } from '@playwright/test';
import { clickAt } from './board-helpers.js';

const P1 = { id: 'p1', fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 2 4', solution: ['f3f7'], rating: 900 };
const P2 = { id: 'p2', fen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', solution: ['d1d8'], rating: 1000 };
const P3 = { id: 'p3', fen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', solution: ['d1d8'], rating: 1100 };

async function mock(page, handlers) {
  await page.addInitScript(() => { localStorage.setItem('vch.intro-seen', '1'); localStorage.setItem('vanta.flagPrompt', '1'); localStorage.setItem('vanta.auth-session', JSON.stringify({ access_token: 't', refresh_token: 'r' })) });
  const calls = [];
  await page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', async route => {
    let body = {}; try { body = route.request().postDataJSON() } catch {}
    calls.push(body);
    const base = { profile: { player: { id: 'me', username: 'me', account: true } }, challenges: { incoming: [], outgoing: [], accepted: [] }, daily_games: { games: [] }, notifications: { notifications: [], unread: 0 }, chat_list: { messages: [] } };
    await route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ serverNow: new Date().toISOString(), ...(handlers[body.action]?.(body) ?? base[body.action] ?? {}) }) });
  });
  return calls;
}

test('Puzzle Battle: create, opponent joins, solve and miss, scores and lives update', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop navigation');
  let battle = { id: 'b1', code: 'ABC123', status: 'waiting', seat: 'host', puzzles: [], host: { name: 'me', score: 0, misses: 0 }, guest: null, maxMisses: 3 };
  const progress = [];
  await mock(page, {
    puzzle_next: () => ({ puzzle: { ...P2, themes: [] } }), puzzle_stats: () => ({}),
    battle_create: () => ({ battle }),
    battle_state: () => ({ battle }),
    battle_progress: b => { progress.push([b.score, b.misses]); battle = { ...battle, host: { name: 'me', score: b.score, misses: b.misses } }; return { battle }; },
  });
  await page.goto('/');
  await page.evaluate(() => document.querySelector('.main-nav [data-nav="puzzles"]').click());
  await page.locator('.start-battle').click();
  await page.locator('.battle-new').click();
  await expect(page.locator('.battle-code b')).toHaveText('ABC123');
  const now = Date.now();
  battle = { ...battle, status: 'live', starts_at: new Date(now + 1500).toISOString(), ends_at: new Date(now + 180000).toISOString(), puzzles: [P1, P2, P3], guest: { name: 'ana', score: 2, misses: 0 } };
  await expect(page.locator('.battle-score')).toContainText('ana', { timeout: 5000 });
  await expect(page.locator('.battle-status')).toContainText('Puzzle 1', { timeout: 5000 });
  await clickAt(page, 'f3'); await clickAt(page, 'f7');
  await expect(page.locator('.battle-status')).toContainText('Puzzle 2');
  await clickAt(page, 'd1'); await clickAt(page, 'd2'); // a miss
  await expect(page.locator('.battle-status')).toContainText('Puzzle 3');
  await expect.poll(() => progress.at(-1)).toEqual([1, 1]);
  await expect(page.locator('.battle-side.me b')).toHaveText('1');
  await expect(page.locator('.battle-side.me .battle-lives i.on')).toHaveCount(2);
  battle = { ...battle, status: 'finished', winner: 'guest' };
  await expect(page.locator('.battle.done h4')).toHaveText('You lost the battle', { timeout: 5000 });
});
test('simul: host creates, starts, sees boards that wait, jumps to a board with the simul bar', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop navigation');
  const start = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', after = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
  let status = 'open';
  const simul = () => ({ id: 's1', code: 'SIM123', name: 'Friday simul', status, base_seconds: 1800, increment_seconds: 30, max_players: 10, host: 'me', players: 2, mine: true });
  const boards = () => status === 'open' ? [] : [{ id: 'g1', code: 'AAAA1111', opponent: 'ana', status: 'active', result: '*', fen: start, moves: 0, hostToMove: true }, { id: 'g2', code: 'BBBB2222', opponent: 'bo', status: 'active', result: '*', fen: after, moves: 2, hostToMove: true }];
  const game = { id: 'g1', invite_code: 'AAAA1111', simul_id: 's1', white_player_id: 'me', black_player_id: 'ana', white_name: 'me', black_name: 'ana', status: 'active', result: '*', rated: false, pool: 'rapid', fen: start, version: 1, move_count: 0, move_history: [], time_control_seconds: 1800, increment_seconds: 30, white_time_ms: 1800000, black_time_ms: 1800000, last_move_at: new Date().toISOString() };
  const calls = await mock(page, {
    tournaments: () => ({ tournaments: [], memberships: [], myGames: [] }),
    simul_list: () => ({ simuls: [] }),
    simul_create: () => ({ simul: simul() }),
    simul_state: () => ({ simul: simul(), boards: boards(), entrants: status === 'open' ? ['ana', 'bo'] : [], score: { host: 0, players: 0, draws: 0 }, isHost: true }),
    simul_start: () => { status = 'live'; return {}; },
    join: () => ({ game, seat: 'w', player: { id: 'me' } }), state: () => ({ game, seat: 'w' }), heartbeat: () => ({ game, seat: 'w' }),
  });
  await page.goto('/');
  await page.locator('.main-nav [data-nav="arena"]').click();
  await page.locator('.simul-open').click();
  await page.locator('.simul-host summary').click();
  await page.locator('.simul-form input[name="name"]').fill('Friday simul');
  await page.locator('.simul-form button').click();
  await expect(page.locator('.simul .pp-list > div')).toHaveCount(2);
  await page.locator('.simul-start').click();
  await expect(page.locator('.simul-board')).toHaveCount(2);
  await expect(page.locator('.simul-board.your-move')).toHaveCount(2);
  await page.locator('.simul-board').first().click();
  await expect.poll(() => calls.some(c => c.action === 'join' && c.code === 'AAAA1111')).toBe(true);
  await expect(page.locator('#simulBar')).toBeVisible();
  await expect(page.locator('#simulBarText')).toHaveText('Simul · 1 board waits for you');
  await expect(page.locator('#abandonCard')).toBeHidden();
  await expect(page.locator('#firstMoveCard')).toBeHidden();
});
