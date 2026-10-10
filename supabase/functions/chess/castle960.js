// Chess960 castling on top of chess.js (which only knows standard castling).
// Freestyle positions are stored with the FEN castling field "-" so chess.js never castles
// by itself; the rights live beside the game as rook files, Shredder style: "HAha" means
// White may castle with the rooks on h1 and a1, Black with h8 and a8.
// After castling, king and rook stand where they would in standard chess: O-O puts the
// king on g and the rook on f; O-O-O puts the king on c and the rook on d. Every square
// between the king, the rook and their destinations must be empty (apart from those two),
// the king may not be in check, and no square the king crosses (or lands on) may be attacked.

const FILES = 'abcdefgh';
const fileIdx = f => FILES.indexOf(f);
const sq = (fi, rank) => FILES[fi] + rank;

// Board helpers on the FEN placement field: 64 cells, a8 first.
function cells(fen) {
  const out = [];
  for (const row of String(fen).split(' ')[0].split('/')) for (const ch of row) {
    if (/\d/.test(ch)) for (let i = 0; i < Number(ch); i++) out.push(null); else out.push(ch);
  }
  return out;
}
const indexOf = square => (8 - Number(square[1])) * 8 + fileIdx(square[0]);
function placement(c) {
  const rows = [];
  for (let r = 0; r < 8; r++) {
    let row = '', empty = 0;
    for (let f = 0; f < 8; f++) { const p = c[r * 8 + f]; if (!p) empty++; else { if (empty) row += empty; empty = 0; row += p; } }
    if (empty) row += empty;
    rows.push(row);
  }
  return rows.join('/');
}

// Rights from a start position: every rook on the back rank, either side of the king.
export function initialRights(fen) {
  const c = cells(fen); let out = '';
  for (const [color, rank, rook, king] of [['w', '1', 'R', 'K'], ['b', '8', 'r', 'k']]) {
    const row = FILES.split('').map(f => c[indexOf(f + rank)]);
    const k = row.indexOf(king); if (k < 0) continue;
    const files = row.map((p, i) => (p === rook ? FILES[i] : null)).filter(Boolean).filter(f => f !== FILES[k]);
    const left = files.filter(f => fileIdx(f) < k), right = files.filter(f => fileIdx(f) > k);
    const pick = [right.at(-1), left[0]].filter(Boolean); // outermost rooks
    out += pick.map(f => (color === 'w' ? f.toUpperCase() : f)).join('');
  }
  return out || '-';
}
const rightsFor = (rights, color) => String(rights || '').split('').filter(ch => (color === 'w' ? /[A-H]/ : /[a-h]/).test(ch)).map(ch => ch.toLowerCase());
const withoutColor = (rights, color) => String(rights || '').split('').filter(ch => !(color === 'w' ? /[A-H]/ : /[a-h]/).test(ch)).join('') || '-';
const withoutFile = (rights, color, file) => String(rights || '').split('').filter(ch => ch !== (color === 'w' ? file.toUpperCase() : file)).join('') || '-';

// Legal castles for the side to move. `c` is a chess.js instance on the current position;
// `Chess` builds scratch boards for the attack test.
export function castleOptions(c, rights, Chess) {
  const color = c.turn(), enemy = color === 'w' ? 'b' : 'w', rank = color === 'w' ? '1' : '8';
  if (c.inCheck()) return [];
  const board = cells(c.fen()), kingCh = color === 'w' ? 'K' : 'k', rookCh = color === 'w' ? 'R' : 'r';
  const kf = FILES.split('').findIndex(f => board[indexOf(f + rank)] === kingCh);
  if (kf < 0) return [];
  const out = [];
  for (const file of rightsFor(rights, color)) {
    const rf = fileIdx(file);
    if (board[indexOf(file + rank)] !== rookCh || rf === kf) continue;
    const side = rf > kf ? 'O-O' : 'O-O-O', kt = side === 'O-O' ? 6 : 2, rt = side === 'O-O' ? 5 : 3;
    const lo = Math.min(kf, rf, kt, rt), hi = Math.max(kf, rf, kt, rt);
    let clear = true;
    for (let f = lo; f <= hi; f++) if (f !== kf && f !== rf && board[indexOf(sq(f, rank))]) clear = false;
    if (!clear) continue;
    // Attack test with king and rook lifted off the board, so neither shields a square.
    const scratch = new Chess(c.fen());
    scratch.remove(sq(kf, rank)); scratch.remove(sq(rf, rank));
    let safe = true;
    for (let f = Math.min(kf, kt); f <= Math.max(kf, kt); f++) if (scratch.isAttacked(sq(f, rank), enemy)) safe = false;
    if (!safe) continue;
    out.push({ san: side, color, kingFrom: sq(kf, rank), kingTo: sq(kt, rank), rookFrom: sq(rf, rank), rookTo: sq(rt, rank) });
  }
  return out;
}

