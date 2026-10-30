import { test, expect } from '@playwright/test';
import { useScriptedEngine, startComputerGame, clickAt, releaseBotMove } from './board-helpers.js';

// Bug pass (2026-10-30): work that kept running when nothing needed it. A search cancelled while
// it was still joining kept polling; the Resonance loop woke the page eight times a second with
// Resonance off; the clocks were rewritten four times a second whether or not the second had
// turned; and the living wallpaper re-read the page's style and size once a second.
async function setup(page, extra = {}) {
  await page.addInitScript(() => {
    localStorage.setItem('vch.intro-seen', '1'); localStorage.setItem('vanta.flagPrompt', '1');
    // Live intervals by delay, and reads of the page's computed style.
    const live = new Map(), si = window.setInterval, ci = window.clearInterval, gcs = window.getComputedStyle;
    window.__liveIntervals = ms => [...live.values()].filter(d => d === ms).length;
    window.setInterval = function (f, ms, ...a) { const id = si.call(this, f, ms, ...a); live.set(id, ms | 0); return id; };
    window.clearInterval = function (id) { live.delete(id); return ci.call(this, id); };
    window.__bodyStyleReads = 0;
    window.getComputedStyle = function (el, ...a) { if (el === document.body) window.__bodyStyleReads++; return gcs.call(this, el, ...a); };
  });
  const calls = [];
  await page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', async route => {
    let body = {}; try { body = route.request().postDataJSON(); } catch {}
    calls.push(body.action);
    const reply = extra[body.action];
    const out = typeof reply === 'function' ? await reply(body) : reply ?? (body.action === 'profile' ? { player: { id: 'me' } } : {});
    await route.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(out) });
  });
  return calls;
}

test('a search cancelled while it is still joining leaves the queue and never polls', async ({ page }) => {
  let releaseJoin; const joined = new Promise(r => { releaseJoin = r; });
  const calls = await setup(page, { queue_join: async () => { await joined; return { queued: true }; }, queue_status: () => ({ queued: true }), queue_leave: () => ({ left: true }) });
  await page.goto('/');
  await page.locator('[data-mode="match"]').click();
  await page.locator('#findOpponent').click();
  await expect(page.locator('#findOpponentLabel')).toHaveText('Cancel search');
  await expect.poll(() => calls.includes('queue_join')).toBe(true);
  await page.locator('#findOpponent').click(); // cancel while the join is still on its way
  await expect(page.locator('#findOpponentLabel')).not.toHaveText('Cancel search');
  releaseJoin();
  // The late join is answered by leaving the queue again, and nothing polls afterwards.
  await expect.poll(() => calls.filter(a => a === 'queue_leave').length).toBeGreaterThanOrEqual(2);
  await page.waitForTimeout(2500);
  expect(calls.filter(a => a === 'queue_status')).toEqual([]);
});

test('with Resonance off nothing ticks eight times a second; turning it on and off starts and stops it', async ({ page }) => {
  await setup(page);
  await page.goto('/');
  await expect(page.locator('#bootVeil')).toHaveCount(0, { timeout: 8000 });
  expect(await page.evaluate(() => window.__liveIntervals(120))).toBe(0);
  await page.evaluate(() => { const s = document.getElementById('resonanceSetting'); s.value = 'on'; s.dispatchEvent(new Event('change', { bubbles: true })); });
  await expect.poll(() => page.evaluate(() => window.__liveIntervals(120))).toBe(1);
  await page.evaluate(() => { const s = document.getElementById('resonanceSetting'); s.value = 'off'; s.dispatchEvent(new Event('change', { bubbles: true })); });
  await expect.poll(() => page.evaluate(() => window.__liveIntervals(120))).toBe(0);
});

test('a running clock is rewritten once a second, and the wallpaper does not re-read the page at idle', async ({ page }) => {
  await setup(page);
  await useScriptedEngine(page);
  await startComputerGame(page);
  // The clocks run once both sides have made their first move.
  await clickAt(page, 'e2'); await clickAt(page, 'e4');
  await releaseBotMove(page, 'e7e5', 1);
  await expect.poll(() => page.locator('#bottomClock.running, #topClock.running').count(), { timeout: 5000 }).toBe(1);
  // The move changed the page, so the wallpaper reads it once more on its next beat; then it rests.
  await page.waitForTimeout(1500);
  const counts = await page.evaluate(() => new Promise(done => {
    const writes = { top: 0, bottom: 0 };
    const watch = (id, key) => new MutationObserver(list => { writes[key] += list.length; }).observe(document.getElementById(id), { childList: true, characterData: true, subtree: true, attributes: true });
    watch('topClock', 'top'); watch('bottomClock', 'bottom');
    const reads = window.__bodyStyleReads;
    setTimeout(() => done({ ...writes, reads: window.__bodyStyleReads - reads }), 3000);
  }));
  // Three seconds: about three changes on the running clock (not twelve), none on the other.
  expect(counts.top + counts.bottom).toBeLessThanOrEqual(5);
  expect(Math.min(counts.top, counts.bottom)).toBe(0);
  expect(counts.reads).toBe(0);
});
