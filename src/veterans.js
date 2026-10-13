// Veteran pieces (round 12): your pieces build careers. Each piece is known by where it starts
// ("the knight of g1"), and every game you play from the usual start adds to its record:
// captures, forks, checks, mates, promotions, and how often it fell. Deeds earn a rank, shown on
// the board as small chevrons (Veteran one, Champion two, Legend three and a glint) and on
// hover. Built from your own game history; pure helpers, src/main.js draws them.
import { Chess } from 'chess.js';

export const VETERANS_KEY = 'vch.veterans';
const START = new Chess().fen();
const VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const NAMES = { p: 'Pawn', n: 'Knight', b: 'Bishop', r: 'Rook', q: 'Queen', k: 'King' };
export const RANKS = [
  { id: 'legend', name: 'Legend', min: 40 },
  { id: 'champion', name: 'Champion', min: 15 },
  { id: 'veteran', name: 'Veteran', min: 5 },
];
// A piece's identity: colour, type and starting square, e.g. "w-n-g1".
export const pieceId = (color, type, square) => `${color}-${type}-${square}`;
export function pieceName(id) {
  const [, type, sq] = String(id).split('-');
  if (type === 'k') return 'The King';
  if (type === 'q') return sq === 'd1' || sq === 'd8' ? 'The Queen' : `Queen of ${sq}`;
  return `${NAMES[type] || 'Piece'} of ${sq}`;
}
export function deeds(s) { return s.captures + 2 * s.forks + 4 * s.mates + 2 * s.promotions + Math.floor(s.checks / 2); }
export function rankOf(s) { const d = deeds(s); return RANKS.find(r => d >= r.min) || null; }
// The title a piece earns from its rarest kind of deed (mates first, then forks, promotions,
// captures and checks), once it has done enough of it.
const EPITHETS = [['mates', 'Kingslayer', 1], ['forks', 'the Fork', 3], ['promotions', 'the Ascended', 2], ['captures', 'the Reaper', 12], ['checks', 'the Hound', 12]];
export function epithetOf(s) { return EPITHETS.find(([k, , min]) => (s[k] || 0) >= min)?.[1] || null; }
const blank = () => ({ games: 0, captures: 0, forks: 0, checks: 0, mates: 0, promotions: 0, fell: 0, value: 0 });
// A fork: the piece that just moved to `to` attacks two or more enemy pieces that it can win:
// the king, a piece worth more than itself, or an undefended piece worth 3 or more.
export function forkTargets(c, to, me) {
  const enemy = me === 'w' ? 'b' : 'w', mover = c.get(to); if (!mover) return 0;
  let n = 0;
  for (const row of c.board()) for (const p of row) {
    if (!p || p.color !== enemy || !(p.type === 'k' || VALUE[p.type] >= 3) || !c.attackers(p.square, me).includes(to)) continue;
    if (p.type === 'k' || VALUE[p.type] > VALUE[mover.type] || c.attackers(p.square, enemy).length === 0) n++;
  }
  return n;
}

