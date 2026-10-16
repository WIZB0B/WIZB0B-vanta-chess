import { test, expect } from '@playwright/test';

// Owner, 2026-10-13: switching to the Computer tab in the middle of an online game stopped the
// game's heartbeat, nothing led back to it, and the opponent claimed the win. Now the game keeps
// beating while you look elsewhere, a button brings you back, nothing else takes its board, and
// VCH opened again goes straight back to it. (Mocked server, like game-moments.spec.js.)
test('leave an online game for the Computer tab, come back to it, and after a reload too', async ({ page }) => {
  test.setTimeout(60000);
  await page.addInitScript(() => localStorage.setItem('vch.intro-seen', '1'));
  const now = Date.now(), iso = ms => new Date(now - ms).toISOString();
  const game = { id: '0f4b5c1e-2a3d-4e5f-8a9b-0c1d2e3f4a5b', invite_code: 'BACK1234', white_player_id: 'me', black_player_id: 'opp', white_name: 'Me', black_name: 'Opp',
    status: 'active', result: '*', rated: false, pool: 'rapid', fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', version: 3, move_count: 2, move_history: [],
    time_control_seconds: 600, increment_seconds: 0, white_time_ms: 600000, black_time_ms: 600000, last_move_at: iso(2000), started_at: iso(60000),
    white_last_seen_at: iso(500), black_last_seen_at: iso(500) };
  const calls = [];
  await page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', async route => {
    let body = {}; try { body = route.request().postDataJSON() } catch {}
    calls.push({ action: body.action, gameId: body.gameId, at: Date.now() });
    const player = { id: 'me', display_name: 'Me', ratings: { rapid: 1200 } };
    let payload = {};
    if (body.action === 'profile') payload = { player };
    else if (['create', 'state', 'heartbeat', 'join'].includes(body.action)) payload = { game: { ...game, white_last_seen_at: new Date().toISOString(), black_last_seen_at: new Date().toISOString() }, player, seat: 'w', serverNow: new Date().toISOString() };
    else if (body.action === 'chat_list') payload = { messages: [], playerId: 'me' };
    await route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(payload) });
  });
  const phone = test.info().project.name === 'mobile';
  const back = page.locator(phone ? '#mReturnGame' : '#returnGame');
  await page.goto('/');
  await page.locator('#create').click();
  await expect(page.locator('.board-piece')).toHaveCount(32);
  await expect(back).toBeHidden();

  // Somewhere else (on a computer the Computer tab, on a phone the Puzzles tab): the game keeps
  // beating (its opponent cannot claim it) and a button leads back.
  if (phone) { await page.locator('#mBack').click(); await page.locator('[data-m-tab="puzzles"]').click(); } else await page.locator('[data-mode="computer"]').click();
  const beatsAt = Date.now();
  await expect.poll(() => calls.filter(c => c.action === 'heartbeat' && c.gameId === game.id && c.at > beatsAt).length, { timeout: 14000 }).toBeGreaterThanOrEqual(2);
  await expect(back).toBeVisible({ timeout: 8000 });
  await page.screenshot({ path: test.info().outputPath('return-button.png') });

  // A computer game cannot take the board from it.
  if (!phone) {
    await page.locator('#computerStart').click();
    await expect(page.locator('#toast')).toContainText('Finish your game first');
    await expect(page.locator('[data-mode="computer"]')).toHaveClass(/\bon\b/);
  }

  // Back: the game is on the board again, in the Room tab, and the button goes.
  await back.click();
  if (!phone) await expect(page.locator('[data-mode="room"]')).toHaveClass(/\bon\b/, { timeout: 6000 });
  await expect(page.locator('.board-piece').first()).toBeVisible({ timeout: 6000 });
  await expect(back).toBeHidden();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('vch.liveGame') || 'null')?.id)).toBe(game.id);

  // VCH opened again (no link in the address bar): straight back into the game.
  await page.goto('/');
  await expect.poll(() => calls.filter(c => c.action === 'state' && c.gameId === game.id).length, { timeout: 8000 }).toBeGreaterThanOrEqual(phone ? 1 : 2);
  if (!phone) await expect(page.locator('[data-mode="room"]')).toHaveClass(/\bon\b/, { timeout: 6000 });
  await expect(page.locator('.board-piece')).toHaveCount(32);
});

test('a game that ended while you were away is let go, with how it ended', async ({ page }) => {
  test.setTimeout(45000);
  test.skip(test.info().project.name === 'mobile', 'a phone shows the game itself while one is on: it ends on the board');
  await page.addInitScript(() => localStorage.setItem('vch.intro-seen', '1'));
  const game = { id: '1f4b5c1e-2a3d-4e5f-8a9b-0c1d2e3f4a5b', invite_code: 'END12345', white_player_id: 'me', black_player_id: 'opp', white_name: 'Me', black_name: 'Opp',
    status: 'active', result: '*', rated: false, pool: 'rapid', fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', version: 3, move_count: 2, move_history: [],
    time_control_seconds: 600, increment_seconds: 0, white_time_ms: 600000, black_time_ms: 600000, last_move_at: new Date().toISOString(), started_at: new Date().toISOString(),
    white_last_seen_at: new Date().toISOString(), black_last_seen_at: new Date().toISOString() };
  let resigned = false;
  await page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', async route => {
    let body = {}; try { body = route.request().postDataJSON() } catch {}
    const player = { id: 'me', display_name: 'Me', ratings: { rapid: 1200 } };
    let payload = {};
    const state = resigned ? { ...game, status: 'white_won', result: '1-0', version: 4, end_reason: 'resignation' } : game;
    if (body.action === 'profile') payload = { player };
    else if (['create', 'state', 'heartbeat', 'join'].includes(body.action)) payload = { game: state, player, seat: 'w', serverNow: new Date().toISOString() };
    else if (body.action === 'chat_list') payload = { messages: [], playerId: 'me' };
    await route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(payload) });
  });
  await page.goto('/');
  await page.locator('#create').click();
  await expect(page.locator('.board-piece')).toHaveCount(32);
  await page.locator('[data-mode="computer"]').click();
  resigned = true; // the opponent resigns while you look at the computer opponents
  await expect(page.locator('#toast')).toContainText('Your game ended · you won', { timeout: 12000 });
  expect(await page.evaluate(() => localStorage.getItem('vch.liveGame'))).toBeNull();
  await expect(page.locator(test.info().project.name === 'mobile' ? '#mReturnGame' : '#returnGame')).toBeHidden();
});
