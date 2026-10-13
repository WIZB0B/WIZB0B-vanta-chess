// The engines VCH plays and reviews with (round 13), and which one each opponent uses.
// All three are open source and run in this browser, in their own workers:
// - Stockfish 19 (GPL-3.0): the strongest open-source engine. Plays every computer level from
//   800 up (Skill Level below 1320, UCI_Elo above), the blind computer of Vanta Dark and
//   Blackout Blitz (it can be told which moves it may choose) and Chess960. Analysis and review.
// - Lozza 2.5 (MIT, Colin Jenkins): a JavaScript engine with a hand-tuned evaluation inspired by
//   Fruit 2.1, so it judges positions differently from Stockfish. It plays standard chess at a
//   fixed node budget; it has no Elo setting, so its levels were measured (see LOZZA_LEVELS).
// - Multi-Variant Stockfish 10 (GPL-3.0): Crazyhouse play and review.

export const ENGINES = Object.freeze({
  stockfish19: Object.freeze({ id: 'stockfish19', name: 'Stockfish 19', license: 'GPL-3.0', worker: '/stockfish.worker.js',
    about: 'The strongest open-source engine. Plays every level, plays blind in the fog modes, and reviews your games.' }),
  lozza: Object.freeze({ id: 'lozza', name: 'Lozza 2.5', license: 'MIT', worker: '/lozza.worker.js',
    about: 'A JavaScript engine with a hand-tuned, Fruit-style evaluation: it weighs positions its own way.' }),
  stockfishMv: Object.freeze({ id: 'stockfishMv', name: 'Multi-Variant Stockfish 10', license: 'GPL-3.0', worker: '/variant.worker.js',
    about: 'Plays and reviews Crazyhouse, where captured pieces come back as drops.' }),
});

// Lozza's strength by node budget, measured on 2026-10-12 against Stockfish 19 at VCH's bot
// settings (public/stockfish.worker.js: UCI_Elo and the node budgets of src/engine-config.js),
// 16 games per level from ten common openings, both colours. The Elo is on Stockfish's UCI_Elo
// scale (the one VCH's other computer levels use) and is accurate to about ±150.
// Re-measure with scripts/calibrate-lozza.mjs.
export const LOZZA_LEVELS = Object.freeze([
  Object.freeze({ elo: 1310, nodes: 200 }),
  Object.freeze({ elo: 1540, nodes: 500 }),
  Object.freeze({ elo: 1780, nodes: 1000 }),
  Object.freeze({ elo: 2090, nodes: 3000 }),
  Object.freeze({ elo: 2290, nodes: 10000 }),
  Object.freeze({ elo: 2560, nodes: 40000 }),
]);
export const LOZZA_MIN_ELO = LOZZA_LEVELS[0].elo;
export const LOZZA_MAX_ELO = LOZZA_LEVELS.at(-1).elo;

// The node budget for a Lozza opponent of `elo` (between measured levels, on a log scale).
export function lozzaNodes(elo) {
  const e = Number.isFinite(Number(elo)) ? Number(elo) : 1800;
  if (e <= LOZZA_MIN_ELO) return LOZZA_LEVELS[0].nodes;
  if (e >= LOZZA_MAX_ELO) return LOZZA_LEVELS.at(-1).nodes;
  const i = LOZZA_LEVELS.findIndex(l => l.elo >= e), a = LOZZA_LEVELS[i - 1], b = LOZZA_LEVELS[i];
  const t = (e - a.elo) / (b.elo - a.elo);
  return Math.round(Math.exp(Math.log(a.nodes) + t * (Math.log(b.nodes) - Math.log(a.nodes))));
}
// Lozza searches the same way every time; a little spread in its budget keeps it from
// replaying the same game move for move. `random` is in [0, 1).
export const lozzaBudget = (elo, random = Math.random()) => Math.max(100, Math.round(lozzaNodes(elo) * (0.8 + 0.4 * random)));

// Which engine plays a computer opponent under `rules` ('standard', 'freestyle', 'dark',
// 'blackout'). Lozza plays standard chess within its measured range; everything else is
// Stockfish 19 (it alone can play blind with a restricted move list, and Chess960).
export function engineFor(bot, rules = 'standard') {
  const elo = Number(bot?.elo || bot?.rating || 0);
  if (bot?.engine === 'lozza' && rules === 'standard' && elo >= LOZZA_MIN_ELO && elo <= LOZZA_MAX_ELO) return 'lozza';
  return 'stockfish19';
}
export const engineName = id => ENGINES[id]?.name || ENGINES.stockfish19.name;
