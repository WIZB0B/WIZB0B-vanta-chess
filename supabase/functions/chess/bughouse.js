// Vanta Bughouse: two against two on two boards. Team one is White on board A and Black on
// board B; team two is Black on A and White on B. A piece you capture goes to your partner,
// who plays the other colour on the other board, so it arrives ready to drop. Moves and drops
// follow Crazyhouse (crazyhouse.js), with two differences:
// - Mate: a check you could block by dropping a piece (now, or once your partner sends one)
//   is not mate. Only a double check, or a check from a knight, a pawn or an adjacent piece,
//   with no move or drop to escape it, is mate.
// - Nobody is ever stalemated: with no move to make you wait for a piece (your clock runs).
// The first board to finish decides the match for both teams. Shared by the chess function and
// the browser (src/bughouse.js re-exports it).
import { zhStatus } from './crazyhouse.js';

export const BUGHOUSE_SEATS = ['aw', 'ab', 'bw', 'bb'];
export const BUGHOUSE_DEFAULT_SECONDS = 180;
export const seatOf = (board, color) => `${board}${color}`;
export const teamOfSeat = seat => (seat === 'aw' || seat === 'bb' ? 1 : 2);
export const partnerSeat = seat => ({ aw: 'bb', bb: 'aw', ab: 'bw', bw: 'ab' })[seat] || null;
export const otherBoard = board => (board === 'a' ? 'b' : 'a');
export const other = color => (color === 'w' ? 'b' : 'w');
export const isSeat = seat => BUGHOUSE_SEATS.includes(seat);

// What a move does to the pockets. Crazyhouse puts a captured piece in the mover's own pocket;
// in Bughouse it goes to the partner instead. Returns the mover's spent drop (or null) and the
// gift for the partner's board ({board, color, piece}, or null).
export function bughouseTransfer(board, color, before, after) {
  const was = before?.pockets?.[color] || {}, now = after?.pockets?.[color] || {};
  let spent = null, gained = null;
  for (const t of ['q', 'r', 'b', 'n', 'p']) {
    const d = Number(now[t] || 0) - Number(was[t] || 0);
    if (d < 0) spent = t;
    if (d > 0) gained = t;
  }
  return { spent, gift: gained ? { board: otherBoard(board), color: other(color), piece: gained } : null };
}

const kingSquare = (c, color) => { for (const row of c.board()) for (const p of row) if (p && p.type === 'k' && p.color === color) return p.square; return null; };
const FILES = 'abcdefgh';
const between = (a, b) => {
  const fa = FILES.indexOf(a[0]), ra = Number(a[1]), fb = FILES.indexOf(b[0]), rb = Number(b[1]);
  const df = Math.sign(fb - fa), dr = Math.sign(rb - ra), out = [];
  if (!(fa === fb || ra === rb || Math.abs(fb - fa) === Math.abs(rb - ra))) return out;
  for (let f = fa + df, r = ra + dr; f !== fb || r !== rb; f += df, r += dr) out.push(FILES[f] + r);
  return out;
};
// Could a dropped piece ever block this check? (single check from a distance)
export function checkIsBlockable(c) {
  if (!c.inCheck()) return false;
  const color = c.turn(), king = kingSquare(c, color);
  if (!king) return false;
  const checkers = c.attackers(king, other(color));
  if (checkers.length !== 1) return false;
  const piece = c.get(checkers[0]);
  if (!piece || piece.type === 'n' || piece.type === 'p') return false;
  return between(checkers[0], king).length > 0;
}
// Over? {over, status, result, reason}. "Waiting" (no move now, but not lost) is not over.
export function bughouseStatus(Chess, c, state) {
  const zh = zhStatus(Chess, c, state);
  if (!zh.over) return zh;
  if (!c.inCheck() || checkIsBlockable(c)) return { over: false, status: 'active', result: '*', waiting: true };
  return zh;
}
// The whole match from the board that just finished. `result` is that board's result.
export function matchWinner(board, result) {
  if (result === '1/2-1/2') return 'draw';
  if (result !== '1-0' && result !== '0-1') return null;
  const winnerColor = result === '1-0' ? 'w' : 'b';
  return teamOfSeat(seatOf(board, winnerColor)) === 1 ? 'team1' : 'team2';
}
// The other board's result for a match winner.
export function boardResultFor(board, winner) {
  if (winner === 'draw') return { status: 'draw', result: '1/2-1/2' };
  const whiteTeam = teamOfSeat(seatOf(board, 'w')) === 1 ? 'team1' : 'team2';
  return whiteTeam === winner ? { status: 'white_won', result: '1-0' } : { status: 'black_won', result: '0-1' };
}
