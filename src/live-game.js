// Your live game, wherever you are in VCH (owner, 2026-10-13: "if a person leave the play
// section, the person is unable to return to the game ... the win was handed to my opponent,
// which is not fair. The player should be able to return to the game"). An online game you sit
// in stays yours while you look at anything else: src/main.js keeps it beating (so your opponent
// sees you are still here and cannot claim it; your clock still runs), tells you when it is
// your move or when it ends, and "Back to your game" brings the board back. Only leaving VCH
// (the tab closed, the connection gone) lets your opponent claim the game, after the server's
// thirty seconds; open VCH again in time and you are back in it. Kept on this device.

import { localStore } from './safe-storage.js';
export const LIVE_KEY = 'vch.liveGame';
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ROOM = /^[A-Za-z0-9_-]{1,40}$/;

// The game to keep, from a server state seen on the board: a game you sit in (a seat), played
// online (Match or Room), with its clocks running. Anything else keeps nothing.
export function liveFrom(state, { seat = null, mode = 'room' } = {}) {
  if (!state || !ID.test(String(state.id || '')) || !seat || state.status !== 'active') return null;
  if (mode !== 'match' && mode !== 'room') return null;
  const room = typeof state.invite_code === 'string' && ROOM.test(state.invite_code) ? state.invite_code : null;
  return { id: String(state.id), mode, room, seat };
}

// The kept game, as stored (null when there is none or it does not look like one).
export function checkLive(v) {
  if (!v || typeof v !== 'object' || !ID.test(String(v.id || ''))) return null;
  const mode = v.mode === 'match' ? 'match' : 'room', seat = v.seat === 'b' ? 'b' : v.seat === 'w' ? 'w' : null;
  if (!seat) return null;
  return { id: String(v.id), mode, room: typeof v.room === 'string' && ROOM.test(v.room) ? v.room : null, seat };
}
export function loadLive(storage = localStore) {
  try { return checkLive(JSON.parse(storage?.getItem(LIVE_KEY) || 'null')); } catch { return null; }
}
export function saveLive(live, storage = localStore) {
  try { if (live) storage?.setItem(LIVE_KEY, JSON.stringify(checkLive(live))); else storage?.removeItem(LIVE_KEY); } catch {}
  return live ? checkLive(live) : null;
}

// Whose move it is in a server state (the side to move in its FEN), or null.
export function sideToMove(state) {
  const t = String(state?.fen || '').split(' ')[1];
  if (t === 'w' || t === 'b') return t;
  const n = Number(state?.move_count);
  return Number.isFinite(n) ? (n % 2 ? 'b' : 'w') : null;
}

// What the "Back to your game" button says: your move (your clock is running) or just the game.
export function returnLabel(live, state) {
  if (!live) return '';
  return state && state.status === 'active' && sideToMove(state) === live.seat ? 'Your move · back to your game' : 'Back to your game';
}

// How a finished game ended for you, in a few words (for the note when it ends while you are
// elsewhere): won, lost or drawn.
export function endedFor(live, state) {
  const s = String(state?.status || ''), r = String(state?.result || '');
  if (!live || s === 'active' || s === 'waiting') return null;
  if (r === '1/2-1/2' || s === 'draw') return 'draw';
  const white = r === '1-0' || s === 'white_won', black = r === '0-1' || s === 'black_won';
  if (!white && !black) return 'ended';
  return (white && live.seat === 'w') || (black && live.seat === 'b') ? 'won' : 'lost';
}
