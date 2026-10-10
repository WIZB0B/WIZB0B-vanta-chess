// Round 4 client rules: Berserk, daily games, friends and challenges, achievements.
// Pure helpers; src/main.js wires them to the page. The game server (supabase/functions/chess,
// rules.js) is the authority for all of them; these only decide what to show.

// ---- Berserk ----
// Earned at every third straight rated win; spent before your first move in a live rated
// game: half your clock, 1.25 times the rating change, win or lose.
export const BERSERK_EVERY = 3;
export const BERSERK_K = 1.25;
export function canBerserk({ game, seat, ready }) {
  if (!game || !seat || !ready) return false;
  if (game.status !== 'active' || !game.rated || game.daily_days || game.bot_player_id) return false;
  if (seat === 'w' ? game.white_berserk : game.black_berserk) return false;
  return !(Array.isArray(game.move_history) ? game.move_history : []).some(m => m.color === seat);
}
// "2 more wins to Berserk" style progress from the current rated win streak.
export function berserkProgress(streak = 0, ready = false) {
  if (ready) return { ready: true, toGo: 0, label: 'Berserk ready' };
  const toGo = BERSERK_EVERY - (Math.max(0, Number(streak) || 0) % BERSERK_EVERY);
  return { ready: false, toGo, label: `${toGo} more rated ${toGo === 1 ? 'win' : 'wins'} to Berserk` };
}

// ---- Time controls (room form) ----
// "600" is ten minutes; "daily-3" is a daily game with three days per move.
export const DAILY_CHOICES = [1, 2, 3, 7];
export function timeChoice(value) {
  const daily = /^daily-(\d{1,2})$/.exec(String(value || ''));
  if (daily) {
    const days = Math.max(1, Math.min(14, Number(daily[1])));
    return { dailyDays: days, seconds: days * 86400, increment: 0 };
  }
  const seconds = Math.max(30, Math.min(7200, Number(value) || 600));
  return { dailyDays: null, seconds, increment: 0 };
}
// Clock text that also reads well for days: 4:05, 1:02:03, 5h 12m, 2d 4h.
export function clockLabel(totalSeconds) {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  if (s >= 86400) { const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600); return `${d}d ${h}h`; }
  if (s >= 36000) { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return `${h}h ${m}m`; }
  if (s >= 3600) return `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
export function timeControlLabel({ base_seconds, increment_seconds, daily_days }) {
  if (daily_days) return `Daily · ${daily_days} ${daily_days === 1 ? 'day' : 'days'}/move`;
  const base = Number(base_seconds) || 600;
  return `${base % 60 === 0 ? base / 60 : `${base}s`}+${Number(increment_seconds) || 0}`;
}
// Time left for a daily game's move, as words.
export function dailyDeadlineLabel(deadlineIso, now = Date.now()) {
  const left = Date.parse(deadlineIso || '') - now;
  if (!Number.isFinite(left)) return '';
  if (left <= 0) return 'Time is up';
  const h = Math.floor(left / 3600000);
  if (h >= 48) return `${Math.floor(h / 24)} days left`;
  if (h >= 1) return `${h}h left`;
  return `${Math.max(1, Math.floor(left / 60000))} min left`;
}

// ---- Friends ----
export function sortFriends(list = []) {
  return [...list].sort((a, b) => Number(!!b.online) - Number(!!a.online) || String(a.name || '').localeCompare(String(b.name || '')));
}
export const CHALLENGE_TIMES = [
  { value: '180-2', label: '3+2', seconds: 180, increment: 2 },
  { value: '300-0', label: '5+0', seconds: 300, increment: 0 },
  { value: '600-0', label: '10+0', seconds: 600, increment: 0 },
  { value: '900-10', label: '15+10', seconds: 900, increment: 10 },
  { value: 'daily-1', label: 'Daily 1d', dailyDays: 1 },
  { value: 'daily-3', label: 'Daily 3d', dailyDays: 3 },
];
export function challengePayload(toPlayerId, value, { rated = false, color = 'random' } = {}) {
  const pick = CHALLENGE_TIMES.find(t => t.value === value) || CHALLENGE_TIMES[2];
  return { toPlayerId, rated: !!rated, color: ['w', 'b'].includes(color) ? color : 'random', ...(pick.dailyDays ? { dailyDays: pick.dailyDays } : { seconds: pick.seconds, increment: pick.increment }) };
}

// ---- Achievements ----
// Same ids as the server's rules.js ACHIEVEMENTS; the badge mark is two letters, no emoji.
export const ACHIEVEMENT_INFO = [
  { id: 'first-win', title: 'First win', mark: 'W1', text: 'Win a game against a player.' },
  { id: 'ten-wins', title: 'Ten wins', mark: '10', text: 'Win ten games.' },
  { id: 'fifty-wins', title: 'Fifty wins', mark: '50', text: 'Win fifty games.' },
  { id: 'rated-25', title: 'Seasoned', mark: 'S', text: 'Play 25 rated games.' },
  { id: 'three-in-a-row', title: 'Berserker', mark: 'B3', text: 'Win three rated games in a row.' },
  { id: 'giant-slayer', title: 'Giant slayer', mark: 'GS', text: 'Beat a player rated 200 or more above you.' },
  { id: 'puzzle-50', title: 'Puzzle solver', mark: 'P', text: 'Rate 50 puzzles.' },
  { id: 'streak-10', title: 'Streak of ten', mark: 'S10', text: 'Reach 10 in a Puzzle Streak.' },
  { id: 'arena-podium', title: 'Arena podium', mark: 'A3', text: 'Finish an arena in the top three.' },
  { id: 'daily-finished', title: 'Correspondent', mark: 'D', text: 'Finish a daily game.' },
  { id: 'first-friend', title: 'Good company', mark: 'F', text: 'Follow another player.' },
];
export function achievementBoard(owned = []) {
  const at = new Map((owned || []).map(a => (typeof a === 'string' ? [a, null] : [a?.id, a?.at || null])));
  return ACHIEVEMENT_INFO.map(a => ({ ...a, earned: at.has(a.id), at: at.get(a.id) || null }));
}

// ---- Web push ----
// Public half of the VAPID key pair; the private half lives only on the game server.
export const VAPID_PUBLIC_KEY = 'BAUodyF9eKxxAEcthQ1xAZ8Wn7lF_bmH7jJwUZqw6t2QnW82LRBEBkJgXkKVWzLQkPNnhd6a1LCAa3Wi6vu8hGA';
export function urlBase64ToBytes(base64) {
  const padded = String(base64).replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(String(base64).length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
}
export function pushSupported(win = globalThis) {
  return !!(win?.navigator?.serviceWorker && win.PushManager && win.Notification);
}
