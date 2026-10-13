import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { WALLPAPER_LIGHTS, WALLPAPER_SIZE, WallLights, coverPlacement, lightReaction, placeLights, wallpaperKey } from '../src/wallpaper-lights.js';

const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');

test('every wallpaper has its lights, inside the picture, each a flame, a lamp or a reflection', () => {
  assert.deepEqual(Object.keys(WALLPAPER_LIGHTS).sort(), ['burgundy', 'classic', 'cobalt', 'ivory']);
  for (const [key, lights] of Object.entries(WALLPAPER_LIGHTS)) {
    assert.ok(lights.length >= 8, key);
    for (const [x, y, r, color, kind] of lights) {
      assert.ok(x >= 0 && x <= 1 && y >= 0 && y <= 1 && r > 0 && r < 0.05, `${key} ${x},${y}`);
      assert.match(color, /^#[0-9a-f]{6}$/);
      assert.ok(['f', 'l', 'r'].includes(kind));
    }
  }
});

test('the wallpaper in a background image names its light set', () => {
  assert.equal(wallpaperKey('linear-gradient(red, blue), url("http://x/assets/vch/wallpapers/wallpaper-emerald.webp")'), 'classic');
  assert.equal(wallpaperKey('url(/assets/vch/wallpapers/wallpaper-cobalt.webp)'), 'cobalt');
  assert.equal(wallpaperKey('none'), null);
});

test('lights land where background-size: cover puts the picture (centred, top-aligned)', () => {
  const wide = coverPlacement(1920, 1080), tall = coverPlacement(390, 844);
  assert.ok(Math.abs(wide.s - Math.max(1920 / 2688, 1080 / 1520)) < 1e-12 && wide.oy === 0);
  assert.ok(tall.ox < 0, 'a phone crops the sides');
  const [x, y] = WALLPAPER_LIGHTS.classic[2], placed = placeLights('classic', 1920, 1080);
  const hit = placed.find(p => Math.abs(p.x - Math.round(wide.ox + x * WALLPAPER_SIZE[0] * wide.s)) <= 1 && Math.abs(p.y - Math.round(y * WALLPAPER_SIZE[1] * wide.s)) <= 1);
  assert.ok(hit, 'the third light lands at its spot in the picture');
  // Same window, same flicker: the timing is seeded, not random per visit.
  assert.deepEqual(placeLights('classic', 1920, 1080), placed);
  for (const p of placed) assert.ok(p.d >= 0.9 && p.d <= 4.8 && p.o <= 0 && p.size >= 18);
  // A phone shows the middle of the picture: lights far off the sides are left out.
  assert.ok(placeLights('classic', 390, 844).length < WALLPAPER_LIGHTS.classic.length);
  assert.deepEqual(placeLights('nowhere', 800, 600), []);
});

test('the room answers a move without giving away what fog hides', () => {
  assert.equal(lightReaction({}), 'breath');
  assert.equal(lightReaction({ captured: true }), 'gutter');
  assert.equal(lightReaction({ check: true, captured: true }), 'flare');
  assert.equal(lightReaction({ captured: true, mine: false, fog: true }), 'breath');
  assert.equal(lightReaction({ check: true, mine: false, fog: true }), 'breath');
  assert.equal(lightReaction({ captured: true, mine: true, fog: true }), 'gutter');
});

test('wired: a layer under the atmosphere, set by the Living atmosphere setting, and glass that clears', () => {
  assert.match(main, /syncWallLights\(mood\);syncResonanceGame\(mood\);syncMusic\(mood\);syncOathLine\(\);/);
  assert.match(main, /if\(level==='off'\)return drop\(\);/);
  assert.match(main, /fog:darkActive\(\)\|\|fogOnline\(\)\|\|blackoutActive\(\)/);
  assert.match(main, /type="range" min="15" max="100" value="94"/);
  assert.match(css, /#wallLights\{position:fixed;inset:0;width:100vw;height:100vh;z-index:-1;pointer-events:none;/);
  assert.match(main, /if\(still\)\{if\(wallLights\.glow\.running\|\|!wallLights\.glow\.still\)wallLights\.glow\.stop\(\{still:true\}\)\}else wallLights\.glow\.start\(\);/, 'reduced motion: one still picture');
  assert.match(main, /wallLights\.glow\.hold\(340\)/, 'still while a piece moves');
  assert.match(css, /:root\[data-glass="clear"\] \.panel,:root\[data-glass="clear"\] \.game,:root\[data-glass="clear"\] \.topbar\{\s*backdrop-filter:blur\(var\(--glass-blur\)\)/);
});

// A canvas, a context that counts what it draws, and frames driven by hand.
function stage() {
  const calls = { fill: 0, clear: 0 };
  const ctx = { createRadialGradient: () => ({ addColorStop() {} }), setTransform() {}, clearRect() { calls.clear++; }, fillRect() { calls.fill++; }, set fillStyle(v) {}, set globalAlpha(v) {} };
  let now = 0, frames = [];
  const view = { performance: { now: () => now }, requestAnimationFrame: f => { frames.push(f); return frames.length; }, cancelAnimationFrame: () => { frames = []; } };
  const run = ms => { now += ms; const due = frames; frames = []; for (const f of due) f(now); };
  return { canvas: { width: 0, height: 0, getContext: () => ctx }, view, calls, run, pending: () => frames.length };
}

test('one canvas: about 15 drawings a second, none while a piece moves, one still picture for reduced motion', () => {
  const st = stage(), wl = new WallLights(st.canvas, { view: st.view });
  const lights = placeLights('classic', 1440, 900);
  wl.setLights(lights, 1440, 900);
  assert.deepEqual([st.canvas.width, st.canvas.height], [720, 450], 'half resolution');
  assert.equal(st.calls.fill, lights.length, 'every light drawn once on setup');
  wl.start();
  const before = st.calls.clear;
  for (let i = 0; i < 60; i++) st.run(1000 / 60); // one second at 60 Hz
  const drawn = st.calls.clear - before;
  assert.ok(drawn >= 13 && drawn <= 16, `${drawn} drawings in a second`);
  // Held for a move: nothing is drawn until it lands.
  wl.hold(340);
  const held = st.calls.clear;
  for (let i = 0; i < 18; i++) st.run(1000 / 60);
  assert.equal(st.calls.clear, held);
  for (let i = 0; i < 12; i++) st.run(1000 / 60);
  assert.ok(st.calls.clear > held, 'flickers again after the move');
  // Reduced motion: one calm picture and no more frames.
  wl.stop({ still: true });
  assert.equal(st.pending(), 0); assert.equal(wl.still, true);
});

test('each light flickers in its own range; the pointer leans the flames near it', () => {
  const st = stage(), wl = new WallLights(st.canvas, { view: st.view });
  wl.setLights(placeLights('burgundy', 1440, 900), 1440, 900);
  for (const l of wl.lights) for (let t = 0; t < 20000; t += 137) { const v = wl.level(l, t); assert.ok(v >= 0.3 && v <= 1, `${v}`); }
  const flame = wl.lights.find(l => l.kind === 'f'), lamp = wl.lights.find(l => l.kind === 'l');
  const spread = l => { let lo = 1, hi = 0; for (let t = 0; t < 20000; t += 50) { const v = wl.level(l, t); lo = Math.min(lo, v); hi = Math.max(hi, v); } return hi - lo; };
  assert.ok(spread(flame) > spread(lamp), 'flames flicker more than lamps breathe');
  assert.equal(wl.stir(flame.x + 10, flame.y), 1 + wl.lights.filter(l => l !== flame && l.kind !== 'l' && Math.hypot(l.x - flame.x - 10, l.y - flame.y) <= 60 + l.size * 0.5).length);
  assert.equal(flame.lean, -1, 'leans away from the pointer');
  assert.equal(wl.stir(-5000, -5000), 0);
});
