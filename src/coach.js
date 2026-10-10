import { Chess } from 'chess.js';

// Coach mode (games against the computer only): after your move, a plain-language note on
// what the engine's choice was doing. The words come from the move itself (captures,
// checks, development, the centre, castling, threats), not from a script.

const NAMES = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
const CENTER = new Set(['d4', 'e4', 'd5', 'e5']);
const uciMove = (c, uci) => { try { return c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || undefined }); } catch { return null; } };

// Enemy pieces the moved piece attacks from its new square (as if it could move again).
function attackedBy(fenAfter, square, color) {
  const parts = fenAfter.split(' ');
  parts[1] = color; parts[3] = '-';
  let c; try { c = new Chess(parts.join(' ')); } catch { return []; }
  return c.moves({ square, verbose: true }).filter(m => m.captured).map(m => m.captured);
}

// What a move does, as short phrases ("wins a knight", "gives check").
export function describeMove(fen, uci) {
  const c = new Chess(fen), m = uciMove(c, uci);
  if (!m) return { san: uci, phrases: [] };
  const phrases = [];
  if (c.isCheckmate()) phrases.push('is checkmate');
  else if (c.inCheck()) phrases.push('gives check');
  if (m.captured) phrases.push(`wins ${m.captured === 'p' ? 'a pawn' : `the ${NAMES[m.captured]}`}`);
  if (m.flags.includes('k') || m.flags.includes('q')) phrases.push('castles the king to safety');
  if (m.promotion) phrases.push(`makes a new ${NAMES[m.promotion]}`);
  const moveNo = Number(fen.split(' ')[5]) || 1;
  if ((m.piece === 'n' || m.piece === 'b') && (m.from[1] === '1' || m.from[1] === '8') && moveNo <= 14) phrases.push('develops a piece');
  if (m.piece === 'p' && CENTER.has(m.to)) phrases.push('claims the centre');
  const targets = attackedBy(c.fen(), m.to, m.color).filter(t => t !== 'k' && VALUE[t] >= VALUE[m.piece] && VALUE[t] >= 3);
  if (targets.length >= 2) phrases.push(`attacks the ${NAMES[targets[0]]} and the ${NAMES[targets[1]]} at once`);
  else if (targets.length === 1 && !m.captured) phrases.push(`attacks the ${NAMES[targets[0]]}`);
  return { san: m.san, phrases: [...new Set(phrases)].slice(0, 3) };
}
const join = list => (list.length <= 1 ? list.join('') : `${list.slice(0, -1).join(', ')} and ${list.at(-1)}`);

// The coach's note. classification: from review.js classifyMove.
export function coachNote({ fenBefore, playedUci, playedSan, bestUci, classification, fenAfter = null, replyUci = null }) {
  const good = ['brilliant', 'great', 'best', 'excellent', 'good', 'book'].includes(classification) || playedUci === bestUci;
  const played = describeMove(fenBefore, playedUci);
  if (good) {
    const why = played.phrases.length ? ` It ${join(played.phrases)}.` : '';
    return { tone: 'good', title: playedUci === bestUci ? `${playedSan} · the engine's choice` : `${playedSan} · good move`, text: `Well played.${why}` };
  }
  const best = describeMove(fenBefore, bestUci);
  let text = `${best.san} was stronger${best.phrases.length ? `: it ${join(best.phrases)}` : ''}.`;
  if (fenAfter && replyUci) {
    const reply = describeMove(fenAfter, replyUci);
    if (reply.phrases.some(p => p.startsWith('wins') || p === 'is checkmate' || p === 'gives check')) text += ` After ${playedSan}, ${reply.san} ${join(reply.phrases.filter(p => p.startsWith('wins') || p === 'is checkmate' || p === 'gives check'))}.`;
  }
  const label = { inaccuracy: 'Inaccuracy', mistake: 'Mistake', miss: 'Missed chance', blunder: 'Blunder' }[classification] || 'Not the best';
  return { tone: classification === 'blunder' ? 'bad' : 'warn', title: `${playedSan} · ${label}`, text, best: bestUci };
}
