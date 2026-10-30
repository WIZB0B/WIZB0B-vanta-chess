// Learn from your mistakes: positions where YOU went wrong in reviewed games, drilled until
// you find the better move on your own (spaced: again tomorrow, in 3 days, in a week).
// Kept in this browser only.

import { localStore } from './safe-storage.js';
export const MISTAKES_KEY = 'vch.mistakes';
export const MISTAKE_CLASSES = new Set(['blunder', 'mistake', 'miss']);
export const BOX_DAYS = [0, 1, 3, 7];
export const MASTERED_BOX = BOX_DAYS.length;
const DAY = 86400000;

// From a finished review: one entry per costly move of yours that has a known better move.
export function collectMistakes({ results = [], moves = [], positions = [], mine = 'w', gameId = '', date = null, opponent = '' } = {}, now = Date.now()) {
  const out = [];
  results.forEach((r, i) => {
    const move = moves[i];
    if (!move || move.color !== mine || !MISTAKE_CLASSES.has(r?.classification)) return;
    const best = String(r.bestMove || '').toLowerCase();
    if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(best) || !positions[i]) return;
    out.push({ id: `${gameId}:${i + 1}`, fen: positions[i], best, played: move.san, classification: r.classification, loss: Math.round(Number(r.loss) || 0), moveNo: Math.ceil((i + 1) / 2), color: mine, gameId, date: date || new Date(now).toISOString(), opponent, box: 0, due: now, tries: 0, fixed: false });
  });
  return out;
}
// Newest first, no duplicate positions, at most `cap`.
export function mergeMistakes(bank = [], fresh = [], cap = 200) {
  const seen = new Set(), out = [];
  for (const m of [...fresh, ...bank]) { const key = `${m.fen.split(' ').slice(0, 4).join(' ')}|${m.best}`; if (seen.has(key)) continue; seen.add(key); out.push(m); }
  return out.slice(0, cap);
}
export function dueMistakes(bank = [], now = Date.now()) {
  return bank.filter(m => m.box < MASTERED_BOX && m.due <= now).sort((a, b) => b.loss - a.loss);
}
// Right on the first try: next box. Wrong: back to the start, due again now.
export function gradeMistake(m, correct, now = Date.now()) {
  const box = correct ? m.box + 1 : 0;
  return { ...m, box, tries: m.tries + 1, fixed: m.fixed || correct, due: now + (box < MASTERED_BOX ? BOX_DAYS[box] * DAY : 0) };
}
export function mistakeStats(bank = [], now = Date.now()) {
  return { total: bank.length, due: dueMistakes(bank, now).length, mastered: bank.filter(m => m.box >= MASTERED_BOX).length, fixed: bank.filter(m => m.fixed).length };
}
export function loadMistakes(storage = localStore) { try { const v = JSON.parse(storage.getItem(MISTAKES_KEY) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } }
export function saveMistakes(bank, storage = localStore) { try { storage.setItem(MISTAKES_KEY, JSON.stringify(bank)); } catch {} return bank; }
