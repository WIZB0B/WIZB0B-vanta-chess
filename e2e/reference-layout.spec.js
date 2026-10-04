import { test, expect } from '@playwright/test';

async function mockApi(page){
  await page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', async route=>{
    let body={};try{body=route.request().postDataJSON()}catch{}
    const payload=body.action==='profile'?{player:{id:'reference-player',display_name:'Guest-823A',ratings:{rapid:1200}}}:{};
    await route.fulfill({contentType:'application/json',body:JSON.stringify(payload)});
  });
}

test('desktop geometry is locked to the supplied 1672x941 reference', async ({ browser })=>{
  test.skip(!!process.env.CI, 'pixel-geometry test is not stable in CI');
  const ctx=await browser.newContext({viewport:{width:1672,height:941},deviceScaleFactor:1});
  const page=await ctx.newPage();await mockApi(page);await page.addInitScript(()=>localStorage.setItem('vch.intro-seen','1'));await page.goto('/');
  await expect(page.locator('.square')).toHaveCount(64);
  const boxes=await page.evaluate(()=>{
    const box=s=>{const r=document.querySelector(s).getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}};
    return {top:box('.topbar'),left:box('.lpanel'),game:box('.game'),right:box('.rpanel'),board:box('.board')};
  });
  const near=(actual,target,tolerance)=>expect(Math.abs(actual-target)).toBeLessThanOrEqual(tolerance);
  near(boxes.top.x,48,4); near(boxes.top.y,28,3); near(boxes.top.w,1576,8); near(boxes.top.h,58,3);
  near(boxes.left.x,48,5); near(boxes.left.y,102,5); near(boxes.left.w,427,14);
  near(boxes.game.x,495,12); near(boxes.game.y,102,5); near(boxes.game.w,660,18);
  near(boxes.right.x,1175,15); near(boxes.right.y,102,5); near(boxes.right.w,449,18);
  near(boxes.board.x,526,14); near(boxes.board.y,168,14); near(boxes.board.w,600,20);
  near(boxes.board.h,boxes.board.w,2);
  const viewport=await page.evaluate(()=>({inner:innerHeight,scroll:document.documentElement.scrollHeight,screen:document.body.dataset.screen}));
  expect(viewport.screen).toBe('game');
  expect(viewport.scroll).toBeLessThanOrEqual(viewport.inner);
  await ctx.close();
});
