import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MODES, Sand, SandBackdrop, modeForChord, modeForFrequency, modeForMoment, modeList, nextHome, plate, restingPoint, seeded, slope, spectrumEnergy } from '../src/resonance.js';
import { VantaScore, chordFor } from '../src/music.js';

const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');

test('the plate: Chladni\'s square-plate modes, lowest pitch first', () => {
  const list = modeList(4);
  for (let i = 1; i < list.length; i++) assert.ok(list[i].n ** 2 + list[i].m ** 2 >= list[i - 1].n ** 2 + list[i - 1].m ** 2);
  assert.ok(list.every(x => x.n > x.m && x.m >= 0 && (x.s === 1 || x.s === -1)));
  // The antisymmetric mode is still along the diagonal x = y; the symmetric one along x = 1 - y for odd n + m.
  const mode = { n: 3, m: 1, s: 1 };
  for (const t of [0.1, 0.37, 0.8]) assert.ok(Math.abs(plate(mode, t, t)) < 1e-12);
  assert.ok(Math.abs(plate({ n: 2, m: 1, s: -1 }, 0.3, 0.7)) < 1e-12);
  assert.ok(Math.abs(plate(mode, 0, 0)) < 1e-12 && Math.abs(plate(mode, 0.2, 0.9)) > 0.1);
});

test('the slope is the plate\'s gradient', () => {
  const r = seeded(5), h = 1e-6;
  for (const mode of [MODES[3], MODES[27], MODES[60], MODES[89]]) for (let k = 0; k < 20; k++) {
    const x = r(), y = r(), [gx, gy] = slope(mode, x, y);
    assert.ok(Math.abs(gx - (plate(mode, x + h, y) - plate(mode, x - h, y)) / (2 * h)) < 1e-4);
    assert.ok(Math.abs(gy - (plate(mode, x, y + h) - plate(mode, x, y - h)) / (2 * h)) < 1e-4);
  }
});

test('a grain slides to the nearest still line and stays on the plate', () => {
  const r = seeded(9), mode = MODES[43];
  let landed = 0;
  for (let k = 0; k < 400; k++) {
    const x = r(), y = r(), [px, py] = restingPoint(mode, x, y);
    assert.ok(px >= 0 && px <= 1 && py >= 0 && py <= 1);
    if (Math.abs(plate(mode, px, py)) < 0.01) landed++;
    assert.ok(Math.hypot(px - x, py - y) <= 8 * 0.04 + 1e-9, 'never further than its reach');
  }
  assert.ok(landed > 380, `${landed} of 400 on a line`);
  // A grain already on a line barely moves when the same figure rings again.
  const [lx, ly] = restingPoint(mode, 0.3, 0.3);
  const [nx, ny] = nextHome(mode, lx, ly, seeded(2));
  assert.ok(Math.abs(plate(mode, nx, ny)) < 0.05 && Math.hypot(nx - lx, ny - ly) < 0.06);
});

test('sand comes to rest on the still lines, and moves to a new figure', () => {
  const sand = new Sand(3000, seeded(11));
  sand.setMode(MODES[20]); sand.blend = 1; sand.from = null;
  const start = sand.restlessness();
  for (let i = 0; i < 150; i++) sand.step(1 / 60, 0.6);
  const settled = sand.restlessness();
  assert.ok(start > 0.4 && settled < start / 5, `${start} -> ${settled}`);
  sand.setMode(MODES[40]);
  assert.ok(sand.blend === 0 && sand.from === MODES[20]);
  for (let i = 0; i < 200; i++) sand.step(1 / 60, 0.6);
  assert.equal(sand.blend, 1); assert.equal(sand.from, null);
  assert.ok(sand.restlessness() < 0.1);
  for (let i = 0; i < sand.count; i++) assert.ok(sand.x[i] >= 0 && sand.x[i] <= 1 && sand.y[i] >= 0 && sand.y[i] <= 1);
});

test('music chooses the figures', () => {
  assert.ok(modeForFrequency(880).n ** 2 + modeForFrequency(880).m ** 2 > modeForFrequency(110).n ** 2 + modeForFrequency(110).m ** 2, 'higher notes, finer figures');
  const minor = modeForChord(chordFor('vanta', 0)), major = modeForChord(chordFor('gilded', 0));
  assert.ok(MODES.includes(minor) && MODES.includes(major));
  assert.equal(modeForChord([]), MODES[2]);
  // The background takes a finer figure than the room, and a tense game a finer one still.
  const chord = chordFor('vanta', 0), calm = modeForMoment(chord, 0), tense = modeForMoment(chord, 1);
  assert.ok(MODES.indexOf(calm) > MODES.indexOf(modeForChord(chord)));
  assert.ok(MODES.indexOf(tense) > MODES.indexOf(calm));
  const few = MODES.slice(0, 40);
  assert.equal(modeForMoment([127], 1, few), few[few.length - 1], 'never past the finest figure');
  assert.equal(modeForMoment(chord, 'loud'), calm);
  assert.equal(spectrumEnergy(null), 0);
  assert.equal(spectrumEnergy(new Uint8Array(8)), 0);
  assert.equal(spectrumEnergy(new Uint8Array(8).fill(255)), 1);
});

