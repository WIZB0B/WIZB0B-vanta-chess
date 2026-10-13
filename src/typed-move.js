// Move by typing: "Nf3", "nf3", "exd5", "e2e4", "e7e8q", "O-O", "0-0-0", "e8=Q".
// Returns {move} (a chess.js verbose move from the legal list) or {error}.
// A lowercase "b" is read as a pawn on the b-file first ("bxc3"), then as a bishop ("bc4").

const strip = s => String(s || '').replace(/[+#!?\s]/g, '');
const key = san => strip(san).replace(/[x=:-]/g, '');

export function resolveTypedMove(chess, text) {
  const raw = strip(text);
  if (!raw) return { error: 'empty' };
  const legal = chess.moves({ verbose: true });
  // Castling, with O or zero.
  const castle = /^[oO0]-?[oO0](-?[oO0])?$/.exec(raw);
  if (castle) {
    const san = castle[1] ? 'O-O-O' : 'O-O';
    const move = legal.find(m => strip(m.san) === san);
    return move ? { move } : { error: 'illegal' };
  }
  // Coordinates: e2e4, e2-e4, e7e8q.
  const coord = /^([a-h][1-8])[-x]?([a-h][1-8])=?([qrbnQRBN])?$/.exec(raw);
  if (coord) {
    const [, from, to, promo] = coord;
    const options = legal.filter(m => m.from === from && m.to === to);
    if (!options.length) return { error: 'illegal' };
    const move = options.find(m => m.promotion === (promo || 'q').toLowerCase()) || options[0];
    return { move };
  }
  // SAN, forgiving about case for pieces (except b, tried as a pawn first), x and =.
  const readings = [];
  let readable = false;
  if (/^[nrqk]/.test(raw)) readings.push(raw[0].toUpperCase() + raw.slice(1));
  else if (/^b/.test(raw)) readings.push(raw, 'B' + raw.slice(1));
  else readings.push(raw);
  for (const r of readings) {
    const wanted = key(r).replace(/([a-h][18])([qrbn])$/, (_, sq, p) => sq + p.toUpperCase());
    const exact = legal.filter(m => key(m.san) === wanted);
    if (exact.length === 1) return { move: exact[0] };
    // Over-specified ("Ngf3" when only one knight can go) or missing the promotion piece.
    const parsed = /^([NBRQK])?([a-h])?([1-8])?([a-h][1-8])([NBRQ])?$/.exec(wanted);
    if (!parsed) continue;
    readable = true;
    const [, piece, file, rank, to, promo] = parsed;
    const matches = legal.filter(m => m.to === to && m.piece === (piece || 'P').toLowerCase()
      && (!file || m.from[0] === file) && (!rank || m.from[1] === rank)
      && (!m.promotion || m.promotion === (promo || 'Q').toLowerCase()));
    if (matches.length === 1) return { move: matches[0] };
    if (matches.length > 1) return { error: 'ambiguous' };
  }
  return { error: readable ? 'illegal' : 'unreadable' };
}
