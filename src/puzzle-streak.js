// Puzzle Streak: puzzles get harder as the streak grows; one wrong move ends it. One skip
// per streak. The best streak is kept in this browser.

export const STREAK_DIFFICULTIES = ['easiest', 'easier', 'normal', 'harder', 'hardest'];
export const STREAK_STEP = 3; // solves per difficulty step
export const BEST_STREAK_KEY = 'vch.puzzle.bestStreak';

export function streakDifficulty(count) {
  return STREAK_DIFFICULTIES[Math.min(STREAK_DIFFICULTIES.length - 1, Math.floor(Math.max(0, count) / STREAK_STEP))];
}
export function loadBestStreak(storage = globalThis.localStorage) {
  try { return Math.max(0, Number(storage?.getItem(BEST_STREAK_KEY)) || 0) } catch { return 0 }
}
export function saveBestStreak(count, storage = globalThis.localStorage) {
  const best = Math.max(loadBestStreak(storage), count);
  try { storage?.setItem(BEST_STREAK_KEY, String(best)) } catch {}
  return best;
}
