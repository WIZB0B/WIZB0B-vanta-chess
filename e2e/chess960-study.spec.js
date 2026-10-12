import { test, expect } from '@playwright/test';

const FEN = 'nrk1qbrn/ppppbppp/4p3/8/8/4P3/PPPPBPPP/NRK1QBRN w - - 2 3';
test('Chess960: tap the king, then its rook, to castle; the server gets O-O-O', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop clicks');
  await page.addInitScript(() => { localStorage.setItem('vch.intro-seen', '1'); localStorage.setItem('vanta.flagPrompt', '1') });
  const now = new Date().toISOString();
  let state = { id: 'g960', invite_code: 'FREE1234', white_player_id: 'me', black_player_id: 'opp', white_name: 'Me', black_name: 'Opp', status: 'active', result: '*', rated: true, pool: 'freestyle', variant: 'freestyle', start_fen: 'nrkbqbrn/pppppppp/8/8/8/8/PPPPPPPP/NRKBQBRN w - - 0 1', castling960: 'GBgb', fen: FEN, version: 5, move_count: 4, move_history: [{ san: 'e3', from: 'e2', to: 'e3', color: 'w' }, { san: 'e6', from: 'e7', to: 'e6', color: 'b' }, { san: 'Bde2', from: 'd1', to: 'e2', color: 'w' }, { san: 'Bde7', from: 'd8', to: 'e7', color: 'b' }], time_control_seconds: 600, increment_seconds: 0, white_time_ms: 600000, black_time_ms: 600000, last_move_at: now, started_at: now, white_last_seen_at: now, black_last_seen_at: now };
  let sent = null;
  await page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', async route => {
    let body = {}; try { body = route.request().postDataJSON() } catch {}
    if (body.action === 'move') { sent = body; state = { ...state, fen: 'nrk1qbrn/ppppbppp/4p3/8/8/4P3/PPPPBPPP/N1KRQBRN b - - 3 3', version: 6, move_count: 5, castling960: 'gb', move_history: [...state.move_history, { san: 'O-O-O', from: 'c1', to: 'c1', color: 'w', castle: true }] } }
    const map = { profile: { player: { id: 'me' } }, create: { game: state, seat: 'w', player: { id: 'me' } }, state: { game: state, seat: 'w' }, heartbeat: { game: state, seat: 'w' }, move: { game: state, seat: 'w' }, chat_list: { messages: [] } };
    await route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ serverNow: new Date().toISOString(), ...(map[body.action] || {}) }) });
  });
  await page.goto('/');
  await page.locator('#create').click();
  await expect(page.locator('.board-piece[data-square="b1"]')).toHaveCount(1);
  const click = async sq => { const b = await page.locator(`[data-sq="${sq}"]`).boundingBox(); await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2) };
  await click('c1'); await click('b1');
  await expect.poll(() => sent?.castle).toBe('O-O-O');
  await expect(page.locator('.board-piece[data-square="d1"]')).toHaveCount(1);
  await expect(page.locator('.board-piece[data-square="b1"]')).toHaveCount(0);
});

test('studies: write a line with a note, save it, the link opens it read-only', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop panel');
  await page.addInitScript(() => { localStorage.setItem('vch.intro-seen', '1'); localStorage.setItem('vanta.flagPrompt', '1'); localStorage.setItem('vanta.auth-session', JSON.stringify({ access_token: 't', refresh_token: 'r' })) });
  let saved = null;
  await page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', async route => {
    let body = {}; try { body = route.request().postDataJSON() } catch {}
    if (body.action === 'study_save') saved = body;
    const map = { profile: { player: { id: 'me', username: 'me', account: true } }, study_list: { studies: [] }, study_save: { study: { code: 'STUDY123', title: 'Italian ideas' } }, challenges: { incoming: [], outgoing: [], accepted: [] }, daily_games: { games: [] },
      study_get: { study: { code: 'STUDY123', title: 'Italian ideas', start_fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', intro: 'Fast development', moves: [{ san: 'e4', comment: 'Center!' }, { san: 'e5', comment: '' }], owner: 'coach', mine: false } } };
    await route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(map[body.action] || {}) });
  });
  await page.goto('/');
  await page.locator('.main-nav [data-nav="learn"]').click();
  await page.locator('.open-studies').click();
  await page.locator('.study-new').click();
  const click = async sq => { const b = await page.locator(`[data-sq="${sq}"]`).boundingBox(); await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2) };
  await click('e2'); await click('e4'); await click('e7'); await click('e5');
  await page.locator('.study-title').fill('Italian ideas');
  await page.locator('[data-sply="1"]').click();
  await page.locator('.study-comment textarea').fill('Center!');
  await page.locator('.study-save').click();
  await expect.poll(() => saved?.moves).toEqual([{ san: 'e4', comment: 'Center!' }, { san: 'e5', comment: '' }]);
  expect(saved.title).toBe('Italian ideas');
  await page.goto('/?study=STUDY123');
  await expect(page.locator('.study-panel h4')).toHaveText('Italian ideas');
  await page.locator('[data-sply="1"]').click();
  await expect(page.locator('.study-note')).toContainText('Center!');
  await click('d2'); await click('d4');
  await expect(page.locator('.board-piece[data-square="d2"]')).toHaveCount(1); // read-only
});
