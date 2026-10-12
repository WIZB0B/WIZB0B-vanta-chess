import { test, expect } from '@playwright/test';
import { mockBackend, useScriptedEngine, releaseBotMove, startComputerGame, piece } from './board-helpers.js';

test('typing moves plays them; the live region reads both sides', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'The move list sits in the side panel on desktop');
  await mockBackend(page); await useScriptedEngine(page);
  await startComputerGame(page);
  const input = page.locator('#typeMove');
  await input.fill('nf3'); await input.press('Enter');
  await expect(piece(page, 'f3')).toHaveCount(1);
  await expect(input).toHaveValue('');
  await expect(page.locator('#a11yLive')).toHaveText('White knight f3');
  await releaseBotMove(page, 'd7d5', 1);
  await expect(page.locator('#a11yLive')).toHaveText('Black pawn d5');
  await input.fill('Qh5'); await input.press('Enter');
  await expect(page.locator('#toast')).toContainText('That move is not legal here');
  await expect(input).toHaveValue('Qh5');
  // "/" jumps to the box from anywhere on the page
  await input.fill(''); await page.locator('body').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('/');
  await expect(input).toBeFocused();
});
test('French: lazily loaded rows translate toasts, lessons and the typed-move box', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop navigation');
  await mockBackend(page); await useScriptedEngine(page);
  await page.addInitScript(() => localStorage.setItem('vch.lang', 'fr'));
  await startComputerGame(page);
  await expect(page.locator('label[for="typeMove"]')).toHaveText('Saisir un coup');
  await page.locator('#typeMove').fill('e5'); await page.locator('#typeMove').press('Enter');
  await expect(page.locator('#toast')).toContainText("Ce coup n'est pas légal ici");
  await page.locator('#typeMove').fill('e4'); await page.locator('#typeMove').press('Enter');
  await expect(page.locator('#a11yLive')).toHaveText('Blancs pion en e4');
  await page.locator('.main-nav [data-nav="learn"]').click();
  await expect(page.getByText('Principes d', { exact: false }).first()).toBeVisible();
});

// The owner's report (2026-10-12): after French, Spanish/Portuguese/Arabic stayed French, and
// switching back to English kept the old language until a reload.
test('switching languages: each one translates, and English comes back without a reload', async ({ page }) => {
  await mockBackend(page);
  await page.addInitScript(() => { localStorage.setItem('vch.intro-seen', '1'); localStorage.setItem('vanta.flagPrompt', '1') });
  await page.goto('/');
  const pick = async lang => page.evaluate(l => { const s = document.querySelector('#languageSelect'); s.value = l; s.dispatchEvent(new Event('change')) }, lang);
  const play = page.locator('#computerStart span, #create span').first();
  const english = (await play.textContent()).trim();
  const seen = {};
  for (const lang of ['fr', 'es', 'pt', 'ar', 'en', 'es', 'en']) {
    await pick(lang);
    await expect(page.locator('html')).toHaveAttribute('lang', lang);
    await expect(page.locator('html')).toHaveAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    await page.waitForTimeout(250);
    seen[lang] = (await play.textContent()).trim();
    if (lang === 'en') expect(seen[lang]).toBe(english);
    else expect(seen[lang], `${lang} translates`).not.toBe(english);
  }
  expect(new Set([seen.fr, seen.es, seen.pt, seen.ar]).size).toBe(4);
});
