import { test, expect } from '@playwright/test';

// The opponent stopped sending heartbeats 40s ago (mocked server): the card offers a claim,
// and claiming ends the game.
test('opponent left: claim the win', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('vch.intro-seen','1'));
  const now = Date.now(), iso = ms => new Date(now - ms).toISOString();
  const game = { id:'g-left', invite_code:'LEFT1234', white_player_id:'me', black_player_id:'opp', white_name:'Me', black_name:'Opp',
    status:'active', result:'*', rated:false, pool:'rapid', fen:'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', version:3, move_count:2, move_history:[],
    time_control_seconds:600, increment_seconds:0, white_time_ms:600000, black_time_ms:600000, last_move_at:iso(41000), started_at:iso(60000),
    white_last_seen_at:iso(500), black_last_seen_at:iso(40000) };
  let claimed = null;
  await page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', async route => {
    let body = {}; try { body = route.request().postDataJSON() } catch {}
    const player = { id:'me', display_name:'Me', ratings:{ rapid:1200 } };
    let payload = {};
    if (body.action === 'profile') payload = { player };
    else if (body.action === 'claim_win') { claimed = body.outcome; payload = { game:{ ...game, status:'white_won', result:'1-0', version:4, end_reason:'abandoned' }, claimed:'win', player, seat:'w' } }
    else if (['create','state','heartbeat','join'].includes(body.action)) payload = { game: claimed ? { ...game, status:'white_won', result:'1-0', version:4 } : game, player, seat:'w', serverNow:new Date().toISOString() };
    else if (body.action === 'chat_list') payload = { messages:[], playerId:'me' };
    await route.fulfill({ contentType:'application/json', headers:{ 'access-control-allow-origin':'*' }, body:JSON.stringify(payload) });
  });
  await page.goto('/');
  await page.locator('#create').click();
  await expect(page.locator('#abandonCard')).toBeVisible({ timeout: 4000 });
  await expect(page.locator('#abandonClaim')).toBeVisible();
  await page.screenshot({ path: test.info().outputPath('abandon.png') });
  await page.locator('#abandonClaim').click();
  await expect.poll(() => claimed).toBe('win');
  await expect(page.locator('#abandonCard')).toBeHidden({ timeout: 4000 });
});

test('computer game: Hint draws the engine move as a green arrow; hidden in online play', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('vch.intro-seen','1'));
  await page.goto('/');
  await expect(page.locator('#hint')).toBeHidden();
  await page.locator('[data-mode="computer"]').click();
  await page.locator('#computerStart').click();
  await expect(page.locator('.board-piece')).toHaveCount(32);
  await page.locator('.game-more>summary').click();
  await page.locator('#hint').click();
  await expect(page.locator('.arrow-layer .arrow-green')).toHaveCount(1, { timeout: 8000 });
});
