// VCH chat reactions: our own animated "GIFs", drawn entirely in code as inline SVG plus CSS
// keyframes (no image files, no emoji as icons). A reaction travels through chat as a short fixed
// body (":r:gg"); the server accepts only known ids (supabase/functions/chess/reaction-ids.js).
// Every picture is a constant built here from VCH colours, so reactionMarkup never carries user
// input. Animations loop by default; set --vr-loops (e.g. 3) on a container to stop them after a
// few plays, add the class "vr-still" to show the still frame, and prefers-reduced-motion always
// shows the still frame.
import { REACTION_IDS, REACTION_PREFIX, isReactionBody, reactionBody, reactionIdOf } from '../supabase/functions/chess/reaction-ids.js';
export { REACTION_IDS, REACTION_PREFIX, isReactionBody };

const EMERALD = '#07100f', TILE = '#0e201c', DEEP = '#1c3a32', MINT = '#82edba', GOLD = '#e5c17c', IVORY = '#f0d9a4', INK = '#342019';
const FONT = "system-ui,-apple-system,'Segoe UI',Roboto,sans-serif";

// ---- Pieces: drawn upright on a unit canvas, base centred on (0,0), about 76 units tall ----------
const SIDES = { w: { fill: IVORY, line: INK, eye: INK }, b: { fill: INK, line: GOLD, eye: IVORY } };
const SHAPES = {
  p: '<rect x="-20" y="-10" width="40" height="10" rx="4"/><path d="M-13-10C-12-20-8-28-6-34H6C8-28 12-20 13-10Z"/><rect x="-11" y="-39" width="22" height="6" rx="3"/><circle cy="-50" r="12"/>',
  r: '<rect x="-21" y="-10" width="42" height="10" rx="4"/><path d="M-15-10L-13-42H13L15-10Z"/><path d="M-18-42V-60H-11V-53H-4V-60H4V-53H11V-60H18V-42Z"/>',
  b: '<rect x="-19" y="-10" width="38" height="10" rx="4"/><path d="M-12-10C-10-20-8-28-7-34H7C8-28 10-20 12-10Z"/><rect x="-11" y="-39" width="22" height="6" rx="3"/><path d="M0-67C12-58 14-46 9-39H-9C-14-46-12-58 0-67Z"/><circle cy="-70" r="4"/>',
  n: '<rect x="-20" y="-10" width="40" height="10" rx="4"/><path d="M14-10C17-30 15-50 3-62L0-71-5-62C-15-58-21-48-24-38C-25-34-23-31-19-31C-14-32-10-34-6-33C-10-26-14-18-14-10Z"/>',
  q: '<rect x="-21" y="-10" width="42" height="10" rx="4"/><path d="M-15-10C-13-22-10-32-9-38H9C10-32 13-22 15-10Z"/><rect x="-13" y="-44" width="26" height="7" rx="3"/><path d="M-13-44L-18-62-8-52 0-67 8-52 18-62 13-44Z"/><circle cx="-18" cy="-64" r="3.5"/><circle cy="-69" r="3.5"/><circle cx="18" cy="-64" r="3.5"/>',
  k: '<rect x="-21" y="-10" width="42" height="10" rx="4"/><path d="M-15-10C-13-22-10-32-9-38H9C10-32 13-22 15-10Z"/><rect x="-13" y="-44" width="26" height="7" rx="3"/><path d="M-12-44C-14-56-6-60 0-60C6-60 14-56 12-44Z"/><path d="M-2.5-60V-65H-7V-70H-2.5V-75H2.5V-70H7V-65H2.5V-60Z"/>',
};
// Faces give the pieces their personality: [eye height, eye gap, mouth offset] on each shape.
const EYES = { p: [-50, 5, 8], r: [-30, 5.5, 10], b: [-50, 4.5, 7], n: [-50, 0, 0], q: [-26, 5.5, 10], k: [-26, 5.5, 10] };
function face(type, side, mood = 'calm') {
  const [y, gap, mouth] = EYES[type], c = SIDES[side].eye;
  if (type === 'n') return `<circle cx="-9" cy="${y}" r="3" fill="${c}" stroke="none"/>`;
  if (mood === 'wide') return `<g fill="${IVORY}" stroke="${c}" stroke-width="1.8"><circle cx="${-gap - 0.5}" cy="${y}" r="4.2"/><circle cx="${gap + 0.5}" cy="${y}" r="4.2"/></g>`
    + `<g fill="${c}" stroke="none"><circle cx="${-gap - 0.5}" cy="${y}" r="2"/><circle cx="${gap + 0.5}" cy="${y}" r="2"/><ellipse cy="${y + mouth}" rx="2.6" ry="3"/></g>`;
  if (mood === 'shut') return `<path d="M${-gap - 3.5} ${y}q3.5 3 7 0M${gap - 3.5} ${y}q3.5 3 7 0" fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round"/>`;
  if (mood === 'up') return `<g fill="${c}" stroke="none"><circle cx="${-gap + 1.5}" cy="${y - 2}" r="2.6"/><circle cx="${gap + 1.5}" cy="${y - 2}" r="2.6"/></g>`;
  return `<g fill="${c}" stroke="none"><circle cx="${-gap}" cy="${y}" r="2.6"/><circle cx="${gap}" cy="${y}" r="2.6"/></g>`;
}
function piece(type, side, x, y, scale, mood) {
  const s = SIDES[side];
  return `<g transform="translate(${x} ${y}) scale(${scale})" fill="${s.fill}" stroke="${s.line}" stroke-width="4.5" stroke-linejoin="round">${SHAPES[type]}${mood ? face(type, side, mood) : ''}</g>`;
}

