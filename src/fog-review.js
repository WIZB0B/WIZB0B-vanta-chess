// Fog-aware game review for Vanta Dark and Blackout Blitz (round 13).
//
// The engine that reviews a finished game sees the whole board. In the fog modes the player who
// moved did not, so a move that walked into a piece they could not see is not the same mistake
// as one that ignored a piece in plain view. For every costly move (a mistake or worse on the
// real board) the review asks a second question: was it a good move on the board its player
// could know? That board is built the same way the blind computer builds its own
// (src/blind-engine.js):
// - Vanta Dark: your own pieces, the squares they reach and pieces that check you, and enemy
//   pieces where you last saw them (no more of a kind than the enemy can still have).
// - Blackout Blitz: on a blind move, the board as it was when your lights went out plus your
//   own moves since. With the lights on you saw everything, so nothing is excused.
// If the move was the best (or close to it, under 8 points of winning chances) on that board,
// it is "Ambushed": the cost is shown, but your accuracy counts the move as you could judge it.
// This is VCH's own method; there is no published standard for reviewing hidden-information
// chess.
import { beliefFen, blackoutBelief, capturedBy, lookAround, sharedMoves, startMemory } from './blind-engine.js';
import { inBlackout } from './blackout.js';

export const FOG_REVIEW_VARIANTS = new Set(['dark', 'blackout']);
// A real-board loss at least this big (a mistake, in winning-chance points) is worth a second look.
export const AMBUSH_MIN_LOSS = 15;
// On the board the player could know, a move losing less than this (an inaccuracy) was sound.
export const AMBUSH_MAX_BELIEF_LOSS = 8;

const uciOf = m => `${m.from}${m.to}${m.promotion || ''}`;

// For each move i (made from positions[i]), the board its player could know:
//   {fen, searchmoves} — searchmoves are the moves legal both there and on the real board —
// or null when they saw the whole board (Blackout with the lights on) or no sound board could
// be made. `moves` are chess.js verbose moves (color, from, to, captured, flags, promotion).
export function fogBeliefs(Chess, positions = [], moves = [], variant = 'dark') {
  if (!FOG_REVIEW_VARIANTS.has(variant)) return moves.map(() => null);
  const out = [];
  if (variant === 'dark') {
    const memory = { w: null, b: null };
    moves.forEach((move, i) => {
      const color = move.color, real = positions[i];
      try {
        memory[color] ||= startMemory(Chess, positions[0], color);
        const look = lookAround(Chess, real, color, memory[color], { turn: i, captured: capturedBy(moves.slice(0, i), color) });
        memory[color] = look.memory;
        const fen = beliefFen(Chess, real, color, new Map([...look.memory].map(([sq, p]) => [sq, { type: p.type }])), { seen: look.seen });
        out.push(fen ? { fen, searchmoves: sharedMoves(Chess, real, fen) } : null);
      } catch { out.push(null); }
    });
    return out;
  }
  // Blackout Blitz.
  const snapshot = { w: null, b: null }, count = { w: 0, b: 0 };
  moves.forEach((move, i) => {
    const color = move.color, real = positions[i];
    const blind = inBlackout(count[color]);
    count[color]++;
    if (!blind) { snapshot[color] = { fen: real, at: i }; out.push(null); return; }
    try {
      const snap = snapshot[color] || { fen: real, at: i };
      const own = moves.slice(snap.at, i).filter(m => m.color === color);
      const fen = blackoutBelief(Chess, snap.fen, own, real, color);
      out.push(fen ? { fen, searchmoves: sharedMoves(Chess, real, fen) } : null);
    } catch { out.push(null); }
  });
  return out;
}

// The played move on the believed board: the FEN after it, or null when it is not legal there
// (it only worked because of a piece the player could not have known about).
export function beliefAfter(Chess, beliefFenText, move) {
  try {
    const c = new Chess(beliefFenText);
    const made = c.move({ from: move.from, to: move.to, promotion: move.promotion || undefined });
    return made ? c.fen() : null;
  } catch { return null; }
}

// Was this costly move an ambush? realLoss/beliefLoss are winning-chance points lost on the real
// and on the believed board; played and beliefBest are UCI.
export function isAmbush({ realLoss = 0, beliefLoss = null, played = '', beliefBest = '' } = {}) {
  if (!(Number(realLoss) >= AMBUSH_MIN_LOSS)) return false;
  if (played && beliefBest && String(played).toLowerCase() === String(beliefBest).toLowerCase()) return true;
  return beliefLoss != null && Number.isFinite(Number(beliefLoss)) && Number(beliefLoss) < AMBUSH_MAX_BELIEF_LOSS;
}

export { uciOf as fogUci };
