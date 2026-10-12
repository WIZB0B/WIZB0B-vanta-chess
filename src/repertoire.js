import { Chess } from 'chess.js';

// Your opening repertoire: lines (SAN lists from the start) as White and as Black.
// Positions are keyed without move counters, so transpositions meet in one node.
export const REP_KEY = 'vch.repertoire';
export const REP_MAX_LINES = 300, REP_MAX_PLIES = 40;
const posKey = fen => String(fen).split(' ').slice(0, 4).join(' ');
const START = new Chess().fen();

// position -> Set of SAN played from it in your lines
export function repTree(lines = []) {
  const tree = new Map();
  for (const line of lines) {
    const c = new Chess();
    for (const san of line) {
      const key = posKey(c.fen());
      let m = null; try { m = c.move(san); } catch { m = null; }
      if (!m) break;
      if (!tree.has(key)) tree.set(key, new Set());
      tree.get(key).add(m.san);
    }
  }
  return tree;
}
export function repMovesAt(lines, fen) { return [...(repTree(lines).get(posKey(fen)) || [])]; }

// Adds a line (replacing any line it extends); returns the new list or null if illegal/empty.
export function addLine(lines = [], sans = []) {
  const c = new Chess(), clean = [];
  for (const s of sans.slice(0, REP_MAX_PLIES)) { let m = null; try { m = c.move(s); } catch { m = null; } if (!m) return null; clean.push(m.san); }
  if (!clean.length) return null;
  const key = clean.join(' ');
  if (lines.some(l => l.join(' ') === key || l.join(' ').startsWith(key + ' '))) return lines; // already covered
  const kept = lines.filter(l => !(key + ' ').startsWith(l.join(' ') + ' ')); // the new line extends these
  return [...kept, clean].slice(-REP_MAX_LINES);
}
export function removeLine(lines = [], i) { return lines.filter((_, j) => j !== i); }

// A drill: walk your tree from the start, the opponent picking one of your prepared replies
// at random. Returns UCI moves from the start and how many of them are already played for
// you (when you're Black, White's first move is made for you).
export function repDrill(lines = [], color = 'w', rand = Math.random) {
  const tree = repTree(lines), c = new Chess(), ucis = [];
  for (let i = 0; i < REP_MAX_PLIES; i++) {
    const options = [...(tree.get(posKey(c.fen())) || [])];
    if (!options.length) break;
    const m = c.move(options[Math.floor(rand() * options.length)]);
    ucis.push(m.from + m.to + (m.promotion || ''));
  }
  const yours = ucis.filter((_, i) => (i % 2 === 0) === (color === 'w')).length;
  return yours ? { ucis, color } : null;
}
// You played a different move that is also in your repertoire: the rest of the drill follows it.
export function repContinue(lines, fenAfterPrefix, prefix, uci, rand = Math.random) {
  const c = new Chess(fenAfterPrefix);
  const options = repMovesAt(lines, c.fen());
  const m = (() => { try { return c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || undefined }); } catch { return null; } })();
  if (!m || !options.includes(m.san)) return null;
  const tree = repTree(lines), rest = [];
  for (let i = 0; i < REP_MAX_PLIES; i++) {
    const next = [...(tree.get(posKey(c.fen())) || [])];
    if (!next.length) break;
    const mv = c.move(next[Math.floor(rand() * next.length)]);
    rest.push(mv.from + mv.to + (mv.promotion || ''));
  }
  return [...prefix, m.from + m.to + (m.promotion || ''), ...rest];
}
// Lines shown as "1.e4 e5 2.Nf3".
export function lineText(sans = []) { return sans.map((s, i) => (i % 2 ? s : `${i / 2 + 1}.${s}`)).join(' '); }
export function repStats(rep = { w: [], b: [] }) { return { w: rep.w?.length || 0, b: rep.b?.length || 0, positions: repTree([...(rep.w || []), ...(rep.b || [])]).size }; }
// Where a game's moves left your repertoire for that colour: {ply, played, expected[]} or null.
export function repDeviation(lines = [], color = 'w', sans = []) {
  const tree = repTree(lines), c = new Chess(START);
  for (let i = 0; i < sans.length; i++) {
    const options = [...(tree.get(posKey(c.fen())) || [])];
    if (!options.length) return null; // your preparation ran out first
    const mine = (i % 2 === 0) === (color === 'w');
    let m = null; try { m = c.move(sans[i]); } catch { return null; }
    if (!options.includes(m.san)) return mine ? { ply: i, played: m.san, expected: options } : null;
  }
  return null;
}
