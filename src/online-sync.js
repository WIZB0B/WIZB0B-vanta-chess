// Instant moves in online games.
//
// The server stays the authority for every move, clock and result. To hide the round trip,
// the mover's browser also sends the move straight to the opponent over the game's Realtime
// channel the moment it is played ("provisional"). The opponent shows it at once, after
// checking it is legal in the position on screen, and the server's answer confirms it a
// moment later. If the server rejects it, the mover announces "move_void" and both sides
// reload the server state.
//
// While a provisional move waits for its confirmation, an older server state (a heartbeat
// that was already in flight, say) must not wipe it off the board; that is what `isStale`
// guards. After PROVISIONAL_GRACE_MS without confirmation the server state wins again.

export const PROVISIONAL_GRACE_MS = 5000;
// The opponent's reply to a provisional move waits at most this long for the server to
// confirm the move before it is sent anyway (the server then accepts or rejects it).
export const CONFIRM_WAIT_MS = 2500;

export function provisionalMove(gameId, version, now) {
  return { gameId, version: Number(version), at: now };
}

export function isExpired(provisional, now) {
  return !provisional || now - provisional.at >= PROVISIONAL_GRACE_MS;
}

// True when `state` is an older server state for the game whose newer move is still waiting
// for confirmation: ignore it rather than taking the move back.
export function isStale(provisional, state, now) {
  if (!provisional || !state || isExpired(provisional, now)) return false;
  if (state.id && state.id !== provisional.gameId) return false;
  return Number(state.version ?? 0) < provisional.version;
}

// True when `state` confirms (or supersedes) the provisional move.
export function confirms(provisional, state) {
  if (!provisional || !state) return false;
  if (state.id && state.id !== provisional.gameId) return true;
  return Number(state.version ?? 0) >= provisional.version;
}

// A promise that resolves when `resolve` is called or after `ms`, whichever is first.
export function waiter(ms = CONFIRM_WAIT_MS, timers = globalThis) {
  let done, timer;
  const promise = new Promise(resolve => {
    done = value => { timers.clearTimeout(timer); resolve(value); };
    timer = timers.setTimeout(() => resolve('timeout'), ms);
  });
  return { promise, resolve: (value = 'confirmed') => done(value) };
}
