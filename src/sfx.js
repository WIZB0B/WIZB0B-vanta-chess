// VCH's sound effects (owner, 2026-10-13: "When you go to a next menu page, a sound must play.
// When you do anything, sound must play ... for the pawns, for the king, even for future legend
// skins"). Recorded sounds, cut from packs made with Lyria 3.5 in Google Flow Music:
// public/assets/vch/sfx/sfx.json lists the sets and their files beside it.
//   ui       the interface: a tap, a page forward and back, a dialog opening and closing, a switch,
//            a message, an error, a success, a match found, a warning, a game's start and end;
//   wood     the pieces (the default set): each piece its own knock, a capture, castling, a
//            promotion, a check, a mate and an illegal try;
//   crystal, tidal, gilded, ember: the same moments for the relic sets' pieces.
// A sound loads (and decodes) the first time it is wanted; until then, or in a browser that
// cannot decode it, the caller plays its own synthesized sound instead (play() returns false).
export const SFX_BASE = '/assets/vch/sfx/';
export const SFX_URL = `${SFX_BASE}sfx.json`;
export const UI_SOUNDS = ['tap', 'page', 'back', 'open', 'close', 'toggle-on', 'toggle-off', 'notify', 'error', 'success', 'match', 'warning', 'start', 'win', 'lose', 'draw', 'tick'];
export const PIECE_SOUNDS = ['pawn', 'knight', 'bishop', 'rook', 'queen', 'king', 'capture', 'castle', 'promote', 'check', 'mate', 'illegal'];
export const PIECE_SETS = ['wood', 'crystal', 'tidal', 'gilded', 'ember'];
// The piece sounds a relic set brings, for "Match my relic set" (src/relics.js ids).
export const SET_FOR_RELIC = { ember: 'ember', ashen: 'ember', rivalry: 'ember', tidal: 'tidal', umbra: 'tidal', mirror: 'crystal', court: 'crystal', oathbound: 'crystal', gilded: 'gilded', crown: 'gilded', paladin: 'gilded' };
const PIECE_NAME = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

// The sound of a move (a chess.js move, or {piece, captured, flags, promotion, san}): a mate, a
// check, a promotion, castling, a capture, or the piece that moved.
export function moveSoundName(move) {
  const san = String(move?.san || ''), flags = String(move?.flags || '');
  if (san.includes('#')) return 'mate';
  if (san.includes('+')) return 'check';
  if (move?.promotion || flags.includes('p') || san.includes('=')) return 'promote';
  if (flags.includes('k') || flags.includes('q') || /^O-O/.test(san)) return 'castle';
  if (move?.captured || flags.includes('c') || flags.includes('e') || san.includes('x')) return 'capture';
  return PIECE_NAME[move?.piece] || (/^[NBRQK]/.test(san) ? PIECE_NAME[san[0].toLowerCase()] : 'pawn');
}

// The manifest as the bank may use it: known sets and sounds only, files inside the sfx folder.
export function readManifest(json) {
  const sets = {};
  for (const [id, set] of Object.entries(json?.sets && typeof json.sets === 'object' ? json.sets : {})) {
    if (!/^[a-z]{1,20}$/.test(id) || !set || typeof set !== 'object') continue;
    const known = id === 'ui' ? UI_SOUNDS : PIECE_SOUNDS, sounds = {};
    for (const [name, s] of Object.entries(set.sounds && typeof set.sounds === 'object' ? set.sounds : {})) {
      if (!known.includes(name) || typeof s?.file !== 'string' || !/^[a-z]{1,20}\/[a-z-]{1,20}\.(m4a|mp3)$/.test(s.file)) continue;
      const gain = Number.isFinite(s.gain) && s.gain >= -24 && s.gain <= 12 ? s.gain : 0;
      sounds[name] = { file: s.file, gain };
    }
    if (Object.keys(sounds).length) sets[id] = { name: typeof set.name === 'string' && set.name.length <= 40 ? set.name : id, sounds };
  }
  return { sets };
}

// One sound per action (a tap that opens a page is heard as the page): the sounds asked for in
// the same moment are gathered, and the most telling one plays.
export const UI_PRIORITY = { tap: 1, tick: 1, 'toggle-on': 2, 'toggle-off': 2, page: 3, back: 3, open: 4, close: 4, notify: 5, warning: 6, error: 6, success: 6, match: 6, start: 7, win: 7, lose: 7, draw: 7 };
export function uiGate(play, { timers = globalThis } = {}) {
  let pending = null, timer = null;
  return kind => {
    if (!UI_PRIORITY[kind]) return;
    if (!pending || UI_PRIORITY[kind] >= UI_PRIORITY[pending]) pending = kind;
    if (timer) return;
    timer = timers.setTimeout(() => { const k = pending; pending = null; timer = null; if (k) play(k); }, 0);
  };
}

