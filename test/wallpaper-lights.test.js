import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { WALLPAPER_LIGHTS, WALLPAPER_SIZE, coverPlacement, lightReaction, placeLights, wallpaperKey } from '../src/wallpaper-lights.js';

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
  assert.match(main, /syncWallLights\(mood\);syncMusic\(mood\);syncOathLine\(\);/);
  assert.match(main, /if\(level==='off'\)\{el\?\.remove\(\);wallLights\.el=null;return null\}/);
  assert.match(main, /fog:darkActive\(\)\|\|fogOnline\(\)\|\|blackoutActive\(\)/);
  assert.match(main, /type="range" min="15" max="100" value="94"/);
  assert.match(css, /#wallLights\{position:fixed;inset:0;z-index:-1;pointer-events:none;/);
  assert.match(css, /@media \(prefers-reduced-motion:reduce\)\{#wallLights b\{animation:none\}/);
  assert.match(css, /:root\[data-glass="clear"\] \.panel,:root\[data-glass="clear"\] \.game,:root\[data-glass="clear"\] \.topbar\{\s*backdrop-filter:blur\(var\(--glass-blur\)\)/);
});
