import { Chess } from 'chess.js';

// Conditional moves for daily games: "if they play X, I reply Y". The server (rules.js
// matchConditional) plays the reply; this file turns plans into readable lines.
export function planSan(fen, line = []) {
  const c = new Chess(fen), out = [];
  for (const u of line) {
    let m = null;
    try { m = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] || undefined }); } catch {}
    if (!m) break;
    out.push({ san: m.san, color: m.color });
  }
  return out;
}
// "12… e5 13. Nf3" style text from a start FEN and UCI moves.
export function planText(fen, line = []) {
  const [, turn, , , , full] = String(fen).split(' ');
  let n = Number(full) || 1, side = turn || 'w';
  const parts = [];
  planSan(fen, line).forEach((m, i) => {
    if (side === 'w') parts.push(`${n}. ${m.san}`); else parts.push(i === 0 ? `${n}… ${m.san}` : m.san);
    if (side === 'b') n++; side = side === 'w' ? 'b' : 'w';
  });
  return parts.join(' ');
}
// A plan can be saved when it has the opponent's move and your reply, in pairs.
export function planReady(line = []) { return line.length >= 2 && line.length % 2 === 0 && line.length <= 12; }
