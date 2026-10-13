// Board sets earned in the monthly league: reach a division (or finish a season in it) to
// unlock its colours. Classic is always available.
export const BOARD_SETS = [
  { id: 'classic', name: 'Classic', light: '#d9cfb2', dark: '#29463b', division: null },
  { id: 'bronze', name: 'Bronze', light: '#ead6b8', dark: '#8a5a34', division: 0 },
  { id: 'silver', name: 'Silver', light: '#e4e7ea', dark: '#6b7783', division: 1 },
  { id: 'gold', name: 'Gold', light: '#f2e3b3', dark: '#9b7526', division: 2 },
  { id: 'platinum', name: 'Platinum', light: '#edf0f1', dark: '#4c626e', division: 3 },
  { id: 'diamond', name: 'Diamond', light: '#e4f2f7', dark: '#2d6a8a', division: 4 },
];
const DIV = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
// Highest division reached: current division (signed-in players) or any season badge.
export function bestDivision(profile) {
  if (!profile?.account) return -1;
  let best = Number(profile.league_division || 0);
  for (const a of profile.achievements || []) {
    const m = /^season-\d{4}-\d{2}-([a-z]+)$/.exec(String(a?.id || a || ''));
    if (m && DIV.includes(m[1])) best = Math.max(best, DIV.indexOf(m[1]));
  }
  return best;
}
export function unlockedSets(profile) {
  const best = bestDivision(profile);
  return BOARD_SETS.map(s => ({ ...s, unlocked: s.division === null || best >= s.division }));
}
