// Accessibility: moves and clocks in words, for the screen-reader live region and for
// reading aloud. Moves are chess.js verbose moves ({color, piece, from, to, captured,
// promotion, san}); castles from Chess960 games carry castle:true and a SAN of O-O / O-O-O.

const WORDS = {
  en: { side: { w: 'White', b: 'Black' }, piece: { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' }, takes: 'takes', to: '', check: 'check', mate: 'checkmate', short: 'castles kingside', long: 'castles queenside', promotes: 'promotes to' },
  fr: { side: { w: 'Blancs', b: 'Noirs' }, piece: { p: 'pion', n: 'cavalier', b: 'fou', r: 'tour', q: 'dame', k: 'roi' }, takes: 'prend en', to: 'en', check: 'échec', mate: 'échec et mat', short: 'petit roque', long: 'grand roque', promotes: 'promotion en' },
  es: { side: { w: 'Blancas', b: 'Negras' }, piece: { p: 'peón', n: 'caballo', b: 'alfil', r: 'torre', q: 'dama', k: 'rey' }, takes: 'captura en', to: 'a', check: 'jaque', mate: 'jaque mate', short: 'enroque corto', long: 'enroque largo', promotes: 'corona' },
  pt: { side: { w: 'Brancas', b: 'Pretas' }, piece: { p: 'peão', n: 'cavalo', b: 'bispo', r: 'torre', q: 'dama', k: 'rei' }, takes: 'captura em', to: 'para', check: 'xeque', mate: 'xeque-mate', short: 'roque pequeno', long: 'roque grande', promotes: 'promove a' },
  ar: { side: { w: 'الأبيض', b: 'الأسود' }, piece: { p: 'البيدق', n: 'الحصان', b: 'الفيل', r: 'الرخ', q: 'الوزير', k: 'الملك' }, takes: 'يأخذ في', to: 'إلى', check: 'كش', mate: 'كش مات', short: 'تبييت قصير', long: 'تبييت طويل', promotes: 'يترقى إلى' },
  de: { side: { w: 'Weiß', b: 'Schwarz' }, piece: { p: 'Bauer', n: 'Springer', b: 'Läufer', r: 'Turm', q: 'Dame', k: 'König' }, takes: 'schlägt auf', to: 'nach', check: 'Schach', mate: 'Schachmatt', short: 'kurze Rochade', long: 'lange Rochade', promotes: 'Umwandlung in' },
  it: { side: { w: 'Bianco', b: 'Nero' }, piece: { p: 'pedone', n: 'cavallo', b: 'alfiere', r: 'torre', q: 'donna', k: 're' }, takes: 'prende in', to: 'in', check: 'scacco', mate: 'scacco matto', short: 'arrocco corto', long: 'arrocco lungo', promotes: 'promuove a' },
  ru: { side: { w: 'Белые', b: 'Чёрные' }, piece: { p: 'пешка', n: 'конь', b: 'слон', r: 'ладья', q: 'ферзь', k: 'король' }, takes: 'бьёт на', to: 'на', check: 'шах', mate: 'мат', short: 'короткая рокировка', long: 'длинная рокировка', promotes: 'превращение:' },
  // Verb-final languages read "piece square takes" (post: true).
  tr: { side: { w: 'Beyaz', b: 'Siyah' }, piece: { p: 'piyon', n: 'at', b: 'fil', r: 'kale', q: 'vezir', k: 'şah' }, takes: 'alır', post: true, to: '', check: 'şah', mate: 'şah mat', short: 'kısa rok', long: 'uzun rok', promotes: 'terfi:' },
  zh: { side: { w: '白方', b: '黑方' }, piece: { p: '兵', n: '马', b: '象', r: '车', q: '后', k: '王' }, takes: '吃', to: '到', check: '将军', mate: '将死', short: '短易位', long: '长易位', promotes: '升变为' },
  ja: { side: { w: '白', b: '黒' }, piece: { p: 'ポーン', n: 'ナイト', b: 'ビショップ', r: 'ルーク', q: 'クイーン', k: 'キング' }, takes: 'で取る', post: true, to: '', check: 'チェック', mate: 'チェックメイト', short: 'キングサイドにキャスリング', long: 'クイーンサイドにキャスリング', promotes: '昇格:' },
  hi: { side: { w: 'सफ़ेद', b: 'काला' }, piece: { p: 'प्यादा', n: 'घोड़ा', b: 'ऊँट', r: 'हाथी', q: 'वज़ीर', k: 'राजा' }, takes: 'पर मारता है', post: true, to: '', check: 'शह', mate: 'शह-मात', short: 'छोटी कैसलिंग', long: 'बड़ी कैसलिंग', promotes: 'प्रमोशन:' },
};
export const SPEECH_LANG = { en: 'en-US', fr: 'fr-FR', es: 'es-ES', pt: 'pt-BR', ar: 'ar-SA', de: 'de-DE', it: 'it-IT', ru: 'ru-RU', tr: 'tr-TR', zh: 'zh-CN', ja: 'ja-JP', hi: 'hi-IN' };

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
    body = move.captured ? (w.post ? `${piece} ${move.to} ${w.takes}` : `${piece} ${w.takes} ${move.to}`) : `${piece} ${w.to ? w.to + ' ' : ''}${move.to}`;
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
