import { Chess } from 'chess.js';

// Studies: one annotated line from any position, shared by link (?study=CODE).
export function studyPositions(startFen, moves = []) {
  let c;
  try { c = new Chess(startFen || undefined); } catch { return { positions: [], sans: [], valid: false }; }
  const positions = [c.fen()], sans = [];
  for (const m of moves) {
    let made = null;
    try { made = c.move(typeof m === 'string' ? m : m.san); } catch {}
    if (!made) return { positions, sans, valid: false };
    positions.push(c.fen()); sans.push(made.san);
  }
  return { positions, sans, valid: true };
}
export function studyRecordsValid(startFen, moves) { return studyPositions(startFen, moves).valid; }
export function studyUrl(code, origin = globalThis.location?.origin || '') { return `${origin}/?study=${encodeURIComponent(code)}`; }
// "1. e4 e5 2. Nf3" numbering for a ply list from a start FEN.
export function moveLabels(startFen, sans = []) {
  const parts = String(startFen || '').split(' ');
  let n = Number(parts[5]) || 1, side = parts[1] || 'w';
  return sans.map((san, i) => {
    const label = side === 'w' ? `${n}. ${san}` : i === 0 ? `${n}… ${san}` : san;
    if (side === 'b') n++; side = side === 'w' ? 'b' : 'w';
    return label;
  });
}
