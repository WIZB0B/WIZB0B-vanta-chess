import { Chess } from 'chess.js';
import { accuracyFromLosses } from './review.js';

// Game archive and "Game Story": every finished game can be reopened, reviewed and replayed
// as a story told in chapters (opening, middlegame, endgame), with its turning points and a
// chance to replay your worst moment. Pure helpers; src/main.js draws them.

const VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

// ---- Archive ----
export function outcomeFor(result, myColor) {
  if (result === '1/2-1/2') return 'draw';
  if (result !== '1-0' && result !== '0-1') return 'unfinished';
  return (result === '1-0') === (myColor === 'w') ? 'win' : 'loss';
}

// A server history row as an archive entry. `myId` is the viewer's player id.
export function archiveEntryFromServer(g, myId) {
  const myColor = g.white_player_id === myId ? 'w' : g.black_player_id === myId ? 'b' : 'w';
  return {
    id: g.id, source: g.source === 'tournament' ? 'arena' : 'online', pgn: g.pgn || '', result: g.result || '*',
    white: g.white_name || 'White', black: g.black_name || 'Black', myColor,
    whiteRating: g.white_rating_before ?? null, blackRating: g.black_rating_before ?? null,
    ratingDelta: myColor === 'w' ? g.white_rating_delta ?? null : g.black_rating_delta ?? null,
    rated: !!g.rated, base: Number(g.time_control_seconds || 600), inc: Number(g.increment_seconds || 0),
    date: g.ended_at || g.created_at || null, moves: Number(g.move_count || 0),
  };
}

// Computer games live only in this browser.
export const LOCAL_ARCHIVE_KEY = 'vch.archive.local';
export const REVIEW_CACHE_KEY = 'vch.archive.reviews';
const read = (storage, key, fallback) => { try { return JSON.parse(storage?.getItem(key) || '') ?? fallback } catch { return fallback } };
const write = (storage, key, value) => { try { storage?.setItem(key, JSON.stringify(value)) } catch {} };
export function loadLocalArchive(storage = globalThis.localStorage) { const list = read(storage, LOCAL_ARCHIVE_KEY, []); return Array.isArray(list) ? list : [] }
export function saveLocalGame(entry, storage = globalThis.localStorage, limit = 60) {
  const list = loadLocalArchive(storage).filter(e => e.id !== entry.id);
  list.unshift(entry); write(storage, LOCAL_ARCHIVE_KEY, list.slice(0, limit)); return list.slice(0, limit);
}
export function loadReviewCache(storage = globalThis.localStorage) { const map = read(storage, REVIEW_CACHE_KEY, {}); return map && typeof map === 'object' ? map : {} }
export function saveReviewSummary(id, summary, storage = globalThis.localStorage, limit = 120) {
  const map = loadReviewCache(storage); map[id] = { ...summary, at: Date.now() };
  const keys = Object.keys(map).sort((a, b) => (map[b].at || 0) - (map[a].at || 0)).slice(0, limit);
  write(storage, REVIEW_CACHE_KEY, Object.fromEntries(keys.map(k => [k, map[k]])));
}

export function sansFromPgn(pgn) {
  const c = new Chess();
  try { c.loadPgn(String(pgn || '')) } catch { return [] }
  return c.history();
}

// Your form across the archive: last results, win rate, average reviewed accuracy, and the
// opening you play most with how it goes. `openingOf(sans)` names an opening.
export function formInsights(entries = [], reviews = {}, openingOf = () => null) {
  const finished = entries.filter(e => outcomeFor(e.result, e.myColor) !== 'unfinished');
  const outcomes = finished.map(e => outcomeFor(e.result, e.myColor));
  const wins = outcomes.filter(o => o === 'win').length, draws = outcomes.filter(o => o === 'draw').length;
  const accuracies = finished.map(e => reviews[e.id]?.accuracy?.[e.myColor]).filter(Number.isFinite);
  const openings = new Map();
  for (const e of finished) {
    const name = openingOf(sansFromPgn(e.pgn))?.name; if (!name) continue;
    const row = openings.get(name) || { name, games: 0, score: 0 };
    const o = outcomeFor(e.result, e.myColor); row.games++; row.score += o === 'win' ? 1 : o === 'draw' ? .5 : 0;
    openings.set(name, row);
  }
  const top = [...openings.values()].sort((a, b) => b.games - a.games || b.score - a.score)[0] || null;
  return {
    games: finished.length, form: outcomes.slice(0, 10),
    winRate: finished.length ? Math.round(100 * (wins + draws / 2) / finished.length) : null,
    accuracy: accuracies.length ? Math.round(10 * accuracies.reduce((s, v) => s + v, 0) / accuracies.length) / 10 : null,
    topOpening: top && { ...top, percent: Math.round(100 * top.score / top.games) },
  };
}

