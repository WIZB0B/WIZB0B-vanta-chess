// A fair computer for Vanta Dark and Blackout Blitz: it plays under the same blindness as you.
// The engine is not weakened; it is given the board as it believes it to be.
// - Vanta Dark: it sees its own pieces and the squares they reach (and pieces that check it),
//   and remembers where it last saw each of your pieces. Pieces it can't see stay where it
//   last saw them; it keeps no more of a kind than you can still have.
// - Blackout Blitz: when its own lights go out (the same rhythm as yours: after every four of
//   its moves, two blind ones), it plays from the board as it was when the lights went out,
//   plus its own moves since. Your moves in the dark are unknown to it.
// It then searches only moves that are legal both on the board it believes in and on the real
// board, so it never makes an impossible move and never learns from an illegal one.
import { checkers, visibleSquares } from './vanta-dark.js';
import { inBlackout, myMoveCount } from './blackout.js';

const START_COUNT = { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 };
const other = c => (c === 'w' ? 'b' : 'w');
const near = (a, b) => Math.max(Math.abs(a.charCodeAt(0) - b.charCodeAt(0)), Math.abs(Number(a[1]) - Number(b[1])));

// All pieces of a position: Map square -> {type, color}.
export function piecesOf(Chess, fen) {
  const c = new Chess(fen), out = new Map();
  for (const row of c.board()) for (const p of row) if (p) out.set(p.square, { type: p.type, color: p.color });
  return out;
}
// What `color` remembers about the enemy at the start of a game: everything (the setup is known).
export function startMemory(Chess, fen, color) {
  const mem = new Map();
  for (const [sq, p] of piecesOf(Chess, fen)) if (p.color !== color) mem.set(sq, { type: p.type, age: 0 });
  return mem;
}
// One look at the real board on `color`'s turn: what it sees replaces what it remembered there.
// `captured`: how many of each enemy type `color` has taken (it knows its own captures).
export function lookAround(Chess, realFen, color, memory, { turn = 0, captured = {} } = {}) {
  const c = new Chess(realFen), board = piecesOf(Chess, realFen);
  const seen = visibleSquares(realFen, color, { reveal: c.turn() === color ? checkers(c, color) : [] });
  const mem = new Map(memory), seenNow = {}, fresh = {};
  for (const sq of seen) {
    const p = board.get(sq);
    if (p && p.color !== color) {
      if (memory.get(sq)?.type !== p.type) (fresh[p.type] ||= []).push(sq); // it appeared here: it came from somewhere
      mem.set(sq, { type: p.type, age: turn }); seenNow[p.type] = (seenNow[p.type] || 0) + 1;
    } else mem.delete(sq);
  }
  for (const [sq, p] of board) if (p.color === color) mem.delete(sq); // its own pieces stand there now
  // No more of a kind than the enemy can still have (a piece seen is certain; promotions raise
  // it). When there are too many, the remembered piece nearest to where one just appeared is the
  // one that moved there; otherwise the memory seen longest ago goes first.
  for (const type of Object.keys(START_COUNT)) {
    const bound = Math.max(START_COUNT[type] - (captured[type] || 0), seenNow[type] || 0);
    let unseen = [...mem.entries()].filter(([sq, p]) => p.type === type && !seen.has(sq));
    const arrivals = fresh[type] || [];
    while (unseen.length && unseen.length + (seenNow[type] || 0) > bound) {
      const dist = sq => (arrivals.length ? Math.min(...arrivals.map(a => near(a, sq))) : 0);
      unseen.sort((a, b) => dist(a[0]) - dist(b[0]) || a[1].age - b[1].age);
      mem.delete(unseen.shift()[0]);
    }
  }
  return { memory: mem, seen };
}
const squareName = (f, r) => 'abcdefgh'[f] + (r + 1);
// Builds a legal position for the engine from its own pieces and its beliefs about the enemy.
// Returns a FEN, or null when no sound position can be made.
export function beliefFen(Chess, realFen, color, enemy, { seen = null } = {}) {
  const mine = new Map();
  for (const [sq, p] of piecesOf(Chess, realFen)) if (p.color === color) mine.set(sq, p);
  const theirs = new Map([...enemy].filter(([sq, p]) => !mine.has(sq) && !(p.type === 'p' && /[18]$/.test(sq))));
  // Exactly one enemy king.
  const kings = [...theirs].filter(([, p]) => p.type === 'k');
  for (const [sq] of kings.slice(1)) theirs.delete(sq);
  const parts = realFen.split(' ');
  const build = () => {
    const rows = [];
    for (let r = 7; r >= 0; r--) {
      let row = '', empty = 0;
      for (let f = 0; f < 8; f++) {
        const sq = squareName(f, r), p = mine.get(sq) || theirs.get(sq);
        if (!p) { empty++; continue; }
        if (empty) { row += empty; empty = 0; }
        const color2 = mine.has(sq) ? color : other(color);
        row += color2 === 'w' ? p.type.toUpperCase() : p.type;
      }
      rows.push(row + (empty || ''));
    }
    const rights = String(parts[2] || '-').split('').filter(ch => {
      const white = ch === ch.toUpperCase(), owner = white ? 'w' : 'b', home = white ? '1' : '8', set = owner === color ? mine : theirs;
      const rook = ch.toLowerCase() === 'k' ? 'h' + home : 'a' + home;
      return set.get('e' + home)?.type === 'k' && set.get(rook)?.type === 'r';
    }).join('') || '-';
    const ep = parts[3] && parts[3] !== '-' && (!seen || seen.has(parts[3])) ? parts[3] : '-';
    return `${rows.join('/')} ${color} ${rights} ${ep} ${parts[4] || 0} ${parts[5] || 1}`;
  };
  if (!kings.length) {
    // It lost track of the king entirely: guess the far side of the board, out of its sight.
    const guess = color === 'w' ? 'e8' : 'e1';
    if (!mine.has(guess)) theirs.set(guess, { type: 'k' }); else return null;
  }
  // The enemy king can't be in check on the engine's turn: if the belief says so, the king has
  // moved. Guess the nearest square it could be on that the engine can't see or attack.
  for (let tries = 0; tries < 2; tries++) {
    let fen = build(), c;
    try { c = new Chess(fen); } catch { return null; }
    const kingSq = [...theirs].find(([, p]) => p.type === 'k')?.[0];
    if (!kingSq) return null;
    if (!c.isAttacked(kingSq, color)) return c.moves().length ? fen : null;
    theirs.delete(kingSq);
    const options = [];
    for (let f = 0; f < 8; f++) for (let r = 0; r < 8; r++) {
      const sq = squareName(f, r);
      if (mine.has(sq) || theirs.has(sq) || (seen && seen.has(sq))) continue;
      options.push(sq);
    }
    options.sort((a, b) => near(a, kingSq) - near(b, kingSq));
    let placed = false;
    for (const sq of options) {
      theirs.set(sq, { type: 'k' });
      try { const t = new Chess(build()); if (!t.isAttacked(sq, color)) { placed = true; break; } } catch {}
      theirs.delete(sq);
    }
    if (!placed) return null;
  }
  try { const fen = build(), c = new Chess(fen); return c.moves().length ? fen : null; } catch { return null; }
}
const uciOf = m => m.from + m.to + (m.promotion || '');
// Moves the engine may choose: legal on the real board and on the board it believes in.
export function sharedMoves(Chess, realFen, believedFen) {
  const real = new Chess(realFen).moves({ verbose: true }).map(uciOf);
  if (!believedFen) return real;
  let believed;
  try { believed = new Set(new Chess(believedFen).moves({ verbose: true }).map(uciOf)); } catch { return real; }
  const both = real.filter(m => believed.has(m));
  return both.length ? both : real;
}
// Blackout: the board the engine remembers from when its lights went out, plus its own moves.
export function blackoutBelief(Chess, snapshotFen, ownMoves, realFen, color) {
  const enemy = new Map();
  for (const [sq, p] of piecesOf(Chess, snapshotFen)) if (p.color !== color) enemy.set(sq, p);
  // Its own moves since then: whatever it captured is gone. It knows where its own pieces are
  // (it moved them); your pieces stay where they were when its lights went out.
  for (const m of ownMoves) { enemy.delete(m.to); if (m.flags?.includes('e')) enemy.delete(m.to[0] + m.from[1]); }
  return beliefFen(Chess, realFen, color, enemy);
}
// Is the engine (playing `color`) blind on this move in Blackout Blitz?
export function engineBlind(history, color) { return inBlackout(myMoveCount(history, color)); }
// Enemy pieces `color` has captured so far, by type (from verbose history).
export function capturedBy(history, color) {
  const out = {};
  for (const m of history) if (m.color === color && m.captured) out[m.captured] = (out[m.captured] || 0) + 1;
  return out;
}
