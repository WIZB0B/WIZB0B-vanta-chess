// The computer ladder (owner request 2026-10-13): twelve levels named the way chess players
// describe strength, from Beginner to Maximum. Each says how it plays, in chess terms; none
// names the program behind it. All levels are played by Stockfish 19 at its rating setting
// (src/engine-config.js node budgets); the three lowest also make a beginner's mistakes on
// purpose (`slip`: the share of moves picked like a beginner would, not by the engine), because
// even Stockfish's weakest setting plays near 1000.
//
// How strength is shown (owner feedback 2026-10-13: no chess pieces as difficulty): the way
// chess sites do it. Lichess numbers its computer levels; chess.com groups opponents into
// Beginner, Intermediate, Advanced and Master by rating (VCH's tiers: Beginner, Intermediate,
// Advanced, Masters, Full strength). VCH shows a level number (1 to 12) on
// a strength gauge, the rating, the tier, and the FIDE title (CM, IM, GM) a player of that
// strength would hold.

export const COMPUTER_LEVELS = Object.freeze([
  { slug: 'beginner', name: 'Beginner', elo: 400, level: 1, tier: 'Beginner', title: '', slip: 0.45,
    about: 'Knows how the pieces move and little more. Leaves pieces hanging, misses mate in one and grabs anything it can capture.' },
  { slug: 'novice', name: 'Novice', elo: 700, level: 2, tier: 'Beginner', title: '', slip: 0.25,
    about: 'Brings out a piece or two, then drifts. Falls for forks and pins and often forgets to castle.' },
  { slug: 'casual', name: 'Casual Player', elo: 900, level: 3, tier: 'Beginner', title: '', slip: 0.1,
    about: 'Plays sensible openings and sees one-move threats, but still drops material when the position gets busy.' },
  { slug: 'club', name: 'Club Player', elo: 1200, level: 4, tier: 'Intermediate', title: '', slip: 0,
    about: 'Castles early, fights for the centre and spots two-move tactics. Endgames are its weak spot.' },
  { slug: 'tournament', name: 'Tournament Player', elo: 1500, level: 5, tier: 'Intermediate', title: '', slip: 0,
    about: 'Knows its openings and punishes loose pieces. Can be outplayed in a long strategic game.' },
  { slug: 'strong-club', name: 'Strong Club Player', elo: 1800, level: 6, tier: 'Advanced', title: '', slip: 0,
    about: 'Rarely blunders outright. Makes plans, takes open files and outposts, and converts an extra pawn.' },
  { slug: 'expert', name: 'Expert', elo: 2000, level: 7, tier: 'Advanced', title: '', slip: 0,
    about: 'Calculates several moves deep and defends stubbornly. You need a real plan to beat it.' },
  { slug: 'candidate-master', name: 'Candidate Master', elo: 2200, level: 8, tier: 'Masters', title: 'CM', slip: 0,
    about: 'Sharp in tactics and patient in the endgame. Every small weakness you allow gets targeted.' },
  { slug: 'international-master', name: 'International Master', elo: 2400, level: 9, tier: 'Masters', title: 'IM', slip: 0,
    about: 'Master-level preparation, deep calculation and clean endgame technique.' },
  { slug: 'grandmaster', name: 'Grandmaster', elo: 2600, level: 10, tier: 'Masters', title: 'GM', slip: 0,
    about: 'Turns the smallest edge into a win and holds positions most players would lose.' },
  { slug: 'super-grandmaster', name: 'Super Grandmaster', elo: 2800, level: 11, tier: 'Masters', title: 'GM', slip: 0,
    about: 'World-class precision. Every inaccuracy is punished.' },
  { slug: 'maximum', name: 'Maximum', elo: 3200, level: 12, tier: 'Full strength', title: '', slip: 0,
    about: 'Full strength, no handicap. The strongest opponent on VCH.' },
].map(level => Object.freeze(level)));

export const DEFAULT_LEVEL = 'tournament';
// The tiers in order, each with its rating range ("400–900").
export const LEVEL_TIERS = Object.freeze(['Beginner', 'Intermediate', 'Advanced', 'Masters', 'Full strength'].map(name => {
  const elos = COMPUTER_LEVELS.filter(level => level.tier === name).map(level => level.elo);
  return Object.freeze({ name, range: elos.length > 1 ? `${Math.min(...elos)}–${Math.max(...elos)}` : String(elos[0]) });
}));
export const levelBySlug = slug => COMPUTER_LEVELS.find(level => level.slug === slug) || null;

// The opponent object the rest of the app plays against.
export const levelBot = level => ({ slug: level.slug, display_name: level.name, elo: level.elo, level: level.level, tier: level.tier, title: level.title, slip: level.slip, about: level.about });

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
