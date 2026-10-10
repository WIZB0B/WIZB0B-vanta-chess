// Share a Game Story: a still card (PNG) or a short clip (WebM) drawn on a canvas in VCH's
// own style. Everything is drawn locally from the game's positions; nothing is uploaded.

export const CARD_W = 1080;
export const CARD_H = 1350;
const BOARD = 840, BOARD_X = (CARD_W - BOARD) / 2, BOARD_Y = 300;
const COLORS = { bg: '#07100f', panel: '#0d1718', light: '#d8cfb1', dark: '#29483d', gold: '#e5c17c', mint: '#79e7b0', text: '#eef3ef', muted: '#9ba8a5', lastFrom: 'rgba(229,193,124,.45)', lastTo: 'rgba(229,193,124,.62)' };
export const PIECE_FILES = ['wk', 'wq', 'wr', 'wb', 'wn', 'wp', 'bk', 'bq', 'br', 'bb', 'bn', 'bp'];
export const pieceUrl = code => `/assets/vch/pieces/${code}.webp`;

// The 64 squares of a FEN, a8 first: null or "wk"-style codes.
export function fenSquares(fen) {
  const rows = String(fen || '').split(' ')[0].split('/');
  const out = [];
  for (const row of rows) for (const ch of row) {
    if (/\d/.test(ch)) for (let i = 0; i < Number(ch); i++) out.push(null);
    else out.push((ch === ch.toUpperCase() ? 'w' : 'b') + ch.toLowerCase());
  }
  return out.length === 64 ? out : Array(64).fill(null);
}
// Pixel box of a square ("e4") for a board drawn from `orientation`'s side.
export function squareBox(square, orientation = 'w', size = BOARD, x0 = BOARD_X, y0 = BOARD_Y) {
  const f = square.charCodeAt(0) - 97, r = Number(square[1]) - 1, s = size / 8;
  const col = orientation === 'w' ? f : 7 - f, row = orientation === 'w' ? 7 - r : r;
  return { x: x0 + col * s, y: y0 + row * s, s };
}
// Frame timing for the clip: quick through the opening, longer on the key moments.
export function clipSchedule(plyCount, moments = [], { maxPlies = 80, base = 420, moment = 1400, end = 2200 } = {}) {
  const keys = new Set(moments.map(m => m.ply));
  const first = Math.max(1, plyCount - maxPlies + 1), frames = [{ ply: first - 1, ms: 700 }];
  for (let p = first; p <= plyCount; p++) frames.push({ ply: p, ms: keys.has(p) ? moment : base });
  frames[frames.length - 1].ms += end;
  return frames;
}
export function storyFileName(white, black, ext) {
  const slug = s => String(s || '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'player';
  return `vch-${slug(white)}-vs-${slug(black)}.${ext}`;
}

export function loadPieceImages(load = src => new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = src; })) {
  return Promise.all(PIECE_FILES.map(code => load(pieceUrl(code)).then(img => [code, img]))).then(Object.fromEntries);
}

function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function fitText(ctx, text, max) { let t = String(text || ''); while (t.length > 1 && ctx.measureText(t).width > max) t = t.slice(0, -2) + '…'; return t; }

