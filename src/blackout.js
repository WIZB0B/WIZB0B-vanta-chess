// Blackout Blitz: a 3-minute game against the computer where the lights go out. After every
// four of your moves, your next two are played blind: the pieces disappear (squares still
// work, the last move's squares still glow) and the move list goes dark until the lights
// come back. Win to earn the Ember relic.
export const BLACKOUT_SECONDS = 180;
export const BLACKOUT_EVERY = 4, BLACKOUT_LENGTH = 2;
const CYCLE = BLACKOUT_EVERY + BLACKOUT_LENGTH;
// `myMoves`: how many moves you have made so far in the game.
export function inBlackout(myMoves) { return Number(myMoves) % CYCLE >= BLACKOUT_EVERY; }
// Your moves until the next blackout starts (0 while it's dark).
export function movesUntilBlackout(myMoves) { const m = Number(myMoves) % CYCLE; return m >= BLACKOUT_EVERY ? 0 : BLACKOUT_EVERY - m; }
// Blind moves left in the current blackout (0 when the lights are on).
export function blindMovesLeft(myMoves) { const m = Number(myMoves) % CYCLE; return m >= BLACKOUT_EVERY ? CYCLE - m : 0; }
export function myMoveCount(history, color) { return history.filter((_, i) => (i % 2 ? 'b' : 'w') === color).length; }
