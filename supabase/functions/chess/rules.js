// Pure rules shared by the chess edge function and the unit tests (test/server-rules.test.js).

// ---- Berserk ----
// Earned after every three straight rated wins (3, 6, 9...). One charge at a time; a loss
// takes an unspent charge away. Spent before your first move in a live rated game: your
// clock is halved, and your rating change for that game is 1.25 times larger, win or lose.
// Same stakes both ways and half the time, so it only pays if you really play above your
// rating: a reward for form, not a shortcut up the ladder.
export const BERSERK_EVERY = 3;
export const BERSERK_K = 1.25;
export function earnsBerserk(newStreak) { return newStreak > 0 && newStreak % BERSERK_EVERY === 0; }
export function berserkClock(ms) { return Math.max(1000, Math.floor(Number(ms || 0) / 2)); }
export function kMultiplier({ berserk = false } = {}) { return berserk ? BERSERK_K : 1; }
// Whether the player holds a Berserk charge after a rated result (score 1, .5 or 0).
export function berserkAfter({ ready = false, score, newStreak }) {
  if (score === 0) return false;
  if (score === 1 && earnsBerserk(newStreak)) return true;
  return !!ready;
}

// ---- Arena scoring ----
// Win 2, draw 1, loss 0. Three wins in a row put you on fire: wins (and draws) score double
// until the streak ends. A Berserk win adds one point.
export const FIRE_AFTER = 3;
export function arenaScore({ score, streakBefore = 0, berserk = false }) {
  const fire = streakBefore >= FIRE_AFTER;
  if (score === 1) return { points: (fire ? 4 : 2) + (berserk ? 1 : 0), streak: streakBefore + 1, fire };
  if (score === 0.5) return { points: fire ? 2 : 1, streak: 0, fire };
  return { points: 0, streak: 0, fire };
}

// ---- Puzzle rating (Elo against the puzzle's rating) ----
export function puzzleRatingUpdate(rating, games, puzzleRating, success) {
  const k = games < 20 ? 40 : games < 100 ? 24 : 16;
  const expected = 1 / (1 + Math.pow(10, (Number(puzzleRating || 1500) - Number(rating || 1200)) / 400));
  return Math.max(400, Math.min(3200, Math.round(Number(rating || 1200) + k * ((success ? 1 : 0) - expected))));
}
// The same daily puzzle for everyone on a given UTC date.
export function dailyIndex(dateIso, count) {
  const day = String(dateIso || '').slice(0, 10);
  let h = 2166136261;
  for (const ch of day) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return count > 0 ? h % count : 0;
}

// ---- Daily (correspondence) games ----
export const DAY_MS = 86400000;
export function dailyMoveMs(days) { return Math.max(1, Math.min(14, Number(days) || 1)) * DAY_MS; }

// ---- Achievements ----
// Earned from a player's stats; `extra` carries one-off facts (giantSlayer, arenaPodium...).
export const ACHIEVEMENTS = [
  { id: 'first-win', title: 'First win', test: s => s.wins >= 1 },
  { id: 'ten-wins', title: 'Ten wins', test: s => s.wins >= 10 },
  { id: 'fifty-wins', title: 'Fifty wins', test: s => s.wins >= 50 },
  { id: 'rated-25', title: 'Seasoned', test: s => s.rated_games >= 25 },
  { id: 'three-in-a-row', title: 'Berserker', test: s => s.rated_win_streak >= 3 },
  { id: 'giant-slayer', title: 'Giant slayer', test: (s, x) => !!x.giantSlayer },
  { id: 'puzzle-50', title: 'Puzzle solver', test: s => s.puzzle_games >= 50 },
  { id: 'streak-10', title: 'Streak of ten', test: s => s.puzzle_best_streak >= 10 },
  { id: 'arena-podium', title: 'Arena podium', test: (s, x) => !!x.arenaPodium },
  { id: 'daily-finished', title: 'Correspondent', test: (s, x) => !!x.dailyFinished },
  { id: 'first-friend', title: 'Good company', test: (s, x) => !!x.followed },
];
export function newAchievements(have = [], stats = {}, extra = {}) {
  const owned = new Set((have || []).map(a => (typeof a === 'string' ? a : a?.id)));
  return ACHIEVEMENTS.filter(a => !owned.has(a.id) && a.test(stats, extra)).map(a => a.id);
}

// ---- Sign-in check without a round trip ----
// Supabase signs access tokens with ES256; its public key (JWKS) is public. A valid
// signature, a matching issuer and a future expiry identify the user locally. Anything
// else (unknown key after a rotation, odd token) returns null and the caller asks Auth.
const b64url = s => Uint8Array.from(atob(String(s).replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(String(s).length / 4) * 4, '=')), c => c.charCodeAt(0));
const json = bytes => JSON.parse(new TextDecoder().decode(bytes));
export async function verifyJwt(token, jwks, { issuer = null, now = Date.now() } = {}) {
  try {
    const [h, p, sig] = String(token || '').split('.');
    if (!h || !p || !sig) return null;
    const header = json(b64url(h));
    if (header.alg !== 'ES256') return null;
    const jwk = (jwks?.keys || []).find(k => k.kid === header.kid && k.kty === 'EC' && k.crv === 'P-256');
    if (!jwk) return null;
    const key = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y, ext: true }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    const ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, b64url(sig), new TextEncoder().encode(`${h}.${p}`));
    if (!ok) return null;
    const claims = json(b64url(p));
    if (!claims.sub || !claims.exp || claims.exp * 1000 <= now) return null;
    if (issuer && claims.iss !== issuer) return null;
    if (claims.role && claims.role !== 'authenticated') return null;
    return claims;
  } catch { return null; }
}
