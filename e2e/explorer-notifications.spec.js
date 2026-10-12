import { test, expect } from '@playwright/test';

async function mock(page, handlers, signed = true) {
  await page.addInitScript(s => { localStorage.setItem('vch.intro-seen', '1'); localStorage.setItem('vanta.flagPrompt', '1'); if (s) localStorage.setItem('vanta.auth-session', JSON.stringify({ access_token: 't', refresh_token: 'r' })) }, signed);
  const calls = [];
  await page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', async route => {
    let body = {}; try { body = route.request().postDataJSON() } catch {}
    calls.push(body);
    const base = { profile: { player: { id: 'me', username: 'me', account: signed } }, challenges: { incoming: [], outgoing: [], accepted: [] }, daily_games: { games: [] }, notifications: { notifications: [], unread: 0 } };
    await route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(handlers[body.action]?.(body) ?? base[body.action] ?? {}) });
  });
  return calls;
}
test('explorer: moves from VCH games with results; tapping a row plays it', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop navigation');
  const calls = await mock(page, { opening_explorer: b => (b.fen.startsWith('rnbqkbnr/pppppppp/8/8/8/8/') ? { moves: [{ san: 'e4', games: 30, white: 15, draws: 3, black: 12 }, { san: 'd4', games: 10, white: 5, draws: 5, black: 0 }], total: 40 } : { moves: [{ san: 'e5', games: 20, white: 9, draws: 2, black: 9 }], total: 20 }) }, false);
  await page.goto('/');
  await page.locator('.main-nav [data-nav="openings"]').click();
  await page.locator('.explorer-open').click();
  await expect(page.locator('.ex-row')).toHaveCount(2);
  await expect(page.locator('.ex-row').first()).toContainText('75%');
  await page.locator('.ex-row[data-san="e4"]').click();
  await expect(page.locator('.board-piece[data-square="e4"]')).toHaveCount(1);
  await expect(page.locator('.ex-row')).toHaveCount(1);
  await expect(page.locator('.explorer-line')).toHaveText('e4');
  await page.locator('.ex-back').click();
  await expect(page.locator('.board-piece[data-square="e2"]')).toHaveCount(1);
  expect(calls.filter(c => c.action === 'opening_explorer').length).toBeGreaterThanOrEqual(3);
});
test('notifications: the bell shows the inbox; the page marks all as read', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop header');
  let read = false;
  const calls = await mock(page, {
    notifications: () => ({ notifications: [{ id: '00000000-0000-0000-0000-000000000001', kind: 'achievement', title: 'Achievement: First win', body: 'See it on your profile.', url: '/?profile=1', created_at: new Date().toISOString(), read_at: read ? new Date().toISOString() : null }, { id: '00000000-0000-0000-0000-000000000002', kind: 'tournament', title: 'Friday Swiss · round 2', body: 'Your game is ready.', url: '/?game=AB12', created_at: new Date().toISOString(), read_at: read ? new Date().toISOString() : null }], unread: read ? 0 : 2 }),
    notifications_read: () => { read = true; return { ok: true } },
  });
  await page.goto('/');
  await expect(page.locator('#notifyCount')).toHaveText('2');
  await page.locator('#notifyBtn').click();
  await expect(page.locator('#notifyList .inbox-row')).toHaveCount(2);
  await page.locator('.inbox-all').click();
  await expect(page.locator('.inbox-page .inbox-row.unread')).toHaveCount(2);
  await page.locator('.inbox-readall').click();
  await expect(page.locator('.inbox-page .inbox-row.unread')).toHaveCount(0);
  await expect(page.locator('#notifyCount')).toBeHidden();
  expect(calls.some(c => c.action === 'notifications_read')).toBe(true);
});
