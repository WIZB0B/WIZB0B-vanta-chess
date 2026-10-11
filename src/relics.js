// Relic sets: board themes you earn by playing (never bought). Each relic is a full set:
// light and dark squares, accent, gold and wallpaper; your piece set stays your own choice.
// Unlocks and the equipped relic live on this device.
export const RELICS_KEY = 'vch.relics';
export const RELICS = [
  { id: 'umbra', name: 'Umbra', how: 'Win a game of Vanta Dark', theme: { '--light': '#9a9fb0', '--dark': '#23262f', '--mint': '#9bb5ff', '--gold': '#c9cfe0' }, wallpaper: 'cobalt' },
  { id: 'ember', name: 'Ember', how: 'Win a Blackout Blitz game', theme: { '--light': '#e8c9a0', '--dark': '#6b2a1c', '--mint': '#ff9a5a', '--gold': '#f2b45c' }, wallpaper: 'burgundy' },
  { id: 'mirror', name: 'Mirror', how: 'Beat Your Shadow', theme: { '--light': '#dfe6ea', '--dark': '#4c5a63', '--mint': '#b8f1ff', '--gold': '#d9e2e8' }, wallpaper: 'ivory' },
  { id: 'obsidian', name: 'Obsidian', how: 'Reach The Obsidian Hall in the Vanta Gauntlet', theme: { '--light': '#b9b3a6', '--dark': '#15161a', '--mint': '#82edba', '--gold': '#e5c17c' }, wallpaper: 'classic' },
  { id: 'gilded', name: 'Gilded', how: 'Clear the Vanta Gauntlet', theme: { '--light': '#f3e2b3', '--dark': '#8a6a2e', '--mint': '#ffe08a', '--gold': '#ffd56b' }, wallpaper: 'burgundy' },
  { id: 'rivalry', name: 'Rivalry', how: 'Beat one of your rivals', theme: { '--light': '#d8c4c4', '--dark': '#4a1f2a', '--mint': '#ff7a90', '--gold': '#e8b0a0' }, wallpaper: 'burgundy' },
];
export const relicById = id => RELICS.find(r => r.id === id) || null;
export function loadRelics(storage = globalThis.localStorage) {
  let v = null; try { v = JSON.parse(storage?.getItem(RELICS_KEY) || ''); } catch {}
  const unlocked = v && typeof v.unlocked === 'object' && v.unlocked ? Object.fromEntries(Object.entries(v.unlocked).filter(([k]) => relicById(k))) : {};
  return { unlocked, equipped: relicById(v?.equipped) && unlocked[v.equipped] ? v.equipped : null, prev: v?.prev && typeof v.prev === 'object' ? v.prev : null };
}
export function saveRelics(state, storage = globalThis.localStorage) { try { storage?.setItem(RELICS_KEY, JSON.stringify(state)); } catch {} return state; }
// Returns { state, unlocked: relic | null } (null when it was already yours or unknown).
export function unlockRelic(state, id, at = new Date().toISOString()) {
  const relic = relicById(id); if (!relic || state.unlocked[id]) return { state, unlocked: null };
  return { state: { ...state, unlocked: { ...state.unlocked, [id]: at } }, unlocked: relic };
}
// Equipping remembers the theme you had, so taking the relic off puts it back.
export function equipRelic(state, id, currentTheme = {}) {
  if (id === null) return { ...state, equipped: null, prev: null };
  if (!state.unlocked[id]) return state;
  return { ...state, equipped: id, prev: state.equipped ? state.prev : { ...currentTheme } };
}
