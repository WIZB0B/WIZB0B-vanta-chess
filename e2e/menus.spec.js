import { test, expect } from '@playwright/test';

async function enterGameOnFirstVisit(page){await page.addInitScript(()=>localStorage.setItem('vch.intro-seen','1'))}
async function mockProfile(page){
  await page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', async route=>{
    let body={};try{body=route.request().postDataJSON()}catch{}
    const payload=body.action==='profile'?{player:{id:'menu-player',display_name:'Guest-MENU',ratings:{rapid:1200}}}:{};
    await route.fulfill({contentType:'application/json',body:JSON.stringify(payload)});
  });
}

test('menus close on outside click, Escape and when another menu opens',async({page,isMobile})=>{
  test.skip(isMobile,'header account and notification buttons are hidden on narrow screens');
  await mockProfile(page);await enterGameOnFirstVisit(page);await page.setViewportSize({width:1672,height:941});await page.goto('/');
  await expect(page.locator('.square')).toHaveCount(64);
  const profile=page.locator('#profileMenu'),notify=page.locator('#notifyMenu'),more=page.locator('.game-more');

  await page.locator('#accountBtn').click();
  await expect(profile).toBeVisible();
  await expect(page.locator('#accountBtn')).toHaveAttribute('aria-expanded','true');
  const box=await profile.boundingBox(),avatar=await page.locator('#accountBtn').boundingBox();
  expect(box.width).toBeLessThanOrEqual(290);
  expect(box.y).toBeGreaterThan(avatar.y+avatar.height-1);
  expect(box.height).toBeLessThan(941/2);
  await expect(profile).toContainText('Profile');await expect(profile).toContainText('Settings');await expect(profile).toContainText('Sign in');

  await page.locator('#notifyBtn').click();
  await expect(notify).toBeVisible();await expect(profile).toBeHidden();

  await page.locator('.board').click({position:{x:5,y:5}});
  await expect(notify).toBeHidden();

  await page.locator('.game-more>summary').click();
  await expect(more).toHaveAttribute('open','');
  await page.locator('#openChat').click();
  await expect(page.locator('#chatDrawer')).toHaveClass(/open/);
  await expect(more).not.toHaveAttribute('open','');
  await page.locator('#closeChat').click();
  await page.locator('.game-more>summary').click();
  await expect(more).toHaveAttribute('open','');
  await page.locator('#accountBtn').click();
  await expect(profile).toBeVisible();await expect(more).not.toHaveAttribute('open','');
  await page.keyboard.press('Escape');
  await expect(profile).toBeHidden();

  await page.locator('#accountBtn').click();await page.locator('#closeProfileMenu').click();
  await expect(profile).toBeHidden();

  await page.locator('#theme').click();
  await expect(page.locator('#themeStudio')).toBeVisible();
  await page.mouse.click(8,8);
  await expect(page.locator('#themeStudio')).toBeHidden();
  await page.locator('#theme').click();await page.keyboard.press('Escape');
  await expect(page.locator('#themeStudio')).toBeHidden();

  await page.locator('#accountBtn').click();await page.locator('#profileMenuSettings').click();
  await expect(page.locator('#themeStudio')).toBeVisible();await expect(profile).toBeHidden();
  await page.locator('#closeTheme').click();

  await page.locator('#accountBtn').click();await page.locator('#profileMenuAuth').click();
  await expect(page.locator('#accountDialog')).toBeVisible();await expect(profile).toBeHidden();
  await page.mouse.click(8,8);
  await expect(page.locator('#accountDialog')).toBeHidden();
});
