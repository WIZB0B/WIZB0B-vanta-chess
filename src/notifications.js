// Notifications inbox helpers (the game server files them: challenges, your move, rounds,
// achievements, league moves, club messages).
export const KIND_LABEL = { game: 'Game', challenge: 'Challenge', tournament: 'Tournament', club: 'Club', achievement: 'Achievement', league: 'League', info: 'VCH' };
export function timeAgo(iso, now = Date.now()) {
  const t = Date.parse(iso || ''); if (!Number.isFinite(t)) return '';
  const m = Math.max(0, Math.round((now - t) / 60000));
  if (m < 1) return 'now'; if (m < 60) return `${m}m`; const h = Math.round(m / 60); if (h < 48) return `${h}h`; return `${Math.round(h / 24)}d`;
}
// Only same-site paths are ever followed.
export function safeNotificationUrl(url) {
  const u = String(url || '/');
  return u.startsWith('/') && !u.startsWith('//') && !/[\s\\]/.test(u) ? u : '/';
}
export function badgeCount({ unread = 0, incoming = 0, yourTurn = 0, inboxAvailable = true }) {
  return inboxAvailable ? unread : incoming + yourTurn;
}
