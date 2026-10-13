// Oaths (round 12): before a game you may swear one oath. A vow of restraint ("I won't
// castle") is kept by holding it all game and not losing; a vow of deeds ("A pawn of mine will be
// crowned") is fulfilled by doing it and winning. Fulfilled oaths earn honor; honor earns relics.
// Three oaths are offered each day. Honor lives on this device. Pure helpers; src/main.js draws
// the oath picker, the live oath line and the result.
import { Chess } from 'chess.js';

export const OATHS_KEY = 'vch.oaths';
export const OATHS = [
  { id: 'open-gate', name: 'Oath of the Open Gate', vow: "I won't castle", kind: 'keep', honor: 1 },
  { id: 'patient-queen', name: 'Oath of the Patient Queen', vow: 'My queen stays home until my tenth move', kind: 'keep', honor: 1 },
  { id: 'no-retreat', name: 'Oath of No Retreat', vow: 'My knights never step back', kind: 'keep', honor: 2 },
  { id: 'long-road', name: 'Oath of the Long Road', vow: 'I will castle queenside', kind: 'deed', honor: 1 },
  { id: 'queens-bane', name: "Queen's Bane", vow: 'I will take your queen', kind: 'deed', honor: 1 },
  { id: 'hound', name: 'Oath of the Hound', vow: 'I will give five checks', kind: 'deed', honor: 1 },
  { id: 'ascension', name: 'Oath of Ascension', vow: 'A pawn of mine will be crowned', kind: 'deed', honor: 2 },
  { id: 'twin-blades', name: 'Oath of Twin Blades', vow: 'I will fork twice', kind: 'deed', honor: 2 },
  { id: 'swift-blade', name: 'Oath of the Swift Blade', vow: 'I will win in 30 moves or fewer', kind: 'deed', honor: 2 },
  { id: 'squire', name: "The Squire's Oath", vow: 'A knight or bishop will deliver mate', kind: 'deed', honor: 3 },
  { id: 'kings-walk', name: "The King's Walk", vow: 'My king will cross into your half, and I will win', kind: 'deed', honor: 3 },
  { id: 'lowly', name: 'Oath of the Lowly', vow: 'A pawn will deliver mate', kind: 'deed', honor: 5 },
];
export const oathById = id => OATHS.find(o => o.id === id) || null;
// Honor milestones that unlock relics (relics.js).
export const HONOR_RELICS = [{ at: 10, relic: 'oathbound' }, { at: 30, relic: 'paladin' }];

// Three oaths a day, one of each weight (1, 2, and 3 or more honor), the same for everyone that day.
export function dailyOaths(date = new Date()) {
  const day = Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86400000);
  const pick = (list, salt) => list[(day * 7 + salt * 13) % list.length];
  return [pick(OATHS.filter(o => o.honor === 1), 1), pick(OATHS.filter(o => o.honor === 2), 2), pick(OATHS.filter(o => o.honor >= 3), 3)].map(o => o.id);
}

const VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
// What happened in a game, from one side: replayed from the start position.
export function oathSummary(sans = [], myColor = 'w', startFen = null) {
  const s = { castled: null, queenMovedAt: null, knightRetreat: false, promoted: false, tookQueen: false, checks: 0, forks: 0, mateBy: null, kingCrossed: false, myMoves: 0 };
  let c; try { c = startFen ? new Chess(startFen) : new Chess(); } catch { return s; }
  const enemy = myColor === 'w' ? 'b' : 'w', forward = myColor === 'w' ? 1 : -1;
  for (const san of sans) {
    let m; try { m = c.move(san); } catch { break; }
    if (!m || m.color !== myColor) continue;
    s.myMoves++;
    if (m.flags.includes('k') || m.flags.includes('q')) s.castled = s.castled || (m.flags.includes('q') ? 'q' : 'k');
    if (m.piece === 'q' && s.queenMovedAt === null) s.queenMovedAt = s.myMoves;
    if (m.piece === 'n' && (Number(m.to[1]) - Number(m.from[1])) * forward < 0) s.knightRetreat = true;
    if (m.promotion) s.promoted = true;
    if (m.captured === 'q') s.tookQueen = true;
    if (m.piece === 'k' && (myColor === 'w' ? Number(m.to[1]) >= 5 : Number(m.to[1]) <= 4)) s.kingCrossed = true;
    if (c.isCheckmate()) s.mateBy = m.promotion ? 'p' : m.piece;
    else if (c.inCheck()) s.checks++;
    if (!c.isCheckmate()) {
      let targets = 0;
      for (const row of c.board()) for (const p of row) if (p && p.color === enemy && (VALUE[p.type] >= 3 || p.type === 'k') && c.attackers(p.square, myColor).includes(m.to)) targets++;
      if (targets >= 2) s.forks++;
    }
  }
  return s;
}
// Broken already (vows of restraint), done already (vows of deeds)?
function broken(id, s) {
  if (id === 'open-gate') return !!s.castled;
  if (id === 'patient-queen') return s.queenMovedAt !== null && s.queenMovedAt < 10;
  if (id === 'no-retreat') return s.knightRetreat;
  if (id === 'long-road') return s.castled === 'k'; // you castled the other way
  if (id === 'swift-blade') return s.myMoves > 30;
  return false;
}
function done(id, s) {
  return ({ 'long-road': s.castled === 'q', 'queens-bane': s.tookQueen, hound: s.checks >= 5, ascension: s.promoted, 'twin-blades': s.forks >= 2,
    'swift-blade': s.myMoves <= 30, squire: s.mateBy === 'n' || s.mateBy === 'b', 'kings-walk': s.kingCrossed, lowly: s.mateBy === 'p' })[id] ?? false;
}
// Status of an oath. During a game: 'holding' | 'broken' (restraint), 'pending' | 'done' (deeds).
// After it (`over` with your `score` 1, .5 or 0): 'fulfilled' | 'broken' | 'failed'.
export function oathStatus(id, summary, { over = false, score = null } = {}) {
  const oath = oathById(id); if (!oath) return null;
  if (broken(id, summary)) return 'broken';
  if (oath.kind === 'keep') return !over ? 'holding' : score >= 0.5 ? 'fulfilled' : 'failed';
  if (!over) return id !== 'swift-blade' && done(id, summary) ? 'done' : 'pending'; // a swift win is only known at the end
  return done(id, summary) && score === 1 ? 'fulfilled' : 'failed';
}
export function loadOaths(storage = globalThis.localStorage) {
  let v = null; try { v = JSON.parse(storage?.getItem(OATHS_KEY) || ''); } catch {}
  return { honor: Number(v?.honor) || 0, sworn: Number(v?.sworn) || 0, kept: Number(v?.kept) || 0, history: Array.isArray(v?.history) ? v.history.slice(0, 30) : [] };
}
export function saveOaths(state, storage = globalThis.localStorage) { try { storage?.setItem(OATHS_KEY, JSON.stringify(state)); } catch {} return state; }
// Records a finished oath. Returns {state, gained, relics} (relic ids crossed by this honor).
export function recordOath(state, id, status, at = new Date().toISOString()) {
  const oath = oathById(id); if (!oath || !['fulfilled', 'broken', 'failed'].includes(status)) return { state, gained: 0, relics: [] };
  const gained = status === 'fulfilled' ? oath.honor : 0, honor = state.honor + gained;
  const relics = HONOR_RELICS.filter(r => state.honor < r.at && honor >= r.at).map(r => r.relic);
  return { state: { ...state, honor, sworn: state.sworn + 1, kept: state.kept + (gained ? 1 : 0), history: [{ id, status, at }, ...state.history].slice(0, 30) }, gained, relics };
}
