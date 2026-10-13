// VCH's music: real tracks (owner, 2026-10-13: music made with Lyria 3.5, not synthesized in the
// browser; the library is public/assets/vch/music/library.json, read by src/music-library.js).
// With Music on it plays everywhere and follows you: the menus' music in the lobby, focus music
// for puzzles, lessons and analysis, opera for Campaign bosses, electric music for fast games,
// and in your games a dark cinematic score whose part follows the game (calm, tense, and the
// storm when your clock runs low). A station (Dark cinematic, Focus, Opera, Electric, Songs) plays
// its own tracks in turn instead. Tracks crossfade (two decks); the next one loads before the
// last ends and comes in under it, so the music never stops; the end of a game plays its sting
// over the music, which steps back for it. The player listens to itself (an analyser): every beat
// it hears reaches the room (onNote), so the candles, the board's glow, the clocks and the sand
// follow the real music. Off unless you turn it on; silent while VCH's sound is off.
import { MUSIC_BASE, isSting, placesOf } from './music-library.js';

export const MUSIC_KEY = 'vch.music';
const SCALES = { aeolian: [0, 2, 3, 5, 7, 8, 10], phrygian: [0, 1, 3, 5, 7, 8, 10], lydian: [0, 2, 4, 6, 7, 9, 11], dorian: [0, 2, 3, 5, 7, 9, 10], harmonic: [0, 2, 3, 5, 7, 8, 11] };
// Each theme's key (relic sets, campaign realms): Resonance draws its figures from them.
export const MUSIC_KEYS = {
  vanta: { root: 50, scale: 'aeolian' }, // D minor
  ember: { root: 52, scale: 'phrygian' }, // E phrygian
  umbra: { root: 48, scale: 'aeolian' }, // C minor, low
  gilded: { root: 53, scale: 'lydian' }, // F lydian
  mirror: { root: 57, scale: 'dorian' }, // A dorian
  obsidian: { root: 47, scale: 'aeolian' }, // B minor
  rivalry: { root: 55, scale: 'harmonic' }, // G harmonic minor
};
// Relic sets and realms each pick a theme.
export const KEY_FOR_THEME = { umbra: 'umbra', ember: 'ember', ashen: 'ember', mirror: 'mirror', court: 'mirror', gilded: 'gilded', crown: 'gilded', paladin: 'gilded', obsidian: 'obsidian', eclipse: 'obsidian', rivalry: 'rivalry', tidal: 'umbra', oathbound: 'vanta' };
const PROGRESSION = [0, 5, 2, 6]; // i – VI – III – VII
export const midiHz = m => 440 * 2 ** ((m - 69) / 12);
// The triad on a step of the theme's progression: [root, third, fifth] as MIDI notes.
export function chordFor(keyId, step) {
  const key = MUSIC_KEYS[keyId] || MUSIC_KEYS.vanta, scale = SCALES[key.scale], d = PROGRESSION[((step % 4) + 4) % 4];
  const note = i => key.root + scale[i % 7] + 12 * Math.floor(i / 7);
  return [note(d), note(d + 2), note(d + 4)];
}
// The part of a game's music: the storm when your clock runs low, tense as the game deepens.
// `was` (the part playing) holds it a little longer, so the music does not flicker between two.
export function partFor(tension = 0, storm = 0, was = 'calm') {
  if (storm > (was === 'storm' ? 0.2 : 0.3)) return 'storm';
  return tension > (was === 'calm' ? 0.45 : 0.35) ? 'tense' : 'calm';
}
export function loadMusic(storage = globalThis.localStorage) {
  try { const v = JSON.parse(storage?.getItem(MUSIC_KEY) || ''); return { on: !!v?.on, volume: Number.isFinite(v?.volume) ? Math.max(0, Math.min(1, v.volume)) : 0.5, station: typeof v?.station === 'string' && v.station ? v.station : 'on' }; }
  catch { return { on: false, volume: 0.5, station: 'on' }; }
}
export function saveMusic(v, storage = globalThis.localStorage) { try { storage?.setItem(MUSIC_KEY, JSON.stringify({ on: !!v.on, volume: v.volume, station: v.station || 'on' })); } catch {} return v; }

