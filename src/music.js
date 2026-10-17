// VCH's music: real tracks (owner, 2026-10-13: music made with Lyria 3.5, not synthesized in the
// browser; the library is public/assets/vch/music/library.json, read by src/music-library.js).
// With Music on it plays everywhere and follows you: your division's theme in the menus, focus
// music for puzzles, lessons and analysis, opera for Campaign bosses, electric music for fast
// games, and in your games a dark cinematic score in your theme's key whose part follows the
// game (calm in the opening, tense in the middlegame, triumphant or defiant when it tilts, the
// storm when your clock runs low). A station plays its own tracks instead.
//
// Transitions (owner, 2026-10-13: "the most important part ... how do you naturally flow into
// that music without distracting or cutting the attention of the player"; then: "the old one does
// not die down immediately... the overlapping is quite disturbing"; and 2026-10-14: "when a game
// starts, the start tune overlaps with the currently playing music. The mid-game tune overlaps...
// Let everything flow naturally"):
// - nothing ever plays over anything else: two pieces of music never sound together, and a sting
//   never plays over the music;
// - changes land on the music's own bar line: the outgoing track fades out in the moment before
//   the line (under a second) and the incoming one starts on it, its first downbeat on the line.
//   Going somewhere else, the new music then rises over a moment; the next part of a game's
//   piece (opening, middlegame, time trouble) comes straight in on its downbeat, as the piece
//   would turn;
// - the menus play like an album: a track plays to its natural end, a short pause, then the
//   next one from its own beginning; in a game the music runs on without a gap;
// - passing through a menu does not change the music: a change waits a moment to be sure;
// - the game's part turns at most every ten seconds, and holds a little (no flickering); the
//   storm comes in on the next beat;
// - a dialog muffles the music (as if behind a door) instead of stopping it;
// - stings (a game starting, a win, a checkmate, a promotion to a higher league) play alone: the
//   music fades away first, the sting plays, and the music comes back softly once it has rung out;
// - the volume has a ceiling (owner: "the music are kind of too loud"; 2026-10-14: "Let it not be
//   too loud or too distracting"): a quiet bed under the game's own sounds;
// - liked tracks come round about three times as often, and "Not for me" ones never play.
// The player listens to itself (an analyser): every beat it hears reaches the room (onNote), so
// the candles, the board's glow, the clocks and the sand follow the real music.
import { MUSIC_BASE, isSting, placesOf } from './music-library.js';

export const MUSIC_KEY = 'vch.music';
const SCALES = { aeolian: [0, 2, 3, 5, 7, 8, 10], phrygian: [0, 1, 3, 5, 7, 8, 10], lydian: [0, 2, 4, 6, 7, 9, 11], dorian: [0, 2, 3, 5, 7, 9, 10], harmonic: [0, 2, 3, 5, 7, 8, 11], ionian: [0, 2, 4, 5, 7, 9, 11], hijaz: [0, 1, 4, 5, 7, 8, 10] };
// Each theme's key (relic sets, campaign realms, the old worlds): its tracks are written in it,
// and Resonance draws its figures from it.
export const MUSIC_KEYS = {
  vanta: { root: 50, scale: 'aeolian' }, // D minor
  ember: { root: 52, scale: 'phrygian' }, // E phrygian
  umbra: { root: 48, scale: 'aeolian' }, // C minor, low
  gilded: { root: 53, scale: 'lydian' }, // F lydian
  mirror: { root: 57, scale: 'dorian' }, // A dorian
  obsidian: { root: 47, scale: 'aeolian' }, // B minor
  rivalry: { root: 55, scale: 'harmonic' }, // G harmonic minor
  // The old worlds (owner, 2026-10-13: "old civilization type music and themes... like the old
  // chinese and japanese style, rome and so on"): each has its theme for the menus and a battle
  // suite for its games.
  egypt: { root: 52, scale: 'hijaz' }, // E hijaz
  greece: { root: 50, scale: 'dorian' }, // D dorian
  rome: { root: 57, scale: 'aeolian' }, // A minor
  china: { root: 50, scale: 'ionian' }, // D major (pentatonic)
  japan: { root: 57, scale: 'phrygian' }, // A, the in scale
  persia: { root: 50, scale: 'phrygian' }, // D, dastgah shur
  babylon: { root: 50, scale: 'phrygian' }, // D phrygian
  benin: { root: 48, scale: 'aeolian' }, // C minor
};
// The old worlds a player can choose (Theme Studio: World): their music in the menus and in games.
export const WORLDS = ['egypt', 'greece', 'rome', 'china', 'japan', 'persia', 'babylon', 'benin'];
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
// The part of a game's music: the storm when your clock runs low; tense as the game deepens,
// ahead or behind when it tilts (mood). `was` (the part playing) holds it a little longer, so
// the music does not flicker between two.
export function partFor(tension = 0, storm = 0, was = 'calm', mood = 'even') {
  if (storm > (was === 'storm' ? 0.2 : 0.3)) return 'storm';
  if (!(tension > (was === 'calm' ? 0.45 : 0.35))) return 'calm';
  return mood === 'ahead' || mood === 'behind' ? mood : 'tense';
}
// How the game is going for you, from the material (your pieces' value less your opponent's):
// ahead from three points up, behind from three down, held until it comes back within one.
export function moodFor(diff = 0, was = 'even') {
  const d = Number(diff) || 0;
  if (d >= 3 || (was === 'ahead' && d >= 2)) return 'ahead';
  if (d <= -3 || (was === 'behind' && d <= -2)) return 'behind';
  return 'even';
}
export function loadMusic(storage = globalThis.localStorage) {
  try { const v = JSON.parse(storage?.getItem(MUSIC_KEY) || ''); return { on: !!v?.on, volume: Number.isFinite(v?.volume) ? Math.max(0, Math.min(1, v.volume)) : 0.5, station: typeof v?.station === 'string' && v.station ? v.station : 'on' }; }
  catch { return { on: false, volume: 0.5, station: 'on' }; }
}
export function saveMusic(v, storage = globalThis.localStorage) { try { storage?.setItem(MUSIC_KEY, JSON.stringify({ on: !!v.on, volume: v.volume, station: v.station || 'on' })); } catch {} return v; }
// How loud the music is at a volume (0..1): a ceiling (full volume is about -21 LUFS, the
// library being at -16; the default, half way, about -29) and a curve, so the slider's lower half
// is fine-grained.
export const MAX_LEVEL = 0.55;
export const levelFor = volume => MAX_LEVEL * clamp(Number(volume) || 0, 0, 1) ** 1.3;

