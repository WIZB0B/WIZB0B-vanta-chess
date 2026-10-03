import { test, expect } from '@playwright/test';

test.skip(!process.env.VCH_CAPTURE_VISUAL, 'visual capture is opt-in');

async function mockProfile(page){
  await page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', async route=>{
    let body={};try{body=route.request().postDataJSON()}catch{}
    const payload=body.action==='profile'?{player:{id:'visual-player',display_name:'Guest-VCH',ratings:{rapid:1200}}}:{};
    await route.fulfill({contentType:'application/json',body:JSON.stringify(payload)});
  });
}

test('capture desktop and mobile reference renders',async({browser})=>{
  const desktop=await browser.newContext({viewport:{width:1664,height:936},deviceScaleFactor:1});
  const d=await desktop.newPage();await mockProfile(d);await d.goto('/');await d.waitForSelector('.board .square:nth-child(64)');
  await expect(d.locator('.board')).toHaveCSS('aspect-ratio','1 / 1');
  await d.screenshot({path:'test-results/visual/vch-desktop.png',fullPage:true});

  const mobile=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
  const m=await mobile.newPage();await mockProfile(m);await m.goto('/');await m.waitForSelector('.board .square:nth-child(64)');
  await m.screenshot({path:'test-results/visual/vch-mobile.png',fullPage:true});
  await desktop.close();await mobile.close();
});
