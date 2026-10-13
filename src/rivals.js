// Rivals: the people you keep meeting with results that stay close. From your finished games
// against other players (no computers): at least three games, closest score and most games
// first, recent games breaking ties.
export const RIVAL_MIN_GAMES = 3;
const scoreFor = (result, color) => result === '1/2-1/2' ? 0.5 : (result === '1-0') === (color === 'w') ? 1 : 0;
export function rivalsFrom(games = [], myId, { limit = 3 } = {}) {
  const by = new Map();
  for (const g of games) {
    if (!['1-0', '0-1', '1/2-1/2'].includes(g.result) || g.source === 'bot' || g.bot_player_id) continue;
    const color = g.white_player_id === myId ? 'w' : g.black_player_id === myId ? 'b' : null;
    const oppId = color === 'w' ? g.black_player_id : color === 'b' ? g.white_player_id : null;
    if (!oppId) continue;
    const r = by.get(oppId) || { id: oppId, name: color === 'w' ? g.black_name : g.white_name, games: 0, wins: 0, draws: 0, losses: 0, lastAt: null, last: [] };
    const s = scoreFor(g.result, color), at = g.ended_at || g.created_at || null;
    r.games++; if (s === 1) r.wins++; else if (s === 0.5) r.draws++; else r.losses++;
    if (!r.lastAt || (at && Date.parse(at) > Date.parse(r.lastAt))) { r.lastAt = at; r.name = (color === 'w' ? g.black_name : g.white_name) || r.name; }
    r.last.push({ at, s }); by.set(oppId, r);
  }
  return [...by.values()].filter(r => r.games >= RIVAL_MIN_GAMES).map(r => {
    const pct = (r.wins + r.draws / 2) / r.games, closeness = 1 - Math.abs(pct - 0.5) * 2;
    const form = r.last.sort((a, b) => Date.parse(b.at || 0) - Date.parse(a.at || 0)).slice(0, 5).map(x => x.s);
    const { last, ...rest } = r;
    return { ...rest, score: Math.round(pct * 100), form, heat: closeness * Math.log2(1 + r.games) };
  }).sort((a, b) => b.heat - a.heat || Date.parse(b.lastAt || 0) - Date.parse(a.lastAt || 0)).slice(0, limit);
}
export function rivalLine(r) {
  if (r.wins > r.losses) return `You lead ${r.wins}–${r.losses}`;
  if (r.losses > r.wins) return `They lead ${r.losses}–${r.wins}`;
  return `Level at ${r.wins}–${r.losses}`;
}
