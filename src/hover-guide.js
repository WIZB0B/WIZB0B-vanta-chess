// Hover guide (round 13): a short description of every section, tab and game mode, shown when
// the mouse rests on it (or keyboard focus reaches it). One place for all of them, matched by
// selector, so the markup that draws each button stays as it is. Pure; src/main.js shows the
// card. Titles default to the button's own label; texts are translated like any other string.

const TIME_NAMES = [[180, 'Bullet'], [480, 'Blitz'], [1500, 'Rapid'], [Infinity, 'Classical']];
// "Blitz · 3+0" for data-match-time="180-0" (seconds-increment): Lichess's estimate,
// base + 40 × increment.
export function timeControlName(value) {
  const [base, inc] = String(value || '').split('-').map(Number);
  if (!Number.isFinite(base)) return null;
  const estimate = base + 40 * (Number(inc) || 0), name = TIME_NAMES.find(([max]) => estimate < max)[1];
  return `${name} · ${base >= 60 ? base / 60 : `${base}s`}+${Number(inc) || 0}`;
}
const TIME_TEXT = {
  Bullet: 'Under three minutes each. Quick hands and premoves matter as much as the moves.',
  Blitz: 'Three to eight minutes each. Fast openings, sharp tactics and scrambles when the clock runs low.',
  Rapid: 'Ten minutes or more each. Time to calculate the critical lines and still finish in one sitting.',
  Classical: 'Long games with time to think every move through.',
};

