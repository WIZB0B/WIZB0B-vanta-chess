import { test, expect } from '@playwright/test';

// The live server sent puzzles whose FEN was one move early (the wrong side to move), so no
// piece could be moved. This is that exact payload (Lichess puzzle EaXfa, 2026-10-12).
const PUZZLE = { id: 'EaXfa', fen: 'r1bQ3R/pp3r2/2k1p3/2qpP3/2n2P2/6P1/NbP5/1K1R1B2 w - - 7 27', rating: 1570, plays: 1521, themes: ['long', 'advantage', 'middlegame'], source: 'lichess', initialPly: 52, gameId: '639Ygtma',
  gamePgn: 'd4 d5 Nc3 Nf6 Bg5 e6 a3 Be7 f3 O-O e4 c5 e5 Nfd7 Be3 cxd4 Bxd4 Nc6 f4 Nxd4 Qxd4 Bc5 Qd3 Qh4+ g3 Qe7 Nf3 Nb6 Ng5 g6 O-O-O Nc4 h4 Bxa3 h5 Bxb2+ Kb1 Qa3 Na2 Qc5 hxg6 hxg6 Nxf7 Rxf7 Qxg6+ Kf8 Rh8+ Ke7 Qg5+ Kd7 Qd8+ Kc6 Qxc8+',
  solution: ['a8c8', 'h8c8', 'f7c7', 'c8c7', 'c6c7'] };
test('puzzles: the board starts on the solver\'s move and the solution can be played', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('vch.intro-seen', '1'); localStorage.setItem('vanta.flagPrompt', '1') });
  let attempt = null;
  await page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', async route => {
    let body = {}; try { body = route.request().postDataJSON() } catch {}
    if (body.action === 'puzzle_attempt') attempt = body;
    const map = { profile: { player: { id: 'me' } }, puzzle_next: { puzzle: PUZZLE }, puzzle_attempt: { rating: 1210 } };
    await route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(map[body.action] || {}) });
  });
  await page.goto('/');
  if (test.info().project.name === 'mobile') await page.locator('[data-m-tab="puzzles"]').click(); else await page.locator('[data-nav="puzzles"]').click();
  await expect(page.locator('.puzzle-info h4')).toContainText('Black to move');
  const clickSq = async sq => { const b = await page.locator(`[data-sq="${sq}"]`).boundingBox(); await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2) };
  // Black plays; the puzzle answers for White (Rxc8+, then Rxc7+) before the next move.
  for (const [from, to, reply] of [['a8', 'c8', 'c8'], ['f7', 'c7', 'c7'], ['c6', 'c7', null]]) {
    await expect(page.locator(`.board-piece[data-square="${from}"]`)).toHaveAttribute('data-piece', /^b/, { timeout: 5000 });
    await clickSq(from); await clickSq(to);
    if (reply) await expect(page.locator(`.board-piece[data-square="${reply}"]`)).toHaveAttribute('data-piece', /^w/, { timeout: 5000 });
  }
  await expect.poll(() => attempt?.success).toBe(true);
});
