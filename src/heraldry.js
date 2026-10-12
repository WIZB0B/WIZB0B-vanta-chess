// Orders and heraldry (round 12): a club's crest is a small coat of arms built from a few
// choices (shield, division, two tinctures, a charge and its colour). The server keeps only those
// choices (rules.js cleanCrest); the picture is drawn here as inline SVG, so no image files.
export { CREST_CHARGES, CREST_DIVISIONS, CREST_SHIELDS, CREST_TINCTURES, DEFAULT_CREST, cleanCrest } from '../supabase/functions/chess/rules.js';
import { DEFAULT_CREST, cleanCrest } from '../supabase/functions/chess/rules.js';

export const TINCTURES = { or: '#d9b44a', argent: '#e9e6dc', azure: '#2f5ea8', gules: '#b42a2f', vert: '#2e7d50', sable: '#1b1c20', purpure: '#6c3e8e', teal: '#1f8088' };
export const TINCTURE_NAMES = { or: 'Gold', argent: 'Silver', azure: 'Blue', gules: 'Red', vert: 'Green', sable: 'Black', purpure: 'Purple', teal: 'Teal' };
export const SHIELD_NAMES = { heater: 'Heater', round: 'Rounded', kite: 'Kite', swiss: 'Swiss' };
export const DIVISION_NAMES = { plain: 'Plain', pale: 'Halved', fess: 'Split across', bend: 'Diagonal', quarterly: 'Quarters', chevron: 'Chevron', saltire: 'Saltire' };
export const CHARGE_NAMES = { none: 'None', knight: 'Knight', rook: 'Rook', crown: 'Crown', king: 'King', star: 'Star', crescent: 'Crescent', sword: 'Sword', swords: 'Crossed swords' };

// All shapes on a 100 x 120 canvas.
const SHIELDS = {
  heater: 'M8 6H92V52C92 86 72 104 50 115C28 104 8 86 8 52Z',
  round: 'M8 6H92V62A42 50 0 0 1 8 62Z',
  kite: 'M50 4C74 8 90 18 90 34C90 66 70 94 50 116C30 94 10 66 10 34C10 18 26 8 50 4Z',
  swiss: 'M6 6L28 12L50 6L72 12L94 6V54C94 88 72 104 50 115C28 104 6 88 6 54Z',
};
const DIVISIONS = {
  plain: '',
  pale: 'M50 0H100V120H50Z',
  fess: 'M0 60H100V120H0Z',
  bend: 'M0 0L100 120H0Z',
  quarterly: 'M50 0H100V60H50ZM0 60H50V120H0Z',
  chevron: 'M0 82L50 38L100 82V104L50 60L0 104Z',
  saltire: 'M0 0H14L100 106V120H86L0 14ZM100 0V14L14 120H0V106L86 0Z',
};
const star = (cx, cy, r, inner = 0.42) => {
  const pts = [];
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * inner : r; pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)} ${(cy + rr * Math.sin(a)).toFixed(1)}`); }
  return `M${pts.join('L')}Z`;
};
// A crescent: a disc with a smaller disc taken out of its upper right.
function crescent(ox = 47, oy = 60, R = 29, ix = 59, iy = 51, r = 24) {
  const dx = ix - ox, dy = iy - oy, d = Math.hypot(dx, dy), a = (R * R - r * r + d * d) / (2 * d), h = Math.sqrt(R * R - a * a);
  const mx = ox + a * dx / d, my = oy + a * dy / d, p1 = [mx + h * dy / d, my - h * dx / d], p2 = [mx - h * dy / d, my + h * dx / d], f = n => n.toFixed(1);
  return `M${f(p1[0])} ${f(p1[1])}A${R} ${R} 0 1 0 ${f(p2[0])} ${f(p2[1])}A${r} ${r} 0 1 1 ${f(p1[0])} ${f(p1[1])}Z`;
}
const sword = 'M48 22L50 18L52 22V70H48ZM38 70H62V75H38ZM48 75H52V86H48ZM50 86A4 4 0 1 1 49.9 86Z';
const CHARGES = {
  none: '',
  knight: 'M34 88H68V82C68 80 66 78 64 78C64 66 66 54 62 44C58 34 50 28 42 27L40 21L36 29C32 31 28 36 26 42L24 50L30 54L36 50L42 50C42 56 36 62 34 70C33 74 34 78 36 78C34 79 34 80 34 82Z',
  rook: 'M33 26H41V33H46V26H54V33H59V26H67V40L61 46V74H67V82H71V90H29V82H33V74H39V46L33 40Z',
  crown: 'M28 80L30 42L41 56L50 34L59 56L70 42L72 80ZM28 84H72V92H28ZM50 26A4 4 0 1 1 49.9 26Z',
  king: 'M47 18H53V24H59V30H53V36H47V30H41V24H47ZM34 46C34 40 42 37 50 37C58 37 66 40 66 46L61 72H39ZM35 76H65V82H35ZM31 85H69V92H31Z',
  star: star(50, 58, 30),
  crescent: crescent(),
  sword,
  swords: `${sword}`,
};
let uid = 0;
// The crest as an SVG string. `crest` is cleaned first; anything invalid shows the default.
export function crestSvg(crest, { size = 40, label = 'Club crest', className = 'crest' } = {}) {
  const c = cleanCrest(crest) || DEFAULT_CREST, id = `crest-${++uid}`, shield = SHIELDS[c.shield];
  const field = TINCTURES[c.field], field2 = TINCTURES[c.field2], ink = TINCTURES[c.ink];
  const div = DIVISIONS[c.division], charge = CHARGES[c.charge];
  // Crossed swords: the same sword twice, turned each way.
  const chargeSvg = !charge ? '' : c.charge === 'swords'
    ? `<g fill="${ink}" stroke="rgba(0,0,0,.35)" stroke-width="1"><path d="${sword}" transform="rotate(-35 50 58)"/><path d="${sword}" transform="rotate(35 50 58)"/></g>`
    : `<path d="${charge}" fill="${ink}" stroke="rgba(0,0,0,.35)" stroke-width="1" fill-rule="evenodd"/>`;
  return `<svg class="${className}" viewBox="0 0 100 120" width="${size}" height="${Math.round(size * 1.2)}" role="img" aria-label="${String(label).replace(/[<>"&]/g, '')}"><defs><clipPath id="${id}"><path d="${shield}"/></clipPath><linearGradient id="${id}-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></linearGradient></defs><g clip-path="url(#${id})"><rect width="100" height="120" fill="${field}"/>${div ? `<path d="${div}" fill="${field2}"/>` : ''}${chargeSvg}<rect width="100" height="120" fill="url(#${id}-g)"/></g><path d="${shield}" fill="none" stroke="#0b0d0d" stroke-opacity=".7" stroke-width="3"/><path d="${shield}" fill="none" stroke="#f3e2b3" stroke-opacity=".55" stroke-width="1.2"/></svg>`;
}
// A short description for screen readers and titles, e.g. "Blue and gold, a gold knight".
export function crestText(crest) {
  const c = cleanCrest(crest) || DEFAULT_CREST, t = k => TINCTURE_NAMES[k].toLowerCase();
  const field = c.division === 'plain' ? t(c.field) : `${t(c.field)} and ${t(c.field2)}`;
  return c.charge === 'none' ? field[0].toUpperCase() + field.slice(1) : `${field[0].toUpperCase() + field.slice(1)}, a ${t(c.ink)} ${CHARGE_NAMES[c.charge].toLowerCase()}`;
}
