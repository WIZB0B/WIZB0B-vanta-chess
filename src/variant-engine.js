// Helpers for the multi-variant Stockfish worker (/variant.worker.js): Crazyhouse positions in
// the engine's FEN, engine moves back into board moves, a finished game's positions for review,
// and the computer's strength. Pure functions: no DOM, no worker.
//
// Engine FEN: the chess FEN with the holdings in brackets right after the piece placement
// (White's upper case, then Black's lower case, each in QRBNP order; "[]" when both are empty)
// and "~" after every promoted piece, which goes back to being a pawn when captured:
//   "5Q~1k/8/8/8/8/8/8/K7[NPPr] b - - 0 1"
// Engine moves are UCI: "e2e4", "e7e8q", and drops as "N@f3" (upper case for either colour).
import { zhPlay, zhState, emptyPockets } from './crazyhouse.js';

export const VARIANT_WORKER_URL = '/variant.worker.js';
const HAND_ORDER = ['q', 'r', 'b', 'n', 'p'];
const FILES = 'abcdefgh';

const expandRank = rank => {
  const out = [];
  for (const ch of rank) if (/[1-8]/.test(ch)) for (let i = 0; i < Number(ch); i++) out.push(null); else if (ch !== '~') out.push(ch);
  return out;
};
const compressRank = cells => {
  let out = '', empty = 0;
  for (const cell of cells) { if (!cell) { empty++; continue; } if (empty) { out += empty; empty = 0; } out += cell; }
  return out + (empty || '');
};
const holdings = pockets => HAND_ORDER.map(t => t.toUpperCase().repeat(pockets.w[t] || 0)).join('')
  + HAND_ORDER.map(t => t.repeat(pockets.b[t] || 0)).join('');

// chess.js FEN + {pockets:{w:{p,n,b,r,q}, b:{…}}, promoted:[squares]} → engine FEN.
// VCH's Crazyhouse has no 50-move rule (crazyhouse.js), so the halfmove clock is sent as 0 and
// the engine never scores a 50-move draw.
export function zhFen(fen, state = {}) {
  const fields = String(fen || '').trim().split(/\s+/);
  if (fields.length !== 6) throw new Error('zhFen expects a six-field FEN');
  const [placement, turn, castling, ep, , fullmove] = fields;
  const { pockets, promoted } = zhState(state.pockets, state.promoted);
  const ranks = placement.replace(/\[.*\]$/, '').split('/');
  if (ranks.length !== 8) throw new Error('zhFen expects eight ranks');
  const marked = ranks.map((rank, r) => compressRank(expandRank(rank).map((piece, f) =>
    piece && /[qrbn]/i.test(piece) && promoted.includes(FILES[f] + (8 - r)) ? `${piece}~` : piece)));
  return `${marked.join('/')}[${holdings(pockets)}] ${turn} ${castling} ${ep} 0 ${fullmove}`;
}

