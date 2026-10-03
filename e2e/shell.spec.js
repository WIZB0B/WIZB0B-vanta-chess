import { test, expect } from '@playwright/test';

async function mockApi(page) {
  await page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', async route => {
    const body = route.request().postDataJSON();
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(body.action === 'profile' ? { profile: { rating: 1200 } } : {}) });
  });
}

test('renders an exact 8x8 board without room-code injection', async ({ page }) => {
  const runtimeErrors=[];
  page.on('pageerror', error=>{runtimeErrors.push(error.message);console.log('PAGEERROR',error.message)});
  page.on('console', message=>{if(message.type()==='error')console.log('CONSOLEERROR',message.text())});
  await mockApi(page);
  await page.goto('/?game=%3Cimg%20src=x%20onerror=alert(1)%3E');
  await page.waitForTimeout(300);
  if(runtimeErrors.length)console.log('RUNTIME_ERRORS',JSON.stringify(runtimeErrors));
  await expect(page.locator('.square')).toHaveCount(64);
  await expect(page.locator('.board')).toHaveCSS('aspect-ratio', '1 / 1');
  await expect(page.locator('img[src="x"]')).toHaveCount(0);
});

test('independent browser contexts receive independent guest identities', async ({ browser }) => {
  const first = await browser.newContext();
  const second = await browser.newContext();
  const a = await first.newPage(), b = await second.newPage();
  await Promise.all([mockApi(a), mockApi(b)]);
  await Promise.all([a.goto('/'), b.goto('/')]);
  const [tokenA, tokenB] = await Promise.all([
    a.evaluate(() => localStorage.getItem('vanta.guest-token')),
    b.evaluate(() => localStorage.getItem('vanta.guest-token')),
  ]);
  expect(tokenA).toBeTruthy();
  expect(tokenB).toBeTruthy();
  expect(tokenA).not.toBe(tokenB);
  await Promise.all([first.close(), second.close()]);
});
