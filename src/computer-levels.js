// The computer ladder (owner request 2026-10-13): twelve levels named the way chess players
// describe strength, from Beginner to Maximum. Each says how it plays, in chess terms; none
// names the program behind it. All levels are played by Stockfish 19 at its rating setting
// (src/engine-config.js node budgets); the three lowest also make a beginner's mistakes on
// purpose (`slip`: the share of moves picked like a beginner would, not by the engine), because
// even Stockfish's weakest setting plays near 1000.
//
// Portraits climb the pieces: White's pawn to king for the first six, Black's for the rest.

export const COMPUTER_LEVELS = Object.freeze([
  { slug: 'beginner', name: 'Beginner', elo: 400, portrait: 'wp', slip: 0.45,
    about: 'Knows how the pieces move and little more. Leaves pieces hanging, misses mate in one and grabs anything it can capture.' },
  { slug: 'novice', name: 'Novice', elo: 700, portrait: 'wn', slip: 0.25,
    about: 'Brings out a piece or two, then drifts. Falls for forks and pins and often forgets to castle.' },
  { slug: 'casual', name: 'Casual Player', elo: 900, portrait: 'wb', slip: 0.1,
    about: 'Plays sensible openings and sees one-move threats, but still drops material when the position gets busy.' },
  { slug: 'club', name: 'Club Player', elo: 1200, portrait: 'wr', slip: 0,
    about: 'Castles early, fights for the centre and spots two-move tactics. Endgames are its weak spot.' },
  { slug: 'tournament', name: 'Tournament Player', elo: 1500, portrait: 'wq', slip: 0,
    about: 'Knows its openings and punishes loose pieces. Can be outplayed in a long strategic game.' },
  { slug: 'strong-club', name: 'Strong Club Player', elo: 1800, portrait: 'wk', slip: 0,
    about: 'Rarely blunders outright. Makes plans, takes open files and outposts, and converts an extra pawn.' },
  { slug: 'expert', name: 'Expert', elo: 2000, portrait: 'bp', slip: 0,
    about: 'Calculates several moves deep and defends stubbornly. You need a real plan to beat it.' },
  { slug: 'candidate-master', name: 'Candidate Master', elo: 2200, portrait: 'bn', slip: 0,
    about: 'Sharp in tactics and patient in the endgame. Every small weakness you allow gets targeted.' },
  { slug: 'international-master', name: 'International Master', elo: 2400, portrait: 'bb', slip: 0,
    about: 'Master-level preparation, deep calculation and clean endgame technique.' },
  { slug: 'grandmaster', name: 'Grandmaster', elo: 2600, portrait: 'br', slip: 0,
    about: 'Turns the smallest edge into a win and holds positions most players would lose.' },
  { slug: 'super-grandmaster', name: 'Super Grandmaster', elo: 2800, portrait: 'bq', slip: 0,
    about: 'World-class precision. Every inaccuracy is punished.' },
  { slug: 'maximum', name: 'Maximum', elo: 3200, portrait: 'bk', slip: 0,
    about: 'Full strength, no handicap. The strongest opponent on VCH.' },
].map(level => Object.freeze(level)));

export const DEFAULT_LEVEL = 'tournament';
export const levelBySlug = slug => COMPUTER_LEVELS.find(level => level.slug === slug) || null;

// The opponent object the rest of the app plays against (slug, display_name, elo, portrait).
export const levelBot = level => ({ slug: level.slug, display_name: level.name, elo: level.elo, portrait: level.portrait, slip: level.slip, about: level.about });

// A beginner's move, for the share of moves the low levels play "by hand": a capture or a
// check when one is there (beginners grab material and give checks), otherwise any move.
// `moves` are chess.js verbose moves; `random` returns [0, 1).
export function beginnerMove(moves = [], random = Math.random) {
  if (!moves.length) return null;
  const pick = list => list[Math.floor(random() * list.length)];
  const grabs = moves.filter(m => m.captured || /[+#]/.test(m.san || ''));
  return grabs.length && random() < 0.6 ? pick(grabs) : pick(moves);
}

// Names the server's queue-fallback bots used before (so old games against them are still
// recognised as computer games).
export const OLD_BOT_NAMES = Object.freeze(['scout', 'forge', 'gambit', 'cipher', 'warden', 'oracle', 'apex', 'legend', 'fruitwood', 'ironbark']);
