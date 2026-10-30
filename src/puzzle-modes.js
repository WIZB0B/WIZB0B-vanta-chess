// Puzzle run modes (round 13) and skip tokens.
// - Streak: no time limit; the clock counts up, showing how long each puzzle takes and the run.
// - Survival: every puzzle has a countdown (shorter as puzzles get harder); running out of
//   time ends the run, like a wrong move.
// - Skip tokens replace "one skip per streak": a token skips one puzzle in either mode. You
//   start with two, get one for each day you visit and one for every ten puzzles solved in a
//   run, and can hold up to five. They are kept in this browser.
import { streakDifficulty } from './puzzle-streak.js';
import { localStore } from './safe-storage.js';

export const RUN_MODES = { streak: 'streak', survival: 'survival' };
export const SURVIVAL_SECONDS = { easiest: 45, easier: 40, normal: 35, harder: 30, hardest: 25 };
export const SKIP_KEY = 'vch.puzzle.skips';
export const BEST_SURVIVAL_KEY = 'vch.puzzle.bestSurvival';
export const SKIP_START = 2, SKIP_MAX = 5, SKIP_MILESTONE = 10;

export function survivalSeconds(count) { return SURVIVAL_SECONDS[streakDifficulty(count)] || 35; }
// m:ss for a whole number of seconds (count-up and countdown both round down to the second shown).
export function clockLabel(ms) {
  const s = Math.max(0, Math.floor(Number(ms) / 1000) || 0);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
// Seconds left in a survival puzzle started at `started` (ms), never negative.
export function survivalLeft(count, started, now = Date.now()) {
  return Math.max(0, survivalSeconds(count) * 1000 - (now - started));
}

const isoDay = (now = new Date()) => now.toISOString().slice(0, 10);
function read(storage) {
  try { const v = JSON.parse(storage?.getItem(SKIP_KEY) || 'null'); if (v && typeof v === 'object') return v } catch {}
  return null;
}
function write(state, storage) { try { storage?.setItem(SKIP_KEY, JSON.stringify(state)) } catch {} return state; }
const clean = v => Math.max(0, Math.min(SKIP_MAX, Math.floor(Number(v)) || 0));
// The token purse. The first visit of each day adds one (reported as `daily: true` once).
export function loadSkips(storage = localStore, now = new Date()) {
  const saved = read(storage), today = isoDay(now);
  if (!saved) return { ...write({ tokens: SKIP_START, day: today }, storage), daily: false };
  const tokens = clean(saved.tokens);
  if (saved.day === today) return { tokens, day: today, daily: false };
  const next = { tokens: Math.min(SKIP_MAX, tokens + 1), day: today };
  write(next, storage);
  return { ...next, daily: next.tokens > tokens };
}
// Spends a token. Returns the new purse, or null when there is none.
export function spendSkip(storage = localStore, now = new Date()) {
  const purse = loadSkips(storage, now);
  if (purse.tokens < 1) return null;
  return write({ tokens: purse.tokens - 1, day: purse.day }, storage);
}
// A run that reaches 10, 20, 30… solved puzzles earns a token (up to the cap).
export function earnMilestone(count, storage = localStore, now = new Date()) {
  if (!(count > 0) || count % SKIP_MILESTONE) return null;
  const purse = loadSkips(storage, now);
  if (purse.tokens >= SKIP_MAX) return null;
  return write({ tokens: purse.tokens + 1, day: purse.day }, storage);
}
export function loadBestSurvival(storage = localStore) {
  try { return Math.max(0, Number(storage?.getItem(BEST_SURVIVAL_KEY)) || 0) } catch { return 0 }
}
export function saveBestSurvival(count, storage = localStore) {
  const best = Math.max(loadBestSurvival(storage), count);
  try { storage?.setItem(BEST_SURVIVAL_KEY, String(best)) } catch {}
  return best;
}
// The token as drawn in the puzzle card: a small coin with a forward arrow (no emoji).
export const SKIP_TOKEN_SVG = '<svg class="skip-token" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10.5" fill="#d9b468" stroke="#8a6a2f" stroke-width="1.2"/><circle cx="9.5" cy="8.5" r="5.5" fill="#f6e2ad" opacity=".55"/><path d="M8 7.5l5 4.5-5 4.5M12.5 7.5l5 4.5-5 4.5" fill="none" stroke="#3a2a10" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
