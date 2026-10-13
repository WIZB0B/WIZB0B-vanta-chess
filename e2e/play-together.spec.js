import { test, expect } from '@playwright/test';

// Mocked server: takeback requests, the Watch tab, and the weekly arena.
const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const AFTER_E4_E5 = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
function liveGame(extra = {}) {
  const now = new Date().toISOString();
  return { id: 'g-tb', invite_code: 'TAKE1234', white_player_id: 'me', black_player_id: 'opp', white_name: 'Me', black_name: 'Opp',
    status: 'active', result: '*', rated: false, pool: 'rapid', source: 'private', fen: AFTER_E4_E5, version: 3, move_count: 2,
    move_history: [{ from: 'e2', to: 'e4', san: 'e4', color: 'w' }, { from: 'e7', to: 'e5', san: 'e5', color: 'b' }],
    time_control_seconds: 600, increment_seconds: 0, white_time_ms: 600000, black_time_ms: 600000, last_move_at: now, started_at: now,
    white_last_seen_at: now, black_last_seen_at: now, ...extra };
}
async function mock(page, handlers) {
  await page.addInitScript(() => { localStorage.setItem('vch.intro-seen', '1'); localStorage.setItem('vanta.flagPrompt', '1') });
  await page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', async route => {
    let body = {}; try { body = route.request().postDataJSON() } catch {}
    const player = { id: 'me', display_name: 'Me', ratings: { rapid: 1200 } };
    const payload = handlers[body.action]?.(body) ?? (body.action === 'profile' ? { player } : body.action === 'chat_list' ? { messages: [], playerId: 'me' } : {});
    await route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ serverNow: new Date().toISOString(), ...payload }) });
  });
}

test('takeback: the opponent asks, you accept, the move comes off the board', async ({ page }) => {
  let state = liveGame({ fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2', version: 4, move_count: 3,
    move_history: [...liveGame().move_history, { from: 'g1', to: 'f3', san: 'Nf3', color: 'w' }], white_player_id: 'opp', black_player_id: 'me', white_name: 'Opp', black_name: 'Me',
    takeback_offer_by: 'opp', takeback_offer_version: 4 });
  let answered = null;
  await mock(page, {
    create: () => ({ game: state, player: { id: 'me' }, seat: 'b' }), state: () => ({ game: state, seat: 'b' }), heartbeat: () => ({ game: state, seat: 'b' }),
    takeback_respond: body => { answered = body.accept; state = { ...state, fen: AFTER_E4_E5, version: 5, move_count: 2, move_history: state.move_history.slice(0, 2), takeback_offer_by: null, takeback_offer_version: null }; return { game: state, accepted: true, plies: 1 } },
  });
  await page.goto('/');
  await page.locator('#create').click();
  await expect(page.locator('#takebackCard')).toBeVisible();
  await expect(page.locator('.board-piece[data-square="f3"]')).toHaveCount(1);
  await page.locator('#acceptTakeback').click();
  await expect.poll(() => answered).toBe(true);
  await expect(page.locator('.board-piece[data-square="f3"]')).toHaveCount(0);
  await expect(page.locator('.board-piece[data-square="g1"]')).toHaveCount(1);
  await expect(page.locator('#takebackCard')).toBeHidden();
});

test('takeback is offered in casual games and never in rated ones', async ({ page }) => {
  let rated = false;
  await mock(page, { create: () => ({ game: liveGame({ rated }), player: { id: 'me' }, seat: 'w' }), state: () => ({ game: liveGame({ rated }), seat: 'w' }), heartbeat: () => ({ game: liveGame({ rated }), seat: 'w' }) });
  await page.goto('/');
  await page.locator('#create').click();
  const button = test.info().project.name === 'mobile' ? page.locator('[data-m-action="takeback"]') : page.locator('#takeback');
  await expect(button).toHaveCount(1);
  await expect(button).not.toHaveClass(/hidden/);
});

test('Watch lists live games and opens one read-only', async ({ page }) => {
  const watched = liveGame({ id: '11111111-2222-3333-4444-555555555555', source: 'queue', white_name: 'Nova', black_name: 'Orion', white_rating_before: 1510, black_rating_before: 1488 });
  await mock(page, { live_games: () => ({ games: [{ ...watched, move_history: undefined }] }), watch_state: () => ({ game: watched }) });
  await page.goto('/');
  if (test.info().project.name === 'mobile') await page.locator('[data-m-tab="watch"]').click();
  else await page.locator('[data-nav="watch"]').click();
  await expect(page.locator('.watch-card')).toHaveCount(1);
  await expect(page.locator('.watch-card')).toContainText('Nova');
  await page.locator('.watch-card').click();
  await expect(page.locator('#topPlayerName')).toHaveText('Orion');
  await expect(page.locator('#bottomPlayerName')).toHaveText('Nova');
  await expect(page.locator('.board-piece[data-square="e4"]')).toHaveCount(1);
  // spectators can't move pieces
  await page.locator('.board').scrollIntoViewIfNeeded();
  const from = await page.locator('[data-sq="d2"]').boundingBox(), to = await page.locator('[data-sq="d4"]').boundingBox();
  await page.mouse.click(from.x + from.width / 2, from.y + from.height / 2); await page.mouse.click(to.x + to.width / 2, to.y + to.height / 2);
  await expect(page.locator('.board-piece[data-square="d2"]')).toHaveCount(1);
  if (test.info().project.name === 'mobile') {
    await expect(page.locator('#mGameTitle')).toHaveText('Watching');
    await page.locator('[data-m-action="leave"]').click();
    await expect(page.locator('.watch-card')).toHaveCount(1);
  }
});

test('Arena: the weekly arena leads, upcoming arenas take registrations', async ({ page }) => {
  const soon = new Date(Date.now() + 2 * 86400000), end = new Date(soon.getTime() + 90 * 60000);
  let joined = null;
  await mock(page, {
    tournaments: () => ({ tournaments: [
      { id: 't-open', slug: 'open-arena', name: 'Open Arena', status: 'active', rated: true, pool: 'blitz', base_seconds: 300, increment_seconds: 3, starts_at: '2026-01-01T00:00:00Z', ends_at: '2027-09-25T00:00:00Z' },
      { id: 't-week', slug: 'weekly-arena-x', name: 'VCH Weekly Arena', description: 'Every Saturday', status: 'scheduled', rated: true, pool: 'blitz', base_seconds: 180, increment_seconds: 2, starts_at: soon.toISOString(), ends_at: end.toISOString() },
    ], memberships: [] }),
    tournament_join: body => { joined = body.tournamentId; return { joined: true } },
  });
  await page.goto('/');
  if (test.info().project.name === 'mobile') { await page.locator('[data-m-tab="more"]').click(); await page.locator('#mSheetItems button', { hasText: 'Arena' }).click(); }
  else await page.locator('[data-nav="arena"]').click();
  const first = page.locator('.arena-card').first();
  await expect(first).toHaveClass(/weekly/);
  await expect(first.locator('.arena-when')).toContainText('Starts in');
  await first.locator('.arena-join').click();
  await expect.poll(() => joined).toBe('t-week');
  await expect(first.locator('.arena-join')).toHaveText('Registered');
});