// ---- Likes (owner, 2026-10-13: "depending on the likes of the person, the music prioritizes
// their liked music") ----
// Each player's likes stay on their device: the tracks they liked, and the ones they asked never
// to hear again ("Not for me").
export const LIKES_KEY = 'vch.music.likes';
const trackIds = a => [...new Set((Array.isArray(a) ? a : []).filter(x => typeof x === 'string' && /^[a-z0-9-]{1,60}$/.test(x)))].slice(0, 500);
export function loadMusicLikes(storage = globalThis.localStorage) {
  try { const v = JSON.parse(storage?.getItem(LIKES_KEY) || '{}'), liked = trackIds(v?.liked); return { liked, hidden: trackIds(v?.hidden).filter(id => !liked.includes(id)) }; }
  catch { return { liked: [], hidden: [] }; }
}
export function saveMusicLikes(v, storage = globalThis.localStorage) {
  const out = { liked: trackIds(v?.liked), hidden: trackIds(v?.hidden) };
  out.hidden = out.hidden.filter(id => !out.liked.includes(id));
  try { storage?.setItem(LIKES_KEY, JSON.stringify(out)); } catch {}
  return out;
}
// A like, or a "Not for me", for one track (each undoes the other).
export function likeTrack(likes, id, on = true) {
  const liked = (likes?.liked || []).filter(x => x !== id), hidden = (likes?.hidden || []).filter(x => !(on && x === id));
  return { liked: on ? [...liked, id] : liked, hidden };
}
export function hideTrack(likes, id, on = true) {
  const hidden = (likes?.hidden || []).filter(x => x !== id), liked = (likes?.liked || []).filter(x => !(on && x === id));
  return { liked, hidden: on ? [...hidden, id] : hidden };
}
// ---- The library: what suits a moment ----
const GAME_PARTS = { calm: ['calm', 'tense'], tense: ['tense', 'calm'], storm: ['storm', 'tense'], ahead: ['ahead', 'tense'], behind: ['behind', 'tense'] };
// The tracks that suit a moment. A station plays its own tracks (Everything: all of them, your
// own songs too; Liked: the ones you liked, or follows the game until you like one; My music:
// your own songs, or follows the game until you add one). Following the game: the menus
// play your division's hall and the open themes (songs only on the Songs station); a game plays
// its theme's part (the theme's nearest part when it has not that one, then Vanta's); a boss its
// realm's opera; after a game the win or loss music; a relic set its own theme; the rest their
// own place's music, falling back to the menus'.
export function tracksFor(tracks, { station = 'on', place = 'lobby', part = 'calm', theme = 'vanta', division = null, skin = null, likes = null } = {}) {
  // A battle suite plays whole on a station and in the lists, and in its parts in a game (each
  // part an entry of its own, `of` the whole piece).
  const all = tracks.filter(t => !isSting(t)), inParts = new Set(all.filter(t => t.of).map(t => t.of));
  const music = all.filter(t => !t.of), at = p => music.filter(t => placesOf(t).includes(p));
  if (station === 'liked') { const liked = new Set(likes?.liked || []), mine = music.filter(t => liked.has(t.id)); if (mine.length) return mine; station = 'on'; }
  if (station === 'mine') { const mine = music.filter(t => t.station === 'mine'); if (mine.length) return mine; station = 'on'; }
  if (station && station !== 'on') return station === 'mix' ? music.filter(t => !placesOf(t).includes('skin')) : music.filter(t => t.station === station);
  const game = () => {
    const all = [...at('game').filter(t => !inParts.has(t.id)), ...tracks.filter(t => t.of && placesOf(t).includes('game'))];
    for (const th of [theme, 'vanta']) {
      const mine = all.filter(t => (t.theme || 'vanta') === th);
      for (const p of GAME_PARTS[part] || [part]) { const pool = mine.filter(t => (t.part || 'calm') === p); if (pool.length) return pool; }
    }
    return all;
  };
  // The menus: your world's theme when you chose one, your division's hall (Bronze before you
  // have one), and the open themes when you have no world. A world's theme plays only for it.
  const lobby = () => {
    const all = at('lobby').filter(t => t.kind !== 'song' && (!t.theme || t.theme === theme)), world = all.filter(t => t.theme === theme);
    const open = all.filter(t => !t.division && !t.theme), mine = all.filter(t => t.division === (division || 'bronze'));
    if (world.length) return [...world, ...mine];
    return mine.length || open.length ? [...mine, ...open] : all;
  };
  let pool;
  if (place === 'game') pool = game();
  else if (place === 'lobby') pool = lobby();
  else if (place === 'boss') { const all = at('boss'), mine = all.filter(t => t.theme === theme); pool = mine.length ? mine : all.length ? all : game(); }
  else if (place === 'blitz') pool = at('blitz').length ? at('blitz') : game();
  else if (place === 'result') { const all = at('result'), of = p => all.filter(t => t.part === p); pool = of(part).length ? of(part) : part === 'draw' && of('loss').length ? of('loss') : all; }
  else if (place === 'skin') { const all = at('skin'), mine = all.filter(t => t.skin === skin); pool = mine.length ? mine : all; }
  else pool = at(place);
  return pool.length ? pool : lobby().length ? lobby() : music;
}
// The next track for a moment: not one of the last few again when there is another, never one
// you said is not for you (unless nothing else suits), a liked one about three times as often as
// another, and a song in your own language three times as often as one in another.
export function pickTrack(tracks, { history = [], after = null, random = Math.random, likes = null, language = null, ...moment } = {}) {
  let pool = tracksFor(tracks, { ...moment, likes });
  if (!pool.length) return null;
  // (A suite's part counts as the suite: liking or hiding the piece likes or hides its parts.)
  const hidden = new Set(likes?.hidden || []), liked = new Set(likes?.liked || []), is = (set, t) => set.has(t.id) || (!!t.of && set.has(t.of));
  const shown = pool.filter(t => !is(hidden, t));
  if (shown.length) pool = shown;
  const past = after && !history.includes(after) ? [...history, after] : history;
  const recent = new Set(past.slice(-Math.min(3, pool.length - 1)));
  const fresh = pool.filter(t => !recent.has(t.id)), from = fresh.length ? fresh : pool;
  const weight = t => (is(liked, t) ? 3 : 1) * (t.kind === 'song' && language && t.lang === language ? 3 : 1);
  let x = random() * from.reduce((sum, t) => sum + weight(t), 0);
  for (const t of from) { x -= weight(t); if (x < 0) return t; }
  return from[from.length - 1];
}
// A sting for a moment (win, loss, draw, checkmate, start, rank-up, ...): the theme's own if it
// has one, otherwise one of the open ones (any one, when there are several). A moment without
// a sting of its own borrows the nearest one (a draw the loss's, a checkmate the win's).
const STING_FALLBACK = { draw: 'loss', checkmate: 'win', 'rank-up': 'win', 'rank-down': 'loss', relic: 'win', realm: 'win', solved: 'win', failed: 'loss', brilliant: 'solved' };
export function stingFor(tracks, kind, theme = 'vanta', random = Math.random) {
  for (let k = kind, n = 0; k && n < 3; k = STING_FALLBACK[k], n++) {
    const pool = tracks.filter(t => isSting(t) && t.part === k), mine = pool.filter(t => t.theme === theme), open = pool.filter(t => !t.theme || t.theme === 'vanta');
    const from = mine.length ? mine : open.length ? open : pool;
    if (from.length) return from[Math.floor(random() * from.length) % from.length];
  }
  return null;
}

