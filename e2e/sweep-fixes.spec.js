import { test, expect } from '@playwright/test';

// Fixes from the pre-design bug sweep (2026-10-12): live games are kept when other sections
// open, phone board modes show the board, puzzles keep Next and the puzzle menu, Arena search
// shows and stops, the hero and arena cards fit, the piece tint persists, and small UI gaps.
const now = () => new Date().toISOString();
const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const liveGame = () => ({ id: 'g-live', invite_code: 'LIVE1234', white_player_id: 'me', black_player_id: 'opp', white_name: 'Me', black_name: 'Ola', status: 'active', result: '*', rated: false, pool: 'rapid', fen: START, version: 1, move_count: 0, move_history: [], time_control_seconds: 600, increment_seconds: 0, white_time_ms: 600000, black_time_ms: 600000, last_move_at: now(), started_at: now(), white_last_seen_at: now(), black_last_seen_at: now() });
// One puzzle, already from the solver's side (White plays Qxf7#).
const PUZZLE = { id: 'p1', fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4', solution: ['h5f7'], rating: 1200, themes: ['mateIn1'] };

async function mock(page, extra = {}) {
  await page.addInitScript(() => { localStorage.setItem('vch.intro-seen', '1'); localStorage.setItem('vanta.flagPrompt', '1') });
  const calls = [];
  await page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', async route => {
    let body = {}; try { body = route.request().postDataJSON() } catch {}
    calls.push(body.action);
    const game = liveGame();
    const map = { profile: { player: { id: 'me' } }, create: { game, seat: 'w', player: { id: 'me' } }, state: { game, seat: 'w' }, heartbeat: { game, seat: 'w' }, chat_list: { messages: [] }, puzzle_next: { puzzle: PUZZLE }, puzzle_attempt: { rating: 1210 }, ...extra };
    const out = typeof map[body.action] === 'function' ? map[body.action](body) : map[body.action];
    await route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ serverNow: now(), ...(out || {}) }) });
  });
  return calls;
}
const clickSq = async (page, sq) => { const b = await page.locator(`[data-sq="${sq}"]`).boundingBox(); await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2) };

test('sweep: opening Puzzles during a live game keeps the game', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop navigation');
  const calls = await mock(page);
  await page.goto('/');
  await page.locator('#create').click();
  await expect(page.locator('#topPlayerName')).toContainText('Ola');
  await page.locator('[data-nav="puzzles"]').click();
  await expect(page.locator('#toast')).toContainText('Finish your game first');
  expect(calls.includes('puzzle_next')).toBe(false);
  // The game is still being followed: the server keeps hearing from us.
  const before = calls.length;
  await expect.poll(() => calls.length - before, { timeout: 8000 }).toBeGreaterThan(0);
  await expect(page.locator('#topPlayerName')).toContainText('Ola');
});

test('sweep: Join room with no code says so', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop room form');
  await mock(page);
  await page.goto('/');
  await page.locator('#join').click();
  await expect(page.locator('#toast')).toContainText('Enter a room code first');
  await expect(page).not.toHaveURL(/game=/);
});

test('sweep: a puzzle is labelled as a puzzle and has no Resign', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop side card');
  await mock(page);
  await page.goto('/');
  await page.locator('[data-nav="puzzles"]').click();
  await expect(page.locator('.live-card-copy small')).toContainText('Puzzle');
  await expect(page.locator('#state')).toContainText('Find the best move');
  await expect(page.locator('#resign')).toBeHidden();
  await expect(page.locator('.board-piece[data-square="h5"]')).toHaveAttribute('data-piece', 'wq');
  await clickSq(page, 'h5'); await clickSq(page, 'f7');
  await expect(page.locator('#state')).toContainText('Puzzle complete', { timeout: 8000 });
  await expect(page.locator('#resign')).toBeHidden();
});

