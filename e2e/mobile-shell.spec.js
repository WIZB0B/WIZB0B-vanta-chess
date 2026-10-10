import { test, expect } from '@playwright/test';

// Phones get the app-style layout (src/mobile-shell.js); desktops never do.
async function setup(page){
  await page.addInitScript(()=>{localStorage.setItem('vch.intro-seen','1');localStorage.setItem('vanta.flagPrompt','1')});
  await page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', async route => {
    let body={};try{body=route.request().postDataJSON()}catch{}
    const player={id:'me',display_name:'Me',ratings:{rapid:1200}};
    const now=new Date().toISOString();
    const waiting={id:'g-wait',invite_code:'WAIT1234',white_player_id:'me',black_player_id:null,white_name:'Me',status:'waiting',result:'*',rated:false,pool:'rapid',fen:'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',version:0,move_count:0,move_history:[],time_control_seconds:600,increment_seconds:0,white_time_ms:600000,black_time_ms:600000,white_last_seen_at:now};
    const payload=body.action==='profile'?{player}:['create','state','heartbeat'].includes(body.action)?{game:waiting,player,seat:'w',serverNow:now}:body.action==='chat_list'?{messages:[],playerId:'me'}:{};
    await route.fulfill({contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(payload)});
  });
}

test('desktop keeps its layout: no tab bar, no phone views', async ({ page }) => {
  test.skip(test.info().project.name!=='desktop','desktop only');
  await setup(page);await page.goto('/');
  await expect(page.locator('body')).not.toHaveClass(/m-app/);
  await expect(page.locator('.m-tabs')).toBeHidden();
  await expect(page.locator('.m-actions')).toBeHidden();
  await expect(page.locator('.main-nav')).toBeVisible();
});

test.describe('phone', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(test.info().project.name!=='mobile','phones only');
    await setup(page);await page.goto('/');
  });

  test('tab bar opens sections; More opens a sheet', async ({ page }) => {
    await expect(page.locator('body')).toHaveClass(/m-app/);
    await expect(page.locator('.m-tabs')).toBeVisible();
    await expect(page.locator('.main-nav')).toBeHidden();
    await expect(page.locator('.lpanel')).toBeVisible();
    await page.locator('[data-m-tab="learn"]').click();
    await expect(page.locator('#dynamicView')).toBeVisible();
    await expect(page.locator('.lpanel')).toBeHidden();
    await page.locator('[data-lesson="0"]').click();
    await expect(page.locator('.lesson-detail')).toContainText('Training focus');
    await page.locator('[data-m-tab="more"]').click();
    await page.locator('#mSheetItems button', { hasText: 'Famous games' }).click();
    await page.locator('[data-famous="0"]').click();
    await expect(page.locator('.study-board .study-square')).toHaveCount(64);
    await page.locator('[data-m-tab="more"]').click();
    await expect(page.locator('#mSheet')).toBeVisible();
    await page.locator('#mSheetItems button', { hasText: 'Openings' }).click();
    await expect(page.locator('#mSheet')).toBeHidden();
    await expect(page.locator('#dynamicView')).toContainText('Opening Explorer');
    await page.locator('[data-m-tab="play"]').click();
    await expect(page.locator('.lpanel')).toBeVisible();
    await expect(page.locator('[data-m-tab="play"]')).toHaveClass(/on/);
  });

  test('a computer game fills the screen with no page scroll, and Back keeps it running', async ({ page }) => {
    await page.locator('[data-mode="computer"]').click();
    await page.locator('#computerStart').click();
    await expect(page.locator('.shell')).toHaveAttribute('data-mview','game');
    await expect(page.locator('.m-tabs')).toBeHidden();
    await expect(page.locator('.topbar')).toBeHidden();
    for (const action of ['options','resign','hint']) await expect(page.locator(`[data-m-action="${action}"]`)).toBeVisible();
    for (const action of ['draw','chat','review']) await expect(page.locator(`[data-m-action="${action}"]`)).toBeHidden();
    const fit = await page.evaluate(() => ({ scroll: document.scrollingElement.scrollHeight - innerHeight, board: document.querySelector('.board').getBoundingClientRect(), vw: innerWidth, vh: innerHeight, actions: document.querySelector('.m-actions').getBoundingClientRect().bottom }));
    expect(fit.scroll).toBeLessThanOrEqual(0);
    expect(fit.board.width).toBeGreaterThan(fit.vw * 0.9);
    expect(Math.abs(fit.board.width - fit.board.height)).toBeLessThan(1.5);
    expect(Math.round(fit.actions)).toBe(fit.vh);
    // Options sheet: Flip board flips.
    const before = await page.locator('.square').first().getAttribute('data-sq');
    await page.locator('[data-m-action="options"]').click();
    await page.locator('#mSheetItems button', { hasText: 'Flip board' }).click();
    await expect.poll(() => page.locator('.square').first().getAttribute('data-sq')).not.toBe(before);
    // Back: home with a "Back to your game" pill; the pill returns to the board.
    await page.locator('#mBack').click();
    await expect(page.locator('.shell')).toHaveAttribute('data-mview','home');
    await expect(page.locator('#mReturnGame')).toBeVisible();
    await page.locator('#mReturnGame').click();
    await expect(page.locator('.shell')).toHaveAttribute('data-mview','game');
    await page.screenshot({ path: test.info().outputPath('phone-game.png') });
  });

  test('a private room opens the board with the room code and a copy button', async ({ page }) => {
    await page.locator('#create').click();
    await expect(page.locator('.shell')).toHaveAttribute('data-mview','game');
    await expect(page.locator('#mMoves')).toContainText('WAIT1234');
    await expect(page.locator('#mMoves [data-m-copy]')).toBeVisible();
    await expect(page.locator('#mGameTitle')).toHaveText('Waiting for opponent');
  });
});
