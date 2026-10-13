// Adaptive theme music (round 12), now a small cinematic orchestra (owner, 2026-10-13: "more
// music... epic music, engaging music, cinematic music, beautiful music... HD 3D audio"). It is
// all made in the browser (Web Audio: no recordings, no files):
// - strings: a wide string section that swells into each chord and holds it, over a sub drone;
// - a harp arpeggiating the chord while things are calm;
// - a choir singing "ah" (formant filters) as the game deepens, slowly circling round you;
// - cellos driving an ostinato and horns swelling on each chord when the game gets tense;
// - timpani on each chord, war drums when it is fierce, and a heartbeat with ticking when your
//   clock runs low (the storm), with a rising swell before the next phrase;
// - each theme's own motif: on a flute while calm, on the horns when tense;
// - a concert hall (a convolution reverb whose echo is made on the fly);
// - 3D: every section has its place around you (HRTF panning), so with headphones the strings
//   are wide left and right, the choir behind and above, the harp to the right, the horns to
//   the left and the drums in front;
// - a sting when the game ends: a fanfare for a win, falling strings for a loss, an open fifth
//   for a draw.
// Each theme has its own key and mode (relic sets, campaign realms) and three parts, calm, tense
// and storm, chosen by the game and changed only where a phrase ends. Between games it plays
// the calm part, softer and slower (the lobby). Off unless you turn it on; silent while VCH's
// sound is off. Every note is announced a moment before it sounds (onNote), with its time on
// the audio clock, so the room can follow the music: the candles, the board's glow, the clocks.

export const MUSIC_KEY = 'vch.music';
const SCALES = { aeolian: [0, 2, 3, 5, 7, 8, 10], phrygian: [0, 1, 3, 5, 7, 8, 10], lydian: [0, 2, 4, 6, 7, 9, 11], dorian: [0, 2, 3, 5, 7, 9, 10], harmonic: [0, 2, 3, 5, 7, 8, 11] };
export const MUSIC_KEYS = {
  vanta: { root: 50, scale: 'aeolian' }, // D minor
  ember: { root: 52, scale: 'phrygian' }, // E phrygian
  umbra: { root: 48, scale: 'aeolian' }, // C minor, low
  gilded: { root: 53, scale: 'lydian' }, // F lydian
  mirror: { root: 57, scale: 'dorian' }, // A dorian
  obsidian: { root: 47, scale: 'aeolian' }, // B minor
  rivalry: { root: 55, scale: 'harmonic' }, // G harmonic minor
};
// Relic sets and realms each pick a key.
export const KEY_FOR_THEME = { umbra: 'umbra', ember: 'ember', ashen: 'ember', mirror: 'mirror', court: 'mirror', gilded: 'gilded', crown: 'gilded', paladin: 'gilded', obsidian: 'obsidian', eclipse: 'obsidian', rivalry: 'rivalry', tidal: 'umbra', oathbound: 'vanta' };
// The parts: the scale degrees of their chords' roots, one chord every two bars.
export const PARTS = {
  calm: [0, 5, 2, 6], // i – VI – III – VII
  tense: [0, 3, 5, 4], // i – iv – VI – v
  storm: [0, 6, 5, 4], // i – VII – VI – v
};
// Each theme's motif: [scale degree, eighths], sixteen eighths long, over the first chord.
export const MOTIFS = {
  vanta: [[0, 2], [2, 2], [4, 4], [3, 2], [2, 2], [1, 2], [0, 2]],
  ember: [[0, 3], [1, 1], [0, 2], [4, 4], [3, 2], [1, 4]],
  umbra: [[-3, 4], [0, 4], [2, 4], [1, 4]],
  gilded: [[0, 2], [3, 2], [4, 2], [6, 2], [7, 4], [4, 4]],
  mirror: [[0, 2], [2, 1], [4, 1], [5, 4], [4, 2], [2, 2], [1, 4]],
  obsidian: [[4, 2], [3, 2], [2, 2], [0, 6], [-1, 2], [0, 2]],
  rivalry: [[0, 1], [2, 1], [4, 2], [6, 4], [5, 2], [4, 2], [3, 4]],
};
export const midiHz = m => 440 * 2 ** ((m - 69) / 12);
// A scale degree of a key as a MIDI note (degrees below 0 or above 6 go down or up octaves).
export function noteIn(keyId, degree) {
  const key = MUSIC_KEYS[keyId] || MUSIC_KEYS.vanta, scale = SCALES[key.scale];
  return key.root + scale[((degree % 7) + 7) % 7] + 12 * Math.floor(degree / 7);
}
// The triad on a part's chord: [root, third, fifth] as MIDI notes; the calm part by default.
export function chordFor(keyId, step, part = 'calm') {
  const prog = PARTS[part] || PARTS.calm, d = prog[((step % 4) + 4) % 4], key = MUSIC_KEYS[keyId] ? keyId : 'vanta';
  return [noteIn(key, d), noteIn(key, d + 2), noteIn(key, d + 4)];
}
// Which part the game calls for: the storm when your clock runs low, tense as it deepens.
export function partFor(tension = 0, storm = 0) { return storm > 0.3 ? 'storm' : tension > 0.45 ? 'tense' : 'calm'; }
export function loadMusic(storage = globalThis.localStorage) { try { const v = JSON.parse(storage?.getItem(MUSIC_KEY) || ''); return { on: !!v?.on, volume: Number.isFinite(v?.volume) ? Math.max(0, Math.min(1, v.volume)) : 0.5 }; } catch { return { on: false, volume: 0.5 }; } }
export function saveMusic(v, storage = globalThis.localStorage) { try { storage?.setItem(MUSIC_KEY, JSON.stringify({ on: !!v.on, volume: v.volume })); } catch {} return v; }

