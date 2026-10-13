import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TRAY_KINDS, captureSquare, countKinds, flightKeyframes, flightMs, isCapture, trayChange } from '../src/capture-tray.js';

const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
// translate(x px, y px) rotate(r deg) scale(s) -> [x, y, r, s]
const parts = transform => (transform.match(/-?[\d.]+/g) || []).map(Number);

test('where a captured piece stood, and whether a move took one', () => {
  assert.equal(captureSquare({ from: 'e4', to: 'd5', captured: 'p' }), 'd5');
  assert.equal(captureSquare({ from: 'e5', to: 'd6', flags: 'e', captured: 'p' }), 'd5', 'en passant: the pawn beside');
  assert.equal(captureSquare({ to: 'z9' }), null);
  assert.equal(captureSquare(null), null);
  assert.equal(isCapture({ captured: 'n' }), true);
  assert.equal(isCapture({ san: 'Qxd5', from: 'd8', to: 'd5' }), true, 'server moves: from the notation');
  assert.equal(isCapture({ san: 'Nf3' }), false);
  assert.equal(isCapture(null), false);
});

test('a tray keeps each kind in its own place and knows what it gained and lost', () => {
  assert.deepEqual(TRAY_KINDS, ['q', 'r', 'b', 'n', 'p']);
  assert.deepEqual(countKinds(['q', 'p', 'p']), { q: 1, p: 2 });
  assert.deepEqual(trayChange({ p: 1 }, { p: 2, n: 1 }), { added: ['n', 'p'], removed: [] }, 'in tray order');
  assert.deepEqual(trayChange({ q: 1, p: 3 }, { p: 1 }), { added: [], removed: ['q', 'p', 'p'] }, 'taken back');
  assert.deepEqual(trayChange(undefined, undefined), { added: [], removed: [] });
});

test('a captured piece flies in an arc from its square to its place, and lands upright at its size', () => {
  const from = { left: 600, top: 380, width: 80, height: 80 }, to = { left: 550, top: 820, width: 22, height: 22 };
  const frames = flightKeyframes(from, to, { spin: -1 });
  assert.equal(frames[0].offset, 0); assert.equal(frames.at(-1).offset, 1);
  const [x0, y0, r0, s0] = parts(frames[0].transform), [x1, y1, r1, s1] = parts(frames.at(-1).transform);
  assert.deepEqual([x0, y0, r0, s0], [600, 380, 0, 1], 'starts on its square');
  // Ends centred on its place, at its size (the element is the square's size, scaled down).
  assert.ok(Math.abs(x1 + 40 - 561) < 0.2 && Math.abs(y1 + 40 - 831) < 0.2, `${x1},${y1}`);
  assert.ok(Math.abs(s1 - 22 / 80) < 0.001 && Math.abs(r1) < 0.05);
  // Tossed up first: bigger early, and above the straight line in the middle; it tilts on the way.
  assert.ok(parts(frames[2].transform)[3] > 1);
  const mid = parts(frames[4].transform);
  assert.ok(mid[1] + 40 < (420 + 831) / 2, 'above the chord');
  assert.ok(mid[2] < -10, 'tilted the way it was thrown');
  // Longer for longer flights, within bounds, and at the board's motion setting.
  assert.ok(flightMs(100) < flightMs(600) && flightMs(5000) === 760);
  assert.ok(flightMs(400, 0.5) < flightMs(400, 1));
});

test('wired: trays and pockets animate what changed, never give away a hidden square, and keep still for reduced motion', () => {
  assert.match(main, /const plans=trays\.map\(\(\[tray,color\]\)=>\{const counts=countKinds\(caps\[color\]\);return \{tray,color,counts,change:trayChange\(/);
  assert.match(main, /isCapture\(move\)&&!trayFlightsHidden\(\)\?captureSquare\(move\):null/);
  assert.match(main, /return \(darkActive\(\)\|\|fogOnline\(\)\|\|blackoutActive\(\)\)&&\(!mine\|\|!!browse\|\|reviewState\.viewing\);/);
  assert.match(main, /const animate=!fresh&&motionScale\(\)>0/, 'no flights with reduced motion, or a fresh tray');
  assert.match(main, /delay:Math\.max\(0,boardMotionUntil-performance\.now\(\)\)/, 'it flies as the capturing piece lands');
  assert.match(main, /piece\.classList\.add\('dropping'\)/);
  assert.match(main, /bughouse=\(watchSession\?\.state\|\|serverGame\)\?\.variant==='bughouse'/, 'Bughouse captures go to the other board');
  assert.match(css, /\.capture-flight\{position:fixed;left:0;top:0;z-index:60;pointer-events:none;/);
  assert.match(css, /\.captured-tray img\.arriving\{opacity:0\}/);
  assert.match(css, /button\.zh-piece:not\(\[disabled\]\)::after\{animation:zh-ready 2\.4s ease-in-out infinite\}/);
  assert.match(css, /@media \(prefers-reduced-motion:reduce\)\{button\.zh-piece:not\(\[disabled\]\)::after\{animation:none;/);
});