// Where each of `color`'s pieces is after `history` (verbose chess.js moves) from the usual start:
// Map<square, id>. Pieces that were captured are gone.
export function identitiesAfter(history = [], color = 'w') {
  const c = new Chess(), map = new Map();
  for (const row of c.board()) for (const p of row) if (p && p.color === color) map.set(p.square, pieceId(p.color, p.type, p.square));
  for (const m of history) applyMove(map, m, color);
  return map;
}
function applyMove(map, m, color) {
  if (m.color === color) {
    const id = map.get(m.from); map.delete(m.from); if (id) map.set(m.to, id);
    if (m.flags?.includes('k') || m.flags?.includes('q')) { // castling moves the rook too
      const rank = color === 'w' ? '1' : '8', [rf, rt] = m.flags.includes('k') ? ['h', 'f'] : ['a', 'd'];
      const rid = map.get(rf + rank); map.delete(rf + rank); if (rid) map.set(rt + rank, rid);
    }
  } else {
    const at = m.flags?.includes('e') ? m.to[0] + m.from[1] : m.to;
    if (m.captured) map.delete(at);
  }
}
// Every piece's record from one finished game. `sans` from the usual start; `myColor` is yours.
export function gameDeeds(sans = [], myColor = 'w') {
  const c = new Chess(), map = identitiesAfter([], myColor), out = new Map();
  const rec = id => { if (!out.has(id)) out.set(id, blank()); return out.get(id); };
  for (const id of map.values()) rec(id).games = 1;
  for (const san of sans) {
    let m; try { m = c.move(san); } catch { break; }
    if (!m) break;
    if (m.color === myColor) {
      const id = map.get(m.from), r = id ? rec(id) : null;
      if (r) {
        if (m.captured) { r.captures++; r.value += VALUE[m.captured]; }
        if (m.promotion) r.promotions++;
        if (c.isCheckmate()) r.mates++; else if (c.inCheck()) r.checks++;
        if (!c.isCheckmate() && forkTargets(c, m.to, myColor) >= 2) r.forks++;
      }
    } else if (m.captured) {
      const at = m.flags.includes('e') ? m.to[0] + m.from[1] : m.to, id = map.get(at);
      if (id) { rec(id).fell++; }
    }
    applyMove(map, m, myColor);
  }
  return out;
}
// Only standard games from the usual start count (in Freestyle and the drop variants a piece's
// start square means something else).
export function countsForCareer(e) {
  return !!e && Array.isArray(e.sans) && e.sans.length >= 2 && (!e.variant || e.variant === 'standard') && (!e.startFen || e.startFen === START);
}
// Careers across games: entries {id, sans, myColor, startFen, variant}.
export function careers(entries = []) { return totalsMap(addGames(emptyCareers(), entries).totals); }
// Stored careers grow one game at a time: {ids: game ids already counted, totals: {pieceId: stats}}.
export const emptyCareers = () => ({ ids: [], totals: {} });
export const MAX_CAREER_IDS = 600;
export function addGames(state, entries = []) {
  const ids = new Set(state.ids), totals = { ...state.totals }, added = [];
  for (const e of entries) {
    if (!countsForCareer(e) || (e.id && ids.has(e.id))) continue;
    if (e.id) { ids.add(e.id); added.push(e.id); }
    for (const [id, s] of gameDeeds(e.sans, e.myColor === 'b' ? 'b' : 'w')) {
      const t = { ...blank(), ...(totals[id] || {}) };
      for (const k of Object.keys(blank())) t[k] += s[k];
      totals[id] = t;
    }
  }
  return { ids: [...state.ids, ...added].slice(-MAX_CAREER_IDS), totals };
}
export const totalsMap = totals => new Map(Object.entries(totals || {}));
// The army as a list, best first: [{id, name, color, type, ...stats, deeds, rank, epithet}]
export function armyList(map, color = null) {
  return [...map.entries()].filter(([id]) => !color || id[0] === color)
    .map(([id, s]) => ({ id, name: pieceName(id), color: id[0], type: id.split('-')[1], ...s, deeds: deeds(s), rank: rankOf(s)?.id || null, rankName: rankOf(s)?.name || 'Recruit', epithet: rankOf(s) ? epithetOf(s) : null }))
    .sort((a, b) => b.deeds - a.deeds || b.games - a.games);
}
export function loadVeterans(storage = globalThis.localStorage) {
  let v = null; try { v = JSON.parse(storage?.getItem(VETERANS_KEY) || ''); } catch {}
  const ok = id => /^[wb]-[pnbrqk]-[a-h][1-8]$/.test(id);
  const totals = v && typeof v.totals === 'object' && v.totals ? Object.fromEntries(Object.entries(v.totals).filter(([id, s]) => ok(id) && s && typeof s === 'object').map(([id, s]) => [id, Object.fromEntries(Object.keys(blank()).map(k => [k, Math.max(0, Number(s[k]) || 0)]))])) : {};
  return { ids: Array.isArray(v?.ids) ? v.ids.filter(x => typeof x === 'string').slice(-MAX_CAREER_IDS) : [], totals };
}
export function saveVeterans(state, storage = globalThis.localStorage) { try { storage?.setItem(VETERANS_KEY, JSON.stringify({ ids: state.ids, totals: state.totals })); } catch {} return state; }
