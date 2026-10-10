import { test, expect } from '@playwright/test';

async function mockApi(page){
  await page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', async route=>{
    let body={};try{body=route.request().postDataJSON()}catch{}
    const payload=body.action==='profile'?{player:{id:'reference-player',display_name:'Guest-823A',ratings:{rapid:1200}}}:{};
    await route.fulfill({contentType:'application/json',body:JSON.stringify(payload)});
  });
}

test('desktop geometry at 1672x941: board fills the screen height between the panels', async ({ browser })=>{
  // Pixel-exact geometry against the 1672x941 mockup. It depends on the browser build and
  // installed fonts (no web fonts are bundled), so it is a local design check, not a CI gate.
  // CI still enforces the hard rules: 64 squares, aspect-ratio 1, and no page scroll at
  // 1672x941 (e2e/visual.spec.js). Known local drift: the board sits ~17px right of the
  // mockup's x=526 since Batch 4 (also at the last green commit 38864cf).
  test.skip(!!process.env.CI, 'pixel-geometry check is browser/font dependent; run locally');
  const ctx=await browser.newContext({viewport:{width:1672,height:941},deviceScaleFactor:1});
  const page=await ctx.newPage();await mockApi(page);await page.addInitScript(()=>localStorage.setItem('vch.intro-seen','1'));await page.goto('/');
  await expect(page.locator('.square')).toHaveCount(64);
  const boxes=await page.evaluate(()=>{
    const box=s=>{const r=document.querySelector(s).getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}};
    return {top:box('.topbar'),left:box('.lpanel'),game:box('.game'),right:box('.rpanel'),board:box('.board')};
  });
  const near=(actual,target,tolerance)=>expect(Math.abs(actual-target)).toBeLessThanOrEqual(tolerance);
  near(boxes.top.x,48,4); near(boxes.top.h,58,3);
  // The board now fills the screen height (owner request, 2026-10-09), so it is larger than
  // the mockup's 600px: 941px tall viewport minus the bars and tools = 653px.
  near(boxes.board.w,653,12); near(boxes.board.h,boxes.board.w,2);
  expect(boxes.board.y+boxes.board.h).toBeLessThanOrEqual(941);
  // Panels sit either side of the game column, which hugs the board.
  expect(boxes.left.x+boxes.left.w).toBeLessThan(boxes.game.x);
  expect(boxes.game.x+boxes.game.w).toBeLessThan(boxes.right.x);
  expect(boxes.game.w-boxes.board.w).toBeLessThan(70);
  const viewport=await page.evaluate(()=>({inner:innerHeight,scroll:document.documentElement.scrollHeight,screen:document.body.dataset.screen}));
  expect(viewport.screen).toBe('game');
  expect(viewport.scroll).toBeLessThanOrEqual(viewport.inner);
  await ctx.close();
});
