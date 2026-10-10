// Phone layout ("app shell"). Desktop is untouched; below MOBILE_MAX_WIDTH the site behaves
// like the lichess / chess.com apps:
//   home    the Play screen (match, room, computer), bottom tab bar
//   panel   a section (Puzzles, Learn, Games, ...), bottom tab bar
//   game    the board alone: no page scroll, no tab bar, an action bar at the bottom
//   review  a finished game's review: board, then the review panel below (scrolls)
// src/main.js decides the view; this file holds the pure parts.

export const MOBILE_MAX_WIDTH = 760;
export const MOBILE_QUERY = `(max-width: ${MOBILE_MAX_WIDTH}px)`;
export const VIEWS = ['home', 'panel', 'game', 'review'];
export const TABS = ['play', 'puzzles', 'learn', 'famous', 'more'];

// Which view a tab opens. Play returns to a game in progress.
export function viewForTab(tab, { gameLive = false } = {}) {
  if (tab === 'play') return gameLive ? 'game' : 'home';
  if (tab === 'more') return null; // opens a sheet, the view stays
  return 'panel';
}

// The compact move strip under the board: "1. e4 e5 2. Nf3 ...", newest last.
export function moveStripItems(sans = []) {
  return sans.map((san, ply) => ({ ply: ply + 1, san: String(san || ''), number: ply % 2 === 0 ? `${ply / 2 + 1}.` : '' }));
}

const esc = value => String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
export function moveStripHtml(sans = [], viewing = null) {
  const items = moveStripItems(sans);
  if (!items.length) return '<span class="m-moves-empty">Moves appear here</span>';
  return items.map((item, i) => `${item.number ? `<i>${item.number}</i>` : ''}<b data-ply="${item.ply}"${(viewing === null ? i === items.length - 1 : item.ply === viewing) ? ' class="last"' : ''}>${esc(item.san)}</b>`).join('');
}
