import { Chess } from 'chess.js';

// Prep against a player: their openings (lines from their rated games) as a weighted tree.
// When it's their move, they "play" what they usually play here, as often as they play it.
const key = fen => String(fen).split(' ').slice(0, 4).join(' ');
export function prepTree(lines = []) {
  const tree = new Map();
  for (const { sans = [], score = 0.5 } of lines) {
    const c = new Chess();
    for (const san of sans) {
      const k = key(c.fen());
      let m = null; try { m = c.move(san); } catch { m = null; }
      if (!m) break;
      const node = tree.get(k) || new Map(); const r = node.get(m.san) || { san: m.san, n: 0, points: 0 };
      r.n++; r.points += score; node.set(m.san, r); tree.set(k, node);
    }
  }
  return tree;
}
// Their choices here, most played first: [{san, n, share, score}] (score: their result %).
export function prepStats(tree, fen) {
  const node = tree.get(key(fen)); if (!node) return [];
  const total = [...node.values()].reduce((s, r) => s + r.n, 0);
  return [...node.values()].sort((a, b) => b.n - a.n).map(r => ({ san: r.san, n: r.n, share: Math.round((100 * r.n) / total), score: Math.round((100 * r.points) / r.n) }));
}
export function prepReply(tree, fen, rand = Math.random) {
  const stats = prepStats(tree, fen); if (!stats.length) return null;
  const total = stats.reduce((s, r) => s + r.n, 0); let x = rand() * total;
  for (const r of stats) { x -= r.n; if (x < 0) return r.san; }
  return stats[0].san;
}
// Their favourite first moves as one colour: [{line:'1.e4 c5', n}]
export function prepSummary(lines = [], plies = 2) {
  const counts = new Map();
  for (const { sans = [] } of lines) { const k = sans.slice(0, plies).join(' '); if (k) counts.set(k, (counts.get(k) || 0) + 1); }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, n]) => ({ line: k.split(' ').map((s, i) => (i % 2 ? s : `${i / 2 + 1}.${s}`)).join(' '), n }));
}