// Written the way chess players talk; no entry names the program behind an opponent.
// [selector, title or null (the element's label), text or (element) => text]
export const GUIDE = [
  // Sections
  ['[data-nav="play"]', 'Play', 'Start a game: get paired with someone near your rating, send a friend a private board, or take on the computer.'],
  ['[data-nav="arena"]', 'Arena', 'Tournaments. Arenas score every win until the time is up, Swiss events pair you round by round, and in a simul one player takes on many boards at once.'],
  ['[data-nav="watch"]', 'Watch', 'Follow live games on VCH move by move, and find chess streamers who are live right now.'],
  ['[data-nav="friends"]', 'Community', 'Your friends, your rivals and your score against them, clubs, and the league table.'],
  ['[data-nav="puzzles"]', 'Puzzles', 'Tactics training: rated puzzles at your level, the daily puzzle, Puzzle Streak, Survival and head-to-head Puzzle Battles.'],
  ['[data-nav="learn"]', 'Learn', 'Courses from the rules to strategy, endgame drills, famous games to solve, and a short training plan for today.'],
  ['[data-nav="openings"]', 'Openings', 'Opening lines and the ideas behind them, what VCH players choose in each position, and a repertoire you can build and drill.'],
  ['[data-nav="famous"]', 'Famous Games', 'Immortal games from Anderssen to Carlsen. Replay them, or take the winner\'s side and find the key moves yourself.'],
  ['[data-nav="review"]', 'Review', 'Every finished game with its accuracy, the moments that decided it and the moves you could have played, plus drills built from your own mistakes.'],
  ['#searchBtn', 'Search', 'Find an opening, a famous game or a lesson.'],
  ['#notifyBtn', 'Notifications', 'Challenges, tournament rounds and replies.'],
  ['#accountBtn', 'Your profile', 'Your ratings, game record, portrait, flag and About line.'],
  // Ways to play
  ['[data-mode="match"]', 'Match', 'Get paired in seconds with someone near your rating. Pick the time control and the variant; rated games need an account.'],
  ['[data-mode="room"]', 'Room', 'A private board with a link to send to a friend. Casual rooms are open to guests.'],
  ['[data-mode="computer"]', 'Computer', 'Twelve levels from Beginner to Maximum, plus the Vanta Campaign, the Gauntlet and a bot that plays your own openings.'],
  ['[data-match-time]', el => timeControlName(el.dataset.matchTime), el => TIME_TEXT[String(timeControlName(el.dataset.matchTime) || '').split(' ·')[0]] || ''],
  ['[data-match-rated="false"]', 'Casual', 'No rating change: a good place to try a new opening. Guests welcome.'],
  ['[data-match-rated="true"]', 'Rated', 'Your rating in this time control moves with the result. Needs an account.'],
  ['[data-computer-side="w"]', 'Play White', 'You move first.'],
  ['[data-computer-side="b"]', 'Play Black', 'The computer opens; you reply.'],
  ['[data-computer-side="random"]', 'Random side', 'White or Black, decided when the game starts.'],
  // Variants
  ['[data-match-variant="standard"],[data-computer-variant="standard"]', 'Standard', 'Normal rules from the normal starting position.'],
  ['[data-match-variant="dark"],[data-computer-variant="dark"]', 'Vanta Dark', 'Fog of war. You see only your own pieces and the squares they can move to; a piece that gives check is revealed. Normal rules, its own rating.'],
  ['[data-match-variant="blackout"],[data-computer-variant="blackout"]', 'Blackout Blitz', 'The lights go out: after every four of your moves, your next two are played from memory. Its own rating.'],
  ['[data-computer-variant="freestyle"]', 'Freestyle 960', 'Chess960: the pieces behind the pawns start in one of 960 shuffled setups, so you play from move one without opening theory.'],
  // The computer
  ['.bot-card', el => { const name = el.querySelector('b')?.textContent, elo = el.querySelector('small')?.textContent; return name ? (elo ? `${name} · ${elo}` : name) : null; }, el => el.dataset.about || ''],
  ['[data-coach="on"],[data-coach="off"]', 'Coach', 'After each of your moves, a short note on what the best move was doing: a threat, a capture, development, the centre.'],
  ['.computer-shadow', 'Your Shadow', 'A bot that plays the openings from your own games, at your rating.'],
  ['.computer-gauntlet', 'The Vanta Gauntlet', 'Seven opponents back to back with three lives. Lose a game, lose a life.'],
  ['.computer-campaign', 'The Vanta Campaign', 'Five realms with their own boards, weather and music. Beat two guards, then the boss, whose battle bends the rules.'],
  // Puzzles
  ['.start-streak', 'Puzzle Streak', 'Puzzles that get harder as you go, with no time limit. One wrong move ends the streak.'],
  ['.start-survival', 'Survival', 'Like the Streak, but each puzzle has a countdown that gets shorter. A wrong move or running out of time ends the run.'],
  ['.start-battle', 'Puzzle Battle', 'Race a friend through the same puzzles for three minutes. Three misses and you are out.'],
  ['.daily-puzzle', 'Daily puzzle', 'One puzzle a day, the same for everyone.'],
  ['.skip-puzzle', 'Skip token', 'Skips a puzzle without ending your run. You earn one each day you visit and one for every 10 puzzles solved in a run.'],
  // Community
  ['[data-community="friends"]', 'Friends', 'Players you follow: see who is online and send a challenge.'],
  ['[data-community="rivals"]', 'Rivals', 'The opponents you have met most, with your score against each.'],
  ['[data-community="clubs"]', 'Clubs', 'Join a club to chat with its members and climb the club league together.'],
  ['[data-community="league"]', 'League', 'A season in divisions. Rated games earn points; the top of each division moves up and the bottom moves down.'],
  // Watch
  ['[data-watch-tab="games"]', 'VCH games', 'Live games on VCH, move by move.'],
  ['[data-watch-tab="streams"]', 'Streamers live', 'Chess streamers broadcasting right now. Opens their stream.'],
  // The game panel
  ['[data-tab="moves"]', 'Moves', 'The score sheet. Click any move to see the position after it.'],
  ['[data-tab="analysis"]', 'Analysis', 'The evaluation and the best line for the position. Switched off for both players while a live game is on.'],
  ['[data-tab="openings"]', 'Openings', 'Opening lines and the ideas behind them, what VCH players choose in each position, and a repertoire you can build and drill.'],
  ['[data-tab="famous"]', 'Famous Games', 'Immortal games from Anderssen to Carlsen. Replay them, or take the winner\'s side and find the key moves yourself.'],
  ['.arena-create', 'Create a tournament', 'Set up an arena or a Swiss tournament with your own time control and invite players.'],
  ['.simul-open', 'Simuls', 'One player takes on many boards at once.'],
  ['.archive-trainer', 'Opening trainer', 'Drills the positions where your games left your repertoire, until you play the right move.'],
  ['.archive-mistakes', 'Learn from your mistakes', 'Positions from your games where you missed a better move, brought back until you find it.'],
  ['.archive-army', 'Your army', 'Your pieces\' careers across your games: captures, forks, checks and promotions.'],
  ['#openResonance', 'Resonance room', 'The music library as sand on a ringing plate: each theme draws its own Chladni figures, live.'],
  ['[data-resonance-theme]', null, 'Play this theme and watch the figure its music draws.'],
];

// The {title, text} for an element (or the nearest one that has an entry), or null.
export function guideFor(el) {
  for (let node = el; node && node.nodeType === 1; node = node.parentElement) {
    for (const [selector, title, text] of GUIDE) {
      if (!node.matches?.(selector)) continue;
      const t = typeof title === 'function' ? title(node) : title;
      const body = typeof text === 'function' ? text(node) : text;
      if (!body) return null;
      return { el: node, title: t || node.textContent.replace(/\s+/g, ' ').trim(), text: body };
    }
  }
  return null;
}