// Where each section sits around you (x right, y up, z towards you: you face −z), how much of
// it reaches the hall, and a low-pass for the strings (opened by the game's tension).
export const PLACES = {
  stringsL: { at: [-2.6, 0.4, -1.4], hall: 0.5, lowpass: 1500 },
  stringsR: { at: [2.6, 0.4, -1.4], hall: 0.5, lowpass: 1500 },
  low: { at: [0, -0.6, -2], hall: 0.2 },
  harp: { at: [1.9, 0.5, -2.2], hall: 0.55 },
  choir: { at: [0, 1.4, 1.2], hall: 0.75 },
  brass: { at: [-1.4, 0.2, -2.8], hall: 0.4 },
  cello: { at: [-1.9, -0.3, -2], hall: 0.35 },
  drums: { at: [0, -0.4, -3], hall: 0.3 },
  lead: { at: [0.8, 0.7, -2.2], hall: 0.5 },
};
// The vowel "ah": three formants [Hz, Q, level].
const AH = [[730, 9, 1], [1090, 10, 0.5], [2440, 12, 0.25]];

// A note's loudness: up to `peak` over `attack` s (a straight swell, so chords overlap without a
// dip), held for `hold` s, then dying away over `release` s like a real string or skin.
// Returns when it has ended (audio clock).
function envelope(param, at, { attack = 0.01, hold = 0, release = 0.3, peak = 0.1 } = {}) {
  const top = Math.max(0.0002, peak), off = at + attack + hold;
  param.setValueAtTime(0, at);
  param.linearRampToValueAtTime(top, at + attack);
  if (hold > 0) param.setValueAtTime(top, off);
  param.setTargetAtTime(0, off, release / 4);
  return off + release;
}
// A hall's echo: stereo noise dying away over `seconds`, darker as it dies (a one-pole low-pass
// whose cutoff falls), after a short silence (the first reflections take a moment).
export function hallImpulse(ctx, seconds = 3.2, random = Math.random) {
  const rate = ctx.sampleRate || 44100, len = Math.max(1, Math.floor(rate * seconds)), buf = ctx.createBuffer(2, len, rate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c); let lp = 0;
    for (let i = 0; i < len; i++) {
      const t = i / rate, damp = 0.2 + 0.75 * Math.exp(-t * 1.6);
      lp += (random() * 2 - 1 - lp) * damp;
      d[i] = t < 0.014 ? 0 : lp * Math.exp(-t * 2.3);
    }
  }
  return buf;
}
function setPosition(p, [x, y, z], ctx, lag = 0) {
  if (p.positionX) {
    if (lag) { const t = ctx.currentTime; p.positionX.setTargetAtTime(x, t, lag); p.positionY.setTargetAtTime(y, t, lag); p.positionZ.setTargetAtTime(z, t, lag); }
    else { p.positionX.value = x; p.positionY.value = y; p.positionZ.value = z; }
  } else p.setPosition?.(x, y, z);
}

