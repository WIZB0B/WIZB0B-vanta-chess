import { test, expect } from '@playwright/test';

const FEN = 'rnb1kbnr/ppp1pppp/8/3q4/8/8/PPPP1PPP/RNBQKBNR w KQkq - 0 3';
test('Crazyhouse: the pocket shows your captures; tap it, tap a square, the server gets a drop', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop clicks');
  await page.addInitScript(() => { localStorage.setItem('vch.intro-seen', '1'); localStorage.setItem('vanta.flagPrompt', '1') });
  let state = { id: 'gzh', invite_code: 'ZHZH1234', white_player_id: 'me', black_player_id: 'opp', white_name: 'Me', black_name: 'Opp', status: 'active', result: '*', rated: false, pool: 'crazyhouse', variant: 'crazyhouse', zh_pockets: { w: { p: 1 }, b: { p: 1 } }, zh_promoted: [], fen: FEN, version: 4, move_count: 4, move_history: [{ san: 'e4', from: 'e2', to: 'e4', color: 'w' }, { san: 'd5', from: 'd7', to: 'd5', color: 'b' }, { san: 'exd5', from: 'e4', to: 'd5', color: 'w' }, { san: 'Qxd5', from: 'd8', to: 'd5', color: 'b' }], time_control_seconds: 600, increment_seconds: 0, white_time_ms: 600000, black_time_ms: 600000, last_move_at: new Date().toISOString() };
  let sent = null;
  await page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', async route => {
    let body = {}; try { body = route.request().postDataJSON() } catch {}
    if (body.action === 'move') { sent = body; state = { ...state, fen: 'rnb1kbnr/ppp1pppp/8/3q4/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 1 3', version: 5, move_count: 5, zh_pockets: { w: {}, b: { p: 1 } }, move_history: [...state.move_history, { san: 'P@e4', drop: 'p', from: null, to: 'e4', color: 'w' }] } }
    const map = { profile: { player: { id: 'me' } }, create: { game: state, seat: 'w', player: { id: 'me' } }, state: { game: state, seat: 'w' }, heartbeat: { game: state, seat: 'w' }, move: { game: state, seat: 'w' }, chat_list: { messages: [] } };
    await route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ serverNow: new Date().toISOString(), ...(map[body.action] || {}) }) });
  });
  await page.goto('/');
  await page.locator('#variant').selectOption('crazyhouse');
  await page.locator('#create').click();
  await expect(page.locator('#bottomCaptured .zh-piece[data-drop="p"] b')).toHaveText('1');
  await expect(page.locator('#topCaptured .zh-piece b')).toHaveText('1');
  await page.locator('#bottomCaptured [data-drop="p"]').click();
  await expect(page.locator('[data-sq="e4"].legal')).toHaveCount(1);
  await expect(page.locator('[data-sq="e1"].legal')).toHaveCount(0);
  const b = await page.locator('[data-sq="e4"]').boundingBox(); await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  await expect.poll(() => sent && [sent.drop, sent.to]).toEqual(['p', 'e4']);
  await expect(page.locator('.board-piece[data-square="e4"]')).toHaveCount(1);
  await expect(page.locator('#bottomCaptured .zh-empty')).toBeVisible();
});
