// The music library (owner, 2026-10-13: real music, made with Lyria 3.5 in Google Flow Music,
// instead of music synthesized in the browser). The tracks are data: public/assets/vch/music/
// library.json lists them and their files sit beside it, so new music needs no new code. The page
// loads the list the first time Music is on. Each track:
//   {id, title, file, station, place, part?, theme?, division?, kind?, skin?, lang?, key?,
//    seconds?, start?, end?, gain?, bpm?, beat?}
//   id        unique, lower-case letters, digits and dashes;
//   title     its name, shown under the Music setting while it plays;
//   file      its file's name in public/assets/vch/music/ (.m4a or .mp3);
//   station   the station that plays it: cinematic, focus, opera, electric or songs;
//   place     where "Follows the game" plays it (one place or a list): lobby (the menus), game,
//             focus (puzzles, lessons, study, analysis), boss (Campaign bosses), blitz (games of
//             three minutes or less, Blackout Blitz, the Arena), result (the screen after a
//             game), skin (a piece set being shown), or sting (a short cue over the music);
//   part      in a game: calm (the opening), tense (the middlegame), storm (your clock running
//             out), ahead or behind (the game going your way, or not); after a game: win, loss
//             or draw; a sting's moment: win, loss, draw, checkmate, start, rank-up, rank-down,
//             relic, realm, solved, failed, brilliant;
//   theme     the relic set or realm whose music it is (a game's three parts share one key and
//             one tempo, so one can hand over to the next on the beat);
//   division  the league division whose menus it plays in (bronze ... diamond; none: everyone);
//   kind      'song' for a song with vocals (the Songs station plays them, not the menus);
//   skin      the piece set it was made for;
//   lang      a song's language (ISO 639-1): the Songs station favours the player's own;
//   key       its key, measured ("D minor"): tracks in related keys may overlap as they change,
//             others hand over quickly so two keys never clash;
//   seconds   its length; start/end: where its sound begins and ends (silence trimmed), or the
//             section of a longer piece (a battle suite's calm, tense and storm parts share one
//             file);
//   gain      decibels that bring it to the library's loudness (-16 LUFS);
//   bpm/beat  its tempo and the time of its first downbeat: the player changes tracks on a bar
//             line, so the music never stumbles.
export const STATIONS = [
  { id: 'on', name: 'Follows the game' },
  { id: 'cinematic', name: 'Dark cinematic' },
  { id: 'focus', name: 'Focus' },
  { id: 'opera', name: 'Opera' },
  { id: 'electric', name: 'Electric' },
  { id: 'songs', name: 'Songs' },
  { id: 'mix', name: 'Everything' },
  { id: 'liked', name: 'Liked' },
];
export const MUSIC_BASE = '/assets/vch/music/';
export const LIBRARY_URL = `${MUSIC_BASE}library.json`;
export const PLACES = ['lobby', 'game', 'focus', 'boss', 'blitz', 'result', 'skin', 'sting'];
export const PARTS = ['calm', 'tense', 'storm', 'ahead', 'behind'];
export const RESULTS = ['win', 'loss', 'draw'];
export const STINGS = ['win', 'loss', 'draw', 'checkmate', 'start', 'rank-up', 'rank-down', 'relic', 'realm', 'solved', 'failed', 'brilliant'];
export const DIVISIONS = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
const STATION_IDS = new Set(STATIONS.map(s => s.id).filter(id => !['on', 'mix', 'liked'].includes(id)));
export const KEY_NAMES = /^(C|C#|Db|D|D#|Eb|E|F|F#|Gb|G|G#|Ab|A|A#|Bb|B) (major|minor)$/;

export const placesOf = t => (Array.isArray(t?.place) ? t.place : [t?.place]).filter(p => typeof p === 'string');
export const isSting = t => placesOf(t).includes('sting');
const num = (v, lo, hi) => (Number.isFinite(v) && v >= lo && v <= hi ? v : undefined);

// The track as the player may use it, or null. A file name never leaves the music folder.
export function checkTrack(t) {
  if (!t || typeof t !== 'object') return null;
  const places = placesOf(t);
  if (typeof t.id !== 'string' || !/^[a-z0-9-]{1,60}$/.test(t.id)) return null;
  if (typeof t.title !== 'string' || !t.title.trim() || t.title.length > 80) return null;
  if (typeof t.file !== 'string' || !/^[a-z0-9-]{1,80}\.(m4a|mp3)$/.test(t.file)) return null;
  if (!places.length || places.some(p => !PLACES.includes(p))) return null;
  if (isSting(t)) {
    if (places.length !== 1 || !STINGS.includes(t.part)) return null;
  } else {
    if (!STATION_IDS.has(t.station)) return null;
    if (t.part != null && !(places.includes('result') ? RESULTS : PARTS).includes(t.part)) return null;
  }
  if (t.theme != null && (typeof t.theme !== 'string' || !/^[a-z]{1,20}$/.test(t.theme))) return null;
  if (t.division != null && !DIVISIONS.includes(t.division)) return null;
  if (t.kind != null && t.kind !== 'song') return null;
  if (t.skin != null && (typeof t.skin !== 'string' || !/^[a-z]{1,20}$/.test(t.skin))) return null;
  if (t.lang != null && (typeof t.lang !== 'string' || !/^[a-z]{2}$/.test(t.lang))) return null;
  if (t.key != null && (typeof t.key !== 'string' || !KEY_NAMES.test(t.key))) return null;
  const out = { id: t.id, title: t.title.trim(), file: t.file, place: Array.isArray(t.place) ? places : places[0] };
  for (const k of ['station', 'part', 'theme', 'division', 'kind', 'skin', 'lang', 'key']) if (t[k] != null) out[k] = t[k];
  const seconds = num(t.seconds, 0.5, 900), start = num(t.start, 0, 900), end = num(t.end, 0.5, 900);
  if (seconds !== undefined) out.seconds = seconds;
  if (start !== undefined) out.start = start;
  if (end !== undefined && end > (start || 0) + 0.5) out.end = end;
  const gain = num(t.gain, -24, 12), bpm = num(t.bpm, 40, 220), beat = num(t.beat, 0, 60);
  if (gain !== undefined) out.gain = gain;
  if (bpm !== undefined) { out.bpm = bpm; if (beat !== undefined) out.beat = beat; }
  return out;
}
export function readLibrary(json) {
  const seen = new Set(), tracks = [];
  for (const raw of Array.isArray(json?.tracks) ? json.tracks : []) {
    const t = checkTrack(raw);
    if (t && !seen.has(t.id)) { seen.add(t.id); tracks.push(t); }
  }
  return tracks;
}
// The library's tracks ([] when it cannot be read: the music simply waits).
export async function loadLibrary(fetchFn = globalThis.fetch, url = LIBRARY_URL) {
  try {
    const response = await fetchFn(url, { cache: 'no-cache' });
    return response.ok ? readLibrary(await response.json()) : [];
  } catch { return []; }
}