// ---- Shared bits --------------------------------------------------------------------------------
const tile = `<rect x="3" y="3" width="94" height="94" rx="22" fill="${TILE}" stroke="${MINT}" stroke-opacity=".32" stroke-width="2"/>`;
const ground = (cx = 50, rx = 30, y = 89) => `<ellipse cx="${cx}" cy="${y}" rx="${rx}" ry="3.6" fill="${EMERALD}" fill-opacity=".75"/>`;
const text = (t, x, y, size, color = GOLD, cls = '') => `<text${cls ? ` class="${cls}"` : ''} x="${x}" y="${y}" text-anchor="middle" font-family="${FONT}" font-weight="900" font-size="${size}" fill="${color}" stroke="${EMERALD}" stroke-width="3" stroke-linejoin="round" paint-order="stroke">${t}</text>`;
const star = (x, y, r) => `M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z`;
const sparkle = (x, y, r, cls, color = IVORY) => `<path class="${cls}" d="${star(x, y, r)}" fill="${color}"/>`;
// An invisible disc centres a group's box on a point, so it spins about that point.
const pivot = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="none"/>`;
const svg = body => `<svg class="vr-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" aria-hidden="true" focusable="false">${tile}${body}</svg>`;
function burst(cx, cy, r, inner, points) {
  const pts = [];
  for (let i = 0; i < points * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / points, rr = i % 2 ? inner : r;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)} ${(cy + rr * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join('L')}Z`;
}
const HORSESHOE = 'M31 36V58A19 19 0 0 0 69 58V36';

