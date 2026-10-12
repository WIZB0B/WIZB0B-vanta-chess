// Accessibility: moves and clocks in words, for the screen-reader live region and for
// reading aloud. Moves are chess.js verbose moves ({color, piece, from, to, captured,
// promotion, san}); castles from Chess960 games carry castle:true and a SAN of O-O / O-O-O.

const WORDS = {
  en: { side: { w: 'White', b: 'Black' }, piece: { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' }, takes: 'takes', to: '', check: 'check', mate: 'checkmate', short: 'castles kingside', long: 'castles queenside', promotes: 'promotes to' },
  fr: { side: { w: 'Blancs', b: 'Noirs' }, piece: { p: 'pion', n: 'cavalier', b: 'fou', r: 'tour', q: 'dame', k: 'roi' }, takes: 'prend en', to: 'en', check: 'échec', mate: 'échec et mat', short: 'petit roque', long: 'grand roque', promotes: 'promotion en' },
  es: { side: { w: 'Blancas', b: 'Negras' }, piece: { p: 'peón', n: 'caballo', b: 'alfil', r: 'torre', q: 'dama', k: 'rey' }, takes: 'captura en', to: 'a', check: 'jaque', mate: 'jaque mate', short: 'enroque corto', long: 'enroque largo', promotes: 'corona' },
  pt: { side: { w: 'Brancas', b: 'Pretas' }, piece: { p: 'peão', n: 'cavalo', b: 'bispo', r: 'torre', q: 'dama', k: 'rei' }, takes: 'captura em', to: 'para', check: 'xeque', mate: 'xeque-mate', short: 'roque pequeno', long: 'roque grande', promotes: 'promove a' },
  ar: { side: { w: 'الأبيض', b: 'الأسود' }, piece: { p: 'البيدق', n: 'الحصان', b: 'الفيل', r: 'القلعة', q: 'الوزير', k: 'الملك' }, takes: 'يأخذ في', to: 'إلى', check: 'كش', mate: 'كش مات', short: 'تبييت قصير', long: 'تبييت طويل', promotes: 'يترقى إلى' },
};
export const SPEECH_LANG = { en: 'en-US', fr: 'fr-FR', es: 'es-ES', pt: 'pt-BR', ar: 'ar-SA' };

// "White knight f3", "Black pawn takes d5, check", "White castles kingside, checkmate".
export function spokenMove(move, lang = 'en') {
  if (!move) return '';
  const w = WORDS[lang] || WORDS.en, san = String(move.san || '');
  const side = w.side[move.color] || '';
  let body;
  if (san.startsWith('O-O-O')) body = w.long;
  else if (san.startsWith('O-O')) body = w.short;
  else {
    const piece = w.piece[move.piece] || '';
    body = move.captured ? `${piece} ${w.takes} ${move.to}` : `${piece} ${w.to ? w.to + ' ' : ''}${move.to}`;
    if (move.promotion) body += `, ${w.promotes} ${w.piece[move.promotion] || ''}`;
  }
  const tail = san.endsWith('#') ? `, ${w.mate}` : san.endsWith('+') ? `, ${w.check}` : '';
  return `${side} ${body}${tail}`.replace(/\s+/g, ' ').trim();
}

// The clock line to announce when your own running clock crosses a minute, 30 or 10
// seconds (once each), else null. Values are seconds.
export const CLOCK_MARKS = [60, 30, 10];
export function clockAnnouncement(previous, now) {
  if (!Number.isFinite(previous) || !Number.isFinite(now)) return null;
  const mark = CLOCK_MARKS.find(m => previous > m && now <= m);
  if (!mark) return null;
  return mark === 60 ? '1 minute left' : `${mark} seconds left`;
}
