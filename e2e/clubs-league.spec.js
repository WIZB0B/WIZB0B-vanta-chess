import { test, expect } from '@playwright/test';

async function mock(page, handlers) {
  await page.addInitScript(() => { localStorage.setItem('vch.intro-seen', '1'); localStorage.setItem('vanta.flagPrompt', '1'); localStorage.setItem('vanta.auth-session', JSON.stringify({ access_token: 't', refresh_token: 'r' })) });
  const calls = [];
  await page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', async route => {
    let body = {}; try { body = route.request().postDataJSON() } catch {}
    calls.push(body);
    const base = { profile: { player: { id: 'me', username: 'me', account: true } }, challenges: { incoming: [], outgoing: [], accepted: [] }, daily_games: { games: [] }, friends: { friends: [], followers: 0 } };
    const payload = handlers[body.action]?.(body) ?? base[body.action] ?? {};
    await route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(payload) });
  });
  return calls;
}
const CLUB = { club: { id: 'c1', slug: 'lagos-knights', name: 'Lagos Knights', description: 'Saturday blitz crew', member_count: 2 }, members: [{ id: 'm1', name: 'Amy', rating: 1400, online: true, role: 'owner' }, { id: 'me', name: 'me', rating: 1240, online: true, role: 'member' }], messages: [{ id: 'x', name: 'Amy', body: 'Battle on Sunday!', mine: false }], member: true, role: 'member' };

test('clubs: find, create, open; club chat for members', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop navigation');
  let said = null, created = null;
  await mock(page, {
    club_list: () => ({ clubs: [{ slug: 'lagos-knights', name: 'Lagos Knights', description: 'Saturday blitz crew', member_count: 2 }], mine: null }),
    club_create: b => { created = b; return { club: { slug: 'my-club', name: b.name } } },
    club_view: () => CLUB,
    club_chat: b => { said = b; return { message: { id: 'y' } } },
  });
  await page.goto('/');
  await page.locator('.main-nav [data-nav="friends"]').click();
  await page.locator('[data-community="clubs"]').click();
  await expect(page.locator('#clubList .club-row')).toContainText('Lagos Knights');
  await page.locator('#clubCreate input[name="name"]').fill('My Club');
  await page.locator('#clubCreate button[type="submit"]').click();
  await expect.poll(() => created?.name).toBe('My Club');
  await expect(page.locator('.club header h4')).toHaveText('Lagos Knights');
  await expect(page.locator('.club-messages')).toContainText('Battle on Sunday!');
  await page.locator('.club-say input').fill('See you there');
  await page.locator('.club-say button').click();
  await expect.poll(() => said?.body).toBe('See you there');
  expect(said.slug).toBe('lagos-knights');
});

test('league: division table with promotion and relegation zones', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop navigation');
  const rows = Array.from({ length: 10 }, (_, i) => ({ rank: i + 1, name: `p${i}`, points: 30 - i * 3, games: 6, wins: 4, me: i === 3 }));
  await mock(page, { league: b => ({ season: '2026-10', ends: '2026-11-01T00:00:00.000Z', division: b.division ?? 1, divisions: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'], myDivision: 1, me: { points: 21 }, minGames: 5, zones: { promote: 2, relegate: 2 }, total: 10, standings: rows, badges: [{ id: 'season-2026-09-silver' }] }) });
  await page.goto('/');
  await page.locator('.main-nav [data-nav="friends"]').click();
  await page.locator('[data-community="league"]').click();
  await expect(page.locator('.league-head')).toContainText('Silver division');
  await expect(page.locator('.league-me b')).toHaveText('#4');
  await expect(page.locator('.league-table > div.up')).toHaveCount(2);
  await expect(page.locator('.league-table > div.down')).toHaveCount(2);
  await expect(page.locator('.league .pp-badges')).toContainText('Silver · 2026-09');
  await page.locator('[data-division="2"]').click();
  await expect(page.locator('.league-head')).toContainText('Gold division');
});