// Engine FEN → {fen, state} (the chess.js FEN and the Crazyhouse state beside it).
export function parseZhFen(zhfen) {
  const fields = String(zhfen || '').trim().split(/\s+/);
  const match = /^([^[]+)(?:\[([QRBNPqrbnp]*)\])?$/.exec(fields[0] || '');
  if (fields.length !== 6 || !match) throw new Error('parseZhFen expects a six-field FEN');
  const ranks = match[1].split('/');
  const promoted = [];
  ranks.forEach((rank, r) => {
    let f = 0;
    for (let i = 0; i < rank.length; i++) {
      const ch = rank[i];
      if (/[1-8]/.test(ch)) f += Number(ch);
      else if (ch === '~') promoted.push(FILES[f - 1] + (8 - r));
      else f++;
    }
  });
  const pockets = emptyPockets();
  for (const ch of match[2] || '') { const side = ch === ch.toUpperCase() ? 'w' : 'b', t = ch.toLowerCase(); pockets[side][t] = (pockets[side][t] || 0) + 1; }
  return { fen: [match[1].replace(/~/g, ''), ...fields.slice(1)].join(' '), state: zhState(pockets, promoted) };
}

// 'e2e4' / 'e7e8q' → {from, to} (+ promotion); 'N@f3' → {drop:'n', to:'f3'}; anything else
// ('(none)', '0000', junk) → null. Legality is zhPlay's job.
export function parseUciMove(uci) {
  const text = String(uci ?? '').trim();
  let m = /^([PNBRQpnbrq])@([a-h][1-8])$/.exec(text);
  if (m) return { drop: m[1].toLowerCase(), to: m[2] };
  m = /^([a-h][1-8])([a-h][1-8])([qrbnQRBN])?$/.exec(text);
  if (!m) return null;
  return m[3] ? { from: m[1], to: m[2], promotion: m[3].toLowerCase() } : { from: m[1], to: m[2] };
}

// Plays engine moves (a bestmove or a pv) from a Crazyhouse position, for display:
// [{uci, san, fen, state}], stopping at the first move that is not legal there.
export function zhLine(Chess, fen, state, ucis = []) {
  const out = [];
  let position = { fen, state: zhState(state?.pockets, state?.promoted) };
  for (const uci of ucis) {
    const move = parseUciMove(uci);
    const next = move && zhPlay(Chess, position.fen, position.state, move);
    if (!next) break;
    position = { fen: next.fen, state: next.state };
    out.push({ uci: String(uci), san: next.move.san, fen: next.fen, state: next.state });
  }
  return out;
}

// A finished Crazyhouse game, move by move, for review. records are the game's moves
// ({san, from, to, promotion, drop}) as zhReplay takes them. Returns one entry per position:
//   {ply, fen, engineFen, turn, state, move}
// where move is null for the start and otherwise {san, uci, from, to, drop, color} of the move
// that led there. Replay stops at the first record that is not legal (like zhReplay), so a
// shorter list than records.length + 1 means the record is broken there.
export function zhReviewPositions(Chess, records = [], startFen) {
  let fen = startFen || new Chess().fen(), state = { pockets: emptyPockets(), promoted: [] };
  const entry = (ply, move) => ({ ply, fen, engineFen: zhFen(fen, state), turn: fen.split(' ')[1], state, move });
  const positions = [entry(0, null)];
  for (const r of records) {
    const out = zhPlay(Chess, fen, state, r.drop ? { drop: r.drop, to: r.to } : { from: r.from, to: r.to, promotion: r.promotion || undefined });
    if (!out) break;
    fen = out.fen; state = out.state;
    const m = out.move;
    positions.push(entry(positions.length, { san: m.san, uci: m.lan, from: m.from, to: m.to, drop: m.drop || null, color: m.color }));
  }
  return positions;
}

// An archived Crazyhouse game keeps only its SAN list ("e4", "Nxd5", "N@f3+"). This turns it
// back into records zhReviewPositions takes: {records, fen, state} with records
// [{san, from, to, drop, color, …}], stopping at the first move that is not legal.
export function zhRecordsFromSans(Chess, sans = [], startFen) {
  let fen = startFen || new Chess().fen(), state = { pockets: emptyPockets(), promoted: [] };
  const records = [];
  for (const raw of Array.isArray(sans) ? sans : []) {
    const san = String(raw || '').trim().replace(/[+#?!]+$/, '');
    const drop = /^([PNBRQ])@([a-h][1-8])$/i.exec(san);
    let move = null;
    if (drop) move = { drop: drop[1].toLowerCase(), to: drop[2] };
    else {
      try { const m = new Chess(fen).move(san); move = m ? { from: m.from, to: m.to, promotion: m.promotion || undefined } : null; } catch { move = null; }
    }
    const next = move && zhPlay(Chess, fen, state, move);
    if (!next) break;
    fen = next.fen; state = next.state;
    records.push(next.move);
  }
  return { records, fen, state };
}

// Crazyhouse computer levels: [elo, Skill Level 0-20, nodes]. The multi-variant engine has
// Skill Level but no UCI_LimitStrength/UCI_Elo, so these Elo labels are VCH's estimate, not
// calibrated ratings. /variant.worker.js keeps the same table for elo → Skill Level.
export const ZH_BOT_LEVELS = Object.freeze([
  [800, 0, 400], [1000, 2, 1000], [1200, 4, 3000], [1400, 7, 8000], [1600, 10, 20000],
  [1800, 13, 50000], [2000, 16, 100000], [2200, 20, 200000], [2500, 20, 500000], [2800, 20, 1000000],
].map(level => Object.freeze(level)));

// The strongest level at or below elo: {elo, skill, nodes}. Send it as
// {mode:'bot', variant:'crazyhouse', fen, elo, nodes} to /variant.worker.js.
export function zhBotStrength(elo) {
  const value = Number.isFinite(Number(elo)) ? Math.round(Number(elo)) : 1500;
  let level = ZH_BOT_LEVELS[0];
  for (const entry of ZH_BOT_LEVELS) if (value >= entry[0]) level = entry;
  return { elo: level[0], skill: level[1], nodes: level[2] };
}
