// The Vanta Campaign (round 12): a journey across five realms. Each realm has its own board
// (a relic theme), atmosphere and music, two guards and a boss whose battle bends the rules:
// Blackout Blitz in the Ashen March, the fog of Vanta Dark in the Drowned Keep, your own openings
// in the Mirror Court, a Chess960 court for the Usurper, and the Vanta King at the top of the
// Obsidian Spire. Beating a boss frees the realm, unlocks its relic and opens the next one.
// Battles earn up to three stars: the win, a win in 40 moves or fewer, and a fulfilled oath.
// Progress lives on this device. Pure; src/main.js draws the map and starts the battles.

export const CAMPAIGN_KEY = 'vch.campaign';
export const REALMS = [
  { id: 'ashen', name: 'The Ashen March', relic: 'ashen', atmosphere: 'embers', music: 'ember',
    story: 'A burned frontier where the fires never quite go out. Its warden fights by the light of the embers alone.',
    battles: [
      { name: 'The Cinder Squire', elo: 800, side: 'w', rules: 'standard' },
      { name: 'The Coal Knight', elo: 1000, side: 'b', rules: 'standard' },
      { name: 'The Ember Warden', elo: 1150, side: 'w', rules: 'blackout', boss: true, twist: 'Blackout Blitz: every few moves the lights go out' },
    ] },
  { id: 'tidal', name: 'The Drowned Keep', relic: 'tidal', atmosphere: 'rain', music: 'umbra',
    story: 'A fortress under black water. Its master sees everything; you see only what your pieces see.',
    battles: [
      { name: 'The Bell Ringer', elo: 1100, side: 'b', rules: 'standard' },
      { name: 'The Salt Bishop', elo: 1250, side: 'w', rules: 'standard' },
      { name: 'The Tidecaller', elo: 1100, side: 'w', rules: 'dark', boss: true, twist: 'Vanta Dark: you only see what your pieces see' },
    ] },
  { id: 'court', name: 'The Mirror Court', relic: 'court', atmosphere: 'still', music: 'mirror',
    story: 'A hall of glass where every courtier wears your face. The last one plays exactly as you do.',
    battles: [
      { name: 'The Glass Page', elo: 1350, side: 'w', rules: 'standard' },
      { name: 'The Silver Herald', elo: 1500, side: 'b', rules: 'standard' },
      { name: 'The Pale Reflection', elo: 0, side: 'w', rules: 'shadow', boss: true, twist: 'Your Shadow: your own openings, at your strength' },
    ] },
  { id: 'crown', name: 'The Hollow Crown', relic: 'crown', atmosphere: 'embers', music: 'gilded',
    story: 'A usurper holds the throne and never sets his court the same way twice.',
    battles: [
      { name: 'The Turncoat', elo: 1600, side: 'b', rules: 'standard' },
      { name: 'The Gilded Guard', elo: 1750, side: 'w', rules: 'standard' },
      { name: 'The Usurper', elo: 1850, side: 'b', rules: 'freestyle', boss: true, twist: 'Chess960: the back ranks are shuffled' },
    ] },
  { id: 'spire', name: 'The Obsidian Spire', relic: 'eclipse', atmosphere: 'storm', music: 'obsidian',
    story: 'At the top of the black tower, in the storm, the Vanta King waits.',
    battles: [
      { name: 'The Night Warden', elo: 1950, side: 'w', rules: 'standard' },
      { name: 'The Eclipse Knight', elo: 2150, side: 'b', rules: 'standard' },
      { name: 'The Vanta King', elo: 2400, side: 'w', rules: 'standard', boss: true, twist: 'The strongest opponent in VCH, in the storm' },
    ] },
];
export const realmById = id => REALMS.find(r => r.id === id) || null;
export const battleKey = (realm, i) => `${realm}-${i}`;
export const MAX_STARS = REALMS.length * 3 * 3;

export function loadCampaign(storage = globalThis.localStorage) {
  let v = null; try { v = JSON.parse(storage?.getItem(CAMPAIGN_KEY) || ''); } catch {}
  const won = v && typeof v.won === 'object' && v.won ? Object.fromEntries(Object.entries(v.won).filter(([k, x]) => /^[a-z]+-[0-2]$/.test(k) && x && Number.isInteger(x.stars))) : {};
  return { won, pending: v?.pending && realmById(v.pending.realm) ? v.pending : null };
}
export function saveCampaign(state, storage = globalThis.localStorage) { try { storage?.setItem(CAMPAIGN_KEY, JSON.stringify(state)); } catch {} return state; }
// A realm opens when the previous realm's boss is beaten; a battle opens when the previous one is won.
export function realmOpen(state, index) { return index === 0 || !!state.won[battleKey(REALMS[index - 1].id, 2)]; }
export function battleOpen(state, realmIndex, battle) { return realmOpen(state, realmIndex) && (battle === 0 || !!state.won[battleKey(REALMS[realmIndex].id, battle - 1)]); }
export const realmFreed = (state, realm) => !!state.won[battleKey(realm, 2)];
export function starsFor({ score, plies = 0, oath = null }) {
  if (score !== 1) return 0;
  return 1 + (plies <= 80 ? 1 : 0) + (oath === 'fulfilled' ? 1 : 0);
}
// Records a battle result. Keeps your best stars. Returns {state, stars, freed: realm | null, first}.
export function recordBattle(state, realm, i, { score, plies = 0, oath = null, at = new Date().toISOString() }) {
  const key = battleKey(realm, i), stars = starsFor({ score, plies, oath }), prev = state.won[key];
  if (!stars) return { state: { ...state, pending: null }, stars: 0, freed: null, first: false };
  const best = Math.max(stars, prev?.stars || 0);
  const next = { ...state, pending: null, won: { ...state.won, [key]: { stars: best, at: prev?.at || at } } };
  const r = realmById(realm), freed = r && i === 2 && !prev ? r : null;
  return { state: next, stars, freed, first: !prev };
}
export function totalStars(state) { return Object.values(state.won).reduce((n, x) => n + (Number(x.stars) || 0), 0); }
export function realmsFreed(state) { return REALMS.filter(r => realmFreed(state, r.id)).length; }
