// Online Vanta Dark and Blackout Blitz (round 13): what each player may see of a live game.
// The server keeps the real game; every response and broadcast for a seat goes through
// viewFor(), so the hidden part of the board never leaves the server while the game is on.
// The whole game shows once it is over. Spectators see nothing until then.
//
// Vanta Dark: you see your own pieces and the squares they could move to (vanta-dark.js);
//   in check, the checking pieces too. The opponent's moves show as hidden in the move list.
//   On your turn the server also sends your legal moves (the board can't work them out
//   without the hidden pieces).
// Blackout Blitz: after every four of your moves your next two are blind (blackout.js): no
//   pieces at all, and the move list stops where your lights went out. Your moves are
//   checked by the server; there is no legal-move list while it is dark.
import { checkers, visibleSquares } from './vanta-dark.js';
import { BLACKOUT_EVERY, blindMovesLeft, inBlackout, movesUntilBlackout } from './blackout.js';

export const FOG_VARIANTS = new Set(['dark', 'blackout']);
export const isFogVariant = variant => FOG_VARIANTS.has(variant);
const FILES = 'abcdefgh';
const CYCLE = BLACKOUT_EVERY + 2;

// The placement with the enemy pieces `seat` can't see taken off.
export function fogFen(fen, seat, seen) {
  const [placement, ...rest] = String(fen || '').split(' ');
  const rows = placement.split('/').map((row, i) => {
    const r = 8 - i; let f = 0, out = '', empty = 0;
    for (const ch of row) {
      if (/\d/.test(ch)) { empty += Number(ch); f += Number(ch); continue; }
      const mine = (ch === ch.toUpperCase() ? 'w' : 'b') === seat, sq = FILES[f] + r;
      if (mine || seen.has(sq)) { if (empty) { out += empty; empty = 0; } out += ch; } else empty++;
      f++;
    }
    return out + (empty || '');
  });
  return [rows.join('/'), ...rest].join(' ');
}
// Moves `seat` has made in a game that started with White to move.
export function movesBy(history, seat) { return history.filter((r, i) => (r?.color || (i % 2 ? 'b' : 'w')) === seat).length; }
// Server-only details and position keys (they encode whole positions) never go to players.
function clean(record) {
  const { k, client_move_at, server_received_at, network_compensation_ms, ...rest } = record || {};
  return rest;
}
const hidden = (record, i) => ({ color: record?.color || (i % 2 ? 'b' : 'w'), hidden: true });
// The ply after which `seat`'s current blackout began (lights out after its BLACKOUT_EVERY-th
// move of the cycle).
export function lightsOutPly(history, seat) {
  const mine = movesBy(history, seat), inCycle = mine % CYCLE;
  if (inCycle < BLACKOUT_EVERY) return history.length;
  const k = mine - (inCycle - BLACKOUT_EVERY); // its move count when the lights went out
  let count = 0;
  for (let i = 0; i < history.length; i++) {
    if ((history[i]?.color || (i % 2 ? 'b' : 'w')) === seat && ++count === k) return i + 1;
  }
  return history.length;
}

// The game as `seat` ('w' or 'b') may see it. `Chess` is chess.js (passed in: no imports here).
export function viewFor(Chess, game, seat) {
  if (!game || !isFogVariant(game.variant) || game.status !== 'active' || (seat !== 'w' && seat !== 'b')) return game;
  const history = Array.isArray(game.move_history) ? game.move_history : [];
  const out = { ...game, pgn: null };
  if (game.variant === 'dark') {
    let c = null; try { c = new Chess(game.fen); } catch { c = null; }
    const myTurn = !!c && c.turn() === seat;
    const reveal = myTurn ? checkers(c, seat) : [];
    const seen = visibleSquares(game.fen, seat, { reveal });
    out.fen = fogFen(game.fen, seat, seen);
    out.move_history = history.map((r, i) => (r?.color === seat ? clean(r) : hidden(r, i)));
    out.legal = myTurn ? c.moves({ verbose: true }).map(m => m.from + m.to + (m.promotion || '')) : [];
    out.fog = { variant: 'dark', seen: [...seen].sort(), checkers: reveal };
    return out;
  }
  const mine = movesBy(history, seat);
  if (inBlackout(mine)) {
    const at = lightsOutPly(history, seat);
    out.fen = null;
    out.move_history = history.map((r, i) => (i < at ? clean(r) : hidden(r, i)));
    out.legal = null;
    out.fog = { variant: 'blackout', blind: true, movesLeft: blindMovesLeft(mine), since: at };
    return out;
  }
  out.move_history = history.map(clean);
  out.fog = { variant: 'blackout', blind: false, untilDark: movesUntilBlackout(mine) };
  return out;
}