// ---- Musical time ----
export const barSeconds = t => (t?.bpm ? 240 / t.bpm : 0); // 4/4
// Where a track enters: its first downbeat at or after the start of its sound.
export function entryOf(t) {
  const start = t?.start || 0, bar = barSeconds(t);
  if (!bar) return start;
  const beat = t.beat || 0, line = beat + Math.ceil((start - beat - 0.02) / bar) * bar;
  return line >= start && line - start < bar ? line : start;
}
// The next line (a bar, or a beat) of a track playing at `at` seconds, at least `lead` ahead.
export function nextLine(t, at, unit, lead = 0) {
  if (!unit) return null;
  const beat = t?.beat || 0;
  return beat + Math.ceil((at + lead - beat) / unit) * unit;
}
// An equal-power fade: in (rising as a sine) or out (falling as a cosine), so two tracks
// crossing keep the same loudness all the way through.
export function equalPower(level, direction, steps = 33) {
  const c = new Float32Array(steps);
  for (let i = 0; i < steps; i++) { const x = i / (steps - 1); c[i] = level * (direction > 0 ? Math.sin(x * Math.PI / 2) : Math.cos(x * Math.PI / 2)); }
  return c;
}
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const dbToGain = db => 10 ** ((Number(db) || 0) / 20);
const OPEN = 20000; // a filter that lets everything through

