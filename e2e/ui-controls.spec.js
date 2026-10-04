import { test, expect } from '@playwright/test';

async function mockProfile(page){
  await page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', async route=>{
    let body={};try{body=route.request().postDataJSON()}catch{}
    const payload=body.action==='profile'?{player:{id:'ui-player',display_name:'Guest-UI',ratings:{rapid:1200}}}:{};
    await route.fulfill({contentType:'application/json',body:JSON.stringify(payload)});
  });
}

test('primary menus and study controls are not dead buttons',async({page})=>{
  await mockProfile(page);await page.goto('/');
  await expect(page.locator('.square')).toHaveCount(64);

  await page.locator('[data-nav="openings"]').click();
  await expect(page.locator('#dynamicView')).toContainText('Opening Explorer');
  await page.locator('[data-opening="0"]').click();
  await expect(page.locator('.study-board .study-square')).toHaveCount(64);
  await page.locator('#studyNext').click();
  await expect(page.locator('#studyCount')).toContainText('1 /');

  await page.locator('[data-nav="famous"]').click();
  await expect(page.locator('[data-famous="0"]')).toBeVisible();
  await page.locator('[data-famous="0"]').click();
  await expect(page.locator('.study-board .study-square')).toHaveCount(64);
  await page.locator('#studyLast').click();
  await expect(page.locator('#studyCount')).not.toContainText('0 /');

  await page.locator('[data-nav="learn"]').click();
  await page.locator('[data-lesson="0"]').click();
  await expect(page.locator('.lesson-detail')).toContainText('Training focus');
  await expect(page.locator('.start-puzzle')).toBeVisible();

  await page.locator('[data-nav="review"]').click();
  await expect(page.locator('#dynamicView')).toContainText('Post-Game Review');

  await page.locator('#searchBtn').click();
  await page.locator('#searchInput').fill('Ruy Lopez');
  await expect(page.locator('#searchResults')).toContainText('Ruy Lopez');
  await page.locator('#searchResults button').first().click();
  await expect(page.locator('#dynamicView')).toContainText('Opening Explorer');
});

test('board controls, theme studio, and local Stockfish computer game work',async({page})=>{
  test.setTimeout(30000);
  await mockProfile(page);await page.goto('/');

  const before=await page.locator('.square').first().getAttribute('data-sq');
  await page.locator('#flip').click();
  const after=await page.locator('.square').first().getAttribute('data-sq');
  expect(after).not.toBe(before);

  await page.locator('#sound').click();
  await expect(page.locator('#sound')).toContainText('Sound off');
  await page.locator('#sound').click();
  await expect(page.locator('#sound')).toContainText('Sound on');

  await page.locator('#theme').click();
  await expect(page.locator('#themeStudio')).toBeVisible();
  await page.locator('[data-theme="--dark"]').fill('#335544');
  await expect.poll(()=>page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--dark').trim())).toBe('#335544');
  await page.locator('#closeTheme').click();

  await page.locator('[data-mode="computer"]').click();
  await page.locator('#level').selectOption('1500');
  await page.locator('[data-sq="e2"] .piece').dragTo(page.locator('[data-sq="e4"]'));
  await expect(page.locator('[data-sq="e4"] .piece.w.piece-p')).toBeVisible();
  await expect.poll(async()=>page.locator('#moves .move-row').count(),{timeout:10000}).toBeGreaterThanOrEqual(2);
  await expect(page.locator('#depth')).not.toHaveText('—',{timeout:10000});
});

test('right-panel feature cards open their real destinations',async({page})=>{
  await mockProfile(page);await page.goto('/');
  await page.locator('.feature-card.opening').click();await expect(page.locator('#dynamicView')).toContainText('Opening Explorer');
  await page.locator('[data-nav="play"]').click();
  await page.locator('.feature-card.famous').click();await expect(page.locator('#dynamicView')).toContainText('Famous Games');
  await page.locator('[data-nav="play"]').click();
  await page.locator('.feature-card.practice').click();await expect(page.locator('#dynamicView')).toContainText('Practice & Learn');
  await page.locator('[data-nav="play"]').click();
  await page.locator('.feature-card.review').click();await expect(page.locator('#dynamicView')).toContainText('Post-Game Review');
});


test('rated play is account-gated while guest play remains instant',async({page})=>{
  await mockProfile(page);await page.goto('/');
  await page.locator('#level').selectOption('rated');
  await page.locator('#create').click();
  await expect(page.locator('#accountDialog')).toBeVisible();
  await expect(page.locator('#accountDialog')).toContainText('Save your rating and record');
  await page.locator('.account-close').click();
  await page.locator('#level').selectOption('casual');
  await expect(page.locator('#create')).toBeEnabled();
});
