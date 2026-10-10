// Public profile helpers: the rating line (one pool at a time), records and links.

// Pools with games, most played first.
export function poolsPlayed(history = []) {
  const n = new Map();
  for (const h of history) n.set(h.pool, (n.get(h.pool) || 0) + 1);
  return [...n.entries()].sort((a, b) => b[1] - a[1]).map(([pool]) => pool);
}
// Points for an SVG line chart of one pool. Y range padded to a round 25.
export function ratingChartModel(history = [], pool, { width = 340, height = 150, padX = 40, padY = 14 } = {}) {
  const rows = history.filter(h => h.pool === pool && Number.isFinite(Number(h.rating)));
  if (rows.length < 2) return null;
  const vals = rows.map(r => Number(r.rating));
  const min = Math.floor((Math.min(...vals) - 10) / 25) * 25, max = Math.ceil((Math.max(...vals) + 10) / 25) * 25, span = max - min || 1;
  const x = i => padX + (i * (width - padX - 8)) / (rows.length - 1), y = v => padY + ((max - v) * (height - 2 * padY)) / span;
  const points = rows.map((r, i) => ({ x: +x(i).toFixed(1), y: +y(Number(r.rating)).toFixed(1), rating: Number(r.rating), at: r.at }));
  return { points, min, max, mid: Math.round((min + max) / 2), yOf: v => +y(v).toFixed(1), width, height, padX, peak: Math.max(...vals), last: vals.at(-1), first: vals[0] };
}
export function recordText({ wins = 0, draws = 0, losses = 0 } = {}) {
  return `${wins}W ${draws}D ${losses}L`;
}
export function profileUrl(username, origin = globalThis.location?.origin || '') {
  return `${origin}/?player=${encodeURIComponent(String(username || ''))}`;
}
// The opponent's username from a game, for a link (guests have no public profile).
export function opponentUsername(game, myColor) {
  if (!game || !myColor) return null;
  const name = myColor === 'w' ? game.black_name : game.white_name;
  return /^[A-Za-z0-9_]{3,20}$/.test(String(name || '')) ? name : null;
}
