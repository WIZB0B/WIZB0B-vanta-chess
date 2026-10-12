// Small game moments: an opponent who left, the low-time tick, the "your move" tab alert and
// keeping the screen awake. Pure helpers here; src/main.js wires them to the game.

// The server lets a player claim after this long without a heartbeat or move from the
// opponent (supabase/functions/chess CLAIM_AFTER_MS). The card appears earlier, as a warning.
export const CLAIM_AFTER_MS = 30000;
export const LEFT_AFTER_MS = 12000;

// {state:'here'|'left'|'claimable', secondsLeft} for the opponent's last-seen time.
export function abandonState(lastSeenIso, serverNowMs) {
  const seen = Date.parse(lastSeenIso || '');
  if (!Number.isFinite(seen)) return { state: 'here', secondsLeft: null };
  const gone = serverNowMs - seen;
  if (gone < LEFT_AFTER_MS) return { state: 'here', secondsLeft: null };
  if (gone < CLAIM_AFTER_MS) return { state: 'left', secondsLeft: Math.ceil((CLAIM_AFTER_MS - gone) / 1000) };
  return { state: 'claimable', secondsLeft: 0 };
}

// Low time: one tick per whole second under 10s, only on your own running clock.
export const TICK_UNDER_S = 10;
export function tickSecond(seconds, running) {
  if (!running || !(seconds > 0) || seconds >= TICK_UNDER_S) return null;
  return Math.ceil(seconds);
}

export const YOUR_MOVE_TITLE = '● Your move · VCH';
export function tabTitle(baseTitle, { hidden, yourTurn }) {
  return hidden && yourTurn ? YOUR_MOVE_TITLE : baseTitle;
}

// The first move of an engine line ("e2e4 e7e5 ...") as {from,to,promotion}.
export function firstMoveOfLine(pv) {
  const uci = String(pv || '').trim().split(/\s+/)[0] || '';
  if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) return null;
  return { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || null };
}