// ---- The reactions --------------------------------------------------------------------------------
const ART = {
  gg: svg(`${ground(50, 38)}${text('GG', 50, 30, 26, GOLD, 'vr-pop')}`
    + `<g class="vr-bow-l">${piece('p', 'w', 30, 89, 0.76, 'shut')}</g>`
    + `<g class="vr-bow-r">${piece('p', 'b', 70, 89, 0.76, 'shut')}</g>`),

  nice: svg(`${ground()}${sparkle(20, 30, 7, 'vr-twinkle')}${sparkle(84, 64, 5, 'vr-twinkle vr-d2', MINT)}${sparkle(18, 66, 4, 'vr-twinkle vr-d3', GOLD)}`
    + `${text('!!', 79, 32, 26, MINT)}<g class="vr-flip">${piece('n', 'w', 50, 89, 0.84, 'calm')}</g>`),

  oops: svg(`${ground(48, 34)}<circle cx="56" cy="87" r="3.4" fill="${MINT}"/>`
    + `${text('?', 78, 38, 30, GOLD, 'vr-qmark')}<g class="vr-trip">${piece('p', 'w', 36, 89, 0.74, 'wide')}</g>`),

  blunder: svg(`${ground()}${text('??', 50, 27, 26, GOLD, 'vr-shake')}`
    + `<g transform="translate(50 89) scale(.76)" fill="${IVORY}" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round">`
    + `<rect x="-19" y="-10" width="38" height="10" rx="4"/>`
    + `<g class="vr-crumble-mid"><path d="M-12-10C-10-20-8-28-7-34H7C8-28 10-20 12-10Z"/><rect x="-11" y="-39" width="22" height="6" rx="3"/><path d="M-3-14L2-22-2-29" fill="none" stroke-width="2.6"/></g>`
    + `<g class="vr-crumble-top"><path d="M0-67C12-58 14-46 9-39H-9C-14-46-12-58 0-67Z"/><circle cy="-70" r="4"/>${face('b', 'w', 'wide')}</g>`
    + `</g><g class="vr-debris" fill="${IVORY}" stroke="${INK}" stroke-width="1.5"><rect x="57" y="58" width="6" height="6" rx="1"/><rect x="40" y="62" width="5" height="5" rx="1"/><rect x="63" y="68" width="4" height="4" rx="1"/></g>`),

  check: svg(`<circle class="vr-ring" cx="50" cy="60" r="30" fill="none" stroke="${GOLD}" stroke-width="3"/><circle class="vr-ring vr-d4" cx="50" cy="60" r="30" fill="none" stroke="${MINT}" stroke-width="2.6"/>`
    + `${ground()}${text('CHECK', 50, 22, 18, GOLD)}<g class="vr-throb">${piece('k', 'w', 50, 89, 0.74, 'wide')}</g>`),

  hurry: svg(`<g class="vr-buzz">`
    + `<rect class="vr-plunge-l" x="24" y="29" width="18" height="10" rx="3" fill="${MINT}" stroke="${INK}" stroke-width="2.5"/>`
    + `<rect class="vr-plunge-r" x="58" y="29" width="18" height="10" rx="3" fill="${GOLD}" stroke="${INK}" stroke-width="2.5"/>`
    + `<rect x="10" y="36" width="80" height="50" rx="11" fill="${INK}" stroke="${GOLD}" stroke-width="3"/>`
    + `<circle cx="31" cy="61" r="16" fill="${IVORY}" stroke="${EMERALD}" stroke-width="2"/><circle cx="69" cy="61" r="16" fill="${IVORY}" stroke="${EMERALD}" stroke-width="2"/>`
    + `<path d="M31 61V49M31 61L38 64" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/>`
    + `<g class="vr-hand">${pivot(69, 61, 13)}<path d="M69 61V48" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/></g>`
    + `<circle cx="31" cy="61" r="2.6" fill="${INK}"/><circle cx="69" cy="61" r="2.6" fill="${INK}"/></g>`
    + `<path class="vr-dash" d="M10 20h12M8 27h7M80 20h11M86 27h7" stroke="${MINT}" stroke-width="3" stroke-linecap="round"/>`),

  thinking: svg(`${ground(38, 26)}<g class="vr-ponder">${piece('b', 'w', 38, 89, 0.76, 'up')}</g>`
    + `<circle class="vr-dot" cx="63" cy="46" r="3.6" fill="${MINT}"/><circle class="vr-dot vr-d2" cx="72" cy="34" r="5" fill="${MINT}"/><circle class="vr-dot vr-d3" cx="83" cy="20" r="7" fill="${MINT}"/>`),

  fire: svg(`<g class="vr-flame">`
    + `<path d="M50 90C30 90 20 76 24 60C27 50 34 46 33 32C42 38 46 46 46 54C50 44 52 30 48 12C64 22 76 40 74 58C79 54 80 48 79 42C87 54 86 76 72 85C66 89 58 90 50 90Z" fill="${GOLD}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`
    + `<path class="vr-flame-in" d="M50 88C38 88 32 80 34 70C36 62 42 58 42 50C48 54 52 60 52 66C56 60 57 52 56 46C64 54 68 64 66 74C64 84 58 88 50 88Z" fill="${IVORY}"/>`
    + `<path class="vr-flame-core" d="M50 87C45 87 42 83 43 78C44 74 47 72 48 68C52 71 56 75 56 80C56 84 54 87 50 87Z" fill="${MINT}"/></g>`
    + `<circle class="vr-ember" cx="28" cy="38" r="2.6" fill="${GOLD}"/><circle class="vr-ember vr-d2" cx="74" cy="32" r="2.2" fill="${IVORY}"/><circle class="vr-ember vr-d3" cx="62" cy="20" r="2" fill="${GOLD}"/>`),

  crown: svg(`<circle class="vr-glow" cx="50" cy="56" r="32" fill="${MINT}" fill-opacity=".14"/>${ground(50, 30)}`
    + `<g class="vr-drop"><path d="M24 72L18 34 36 52 50 24 64 52 82 34 76 72Z" fill="${GOLD}" stroke="${INK}" stroke-width="3.4" stroke-linejoin="round"/>`
    + `<rect x="21" y="70" width="58" height="13" rx="4" fill="${GOLD}" stroke="${INK}" stroke-width="3.4"/>`
    + `<g fill="${IVORY}" stroke="${INK}" stroke-width="2.2"><circle cx="18" cy="32" r="4.4"/><circle cx="50" cy="22" r="5"/><circle cx="82" cy="32" r="4.4"/></g>`
    + `<circle cx="35" cy="76.5" r="3.2" fill="${MINT}"/><circle cx="50" cy="76.5" r="3.6" fill="${INK}"/><circle cx="65" cy="76.5" r="3.2" fill="${MINT}"/></g>`
    + `${sparkle(16, 16, 6, 'vr-twinkle')}${sparkle(86, 14, 5, 'vr-twinkle vr-d2', MINT)}${sparkle(88, 56, 4, 'vr-twinkle vr-d3')}`),

  // Two hands clasp in the middle: mint sleeve from the left, gold sleeve from the right, a thumb
  // over the top and fingers wrapped underneath.
  handshake: svg(`${text('\u00bd-\u00bd', 50, 26, 20, GOLD)}<g class="vr-shake-hands">`
    + `<path d="M14 80L30 64" stroke="${MINT}" stroke-width="17" stroke-linecap="round"/><path d="M86 80L70 64" stroke="${GOLD}" stroke-width="17" stroke-linecap="round"/>`
    + `<path d="M23 56L36 69M77 56L64 69" stroke="${IVORY}" stroke-width="4.5" stroke-linecap="round"/>`
    + `<rect x="30" y="50" width="40" height="22" rx="11" fill="${IVORY}" stroke="${INK}" stroke-width="3.2"/>`
    + `<path d="M43 61V71M50 60V72M57 61V71" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`
    + `<path d="M38 52L58 46" stroke="${INK}" stroke-width="10.5" stroke-linecap="round"/><path d="M38 52L58 46" stroke="${IVORY}" stroke-width="5" stroke-linecap="round"/>`
    + `</g>`),

  sacrifice: svg(`${ground()}<path class="vr-arc" d="M54 28Q74 4 94 16" fill="none" stroke="${MINT}" stroke-width="2.8" stroke-dasharray="3 5" stroke-linecap="round"/>`
    + `${text('!?', 22, 30, 24, GOLD)}<g class="vr-leap">${piece('r', 'w', 50, 89, 0.76, 'wide')}</g>`),

  castle: svg(`<g>${[0, 1, 2, 3].map(i => `<rect x="${10 + i * 20}" y="80" width="20" height="10" fill="${i % 2 ? DEEP : '#2d5a4c'}"/>`).join('')}</g>`
    + `<rect x="10" y="80" width="80" height="10" rx="2" fill="none" stroke="${MINT}" stroke-opacity=".5" stroke-width="1.5"/>`
    + `${text('O-O', 50, 22, 18, GOLD)}<g class="vr-castle-r">${piece('r', 'w', 80, 80, 0.62, 'calm')}</g><g class="vr-castle-k">${piece('k', 'w', 20, 80, 0.62, 'calm')}</g>`),

  promotion: svg(`${ground()}${text('=Q', 78, 28, 22, GOLD)}<circle class="vr-burst" cx="50" cy="60" r="26" fill="none" stroke="${MINT}" stroke-width="3"/>`
    + `<g class="vr-promo-pawn">${piece('p', 'w', 50, 89, 0.76, 'calm')}</g><g class="vr-promo-queen">${piece('q', 'w', 50, 89, 0.78, 'wide')}</g>`
    + `${sparkle(20, 44, 5, 'vr-twinkle')}${sparkle(24, 22, 4, 'vr-twinkle vr-d2', MINT)}`),

  goodluck: svg(`${text('GL', 50, 25, 22, IVORY)}<g class="vr-swing">`
    + `<path d="${HORSESHOE}" fill="none" stroke="${INK}" stroke-width="18" stroke-linecap="round"/><path d="${HORSESHOE}" fill="none" stroke="${GOLD}" stroke-width="12" stroke-linecap="round"/>`
    + `<g fill="${INK}"><circle cx="31" cy="44" r="1.8"/><circle cx="31" cy="56" r="1.8"/><circle cx="69" cy="44" r="1.8"/><circle cx="69" cy="56" r="1.8"/><circle cx="39" cy="71" r="1.8"/><circle cx="61" cy="71" r="1.8"/></g></g>`
    + `${sparkle(16, 44, 5, 'vr-twinkle', MINT)}${sparkle(85, 36, 6, 'vr-twinkle vr-d2')}${sparkle(84, 78, 4, 'vr-twinkle vr-d3', GOLD)}`),

  rematch: svg(`<g class="vr-spin">${pivot(50, 54, 36)}`
    + `<path d="M19 48A31 31 0 0 1 75 36" fill="none" stroke="${MINT}" stroke-width="6.5" stroke-linecap="round"/><path d="M67 27L80 36 66 42Z" fill="${MINT}" stroke="${MINT}" stroke-width="3" stroke-linejoin="round"/>`
    + `<path d="M81 60A31 31 0 0 1 25 72" fill="none" stroke="${GOLD}" stroke-width="6.5" stroke-linecap="round"/><path d="M33 81L20 72 34 66Z" fill="${GOLD}" stroke="${GOLD}" stroke-width="3" stroke-linejoin="round"/></g>`
    + `${piece('p', 'w', 40, 76, 0.52, 'calm')}${piece('p', 'b', 60, 76, 0.52, 'calm')}`),

  wow: svg(`<g class="vr-burst-star">${pivot(50, 60, 40)}<path d="${burst(50, 60, 40, 28, 12)}" fill="${GOLD}" fill-opacity=".85"/></g>`
    + `${text('WOW', 50, 22, 20, MINT)}<g class="vr-jump">${piece('q', 'w', 50, 90, 0.74, 'wide')}</g>`),
};

