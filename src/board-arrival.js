// The start of a game (owner, 2026-10-17: the pieces "don't load naturally ... they seem to be
// floating on the board", and "the game start screen"). The start card shows who plays whom over
// the board's empty squares; as it leaves, the pieces settle onto their squares, the middle files
// first and the edges last. A touch on the board ends it at once: it never holds up a move.
// The CSS is in src/style.css (.board[data-arrival]).
export const ARRIVAL = Object.freeze({ holdMs: 900, dropMs: 460, stepMs: 36 });
const FILES = 'abcdefgh';

// How long a piece on this square waits before it settles: d and e at once, then c and f, b and
// g, a and h.
export function arrivalDelay(square, { stepMs = ARRIVAL.stepMs } = {}) {
  const file = FILES.indexOf(String(square || '')[0]);
  if (file < 0) return 0;
  return Math.min(Math.abs(file - 3), Math.abs(file - 4)) * stepMs;
}

// From the card's appearance to the last piece settled.
export function arrivalMs({ holdMs = ARRIVAL.holdMs, dropMs = ARRIVAL.dropMs, stepMs = ARRIVAL.stepMs } = {}) {
  return holdMs + 3 * stepMs + dropMs;
}

// Runs the arrival on a board: clears its pieces (the card covers the moment), then lets them
// settle. A board already on screen (a tablet or desktop, a room waiting for its opponent) fades
// its pieces away ('clear'); one just coming into view (a phone's game screen) shows its squares
// empty from the first frame ('hold'). Returns {finish, done}: finish() ends it now (a touch on
// the board); done settles when the pieces are all down. `pieces` maps square -> element.
export function startArrival(board, pieces, { timers = globalThis, holdMs = ARRIVAL.holdMs, dropMs = ARRIVAL.dropMs, stepMs = ARRIVAL.stepMs, onScreen = false } = {}) {
  let ended = false, resolveDone;
  const done = new Promise(resolve => { resolveDone = resolve; });
  const timeouts = [];
  const finish = () => {
    if (ended) return;
    ended = true;
    for (const id of timeouts) timers.clearTimeout(id);
    delete board.dataset.arrival;
    for (const el of pieces.values()) el.style.removeProperty('--arrive-delay');
    resolveDone();
  };
  for (const [square, el] of pieces) el.style.setProperty('--arrive-delay', `${arrivalDelay(square, { stepMs })}ms`);
  board.dataset.arrival = onScreen ? 'clear' : 'hold';
  timeouts.push(timers.setTimeout(() => { if (!ended) board.dataset.arrival = 'drop'; }, holdMs));
  timeouts.push(timers.setTimeout(finish, arrivalMs({ holdMs, dropMs, stepMs }) + 40));
  return { finish, done };
}
