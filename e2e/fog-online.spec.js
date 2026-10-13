import { test, expect } from '@playwright/test';
import { Chess } from 'chess.js';
import { viewFor } from '../supabase/functions/chess/fog.js';

// Online Vanta Dark (round 13): the browser only ever gets the server's view for its seat.
test('online Vanta Dark: the board shows your view; moves go to the server', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop room form');
  await page.addInitScript(() => { localStorage.setItem('vch.intro-seen', '1'); localStorage.setItem('vanta.flagPrompt', '1') });
  const now = new Date().toISOString();
  const real = { id: 'g-dark', invite_code: 'DARK1234', variant: 'dark', pool: 'dark', white_player_id: 'me', black_player_id: 'opp', white_name: 'Me', black_name: 'Ola', status: 'active', result: '*', rated: false, fen: new Chess().fen(), version: 1, move_count: 0, move_history: [], time_control_seconds: 600, increment_seconds: 0, white_time_ms: 600000, black_time_ms: 600000, last_move_at: now, started_at: now, white_last_seen_at: now, black_last_seen_at: now };
  const moves = [];
  let state = real;
  await page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', async route => {
    let body = {}; try { body = route.request().postDataJSON() } catch {}
    let out = {};
    if (body.action === 'profile') out = { player: { id: 'me', notify_topic: 'abc' } };
    if (['create', 'state', 'heartbeat'].includes(body.action)) out = { game: viewFor(Chess, state, 'w'), seat: 'w', player: { id: 'me' } };
    if (body.action === 'game_channel') out = { topic: 'seat:secret', seat: 'w' };
    if (body.action === 'move') {
      moves.push(body);
      const c = new Chess(state.fen); const m = c.move({ from: body.from, to: body.to, promotion: body.promotion });
      state = { ...state, fen: c.fen(), version: state.version + 1, move_count: 1, move_history: [{ from: m.from, to: m.to, san: m.san, color: 'w', k: 'x' }] };
      out = { game: viewFor(Chess, state, 'w'), move: m };
    }
    await route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ serverNow: new Date().toISOString(), ...out }) });
  });
  await page.goto('/');
  await page.locator('#variant').selectOption('dark');
  await page.locator('#create').click();
  await expect(page.locator('#board')).toHaveClass(/vanta-dark/);
  // Black's pieces are out of sight from the start (only White's own side and the squares it reaches).
  await expect(page.locator('.board-piece[data-piece="bk"]')).toHaveCount(0);
  await expect(page.locator('.square.fog')).not.toHaveCount(0);
  const click = async sq => { const b = await page.locator(`[data-sq="${sq}"]`).boundingBox(); await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2) };
  await click('e2');
  await expect(page.locator('[data-sq="e4"]')).toHaveClass(/legal/);
  await click('e4');
  await expect.poll(() => moves.length).toBe(1);
  expect(moves[0]).toMatchObject({ from: 'e2', to: 'e4' });
  await expect(page.locator('.board-piece[data-square="e4"]')).toHaveAttribute('data-piece', 'wp');
});