// The tracks that suit a moment: a station's own tracks, or ("on": follows the game) the
// place's (and in a game the part's). A boss or a fast game with no music of its own borrows the
// game's; focus borrows the lobby's; anything borrows the lobby's last of all. Tracks made for
// another theme are left out; the theme's own come first.
export function tracksFor(tracks, { station = 'on', place = 'lobby', part = 'calm', theme = 'vanta' } = {}) {
  const music = tracks.filter(t => !isSting(t)), at = p => music.filter(t => placesOf(t).includes(p));
  const game = () => { const all = at('game'), mine = all.filter(t => (t.part || 'calm') === part); return mine.length ? mine : all; };
  let pool;
  if (station && station !== 'on') pool = music.filter(t => t.station === station);
  else {
    pool = place === 'game' ? game() : at(place);
    if (!pool.length && (place === 'boss' || place === 'blitz')) pool = game();
    if (!pool.length) pool = at('lobby');
  }
  if (!pool.length) pool = music;
  const mine = theme !== 'vanta' ? pool.filter(t => t.theme === theme) : [], neutral = pool.filter(t => !t.theme || t.theme === 'vanta');
  const fit = [...mine, ...neutral];
  return fit.length ? fit : pool;
}
// The next track: the one after `after` in turn (`after` again when it is the only one), else
// one at random, the theme's own first.
export function pickTrack(tracks, { after = null, random = Math.random, ...moment } = {}) {
  const pool = tracksFor(tracks, moment);
  if (!pool.length) return null;
  const i = after ? pool.findIndex(t => t.id === after) : -1;
  if (i >= 0) return pool[(i + 1) % pool.length];
  const theme = moment.theme || 'vanta', mine = theme !== 'vanta' ? pool.filter(t => t.theme === theme) : [], from = mine.length ? mine : pool;
  return from[Math.floor(random() * from.length) % from.length];
}
// The end of a game: 'win' | 'loss' | 'draw' (a draw borrows the loss's when it has none).
export function stingFor(tracks, result, theme = 'vanta') {
  const of = r => tracks.filter(t => isSting(t) && t.part === r);
  const pool = of(result).length ? of(result) : result === 'draw' ? of('loss') : [];
  return pool.find(t => t.theme === theme) || pool.find(t => !t.theme || t.theme === 'vanta') || pool[0] || null;
}