const INFO = [
  ['gg', 'GG', 'Two pawns bow to each other'],
  ['nice', 'Nice move', 'A knight does a backflip'],
  ['oops', 'Oops', 'A pawn trips over a pebble'],
  ['blunder', 'Blunder!', 'A bishop crumbles'],
  ['check', 'Check!', 'A startled king under a pulsing alarm'],
  ['hurry', 'Hurry up', 'A chess clock ticking fast'],
  ['thinking', 'Thinking', 'A bishop with rising thought bubbles'],
  ['fire', 'On fire', 'A flickering flame'],
  ['crown', 'Victory', 'A crown drops into place'],
  ['handshake', 'Draw?', 'Two hands shake on a draw'],
  ['sacrifice', 'Sacrifice!', 'A rook leaps off the board'],
  ['castle', 'Castle', 'The king and rook swap places'],
  ['promotion', 'Promotion', 'A pawn turns into a queen'],
  ['goodluck', 'Good luck', 'A lucky horseshoe swings'],
  ['rematch', 'Rematch?', 'Arrows circle two pawns'],
  ['wow', 'Wow', 'A wide-eyed queen jumps'],
];
export const REACTIONS = Object.freeze(INFO.map(([id, label, alt]) => Object.freeze({ id, label, alt, svg: ART[id] })));
const BY_ID = new Map(REACTIONS.map(r => [r.id, r]));

