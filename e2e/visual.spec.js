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
  const desktop=await browser.newContext({viewport:{width:1672,height:941},deviceScaleFactor:1});
  const d=await desktop.newPage();await mockProfile(d);await d.addInitScript(()=>localStorage.setItem('vch.intro-seen','1'));await d.goto('/');await d.waitForSelector('.board .square:nth-child(64)');
  await expect(d.locator('.board')).toHaveCSS('aspect-ratio','1 / 1');
  await expect(d.locator('#mainMenu')).toBeHidden();
  const size=await d.evaluate(()=>({inner:innerHeight,scroll:document.documentElement.scrollHeight}));expect(size.scroll).toBeLessThanOrEqual(size.inner);
  await d.screenshot({path:'test-results/visual/batch-1.png',fullPage:false});

  const mobile=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
  const m=await mobile.newPage();await mockProfile(m);await m.addInitScript(()=>localStorage.setItem('vch.intro-seen','1'));await m.goto('/');await m.waitForSelector('.board .square:nth-child(64)');
  await m.screenshot({path:'test-results/visual/vch-mobile.png',fullPage:true});
  await desktop.close();await mobile.close();
});
