import { test, expect } from '@playwright/test';

test.skip(!process.env.VCH_DEPLOYED_PREVIEW, 'deployed Netlify verification is opt-in');

test('Netlify preview serves hardened VCH runtime and local assets', async ({ page, request }) => {
  test.setTimeout(60000);
  const response=await page.goto('/');
  expect(response?.ok()).toBeTruthy();
  const headers=response.headers();
  expect(headers['content-security-policy']||'').toContain("default-src 'self'");
  expect(headers['content-security-policy']||'').toContain('ubjldcfiwrwiouwgmduo.supabase.co');
  expect(headers['strict-transport-security']||'').toContain('max-age=');
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['x-frame-options']).toBe('DENY');
  expect(headers['referrer-policy']).toBe('no-referrer');

  await expect(page.locator('.square')).toHaveCount(64);
  await expect(page.locator('.board')).toHaveCSS('aspect-ratio','1 / 1');

  const runtimeAssets=[
    '/manifest.webmanifest','/sw.js','/stockfish.worker.js',
    '/engines/stockfish-19-lite-single.js','/engines/stockfish-19-lite-single.wasm','/engines/Copying.txt',
    '/assets/generated/wk.png','/assets/generated/bq.png','/assets/generated/hero-knight.png',
    '/assets/generated/opening-card.png','/assets/generated/famous-card.png','/assets/generated/review-card.png',
    '/assets/generated/practice-card.png','/assets/generated/live-banner.png','/assets/generated/wallpaper-emerald.webp'
  ];
  for(const asset of runtimeAssets){
    const r=await request.get(asset);
    expect(r.ok(),asset+' should be served').toBeTruthy();
    expect(Number(r.headers()['content-length']||1)).toBeGreaterThan(0);
  }
});

test('Netlify preview supports a real two-browser room and authoritative move', async ({ browser }) => {
  test.setTimeout(60000);
  const first=await browser.newContext(),second=await browser.newContext();
  const a=await first.newPage(),b=await second.newPage();
  await a.goto('/');
  await a.locator('#create').click();
  await expect.poll(()=>new URL(a.url()).searchParams.get('game'),{timeout:10000}).toBeTruthy();
  await b.goto(a.url());
  await expect(a.locator('body')).toHaveAttribute('data-seat','w',{timeout:10000});
  await expect(b.locator('body')).toHaveAttribute('data-seat','b',{timeout:10000});
  await a.locator('[data-sq="e2"]').click();await a.locator('[data-sq="e4"]').click();
  await expect(b.locator('[data-sq="e4"] .piece.w.piece-p')).toBeVisible({timeout:10000});
  await first.close();await second.close();
});