export function reactionById(id) {
  return (typeof id === 'string' && BY_ID.get(id)) || null;
}
// The chat body that carries a reaction (":r:gg"), or null for an unknown id.
export function reactionMessage(id) {
  return reactionBody(id);
}
// The reaction a chat body carries, or null (only an exact known body counts).
export function parseReaction(body) {
  const id = reactionIdOf(body);
  return id ? BY_ID.get(id) : null;
}
const escapeAttr = s => String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
// Safe HTML for a reaction: our own constant SVG in a labelled span. Unknown ids give ''.
export function reactionMarkup(id, { size = 64 } = {}) {
  const r = reactionById(id);
  if (!r) return '';
  const px = Math.round(Math.min(256, Math.max(16, Number(size) || 64)));
  return `<span class="vch-reaction" data-reaction="${r.id}" role="img" aria-label="${escapeAttr(`${r.label}: ${r.alt}`)}" style="width:${px}px;height:${px}px">${r.svg}</span>`;
}

// ---- Animation --------------------------------------------------------------------------------
// Every rule is scoped to .vch-reaction; keyframes are prefixed vr-. Each element animates its own
// box (transform-box: fill-box); the still frame (no animation) is a good picture on its own.
const run = (name, seconds, timing = 'ease-in-out', extra = '') => `animation:${name} ${seconds}s ${timing} ${extra}var(--vr-loops,infinite)`;
const R = '.vch-reaction ';
export const REACTION_CSS = [
  '.vch-reaction{display:inline-block;width:64px;height:64px;line-height:0;vertical-align:middle;flex:none}',
  `${R}.vr-svg{display:block;width:100%;height:100%;overflow:hidden}`,
  // Only the classed (animated) parts get a box origin; plain groups keep their SVG transforms.
  `${R}.vr-svg [class]{transform-box:fill-box;transform-origin:50% 50%}`,
  `${R}.vr-d2{animation-delay:.25s!important}${R}.vr-d3{animation-delay:.5s!important}${R}.vr-d4{animation-delay:.6s!important}`,
  // gg
  `${R}.vr-bow-l,${R}.vr-bow-r{transform-origin:50% 100%}`,
  `${R}.vr-bow-l{${run('vr-bow-l', 2)}}${R}.vr-bow-r{${run('vr-bow-r', 2)}}`,
  '@keyframes vr-bow-l{0%,22%,100%{transform:none}42%,62%{transform:rotate(17deg)}}',
  '@keyframes vr-bow-r{0%,30%,100%{transform:none}50%,70%{transform:rotate(-17deg)}}',
  `${R}.vr-pop{${run('vr-pop', 2)}}`,
  '@keyframes vr-pop{0%,30%,100%{transform:scale(1)}52%{transform:scale(1.18)}}',
  // sparkles (shared)
  `${R}.vr-twinkle{${run('vr-twinkle', 1.6)}}`,
  '@keyframes vr-twinkle{0%,100%{transform:scale(.5) rotate(0);opacity:.35}50%{transform:scale(1.15) rotate(45deg);opacity:1}}',
  // nice
  `${R}.vr-flip{transform-origin:50% 60%;${run('vr-flip', 2.2)}}`,
  '@keyframes vr-flip{0%,8%{transform:none}16%{transform:scale(1.08,.86)}50%{transform:translateY(-24px) rotate(-180deg)}84%{transform:rotate(-360deg)}90%{transform:rotate(-360deg) scale(1.06,.9)}100%{transform:rotate(-360deg)}}',
  // oops
  `${R}.vr-trip{transform-origin:80% 100%;${run('vr-trip', 2.2)}}`,
  '@keyframes vr-trip{0%,22%{transform:none}32%{transform:rotate(12deg)}40%{transform:rotate(-5deg)}54%,80%{transform:rotate(80deg)}90%{transform:rotate(-6deg)}100%{transform:none}}',
  `${R}.vr-qmark{${run('vr-qmark', 2.2)}}`,
  '@keyframes vr-qmark{0%,40%{transform:scale(.4);opacity:0}56%{transform:scale(1.2);opacity:1}64%,84%{transform:none;opacity:1}100%{transform:scale(.4);opacity:0}}',
  // blunder
  `${R}.vr-crumble-top{transform-origin:50% 100%;${run('vr-crumble-top', 2.4)}}`,
  '@keyframes vr-crumble-top{0%,26%{transform:none;opacity:1}30%{transform:rotate(-6deg)}34%{transform:rotate(6deg)}38%{transform:none}64%{transform:translate(28px,44px) rotate(96deg);opacity:1}78%,90%{transform:translate(28px,44px) rotate(96deg);opacity:0}91%{transform:none;opacity:0}100%{opacity:1}}',
  `${R}.vr-crumble-mid{transform-origin:20% 100%;${run('vr-crumble-mid', 2.4)}}`,
  '@keyframes vr-crumble-mid{0%,40%{transform:none;opacity:1}62%,78%{transform:rotate(-26deg) translateY(4px);opacity:1}90%{transform:rotate(-26deg) translateY(4px);opacity:0}91%{transform:none;opacity:0}100%{opacity:1}}',
  `${R}.vr-debris{opacity:0;${run('vr-debris', 2.4, 'ease-in')}}`,
  '@keyframes vr-debris{0%,40%{transform:translateY(-16px);opacity:0}48%{opacity:1}72%{transform:translateY(18px);opacity:1}86%,100%{transform:translateY(18px);opacity:0}}',
  `${R}.vr-shake{${run('vr-shake', 2.4)}}`,
  '@keyframes vr-shake{0%,40%,70%,100%{transform:none}46%{transform:rotate(-10deg) scale(1.15)}52%{transform:rotate(9deg) scale(1.15)}58%{transform:rotate(-6deg) scale(1.1)}64%{transform:rotate(4deg)}}',
  // check
  `${R}.vr-ring{opacity:.5;${run('vr-ring', 1.2, 'ease-out')}}`,
  '@keyframes vr-ring{0%{transform:scale(.55);opacity:.95}100%{transform:scale(1.45);opacity:0}}',
  `${R}.vr-throb{transform-origin:50% 100%;${run('vr-throb', 1.2)}}`,
  '@keyframes vr-throb{0%,100%{transform:none}20%{transform:scale(1.06) rotate(-4deg)}40%{transform:scale(1.06) rotate(4deg)}60%{transform:scale(1.03)}}',
  // hurry
  `${R}.vr-hand{${run('vr-hand', 1.2, 'steps(8)')}}`,
  '@keyframes vr-hand{to{transform:rotate(360deg)}}',
  `${R}.vr-buzz{${run('vr-buzz', 1.2)}}`,
  '@keyframes vr-buzz{0%,50%,100%{transform:none}10%,30%{transform:translateX(-1.5px) rotate(-1.5deg)}20%,40%{transform:translateX(1.5px) rotate(1.5deg)}}',
  `${R}.vr-plunge-l{${run('vr-plunge-l', 1.2, 'steps(1)')}}${R}.vr-plunge-r{transform:translateY(4px);${run('vr-plunge-r', 1.2, 'steps(1)')}}`,
  '@keyframes vr-plunge-l{0%{transform:none}50%{transform:translateY(4px)}}',
  '@keyframes vr-plunge-r{0%{transform:translateY(4px)}50%{transform:none}}',
  `${R}.vr-dash{${run('vr-dash', 1.2, 'linear')}}`,
  '@keyframes vr-dash{0%,100%{opacity:.25}50%{opacity:1}}',
  // thinking
  `${R}.vr-ponder{transform-origin:50% 100%;${run('vr-ponder', 1.8)}}`,
  '@keyframes vr-ponder{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(4deg)}}',
  `${R}.vr-dot{${run('vr-dot', 1.8)}}`,
  '@keyframes vr-dot{0%,15%{transform:scale(.3);opacity:0}35%,75%{transform:none;opacity:1}100%{transform:scale(.3);opacity:0}}',
  // fire
  `${R}.vr-flame{transform-origin:50% 100%;${run('vr-flame', 1.2)}}`,
  '@keyframes vr-flame{0%,100%{transform:none}25%{transform:scale(1.04,.95) skewX(-3deg)}50%{transform:scale(.97,1.06) skewX(2deg)}75%{transform:scale(1.03,.97) skewX(-1deg)}}',
  `${R}.vr-flame-in{transform-origin:50% 100%;${run('vr-flame-in', 1.2)}}`,
  '@keyframes vr-flame-in{0%,100%{transform:none}50%{transform:scale(.9,1.12) skewX(-4deg)}}',
  `${R}.vr-flame-core{transform-origin:50% 100%;${run('vr-flame-in', 1.2, 'ease-in-out', '.3s ')}}`,
  `${R}.vr-ember{${run('vr-ember', 1.6, 'ease-out')}}`,
  '@keyframes vr-ember{0%{transform:translateY(14px);opacity:0}30%{opacity:1}100%{transform:translateY(-16px);opacity:0}}',
  // crown
  `${R}.vr-drop{transform-origin:50% 100%;${run('vr-drop', 2)}}`,
  '@keyframes vr-drop{0%{transform:translateY(-34px);opacity:0}14%{opacity:1}30%{transform:translateY(0) scale(1.1,.86)}40%{transform:translateY(-5px) scale(.97,1.04)}50%,100%{transform:none;opacity:1}}',
  `${R}.vr-glow{${run('vr-glow', 2)}}`,
  '@keyframes vr-glow{0%,30%,100%{transform:scale(.8);opacity:.4}55%{transform:scale(1.15);opacity:1}}',
  // handshake
  `${R}.vr-shake-hands{transform-origin:50% 70%;${run('vr-shake-hands', 1.2)}}`,
  '@keyframes vr-shake-hands{0%,100%{transform:none}25%{transform:translateY(-6px) rotate(-3deg)}75%{transform:translateY(6px) rotate(3deg)}}',
  // sacrifice
  `${R}.vr-leap{transform-origin:50% 75%;${run('vr-leap', 2.4)}}`,
  '@keyframes vr-leap{0%,12%{transform:none;opacity:1}20%{transform:scale(1.06,.88)}44%{transform:translate(24px,-40px) rotate(150deg);opacity:1}56%{transform:translate(42px,-22px) rotate(260deg);opacity:0}57%,66%{transform:scale(.4);opacity:0}80%,100%{transform:none;opacity:1}}',
  `${R}.vr-arc{${run('vr-arc', 2.4, 'linear')}}`,
  '@keyframes vr-arc{0%,14%{opacity:0}30%,50%{opacity:1}64%,100%{opacity:0}}',
  // castle
  `${R}.vr-castle-k{${run('vr-castle-k', 1.2, 'ease-in-out', 'alternate ')}}${R}.vr-castle-r{${run('vr-castle-r', 1.2, 'ease-in-out', 'alternate ')}}`,
  '@keyframes vr-castle-k{0%,20%{transform:none}55%{transform:translate(20px,-10px)}90%,100%{transform:translateX(40px)}}',
  '@keyframes vr-castle-r{0%,30%{transform:none}90%,100%{transform:translateX(-40px)}}',
  // promotion: the still frame shows the queen
  `${R}.vr-promo-pawn{opacity:0;${run('vr-promo-pawn', 2.4)}}`,
  '@keyframes vr-promo-pawn{0%,32%{transform:none;opacity:1}42%{transform:scale(1.14,.8);opacity:1}50%{transform:scale(.3);opacity:0}92%{transform:scale(.6);opacity:0}100%{transform:none;opacity:1}}',
  `${R}.vr-promo-queen{transform-origin:50% 100%;${run('vr-promo-queen', 2.4)}}`,
  '@keyframes vr-promo-queen{0%,46%{transform:scale(.3);opacity:0}58%{transform:scale(1.14);opacity:1}66%,88%{transform:none;opacity:1}96%,100%{transform:scale(.6);opacity:0}}',
  `${R}.vr-burst{opacity:0;${run('vr-burst', 2.4, 'ease-out')}}`,
  '@keyframes vr-burst{0%,46%{transform:scale(.3);opacity:0}52%{opacity:1}74%,100%{transform:scale(1.6);opacity:0}}',
  // good luck
  `${R}.vr-swing{transform-origin:50% 100%;${run('vr-swing', 2)}}`,
  '@keyframes vr-swing{0%,100%{transform:rotate(-10deg)}50%{transform:rotate(10deg) translateY(-3px)}}',
  // rematch
  `${R}.vr-spin{${run('vr-spin', 1.6, 'linear')}}`,
  '@keyframes vr-spin{to{transform:rotate(360deg)}}',
  // wow
  `${R}.vr-burst-star{${run('vr-burst-star', 1.6)}}`,
  '@keyframes vr-burst-star{0%,100%{transform:scale(.92) rotate(0)}50%{transform:scale(1.08) rotate(15deg)}}',
  `${R}.vr-jump{transform-origin:50% 100%;${run('vr-jump', 1.6)}}`,
  '@keyframes vr-jump{0%,60%,100%{transform:none}12%{transform:scale(1.08,.88)}30%{transform:translateY(-10px) scale(.96,1.06)}46%{transform:scale(1.05,.94)}}',
  // still frames
  '.vch-reaction.vr-still *{animation:none!important}',
  '@media (prefers-reduced-motion:reduce){.vch-reaction *{animation:none!important}}',
].join('\n');

