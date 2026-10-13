import { test, expect } from '@playwright/test';

// Each mode is reviewed under its own rules (round 13).
const MOCK = body => route => route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
async function openMyGames(page) {
  if (test.info().project.name === 'mobile') { await page.locator('[data-m-tab="more"]').click(); await page.locator('#mSheetItems button', { hasText: 'My games' }).click(); }
  else await page.locator('[data-nav="review"]').click();
}

// Vanta Dark, from Black's side: White's queen reached h5 and the bishop c4 out of Black's sight,
// so 3...Nf6 was a natural move on the board Black could see. It loses to mate, but it is
// "Ambushed", not a blunder.
const DARK = { id: 'local-dark', source: 'computer', variant: 'dark', pgn: '1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7#', result: '1-0', white: 'Shade', black: 'Me', myColor: 'b',
  whiteRating: 1200, blackRating: null, rated: false, base: 600, inc: 0, date: new Date().toISOString(), moves: 7 };

test('Vanta Dark review: a move that walked into what you could not see is Ambushed', async ({ page }) => {
  test.setTimeout(120000);
  await page.addInitScript(entry => { localStorage.setItem('vch.intro-seen', '1'); localStorage.setItem('vanta.flagPrompt', '1'); localStorage.setItem('vch.archive.local', JSON.stringify([entry])) }, DARK);
  await page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', MOCK({ games: [], player: { id: 'me' } }));
  await page.goto('/');
  await openMyGames(page);
  await page.locator('.archive-row').click();
  await expect(page.locator('#reviewProgressLabel')).toHaveText('Review complete', { timeout: 90000 });
  await expect(page.locator('#moves .classification-ambushed')).toHaveCount(1);
  await expect(page.locator('#moves .classification-blunder')).toHaveCount(0);
  await expect(page.locator('#reviewCounts [title="Ambushed"] b')).toHaveText('1');
  await expect(page.locator('.story-moments')).toContainText('Ambushed');
});

// Crazyhouse, from the server's history: drops replay with the pieces in hand and the
// multi-variant engine reviews every position.
const ZH_SANS = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5', 'Nxd5', 'Nxf7', 'Kxf7', 'Bxd5+', 'Qxd5', 'N@c3', 'Qe6', 'Qf3+', 'N@f6', 'P@d5', 'B@g4', 'dxe6+', 'Kxe6', 'Q@d5+'];
const ZH_GAME = { id: 'zh-archived', white_player_id: 'me', black_player_id: 'opp', white_name: 'Me', black_name: 'Rival', status: 'resigned', result: '1-0', rated: false, pool: 'crazyhouse', source: 'invite',
  variant: 'crazyhouse', time_control_seconds: 180, increment_seconds: 2, pgn: '', move_count: ZH_SANS.length, sans: ZH_SANS, start_fen: null,
  created_at: new Date().toISOString(), ended_at: new Date().toISOString() };

test('Crazyhouse review: an archived game replays its drops and the variant engine reviews it', async ({ page }) => {
  test.setTimeout(240000);
  await page.addInitScript(() => { localStorage.setItem('vch.intro-seen', '1'); localStorage.setItem('vanta.flagPrompt', '1') });
  await page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', MOCK({ games: [ZH_GAME], player: { id: 'me' } }));
  const engines = [];
  page.on('request', r => { if (/variant\.worker\.js|stockfish-mv-10/.test(r.url())) engines.push(r.url()) });
  await page.goto('/');
  await openMyGames(page);
  await page.locator('.archive-row').first().click();
  await expect(page.locator('#moves')).toContainText('N@c3');
  await expect(page.locator('#moves')).toContainText('Q@d5+');
  // The final position: the queen dropped on d5, the knight dropped on f6.
  await expect(page.locator('.board-piece[data-square="d5"]')).toHaveCount(1);
  await expect(page.locator('.board-piece[data-square="f6"]')).toHaveCount(1);
  await expect(page.locator('#reviewProgressLabel')).toHaveText('Review complete', { timeout: 220000 });
  expect(engines.some(u => /variant\.worker\.js/.test(u))).toBe(true);
  await expect(page.locator('#moves [class*="classification-"]')).toHaveCount(ZH_SANS.length);
  await expect(page.locator('.story-retry')).toHaveCount(0);
});
