// Search budgets are fixed per bot level (nodes, not time), so a bot plays at the same
// strength on fast and slow devices. UCI_Elo / Skill Level still set its style per level.
export const BOT_NODE_LEVELS=[
  {maxElo:1000,nodes:20000},
  {maxElo:1300,nodes:40000},
  {maxElo:1600,nodes:80000},
  {maxElo:1900,nodes:150000},
  {maxElo:2300,nodes:250000},
  {maxElo:Infinity,nodes:400000}
];
export function botSearchNodes(elo){
  const value=Number(elo);const rating=Number.isFinite(value)?value:1500;
  return BOT_NODE_LEVELS.find(level=>rating<=level.maxElo).nodes;
}
// Live analysis: full strength, one search that deepens to ANALYSIS_MAX_DEPTH while the
// position is unchanged; the panel shows each depth Stockfish reports from 1 upward and
// treats the line as settled from ANALYSIS_MIN_DEPTH.
export const ANALYSIS_MIN_DEPTH=10;
export const ANALYSIS_MAX_DEPTH=18;
// Generous bot timeout: node budgets finish in ~1s on desktop, a few seconds on slow phones.
export const BOT_MOVE_TIMEOUT_MS=20000;
