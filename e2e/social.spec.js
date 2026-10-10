import { test, expect } from '@playwright/test';

// Mocked server: Berserk, friends and challenges, daily games.
const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
function liveGame(extra = {}) {
  const now = new Date().toISOString();
  return { id: 'g-soc', invite_code: 'SOCL1234', white_player_id: 'me', black_player_id: 'opp', white_name: 'Me', black_name: 'Opp',
    status: 'active', result: '*', rated: true, pool: 'blitz', source: 'queue', fen: START, version: 1, move_count: 0, move_history: [],
    time_control_seconds: 180, increment_seconds: 2, white_time_ms: 180000, black_time_ms: 180000, last_move_at: now, started_at: now,
    white_last_seen_at: now, black_last_seen_at: now, ...extra };
}
async function mock(page, handlers, { signedIn = false, profile = {} } = {}) {
  await page.addInitScript(signed => {
    localStorage.setItem('vch.intro-seen', '1'); localStorage.setItem('vanta.flagPrompt', '1');
    if (signed) localStorage.setItem('vanta.auth-session', JSON.stringify({ access_token: 'test-token', refresh_token: 'test-refresh' }));
  }, signedIn);
  const calls = [];
  await page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', async route => {
    let body = {}; try { body = route.request().postDataJSON() } catch {}
    calls.push(body);
    const player = { id: 'me', username: 'me', display_name: 'Me', account: signedIn, ratings: { rapid: 1200 }, ...profile };
    const payload = handlers[body.action]?.(body) ?? (body.action === 'profile' ? { player } : body.action === 'chat_list' ? { messages: [], playerId: 'me' } : body.action === 'challenges' ? { incoming: [], outgoing: [], accepted: [] } : body.action === 'daily_games' ? { games: [] } : {});
    await route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ serverNow: new Date().toISOString(), ...payload }) });
  });
  return calls;
}

test('berserk: a ready player halves their clock before the first move', async ({ page }) => {
  let state = liveGame();
  const calls = await mock(page, {
    create: () => ({ game: state, player: { id: 'me' }, seat: 'w' }), state: () => ({ game: state, seat: 'w' }), heartbeat: () => ({ game: state, seat: 'w' }),
    berserk: () => { state = { ...state, white_berserk: true, white_time_ms: 90000, version: 2 }; return { game: state, berserk: true } },
  }, { profile: { berserk_ready: true, rated_win_streak: 3 } });
  await page.goto('/');
  await page.locator('#create').click();
  await expect(page.locator('#berserkCard')).toBeVisible();
  await page.locator('#goBerserk').click();
  await expect.poll(() => calls.some(c => c.action === 'berserk' && c.gameId === 'g-soc')).toBe(true);
  await expect(page.locator('#berserkCard')).toBeHidden();
  await expect(page.locator('.player.bottom')).toHaveClass(/berserk/);
  await expect(page.locator('#bottomClock')).toHaveText(/^1:(2\d|30)$/);
});

test('berserk: no card without a charge, or in a casual game', async ({ page }) => {
  const state = liveGame({ rated: false });
  await mock(page, { create: () => ({ game: state, player: { id: 'me' }, seat: 'w' }), state: () => ({ game: state, seat: 'w' }), heartbeat: () => ({ game: state, seat: 'w' }) }, { profile: { berserk_ready: true } });
  await page.goto('/');
  await page.locator('#create').click();
  await expect(page.locator('#bottomClock')).toHaveText(/^(3:00|2:5\d)$/);
  await expect(page.locator('#berserkCard')).toBeHidden();
});

test('daily room: days per move, sent to the server, shown on the clock', async ({ page }) => {
  let created = null;
  await mock(page, {
    create: body => { created = body; const g = liveGame({ rated: false, pool: 'daily', daily_days: 3, time_control_seconds: 259200, white_time_ms: 259200000, black_time_ms: 259200000, status: 'waiting', black_player_id: null }); return { game: g, player: { id: 'me' }, seat: 'w' } },
  });
  await page.goto('/');
  test.skip(test.info().project.name === 'mobile', 'Room form layout is desktop; the daily option is the same select on phones');
  await page.locator('#time').selectOption('daily-3');
  await page.locator('#create').click();
  await expect.poll(() => created?.dailyDays).toBe(3);
  await expect(page.locator('#bottomClock')).toHaveText('3d 0h');
});

