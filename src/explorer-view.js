// Opening explorer rows: share of games and the results bar, from White's point of view.
export function explorerRows(moves = []) {
  const total = moves.reduce((s, m) => s + Number(m.games || 0), 0) || 1;
  return moves.map(m => {
    const g = Math.max(1, Number(m.games || 0));
    return { san: m.san, games: Number(m.games || 0), share: Math.round((100 * Number(m.games || 0)) / total), white: Math.round((100 * Number(m.white || 0)) / g), draws: Math.round((100 * Number(m.draws || 0)) / g), black: Math.round((100 * Number(m.black || 0)) / g) };
  });
}
