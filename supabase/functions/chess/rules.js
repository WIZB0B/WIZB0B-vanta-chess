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
  { id: 'club-member', title: 'Club player', test: (s, x) => !!x.joinedClub },
  { id: 'league-promoted', title: 'Promoted', test: (s, x) => !!x.promoted },
  { id: 'mistake-fixer', title: 'Learns fast', test: (s, x) => !!x.fixedMistakes },
  { id: 'freestyle', title: 'Freestyler', test: (s, x) => !!x.freestyleFinished },
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

// ---- Freestyle (Chess960 start positions, played without castling) ----
// chess.js has no Chess960 castling, so Freestyle games start with castling rights off.
// `pick(n)` returns a random integer in [0, n). Bishops on opposite colours, king between
// the rooks (the 960 rule, kept so the positions are the familiar ones).
export function freestyleBackRank(pick = n => Math.floor(Math.random() * n)) {
  const rank = Array(8).fill(null), free = () => rank.map((x, i) => (x ? null : i)).filter(i => i !== null);
  rank[2 * pick(4)] = 'b'; rank[2 * pick(4) + 1] = 'b';
  let f = free(); rank[f[pick(f.length)]] = 'q';
  f = free(); rank[f[pick(f.length)]] = 'n';
  f = free(); rank[f[pick(f.length)]] = 'n';
  f = free(); rank[f[0]] = 'r'; rank[f[1]] = 'k'; rank[f[2]] = 'r';
  return rank.join('');
}
export function freestyleFen(rank = freestyleBackRank()) {
  return `${rank}/pppppppp/8/8/8/8/PPPPPPPP/${rank.toUpperCase()} w - - 0 1`;
}
export function isFreestyleRank(rank) {
  const r = String(rank || '');
  if (!/^[rnbqk]{8}$/.test(r) || [...'rrnnbbqk'].sort().join('') !== [...r].sort().join('')) return false;
  const b = [...r].map((c, i) => (c === 'b' ? i : -1)).filter(i => i >= 0), rooks = [...r].map((c, i) => (c === 'r' ? i : -1)).filter(i => i >= 0), k = r.indexOf('k');
  return b[0] % 2 !== b[1] % 2 && rooks[0] < k && k < rooks[1];
}

// ---- Monthly leagues ----
// Rated games earn league points (win 3, draw 1). A season is a calendar month (UTC). At the
// end, the top fifth of each division with at least MIN_GAMES moves up, the bottom fifth of
// those who played moves down; new players start in Bronze.
export const DIVISIONS = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'];
export const LEAGUE_MIN_GAMES = 5;
export function leaguePoints(score) { return score === 1 ? 3 : score === 0.5 ? 1 : 0; }
export function seasonOf(date = new Date()) { const d = new Date(date); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`; }
export function previousSeason(season) { const [y, m] = String(season).split('-').map(Number); return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`; }
export function seasonEnds(season) { const [y, m] = String(season).split('-').map(Number); return new Date(Date.UTC(y, m, 1)).toISOString(); }
// entries: [{player_id, division, points, games, wins}] for one season -> moves
export function leagueMoves(entries = []) {
  const out = [];
  for (let d = 0; d < DIVISIONS.length; d++) {
    const rows = entries.filter(e => Number(e.division) === d && Number(e.games) >= 1)
      .sort((a, b) => b.points - a.points || b.wins - a.wins || a.games - b.games);
    const eligible = rows.filter(e => Number(e.games) >= LEAGUE_MIN_GAMES), n = Math.floor(rows.length / 5);
    if (d < DIVISIONS.length - 1) for (const e of eligible.slice(0, Math.max(n, eligible.length >= 3 ? 1 : 0))) out.push({ player_id: e.player_id, from: d, to: d + 1 });
    if (d > 0 && n > 0) for (const e of rows.slice(-n)) if (!out.some(o => o.player_id === e.player_id)) out.push({ player_id: e.player_id, from: d, to: d - 1 });
  }
  return out;
}
export function zoneSizes(count) { const n = Math.floor(count / 5); return { promote: n, relegate: n }; }

// ---- Conditional moves (daily games) ----
// lines: arrays of UCI moves, opponent first: [theirs, yours, theirs, yours, ...].
// After the opponent plays `uci`, returns your reply (if a line expects it) and the lines
// that still apply, shifted past the two moves.
export function matchConditional(lines = [], uci) {
  const matching = lines.filter(l => Array.isArray(l) && l[0] === uci && l.length >= 2);
  if (!matching.length) return { reply: null, rest: [] };
  const reply = matching[0][1];
  const rest = matching.filter(l => l[1] === reply).map(l => l.slice(2)).filter(l => l.length >= 2);
  return { reply, rest };
}
export const CONDITIONAL_MAX_LINES = 10, CONDITIONAL_MAX_PLIES = 12;

// ---- Swiss pairing ----
// players: ranked best first, each {id, opponents:[ids], whites, games, byes}. The lowest
// ranked player without a bye sits out an odd round. Pairs avoid rematches (backtracking,
// with a step limit; past it, rematches are allowed). White goes to whoever has had White
// less often. Returns {pairs:[[whiteId, blackId]], bye}.
export function swissPairs(players = []) {
  const pool = players.map(p => ({ ...p, opponents: p.opponents || [], whites: Number(p.whites || 0), games: Number(p.games || 0), byes: Number(p.byes || 0) }));
  let bye = null;
  if (pool.length % 2 === 1) {
    let idx = -1;
    for (let i = pool.length - 1; i >= 0; i--) if (!pool[i].byes) { idx = i; break; }
    bye = pool.splice(idx < 0 ? pool.length - 1 : idx, 1)[0].id;
  }
  let steps = 0;
  const solve = rest => {
    if (!rest.length) return [];
    if (++steps > 20000) return null;
    const [a, ...others] = rest;
    for (let i = 0; i < others.length; i++) {
      if (a.opponents.includes(others[i].id)) continue;
      const sub = solve(others.filter((_, j) => j !== i));
      if (sub) return [[a, others[i]], ...sub];
    }
    return null;
  };
  let res = solve(pool);
  if (!res) { res = []; for (let i = 0; i + 1 < pool.length; i += 2) res.push([pool[i], pool[i + 1]]); }
  const balance = p => p.whites - (p.games - p.whites);
  return { pairs: res.map(([a, b]) => (balance(a) <= balance(b) ? [a.id, b.id] : [b.id, a.id])), bye };
}

// ---- First moves (bullet-friendly start) ----
// Each side's first move is not timed; the clocks start once both have moved. If the side
// to move hasn't made its first move within FIRST_MOVE_MS, the game is aborted (no rating).
export const FIRST_MOVE_MS = 30000;
export function firstMovesPending(moveCount) { return Number(moveCount || 0) < 2; }
export function abortDue({ moveCount, lastMoveAt, daily = false, now = Date.now() }) {
  if (daily || !firstMovesPending(moveCount)) return false;
  const since = Date.parse(lastMoveAt || '');
  return Number.isFinite(since) && now - since > FIRST_MOVE_MS;
}

// ---- Opening explorer ----
export const EXPLORER_PLIES = 24;
// Position key: placement, side to move, castling, en passant (no move counters).
export function explorerKey(fen) { return String(fen || '').split(' ').slice(0, 4).join(' '); }
