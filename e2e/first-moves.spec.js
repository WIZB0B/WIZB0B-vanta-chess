import { test, expect } from '@playwright/test';

test('first moves: the clock waits for both first moves and a countdown shows', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('vch.intro-seen', '1'); localStorage.setItem('vanta.flagPrompt', '1') });
  const now = new Date().toISOString();
  const state = { id: 'g-first', invite_code: 'FRST1234', white_player_id: 'me', black_player_id: 'opp', white_name: 'Me', black_name: 'Opp', status: 'active', result: '*', rated: true, pool: 'bullet', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', version: 1, move_count: 0, move_history: [], time_control_seconds: 60, increment_seconds: 0, white_time_ms: 60000, black_time_ms: 60000, last_move_at: now, started_at: now, white_last_seen_at: now, black_last_seen_at: now };
  await page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', async route => {
    let body = {}; try { body = route.request().postDataJSON() } catch {}
    const map = { profile: { player: { id: 'me' } }, create: { game: state, seat: 'w', player: { id: 'me' } }, state: { game: state, seat: 'w' }, heartbeat: { game: state, seat: 'w' }, chat_list: { messages: [] } };
    await route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ serverNow: new Date().toISOString(), ...(map[body.action] || {}) }) });
  });
  await page.goto('/');
  if (test.info().project.name === 'mobile') return; // same card on phones; the room form is desktop-only in tests
  await page.locator('#create').click();
  await expect(page.locator('#firstMoveCard')).toBeVisible();
  await expect(page.locator('#firstMoveTitle')).toHaveText('Your first move');
  await page.waitForTimeout(2200);
  await expect(page.locator('#bottomClock')).toHaveText('1:00');
  await expect(page.locator('#bottomClock')).not.toHaveClass(/running/);
  expect(Number(await page.locator('#firstMoveCount').textContent())).toBeLessThanOrEqual(28);
});
