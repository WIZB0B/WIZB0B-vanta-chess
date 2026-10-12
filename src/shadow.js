// Your Shadow: a computer opponent built from your own games. It opens the way you open
// (your moves with the colour it has, as often as you play them) and, once your book runs
// out, plays at your rating.
import { Chess } from 'chess.js';
import { prepTree } from './prep.js';

export const SHADOW_PLIES = 16, SHADOW_MIN_ELO = 900, SHADOW_MAX_ELO = 2700;
const score = (result, color) => result === '1/2-1/2' ? 0.5 : (result === '1-0') === (color === 'w') ? 1 : 0;
const finished = r => ['1-0', '0-1', '1/2-1/2'].includes(r);
function sansOf(pgn) { const c = new Chess(); try { c.loadPgn(String(pgn || '')); } catch { return []; } return c.history(); }
// Your lines as White and as Black, from server history (raw rows) and this device's games.
export function shadowLines(serverGames = [], myId = null, localEntries = []) {
  const lines = { w: [], b: [] }, seen = new Set();
  for (const g of serverGames) {
    if (!finished(g.result) || (g.variant && g.variant !== 'standard') || g.start_fen) continue;
    const color = g.white_player_id === myId ? 'w' : g.black_player_id === myId ? 'b' : null;
    const sans = (Array.isArray(g.sans) ? g.sans : []).slice(0, SHADOW_PLIES);
    if (!color || sans.length < 2) continue;
    seen.add(g.id); lines[color].push({ sans, score: score(g.result, color) });
  }
  for (const e of localEntries) {
    if (seen.has(e.id) || !finished(e.result) || (e.variant && e.variant !== 'standard') || !['w', 'b'].includes(e.myColor)) continue;
    const sans = sansOf(e.pgn).slice(0, SHADOW_PLIES); if (sans.length < 2) continue;
    lines[e.myColor].push({ sans, score: score(e.result, e.myColor) });
  }
  return lines;
}
// The shadow plays `shadowColor` with your own moves as that colour.
export function shadowBook(lines, shadowColor) { return prepTree(lines?.[shadowColor] || []); }
export function shadowElo(rating) {
  const r = Math.round((Number(rating) || 1200) / 50) * 50;
  return Math.max(SHADOW_MIN_ELO, Math.min(SHADOW_MAX_ELO, r));
}