test('the score has a listening tap and reports its chord', () => {
  const score = new VantaScore({ AudioContextClass: null });
  assert.equal(score.readSpectrum(), null);
  assert.deepEqual(score.chord, chordFor('vanta', 0));
});

// A canvas (and a glow canvas), a window and animation frames that the test drives by hand.
function fakeStage({ width = 1280, height = 720, dpr = 2 } = {}) {
  const puts = [], glows = [];
  const surface = list => ({ createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }), putImageData: img => list.push(img) });
  const ctx = surface(puts), gctx = surface(glows);
  const canvas = { width: 0, height: 0, getContext: () => ctx }, glow = { width: 0, height: 0, getContext: () => gctx };
  let now = 0, frames = [];
  const view = {
    innerWidth: width, innerHeight: height, devicePixelRatio: dpr,
    performance: { now: () => now },
    requestAnimationFrame: f => { frames.push(f); return frames.length; },
    cancelAnimationFrame: () => { frames = []; },
  };
  const run = (ms = 16) => { now += ms; const due = frames; frames = []; for (const f of due) f(now); return due.length; };
  // Runs frames until nothing is scheduled (or the guard runs out); returns how many were drawn.
  const settle = (guard = 2000) => { const before = puts.length; for (let k = 0; k < guard && frames.length; k++) run(16); return puts.length - before; };
  return { canvas, glow, view, puts, glows, run, settle, pending: () => frames.length, advance: ms => { now += ms; } };
}
const sameImage = (a, b) => a.data.length === b.data.length && a.data.every((v, i) => v === b.data[i]);
const lightOf = img => { let s = 0; for (let i = 3; i < img.data.length; i += 4) s += img.data[i]; return s; };
// A figure at rest, with its image (copied: the backdrop reuses its pixel buffer).
function restingBackdrop(options = {}) {
  const stage = fakeStage(options.stage);
  const b = new SandBackdrop(stage.canvas, { glow: stage.glow, random: seeded(11), view: stage.view, ...options });
  b.show(MODES[43], { flow: false }); stage.settle();
  const copy = img => ({ data: Uint8ClampedArray.from(img.data) });
  return { stage, b, rest: copy(stage.puts.at(-1)), glowRest: copy(stage.glows.at(-1)), copy };
}
const lit = img => { let n = 0; for (let i = 3; i < img.data.length; i += 4) if (img.data[i]) n++; return n; };

test('the background covers the window with a square plate and sows sand only where it shows', () => {
  const stage = fakeStage({ width: 1280, height: 720, dpr: 2 });
  const b = new SandBackdrop(stage.canvas, { random: seeded(4), view: stage.view });
  assert.equal(b.S, 1280); assert.equal(b.ox, 0); assert.equal(b.oy, -280);
  assert.equal(b.dpr, 1, 'a big window draws at 1x'); assert.deepEqual([stage.canvas.width, stage.canvas.height], [1280, 720]);
  assert.equal(b.count, Math.round(1280 * 720 / 60));
  for (let i = 0; i < b.count; i++) assert.ok(b.y[i] >= b.lo[1] && b.y[i] <= b.hi[1]);
  const phone = fakeStage({ width: 390, height: 844, dpr: 3 }), p = new SandBackdrop(phone.canvas, { random: seeded(4), view: phone.view });
  assert.equal(p.dpr, 2); assert.deepEqual([phone.canvas.width, phone.canvas.height], [780, 1688]);
  assert.equal(p.count, Math.round(390 * 844 / 60));
});

