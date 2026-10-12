import { test, expect } from '@playwright/test';

const PROFILE = {
  player: { id: 'p-rival', username: 'Rival_9', country_code: 'NG', avatar_data: null, ratings: { blitz: 1342, rapid: 1288 }, provisional_games: { blitz: 40, rapid: 12 }, wins: 30, losses: 18, draws: 4, rated_games: 52, puzzle_rating: 1710, achievements: [{ id: 'first-win', at: '2026-09-01' }, { id: 'season-2026-09-silver', at: '2026-10-01' }], league_division: 1, member_since: '2026-08', online: true },
  history: Array.from({ length: 12 }, (_, i) => ({ pool: 'blitz', rating: 1250 + i * 9 - (i % 3) * 14, at: `2026-10-${String(i + 1).padStart(2, '0')}T12:00:00Z` })),
  bestWins: [{ opponent: 'Strong1', opponent_rating: 1520, result: 'win', pool: 'blitz', at: '2026-10-05T10:00:00Z' }],
  recent: [{ opponent: 'me', opponent_rating: 1240, result: 'loss', pool: 'blitz', at: '2026-10-09T10:00:00Z' }],
  headToHead: { wins: 2, draws: 1, losses: 1 }, following: false, self: false, club: { slug: 'lagos-knights', name: 'Lagos Knights' }, division: 'Silver',
};
test('public profile: opened by link, rating line with hover, head-to-head, report', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Same panel on phones');
  await page.addInitScript(() => { localStorage.setItem('vch.intro-seen', '1'); localStorage.setItem('vanta.flagPrompt', '1'); localStorage.setItem('vanta.auth-session', JSON.stringify({ access_token: 't', refresh_token: 'r' })) });
  let report = null;
  await page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', async route => {
    let body = {}; try { body = route.request().postDataJSON() } catch {}
    const map = { profile: { player: { id: 'me', username: 'me', account: true } }, public_profile: PROFILE, challenges: { incoming: [], outgoing: [], accepted: [] }, daily_games: { games: [] }, report_player: (report = body.action === 'report_player' ? body : report, { reported: true }) };
    await route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(map[body.action] || {}) });
  });
  await page.goto('/?player=Rival_9');
  await expect(page.locator('.pp-head h4')).toContainText('Rival_9');
  await expect(page.locator('.pp-h2h b')).toHaveText('2W 1D 1L');
  await expect(page.locator('.pp-h2h span')).toHaveText('63% score');
  await expect(page.locator('.pp-line')).toHaveCount(1);
  await page.locator('.pp-chart-svg').scrollIntoViewIfNeeded();
  const box = await page.locator('.pp-chart-svg').boundingBox();
  await page.mouse.move(box.x + box.width - 12, box.y + box.height / 2);
  await expect(page.locator('.pp-tip')).toBeVisible();
  await expect(page.locator('.pp-tip b')).toHaveText(String(PROFILE.history.at(-1).rating));
  await expect(page.locator('.pp-badges')).toContainText('Silver · 2026-09');
  await page.locator('.pp-report').click();
  await page.locator('.report-form select').selectOption('engine');
  await page.getByRole('button', { name: 'Send report' }).click();
  await expect.poll(() => report?.reason).toBe('engine');
  expect(report.playerId).toBe('p-rival');
});