test('friends: incoming challenge in the bell and the Friends page; accepting opens the game', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop navigation; the phone opens Friends from More');
  const challenge = { id: 'c1', from: { id: 'opp', name: 'Rival', rating: 1300, online: true }, to: { id: 'me', name: 'me' }, base_seconds: 300, increment_seconds: 0, daily_days: null, rated: false, color: 'random' };
  let sent = null;
  const calls = await mock(page, {
    challenges: () => ({ incoming: [challenge], outgoing: [], accepted: [] }),
    daily_games: () => ({ games: [{ id: 'd1', code: 'DAILY123', opponent: 'Pen Pal', seat: 'w', yourTurn: true, status: 'active', daily_days: 3, deadline: new Date(Date.now() + 2 * 86400000 + 3600000).toISOString(), moves: 4 }] }),
    friends: () => ({ friends: [{ id: 'f2', name: 'Zed', rating: 1250, online: false, following: true }, { id: 'f1', name: 'Amy', rating: 1400, online: true, following: true }], followers: 4 }),
    player_search: () => ({ players: [{ id: 'p9', name: 'searcher', rating: 1500, online: false, following: false }] }),
    challenge_send: body => { sent = body; return { challenge: { id: 'c2' } } },
    challenge_respond: () => ({ game: liveGame({ rated: false, invite_code: 'ACPT5678' }), seat: 'b' }),
  }, { signedIn: true });
  await page.goto('/');
  await expect(page.locator('#notifyCount')).toHaveText('2');
  await page.locator('.main-nav [data-nav="friends"]').click();
  await expect(page.locator('#challengeList .challenge-row')).toContainText('Rival');
  await expect(page.locator('#dailyList .daily-row')).toContainText('Your move');
  await expect(page.locator('#friendList .friend-row').first()).toContainText('Amy');
  await expect(page.locator('#followerCount')).toHaveText('2 following · 4 followers');
  await page.locator('#friendSearch').fill('sea');
  await expect(page.locator('#friendResults .friend-row')).toContainText('searcher');
  await page.locator('#friendResults .friend-challenge').click();
  await page.locator('.challenge-form [data-ct="daily-1"]').click();
  await page.getByRole('button', { name: 'Send challenge' }).click();
  await expect.poll(() => sent).toMatchObject({ action: 'challenge_send', toPlayerId: 'p9', rated: false, color: 'random', dailyDays: 1 });
  await page.locator('#challengeList .challenge-accept').click();
  await expect(page).toHaveURL(/\?game=ACPT5678/);
  expect(calls.some(c => c.action === 'challenge_respond' && c.challengeId === 'c1' && c.accept === true)).toBe(true);
});

test('friends: guests are asked to sign in', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop navigation');
  await mock(page, {});
  await page.goto('/');
  await page.locator('.main-nav [data-nav="friends"]').click();
  await expect(page.locator('.friends-signin')).toContainText('Sign in to follow players');
});

test('profile: rating grid, Berserk progress and achievements', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop account menu');
  await mock(page, {}, { signedIn: true, profile: { ratings: { rapid: 1200, daily: 1310 }, puzzle_rating: 1640, rated_win_streak: 1, achievements: [{ id: 'first-win', at: '2026-10-09T10:00:00Z' }] } });
  await page.goto('/');
  await page.locator('#accountBtn').click();
  await page.locator('#profileMenuProfile').click();
  await expect(page.locator('#ratingDaily')).toHaveText('1310');
  await expect(page.locator('#ratingPuzzle')).toHaveText('1640');
  await expect(page.locator('#berserkStatus')).toHaveText('2 more rated wins to Berserk');
  await expect(page.locator('#achievementCount')).toHaveText('1 / 11');
  await expect(page.locator('.achievement.earned')).toHaveCount(1);
});
