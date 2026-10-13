import { test, expect } from '@playwright/test';
import { famousLessonById } from '../src/famous-lessons.js';
const OPERA = famousLessonById('opera-game');

// Round 13: the course library and famous-game lessons are played on the board.
async function boot(page) {
  await page.addInitScript(() => { localStorage.setItem('vch.intro-seen', '1'); localStorage.setItem('vanta.flagPrompt', '1') });
  await page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', r => r.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ player: { id: 'me' } }) }));
  await page.goto('/');
}
const clickSq = async (page, sq) => { const b = await page.locator(`[data-sq="${sq}"]`).boundingBox(); await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2) };

test('course lesson: read, a wrong move is taken back, the right line plays out, stars at the end', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop panel');
  await boot(page);
  await page.locator('[data-nav="learn"]').click();
  await expect(page.locator('.course-card')).toHaveCount(8);
  await page.locator('[data-course="tactics"]').click();
  await page.locator('[data-lesson="tactics/forks"]').click();
  await expect(page.locator('.lesson-player h4')).toHaveText('Forks');
  await page.locator('.lesson-next').click(); // the reading step
  await expect(page.locator('.lesson-prompt')).toContainText('fork the king and the rook');
  await expect(page.locator('.lesson-next')).toBeDisabled();
  // Wrong: the knight to b6 is legal but not the fork.
  await clickSq(page, 'd5'); await clickSq(page, 'b6');
  await expect(page.locator('.lesson-feedback.no')).toBeVisible();
  await expect(page.locator('.board-piece[data-square="d5"]')).toHaveAttribute('data-piece', 'wn');
  await clickSq(page, 'd5'); await clickSq(page, 'c7');
  await expect(page.locator('.board-piece[data-square="d7"]')).toHaveAttribute('data-piece', 'bk', { timeout: 5000 });
  await clickSq(page, 'c7'); await clickSq(page, 'a8');
  await expect(page.locator('.lesson-feedback.ok')).toContainText('Correct');
  await expect(page.locator('.lesson-explain')).toBeVisible();
  await expect(page.locator('.lesson-next')).toBeEnabled();
});

test('famous lesson: be shown each move; a score at the end', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop panel');
  await boot(page);
  await page.locator('[data-nav="famous"]').click();
  await page.locator('[data-famous-lesson="opera-game"]').click();
  await expect(page.locator('.famous-player h4')).toHaveText('The Opera Game');
  for (let i = 0; i < OPERA.moments.length; i++) {
    await page.locator('.famous-reveal').click();
    await expect(page.locator('.lesson-feedback')).toContainText(`played ${OPERA.moments[i].answer}`);
    await page.locator('.famous-next').click();
  }
  await expect(page.locator('.lesson-done')).toContainText(`You found 0 of ${OPERA.moments.length}`);
});

test("famous lesson: the master's move, from the choices or on the board, is correct", async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Desktop panel');
  await boot(page);
  await page.locator('[data-nav="famous"]').click();
  await page.locator('[data-famous-lesson="opera-game"]').click();
  await page.locator('.famous-choices-btn').click();
  await page.locator(`[data-choice="${OPERA.moments[0].answer}"]`).click();
  await expect(page.locator('.lesson-feedback.ok')).toBeVisible();
  await page.locator('.famous-next').click();
  // The second moment, played on the board.
  const m = OPERA.moments[1];
  const { Chess } = await import('chess.js');
  const c = new Chess(); for (let i = 0; i < m.ply; i++) c.move(OPERA.moves[i]);
  const mv = c.move(m.answer);
  await clickSq(page, mv.from); await clickSq(page, mv.to);
  await expect(page.locator('.lesson-feedback.ok')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('.lesson-dots i.done')).toHaveCount(2);
});