const dbToGain = db => 10 ** ((Number(db) || 0) / 20);
export class SoundBank {
  constructor({ context, fetch = (...a) => globalThis.fetch(...a), base = SFX_BASE, url = SFX_URL, random = Math.random, clock = () => globalThis.performance?.now?.() ?? Date.now() } = {}) {
    Object.assign(this, { context, fetchFn: fetch, base, url, random, clock });
    this.manifest = null; this.loading = null; this.pending = new Map(); this.decoded = new Map(); this.failed = new Set(); this.lastAt = new Map();
  }
  // The list of sets and sounds ({sets: {}} until it arrives, and if it never does).
  load() {
    if (!this.loading) this.loading = (async () => {
      try { const r = await this.fetchFn(this.url, { cache: 'no-cache' }); this.manifest = readManifest(r.ok ? await r.json() : null); }
      catch { this.manifest = { sets: {} }; }
      return this.manifest;
    })();
    return this.loading;
  }
  entry(set, name) { return this.manifest?.sets?.[set]?.sounds?.[name] || null; }
  has(set, name) { return !!this.entry(set, name) && !this.failed.has(`${set}/${name}`); }
  // Loads and decodes one sound (once); null when it cannot be had.
  buffer(set, name) {
    const key = `${set}/${name}`, e = this.entry(set, name);
    if (!e || this.failed.has(key)) return Promise.resolve(null);
    if (!this.pending.has(key)) {
      this.pending.set(key, (async () => {
        try {
          const ctx = this.context(), r = await this.fetchFn(this.base + e.file);
          if (!r.ok) throw new Error(`${r.status}`);
          const data = await r.arrayBuffer();
          // Older Safari only takes callbacks; the others return a promise too.
          const buf = await new Promise((resolve, reject) => { const p = ctx.decodeAudioData(data, resolve, reject); p?.then?.(resolve, reject); });
          this.decoded.set(key, buf);
          return buf;
        } catch { this.failed.add(key); return null; }
      })());
    }
    return this.pending.get(key);
  }
  // Loads a set's sounds ahead of time, one after another.
  async warm(set, names) {
    await this.load();
    for (const name of names || Object.keys(this.manifest.sets[set]?.sounds || {})) await this.buffer(set, name);
  }
  ready(set, name) { return this.decoded.has(`${set}/${name}`); }
  // Plays a sound now: {volume, place: [x, y, z] (heard there, HRTF) or null, vary: a slight
  // random change of pitch so repeated sounds are not identical}. Returns true when it plays
  // (false: not loaded yet, missing or undecodable, so the caller plays its own sound; it then
  // loads for next time).
  play(set, name, { volume = 0.5, place = null, vary = 0 } = {}) {
    const key = `${set}/${name}`, e = this.entry(set, name);
    if (!e || this.failed.has(key)) return false;
    const now = this.clock();
    if (now - (this.lastAt.get(key) ?? -1e9) < 30) return true; // the same sound twice at once: once
    const buf = this.decoded.get(key);
    if (!buf) { void this.buffer(set, name); return false; }
    this.lastAt.set(key, now);
    try {
      const ctx = this.context(), src = ctx.createBufferSource(), g = ctx.createGain();
      src.buffer = buf; if (vary) src.playbackRate.value = 1 + (this.random() * 2 - 1) * vary;
      g.gain.value = Math.max(0, volume) * dbToGain(e.gain);
      src.connect(g);
      let head = g;
      if (place && ctx.createPanner) {
        const pn = ctx.createPanner(); pn.panningModel = 'HRTF'; pn.distanceModel = 'inverse'; pn.refDistance = 1.2; pn.rolloffFactor = 0.5;
        const [x, y, z] = place;
        if (pn.positionX) { pn.positionX.value = x; pn.positionY.value = y; pn.positionZ.value = z; } else pn.setPosition?.(x, y, z);
        g.connect(pn); head = pn;
      }
      head.connect(ctx.destination);
      src.start(ctx.currentTime + 0.002);
      return true;
    } catch { return false; }
  }
}
