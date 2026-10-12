// Adaptive theme music (round 12). A small score made in the browser (Web Audio, no files):
// - a dark pad that walks a four-chord progression (always on while you play);
// - an arpeggio that grows with the tension of the game (deeper into it, checks, captures);
// - a heartbeat drum and ticking when your clock runs low (the storm);
// - a sting when the game ends: rising for a win, falling for a loss, an open fifth for a draw.
// Each theme has its own key and mode (relic sets, campaign realms). Off unless you turn it on;
// it also stays silent while VCH's sound is off. Later, Higgsfield stems can replace the synths
// behind the same controls.

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
const PROGRESSION = [0, 5, 2, 6]; // i – VI – III – VII
export const midiHz = m => 440 * 2 ** ((m - 69) / 12);
// The triad on a scale degree: [root, third, fifth] as MIDI notes.
export function chordFor(keyId, step) {
  const key = MUSIC_KEYS[keyId] || MUSIC_KEYS.vanta, scale = SCALES[key.scale], d = PROGRESSION[((step % 4) + 4) % 4];
  const note = i => key.root + scale[i % 7] + 12 * Math.floor(i / 7);
  return [note(d), note(d + 2), note(d + 4)];
}
export function loadMusic(storage = globalThis.localStorage) { try { const v = JSON.parse(storage?.getItem(MUSIC_KEY) || ''); return { on: !!v?.on, volume: Number.isFinite(v?.volume) ? Math.max(0, Math.min(1, v.volume)) : 0.5 }; } catch { return { on: false, volume: 0.5 }; } }
export function saveMusic(v, storage = globalThis.localStorage) { try { storage?.setItem(MUSIC_KEY, JSON.stringify({ on: !!v.on, volume: v.volume })); } catch {} return v; }

export class VantaScore {
  constructor({ AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext, timers = globalThis } = {}) {
    this.AC = AudioContextClass; this.timers = timers;
    this.ctx = null; this.timer = null; this.playing = false;
    this.key = 'vanta'; this.tension = 0; this.storm = 0; this.volume = 0.5;
    this.step = 0; this.eighth = 0; this.nextAt = 0;
  }
  get available() { return !!this.AC; }
  ensure() {
    if (this.ctx || !this.AC) return this.ctx;
    const ctx = new this.AC(), master = ctx.createGain(), comp = ctx.createDynamicsCompressor();
    master.gain.value = this.volume * 0.6; master.connect(comp); comp.connect(ctx.destination);
    const pad = ctx.createBiquadFilter(); pad.type = 'lowpass'; pad.frequency.value = 700; pad.Q.value = 0.7; pad.connect(master);
    this.ctx = ctx; this.master = master; this.padFilter = pad;
    return ctx;
  }
  start() {
    if (!this.ensure()) return false;
    if (this.ctx.state === 'suspended') this.ctx.resume?.();
    if (this.playing) return true;
    const t = this.ctx.currentTime; this.master.gain.cancelScheduledValues?.(t); this.master.gain.setTargetAtTime(this.volume * 0.6, t, 0.3); // back up from a fade-out
    this.playing = true; this.eighth = 0; this.nextAt = this.ctx.currentTime + 0.08;
    this.timer = this.timers.setInterval(() => this.schedule(), 40);
    this.schedule();
    return true;
  }
  stop() {
    this.playing = false;
    if (this.timer) { this.timers.clearInterval(this.timer); this.timer = null; }
    if (this.master && this.ctx) { const t = this.ctx.currentTime; this.master.gain.cancelScheduledValues?.(t); this.master.gain.setTargetAtTime(0, t, 0.4); this.timers.setTimeout(() => { if (!this.playing && this.master) this.master.gain.value = this.volume * 0.6; }, 2500); }
  }
  setVolume(v) { this.volume = Math.max(0, Math.min(1, Number(v) || 0)); if (this.master && this.playing) this.master.gain.setTargetAtTime(this.volume * 0.6, this.ctx.currentTime, 0.2); }
  setTension(t) { this.tension = Math.max(0, Math.min(1, Number(t) || 0)); if (this.padFilter && this.ctx) this.padFilter.frequency.setTargetAtTime(600 + this.tension * 1100, this.ctx.currentTime, 1.5); }
  setStorm(s) { this.storm = Math.max(0, Math.min(1, Number(s) || 0)); }
  setKey(id) { this.key = MUSIC_KEYS[id] ? id : 'vanta'; }
  get bpm() { return 84 + Math.round(this.storm * 18); }
  // Lookahead scheduler: plays every eighth note that falls in the next 150ms.
  schedule() {
    if (!this.playing || !this.ctx) return;
    const ahead = this.ctx.currentTime + 0.15, eighthSec = 30 / this.bpm;
    while (this.nextAt < ahead) {
      const e = this.eighth, bar16 = e % 16;
      if (bar16 === 0) this.pad(this.nextAt, eighthSec * 16, chordFor(this.key, Math.floor(e / 16)));
      if (this.tension > 0.2) this.pluck(this.nextAt, chordFor(this.key, Math.floor(e / 16)), e);
      if (this.storm > 0) this.drums(this.nextAt, e);
      this.eighth++; this.nextAt += eighthSec;
    }
  }
  tone(type, freq, at, dur, peak, dest = this.master, attack = 0.01) {
    const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, at);
    g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), at + attack); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g); g.connect(dest); o.start(at); o.stop(at + dur + 0.05);
    return o;
  }
  pad(at, dur, notes) { for (const [i, n] of notes.entries()) { this.tone('sawtooth', midiHz(n - 12), at, dur, 0.03, this.padFilter, 1.2); if (i === 0) this.tone('sine', midiHz(n - 24), at, dur, 0.05, this.master, 0.8); } }
  pluck(at, notes, e) { const n = notes[e % 3] + (e % 6 >= 3 ? 12 : 0); this.tone('triangle', midiHz(n + 12), at, 0.32, 0.015 + 0.045 * this.tension); }
  drums(at, e) {
    const ctx = this.ctx;
    if (e % 4 === 0) { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(110, at); o.frequency.exponentialRampToValueAtTime(42, at + 0.16); g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.18 + 0.2 * this.storm, at + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.22); o.connect(g); g.connect(this.master); o.start(at); o.stop(at + 0.25); }
    if (!this.noise) { const len = Math.floor(ctx.sampleRate * 0.05), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; this.noise = buf; }
    const src = ctx.createBufferSource(), hp = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = this.noise; hp.type = 'highpass'; hp.frequency.value = 6500; g.gain.setValueAtTime(0.012 + 0.03 * this.storm * (e % 2 ? 0.6 : 1), at); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.05);
    src.connect(hp); hp.connect(g); g.connect(this.master); src.start(at); src.stop(at + 0.06);
  }
  // The end of a game: 'win' | 'loss' | 'draw'.
  sting(kind) {
    if (!this.ensure()) return;
    const at = this.ctx.currentTime + 0.05, root = (MUSIC_KEYS[this.key] || MUSIC_KEYS.vanta).root;
    const seq = kind === 'win' ? [0, 4, 7, 12, 16] : kind === 'loss' ? [12, 8, 7, 3, 0, -12] : [0, 7, 12];
    seq.forEach((iv, i) => this.tone(kind === 'loss' ? 'sine' : 'triangle', midiHz(root + iv), at + i * (kind === 'draw' ? 0 : 0.14), kind === 'draw' ? 2.4 : 1.4, kind === 'loss' ? 0.05 : 0.06));
  }
}
