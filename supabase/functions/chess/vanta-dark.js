// Vanta Dark (fog of war). Normal chess rules, but you only see your own pieces and the
// squares they could move to; enemy pieces elsewhere are hidden in the dark. When you are in
// check, the checking pieces are revealed. The whole board shows again when the game ends.
const FILES = 'abcdefgh';
const sq = (f, r) => FILES[f] + (r + 1);
function boardOf(fen) {
  const rows = String(fen || '').split(' ')[0].split('/'), board = new Map();
  rows.forEach((row, i) => {
    let f = 0; const r = 7 - i;
    for (const ch of row) {
      if (/\d/.test(ch)) { f += Number(ch); continue; }
      board.set(sq(f, r), { color: ch === ch.toUpperCase() ? 'w' : 'b', type: ch.toLowerCase() });
      f++;
    }
  });
  return board;
}
const coords = s => [FILES.indexOf(s[0]), Number(s[1]) - 1];
const inside = (f, r) => f >= 0 && f < 8 && r >= 0 && r < 8;
const STEPS = {
  n: [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]],
  k: [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]],
};
const RAYS = { b: [[1, 1], [1, -1], [-1, 1], [-1, -1]], r: [[1, 0], [-1, 0], [0, 1], [0, -1]] };
RAYS.q = [...RAYS.b, ...RAYS.r];

// Every square `color` can see: its own pieces plus every square they could move to
// (a slider sees up to and including the first piece in its way; pawns see the squares
// ahead they could step to and diagonal squares only when there is something to take).
export function visibleSquares(fen, color, { reveal = [] } = {}) {
  const board = boardOf(fen), ep = String(fen || '').split(' ')[3] || '-', seen = new Set(reveal);
  for (const [s, p] of board) {
    if (p.color !== color) continue;
    seen.add(s);
    const [f, r] = coords(s);
    if (p.type === 'p') {
      const dir = color === 'w' ? 1 : -1, home = color === 'w' ? 1 : 6;
      const one = inside(f, r + dir) ? sq(f, r + dir) : null;
      if (one && !board.has(one)) {
        seen.add(one);
        const two = r === home ? sq(f, r + 2 * dir) : null;
        if (two && !board.has(two)) seen.add(two);
      }
      for (const df of [-1, 1]) {
        if (!inside(f + df, r + dir)) continue;
        const t = sq(f + df, r + dir), occ = board.get(t);
        if ((occ && occ.color !== color) || t === ep) seen.add(t);
      }
      continue;
    }
    if (STEPS[p.type]) {
      for (const [df, dr] of STEPS[p.type]) if (inside(f + df, r + dr)) seen.add(sq(f + df, r + dr));
      continue;
    }
    for (const [df, dr] of RAYS[p.type] || []) {
      let x = f + df, y = r + dr;
      while (inside(x, y)) { const t = sq(x, y); seen.add(t); if (board.has(t)) break; x += df; y += dr; }
    }
  }
  return seen;
}
// The board as `color` sees it: pieces on squares they can't see are left out.
export function fogPosition(position, visible, color) {
  const out = new Map();
  for (const [s, key] of position) if (key[0] === color || visible.has(s)) out.set(s, key);
  return out;
}
// The move list hides the opponent's moves until the game is over.
export function darkSan(record, index, myColor, over = false) {
  const mover = record?.color || (index % 2 ? 'b' : 'w');
  return over || mover === myColor ? record?.san || '' : '?';
}
// Checking pieces to reveal: chess.js `attackers` of your king while it's your move in check.
export function checkers(game, color) {
  if (!game.inCheck() || game.turn() !== color) return [];
  const king = game.board().flat().find(p => p && p.type === 'k' && p.color === color);
  if (!king) return [];
  try { return game.attackers(king.square, color === 'w' ? 'b' : 'w'); } catch { return []; }
}
