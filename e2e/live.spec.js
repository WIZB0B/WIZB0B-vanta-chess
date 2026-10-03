import { test, expect } from '@playwright/test';

test.skip(!process.env.VCH_LIVE_E2E, 'live Supabase acceptance is opt-in');

test('two browsers share an authoritative game, chat, reconnect, arena and puzzle', async ({ browser }) => {
  test.setTimeout(90000);
  const aCtx=await browser.newContext(),bCtx=await browser.newContext();
  const a=await aCtx.newPage(),b=await bCtx.newPage();
  await a.goto('/');
  await a.locator('#create').click();
  await expect.poll(()=>new URL(a.url()).searchParams.get('game')).not.toBeNull();
  const roomUrl=a.url();
  await b.goto(roomUrl);
  await expect(a.locator('body')).toHaveAttribute('data-seat','w');
  await expect(b.locator('body')).toHaveAttribute('data-seat','b');
  await a.waitForTimeout(1200);

  await a.locator('[data-sq="e2"]').click();await a.locator('[data-sq="e4"]').click();
  await expect(b.locator('[data-sq="e4"] .piece.w.piece-p')).toBeVisible({timeout:6000});
  await b.locator('[data-sq="e7"]').click();await b.locator('[data-sq="e5"]').click();
  await expect(a.locator('[data-sq="e5"] .piece.b.piece-p')).toBeVisible({timeout:6000});

  const before=await a.locator('#whiteClock').textContent();
  await a.waitForTimeout(1200);
  const after=await a.locator('#whiteClock').textContent();
  expect(after).not.toBe(before);

  await a.locator('#openChat').click();
  await b.locator('#openChat').click();
  await a.locator('#message').fill('acceptance-chat');
  await a.locator('#chat button').click();
  await expect(b.locator('#messages')).toContainText('acceptance-chat',{timeout:6000});

  await a.reload();
  await expect(a.locator('[data-sq="e4"] .piece.w.piece-p')).toBeVisible({timeout:6000});
  await expect(a.locator('[data-sq="e5"] .piece.b.piece-p')).toBeVisible({timeout:6000});

  const puzzleResponse=a.waitForResponse(async response=>{
    if(!response.url().includes('/functions/v1/chess')||response.request().method()!=='POST')return false;
    try{return response.request().postDataJSON()?.action==='puzzle_next'}catch{return false}
  });
  await a.locator('.main-nav [data-nav="puzzles"]').click();
  const puzzle=await (await puzzleResponse).json();
  expect(puzzle.puzzle?.fen).toBeTruthy();
  await expect(a.locator('#dynamicView')).toContainText(/Puzzle Training|Find the best continuation/);

  let arenaReady=false;
  for(let attempt=0;attempt<3&&!arenaReady;attempt++){
    await a.locator('.main-nav [data-nav="arena"]').click();
    try{await expect(a.locator('#dynamicView .arena-join').first()).toBeVisible({timeout:6000});arenaReady=true}
    catch(error){if(attempt===2)throw error;await a.waitForTimeout(1000)}
  }

  await aCtx.close();await bCtx.close();
});

test('casual queue falls back to a Stockfish bot after fifteen seconds', async ({ browser }) => {
  test.setTimeout(50000);
  const ctx=await browser.newContext(),page=await ctx.newPage();
  await page.goto('/');
  await page.evaluate(()=>{const s=document.querySelector('#time');const o=document.createElement('option');o.value='75';o.textContent='75+0 Acceptance';s.append(o);s.value='75'});
  await page.locator('[data-mode="match"]').click();
  await expect(page.locator('body')).toHaveAttribute('data-bot-game','true',{timeout:26000});
  const seat=await page.locator('body').getAttribute('data-seat');
  if(seat==='w'){await page.locator('[data-sq="e2"]').click();await page.locator('[data-sq="e4"]').click()}
  await expect.poll(async()=>page.locator('#moves div').count(),{timeout:12000}).toBeGreaterThan(0);
  await ctx.close();
});

test('mobile layout has no horizontal overflow', async ({ browser }) => {
  const ctx=await browser.newContext({viewport:{width:390,height:844}}),page=await ctx.newPage();
  await page.goto('/');
  const widths=await page.evaluate(()=>({inner:innerWidth,scroll:document.documentElement.scrollWidth,board:Math.round(document.querySelector('.board').getBoundingClientRect().width)}));
  expect(widths.scroll).toBeLessThanOrEqual(widths.inner);
  expect(widths.board).toBeGreaterThan(320);
  await ctx.close();
});
