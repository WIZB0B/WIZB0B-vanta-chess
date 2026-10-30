// Today's training: a short plan built from your own data, with a daily streak.
// Progress lives on this device (PLAN_KEY), the streak too (STREAK_KEY).
import { localStore } from './safe-storage.js';
export const PLAN_KEY = 'vch.plan', STREAK_KEY = 'vch.planStreak';
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const yesterday = d => { const [y, m, day] = String(d).split('-').map(Number); return dayKey(new Date(y, m - 1, day - 1)); }; // local dates, no UTC parsing

// inputs: {repertoireLines, mistakesDue, endgames:[{id,title,stars}], weakTheme, weakThemeLabel}
export function buildPlan({ repertoireLines = 0, mistakesDue = 0, endgames = [], weakTheme = null, weakThemeLabel = '' } = {}) {
  const tasks = [{ id: 'puzzles', label: weakTheme ? `Solve 5 puzzles: ${weakThemeLabel || weakTheme}` : 'Solve 5 puzzles', target: 5, theme: weakTheme }];
  const eg = [...endgames].sort((a, b) => (a.stars || 0) - (b.stars || 0))[0];
  if (eg && (eg.stars || 0) < 3) tasks.push({ id: 'endgame', label: `Endgame drill: ${eg.title}`, target: 1, drill: eg.id });
  if (repertoireLines) tasks.push({ id: 'repertoire', label: 'Drill 3 repertoire lines', target: 3 });
  if (mistakesDue) tasks.push({ id: 'mistakes', label: `Fix ${Math.min(3, mistakesDue)} of your mistakes`, target: Math.min(3, mistakesDue) });
  tasks.push({ id: 'game', label: 'Play a game', target: 1 });
  return tasks;
}
export function loadProgress(storage = localStore, today = dayKey()) {
  try { const p = JSON.parse(storage?.getItem(PLAN_KEY) || 'null'); return p?.date === today ? p : { date: today, done: {} }; } catch { return { date: today, done: {} }; }
}
export function loadStreak(storage = localStore) { try { return JSON.parse(storage?.getItem(STREAK_KEY) || 'null') || { last: null, days: 0, best: 0 }; } catch { return { last: null, days: 0, best: 0 }; } }
// The streak shown today: it lapses if yesterday's plan wasn't finished.
export function currentStreak(s, today = dayKey()) { return s.last === today || s.last === yesterday(today) ? s.days : 0; }
export const planComplete = (tasks, progress) => tasks.every(t => (progress.done[t.id] || 0) >= t.target);
// Counts one step of a task; returns {progress, streak, completedNow}.
export function tick(tasks, id, storage = localStore, today = dayKey(), n = 1) {
  const progress = loadProgress(storage, today), streak = loadStreak(storage);
  const task = tasks.find(t => t.id === id);
  if (!task) return { progress, streak, completedNow: false };
  const was = planComplete(tasks, progress);
  progress.done[id] = Math.min(task.target, (progress.done[id] || 0) + n);
  const now = planComplete(tasks, progress);
  let next = streak;
  if (now && !was && streak.last !== today) {
    const days = streak.last === yesterday(today) ? streak.days + 1 : 1;
    next = { last: today, days, best: Math.max(streak.best || 0, days) };
    try { storage?.setItem(STREAK_KEY, JSON.stringify(next)); } catch {}
  }
  try { storage?.setItem(PLAN_KEY, JSON.stringify(progress)); } catch {}
  return { progress, streak: next, completedNow: now && !was };
}
