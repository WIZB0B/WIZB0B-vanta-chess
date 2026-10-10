import { Chess } from 'chess.js';

// Why a move the player tried is not allowed, so the board can say so:
//   'check'  their king is in check and this move doesn't answer it  -> flash the king
//   'king'   the king would step onto an attacked square               -> flash the king
//   'pin'    the piece is pinned: moving it would expose the king       -> flash the king
//   'rule'   the piece simply can't move there                          -> sound only
// Returns null when `from` holds no piece or the move is in fact legal.
export function illegalReason(chess, from, to) {
  const piece = chess.get(from);
  if (!piece || !to || from === to) return null;
  if (chess.moves({ square: from, verbose: true }).some(m => m.to === to)) return null;
  const enemy = piece.color === 'w' ? 'b' : 'w';
  const king = kingSquare(chess, piece.color);
  if (chess.inCheck()) return { kind: 'check', king };
  if (piece.type === 'k') return chess.isAttacked(to, enemy) ? { kind: 'king', king: from } : { kind: 'rule', king };
  try {
    const probe = new Chess(chess.fen());
    probe.remove(from);
    if (king && probe.isAttacked(king, enemy)) return { kind: 'pin', king };
  } catch {}
  return { kind: 'rule', king };
}

export function kingSquare(chess, color) {
  for (const row of chess.board()) for (const cell of row) if (cell?.type === 'k' && cell.color === color) return cell.square;
  return null;
}

// The king square flashes for the king-safety reasons only.
export function flashSquareFor(reason) {
  return reason && reason.kind !== 'rule' ? reason.king : null;
}
