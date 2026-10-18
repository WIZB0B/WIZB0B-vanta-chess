import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { HOME_PHOTO, HOME_RELEASE_MS, createHomeScene, homeFocus, homeSceneMarkup } from '../src/home-scene.js';
import { PAVILION } from '../src/living-scene.js';

// The home screen (owner, 2026-10-18): "the one with the pavilion is good ... bring it to life
// because the home screen needs to be alive with the lights glowing and flickering and the
// background fog alive", and the landing's name is "Vchess".
const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const main = read('../src/main.js'), css = read('../src/style.css'), scene = read('../src/living-scene.js');

test('the photograph is anchored by the screen\'s shape: the whole valley when wide, the lantern and the pieces when tall', () => {
  assert.deepEqual(homeFocus(1920, 1080), [0.5 + Math.max(0, (1.78 - 1920/1080)/(1.78 - 0.46))*0.24, 0.5]);
  assert.ok(Math.abs(homeFocus(1920, 1080)[0] - 0.5) < 0.001, 'a 16:9 screen sees it all');
  assert.equal(homeFocus(3440, 1440)[0], 0.5, 'wider than 16:9: centred');
  const phone = homeFocus(393, 852)[0];
  assert.ok(phone > 0.73 && phone < 0.75, 'a phone looks into the pavilion');
  // the near lantern and the king stay in view on a phone held upright
  const visible = 393/852/(16/9), left = phone*(1 - visible), right = left + visible;
  const [flameX] = PAVILION.lamps[0].flame;
  assert.ok(flameX/3840 > left + 0.02 && flameX/3840 < right, 'the lantern is on screen');
});