export class VantaScore {
  constructor({ AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext, timers = globalThis, random = Math.random } = {}) {
    this.AC = AudioContextClass; this.timers = timers; this.random = random;
    this.ctx = null; this.timer = null; this.playing = false;
    this.key = 'vanta'; this.tension = 0; this.storm = 0; this.volume = 0.5; this.lobby = false;
    this.step = 0; this.eighth = 0; this.nextAt = 0; this.part = 'calm'; this.motifTurn = false; this.current = null;
    this.listeners = new Set();
  }
  get available() { return !!this.AC; }
  // Every note, a moment before it sounds: fn({kind: 'chord' | 'beat' | 'drum' | 'heartbeat' |
  // 'motif' | 'sting', at (audio clock, s), strength 0..1, ...}). Returns a function to stop.
  onNote(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit(ev) { for (const fn of this.listeners) { try { fn(ev); } catch {} } }
  ensure() {
    if (this.ctx || !this.AC) return this.ctx;
    const ctx = new this.AC(), master = ctx.createGain(), comp = ctx.createDynamicsCompressor();
    master.gain.value = this.level; master.connect(comp); comp.connect(ctx.destination);
    if (comp.threshold) { comp.threshold.value = -18; comp.knee.value = 10; comp.ratio.value = 3.5; comp.attack.value = 0.012; comp.release.value = 0.3; }
    const stings = ctx.createGain(); stings.gain.value = this.level; stings.connect(comp); this.stings = stings; // the end-of-game sting outlives the fade
    this.ctx = ctx; this.master = master;
    // The hall: one echo for everything. The music's way into it fades with the music, but the
    // echo itself is never cut, so a stop or the last sting rings out.
    if (ctx.createConvolver) {
      const hall = ctx.createConvolver(), wet = ctx.createGain(), sends = ctx.createGain(), stingSend = ctx.createGain();
      hall.buffer = hallImpulse(ctx, 3.2, this.random); wet.gain.value = 0.8; hall.connect(wet); wet.connect(comp);
      sends.gain.value = this.level; sends.connect(hall); stingSend.gain.value = 0.55; stings.connect(stingSend); stingSend.connect(hall);
      this.hall = hall; this.sends = sends;
    }
    this.buses = {}; this.padFilters = [];
    for (const [name, place] of Object.entries(PLACES)) this.buses[name] = this.bus(place);
    // The strings' vibrato: each side of the section sways a few cents at its own pace, so the
    // bows never quite agree (the warmth of a real section).
    this.vibrato = [4.7, 5.4].map(rate => { const lfo = ctx.createOscillator(), depth = ctx.createGain(); lfo.frequency.value = rate; depth.gain.value = 7; lfo.connect(depth); lfo.start?.(); return depth; });
    this.padFilter = this.padFilters[0];
    // A listening tap for Resonance (src/resonance.js) and the room: how loud the score is now.
    if (ctx.createAnalyser) { const analyser = ctx.createAnalyser(); analyser.fftSize = 512; analyser.smoothingTimeConstant = 0.7; comp.connect(analyser); this.analyser = analyser; this.spectrum = new Uint8Array(analyser.frequencyBinCount); }
    return ctx;
  }
  // A section's way in: (a low-pass) → its place around you (HRTF) → the mix, with a send to the hall.
  bus({ at, hall = 0.4, lowpass = 0 }) {
    const ctx = this.ctx, input = ctx.createGain();
    let head = input;
    if (lowpass) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lowpass; f.Q.value = 0.7; input.connect(f); head = f; this.padFilters.push(f); }
    let place;
    if (ctx.createPanner) { place = ctx.createPanner(); place.panningModel = 'HRTF'; place.distanceModel = 'inverse'; place.refDistance = 2; place.rolloffFactor = 0.6; setPosition(place, at, ctx); }
    else if (ctx.createStereoPanner) { place = ctx.createStereoPanner(); place.pan.value = Math.max(-1, Math.min(1, at[0] / 3)); }
    else place = ctx.createGain();
    head.connect(place); place.connect(this.master);
    if (this.sends) { const s = ctx.createGain(); s.gain.value = hall; head.connect(s); s.connect(this.sends); }
    return { input, place };
  }
  start() {
    if (!this.ensure()) return false;
    if (this.ctx.state === 'suspended') this.ctx.resume?.();
    if (this.playing) return true;
    const t = this.ctx.currentTime; this.fade(this.level, t, 0.3); // back up from a fade-out
    this.playing = true; this.eighth = 0; this.nextAt = this.ctx.currentTime + 0.08; this.current = null;
    this.timer = this.timers.setInterval(() => this.schedule(), 40);
    this.schedule();
    return true;
  }
  stop() {
    this.playing = false;
    if (this.timer) { this.timers.clearInterval(this.timer); this.timer = null; }
    // Fade out and stay silent (notes already scheduled die away unheard); start() fades back in.
    if (this.master && this.ctx) this.fade(0, this.ctx.currentTime, 0.4);
  }
  // How loud the score plays: the volume setting, with the room the mix leaves for the game's sounds.
  get level() { return this.volume * 1.1; }
  fade(to, t, lag) { for (const g of [this.master, this.sends]) if (g) { g.gain.cancelScheduledValues?.(t); g.gain.setTargetAtTime(to, t, lag); } }
  setVolume(v) { this.volume = Math.max(0, Math.min(1, Number(v) || 0)); if (this.master && this.playing) this.fade(this.level, this.ctx.currentTime, 0.2); if (this.stings) this.stings.gain.value = this.level; }
  // Steps back for a moment (the end-of-game sting plays over it), then comes back up.
  duck(seconds = 2.5) {
    if (!this.master || !this.ctx || !this.playing) return;
    const t = this.ctx.currentTime;
    this.fade(this.level * 0.3, t, 0.08);
    for (const g of [this.master, this.sends]) g?.gain.setTargetAtTime(this.level, t + seconds, 0.9);
  }
  setTension(t) {
    this.tension = Math.max(0, Math.min(1, Number(t) || 0));
    if (this.ctx) for (const f of this.padFilters || []) f.frequency.setTargetAtTime(1500 + this.tension * 2000, this.ctx.currentTime, 1.5); // the strings brighten
  }
  setStorm(s) { this.storm = Math.max(0, Math.min(1, Number(s) || 0)); }
  setKey(id) { this.key = MUSIC_KEYS[id] ? id : 'vanta'; }
  // Between games: the calm part, softer and slower.
  setLobby(on) { this.lobby = !!on; }
  get bpm() { return this.lobby ? 68 : 76 + Math.round(this.tension * 8) + Math.round(this.storm * 20); }
  // The chord the strings are holding now (MIDI notes), and the score's byte spectrum (or null).
  get chord() { return this.current || chordFor(this.key, Math.floor(Math.max(0, this.eighth - 1) / 16), this.part); }
  readSpectrum() { if (!this.analyser || !this.playing) return null; this.analyser.getByteFrequencyData(this.spectrum); return this.spectrum; }
  // Lookahead scheduler: plays every eighth note that falls in the next 150ms.
  schedule() {
    if (!this.playing || !this.ctx) return;
    const ahead = this.ctx.currentTime + 0.15;
    while (this.nextAt < ahead) {
      const e = this.eighth, at = this.nextAt, sec = 30 / this.bpm, I = this.lobby ? 0 : this.tension, S = this.lobby ? 0 : this.storm;
      // A new phrase (four chords): the part the game calls for now, and the motif every other one.
      if (e % 64 === 0) { this.part = this.lobby ? 'calm' : partFor(I, S); this.motifTurn = !this.motifTurn; }
      const notes = e % 16 === 0 || !this.current ? chordFor(this.key, Math.floor(e / 16), this.part) : this.current;
      if (e % 16 === 0) {
        const dur = sec * 16;
        this.current = notes;
        this.strings(at, dur, notes);
        const choir = this.lobby ? 0.02 : I > 0.2 ? 0.012 + 0.03 * I : 0;
        if (choir) this.choir(at, dur, notes, choir);
        if (I > 0.5) this.brass(at, dur * 0.62, notes, 0.01 + 0.018 * I);
        if (I > 0.25) { this.timpani(at, notes[0] - 12, 0.14 + 0.12 * I); this.emit({ kind: 'drum', at, strength: 0.5 + 0.4 * I }); }
        this.emit({ kind: 'chord', at, step: Math.floor(e / 16), notes, part: this.part, strength: 0.5 + 0.5 * Math.max(I, S) });
        if (e % 64 === 0 && this.motifTurn) this.motif(at, sec);
      }
      // The harp while calm (every eighth; quarters when tense; quiet when fierce), the cellos when tense.
      if (!S && I <= 0.75 && (this.part === 'calm' || e % 2 === 0)) this.harp(at, e, notes);
      if (I > 0.35) this.cello(at, e, notes, 0.018 + 0.022 * I);
      // War drums when it is fierce: on 1, the and of 2, 3 and 4.
      if ((I > 0.8 || S > 0) && [0, 3, 4, 6].includes(e % 8)) { const accent = e % 8 === 0 ? 1 : 0.6; this.warDrum(at, (0.1 + 0.12 * Math.max(I, S)) * accent); this.emit({ kind: 'drum', at, strength: accent * (0.5 + 0.5 * Math.max(I, S)) }); }
      if (S > 0) { this.drums(at, e); if (e % 4 === 0) this.emit({ kind: 'heartbeat', at, strength: 0.4 + 0.6 * S }); }
      if (S > 0.5 && e % 64 === 32) this.riser(at, sec * 32, 0.035 * S);
      if (e % 2 === 0) this.emit({ kind: 'beat', at, eighth: e, strength: 0.25 + 0.5 * Math.max(I, S) });
      this.eighth++; this.nextAt += sec;
    }
    // The choir drifts slowly round you, behind and above (a circle every forty seconds).
    const choir = this.buses?.choir?.place;
    if (choir?.positionX || choir?.setPosition) { const a = this.ctx.currentTime * 2 * Math.PI / 40; setPosition(choir, [2.2 * Math.sin(a), 1.4, 1.2 * Math.cos(a) + 0.4], this.ctx, 0.5); }
  }
  // ---- The instruments ----
  osc(type, freq, at, end, dest, detune = 0) {
    const o = this.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, at);
    if (detune && o.detune) o.detune.setValueAtTime(detune, at);
    o.connect(dest); o.start(at); o.stop(end + 0.05);
    return o;
  }
  // One note: an oscillator through its envelope into `dest`, gone after `dur` s.
  tone(type, freq, at, dur, peak, dest = this.master, attack = 0.01, detune = 0) {
    const g = this.ctx.createGain(), end = envelope(g.gain, at, { attack, release: Math.max(0.02, dur - attack), peak });
    g.connect(dest); return this.osc(type, freq, at, end, g, detune);
  }
  // A held note: rises over `attack`, holds, dies over `release`. Returns when it has ended
  // (heldOsc: returns its oscillator).
  held(type, freq, at, env, dest, detune = 0) { const o = this.heldOsc(type, freq, at, env, dest, detune); return o.end; }
  heldOsc(type, freq, at, { attack, hold, release, peak }, dest, detune = 0) {
    const g = this.ctx.createGain(), end = envelope(g.gain, at, { attack, hold, release, peak });
    g.connect(dest); const o = this.osc(type, freq, at, end, g, detune); o.end = end;
    return o;
  }
  noiseBuffer() {
    if (this.noiseBuf) return this.noiseBuf;
    const rate = this.ctx.sampleRate || 44100, len = Math.floor(rate * 0.6), buf = this.ctx.createBuffer(1, len, rate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = this.random() * 2 - 1;
    return (this.noiseBuf = buf);
  }
  noise(at, release, freq, type, peak, dest, { loop = false, attack = 0.003, sweepTo = 0 } = {}) {
    const ctx = this.ctx, src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = this.noiseBuffer(); src.loop = loop; f.type = type; f.frequency.setValueAtTime(freq, at);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, at + attack);
    const end = envelope(g.gain, at, { attack, release, peak });
    src.connect(f); f.connect(g); g.connect(dest); src.start(at); src.stop(end + 0.02);
  }
  // The strings: the chord spread wide (root and fifth below, root, third and fifth above), three
  // slightly detuned bows per note across both sides, and the sub drone under them.
  strings(at, dur, notes) {
    const [r, t, f] = notes, L = this.buses.stringsL.input, R = this.buses.stringsR.input, peak = 0.009 + 0.004 * this.tension;
    // Each chord swells in under the last one, which holds a little longer and fades as it comes.
    for (const [i, n] of [r - 12, f - 12, r, t, f].entries())
      for (const [k, cents] of [-8, 0, 8].entries()) {
        const left = k === 1 ? i % 2 === 1 : k === 0, o = this.heldOsc('sawtooth', midiHz(n), at, { attack: 1.3, hold: Math.max(0, dur - 0.6), release: 1.8, peak }, left ? L : R, cents);
        if (o.detune) this.vibrato[left ? 0 : 1].connect(o.detune);
      }
    this.held('sine', midiHz(r - 12), at, { attack: 1.4, hold: Math.max(0, dur - 0.6), release: 2, peak: 0.03 }, this.buses.low.input);
  }
  // The harp: up and down the chord over two octaves, one pluck an eighth.
  harp(at, e, notes) {
    const [r, t, f] = notes, run = [r + 12, t + 12, f + 12, r + 24, t + 24, r + 24, f + 12, t + 12], n = run[e % 8];
    const peak = (this.lobby ? 0.04 : 0.036) * (1 - 0.5 * this.tension), dest = this.buses.harp.input;
    this.tone('triangle', midiHz(n), at, 1.1, peak, dest, 0.004);
    this.tone('sine', midiHz(n + 12), at, 0.5, peak * 0.35, dest, 0.003);
  }
  // The choir: three voices (third, fifth, octave) singing "ah", with a slow vibrato.
  choir(at, dur, notes, peak) {
    const ctx = this.ctx, out = this.buses.choir.input;
    for (const n of [notes[1] + 12, notes[2] + 12, notes[0] + 24]) {
      const g = ctx.createGain(), end = envelope(g.gain, at, { attack: 1.6, hold: Math.max(0, dur - 0.8), release: 2.2, peak }), src = ctx.createGain();
      for (const [freq, q, amp] of AH) { const bp = ctx.createBiquadFilter(), a = ctx.createGain(); bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = q; a.gain.value = amp; src.connect(bp); bp.connect(a); a.connect(g); }
      const lfo = ctx.createOscillator(), depth = ctx.createGain(); lfo.frequency.value = 5.2; depth.gain.value = midiHz(n) * 0.004; lfo.connect(depth);
      for (const cents of [-6, 6]) { const o = this.osc('sawtooth', midiHz(n), at, end, src, cents); depth.connect(o.frequency); }
      lfo.start(at); lfo.stop(end + 0.05);
      g.connect(out);
    }
  }
  // The horns: root, fifth and root again, brightening as they swell.
  brass(at, dur, notes, peak) {
    const ctx = this.ctx, [r, , f] = notes, dest = this.buses.brass.input;
    for (const n of [r - 12, f - 12, r]) {
      const lp = ctx.createBiquadFilter(), g = ctx.createGain(); lp.type = 'lowpass'; lp.Q.value = 1.2;
      lp.frequency.setValueAtTime(320, at); lp.frequency.exponentialRampToValueAtTime(1900, at + 0.9); lp.frequency.exponentialRampToValueAtTime(1100, at + Math.max(1, dur));
      const end = envelope(g.gain, at, { attack: 0.45, hold: Math.max(0, dur - 0.45), release: 1.2, peak });
      lp.connect(g); g.connect(dest);
      this.osc('sawtooth', midiHz(n), at, end, lp); this.osc('square', midiHz(n), at, end, lp, 5);
    }
  }
  // The cellos: a driving eighth-note figure on the root and fifth, accented on the beat.
  cello(at, e, notes, peak) {
    const ctx = this.ctx, [r, , f] = notes, n = [r - 12, r - 12, f - 12, r - 12, r, r - 12, f - 12, r - 12][e % 8];
    const lp = ctx.createBiquadFilter(), g = ctx.createGain(); lp.type = 'lowpass'; lp.frequency.value = 650; lp.Q.value = 0.9;
    const end = envelope(g.gain, at, { attack: 0.012, release: 0.24, peak: e % 2 ? peak * 0.65 : peak });
    lp.connect(g); g.connect(this.buses.cello.input); this.osc('sawtooth', midiHz(n), at, end, lp);
  }
  // A timpani stroke: a low drum tuned to the chord, with the mallet's knock.
  timpani(at, note, peak) {
    const ctx = this.ctx, dest = this.buses.drums.input, f = midiHz(note), o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(f * 1.12, at); o.frequency.exponentialRampToValueAtTime(f, at + 0.06);
    const end = envelope(g.gain, at, { attack: 0.004, release: 1.5, peak }); o.connect(g); g.connect(dest); o.start(at); o.stop(end + 0.05);
    this.noise(at, 0.06, 280, 'bandpass', peak * 0.5, dest);
  }
  // A war drum: a deep thump and a skin slap.
  warDrum(at, peak) {
    const ctx = this.ctx, dest = this.buses.drums.input, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(76, at); o.frequency.exponentialRampToValueAtTime(44, at + 0.16);
    const end = envelope(g.gain, at, { attack: 0.004, release: 0.45, peak }); o.connect(g); g.connect(dest); o.start(at); o.stop(end + 0.05);
    this.noise(at, 0.09, 700, 'lowpass', peak * 0.6, dest);
  }
  // The storm: a heartbeat (lub-dub) every half bar and ticking on every eighth.
  drums(at, e) {
    const ctx = this.ctx, dest = this.buses.drums.input;
    if (e % 4 === 0) for (const [lag, k] of [[0, 1], [0.17, 0.6]]) { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(110, at + lag); o.frequency.exponentialRampToValueAtTime(42, at + lag + 0.16); const end = envelope(g.gain, at + lag, { attack: 0.005, release: 0.2, peak: (0.16 + 0.18 * this.storm) * k }); o.connect(g); g.connect(dest); o.start(at + lag); o.stop(end + 0.03); }
    this.noise(at, 0.05, 6500, 'highpass', (0.012 + 0.03 * this.storm) * (e % 2 ? 0.6 : 1), dest);
  }
  // A swell of air rising into the next phrase.
  riser(at, dur, peak) { this.noise(at, 0.25, 400, 'bandpass', peak, this.buses.drums.input, { loop: true, attack: dur, sweepTo: 4200 }); }
  // The theme's motif: a flute while calm, the horns when tense.
  motif(at, sec) {
    const ctx = this.ctx, dest = this.buses.lead.input, horn = this.part !== 'calm'; let t = at;
    for (const [deg, len] of MOTIFS[this.key] || MOTIFS.vanta) {
      const n = noteIn(this.key, deg) + 12, dur = len * sec;
      if (horn) {
        const lp = ctx.createBiquadFilter(), g = ctx.createGain(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(500, t); lp.frequency.exponentialRampToValueAtTime(1500, t + 0.15);
        const end = envelope(g.gain, t, { attack: 0.06, hold: dur * 0.8, release: 0.45, peak: 0.03 }); lp.connect(g); g.connect(dest);
        this.osc('sawtooth', midiHz(n), t, end, lp); this.osc('sawtooth', midiHz(n), t, end, lp, 7);
      } else {
        const g = ctx.createGain(), end = envelope(g.gain, t, { attack: 0.08, hold: dur * 0.85, release: 0.5, peak: 0.04 }), lfo = ctx.createOscillator(), depth = ctx.createGain();
        lfo.frequency.value = 5; depth.gain.value = midiHz(n + 12) * 0.005; lfo.connect(depth); g.connect(dest);
        const o = this.osc('sine', midiHz(n + 12), t, end, g); depth.connect(o.frequency); this.osc('triangle', midiHz(n + 12), t, end, g);
        lfo.start(t); lfo.stop(end + 0.05);
      }
      t += dur;
    }
    this.emit({ kind: 'motif', at, key: this.key, strength: 0.8 });
  }
  // The end of a game: 'win' | 'loss' | 'draw'.
  sting(kind) {
    if (!this.ensure()) return;
    const at = this.ctx.currentTime + 0.05, root = (MUSIC_KEYS[this.key] || MUSIC_KEYS.vanta).root, out = this.stings;
    if (kind === 'win') {
      // A fanfare climbing a major chord on the horns, the last note held, and a timpani stroke.
      [0, 4, 7, 12, 16].forEach((iv, i) => { this.tone('sawtooth', midiHz(root + iv), at + i * 0.14, i === 4 ? 2.4 : 1.4, 0.035, out); this.tone('triangle', midiHz(root + iv + 12), at + i * 0.14, 1.4, 0.03, out); });
      this.tone('sine', midiHz(root - 12), at + 0.56, 1.8, 0.2, out, 0.004);
    } else if (kind === 'loss') {
      // Falling down a minor chord, over a low string note.
      [12, 8, 7, 3, 0, -12].forEach((iv, i) => this.tone('sine', midiHz(root + iv), at + i * 0.14, 1.6, 0.05, out));
      this.tone('sawtooth', midiHz(root - 12), at + 0.7, 2.6, 0.012, out, 0.8);
    } else {
      // An open fifth, plucked and bowed.
      [0, 7, 12].forEach(iv => { this.tone('triangle', midiHz(root + iv), at, 2.4, 0.05, out); this.tone('sawtooth', midiHz(root + iv - 12), at, 2.6, 0.01, out, 0.9); });
    }
    this.emit({ kind: 'sting', at, result: kind, strength: 1 });
  }
}
