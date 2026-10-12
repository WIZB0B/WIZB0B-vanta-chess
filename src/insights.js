import { openingName } from './opening-trainer.js';

// Insights from your finished games (rows from the server's `insights` action):
// {at, pool, rated, color, score (1 / 0.5 / 0), reason, plies, rating, opp, bot, tc, sans}.

const pct = (s, n) => (n ? Math.round((100 * s) / n) : null);
const add = (map, key, score) => { const r = map.get(key) || { key, games: 0, points: 0, wins: 0, draws: 0, losses: 0 }; r.games++; r.points += score; if (score === 1) r.wins++; else if (score === 0) r.losses++; else r.draws++; map.set(key, r); return r; };
const finish = map => [...map.values()].map(r => ({ ...r, score: pct(r.points, r.games) }));
export const PHASES = [['opening', 30], ['middlegame', 80], ['endgame', Infinity]];
export const phaseOf = plies => PHASES.find(([, max]) => plies <= max)[0];
export function lossReason(reason) {
  const r = String(reason || '').toLowerCase();
  if (r.includes('timeout') || r.includes('time')) return 'time';
  if (r.includes('resign')) return 'resigned';
  if (r.includes('abandon')) return 'left';
  if (r.includes('checkmate') || r.includes('mate')) return 'checkmate';
  return 'other';
}
const openingOf = sans => openingName(sans) || (sans.length ? sans.slice(0, 2).map((s, i) => (i % 2 ? s : `1.${s}`)).join(' ') : 'Other');

// Rating after each rated game in a pool, oldest first.
export function ratingSeries(rows = [], pool) {
  return rows.filter(r => r.rated && r.pool === pool && Number.isFinite(Number(r.rating)) && r.rating !== null)
    .map(r => ({ at: r.at, rating: Number(r.rating) })).sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}
export function poolsPlayed(rows = []) { const c = new Map(); for (const r of rows) if (r.rated) c.set(r.pool, (c.get(r.pool) || 0) + 1); return [...c.entries()].sort((a, b) => b[1] - a[1]).map(([p]) => p); }

export function insightSummary(rows = []) {
  const games = rows.filter(r => !r.bot && r.variant !== 'freestyle');
  const byColor = new Map(), byPool = new Map(), byOpening = new Map(), byStrength = new Map(), lossBy = new Map(), lossPhase = new Map();
  let points = 0;
  for (const r of games) {
    points += r.score;
    add(byColor, r.color, r.score); add(byPool, r.pool, r.score);
    add(byOpening, `${r.color}:${openingOf(r.sans || [])}`, r.score);
    if (Number.isFinite(Number(r.opp)) && r.opp !== null && Number.isFinite(Number(r.rating)) && r.rating !== null) {
      const gap = Number(r.opp) - Number(r.rating);
      add(byStrength, gap >= 100 ? 'stronger' : gap <= -100 ? 'weaker' : 'similar', r.score);
    }
    if (r.score === 0) { const k = lossReason(r.reason); lossBy.set(k, (lossBy.get(k) || 0) + 1); const ph = phaseOf(r.plies); lossPhase.set(ph, (lossPhase.get(ph) || 0) + 1); }
  }
  const losses = games.filter(r => r.score === 0).length;
  const openings = finish(byOpening).map(o => ({ ...o, color: o.key[0], name: o.key.slice(2) })).sort((a, b) => b.games - a.games);
  const out = {
    games: games.length, score: pct(points, games.length), losses,
    colors: finish(byColor), pools: finish(byPool).sort((a, b) => b.games - a.games), openings, strength: finish(byStrength),
    lossReasons: [...lossBy.entries()].map(([reason, n]) => ({ reason, n, share: pct(n, losses) })).sort((a, b) => b.n - a.n),
    lossPhases: PHASES.map(([ph]) => ({ phase: ph, n: lossPhase.get(ph) || 0, share: pct(lossPhase.get(ph) || 0, losses) })),
  };
  out.leaks = leaks(out);
  return out;
}

// The few things most worth working on, in plain words (English; translated by the UI).
export function leaks(s) {
  const out = [];
  if (s.games < 5) return out;
  const time = s.lossReasons.find(r => r.reason === 'time');
  if (time && time.n >= 2 && time.share >= 25) out.push({ kind: 'time', text: `${time.share}% of your losses are on time. Try a longer time control or move faster in the opening.`, action: 'play' });
  const weak = s.openings.filter(o => o.games >= 3).sort((a, b) => a.score - b.score)[0];
  if (weak && weak.score <= 40) out.push({ kind: 'opening', text: `${weak.name} as ${weak.color === 'w' ? 'White' : 'Black'}: you score ${weak.score}% in ${weak.games} games. Add it to your repertoire and drill it.`, action: 'repertoire', color: weak.color });
  const w = s.colors.find(c => c.key === 'w'), b = s.colors.find(c => c.key === 'b');
  if (w && b && w.games >= 3 && b.games >= 3 && Math.abs(w.score - b.score) >= 15) {
    const low = w.score < b.score ? 'White' : 'Black';
    out.push({ kind: 'color', text: `You score ${Math.abs(w.score - b.score)} points less as ${low}. Your ${low} openings are the place to start.`, action: 'repertoire', color: low === 'White' ? 'w' : 'b' });
  }
  const end = s.lossPhases.find(p => p.phase === 'endgame');
  if (end && end.n >= 2 && end.share >= 35) out.push({ kind: 'endgame', text: `${end.share}% of your losses come in long games that reach the endgame. The endgame drills help here.`, action: 'endgames' });
  const strong = s.strength.find(x => x.key === 'weaker');
  if (strong && strong.games >= 3 && strong.score < 55) out.push({ kind: 'upsets', text: `Against lower-rated players you score only ${strong.score}%. Slow down when you're ahead.`, action: 'mistakes' });
  return out.slice(0, 4);
}

// A small SVG line chart for a rating series (no library). Width/height in viewBox units.
export function ratingChartSvg(series = [], { width = 320, height = 120, pad = 8 } = {}) {
  if (series.length < 2) return '';
  const ys = series.map(p => p.rating), min = Math.min(...ys), max = Math.max(...ys), span = Math.max(20, max - min);
  const x = i => pad + (i * (width - 2 * pad)) / (series.length - 1), y = v => height - pad - ((v - min) * (height - 2 * pad)) / span;
  const d = series.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.rating).toFixed(1)}`).join(' ');
  const last = series.at(-1);
  return `<svg class="ins-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Rating from ${series[0].rating} to ${last.rating} over ${series.length} games"><path class="ins-area" d="${d} L${x(series.length - 1).toFixed(1)} ${height - pad} L${pad} ${height - pad} Z"/><path class="ins-line" d="${d}"/><circle cx="${x(series.length - 1).toFixed(1)}" cy="${y(last.rating).toFixed(1)}" r="3.5"/><text x="${pad}" y="${pad + 8}">${max}</text><text x="${pad}" y="${height - pad - 2}">${min}</text></svg>`;
}
