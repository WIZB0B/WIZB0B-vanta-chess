import { test, expect } from '@playwright/test';

// An online game in progress (mocked server): the engine panel is locked, and an illegal
// try while in check flashes the king's square.
const FEN = '4k3/8/8/8/8/8/3q4/R3K3 w - - 0 1'; // white king e1 in check from the queen on d2
async function mockLiveGame(page){
  const now = new Date().toISOString();
  const game = { id:'g-fair', invite_code:'FAIR1234', white_player_id:'me', black_player_id:'opp', white_name:'Me', black_name:'Opp',
    status:'active', result:'*', rated:false, pool:'rapid', fen:FEN, version:3, move_count:2, move_history:[],
    time_control_seconds:600, increment_seconds:0, white_time_ms:600000, black_time_ms:600000, last_move_at:now, started_at:now,
    white_last_seen_at:now, black_last_seen_at:now };
  await page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', async route => {
    let body = {}; try { body = route.request().postDataJSON() } catch {}
    const player = { id:'me', display_name:'Me', ratings:{ rapid:1200 } };
    const payload = body.action === 'profile' ? { player }
      : ['create','state','heartbeat','join'].includes(body.action) ? { game, player, seat:'w', serverNow:now }
      : body.action === 'chat_list' ? { messages:[], playerId:'me' } : {};
    await route.fulfill({ contentType:'application/json', headers:{ 'access-control-allow-origin':'*' }, body:JSON.stringify(payload) });
  });
}

test('live online game: engine analysis is hidden, an illegal try in check flashes the king', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('vch.intro-seen','1'));
  await mockLiveGame(page);
  await page.goto('/');
  await page.locator('#create').click();
  await expect(page.locator('.board-piece[data-square="a1"]')).toBeVisible();
  await expect(page.locator('.analysis')).toHaveClass(/engine-locked/);
  if (test.info().project.name === 'mobile') {
    // Phones show the board alone during a game; the engine panel isn't on screen at all.
    await expect(page.locator('.rpanel')).toBeHidden();
  } else {
    await expect(page.locator('#engineLockedNote')).toBeVisible();
    await expect(page.locator('#score')).toBeHidden();
    await expect(page.locator('#line')).toBeHidden();
  }

  // Rook a1 -> a5 is illegal (the king is in check): the rook stays and e1 flashes.
  // Drag with a mouse on desktop; tap, tap on the phone.
  if (test.info().project.name === 'mobile') {
    await page.locator('.board').scrollIntoViewIfNeeded();
    for (const sq of ['a1','a5']) { const b = await page.locator(`[data-sq="${sq}"]`).boundingBox(); await page.touchscreen.tap(b.x + b.width/2, b.y + b.height/2); }
  } else {
    const from = await page.locator('[data-sq="a1"]').boundingBox(), to = await page.locator('[data-sq="a5"]').boundingBox();
    await page.mouse.move(from.x + from.width/2, from.y + from.height/2); await page.mouse.down();
    await page.mouse.move(to.x + to.width/2, to.y + to.height/2, { steps: 8 }); await page.mouse.up();
  }
  await expect(page.locator('[data-sq="e1"] .illegal-flash')).toHaveCount(1);
  await expect(page.locator('.board-piece[data-square="a1"]')).toBeVisible();
  await page.screenshot({ path: test.info().outputPath('fair-play.png') });
});
