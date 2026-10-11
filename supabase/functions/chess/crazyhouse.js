// Crazyhouse on top of chess.js: a captured piece changes sides and goes to the capturer's
// pocket; on your turn you may drop a pocket piece on any empty square instead of moving
// (pawns never on the first or last rank). A promoted piece goes back to being a pawn
// when captured. The game state beside the FEN: pockets {w:{p,n,b,r,q}, b:{…}} and the
// squares holding promoted pieces. Checkmate counts drops: a check you can block by
// dropping a piece is not mate. Repetition and the 50-move rule aren't used.

export const ZH_PIECES = ['q', 'r', 'b', 'n', 'p'];
const FILES = 'abcdefgh';
export const emptyPockets = () => ({ w: {}, b: {} });
export function zhState(pockets, promoted) {
  const clean = side => Object.fromEntries(ZH_PIECES.map(t => [t, Math.max(0, Math.min(16, Number(side?.[t] || 0)))]).filter(([, n]) => n > 0));
  return { pockets: { w: clean(pockets?.w), b: clean(pockets?.b) }, promoted: [...new Set((Array.isArray(promoted) ? promoted : []).filter(s => /^[a-h][1-8]$/.test(s)))] };
}
const kingSquare = (c, color) => { for (const row of c.board()) for (const p of row) if (p && p.type === 'k' && p.color === color) return p.square; return null; };
// The FEN after a drop: same castling rights, turn passes, no en passant.
function afterDropFen(fen, color) {
  const [placement, , castling, , half, full] = fen.split(' ');
  return [placement, color === 'w' ? 'b' : 'w', castling || '-', '-', String(Number(half || 0) + 1), String(Number(full || 1) + (color === 'b' ? 1 : 0))].join(' ');
}
function placeAndPass(Chess, fen, color, type, square) {
  const c = new Chess(fen);
  if (c.get(square)) return null;
  if (!c.put({ type, color }, square)) return null;
  const king = kingSquare(c, color);
  if (king && c.isAttacked(king, color === 'w' ? 'b' : 'w')) return null; // can't leave your king in check
  try { return new Chess(afterDropFen(c.fen(), color)); } catch { return null; }
}
// Every legal drop for the side to move: [{drop:'n', to:'f3'}]
export function zhDrops(Chess, c, state) {
  const color = c.turn(), pocket = state.pockets[color] || {}, out = [];
  const types = ZH_PIECES.filter(t => pocket[t] > 0);
  if (!types.length) return out;
  for (let f = 0; f < 8; f++) for (let r = 1; r <= 8; r++) {
    const sq = FILES[f] + r;
    if (c.get(sq)) continue;
    for (const t of types) {
      if (t === 'p' && (r === 1 || r === 8)) continue;
      if (placeAndPass(Chess, c.fen(), color, t, sq)) out.push({ drop: t, to: sq });
    }
  }
  return out;
}
const sanSuffix = (Chess, c, state) => { const s = zhStatus(Chess, c, state); return s.over && s.result !== '1/2-1/2' ? '#' : c.inCheck() ? '+' : ''; };
// Over? {over, status, result, reason}
export function zhStatus(Chess, c, state) {
  if (c.moves().length || zhDrops(Chess, c, state).length) return { over: false, status: 'active', result: '*' };
  if (c.inCheck()) return c.turn() === 'w' ? { over: true, status: 'black_won', result: '0-1', reason: 'checkmate' } : { over: true, status: 'white_won', result: '1-0', reason: 'checkmate' };
  return { over: true, status: 'draw', result: '1/2-1/2', reason: 'stalemate' };
}
// Plays {drop, to} or {from, to, promotion} on (fen, state). Returns {fen, state, move} or null.
export function zhPlay(Chess, fen, state, b) {
  state = zhState(state.pockets, state.promoted);
  const c = new Chess(fen), color = c.turn(), enemy = color === 'w' ? 'b' : 'w';
  if (b.drop) {
    const t = String(b.drop).toLowerCase()[0], to = String(b.to || '');
    if (!ZH_PIECES.includes(t) || !/^[a-h][1-8]$/.test(to) || !(state.pockets[color][t] > 0)) return null;
    if (t === 'p' && (to[1] === '1' || to[1] === '8')) return null;
    const next = placeAndPass(Chess, fen, color, t, to);
    if (!next) return null;
    const pockets = { ...state.pockets, [color]: { ...state.pockets[color], [t]: state.pockets[color][t] - 1 } };
    if (!pockets[color][t]) delete pockets[color][t];
    const ns = { pockets, promoted: state.promoted };
    const san = `${t.toUpperCase()}@${to}`;
    return { fen: next.fen(), state: ns, move: { from: null, to, drop: t, san: san + sanSuffix(Chess, next, ns), lan: `${t.toUpperCase()}@${to}`, color, piece: t, captured: null, promotion: null } };
  }
  let m = null;
  try { m = c.move({ from: String(b.from), to: String(b.to), promotion: String(b.promotion || 'q')[0] }); } catch { m = null; }
  if (!m) return null;
  const pockets = { w: { ...state.pockets.w }, b: { ...state.pockets.b } };
  let promoted = state.promoted.filter(s => s !== m.to);
  if (m.captured) {
    const capturedSq = m.flags.includes('e') ? m.to[0] + m.from[1] : m.to;
    const type = state.promoted.includes(capturedSq) ? 'p' : m.captured;
    pockets[color][type] = (pockets[color][type] || 0) + 1;
  }
  if (state.promoted.includes(m.from)) promoted = [...promoted.filter(s => s !== m.from), m.to];
  if (m.promotion) promoted = [...promoted, m.to];
  const ns = { pockets, promoted: [...new Set(promoted)] };
  const san = m.san.replace(/[+#]$/, '') + sanSuffix(Chess, c, ns);
  return { fen: c.fen(), state: ns, move: { from: m.from, to: m.to, san, lan: m.lan, color, piece: m.piece, captured: m.captured || null, promotion: m.promotion || null, flags: m.flags, enemy } };
}
// Replays records ({san, from, to, promotion, drop}) from the start: {chess, state, positions}.
export function zhReplay(Chess, records = [], startFen) {
  let fen = startFen || new Chess().fen(), state = { pockets: emptyPockets(), promoted: [] };
  const positions = [fen];
  for (const r of records) {
    const out = zhPlay(Chess, fen, state, r.drop ? { drop: r.drop, to: r.to } : { from: r.from, to: r.to, promotion: r.promotion || undefined });
    if (!out) break;
    fen = out.fen; state = out.state; positions.push(fen);
  }
  return { chess: new Chess(fen), state, positions };
}