const SETTLE_MS = 10000; // in a game, the music follows its part at most this often (the storm at once)
const DEBOUNCE_MS = 1200; // going somewhere: how long the music waits to be sure you are staying
const ALBUM_GAP = 1.6; // the menus: the pause between one track's end and the next one's beginning
const CONTINUOUS = ['game', 'boss', 'blitz']; // where the music runs on without a pause
// A sting: the music fades away over DUCK_OUT, the sting starts STING_WAIT later (once it has),
// and the music comes back over DUCK_BACK after the sting has rung out.
const DUCK_OUT = 0.3, STING_WAIT = 0.3, DUCK_BACK = 2;
export class VantaScore {
  constructor({ AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext, AudioElement = globalThis.Audio, timers = globalThis, tracks = [], base = MUSIC_BASE, random = Math.random, clock = () => globalThis.performance?.now?.() ?? Date.now() } = {}) {
    Object.assign(this, { AC: AudioContextClass, Audio: AudioElement, timers, base, random, clock });
    this.tracks = []; this.setTracks(tracks);
    this.ctx = null; this.timer = null; this.playing = false;
    this.key = 'vanta'; this.tension = 0; this.storm = 0; this.mood = 'even'; this.partNow = 'calm';
    this.volume = 0.5; this.place = 'lobby'; this.station = 'on'; this.division = null; this.result = 'win'; this.skin = null;
    this.decks = []; this.active = null; this.next = null; this.switchedAt = -1e9; this.pending = false; this.failures = 0; this.gaveUpAt = -1e9;
    this.debounce = null; this.history = []; this.muffled = 0; this.crossing = null; this.duckBack = -Infinity;
    this.likes = { liked: [], hidden: [] }; this.language = null; this.pinned = null; this.queued = null;
    this.unlocked = false; this.refused = null; // a tap has readied the audio; a deck the browser would not start
    this.listeners = new Set(); this.beats = 0; this.bands = { low: { avg: 0, dev: 0 }, mid: { avg: 0, dev: 0 } }; this.lastBeat = -1;
  }
  get available() { return !!(this.AC && this.Audio && this.tracks.some(t => !isSting(t))); }
  get part() { return this.partNow; }
  get moment() { return { station: this.station, place: this.place, part: this.place === 'result' ? this.result : this.part, theme: this.key, division: this.division, skin: this.skin, likes: this.likes, language: this.language }; }
  get level() { return levelFor(this.volume); }
  // The menus (and any station) play like an album; a game's music runs on.
  get album() { return this.station !== 'on' || !CONTINUOUS.includes(this.place); }
  levelOf(t) { return dbToGain(t?.gain); }
  // Where a track's file is: the library's folder, or (your own songs) its own address.
  urlOf(t) { return t.src || this.base + t.file; }
  // A browser that cannot play a file's format never tries it (AAC in .m4a, MP3; your own songs
  // by their type).
  playable(t) {
    let el = this.probe;
    if (el === undefined) { try { el = this.Audio ? new this.Audio() : null; } catch { el = null; } this.probe = el; }
    if (!el?.canPlayType) return true;
    if (t.src) return !t.type || el.canPlayType(t.type) !== '';
    return el.canPlayType(t.file.endsWith('.mp3') ? 'audio/mpeg' : 'audio/mp4; codecs="mp4a.40.2"') !== '';
  }
  // The library arrived (src/music-library.js loadLibrary).
  setTracks(tracks) {
    this.tracks = (Array.isArray(tracks) ? tracks : []).filter(t => this.playable(t));
    // The track playing keeps playing as the list changes (a song renamed shows its new name).
    const now = this.active?.track, fresh = now && this.tracks.find(t => t.id === now.id && this.urlOf(t) === this.urlOf(now));
    if (fresh) this.active.track = fresh;
    if (this.playing && !(this.active?.track && this.suits(this.active.track))) this.update('now');
  }
  // Every beat the player hears, and each new track or phrase: fn({kind: 'beat' | 'drum' |
  // 'heartbeat' | 'chord' | 'sting', at (audio clock, s), strength 0..1, track?}). Returns a
  // function to stop listening.
  onNote(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit(ev) { for (const fn of this.listeners) { try { fn(ev); } catch {} } }
  later(fn, ms) { return this.timers.setTimeout(fn, Math.max(0, ms)); }
  // `ready`: build the audio even before the library has arrived (a tap must ready it, see unlock).
  ensure(ready = false) {
    if (this.ctx || !(this.available || (ready && this.AC && this.Audio))) return this.ctx;
    const ctx = new this.AC();
    // master (the volume) → muffle (a dialog's door) → out; the analyser listens before the door.
    const master = ctx.createGain(), muffle = ctx.createBiquadFilter(), muffleGain = ctx.createGain();
    master.gain.value = 0; muffle.type = 'lowpass'; muffle.frequency.value = OPEN; muffle.Q.value = 0.5;
    master.connect(muffle); muffle.connect(muffleGain); muffleGain.connect(ctx.destination);
    Object.assign(this, { ctx, master, muffleFilter: muffle, muffleGain });
    if (ctx.createAnalyser) { const a = ctx.createAnalyser(); a.fftSize = 1024; a.smoothingTimeConstant = 0.5; master.connect(a); this.analyser = a; this.spectrum = new Uint8Array(a.frequencyBinCount); this.previous = new Uint8Array(a.frequencyBinCount); }
    this.decks = [this.deck(master), this.deck(master), this.deck(master)];
    // The stings play beside the music (still behind the door), so the music can step back for them.
    const stings = ctx.createGain(); stings.gain.value = this.level; stings.connect(muffle); this.stings = stings; this.stingDeck = this.deck(stings, 1);
    return ctx;
  }
  deck(dest, level = 0) {
    const el = new this.Audio(); el.preload = 'auto';
    // track: what the deck plays (or is about to); file: what its element has loaded.
    const filter = this.ctx.createBiquadFilter(), gain = this.ctx.createGain(), deck = { el, filter, gain, track: null, file: null, usedAt: -Infinity, until: 0 };
    filter.type = 'lowpass'; filter.frequency.value = OPEN; filter.Q.value = 0.5;
    gain.gain.value = level; this.ctx.createMediaElementSource(el).connect(filter); filter.connect(gain); gain.connect(dest);
    // A track that will not load is skipped; when none will (offline), the music stops trying.
    el.addEventListener?.('error', () => {
      if (deck !== this.active || !this.playing) return;
      if (++this.failures > 3) { this.gaveUpAt = this.now(); this.stop(); return; }
      this.transition(this.pick({ after: deck.track?.id }), 'start');
    });
    el.addEventListener?.('playing', () => { if (deck === this.active) this.failures = 0; });
    return deck;
  }
  now() { return this.clock(); }
  // Holds a gain where it is now, dropping whatever was scheduled after (cancelling a fade in
  // progress would otherwise jump back to where it began). Returns that value.
  hold(param) {
    const t = this.ctx.currentTime, v = param.value;
    if (param.cancelAndHoldAtTime) param.cancelAndHoldAtTime(t); else { param.cancelScheduledValues?.(t); param.setValueAtTime(v, t); }
    return v;
  }
  ramp(param, to, seconds) { this.hold(param); param.linearRampToValueAtTime(to, this.ctx.currentTime + Math.max(0.01, seconds)); }
  // An equal-power fade from `from` to `to`, from `start` (audio clock) over `len` seconds.
  curveTo(param, from, to, start, len) {
    try {
      if (!param.setValueCurveAtTime) throw new Error('no curves');
      param.setValueCurveAtTime(to > from ? equalPower(to, 1) : equalPower(from, -1), start, len);
    } catch { param.setValueAtTime(from, start); param.linearRampToValueAtTime(to, start + len); }
  }
  // The deck to bring the next track in on: of the ones not playing now, the one that stopped
  // longest ago (three decks, so a second change soon after the first never cuts a fading track).
  spare() { return this.decks.filter(d => d !== this.active).sort((a, b) => (a.usedAt - b.usedAt) || 0)[0] || this.decks[0]; }
  start() {
    if (this.now() - this.gaveUpAt < 60000 || !this.ensure()) return false;
    if (this.ctx.state === 'suspended') this.ctx.resume?.();
    if (this.playing) return true;
    this.playing = true; this.failures = 0;
    this.toLevel(0.8);
    // Back from a pause: the same track carries on where it was, if it still suits the moment.
    const chosen = this.pinned && this.tracks.find(t => t.id === this.pinned);
    if (!chosen && this.active?.track && this.suits(this.active.track)) { const back = this.active; back.el.play?.()?.catch?.(e => { if (e?.name === 'NotAllowedError' && this.active === back) this.refused = back; }); }
    else this.transition(chosen || this.pick(), 'start');
    this.timer = this.timers.setInterval(() => this.tick(), 40);
    return true;
  }
  // iOS and iPadOS let sound start only inside a tap (a touch's end, a click or a key, never a
  // touch's start), and let an audio element play later on its own only once a tap has readied it.
  // So every tap calls this. The first one builds the audio, wakes it (a silent sample), and
  // readies each deck; a track the browser refused to start (see transition) starts now.
  unlock() {
    if (!this.ensure(true)) return false;
    const ctx = this.ctx;
    try { if (ctx.state !== 'running' && ctx.state !== 'closed') ctx.resume?.(); } catch {}
    if (!this.unlocked) {
      this.unlocked = true;
      try { const b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start?.(0); } catch {}
      // An empty deck is readied by loading nothing; one with a track waiting plays it for a moment
      // at no volume (its fader is down). The stings' deck is never at zero, so it only loads.
      for (const d of [...this.decks, this.stingDeck]) {
        if (!d || !d.el.paused) continue;
        try {
          if (!d.file || d === this.stingDeck) { if (!d.file) d.el.load?.(); }
          else d.el.play?.()?.then?.(() => { if (this.active !== d || !this.playing) d.el.pause?.(); }, () => {});
        } catch {}
      }
    }
    const held = this.refused; this.refused = null;
    if (held && this.playing && this.active === held && held.el.paused) held.el.play?.()?.catch?.(e => { if (e?.name === 'NotAllowedError' && this.active === held) this.refused = held; });
    return true;
  }
  stop() {
    this.playing = false;
    if (this.timer) { this.timers.clearInterval(this.timer); this.timer = null; }
    this.clearDebounce();
    if (!this.ctx) return;
    this.ramp(this.master.gain, 0, 0.5);
    this.later(() => { if (!this.playing) for (const d of [...this.decks, this.stingDeck]) d?.el.pause?.(); }, 650);
  }
  pick(extra = {}) { return pickTrack(this.tracks, { ...this.moment, history: this.history, random: this.random, ...extra }); }
  // Brings `track` in on the other deck. style: 'start' (from silence), 'next' (the last one is
  // ending), 'switch' (you went somewhere else), 'part' (the game's part turned), 'storm' (your
  // clock running out: on the next beat).
  transition(track, style = 'switch') {
    if (!track || !this.ctx) return false;
    const from = this.active?.track && !this.active.el.paused ? this.active : null, to = this.spare();
    const now = this.ctx.currentTime, album = style === 'next' && this.album;
    // When: the menus' next track after a pause; otherwise the outgoing track's next bar line (its
    // next beat, into the storm), at least a moment ahead so the incoming one can get ready; a
    // beat line when the bar line is far off (a slow track); at once from silence; without a beat
    // grid (your own songs), once the old one has faded away (a moment).
    let wait = 0;
    if (album) { wait = from ? ALBUM_GAP : 0; this.crossing = null; }
    else if (from && style !== 'start') {
      const ft = from.track, beat = ft.bpm ? 60 / ft.bpm : 0, t = from.el.currentTime || 0;
      let line = nextLine(ft, t, style === 'storm' ? beat : barSeconds(ft), 0.35);
      if (line !== null && line - t > 4.5) line = nextLine(ft, t, beat, 0.35);
      wait = line === null ? (style === 'storm' ? 0.35 : 0.8) : clamp(line - t, 0.05, 4.5);
      this.crossing = { from, line: t + wait };
    } else this.crossing = null;
    // How: never two at once. The old one fades out just before the line and the new one starts
    // on it: rising over a moment when you went somewhere else, straight in on its downbeat when
    // the game's piece turns to its next part (or the storm comes).
    const fadeIn = !from ? (album ? 0.05 : 1.2) : album ? 0.05 : style === 'switch' ? 1.2 : 0.12;
    const fadeOut = !from ? 0 : album ? 0.05 : clamp(wait, 0.05, style === 'storm' ? 0.35 : 0.8);
    const at = now + wait, entry = album ? track.start || 0 : entryOf(track);
    // A deck still fading out from an earlier change steps back first (a tenth of a second); a
    // silent one starts from nothing.
    const busy = to.track && !to.el.paused && to.until > now ? 0.09 : 0, g = to.gain.gain;
    if (busy) this.ramp(g, 0, 0.08); else { g.cancelScheduledValues?.(now); g.setValueAtTime(0, now); }
    // Where: the incoming track starts so that its first downbeat lands on that line; it plays
    // silently until then (the menus' next track simply starts from its beginning).
    const launch = () => {
      if (this.active !== to) return;
      const ahead = Math.max(0, at - this.ctx.currentTime), lead = album ? 0 : Math.min(entry, ahead), delay = ahead - lead;
      if (to.file !== this.urlOf(track) || to.el.error) { to.file = this.urlOf(track); to.el.src = to.file; }
      to.filter.frequency.cancelScheduledValues?.(this.ctx.currentTime); to.filter.frequency.setValueAtTime(OPEN, this.ctx.currentTime);
      try { to.el.currentTime = entry - lead; } catch {}
      // A browser that will not start sound outside a tap (iOS and iPadOS) refuses this; the next
      // tap starts it (unlock).
      const go = () => { if (this.active === to) to.el.play?.()?.catch?.(e => { if (e?.name === 'NotAllowedError' && this.active === to) this.refused = to; }); };
      if (delay > 0.02) this.later(go, delay * 1000); else go();
    };
    this.active = to; to.track = track; to.usedAt = now; to.until = Infinity; to.fading = false;
    if (busy) this.later(launch, busy * 1000); else launch();
    this.curveTo(g, 0, this.levelOf(track), Math.max(at, now + 0.005 + busy), fadeIn);
    if (from && from !== to) {
      const v = this.hold(from.gain.gain), outAt = Math.max(now + 0.005, at - fadeOut);
      const outLen = Math.max(0.01, Math.min(fadeOut, at - outAt));
      this.curveTo(from.gain.gain, v, 0, outAt, outLen);
      from.until = outAt + outLen;
      const el = from.el; this.later(() => { if (this.active !== from) el.pause?.(); }, (outAt - now + outLen) * 1000 + 150);
      // Once the incoming plays, line it up again with the outgoing (it is still silent).
      if (!album && track.bpm && from.track?.bpm && wait > 0.3) this.later(() => this.align(to, entry), Math.min(600, wait * 1000 - 200));
    }
    this.next = null; this.queued = null; this.switchedAt = this.now(); this.pending = false;
    this.history.push(track.id); if (this.history.length > 8) this.history.shift();
    this.emit({ kind: 'chord', at, track: track.id, strength: 0.8 });
    return true;
  }
  // Keeps the incoming track's downbeat on the outgoing track's bar line (media elements start
  // a little late); only while the incoming is still silent.
  align(to, entry) {
    const c = this.crossing; if (!c || this.active !== to) return;
    const remaining = c.line - (c.from.el.currentTime || 0);
    if (remaining < 0.08) return;
    const want = entry - remaining;
    if (want >= 0 && Math.abs((to.el.currentTime || 0) - want) > 0.04) { try { to.el.currentTime = want; } catch {} }
  }
  // Loads the next track on the deck it will come in on.
  prepare(track) {
    const deck = this.spare();
    if (!track || !deck || (deck.track && !deck.el.paused)) return; // that deck is still fading out: load it when the change comes
    this.next = track;
    if (deck.file !== this.urlOf(track) || deck.el.error) { deck.file = this.urlOf(track); deck.el.src = deck.file; deck.el.load?.(); }
  }
  suits(track) { return track.id === this.pinned || tracksFor(this.tracks, this.moment).some(t => t.id === track.id); }
  clearDebounce() { if (this.debounce) { this.timers.clearTimeout?.(this.debounce); this.debounce = null; } }
  // The moment changed. A track that still suits it stays. Otherwise: 'storm' changes on the next
  // beat; 'part' (the game's part turned) once the music has played ten seconds; 'now' (a game
  // began or ended) on the next bar line; anything else waits a moment in case you are only
  // passing through, then changes on the next bar line.
  update(reason = 'switch') {
    if (!this.playing || !this.ctx) return;
    if (this.active?.track && this.suits(this.active.track)) { this.pending = false; this.clearDebounce(); return; }
    if (reason === 'storm') { this.clearDebounce(); this.transition(this.pick(), 'storm'); return; }
    if (reason === 'part') { if (this.now() - this.switchedAt < SETTLE_MS) { this.pending = true; return; } this.transition(this.pick(), 'part'); return; }
    this.clearDebounce();
    if (reason === 'now') { this.transition(this.pick(), 'switch'); return; }
    this.debounce = this.later(() => { this.debounce = null; if (this.playing && !(this.active?.track && this.suits(this.active.track))) this.transition(this.pick(), 'switch'); }, DEBOUNCE_MS);
  }
  retune() { const part = partFor(this.tension, this.storm, this.partNow, this.mood); if (part !== this.partNow) { this.partNow = part; this.update(part === 'storm' ? 'storm' : 'part'); } }
  setVolume(v) {
    const volume = Math.max(0, Math.min(1, Number(v) || 0)); if (volume === this.volume) return; // unchanged: a sting's step back carries on
    this.volume = volume; if (this.master && this.playing) this.toLevel(0.2); if (this.stings) this.stings.gain.value = this.level;
  }
  setTension(t) { this.tension = Math.max(0, Math.min(1, Number(t) || 0)); this.retune(); }
  setStorm(s) { this.storm = Math.max(0, Math.min(1, Number(s) || 0)); this.retune(); }
  setMood(m) { this.mood = m === 'ahead' || m === 'behind' ? m : 'even'; this.retune(); }
  setKey(id, urgent = false) { const key = MUSIC_KEYS[id] ? id : 'vanta'; if (key !== this.key) { this.key = key; this.update(urgent ? 'now' : 'switch'); } }
  setPlace(place, urgent = false) { if (place !== this.place) { this.place = place; this.pinned = null; if (place !== 'game') { this.partNow = 'calm'; } this.update(urgent ? 'now' : 'switch'); } }
  setLobby(on) { this.setPlace(on ? 'lobby' : 'game', true); }
  setResult(result) { const r = result === 'loss' || result === 'draw' ? result : 'win'; if (r !== this.result) { this.result = r; if (this.place === 'result') this.update('now'); } }
  setDivision(d) { const division = d || null; if (division !== this.division) { this.division = division; this.update('switch'); } }
  setSkin(s) { const skin = s || null; if (skin !== this.skin) { this.skin = skin; if (this.place === 'skin') this.update('switch'); } }
  setStation(id) { const station = id || 'on'; if (station !== this.station) { this.station = station; this.pinned = null; this.update('now'); } }
  // Your likes (src/music.js loadMusicLikes): a track you just said is not for you gives way at
  // once; the Liked station follows what you like.
  setLikes(likes) {
    this.likes = { liked: [...(likes?.liked || [])], hidden: [...(likes?.hidden || [])] }; this.queued = null;
    const now = this.active?.track;
    if (this.playing && now && (this.likes.hidden.includes(now.id) || (now.of && this.likes.hidden.includes(now.of)))) this.skip();
    else if (this.station === 'liked') this.update('now');
  }
  // Your language (a song in it comes round more often on the Songs station).
  setLanguage(lang) { const l = typeof lang === 'string' && /^[a-z]{2}/.test(lang) ? lang.slice(0, 2) : null; if (l !== this.language) { this.language = l; this.queued = null; } }
  // The next track now (Next, or Not for me), handed over quickly on the bar line.
  skip() {
    if (!this.playing || !this.ctx) return false;
    this.pinned = null; this.clearDebounce();
    const id = this.active?.track?.id, pool = this.pick({ after: id });
    return this.transition(pool && pool.id === id ? this.pick({ after: id, history: [...this.history, id] }) || pool : pool, 'switch');
  }
  // Plays a chosen track (from the music list) now; it stays until it ends or you go elsewhere.
  playNow(id) {
    const track = this.tracks.find(t => t.id === id && !isSting(t));
    if (!track) return false;
    this.pinned = id; this.clearDebounce();
    if (!this.playing) return this.start();
    return this.transition(track, 'switch');
  }
  // What comes next, for the now-playing panel: chosen ahead and kept until it plays.
  get upcoming() {
    if (!this.playing) return null;
    if (this.next && this.suits(this.next)) return this.next;
    const q = this.queued, hidden = this.likes.hidden;
    if (!q || !this.suits(q) || hidden.includes(q.id) || (q.of && hidden.includes(q.of))) this.queued = this.pick({ after: this.active?.track?.id });
    return this.queued;
  }
  // A dialog in front of the board: the music as if behind a door (0 open .. 1 shut).
  muffle(amount = 1) {
    const a = clamp(Number(amount) || 0, 0, 1); this.muffled = a;
    if (!this.ctx) return;
    const t = this.ctx.currentTime, f = this.muffleFilter.frequency, g = this.muffleGain.gain;
    this.hold(f); f.setTargetAtTime(a ? OPEN * (900 / OPEN) ** a : OPEN, t, a ? 0.12 : 0.25);
    this.hold(g); g.setTargetAtTime(1 - 0.3 * a, t, 0.15);
  }
  get nowPlaying() { return this.playing ? this.active?.track || null : null; }
  // For Resonance: a chord of the theme's progression that moves on every sixteen beats, and a
  // count that moves on like the eighth notes of a score.
  get chord() { return chordFor(this.key, this.beats >> 4); }
  get eighth() { return this.beats * 2 + 1; }
  readSpectrum() { if (!this.analyser || !this.playing) return null; this.analyser.getByteFrequencyData(this.spectrum); return this.spectrum; }
  tick() {
    if (!this.playing || !this.active?.track) return;
    const el = this.active.el, t = this.active.track, d = el.duration, end = Math.min(t.end || Infinity, Number.isFinite(d) ? d : Infinity), left = end - (el.currentTime || 0);
    if (Number.isFinite(left) && end > 10) {
      const bar = barSeconds(t) || 2.5;
      // A piece cut short of its own ending (its end set before it) fades out over its last
      // seconds in the menus; in a game the next one crosses it on the bar line anyway.
      if (this.album && t.fade && left <= t.fade && !this.active.fading) {
        this.active.fading = true; const g = this.active.gain.gain;
        this.curveTo(g, this.hold(g), 0, this.ctx.currentTime + 0.005, Math.max(0.05, left - 0.05));
      }
      // The next track (or the same one again) loads twenty seconds before this one ends...
      if (left < 20 && !this.next && this.now() - this.switchedAt > 6000) this.prepare(this.upcoming);
      // ...and, in the menus, begins once this one has rung out (after a short pause); in a game,
      // it comes in on the bar line before this one's last bar, so the music never stops.
      const due = this.album ? left <= 0.08 || el.ended : left < bar + 0.5;
      if (due && this.now() - this.switchedAt > 4000) {
        if (t.id === this.pinned) this.pinned = null;
        this.transition(this.next && this.suits(this.next) ? this.next : this.pick({ after: t.id }), 'next'); return;
      }
    }
    if (this.pending && this.now() - this.switchedAt >= SETTLE_MS) this.update('part');
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
  // The music up to the volume over `seconds`; while a sting plays, only once it has rung out.
  toLevel(seconds) {
    const g = this.master.gain, t = this.ctx.currentTime;
    if (t >= this.duckBack) { this.ramp(g, this.level, seconds); return; }
    this.hold(g); g.linearRampToValueAtTime(0, Math.min(this.duckBack, t + DUCK_OUT));
    g.setValueAtTime(0, this.duckBack); g.linearRampToValueAtTime(this.level, this.duckBack + DUCK_BACK);
  }
  // Steps out for a sting: the music fades away (a third of a second), stays out while the sting
  // plays (from `start`, for `seconds`) and comes back softly once it has rung out.
  duck(start, seconds) {
    this.duckBack = Math.max(this.duckBack, start + seconds);
    if (this.master && this.playing) this.toLevel(DUCK_BACK);
  }
  // A short cue, alone: 'win' | 'loss' | 'draw' | 'checkmate' | 'start' | 'rank-up' | ...
  // With music playing, it waits for the music to fade away first.
  sting(kind) {
    const track = stingFor(this.tracks, kind, this.key, this.random);
    if (!track || !this.ensure()) return false;
    if (this.ctx.state === 'suspended') this.ctx.resume?.();
    const d = this.stingDeck, now = this.ctx.currentTime, wait = this.playing ? STING_WAIT : 0;
    if (d.file !== this.urlOf(track) || d.el.error) { d.track = track; d.file = this.urlOf(track); d.el.src = d.file; }
    try { d.el.currentTime = track.start || 0; } catch {}
    d.gain.gain.cancelScheduledValues?.(now); d.gain.gain.setValueAtTime(this.levelOf(track), now);
    const go = () => d.el.play?.()?.catch?.(() => {});
    if (wait) this.later(go, wait * 1000); else go();
    this.duck(now + wait, Math.max(1, (track.end || track.seconds || 6) - (track.start || 0)));
    this.emit({ kind: 'sting', at: now + wait, result: kind, strength: 1 });
    return true;
  }
}
