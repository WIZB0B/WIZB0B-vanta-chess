import { test, expect } from '@playwright/test';

async function enterGameOnFirstVisit(page){await page.addInitScript(()=>localStorage.setItem('vch.intro-seen','1'))}

async function mockProfile(page){
  await page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', async route=>{
    let body={};try{body=route.request().postDataJSON()}catch{}
    const payload=body.action==='profile'?{player:{id:'ui-player',display_name:'Guest-UI',ratings:{rapid:1200}}}:{};
    await route.fulfill({contentType:'application/json',body:JSON.stringify(payload)});
  });
}

test('primary menus and study controls are not dead buttons',async({page})=>{
  await mockProfile(page);await enterGameOnFirstVisit(page);await page.goto('/');
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

test('left panel switches between three distinct play-mode views',async({page})=>{
  await mockProfile(page);await enterGameOnFirstVisit(page);await page.goto('/');
  await expect(page.locator('[data-mode-view="room"]')).toBeVisible();
  await expect(page.locator('.room-created')).toBeHidden();

  await page.locator('[data-mode="match"]').click();
  await expect(page.locator('[data-mode-view="match"]')).toBeVisible();
  await expect(page.locator('[data-mode-view="room"]')).toBeHidden();
  await expect(page.locator('[data-match-time]')).toHaveCount(5);
  await expect(page.locator('#findOpponent')).toBeVisible();

  await page.locator('[data-mode="computer"]').click();
  await expect(page.locator('[data-mode-view="computer"]')).toBeVisible();
  await expect(page.locator('#botGrid .bot-card')).toHaveCount(6);
  await expect(page.locator('[data-computer-side]')).toHaveCount(3);
  await expect(page.locator('#computerStart')).toBeVisible();

  await page.locator('[data-mode="room"]').click();
  await expect(page.locator('[data-mode-view="room"]')).toBeVisible();
});

test('board controls, theme studio, and local Stockfish computer game work',async({page})=>{
  test.setTimeout(45000);
  await mockProfile(page);await enterGameOnFirstVisit(page);await page.goto('/');

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
  await expect(page.locator('[data-mode-view="computer"]')).toBeVisible();
  await page.locator('[data-bot-slug="gambit"]').click();
  await page.locator('#computerStart').click();
  await page.locator('.board-piece[data-square="e2"] .piece').dragTo(page.locator('[data-sq="e4"]'));
  await expect(page.locator('.board-piece[data-square="e4"] .piece.w.piece-p')).toBeVisible();
  await expect.poll(async()=>page.locator('#moves .move-pair-row').count(),{timeout:12000}).toBe(1);
  await page.waitForTimeout(800);
  await expect(page.locator('#moves .move-pair-row')).toHaveCount(1);
  await expect(page.locator('#turn')).toContainText('White to move');
  await expect(page.locator('#depth')).not.toHaveText('—',{timeout:10000});
});

test('preview CSP runs Stockfish WebAssembly and Black-side clocks follow player colors',async({page})=>{
  test.setTimeout(30000);
  await mockProfile(page);await enterGameOnFirstVisit(page);
  const response=await page.goto('/');
  const csp=response.headers()['content-security-policy']||'';
  expect(csp).toContain("script-src 'self' 'wasm-unsafe-eval'");
  expect(csp).not.toMatch(/(?:^|\s)'unsafe-eval'(?:\s|;|$)/);

  await page.locator('[data-mode="computer"]').click();
  await page.locator('[data-computer-side="b"]').click();
  await page.locator('#computerStart').click();

  await expect.poll(async()=>page.locator('#moves .move-pair-row').count(),{timeout:15000}).toBeGreaterThan(0);
  await expect(page.locator('#turn')).toContainText('Black to move');
  await expect(page.locator('.player.top')).toHaveAttribute('data-color','w');
  await expect(page.locator('.player.bottom')).toHaveAttribute('data-color','b');
  await expect(page.locator('#topClock')).toHaveAttribute('data-color','w');
  await expect(page.locator('#bottomClock')).toHaveAttribute('data-color','b');
  await expect(page.locator('#bottomClock')).toHaveClass(/running/);
  await expect(page.locator('#topClock')).not.toHaveClass(/running/);

  const topBefore=await page.locator('#topClock').textContent();
  const bottomBefore=await page.locator('#bottomClock').textContent();
  await page.waitForTimeout(1300);
  const topAfter=await page.locator('#topClock').textContent();
  const bottomAfter=await page.locator('#bottomClock').textContent();
  expect(topAfter).toBe(topBefore);
  expect(bottomAfter).not.toBe(bottomBefore);
});

test('right-panel feature cards open their real destinations',async({page})=>{
  await mockProfile(page);await enterGameOnFirstVisit(page);await page.goto('/');
  await page.locator('.feature-card.opening').click();await expect(page.locator('#dynamicView')).toContainText('Opening Explorer');
  await page.locator('[data-nav="play"]').click();
  await page.locator('.feature-card.famous').click();await expect(page.locator('#dynamicView')).toContainText('Famous Games');
  await page.locator('[data-nav="play"]').click();
  await page.locator('.feature-card.practice').click();await expect(page.locator('#dynamicView')).toContainText('Practice & Learn');
  await page.locator('[data-nav="play"]').click();
  await page.locator('.feature-card.review').click();await expect(page.locator('#dynamicView')).toContainText('Post-Game Review');
});


test('rated play is account-gated while guest play remains instant',async({page})=>{
  await mockProfile(page);await enterGameOnFirstVisit(page);await page.goto('/');
  await page.locator('#level').selectOption('rated');
  await page.locator('#create').click();
  await expect(page.locator('#accountDialog')).toBeVisible();
  await expect(page.locator('#accountDialog')).toContainText('Save your rating and record');
  await page.locator('#accountDialog').evaluate(dialog=>dialog.close());
  await page.locator('#level').selectOption('casual');
  await expect(page.locator('#create')).toBeEnabled();
});
