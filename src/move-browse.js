import { Chess } from 'chess.js';

// Looking back through a game without taking anything back (chess.com's arrows). The board
// shows an earlier position; moves can't be made from it, and any new move (yours or the
// opponent's) brings the board back to the live position.

// Positions after each move of `records` (SAN or {from,to,promotion}); positions[0] is the
// start. If the live position is further along than the records (a move still on its way to
// the server), it is added as the last position.
export function browseLine(records = [], liveFen = null, startFen = undefined) {
  const position = startFen ? new Chess(startFen) : new Chess(), positions = [position.fen()], moves = [];
  for (const record of records) {
    let made = null;
    try {
      made = typeof record === 'string' ? position.move(record)
        : record?.from && record?.to ? position.move({ from: record.from, to: record.to, promotion: record.promotion || undefined })
        : position.move(record?.san || record?.lan || '');
    } catch {}
    if (!made) break;
    moves.push({ from: made.from, to: made.to, san: made.san, color: made.color, piece: made.piece, captured: made.captured || null });
    positions.push(position.fen());
  }
  const placement = fen => String(fen || '').split(' ')[0];
  if (liveFen && placement(positions.at(-1)) !== placement(liveFen)) {
    positions.push(liveFen); moves.push(null);
  }
  return { positions, moves };
}

// The ply to show after a step. `null` means "live" (the last position).
export function browseStep(current, delta, last) {
  const from = current ?? last;
  const next = Math.max(0, Math.min(last, from + delta));
  return next >= last ? null : next;
}
export function browseTo(target, last) {
  const ply = Math.max(0, Math.min(last, Number(target) || 0));
  return ply >= last ? null : ply;
}

// Undo against the computer: on your turn the engine already replied, so take back its reply
// and your move; while it is thinking, take back just your move.
export function undoPlies(turn, playerColor, historyLength) {
  if (!historyLength) return 0;
  if (turn === playerColor) return historyLength >= 2 ? 2 : 0; // never undo the engine's opening move alone
  return 1;
}
