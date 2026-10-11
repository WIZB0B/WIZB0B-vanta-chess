// Opening explorer rows: share of games and the results bar, from White's point of view.
export function explorerRows(moves = []) {
  const total = moves.reduce((s, m) => s + Number(m.games || 0), 0) || 1;
  return moves.map(m => {
    const g = Math.max(1, Number(m.games || 0));
    return { san: m.san, games: Number(m.games || 0), share: Math.round((100 * Number(m.games || 0)) / total), white: Math.round((100 * Number(m.white || 0)) / g), draws: Math.round((100 * Number(m.draws || 0)) / g), black: Math.round((100 * Number(m.black || 0)) / g) };
  });
}

// Engine scores for explorer rows. Stockfish runs with MultiPV and `searchmoves` limited
// to the listed moves, so every row gets its own score. Scores are from White's side.
export function parseMultiPv(line, fen) {
  const text = String(line || '');
  if (!text.startsWith('info ') || !/\bpv /.test(text)) return null;
  const score = /\bscore (cp|mate) (-?\d+)/.exec(text); if (!score) return null;
  const blackToMove = String(fen || '').split(' ')[1] === 'b', sign = blackToMove ? -1 : 1;
  const uci = /\bpv ([a-h][1-8][a-h][1-8][qrbn]?)/.exec(text)?.[1]; if (!uci) return null;
  const n = Number(score[2]) * sign;
  return { multipv: Number(/\bmultipv (\d+)/.exec(text)?.[1] || 1), depth: Number(/\bdepth (\d+)/.exec(text)?.[1] || 0), uci, cp: score[1] === 'cp' ? n : null, mate: score[1] === 'mate' ? n : null };
}
export function formatScore(s) {
  if (!s) return '…';
  if (s.mate !== null && s.mate !== undefined) return s.mate === 0 ? '#' : `${s.mate > 0 ? '' : '−'}#${Math.abs(s.mate)}`;
  const v = s.cp / 100;
  return `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(1)}`;
}
// A number for sorting and colouring: mate is huge, positive favours White.
export const scoreValue = s => (!s ? 0 : s.mate !== null && s.mate !== undefined ? Math.sign(s.mate || 1) * (100000 - Math.abs(s.mate)) : s.cp);