// One frame. `info`: {white, black, whiteRating, blackRating, result, resultText, opening,
// accuracy:{mine,theirs}, mine:'w'|'b', moment:{label,san,moveNo}|null, footer}
export function drawStoryFrame(ctx, { fen, lastMove = null, orientation = 'w', info = {}, pieces = {} }) {
  ctx.fillStyle = COLORS.bg; ctx.fillRect(0, 0, CARD_W, CARD_H);
  const glow = ctx.createRadialGradient(CARD_W * 0.8, 120, 20, CARD_W * 0.8, 120, 700);
  glow.addColorStop(0, 'rgba(130,111,75,.35)'); glow.addColorStop(1, 'rgba(7,16,15,0)');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, CARD_W, CARD_H);
  // Header: wordmark and result.
  ctx.fillStyle = COLORS.gold; ctx.font = '700 44px Georgia, serif'; ctx.textBaseline = 'alphabetic';
  ctx.fillText('VCH', BOARD_X, 92);
  ctx.fillStyle = COLORS.muted; ctx.font = '500 24px "DM Sans", sans-serif';
  ctx.fillText(fitText(ctx, info.opening || 'Game Story', 520), BOARD_X + 120, 88);
  ctx.textAlign = 'right'; ctx.fillStyle = COLORS.text; ctx.font = '700 40px "DM Sans", sans-serif';
  ctx.fillText(info.result || '', BOARD_X + BOARD, 92); ctx.textAlign = 'left';
  // Players: top is the side away from the viewer.
  const top = orientation === 'w' ? 'b' : 'w', bottom = orientation;
  const label = side => `${side === 'w' ? info.white || 'White' : info.black || 'Black'}${(side === 'w' ? info.whiteRating : info.blackRating) ? `  ${side === 'w' ? info.whiteRating : info.blackRating}` : ''}`;
  const acc = side => (info.accuracy ? (side === info.mine ? info.accuracy.mine : info.accuracy.theirs) : null);
  const playerRow = (side, y) => {
    roundRect(ctx, BOARD_X, y, BOARD, 76, 14); ctx.fillStyle = COLORS.panel; ctx.fill();
    ctx.fillStyle = side === 'w' ? '#f0d9a4' : '#342019'; ctx.beginPath(); ctx.arc(BOARD_X + 40, y + 38, 18, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = COLORS.gold; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = COLORS.text; ctx.font = '600 32px "DM Sans", sans-serif'; ctx.fillText(fitText(ctx, label(side), 560), BOARD_X + 76, y + 49);
    const a = acc(side);
    if (Number.isFinite(a)) { ctx.textAlign = 'right'; ctx.fillStyle = COLORS.mint; ctx.font = '700 30px "DM Sans", sans-serif'; ctx.fillText(`${Math.round(a)}% accuracy`, BOARD_X + BOARD - 24, y + 49); ctx.textAlign = 'left'; }
  };
  playerRow(top, 200); playerRow(bottom, BOARD_Y + BOARD + 24);
  // Board.
  const sq = BOARD / 8, cells = fenSquares(fen);
  for (let i = 0; i < 64; i++) {
    const r = Math.floor(i / 8), f = i % 8, square = String.fromCharCode(97 + f) + (8 - r);
    const { x, y } = squareBox(square, orientation);
    ctx.fillStyle = (r + f) % 2 ? COLORS.dark : COLORS.light; ctx.fillRect(x, y, sq, sq);
    if (lastMove && (square === lastMove.from || square === lastMove.to)) { ctx.fillStyle = square === lastMove.to ? COLORS.lastTo : COLORS.lastFrom; ctx.fillRect(x, y, sq, sq); }
    const piece = cells[i], img = piece && pieces[piece];
    if (img) ctx.drawImage(img, x + sq * 0.06, y + sq * 0.06, sq * 0.88, sq * 0.88);
  }
  ctx.strokeStyle = '#52645d'; ctx.lineWidth = 6; ctx.strokeRect(BOARD_X - 3, BOARD_Y - 3, BOARD + 6, BOARD + 6);
  // Caption: the moment on screen, or the closing line.
  const capY = BOARD_Y + BOARD + 140;
  ctx.fillStyle = COLORS.gold; ctx.font = '700 34px "DM Sans", sans-serif';
  ctx.fillText(fitText(ctx, info.moment ? `${info.moment.label} · ${info.moment.moveNo} ${info.moment.san}` : info.resultText || '', BOARD), BOARD_X, capY);
  ctx.fillStyle = COLORS.muted; ctx.font = '500 24px "DM Sans", sans-serif';
  ctx.fillText(fitText(ctx, info.footer || 'Played on VCH · vanta-chess-play.netlify.app', BOARD), BOARD_X, capY + 44);
}

export function canvasToBlob(canvas, type = 'image/png', quality) {
  return new Promise((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Could not draw the card'))), type, quality));
}
export function clipMimeType(MR = globalThis.MediaRecorder) {
  if (!MR?.isTypeSupported) return null;
  return ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'].find(t => MR.isTypeSupported(t)) || null;
}
// Records the frames to a video Blob. `drawAt(ply)` paints the canvas for that ply.
export async function recordClip(canvas, frames, drawAt, { fps = 30, onProgress = () => {} } = {}) {
  const type = clipMimeType();
  if (!type || !canvas.captureStream) throw new Error('This browser cannot record video clips. Try the image card.');
  const stream = canvas.captureStream(fps), rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 4_000_000 }), chunks = [];
  rec.ondataavailable = e => { if (e.data?.size) chunks.push(e.data); };
  const done = new Promise(resolve => { rec.onstop = resolve; });
  drawAt(frames[0].ply); rec.start(250);
  for (let i = 0; i < frames.length; i++) {
    drawAt(frames[i].ply); onProgress((i + 1) / frames.length);
    await new Promise(r => setTimeout(r, frames[i].ms));
  }
  rec.stop(); stream.getTracks().forEach(t => t.stop()); await done;
  return new Blob(chunks, { type: type.split(';')[0] });
}
// Web Share with the file where the device supports it, otherwise a download.
export async function shareOrDownload(blob, fileName, { title = 'VCH Game Story', text = '' } = {}) {
  const file = typeof File === 'function' ? new File([blob], fileName, { type: blob.type }) : null;
  if (file && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title, text }); return 'shared'; } catch (e) { if (e?.name === 'AbortError') return 'cancelled'; }
  }
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = fileName; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return 'downloaded';
}
