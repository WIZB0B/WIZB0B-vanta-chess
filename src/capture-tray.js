// Captured pieces, alive (owner, 2026-10-13: "for captured pieces... where they will be staying
// will be animated. When they appear there, it should be animated"). A captured piece is knocked
// off its square as the capturing piece lands and flies in an arc to its own place in the tray of
// the player who took it, where it lands with a small bounce; the material lead counts up. In
// Crazyhouse the pieces waiting in the pocket glow when you can drop them, a capture flies into
// the pocket, and a dropped piece flies from the pocket to its square. Pieces taken back leave
// the tray. Everything is transform and opacity (Web Animations), so the compositor plays it;
// reduced motion shows the trays as they are, without flights.
// Pure helpers first (tested in test/capture-tray.test.js), then the few DOM helpers main.js uses.
import { TRAY_ORDER } from './game-feel.js';

// The order the tray keeps, biggest first: each kind has its own place, so pieces never jump.
export const TRAY_KINDS = TRAY_ORDER;

// The square a move's captured piece stood on: the destination, or beside it for en passant.
export function captureSquare(move) {
  const to = String(move?.to || '');
  if (!/^[a-h][1-8]$/.test(to)) return null;
  const from = String(move?.from || '');
  if (String(move?.flags || '').includes('e') && /^[a-h][1-8]$/.test(from)) return to[0] + from[1];
  return to;
}

// Whether a move took something: chess.js moves say what (captured), server moves only show it
// in their notation (an "x").
export function isCapture(move) { return !!move && (!!move.captured || /x/.test(String(move.san || ''))); }

// Counts by kind, from a list of kinds ['q', 'p', 'p'] -> {q: 1, p: 2}.
export function countKinds(list = []) {
  const out = {};
  for (const t of list) out[t] = (out[t] || 0) + 1;
  return out;
}

// What a tray gained and lost between two counts {p, n, b, r, q}: {added: [...], removed: [...]},
// in tray order.
export function trayChange(before = {}, after = {}) {
  const added = [], removed = [];
  for (const t of TRAY_KINDS) {
    const d = (after?.[t] || 0) - (before?.[t] || 0);
    for (let i = 0; i < d; i++) added.push(t);
    for (let i = 0; i < -d; i++) removed.push(t);
  }
  return { added, removed };
}

// How long a flight takes (ms) for a distance (px), at the board's motion setting (1 = normal).
export function flightMs(distance, scale = 1) {
  const base = Math.min(760, 420 + Math.max(0, distance) * 0.32);
  return Math.round(base * Math.max(0.5, Math.min(1.6, scale || 1)));
}

const centre = box => [box.left + box.width / 2, box.top + box.height / 2];
const lerp = (a, b, t) => a + (b - a) * t;
// A point on a quadratic curve from p0 to p1 bent `arc` px upwards (it peaks `arc` above the chord).
function arcPoint([x0, y0], [x1, y1], arc, t) {
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2 - 2 * arc, u = 1 - t;
  return [u * u * x0 + 2 * u * t * cx + t * t * x1, u * u * y0 + 2 * u * t * cy + t * t * y1];
}

// Keyframes for a flying piece: a fixed-position element the size of `from` (a box {left, top,
// width, height} in CSS px of the window), placed at the window's corner, centred on `from` at
// the start and on `to` at the end, scaled to `to`'s size. It is tossed up a little (scale 1.1),
// tilts in flight and lands upright. `spin` (−1 or 1) picks which way it tilts.
export function flightKeyframes(from, to, { steps = 8, spin = 1, arc = null } = {}) {
  const a = centre(from), b = centre(to), w = from.width, h = from.height, s = to.width / Math.max(1, w);
  const bend = arc ?? Math.max(28, Math.min(150, Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.26));
  const frames = [];
  for (let k = 0; k <= steps; k++) {
    const t = k / steps, [x, y] = arcPoint(a, b, bend, t);
    const scale = t < 0.2 ? lerp(1, 1.1, t / 0.2) : lerp(1.1, s, (t - 0.2) / 0.8);
    const tilt = spin * 16 * Math.sin(Math.PI * t);
    frames.push({ offset: t, transform: `translate(${(x - w / 2).toFixed(1)}px,${(y - h / 2).toFixed(1)}px) rotate(${tilt.toFixed(1)}deg) scale(${scale.toFixed(3)})` });
  }
  return frames;
}

// ---- DOM helpers (browser only) ----
// A piece arrives in a tray without a flight (a jump in the game, a promotion): it pops in.
export function popIn(el, delay = 0) {
  return el.animate?.([{ transform: 'scale(.2)', opacity: 0 }, { transform: 'scale(1.18)', opacity: 1, offset: 0.6 }, { transform: 'scale(1)', opacity: 1 }], { duration: 320, delay, easing: 'ease-out', fill: 'backwards' });
}
// A piece that has landed in its place settles with a small bounce.
export function settle(el) {
  return el.animate?.([{ transform: 'scale(1.32)' }, { transform: 'scale(.9)', offset: 0.45 }, { transform: 'scale(1.06)', offset: 0.75 }, { transform: 'scale(1)' }], { duration: 380, easing: 'ease-out' });
}
// A piece taken back leaves the tray: it shrinks away, then is removed.
export function leave(el) {
  const a = el.animate?.([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(.2)', opacity: 0 }], { duration: 220, easing: 'ease-in', fill: 'forwards' });
  if (!a) { el.remove(); return null; }
  a.finished.then(() => el.remove(), () => el.remove());
  return a;
}
// The count on a tray (the lead, a pocket's number) changed: it pops.
export function bump(el) {
  return el.animate?.([{ transform: 'scale(1)' }, { transform: 'scale(1.45)', offset: 0.35 }, { transform: 'scale(1)' }], { duration: 360, easing: 'ease-out' });
}
