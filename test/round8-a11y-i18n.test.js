import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { resolveTypedMove } from '../src/typed-move.js';
import { clockAnnouncement, spokenMove } from '../src/a11y.js';
import { DICTIONARY, loadLanguage, translateText } from '../src/i18n.js';

const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const san = (fen, text) => { const c = new Chess(fen); const r = resolveTypedMove(c, text); return r.move ? r.move.san : r.error; };

test('typed moves: SAN in any case, coordinates, castling with O or 0, promotions', () => {
  const start = new Chess().fen();
  assert.equal(san(start, 'Nf3'), 'Nf3'); assert.equal(san(start, 'nf3'), 'Nf3'); assert.equal(san(start, 'e4'), 'e4');
  assert.equal(san(start, 'e2e4'), 'e4'); assert.equal(san(start, 'g1-f3'), 'Nf3'); assert.equal(san(start, 'Ngf3'), 'Nf3');
  assert.equal(san(start, 'e5'), 'illegal'); assert.equal(san(start, 'hello'), 'unreadable'); assert.equal(san(start, '  '), 'empty');
  const castle = 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1';
  assert.equal(san(castle, '0-0'), 'O-O'); assert.equal(san(castle, 'o-o-o'), 'O-O-O'); assert.equal(san(castle, 'OO'), 'O-O');
  const knights = '4k3/8/8/8/8/8/8/1N2KN2 w - - 0 1';
  assert.equal(san(knights, 'Nd2'), 'ambiguous'); assert.equal(san(knights, 'Nbd2'), 'Nbd2'); assert.equal(san(knights, 'nfd2'), 'Nfd2');
  const promo = '8/4P3/8/8/8/8/k7/4K3 w - - 0 1';
  assert.equal(san(promo, 'e8=Q'), 'e8=Q'); assert.equal(san(promo, 'e8q'), 'e8=Q'); assert.equal(san(promo, 'e8N'), 'e8=N'); assert.equal(san(promo, 'e7e8r'), 'e8=R'); assert.equal(san(promo, 'e8'), 'e8=Q');
  const bpawn = 'k7/8/8/8/8/2p5/1P6/K1B5 w - - 0 1'; // bxc3 is the pawn; bishop can't reach c3
  assert.equal(san(bpawn, 'bxc3'), 'bxc3');
  const bishop = 'k7/8/8/8/8/8/8/K1B5 w - - 0 1';
  assert.equal(san(bishop, 'bd2'), 'Bd2', 'lowercase b falls back to the bishop');
  assert.equal(san(start, 'Qh5+'), 'illegal');
});
test('moves and clocks in words, in every language', () => {
  const c = new Chess(); const m = c.move('e4');
  assert.equal(spokenMove(m, 'en'), 'White pawn e4');
  c.move('d5'); const x = c.move('exd5');
  assert.equal(spokenMove(x, 'en'), 'White pawn takes d5');
  assert.equal(spokenMove(x, 'fr'), 'Blancs pion prend en d5');
  assert.equal(spokenMove({ color: 'b', piece: 'k', san: 'O-O-O' }, 'es'), 'Negras enroque largo');
  assert.equal(spokenMove({ color: 'w', piece: 'q', to: 'f7', captured: 'p', san: 'Qxf7#' }, 'en'), 'White queen takes f7, checkmate');
  assert.equal(spokenMove({ color: 'w', piece: 'p', to: 'e8', promotion: 'q', san: 'e8=Q+' }, 'pt'), 'Brancas peão para e8, promove a dama, xeque');
  assert.ok(spokenMove(m, 'ar').startsWith('الأبيض'));
  assert.equal(spokenMove({ color: 'b', piece: 'r', to: 'd1', san: 'Rd1' }, 'ar'), 'الأسود الرخ إلى d1', 'the rook is الرخ, not a castle');
  assert.equal(spokenMove(x, 'de'), 'Weiß Bauer schlägt auf d5');
  assert.equal(spokenMove({ color: 'w', piece: 'k', san: 'O-O' }, 'it'), 'Bianco arrocco corto');
  assert.equal(spokenMove({ color: 'b', piece: 'n', to: 'f6', san: 'Nf6+' }, 'ru'), 'Чёрные конь на f6, шах');
  assert.equal(spokenMove(x, 'tr'), 'Beyaz piyon d5 alır');
  assert.equal(spokenMove(x, 'ja'), '白 ポーン d5 で取る');
  assert.equal(spokenMove({ color: 'w', piece: 'q', to: 'f7', captured: 'p', san: 'Qxf7#' }, 'zh'), '白方 后 吃 f7, 将死');
  assert.equal(spokenMove({ color: 'w', piece: 'n', to: 'f3', san: 'Nf3' }, 'hi'), 'सफ़ेद घोड़ा f3');
  assert.equal(clockAnnouncement(61, 59.5), '1 minute left'); assert.equal(clockAnnouncement(31, 30), '30 seconds left');
  assert.equal(clockAnnouncement(10.2, 9.9), '10 seconds left'); assert.equal(clockAnnouncement(9, 8), null); assert.equal(clockAnnouncement(null, 8), null);
});
test('translations: lazy rows, patterns and " · " parts', async () => {
  await Promise.all(['fr', 'es', 'pt', 'ar'].map(loadLanguage));
  for (const lang of ['fr', 'es', 'pt', 'ar']) for (const [en, t] of DICTIONARY[lang]) assert.ok(typeof t === 'string' && t.trim(), `empty ${lang} translation for ${en}`);
  assert.equal(translateText('You won · by checkmate', 'fr'), 'Vous avez gagné · par échec et mat');
  assert.equal(translateText('Round 3 is ready', 'es'), 'La ronda 3 está lista');
  assert.equal(translateText('Watching Ana vs Bo', 'pt'), 'Assistindo Ana contra Bo');
  assert.equal(translateText('Game over · 1-0 · on time', 'fr'), 'Partie terminée · 1-0 · au temps');
  assert.equal(translateText('Joshua · 1500', 'fr'), null, 'names and numbers stay');
  assert.equal(translateText('30 seconds left', 'ar'), 'تبقّى 30 ثانية');
  assert.ok(translateText('Opening principles', 'es'), 'lessons are translated');
  assert.ok(translateText('That move is not legal here', 'fr'));
  assert.match(main, /loadLanguage\(wanted\)\.then\(\(\)=>\{if\(uiLang===wanted\)translateTree\(document\.body,uiLang\)\}\)/, 'each dictionary loads only when its language is chosen');
  assert.doesNotMatch(main, /i18n-more|(import\(|from )['"]\.\/locales\//, 'main.js never pulls a dictionary in itself');
});
test('wiring: typed-move form, live region outside translation, speech toggle', () => {
  assert.match(main, /<form id="typeMoveForm" class="type-move"/);
  assert.match(main, /<div id="a11yLive" class="sr-only" aria-live="polite" aria-atomic="true" data-no-i18n><\/div>/);
  assert.match(main, /id="speakMoves" type="checkbox"/);
  assert.match(main, /if\(before\.key!==key\|\|count!==before\.count\+1\|\|browse\)return;/, 'only a newly played move is read');
});