// ---- Story ----
// Non-pawn material on the board (both sides); 62 at the start.
export function pieceMaterial(fen) {
  let sum = 0;
  for (const ch of String(fen || '').split(' ')[0]) { const v = VALUES[ch.toLowerCase()]; if (v && ch.toLowerCase() !== 'p') sum += v }
  return sum;
}
// Chapter boundaries: the opening runs while moves are book (at most 24 plies), the endgame
// starts when non-pawn material falls to 26 or less (about a rook and a minor each).
export function storyChapters(positions = [], bookFlags = []) {
  const plies = positions.length - 1;
  if (plies < 1) return [];
  if (pieceMaterial(positions[0]) <= 26) return [{ key: 'endgame', title: 'Endgame', from: 1, to: plies }]; // started as an endgame
  let openingEnd = 0;
  while (openingEnd < plies && openingEnd < 24 && bookFlags[openingEnd]) openingEnd++;
  if (openingEnd === 0) openingEnd = Math.min(plies, 10);
  let endgameStart = plies + 1;
  for (let i = openingEnd; i <= plies; i++) if (pieceMaterial(positions[i]) <= 26) { endgameStart = Math.max(i, openingEnd + 1); break }
  const chapters = [{ key: 'opening', title: 'Opening', from: 1, to: openingEnd }];
  if (endgameStart > openingEnd + 1) chapters.push({ key: 'middlegame', title: 'Middlegame', from: openingEnd + 1, to: Math.min(plies, endgameStart - 1) });
  if (endgameStart <= plies) chapters.push({ key: 'endgame', title: 'Endgame', from: endgameStart, to: plies });
  return chapters.filter(c => c.to >= c.from);
}
// Accuracy of one side inside a chapter (plies are 1-based; results are per move).
export function chapterAccuracy(results = [], moves = [], chapter, color) {
  const losses = [];
  for (let ply = chapter.from; ply <= chapter.to; ply++) if (moves[ply - 1]?.color === color) losses.push(results[ply - 1]?.loss ?? 0);
  return losses.length ? accuracyFromLosses(losses) : null;
}
const LABEL = { blunder: 'Blunder', mistake: 'Mistake', miss: 'Missed chance', inaccuracy: 'Inaccuracy' };
// The moments that decided the game: the biggest win-chance swings, best first.
export function keyMoments(results = [], moves = [], limit = 3) {
  return results.map((r, i) => {
    const flipped = Math.sign(r.beforeCp || 0) !== Math.sign(r.afterCp || 0) && Math.abs(r.afterCp || 0) >= 150 && Math.abs(r.beforeCp || 0) >= 50;
    return { ply: i + 1, loss: Number(r.loss || 0), color: moves[i]?.color, san: moves[i]?.san || '', classification: r.classification, bestMove: r.bestMove || '',
      label: flipped ? 'Turning point' : LABEL[r.classification] || 'Key move' };
  }).filter(m => m.loss >= 10).sort((a, b) => b.loss - a.loss).slice(0, limit).sort((a, b) => a.ply - b.ply);
}
// Your costliest move, to replay from the position before it.
export function worstMoment(results = [], moves = [], color) {
  let worst = null;
  results.forEach((r, i) => { if (moves[i]?.color === color && r.bestMove && Number(r.loss || 0) >= 8 && (!worst || r.loss > worst.loss)) worst = { ply: i + 1, loss: r.loss, bestMove: r.bestMove, san: moves[i].san } });
  return worst;
}
// Story playback pace: linger on key moments.
export function storyDelayMs(ply, moments = [], base = 1100) {
  return moments.some(m => m.ply === ply) ? base * 2.6 : base;
}
