import { test, expect } from '@playwright/test';

async function openEditor(page) {
  if (test.info().project.name === 'mobile') { await page.locator('[data-m-tab="more"]').click(); await page.locator('#mSheetItems button', { hasText: 'Edit profile' }).click() }
  else { await page.locator('#accountBtn').click(); await page.locator('#profileMenuEdit').click() }
}

// Owner report (2026-10-12): "I can't add my picture… I cannot edit my name". Guests can now
// change their display name, wear a VCH portrait and write an About line.
test('profile: a guest changes name, portrait and About line', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('vch.intro-seen', '1'); localStorage.setItem('vanta.flagPrompt', '1') });
  const calls = [];
  await page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', async route => {
    let body = {}; try { body = route.request().postDataJSON() } catch {}
    calls.push(body);
    const map = { profile: { player: { id: 'me', display_name: body.name } }, profile_update: { player: { id: 'me', country_code: body.country_code ?? null } } };
    await route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(map[body.action] || {}) });
  });
  await page.goto('/');
  await openEditor(page);
  await expect(page.locator('.profile-editor .pe-name')).toBeVisible();
  await page.locator('.profile-editor .pe-name').fill('Knight Rider');
  await page.locator('.pe-preset[data-preset="n-emerald"]').click();
  await expect(page.locator('.pe-preset[data-preset="n-emerald"]')).toHaveClass(/on/);
  await page.locator('.profile-editor textarea').fill('Loves the Sicilian.');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.locator('#toast')).toContainText('Profile saved');
  await expect(page.locator('#profileMenuName')).toHaveText('Knight Rider');
  await expect(page.locator('#profileMenuAvatar .portrait-preset.tone-emerald')).toHaveCount(1);
  const update = calls.find(c => c.action === 'profile_update');
  expect(update.avatar_preset).toBe('n-emerald');
  expect(update.bio).toBe('Loves the Sicilian.');
  expect(calls.some(c => c.action === 'profile' && c.name === 'Knight Rider')).toBe(true);
  // The name stays after a reload.
  await page.reload();
  await expect(page.locator('#profileMenuName')).toHaveText('Knight Rider');
});

test('profile: unfriendly names are refused before saving', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('vch.intro-seen', '1'); localStorage.setItem('vanta.flagPrompt', '1') });
  await page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', r => r.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ player: { id: 'me' } }) }));
  await page.goto('/');
  await openEditor(page);
  await page.locator('.profile-editor .pe-name').fill('fuck you');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.locator('#toast')).toContainText('friendly');
  await expect(page.locator('#profileMenuName')).not.toHaveText('fuck you');
});