test('the first figure forms at once; the next one drifts in, then everything stops', () => {
  const stage = fakeStage();
  let ready = 0;
  const b = new SandBackdrop(stage.canvas, { random: seeded(8), view: stage.view, flow: 3000, onReady: () => ready++ });
  b.show(MODES[43], { flow: false });
  assert.equal(stage.puts.length, 0, 'worked out over frames, not at once');
  let guard = 0; while (b.busy && guard++ < 100) stage.run(16);
  assert.equal(ready, 1); assert.equal(stage.puts.length, 1);
  assert.ok(lit(stage.puts[0]) > 5000);
  let off = 0; for (let i = 0; i < b.count; i++) if (Math.abs(plate(MODES[43], b.x[i], b.y[i])) > 0.05) off++;
  assert.ok(off < b.count * 0.01, `${off} grains off the lines`);
  assert.equal(stage.pending(), 0, 'nothing runs while the figure rests');
  // The same figure again changes nothing.
  b.show(MODES[43]); assert.equal(b.busy, false);
  // A new figure: the sand drifts for three seconds, drawn about 30 times a second.
  const before = Float32Array.from(b.x);
  b.show(MODES[60]);
  guard = 0; while (b.job && guard++ < 100) stage.run(16);
  assert.ok(b.drift, 'drifting');
  const drawsBefore = stage.puts.length;
  for (let k = 0; k < 400 && b.busy; k++) stage.run(16);
  assert.equal(b.busy, false, 'the drift ends');
  const draws = stage.puts.length - drawsBefore;
  assert.ok(draws >= 80 && draws <= 110, `${draws} frames drawn for a 3 s drift`);
  assert.equal(stage.pending(), 0);
  let moved = 0; for (let i = 0; i < b.count; i++) if (b.x[i] !== before[i]) moved++;
  assert.ok(moved > b.count * 0.9);
  off = 0; for (let i = 0; i < b.count; i++) if (Math.abs(plate(MODES[60], b.x[i], b.y[i])) > 0.05) off++;
  assert.ok(off < b.count * 0.01, `${off} grains off the new lines`);
  assert.equal(ready, 1, 'onReady runs once');
});

test('the background re-forms when the window changes shape, and stops cleanly', () => {
  const stage = fakeStage({ width: 1280, height: 720 });
  const b = new SandBackdrop(stage.canvas, { random: seeded(3), view: stage.view });
  b.show(MODES[50], { flow: false }); b.work();
  const count = b.count;
  stage.view.innerWidth = 1260; b.layout();
  assert.equal(b.count, count, 'a small change keeps the sand');
  // Turned on its side: the plate shows a tall band now, so the sand is sown there and re-forms.
  stage.view.innerWidth = 720; stage.view.innerHeight = 1280; b.layout();
  assert.equal(b.mode, MODES[50]);
  assert.ok(b.job, 'the new sand settles into the same figure'); b.work();
  let off = 0, outside = 0;
  for (let i = 0; i < b.count; i++) { if (Math.abs(plate(MODES[50], b.x[i], b.y[i])) > 0.05) off++; if (b.x[i] < b.lo[0] - 0.05 || b.x[i] > b.hi[0] + 0.05) outside++; }
  assert.ok(off < b.count * 0.01); assert.ok(outside < b.count * 0.01, `${outside} grains out of view`);
  b.show(MODES[70]); b.stop();
  assert.equal(b.busy, false); assert.equal(stage.pending(), 0);
});

