import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MODES, Sand, modeForChord, modeForFrequency, modeForMove, modeList, plate, seeded, spectrumEnergy } from '../src/resonance.js';
import { VantaScore, chordFor } from '../src/music.js';

const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');

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

test('music and moves choose figures', () => {
  assert.ok(modeForFrequency(880).n ** 2 + modeForFrequency(880).m ** 2 > modeForFrequency(110).n ** 2 + modeForFrequency(110).m ** 2, 'higher notes, finer figures');
  const minor = modeForChord(chordFor('vanta', 0)), major = modeForChord(chordFor('gilded', 0));
  assert.ok(MODES.includes(minor) && MODES.includes(major));
  assert.equal(modeForChord([]), MODES[2]);
  const quiet = modeForMove({ to: 'e4', piece: 'p' }), sharp = modeForMove({ to: 'f7', piece: 'q', captured: 'p', check: true });
  assert.ok(MODES.indexOf(sharp) > MODES.indexOf(quiet), 'a queen capture with check rings a finer figure');
  assert.equal(spectrumEnergy(null), 0);
  assert.equal(spectrumEnergy(new Uint8Array(8)), 0);
  assert.equal(spectrumEnergy(new Uint8Array(8).fill(255)), 1);
});

test('the score has a listening tap and reports its chord', () => {
  const score = new VantaScore({ AudioContextClass: null });
  assert.equal(score.readSpectrum(), null);
  assert.deepEqual(score.chord, chordFor('vanta', 0));
});

test('Resonance is wired: a setting, the board layer, fog-safe moves and the room', () => {
  assert.match(main, /<select id="resonanceSetting"><option value="off">Off<\/option><option value="subtle">Subtle<\/option><option value="vivid">Vivid<\/option><\/select>/);
  assert.match(main, /if\(resonanceLevel!=='off'\)afterBoardPaint\(resonanceTick\);/);
  assert.match(main, /if\(fog&&move\.color!==myColor\)return;/, 'the sand never tells you about a move you cannot see');
  assert.match(main, /if\(resonanceRoom\?\.playing\)return; \/\/ the Resonance room plays its own score/);
  assert.match(main, /function renderResonanceRoom\(\)/);
  assert.match(main, /prefersStill\(\)/, 'reduced motion gets one still figure');
});
