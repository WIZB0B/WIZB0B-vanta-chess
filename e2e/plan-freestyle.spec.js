import { test, expect } from '@playwright/test';

const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
test('conditional moves: plan "if e5 then Nf3" in a daily game and save it', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop board clicks');
  await page.addInitScript(() => { localStorage.setItem('vch.intro-seen', '1'); localStorage.setItem('vanta.flagPrompt', '1') });
  const now = new Date().toISOString();
  const state = { id: 'g-daily', invite_code: 'DAILY123', white_player_id: 'me', black_player_id: 'opp', white_name: 'Me', black_name: 'Pen Pal', status: 'active', result: '*', rated: false, pool: 'daily', daily_days: 3, fen: AFTER_E4, version: 2, move_count: 1, move_history: [{ from: 'e2', to: 'e4', san: 'e4', color: 'w' }], time_control_seconds: 259200, increment_seconds: 0, white_time_ms: 259200000, black_time_ms: 259200000, last_move_at: now, started_at: now, white_last_seen_at: now, black_last_seen_at: now };
  let saved = null;
  await page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', async route => {
    let body = {}; try { body = route.request().postDataJSON() } catch {}
    const map = { profile: { player: { id: 'me' } }, create: { game: state, seat: 'w', player: { id: 'me' } }, state: { game: state, seat: 'w' }, heartbeat: { game: state, seat: 'w' }, chat_list: { messages: [] }, conditional_list: { lines: [] }, conditional_set: (saved = body.action === 'conditional_set' ? body.lines : saved, { lines: saved || [] }) };
    await route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ serverNow: new Date().toISOString(), ...(map[body.action] || {}) }) });
  });
  await page.goto('/');
  await page.locator('#create').click();
  await expect(page.locator('#planCard')).toBeVisible();
  await expect(page.locator('#bottomClock')).toHaveText(/^[23]d \d+h$/);
  await page.locator('[data-plan="start"]').click();
  const click = async sq => { const b = await page.locator(`[data-sq="${sq}"]`).boundingBox(); await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2) };
  await click('e7'); await click('e5');
  await click('g1'); await click('f3');
  await expect(page.locator('#planCard small')).toHaveText('1… e5 2. Nf3');
  await page.locator('[data-plan="save"]').click();
  await expect.poll(() => saved).toEqual([['e7e5', 'g1f3']]);
  await expect(page.locator('.board-piece[data-square="g1"]')).toHaveCount(1, { timeout: 3000 });
  await expect(page.locator('.plan-list li')).toContainText('1… e5 2. Nf3');
});

test('freestyle against the computer: a 960 start without castling', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop left panel');
  await page.addInitScript(() => { localStorage.setItem('vch.intro-seen', '1'); localStorage.setItem('vanta.flagPrompt', '1') });
  await page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', route => route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ player: { id: 'me' }, bots: [] }) }));
  await page.goto('/');
  await page.locator('[data-mode="computer"]').click();
  await page.locator('[data-computer-variant="freestyle"]').click();
  await page.locator('#computerStart').click();
  await expect(page.locator('#toast')).toContainText('Freestyle');
  await expect(page.locator('.board-piece[data-square$="1"]')).toHaveCount(8);
  await expect(page.locator('.board-piece[data-square$="2"]')).toHaveCount(8);
});