// The position after castling (FEN castling field stays "-").
export function applyCastle(fen, opt) {
  const parts = String(fen).split(' '), c = cells(fen);
  const king = c[indexOf(opt.kingFrom)], rook = c[indexOf(opt.rookFrom)];
  c[indexOf(opt.kingFrom)] = null; c[indexOf(opt.rookFrom)] = null;
  c[indexOf(opt.kingTo)] = king; c[indexOf(opt.rookTo)] = rook;
  const turn = parts[1] === 'w' ? 'b' : 'w', half = Number(parts[4] || 0) + 1, full = Number(parts[5] || 1) + (parts[1] === 'b' ? 1 : 0);
  return `${placement(c)} ${turn} - - ${half} ${full}`;
}

// Rights after an ordinary chess.js move (verbose move object).
export function rightsAfterMove(rights, m) {
  let r = String(rights || '-');
  if (r === '-') return r;
  const back = m.color === 'w' ? '1' : '8', enemyBack = m.color === 'w' ? '8' : '1', enemy = m.color === 'w' ? 'b' : 'w';
  if (m.piece === 'k') r = withoutColor(r, m.color);
  if (m.piece === 'r' && m.from[1] === back) r = withoutFile(r, m.color, m.from[0]);
  if (m.captured === 'r' && m.to[1] === enemyBack) r = withoutFile(r, enemy, m.to[0]);
  return r;
}
export function rightsAfterCastle(rights, color) { return withoutColor(rights, color); }

// The castle a click or drag means: king onto its own castling rook, or king onto the
// king's destination square (g or c file) when that is unambiguous.
export function castleForMove(options, from, to) {
  return options.find(o => o.kingFrom === from && (o.rookFrom === to || (o.kingTo === to && o.kingTo !== o.kingFrom))) || null;
}

// Replays a game from its start, castles included. Records are SAN strings or
// {san, from, to, promotion}. Returns the positions (FEN after each ply), the chess.js
// moves (castles as {san, color, from, to, castle:true}) and the final rights.
export function replay960(Chess, startFen, records = [], rights = initialRights(startFen)) {
  let c = new Chess(startFen);
  const positions = [c.fen()], moves = [];
  for (const rec of records) {
    const san = typeof rec === 'string' ? rec : rec?.san || '';
    if (/^O-O(-O)?[+#]?$/.test(san) || rec?.castle) {
      const side = san.startsWith('O-O-O') ? 'O-O-O' : 'O-O';
      const opt = castleOptions(c, rights, Chess).find(o => o.san === side);
      if (!opt) break;
      const color = c.turn();
      c = new Chess(applyCastle(c.fen(), opt)); rights = rightsAfterCastle(rights, color);
      moves.push({ san: side + (c.isCheckmate() ? '#' : c.inCheck() ? '+' : ''), color, from: opt.kingFrom, to: opt.kingTo, piece: 'k', castle: true, rookFrom: opt.rookFrom, rookTo: opt.rookTo });
    } else {
      let m = null;
      try { m = typeof rec === 'string' ? c.move(rec) : rec?.from && rec?.to ? c.move({ from: rec.from, to: rec.to, promotion: rec.promotion || undefined }) : c.move(san); } catch {}
      if (!m) break;
      rights = rightsAfterMove(rights, m);
      moves.push(m);
    }
    positions.push(c.fen());
  }
  return { chess: c, positions, moves, rights };
}