test('Resonance is wired: a background setting, nothing on the board, and the room', () => {
  assert.match(main, /<label>Resonance background <select id="resonanceSetting"><option value="off">Off<\/option><option value="on">On<\/option><\/select><\/label>/);
  assert.doesNotMatch(main, /resonance-layer|resonanceTick|afterBoardPaint\(resonance/, 'nothing of it on the board');
  assert.match(main, /layer\.id='resonanceBg';layer\.setAttribute\('aria-hidden','true'\);layer\.innerHTML='<canvas class="resonance-glow"><\/canvas><canvas class="resonance-sand"><\/canvas>';document\.body\.prepend\(layer\)/);
  assert.match(main, /resonanceLevel=\['on','subtle','vivid'\]\.includes\(saved\)\?'on':'off';/, 'the old board settings turn the background on');
  assert.match(main, /if\(now-beat\.at>=9000&&!g\.endAt\)/, 'at most one figure per nine seconds');
  // The game drives it: each move rings out as the piece lands, from where it landed, and in the
  // dark the opponent's moves ring from the middle of the board and say nothing else.
  assert.match(main, /syncWallLights\(mood\);syncResonanceGame\(mood\);syncMusic\(mood\);/);
  assert.match(main, /hidden=\(darkActive\(\)\|\|fogOnline\(\)\|\|blackoutActive\(\)\)&&\(!mine\|\|!!browse\|\|reviewState\.viewing\)/);
  assert.match(main, /const san=String\(move\.san\|\|''\),captured=!hidden&&/);
  assert.match(main, /at=resonancePoint\(hidden\?null:move\.to\)/);
  assert.match(main, /resonance\.pause\(travel\+40\)/, 'still while the piece travels');
  // The pointer: never over the board, a dialog or a menu; over the panels only through clear glass.
  assert.match(main, /const hidesSand=t=>!!t\?\.closest\?\.\('\.board,#board,dialog,\.main-menu'\)\|\|\(document\.documentElement\.dataset\.glass!=='clear'/);
  assert.match(main, /resonance\.listen\(\(\)=>vantaScore\?\.playing\?vantaScore\.readSpectrum\(\):null\)/);
  assert.match(main, /if\(playing&&!still\)/, 'reduced motion keeps one still figure');
  assert.match(main, /if\(resonanceRoom\?\.playing\)return; \/\/ the Resonance room plays its own score/);
  assert.match(main, /function renderResonanceRoom\(\)/);
  assert.match(css, /#resonanceBg\{position:fixed;inset:0;z-index:-2;pointer-events:none;/);
  assert.match(css, /#resonanceBg \.resonance-glow\{opacity:/);
  assert.doesNotMatch(css, /resonance-layer/);
});

test('the first figure gathers out of scattered sand; with reduced motion it is simply there', () => {
  const stage = fakeStage();
  let ready = 0;
  const b = new SandBackdrop(stage.canvas, { glow: stage.glow, random: seeded(5), view: stage.view, flow: 2000, onReady: () => ready++ });
  b.show(MODES[30]);
  let guard = 0; while (b.job && guard++ < 100) stage.run(16);
  assert.ok(b.drift, 'it drifts in from where the sand was sown');
  stage.run(16); stage.run(16);
  assert.equal(ready, 1, 'shown from the first frame, while it gathers');
  let off = 0; for (let i = 0; i < b.count; i++) if (Math.abs(plate(MODES[30], b.x[i], b.y[i])) > 0.05) off++;
  assert.ok(off > b.count * 0.5, 'still scattered');
  stage.settle();
  off = 0; for (let i = 0; i < b.count; i++) if (Math.abs(plate(MODES[30], b.x[i], b.y[i])) > 0.05) off++;
  assert.ok(off < b.count * 0.01, `${off} grains off the lines`);
  assert.ok(lightOf(stage.glows.at(-1)) > 0, 'the lines glow');
  const still = fakeStage(), s = new SandBackdrop(still.canvas, { random: seeded(5), view: still.view, motion: false });
  s.show(MODES[30]); still.settle();
  assert.equal(s.drift, null); assert.equal(still.puts.length, 1, 'placed at once and drawn once');
});

test('a ring runs out from where a move lands, lights the lines it crosses, and the sand settles back exactly', () => {
  const { stage, b, rest, glowRest } = restingBackdrop();
  assert.equal(stage.pending(), 0);
  assert.equal(b.ripple(Number.NaN, 0), false, 'no ring from nowhere');
  assert.ok(b.ripple(640, 360, { amp: 12, light: 1.4 }));
  for (let k = 0; k < 20; k++) stage.run(16);
  assert.ok(!sameImage(stage.puts.at(-1), rest), 'the sand moves');
  assert.ok(lightOf(stage.glows.at(-1)) > lightOf(glowRest) * 1.05, 'the ring and the lines it crosses light up');
  // Drawn about 30 times a second while it runs.
  const before = stage.puts.length; for (let k = 0; k < 62; k++) stage.run(16);
  const drawn = stage.puts.length - before;
  assert.ok(drawn >= 25 && drawn <= 33, `${drawn} frames in a second`);
  stage.settle();
  assert.equal(stage.pending(), 0, 'nothing runs once it has passed');
  assert.equal(b.ripples.length, 0); assert.equal(b.dirty, false);
  assert.ok(sameImage(stage.puts.at(-1), rest), 'the sand lies exactly where it lay');
  assert.ok(sameImage(stage.glows.at(-1), glowRest));
  // A ring that starts wide (from under the board) is gone sooner; six at most at once.
  b.ripple(640, 360, { from: 300 }); const wide = b.ripples.at(-1).life; b.ripples = [];
  b.ripple(640, 360); assert.ok(b.ripples.at(-1).life > wide); b.ripples = [];
  for (let k = 0; k < 9; k++) b.ripple(10 * k, 10);
  assert.equal(b.ripples.length, 6);
  stage.settle(); assert.ok(sameImage(stage.puts.at(-1), rest));
});

test('the pointer parts the sand and it flows back behind it; a resting pointer lets it go', () => {
  const { stage, b, rest } = restingBackdrop();
  // Drag across the window.
  for (let k = 0; k <= 30; k++) { b.touch(200 + k * 30, 120 + k * 16, 34); stage.run(16); }
  assert.ok(b.pushed);
  let near = 0, far = 0;
  for (let i = 0; i < b.count; i++) {
    const m = Math.abs(b.dx[i]) + Math.abs(b.dy[i]);
    if (m > 1) { const sx = b.ox + b.x[i] * b.S + b.jx[i], sy = b.oy + b.y[i] * b.S + b.jy[i]; if (sy < 40 || sy > 680) far++; else near++; }
  }
  assert.ok(near > 50, `${near} grains pushed aside`); assert.equal(far, 0, 'none far from the path');
  assert.ok(!sameImage(stage.puts.at(-1), rest));
  b.lift(); stage.settle();
  assert.equal(b.pushed, false); assert.ok(b.dx.every(v => v === 0) && b.dy.every(v => v === 0));
  assert.ok(sameImage(stage.puts.at(-1), rest), 'flowed back exactly');
  assert.equal(stage.pending(), 0);
  // A pointer that stops moving lets the sand back on its own.
  b.touch(640, 360); stage.run(16);
  for (let k = 0; k < 120 && stage.pending(); k++) stage.run(16);
  assert.equal(b.finger, null); stage.settle(); assert.ok(sameImage(stage.puts.at(-1), rest));
});

test('a shiver, the music and a pause', () => {
  const { stage, b, rest } = restingBackdrop();
  assert.ok(b.tremble(2.5, 400));
  stage.run(40);
  assert.ok(!sameImage(stage.puts.at(-1), rest), 'it shivers');
  stage.settle(); assert.equal(b.shiver, null); assert.ok(sameImage(stage.puts.at(-1), rest));
  // The music: the sand dances while the ear hears something, then settles exactly.
  let loud = new Uint8Array(256).fill(170);
  b.listen(() => loud);
  b.wake(); assert.equal(stage.pending(), 1, 'woken by the music');
  for (let k = 0; k < 30; k++) stage.run(16);
  assert.ok(b.dance > 0.5 && b.bass > 0.5, `dance ${b.dance}, bass ${b.bass}`);
  assert.ok(!sameImage(stage.puts.at(-1), rest));
  // About 24 frames a second for the music alone.
  const before = stage.puts.length; for (let k = 0; k < 62; k++) stage.run(16);
  const drawn = stage.puts.length - before;
  assert.ok(drawn >= 19 && drawn <= 26, `${drawn} frames in a second`);
  loud = null; stage.settle();
  assert.equal(b.hearing, false); assert.equal(b.dance, 0); assert.ok(sameImage(stage.puts.at(-1), rest));
  b.listen(null); b.wake(); assert.equal(stage.pending(), 0, 'silence wakes nothing');
  // A pause: no frames while a piece travels, then the ring.
  b.pause(300); b.ripple(100, 100);
  const held = stage.puts.length; for (let k = 0; k < 18; k++) stage.run(16);
  assert.equal(stage.puts.length, held, 'still during the pause');
  stage.run(16); stage.run(16); assert.ok(stage.puts.length > held);
  stage.settle();
});

test('reduced motion stops every answer and lays the sand still; swells come now and then', () => {
  const { stage, b, rest } = restingBackdrop();
  b.ripple(640, 360); b.tremble(); b.touch(640, 360); stage.run(16); stage.run(16);
  b.setMotion(false);
  assert.equal(b.ripples.length, 0); assert.equal(b.shiver, null); assert.equal(b.finger, null);
  assert.ok(sameImage(stage.puts.at(-1), rest), 'laid still at once');
  assert.equal(b.ripple(1, 1), false); assert.equal(b.tremble(), false); assert.equal(b.touch(1, 1), false);
  stage.settle(); assert.ok(sameImage(stage.puts.at(-1), rest));
  // Swells: a timer brings a slow, faint ring in from an edge of the window.
  let timer = null;
  const view = { ...stage.view, setTimeout: (f, ms) => { timer = { f, ms }; return 7; }, clearTimeout: () => { timer = null; } };
  const s = new SandBackdrop(fakeStage().canvas, { random: seeded(2), view, swell: [9000, 16000] });
  assert.ok(timer && timer.ms >= 9000 && timer.ms <= 16000, 'armed');
  s.show(MODES[20], { flow: false }); s.work();
  timer.f();
  assert.equal(s.ripples.length, 1);
  const r = s.ripples[0];
  assert.ok(r.slow && r.amp < 5 && (r.x < 0 || r.y < 0 || r.x > 1280 || r.y > 720), 'from just outside the window');
  assert.ok(timer, 'and armed again');
  s.setMotion(false); assert.equal(timer, null, 'no swells with reduced motion');
  s.stop();
});
