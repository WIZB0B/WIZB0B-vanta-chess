export function seatFromEnvelope(payload, previous = null) {
  if (payload?.seat === 'white' || payload?.seat === 'w') return 'w';
  if (payload?.seat === 'black' || payload?.seat === 'b') return 'b';
  const game = payload?.game || payload;
  const playerId = payload?.player?.id;
  if (playerId && playerId === game?.white_player_id) return 'w';
  if (playerId && playerId === game?.black_player_id) return 'b';
  return previous;
}

export function createClockSnapshot(payload, receivedAt = Date.now()) {
  const game = payload?.game || payload;
  const serverNow = Date.parse(payload?.serverNow || game?.serverNow || '') || receivedAt;
  return {
    whiteMs: Math.max(0, Number(game?.white_time_ms) || 0),
    blackMs: Math.max(0, Number(game?.black_time_ms) || 0),
    lastMoveAt: Date.parse(game?.last_move_at || '') || serverNow,
    serverOffset: serverNow - receivedAt,
    active: String(game?.fen || '').split(' ')[1] || 'w',
    running: ['active', 'playing', 'in_progress'].includes(game?.status),
  };
}

export function projectedClocks(snapshot, clientNow = Date.now()) {
  if (!snapshot) return { w: 0, b: 0 };
  const elapsed = snapshot.running ? Math.max(0, clientNow + snapshot.serverOffset - snapshot.lastMoveAt) : 0;
  return {
    w: Math.max(0, snapshot.whiteMs - (snapshot.active === 'w' ? elapsed : 0)),
    b: Math.max(0, snapshot.blackMs - (snapshot.active === 'b' ? elapsed : 0)),
  };
}
