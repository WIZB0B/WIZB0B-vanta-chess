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
  Bullet: 'Under three minutes a game. Pure speed: instinct over calculation.',
  Blitz: 'Three to eight minutes. Quick, but time to spot a tactic.',
  Rapid: 'Ten minutes or more. Time to think, still one sitting.',
  Classical: 'Long games for deep thinking.',
};

// [selector, title or null (the element's label), text or (element) => text]
export const GUIDE = [
  // Sections
  ['[data-nav="play"]', 'Play', 'Play a live game: a quick match with someone near your rating, a private room for a friend, or the computer.'],
  ['[data-nav="arena"]', 'Arena', 'Tournaments: timed arenas where every win scores, Swiss events, and simuls where one player takes on everyone.'],
  ['[data-nav="watch"]', 'Watch', 'Follow live VCH games move by move, and see which chess streamers are live right now.'],
  ['[data-nav="friends"]', 'Community', 'Friends, your rivals, clubs and the league.'],
  ['[data-nav="puzzles"]', 'Puzzles', 'Rated puzzles, the daily puzzle, Puzzle Streak, Survival against the clock and Puzzle Battles.'],
  ['[data-nav="learn"]', 'Learn', 'Interactive courses from the rules to strategy, famous games to guess, endgame drills and today\'s training.'],
  ['[data-nav="openings"]', 'Openings', 'The opening library, what VCH players choose in each position, and your own repertoire to drill.'],
  ['[data-nav="famous"]', 'Famous Games', 'Classics from Anderssen to Carlsen: replay them, or find the master\'s move yourself.'],
  ['[data-nav="review"]', 'Review', 'Your finished games, each with its story, accuracy and turning points, and drills made from your mistakes.'],
  ['#searchBtn', 'Search', 'Find openings, famous games and lessons.'],
  ['#notifyBtn', 'Notifications', 'Challenges, tournament rounds and messages for you.'],
  ['#accountBtn', 'Your profile', 'Your ratings, portrait, name, flag and About line.'],
  // Ways to play
  ['[data-mode="match"]', 'Match', 'Paired in seconds with a player near your rating. Choose the time and the variant; rated games need an account.'],
  ['[data-mode="room"]', 'Room', 'A private game with a link to share. Guests can join casual rooms.'],
  ['[data-mode="computer"]', 'Computer', 'Stockfish 19 or Lozza 2.5 at the level you choose, the Vanta Campaign, the Gauntlet, or a bot built from your own games.'],
  ['[data-match-time]', el => timeControlName(el.dataset.matchTime), el => TIME_TEXT[String(timeControlName(el.dataset.matchTime) || '').split(' ·')[0]] || ''],
  ['[data-match-rated="false"]', 'Casual', 'No rating change. Guests welcome.'],
  ['[data-match-rated="true"]', 'Rated', 'Your rating in this pool moves with the result. Needs an account.'],
  // Variants
  ['[data-match-variant="standard"],[data-computer-variant="standard"]', 'Standard', 'Classic chess.'],
  ['[data-match-variant="dark"],[data-computer-variant="dark"]', 'Vanta Dark', 'Fog of war: you see your own pieces and the squares they can reach, and any piece that checks you. Own rating.'],
  ['[data-match-variant="blackout"],[data-computer-variant="blackout"]', 'Blackout Blitz', 'After every four of your moves the lights go out, and your next two moves are played blind. Own rating.'],
  ['[data-computer-variant="freestyle"]', 'Freestyle 960', 'Chess960: the pieces behind the pawns start shuffled, so opening theory is left behind.'],
  // The computer
  ['.bot-card', el => el.querySelector('b')?.textContent || null, el => el.querySelector('.bot-engine')?.dataset.about || ''],
  ['[data-coach="on"],[data-coach="off"]', 'Coach', 'Short tips from a coach while you play the computer.'],
  ['.computer-shadow', 'Your Shadow', 'A bot that plays your own openings, at your strength.'],
  ['.computer-gauntlet', 'The Vanta Gauntlet', 'Seven bots in a row with three lives. How far can you go?'],
  ['.computer-campaign', 'The Vanta Campaign', 'Five realms, each with its own board, weather and music. Beat two guards, then the boss, whose battle bends the rules.'],
  // Puzzles
  ['.start-streak', 'Puzzle Streak', 'Puzzles get harder as you go. No time limit; one wrong move ends the run.'],
  ['.start-survival', 'Survival', 'Like the Streak, but each puzzle has a countdown that gets shorter. A wrong move or the clock ends the run.'],
  ['.start-battle', 'Puzzle Battle', 'Race a friend for three minutes through the same puzzles. Three misses and you are out.'],
  ['.daily-puzzle', 'Daily puzzle', 'One puzzle a day, the same for everyone.'],
  ['.skip-puzzle', 'Skip token', 'Skip a puzzle without ending the run. You get one more each day you visit and one for every 10 solved in a run.'],
  // Community
  ['[data-community="friends"]', 'Friends', 'Follow players, see who is online, and challenge them.'],
  ['[data-community="rivals"]', 'Rivals', 'The players you meet most, with your score against each.'],
  ['[data-community="clubs"]', 'Clubs', 'Join a club to chat with its members and climb the club league together.'],
  ['[data-community="league"]', 'League', 'A season in divisions: rated games earn points, the top players move up and the bottom ones down.'],
  // Watch
  ['[data-watch-tab="games"]', 'VCH games', 'Live games on VCH you can follow move by move.'],
  ['[data-watch-tab="streams"]', 'Streamers live', 'Chess streamers broadcasting right now. Opens their stream.'],
  // The game panel
  ['[data-tab="moves"]', 'Moves', 'The move list. Click a move to look back at that position.'],
  ['[data-tab="analysis"]', 'Analysis', 'Stockfish\'s evaluation and best line for the position. Off for both players while a live game is on.'],
  ['[data-tab="openings"]', 'Openings', 'The opening library, what VCH players choose in each position, and your own repertoire to drill.'],
  ['[data-tab="famous"]', 'Famous Games', 'Classics from Anderssen to Carlsen: replay them, or find the master\'s move yourself.'],
  ['.arena-create', 'Create a tournament', 'Set up an arena or a Swiss event and invite players.'],
  ['.simul-open', 'Simuls', 'One host plays many boards at once.'],
  ['.archive-trainer', 'Opening trainer', 'Drills the moves where your games left your own repertoire.'],
  ['.archive-mistakes', 'Learn from your mistakes', 'Positions from your games where a better move was there, brought back until you find it.'],
  ['.archive-army', 'Your army', 'Pieces that served in many of your games, with their deeds.'],
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
