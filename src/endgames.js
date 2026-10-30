import { Chess } from 'chess.js';
import { localStore } from './safe-storage.js';

// Endgame drills against Stockfish at full strength. Each drill has a goal:
//  'mate'    – checkmate within `limit` of your moves,
//  'promote' – promote a pawn and keep the new queen (it can't be taken at once),
//  'hold'    – you defend: survive `limit` moves without the opponent queening or mating.
// Stars: 3 at or under par, 2 within half again, 1 otherwise.
export const ENDGAME_KEY = 'vch.endgames';
export const DRILLS = [
  { id: 'kq-k', title: 'Mate with the queen', level: 'Beginner', goal: 'mate', fen: '8/8/8/4k3/8/8/8/4K2Q w - - 0 1', par: 10, limit: 30, tip: 'Use the queen to shrink the king\'s box a knight\'s move away, then bring your king. Watch out for stalemate.' },
  { id: 'kr-k', title: 'Mate with the rook', level: 'Beginner', goal: 'mate', fen: '8/8/8/4k3/8/8/8/R3K3 w - - 0 1', par: 16, limit: 50, tip: 'Cut the king off along a rank or file, walk your king up, and push the box smaller with checks only when the kings face each other.' },
  { id: 'kp-k-win', title: 'King in front: promote', level: 'Beginner', goal: 'promote', fen: '4k3/8/4K3/4P3/8/8/8/8 w - - 0 1', par: 6, limit: 20, tip: 'With your king on the sixth rank in front of the pawn, it wins whoever moves. Take the opposition and step aside.' },
  { id: 'kp-k-hold', title: 'Hold the draw: opposition', level: 'Intermediate', goal: 'hold', fen: '8/8/4k3/8/4K3/4P3/8/8 w - - 0 1', par: 25, limit: 25, tip: 'Stay in front of the pawn and take the opposition whenever the white king steps up. When the pawn reaches your rank, go straight back.' },
  { id: 'lucena', title: 'Lucena: build a bridge', level: 'Advanced', goal: 'promote', fen: '1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1', par: 10, limit: 30, tip: 'Check the king away, then put your rook on the fourth rank: it will block the checks when your king comes out.' },
  { id: 'kbb-k', title: 'Mate with two bishops', level: 'Advanced', goal: 'mate', fen: '8/8/8/4k3/8/8/8/2B1KB2 w - - 0 1', par: 20, limit: 50, tip: 'Bishops side by side make a wall. Drive the king to a corner, then mate with your king close.' },
];
export const drillById = id => DRILLS.find(d => d.id === id) || null;
export const yourColor = drill => drill.goal === 'hold' ? (drill.fen.split(' ')[1] === 'w' ? 'b' : 'w') : drill.fen.split(' ')[1];

// After a move: {done:false} or {done:true, success, reason}.
export function drillStatus(drill, chess, yourMoves, lastMove = null) {
  const me = yourColor(drill), them = me === 'w' ? 'b' : 'w';
  if (chess.isCheckmate()) { const loser = chess.turn(); return loser === them ? { done: true, success: true, reason: 'mate' } : { done: true, success: false, reason: 'mated' }; }
  if (drill.goal === 'hold') {
    const queen = chess.board().flat().some(p => p && p.color === them && p.type === 'q');
    if (queen) return { done: true, success: false, reason: 'queened' };
    if (chess.isDraw() || chess.isInsufficientMaterial()) return { done: true, success: true, reason: 'draw' };
    if (yourMoves >= drill.limit) return { done: true, success: true, reason: 'held' };
    return { done: false };
  }
  if (chess.isDraw()) return { done: true, success: false, reason: chess.isStalemate() ? 'stalemate' : 'draw' };
  if (drill.goal === 'promote' && lastMove?.promotion && lastMove.color === me) {
    const safe = !chess.moves({ verbose: true }).some(m => m.to === lastMove.to && m.captured);
    if (safe) return { done: true, success: true, reason: 'promoted' };
  }
  const mine = chess.board().flat().filter(p => p && p.color === me && p.type !== 'k').length;
  if (!mine) return { done: true, success: false, reason: 'lost material' };
  if (yourMoves >= drill.limit) return { done: true, success: false, reason: 'out of moves' };
  return { done: false };
}
export function starsFor(drill, yourMoves, success) {
  if (!success) return 0;
  if (drill.goal === 'hold') return 3;
  return yourMoves <= drill.par ? 3 : yourMoves <= Math.ceil(drill.par * 1.5) ? 2 : 1;
}
export function loadProgress(storage = localStore) { try { return JSON.parse(storage?.getItem(ENDGAME_KEY) || '{}') || {}; } catch { return {}; } }
export function saveStars(id, stars, storage = localStore) {
  const p = loadProgress(storage); if (stars > (p[id] || 0)) p[id] = stars;
  try { storage?.setItem(ENDGAME_KEY, JSON.stringify(p)); } catch {}
  return p;
}
export const startPosition = drill => new Chess(drill.fen);
