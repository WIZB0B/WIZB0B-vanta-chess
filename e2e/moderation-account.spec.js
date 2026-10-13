import { test, expect } from '@playwright/test';

async function mock(page, profile, handlers = {}) {
  await page.addInitScript(() => { localStorage.setItem('vch.intro-seen', '1'); localStorage.setItem('vanta.flagPrompt', '1'); localStorage.setItem('vanta.auth-session', JSON.stringify({ access_token: 't', refresh_token: 'r' })) });
  const calls = [];
  await page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', async route => {
    let body = {}; try { body = route.request().postDataJSON() } catch {}
    calls.push(body);
    const base = { profile: { player: { id: 'me', username: 'owner', account: true, ...profile } }, challenges: { incoming: [], outgoing: [], accepted: [] }, daily_games: { games: [] } };
    await route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(handlers[body.action]?.(body) ?? base[body.action] ?? {}) });
  });
  return calls;
}
test('moderation: admins see the queue, open a file and suspend with a reason', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop account menu');
  const calls = await mock(page, { role: 'admin' }, {
    mod_queue: () => ({ cases: [{ player: { id: 'p1', username: 'Speedy', rating: 1900, rated_games: 40 }, reports: [{ reason: 'engine' }, { reason: 'engine' }], reasons: { engine: 2 }, fairplay: { reviewed_games: 6, games_95_plus: 5, avg_accuracy: 96.2 } }], log: [] }),
    mod_player: () => ({ player: { id: 'p1', username: 'Speedy', account: true, rating: 1900, rated_games: 40 }, reports: [{ reason: 'engine', note: 'too perfect', status: 'open', created_at: '2026-10-09' }], signals: [{ accuracy: 97.1, avg_loss: 1.2, moves: 31, created_at: '2026-10-09' }], games: [{ opponent: 'me', result: '1-0', pool: 'blitz', rated: true, moves: 62, avg_move_s: 4.1, move_time_sd: 0.6, ended_at: '2026-10-09' }], log: [] }),
    mod_action: () => ({ ok: true }),
  });
  await page.goto('/');
  await page.locator('#accountBtn').click();
  await expect(page.locator('#profileMenuModeration')).toBeVisible();
  await page.locator('#profileMenuModeration').click();
  await expect(page.locator('.mod-case')).toContainText('2 engine');
  await page.locator('.mod-case').click();
  await expect(page.locator('.mod-games')).toContainText('4.1s ± 0.6s per move');
  await page.locator('[data-act="ban"]').click();
  await page.locator('.report-form textarea').fill('Engine use confirmed');
  await page.locator('.vch-dialog-action.primary').click();
  await expect.poll(() => calls.find(c => c.action === 'mod_action')).toMatchObject({ playerId: 'p1', act: 'ban', note: 'Engine use confirmed' });
});
test('moderation stays hidden for players; delete account needs the username', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop account dialog');
  const calls = await mock(page, {}, { account_delete: () => ({ deleted: true }) });
  await page.goto('/');
  await page.locator('#accountBtn').click();
  await expect(page.locator('#profileMenuModeration')).toBeHidden();
  await page.locator('#profileMenuProfile').click();
  await page.locator('.account-settings summary').click();
  await page.locator('#deleteAccount').click();
  await page.locator('.report-form input').fill('owner');
  await page.getByRole('button', { name: 'Delete for good' }).click();
  await expect.poll(() => calls.find(c => c.action === 'account_delete')?.confirm).toBe('owner');
});
