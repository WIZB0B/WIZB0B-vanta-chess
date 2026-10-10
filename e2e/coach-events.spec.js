import { test, expect } from '@playwright/test';

const AFTER_E4_E5 = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
async function mock(page, handlers = {}, signed = false) {
  await page.addInitScript(s => { localStorage.setItem('vch.intro-seen', '1'); localStorage.setItem('vanta.flagPrompt', '1'); if (s) localStorage.setItem('vanta.auth-session', JSON.stringify({ access_token: 't', refresh_token: 'r' })) }, signed);
  const calls = [];
  await page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', async route => {
    let body = {}; try { body = route.request().postDataJSON() } catch {}
    calls.push(body);
    const base = { profile: { player: { id: 'me', username: 'me', account: signed } }, bots: { bots: [] }, challenges: { incoming: [], outgoing: [], accepted: [] }, daily_games: { games: [] }, chat_list: { messages: [] } };
    await route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(handlers[body.action]?.(body) ?? base[body.action] ?? {}) });
  });
  return calls;
}
const click = async (page, sq) => { const b = await page.locator(`[data-sq="${sq}"]`).boundingBox(); await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2) };

test('coach: after your move against the computer, a note names the better move', async ({ page }) => {
  test.setTimeout(90000);
  test.skip(test.info().project.name === 'mobile', 'Desktop left panel');
  await mock(page);
  await page.goto('/');
  await page.locator('[data-mode="computer"]').click();
  await page.locator('[data-coach="on"]').click();
  await page.locator('#computerStart').click();
  await click(page, 'f2'); await click(page, 'f3');
  await expect(page.locator('#coachCard b')).toContainText('f3', { timeout: 40000 });
  await expect(page.locator('#coachCard')).not.toHaveClass(/thinking/);
});

test('tournaments: create a Swiss from the Arena tab', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop navigation');
  const calls = await mock(page, { tournaments: () => ({ tournaments: [], memberships: [], myGames: [] }), club_list: () => ({ clubs: [], mine: null }), tournament_create: b => ({ tournament: { id: 't1', name: b.name } }) }, true);
  await page.goto('/');
  await page.locator('.main-nav [data-nav="arena"]').click();
  await page.locator('.arena-create').click();
  await page.locator('.event-form [name="name"]').fill('Friday Swiss');
  await page.locator('[data-ef="swiss"]').click();
  await page.locator('[data-et="600-0"]').click();
  await page.locator('.event-form [name="rounds"]').fill('7');
  await page.locator('.vch-dialog-action.primary').click();
  await expect.poll(() => calls.find(c => c.action === 'tournament_create')).toMatchObject({ name: 'Friday Swiss', format: 'swiss', seconds: 600, increment: 0, rounds: 7, rated: false });
});

test('Watch: spectators can react; reactions float over the board', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop navigation');
  const now = new Date().toISOString();
  const watched = { id: '11111111-2222-3333-4444-555555555555', source: 'queue', white_name: 'Nova', black_name: 'Orion', status: 'active', result: '*', fen: AFTER_E4_E5, version: 3, move_count: 2, move_history: [{ from: 'e2', to: 'e4', san: 'e4', color: 'w' }, { from: 'e7', to: 'e5', san: 'e5', color: 'b' }], time_control_seconds: 600, increment_seconds: 0, white_time_ms: 600000, black_time_ms: 600000, last_move_at: now };
  await mock(page, { live_games: () => ({ games: [{ ...watched, move_history: undefined }] }), watch_state: () => ({ game: watched }) });
  await page.goto('/');
  await page.locator('[data-nav="watch"]').click();
  await page.locator('.watch-card').click();
  await expect(page.locator('#reactionBar')).toBeVisible();
  await page.locator('[data-react="brilliant"]').click();
  await expect(page.locator('.reaction-float')).toHaveText('!!');
  await page.locator('.main-nav [data-nav="play"]').click();
});