// ---- Emoji picker content ---------------------------------------------------------------------
// These are message content the player types, not icons. Escaped so the source stays ASCII.
const set = (group, items) => Object.freeze({ group, items: Object.freeze(items.map(([char, name]) => Object.freeze({ char, name }))) });
export const EMOJI_SET = Object.freeze([
  set('Smileys', [
    ['\u{1F600}', 'Grinning face'], ['\u{1F602}', 'Tears of joy'], ['\u{1F923}', 'Rolling on the floor laughing'], ['\u{1F60A}', 'Smiling face'],
    ['\u{1F609}', 'Winking face'], ['\u{1F60E}', 'Sunglasses'], ['\u{1F914}', 'Thinking face'], ['\u{1F62E}', 'Open mouth'],
    ['\u{1F631}', 'Screaming face'], ['\u{1F605}', 'Nervous laugh'], ['\u{1F62C}', 'Grimacing face'], ['\u{1F643}', 'Upside-down face'],
    ['\u{1F62D}', 'Loudly crying'], ['\u{1F624}', 'Huffing face'], ['\u{1F634}', 'Sleeping face'], ['\u{1F92F}', 'Mind blown'],
  ]),
  set('Hands', [
    ['\u{1F44D}', 'Thumbs up'], ['\u{1F44E}', 'Thumbs down'], ['\u{1F44F}', 'Clapping hands'], ['\u{1F64C}', 'Raised hands'],
    ['\u{1F91D}', 'Handshake'], ['\u{1F44B}', 'Waving hand'], ['\u{1F64F}', 'Folded hands'], ['\u{1F4AA}', 'Flexed biceps'],
  ]),
  set('Chess', [
    ['\u265f\ufe0f', 'Chess pawn'], ['\u{1F451}', 'Crown'], ['\u{1F3C6}', 'Trophy'], ['\u{1F434}', 'Horse face'],
    ['\u{1F3F0}', 'Castle'], ['\u{1F9E0}', 'Brain'], ['\u23f0', 'Alarm clock'], ['\u231b', 'Hourglass'],
  ]),
  set('Hype', [
    ['\u{1F525}', 'Fire'], ['\u26a1', 'Lightning'], ['\u{1F4A5}', 'Boom'], ['\u2728', 'Sparkles'], ['\u{1F389}', 'Party popper'],
    ['\u{1F4AF}', 'Hundred points'], ['\u{1F680}', 'Rocket'], ['\u{1F48E}', 'Gem'], ['\u2764\ufe0f', 'Red heart'], ['\u{1F49A}', 'Green heart'],
  ]),
]);