test('sweep: Arena Play now shows the search, and a computer game stops it', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop navigation');
  const calls = await mock(page, {
    tournaments: () => ({ tournaments: [{ id: 't-open', slug: 'open-arena', name: 'Open Arena', status: 'active', rated: false, pool: 'blitz', base_seconds: 300, increment_seconds: 3, starts_at: '2026-01-01T00:00:00Z', ends_at: '2027-09-25T00:00:00Z' }], memberships: [] }),
    tournament_join: () => ({ joined: true }), queue_join: () => ({ queued: true }), queue_status: () => ({ queued: true }), queue_leave: () => ({ left: true }),
  });
  await page.goto('/');
  await page.locator('[data-nav="arena"]').click();
  const card = page.locator('.arena-card').first();
  // The card's details read top to bottom.
  expect(await card.locator('> div').first().evaluate(el => getComputedStyle(el).flexDirection)).toBe('column');
  await card.locator('.arena-join').click();
  await expect(page.locator('#matchSearch')).toBeVisible();
  await expect(page.locator('#findOpponentLabel')).toHaveText('Cancel search');
  await expect.poll(() => calls.filter(a => a === 'queue_status').length).toBeGreaterThan(0);
  await page.locator('[data-mode="computer"]').click();
  await page.locator('#computerStart').click();
  await page.waitForTimeout(600);
  const polled = calls.filter(a => a === 'queue_status').length;
  await page.waitForTimeout(2500);
  expect(calls.filter(a => a === 'queue_status').length).toBe(polled);
});

test('sweep: the piece tint is kept across visits; the old pre-sprite tint is not', async ({ page }) => {
  await mock(page);
  await page.addInitScript(() => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('vanta.theme', JSON.stringify({ pieceTint: 0.18, spriteTint: 0.3 })) } });
  await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.style.getPropertyValue('--piece-tint'))).toBe('0.3');
  expect(await page.locator('#pieceTint').inputValue()).toBe('30');
  await page.evaluate(() => localStorage.setItem('vanta.theme', JSON.stringify({ pieceTint: 0.18 })));
  await page.reload();
  expect(await page.evaluate(() => document.documentElement.style.getPropertyValue('--piece-tint'))).toBe('0');
});

test('sweep: the home hero shows all of its text at 1280×720', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop hero');
  await page.setViewportSize({ width: 1280, height: 720 });
  await mock(page);
  await page.goto('/');
  const fit = await page.evaluate(() => { const hero = document.querySelector('.lpanel .hero'), p = hero.querySelector('p'); return { hero: hero.getBoundingClientRect().bottom, p: p.getBoundingClientRect().bottom } });
  expect(fit.p).toBeLessThanOrEqual(fit.hero);
});

test('sweep: a Gauntlet opponent is named; the usual picks stop looking chosen', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop panel');
  await mock(page);
  await page.goto('/');
  await page.locator('[data-mode="computer"]').click();
  await expect(page.locator('#specialOpponent')).toBeHidden();
  // The Gauntlet's first stage, as Campaign, Gauntlet and Shadow games start.
  await page.locator('.computer-gauntlet').click();
  await page.locator('.gauntlet-start').click();
  await expect(page.locator('#topPlayerName')).toHaveText('The Gate');
  await page.locator('[data-mode="computer"]').click();
  await expect(page.locator('#specialOpponent')).toContainText('Now playing The Gate');
  await expect(page.locator('.computer-view')).toHaveClass(/special-game/);
  await page.locator('#botGrid .bot-card').first().click();
  await expect(page.locator('#specialOpponent')).toBeHidden();
});

test.describe('phone', () => {
  test('sweep: an endgame drill opens the board', async ({ page }) => {
    test.skip(test.info().project.name !== 'mobile', 'Phone shell');
    await mock(page);
    await page.goto('/');
    await page.locator('[data-m-tab="learn"]').click();
    await page.locator('.open-endgames').click();
    await page.locator('[data-eg="kp-k-win"]').click();
    await expect(page.locator('.shell')).toHaveAttribute('data-mview', 'game');
    await expect(page.locator('.board')).toBeVisible();
  });
  test('sweep: after solving a puzzle, Next stays and the puzzle menu opens', async ({ page }) => {
    test.skip(test.info().project.name !== 'mobile', 'Phone shell');
    await mock(page);
    await page.goto('/');
    await page.locator('[data-m-tab="puzzles"]').click();
    await expect(page.locator('.shell')).toHaveAttribute('data-mview', 'game');
    await expect(page.locator('[data-m-action="puzzle-menu"]')).toBeVisible();
    await expect(page.locator('.board-piece[data-square="h5"]')).toHaveAttribute('data-piece', 'wq');
    await clickSq(page, 'h5'); await clickSq(page, 'f7');
    await expect(page.locator('[data-m-action="puzzle-next"]')).toBeVisible();
    await expect(page.locator('#mGameTitle')).not.toHaveText('Casual game');
    await page.locator('[data-m-action="puzzle-menu"]').click();
    await expect(page.locator('.shell')).toHaveAttribute('data-mview', 'panel');
  });
});