test('the photograph loads with the page only when the home screen shows first', () => {
  const eager = homeSceneMarkup({ eager: true }), later = homeSceneMarkup({ eager: false });
  assert.match(eager, /<div id="homeScene" class="home-scene" aria-hidden="true"><img class="home-photo" alt="A stone pavilion[^"]*" decoding="async" sizes="\(max-aspect-ratio: 16\/9\) 177\.78vh, 100vw" src="\/assets\/vch\/home\/pavilion-2560\.webp" srcset="[^"]+" fetchpriority="high"><\/div>/);
  assert.doesNotMatch(later, / src=| srcset=/, 'a return visit (it opens on the game) never fetches it');
  assert.match(later, /data-src="\/assets\/vch\/home\/pavilion-2560\.webp" data-srcset="\/assets\/vch\/home\/pavilion-1920\.webp 1920w, \/assets\/vch\/home\/pavilion-2560\.webp 2560w, \/assets\/vch\/home\/pavilion-3840\.webp 3840w"/);
  assert.equal(HOME_PHOTO.srcset.split(', ').length, 3);
  assert.match(main, /\$\{homeSceneMarkup\(\{eager:!startsInGame\}\)\}\n<div class="shell /, 'outside the shell, so nothing that moves the shell carries it');
});

// ---- a fake page for the scene's comings and goings ----
function fakeHome({ motionOff = false, webgl = true } = {}) {
  const attrs = { srcset: '', src: '' }; let time = 0; const timers = [];
  const listeners = {};
  const img = {
    dataset: { src: '/p.webp', srcset: '/p.webp 1x' }, complete: true, naturalWidth: 3840,
    getAttribute: k => attrs[k] || null, setAttribute: (k, v) => { attrs[k] = v; },
    decode: () => Promise.resolve(), addEventListener() {},
  };
  const host = { querySelector: () => img, style: { setProperty() {} } };
  const made = [];
  const create = async options => {
    if (!webgl) return null;
    const s = { options, playing: false, destroyed: false, canvas: { classList: { add() {} } }, play() { this.playing = true; }, pause() { this.playing = false; }, destroy() { this.destroyed = true; } };
    made.push(s); return s;
  };
  const win = {
    innerWidth: 393, innerHeight: 852,
    setTimeout(fn, ms) { timers.push({ at: time + ms, fn }); return timers.length; },
    clearTimeout(id) { if (timers[id - 1]) timers[id - 1].fn = () => {}; },
    requestAnimationFrame(fn) { fn(); },
    addEventListener(type, fn) { listeners[type] = fn; },
  };
  const home = createHomeScene({ host, motionOff: () => motionOff, create, win });
  const settle = () => new Promise(r => setTimeout(r, 0));
  const advance = ms => { time += ms; for (const t of timers) if (t.at <= time && !t.done) { t.done = true; t.fn(); } };
  return { home, img, attrs, made, settle, advance };
}

test('the scene lives while the home screen shows, pauses when it leaves, and lets go after a minute away', async () => {
  const page = fakeHome();
  page.home.show(); await page.settle(); await page.settle();
  assert.equal(page.made.length, 1); assert.ok(page.made[0].playing);
  assert.equal(page.attrs.src, '/p.webp', 'the photograph is fetched when the home screen first shows');
  page.home.hide();
  assert.ok(!page.made[0].playing, 'paused on the game screen');
  page.advance(HOME_RELEASE_MS - 1); assert.ok(!page.made[0].destroyed, 'kept for a quick return');
  page.home.show(); await page.settle(); await page.settle();
  assert.ok(page.made[0].playing && page.made.length === 1, 'the same scene again');
  page.home.hide(); page.advance(HOME_RELEASE_MS + 1);
  assert.ok(page.made[0].destroyed, 'a minute away and its memory goes');
  page.home.show(); await page.settle(); await page.settle();
  assert.equal(page.made.length, 2, 'made again on the way back');
});

test('with reduced motion or Motion at 0 the home screen is the still photograph; without WebGL too', async () => {
  const still = fakeHome({ motionOff: true });
  still.home.show(); await still.settle(); await still.settle();
  assert.equal(still.made.length, 0);
  assert.equal(still.attrs.src, '/p.webp', 'the photograph still shows');
  const plain = fakeHome({ webgl: false });
  plain.home.show(); await plain.settle(); await plain.settle();
  assert.equal(plain.home.scene, null);
  assert.match(main, /homeScene\?\?=createHomeScene\(\{host:\$\('#homeScene'\),events:\$\('#mainMenu'\),motionOff:\(\)=>motionScale\(\)===0\}\)/);
});

test('wired: the home screen shows the scene, the game screen pauses it, the V leads home', () => {
  assert.match(main, /if\(showGame\)homeScene\?\.hide\(\);else homeSceneNow\(\)\.show\(\);/);
  assert.match(main, /\$\('\.vch-brand'\)\?\.addEventListener\('click',e=>\{e\.preventDefault\(\);menus\.close\(\);setPrimaryScreen\('intro'\)\}\);/);
  assert.match(main, /motionScaleCache=null; \/\/ the saved Motion setting is applied now\nif\(!startsInGame\)homeSceneNow\(\)\.show\(\);/, 'after the saved Motion setting, so Motion at 0 is honoured from the first frame');
  assert.match(main, /<h1 id="mainMenuTitle">Play Better Chess<\/h1>/);
  assert.match(main, /<button id="joinNow" class="home-play" type="button"><span>Play now<\/span>/);
  assert.match(main, /\$\('#homeSignIn'\)\.onclick=openAccount;/);
  assert.match(main, /\$\('#homeSignIn'\)\?\.classList\.toggle\('hidden',signed\);/, 'signed in, no Sign in button');
});

test('the scene sits behind the page, shows only on the home screen, and the words stay readable', () => {
  assert.match(css, /\.home-scene\{position:fixed;inset:0;z-index:-1;overflow:hidden;background:#070b12;pointer-events:none\}/);
  assert.match(css, /body:not\(\[data-screen="intro"\]\) \.home-scene\{visibility:hidden\}/);
  assert.match(css, /\.home-scene canvas\{opacity:0;transition:opacity \.7s ease\}\n\.home-scene canvas\.on\{opacity:1\}/, 'the moving scene fades in over the still one');
  assert.match(css, /body\[data-screen="intro"\] :is\(#atmosphere,#wallLights,#resonanceBg\)\{visibility:hidden\}/);
  assert.match(css, /@media\(max-aspect-ratio:1\/1\)\{[^}]*\.home-scene::after\{background:linear-gradient\(0deg/, 'tall screens: words over the floor, a shadow rising behind them');
  assert.match(css, /\.main-menu\.home\{[^}]*touch-action:pan-y\}/, 'a sideways stroke stirs the air; an upward one still scrolls');
});

test('the living scene: real time, never a loop, and it stops when it cannot be seen', () => {
  assert.match(scene, /document\.addEventListener\('visibilitychange', onVisibility\)/);
  assert.match(scene, /canvas\.addEventListener\('webglcontextlost', e => \{ e\.preventDefault\(\); stop\(\); \}, false\);/);
  assert.match(scene, /if\(avg > 0\.026 && scale > 0\.7\)\{ scale = Math\.max\(0\.7, scale\*0\.85\); resize\(\); \}/, 'a slow device draws fewer pixels');
  assert.match(scene, /const dprCap = quality\.dprCap \|\| 2;/);
  assert.match(scene, /failIfMajorPerformanceCaveat: !quality\.allowSoftware/, 'never drawn in software, where it would cost battery and heat');
  assert.match(scene, /const budget = quality\.pixelBudget \|\| 3\.2e6;/);
  assert.doesNotMatch(scene, /Math\.sin\(t\)|setInterval/);
  // the mist is drawn at a third of the resolution; the photograph at full
  assert.match(scene, /const fw = Math\.max\(64, Math\.round\(devW\/3\)\), fh = Math\.max\(64, Math\.round\(devH\/3\)\);/);
  for (const lamp of PAVILION.lamps) {
    assert.ok(lamp.flame[0] < 3840 && lamp.flame[1] < 2160 && lamp.pivot[1] < lamp.flame[1] && lamp.flame[1] < lamp.bottom[1], 'each lantern hangs from its chain');
  }
});

// Owner, 2026-10-18: "The background is not alive ... The fogs are not moving. Nothing is moving",
// and the light outside the pavilion did not react to the candles.
test('the fog in the photograph itself drifts, at a pace you can see', () => {
  // the photo's own fog is carried along the wind over the land beneath it (no painted layer)
  assert.match(scene, /the fog in the photograph drifts: the land under it stays put, and the light the fog adds is\n  \/\/ carried along the wind/);
  assert.match(scene, /vec3 moved = clamp\(c \+ tint\*add, vec3\(0\.0\), max\(c, max\(p1, p2\)\)\);/, 'fog never brightens anything past the fog it came from');
  // the sky stops where the land starts, column by column, so fog never drifts over open sky
  assert.match(scene, /per column: where the sky ends/);
  // speeds on the master photograph, in pixels a second: fog 22, clouds 20 (a few seconds shows it)
  assert.match(scene, /const speed = \{ cloud: quality\.cloudSpeed \?\? 20, fog: quality\.fogSpeed \?\? 22, ground: quality\.groundSpeed \?\? 0\.6 \};/);
  // the two copies of the moving sky and fog wrap at different moments in different places
  assert.match(scene, /float off = 0\.5\*sin\(uv\.x\*5\.3 \+ uv\.y\*3\.1\) \+ 0\.5\*sin\(uv\.x\*2\.1 - uv\.y\*7\.7 \+ 1\.3\);/);
});

test('candlelight: every lit surface, inside and out, flickers with the lanterns that light it', () => {
  // each lantern's share of the light falls off with the square of the distance; the lit stone
  // follows the share, so the spill on the steps and the path flickers too, not only the interior
  assert.match(scene, /float e = 1\.0\/\(14400\.0 \+ d2\);/);
  assert.match(scene, /float share = lsum\/max\(wsum, 1e-6\);/);
  assert.match(scene, /c \*= 1\.0 \+ m\.g\*\(share - 1\.0\);/);
  // any number of lanterns, up to eight, each with its own flame, sway and flicker
  assert.match(scene, /export const MAX_LAMPS = 8;/);
  assert.match(scene, /uniform vec4 uLampA\[\$\{MAX_LAMPS\}\];/);
  assert.ok(PAVILION.lamps.length >= 1 && PAVILION.lamps.length <= 8);
});