const SETTLE_MS = 10000; // in a game, the music follows its part at most this often (the storm at once)
export class VantaScore {
  constructor({ AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext, AudioElement = globalThis.Audio, timers = globalThis, tracks = [], base = MUSIC_BASE, random = Math.random, clock = () => globalThis.performance?.now?.() ?? Date.now() } = {}) {
    Object.assign(this, { AC: AudioContextClass, Audio: AudioElement, timers, tracks, base, random, clock });
    this.ctx = null; this.timer = null; this.playing = false;
    this.key = 'vanta'; this.tension = 0; this.storm = 0; this.partNow = 'calm'; this.volume = 0.5; this.place = 'lobby'; this.station = 'on';
    this.decks = []; this.active = null; this.next = null; this.switchedAt = -1e9; this.pending = false; this.failures = 0; this.gaveUpAt = -1e9;
    this.listeners = new Set(); this.beats = 0; this.bands = { low: { avg: 0, dev: 0 }, mid: { avg: 0, dev: 0 } }; this.lastBeat = -1;
  }
  get available() { return !!(this.AC && this.Audio && this.tracks.some(t => !isSting(t))); }
  get part() { return this.partNow; }
  get moment() { return { station: this.station, place: this.place, part: this.part, theme: this.key }; }
  get level() { return this.volume; }
  // The library arrived (src/music-library.js loadLibrary).
  setTracks(tracks) { this.tracks = Array.isArray(tracks) ? tracks : []; if (this.playing && !(this.active?.track && this.suits(this.active.track))) this.update(); }
  // Every beat the player hears, and each new track or phrase: fn({kind: 'beat' | 'drum' |
  // 'heartbeat' | 'chord' | 'sting', at (audio clock, s), strength 0..1, track?}). Returns a
  // function to stop listening.
  onNote(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit(ev) { for (const fn of this.listeners) { try { fn(ev); } catch {} } }
  ensure() {
    if (this.ctx || !this.available) return this.ctx;
    const ctx = new this.AC(), master = ctx.createGain();
    master.gain.value = 0; master.connect(ctx.destination);
    this.ctx = ctx; this.master = master;
    if (ctx.createAnalyser) { const a = ctx.createAnalyser(); a.fftSize = 1024; a.smoothingTimeConstant = 0.5; master.connect(a); this.analyser = a; this.spectrum = new Uint8Array(a.frequencyBinCount); this.previous = new Uint8Array(a.frequencyBinCount); }
    this.decks = [this.deck(master), this.deck(master)];
    // The stings play beside the music, not through it, so the music can step back for them.
    const stings = ctx.createGain(); stings.gain.value = this.level; stings.connect(ctx.destination); this.stings = stings; this.stingDeck = this.deck(stings, 1);
    return ctx;
  }
  deck(dest, level = 0) {
    const el = new this.Audio(); el.preload = 'auto';
    const gain = this.ctx.createGain(), deck = { el, gain, track: null };
    gain.gain.value = level; this.ctx.createMediaElementSource(el).connect(gain); gain.connect(dest);
    // A track that will not load is skipped; when none will (offline), the music stops trying.
    el.addEventListener?.('error', () => {
      if (deck !== this.active || !this.playing) return;
      if (++this.failures > 3) { this.gaveUpAt = this.now(); this.stop(); return; }
      this.play(pickTrack(this.tracks, { ...this.moment, after: deck.track?.id, random: this.random }), 1);
    });
    el.addEventListener?.('playing', () => { if (deck === this.active) this.failures = 0; });
    return deck;
  }
  now() { return this.clock(); }
  ramp(param, to, seconds) { const t = this.ctx.currentTime; param.cancelScheduledValues?.(t); param.setValueAtTime(param.value, t); param.linearRampToValueAtTime(to, t + Math.max(0.01, seconds)); }
  start() {
    if (this.now() - this.gaveUpAt < 60000 || !this.ensure()) return false;
    if (this.ctx.state === 'suspended') this.ctx.resume?.();
    if (this.playing) return true;
    this.playing = true; this.failures = 0;
    this.ramp(this.master.gain, this.level, 0.8);
    // Back from a pause: the same track carries on where it was, if it still suits the moment.
    if (this.active?.track && this.suits(this.active.track)) this.active.el.play?.()?.catch?.(() => {});
    else this.play(pickTrack(this.tracks, { ...this.moment, random: this.random }), 1.2);
    this.timer = this.timers.setInterval(() => this.tick(), 40);
    return true;
  }
  stop() {
    this.playing = false;
    if (this.timer) { this.timers.clearInterval(this.timer); this.timer = null; }
    if (!this.ctx) return;
    this.ramp(this.master.gain, 0, 0.5);
    this.timers.setTimeout(() => { if (!this.playing) for (const d of [...this.decks, this.stingDeck]) d?.el.pause?.(); }, 650);
  }
  // Crossfades to a track on the other deck over `seconds`.
  play(track, seconds = 3) {
    if (!track || !this.ctx) return false;
    const from = this.active, to = this.decks.find(d => d !== from) || this.decks[0];
    if (to.track !== track || to.el.error) { to.track = track; to.el.src = this.base + track.file; }
    else { try { to.el.currentTime = 0; } catch {} } // loaded already (or played before): from the top
    to.el.play?.()?.catch?.(() => {});
    this.ramp(to.gain.gain, 1, seconds);
    if (from && from !== to) { this.ramp(from.gain.gain, 0, seconds); const el = from.el; this.timers.setTimeout(() => { if (this.active !== from) el.pause?.(); }, seconds * 1000 + 120); }
    this.active = to; this.next = null; this.switchedAt = this.now(); this.pending = false;
    this.emit({ kind: 'chord', at: this.ctx.currentTime, track: track.id, strength: 0.8 });
    return true;
  }
  // Loads the next track on the other deck, ready to come in.
  prepare(track) {
    const deck = this.decks.find(d => d !== this.active);
    if (!track || !deck) return;
    this.next = track;
    if (deck.track !== track || deck.el.error) { deck.track = track; deck.el.src = this.base + track.file; deck.el.load?.(); }
  }
  suits(track) { return tracksFor(this.tracks, this.moment).some(t => t.id === track.id); }
  // The moment changed (a game began or ended, a station was chosen, the game's part turned): a
  // track that no longer suits gives way, at once, or (`settle`, a turn of the game's part) once
  // the music has played ten seconds.
  update(settle = false) {
    if (!this.playing || !this.ctx) return;
    if (this.active?.track && this.suits(this.active.track)) { this.pending = false; return; }
    if (settle && this.now() - this.switchedAt < SETTLE_MS) { this.pending = true; return; }
    this.play(pickTrack(this.tracks, { ...this.moment, random: this.random }), this.part === 'storm' ? 1.5 : 3);
  }
  retune() { const part = partFor(this.tension, this.storm, this.partNow); if (part !== this.partNow) { this.partNow = part; this.update(part !== 'storm'); } }
  setVolume(v) { this.volume = Math.max(0, Math.min(1, Number(v) || 0)); if (this.master && this.playing) this.ramp(this.master.gain, this.level, 0.2); if (this.stings) this.stings.gain.value = this.level; }
  setTension(t) { this.tension = Math.max(0, Math.min(1, Number(t) || 0)); this.retune(); }
  setStorm(s) { this.storm = Math.max(0, Math.min(1, Number(s) || 0)); this.retune(); }
  setKey(id) { const key = MUSIC_KEYS[id] ? id : 'vanta'; if (key !== this.key) { this.key = key; this.update(); } }
  setPlace(place) { if (place !== this.place) { this.place = place; this.update(); } }
  setLobby(on) { this.setPlace(on ? 'lobby' : 'game'); }
  setStation(id) { const station = id || 'on'; if (station !== this.station) { this.station = station; this.update(); } }
  get nowPlaying() { return this.playing ? this.active?.track || null : null; }
  // For Resonance: a chord of the theme's progression that moves on every sixteen beats, and a
  // count that moves on like the eighth notes of a score.
  get chord() { return chordFor(this.key, this.beats >> 4); }
  get eighth() { return this.beats * 2 + 1; }
  readSpectrum() { if (!this.analyser || !this.playing) return null; this.analyser.getByteFrequencyData(this.spectrum); return this.spectrum; }
  tick() {
    if (!this.playing || !this.active) return;
    const el = this.active.el, d = el.duration, left = d - el.currentTime;
    if (Number.isFinite(d) && d > 10) {
      const after = () => pickTrack(this.tracks, { ...this.moment, after: this.active.track?.id, random: this.random });
      // The next track (or the same one again) loads twenty seconds before this one ends...
      if (left < 20 && !this.next && this.now() - this.switchedAt > 6000) this.prepare(after());
      // ...and comes in under its last four.
      if (left < 4) { this.play(this.next && this.suits(this.next) ? this.next : after(), 3.5); return; }
    }
    if (this.pending && this.now() - this.switchedAt >= SETTLE_MS) this.update();
    this.listen();
  }
  // Hears the beats. Each frame it measures how much the spectrum rose (its flux, in decibels,
  // so the volume does not matter) in two bands: the low end (kick drums, the bass, under 200 Hz)
  // and the middle (snares, chords, voices, up to 4 kHz; the hi-hats above are too busy to
  // follow). A rise well above the band's recent run is an onset: from the low end a drum (a
  // heartbeat in the storm), from the middle a beat. Every sixteenth starts a phrase.
  listen() {
    const a = this.analyser; if (!a) return;
    const bins = this.spectrum, prev = this.previous, n = bins.length; a.getByteFrequencyData(bins);
    const hz = (this.ctx.sampleRate || 44100) / 2 / n;
    const lowEnd = Math.min(n - 1, Math.max(2, Math.round(200 / hz))), midEnd = Math.min(n, Math.max(lowEnd + 1, Math.round(4000 / hz)));
    let low = 0, mid = 0, all = 0;
    for (let i = 1; i < midEnd; i++) { const d = bins[i] - prev[i]; all += bins[i]; if (d > 0) { if (i < lowEnd) low += d; else mid += d; } }
    prev.set(bins);
    const loud = all / (midEnd - 1) > 8, now = this.ctx.currentTime;
    const drum = this.onset(this.bands.low, low / (lowEnd - 1), loud), beat = this.onset(this.bands.mid, mid / Math.max(1, midEnd - lowEnd), loud);
    if ((drum || beat) && now - this.lastBeat > 0.22) {
      this.lastBeat = now; this.beats++;
      this.emit({ kind: drum ? (this.place === 'game' && this.part === 'storm' ? 'heartbeat' : 'drum') : 'beat', at: now, strength: Math.max(drum, beat) });
      if (this.beats % 16 === 0) this.emit({ kind: 'chord', at: now, strength: 0.6 });
    }
  }
  // One band's onset: its rise (per bin) well above its recent run. Returns how strong (0: none).
  onset(band, rise, loud) {
    const { avg, dev } = band, over = rise - (avg + 2.2 * dev + 4);
    band.avg = avg * 0.92 + rise * 0.08; band.dev = dev * 0.92 + Math.abs(rise - avg) * 0.08;
    return loud && over > 0 ? Math.min(1, Math.max(0.05, (rise - avg) / (6 * dev + 30))) : 0;
  }
  // Steps back for a moment (the sting plays over it), then comes back up.
  duck(seconds = 2.5) {
    if (!this.master || !this.playing) return;
    const t = this.ctx.currentTime, g = this.master.gain;
    g.cancelScheduledValues?.(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(this.level * 0.25, t + 0.3);
    g.setValueAtTime(this.level * 0.25, t + seconds); g.linearRampToValueAtTime(this.level, t + seconds + 1.5);
  }
  // The end of a game: 'win' | 'loss' | 'draw'.
  sting(result) {
    const track = stingFor(this.tracks, result, this.key);
    if (!track || !this.ensure()) return false;
    if (this.ctx.state === 'suspended') this.ctx.resume?.();
    const d = this.stingDeck; d.track = track; d.el.src = this.base + track.file; d.el.play?.()?.catch?.(() => {});
    this.duck(track.seconds || 6);
    this.emit({ kind: 'sting', at: this.ctx.currentTime, result, strength: 1 });
    return true;
  }
}
