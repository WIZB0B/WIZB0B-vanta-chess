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

// A canvas, a window and animation frames that the test drives by hand.
function fakeStage({ width = 1280, height = 720, dpr = 2 } = {}) {
  const puts = [];
  const ctx = { createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }), putImageData: img => puts.push(img) };
  const canvas = { width: 0, height: 0, getContext: () => ctx };
  let now = 0, frames = [];
  const view = {
    innerWidth: width, innerHeight: height, devicePixelRatio: dpr,
    performance: { now: () => now },
    requestAnimationFrame: f => { frames.push(f); return frames.length; },
    cancelAnimationFrame: () => { frames = []; },
  };
  const run = (ms = 16) => { now += ms; const due = frames; frames = []; for (const f of due) f(now); return due.length; };
  return { canvas, view, puts, run, pending: () => frames.length, advance: ms => { now += ms; } };
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
  assert.match(main, /layer\.id='resonanceBg';layer\.setAttribute\('aria-hidden','true'\);layer\.append\(document\.createElement\('canvas'\)\);document\.body\.prepend\(layer\)/);
  assert.match(main, /resonanceLevel=\['on','subtle','vivid'\]\.includes\(saved\)\?'on':'off';/, 'the old board settings turn the background on');
  assert.match(main, /if\(now-beat\.at>=9000\)/, 'at most one figure per nine seconds');
  assert.match(main, /if\(playing&&!still\)/, 'reduced motion keeps one still figure');
  assert.match(main, /if\(resonanceRoom\?\.playing\)return; \/\/ the Resonance room plays its own score/);
  assert.match(main, /function renderResonanceRoom\(\)/);
  assert.match(css, /#resonanceBg\{position:fixed;inset:0;z-index:-2;pointer-events:none;/);
  assert.doesNotMatch(css, /resonance-layer/);
});
