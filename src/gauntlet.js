// The Vanta Gauntlet: seven computer opponents, each stronger than the last. Three lives per
// run; a win moves you on, a draw or a loss costs a life. Colours alternate, starting with
// White. Progress lives on this device.
import { localStore } from './safe-storage.js';
export const GAUNTLET_KEY = 'vch.gauntlet';
export const GAUNTLET_LIVES = 3;
export const GAUNTLET_STAGES = [
  { name: 'The Gate', elo: 900 },
  { name: 'The Lantern', elo: 1200 },
  { name: 'The Hollow', elo: 1500 },
  { name: 'The Obsidian Hall', elo: 1800 },
  { name: 'The Eclipse', elo: 2100 },
  { name: 'The Abyss', elo: 2400 },
  { name: 'The Vanta', elo: 2700 },
];
const read = s => { try { return JSON.parse(s?.getItem(GAUNTLET_KEY) || '') || null; } catch { return null; } };
export function loadGauntlet(storage = localStore) {
  const v = read(storage) || {};
  return { run: v.run && Number.isInteger(v.run.stage) ? v.run : null, best: Number(v.best) || 0, clears: Number(v.clears) || 0, runs: Number(v.runs) || 0 };
}
export function saveGauntlet(state, storage = localStore) { try { storage?.setItem(GAUNTLET_KEY, JSON.stringify(state)); } catch {} return state; }
export function newRun(state) { return { ...state, run: { stage: 0, lives: GAUNTLET_LIVES, results: [] }, runs: state.runs + 1 }; }
export const stageColor = stage => (stage % 2 ? 'b' : 'w');
// `score`: 1 win, 0.5 draw, 0 loss. Returns the new state plus what happened.
export function recordStage(state, score) {
  const run = state.run; if (!run) return { state, event: null };
  const results = [...run.results, score];
  if (score === 1) {
    const stage = run.stage + 1, best = Math.max(state.best, stage);
    if (stage >= GAUNTLET_STAGES.length) return { state: { ...state, run: null, best, clears: state.clears + 1 }, event: 'cleared' };
    return { state: { ...state, best, run: { ...run, stage, results } }, event: 'advanced' };
  }
  const lives = run.lives - 1;
  if (lives <= 0) return { state: { ...state, run: null }, event: 'over' };
  return { state: { ...state, run: { ...run, lives, results } }, event: 'life' };
}
