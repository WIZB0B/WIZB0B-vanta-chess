// The music library (owner, 2026-10-13: real music, made with Lyria 3.5, instead of music
// synthesized in the browser). The tracks are data: public/assets/vch/music/library.json lists
// them and their files sit beside it, so new music needs no new code. The page loads the list the
// first time Music is on. Each track:
//   {id, title, file, station, place, part?, theme?, seconds?}
//   id       unique, lower-case letters, digits and dashes;
//   title    its name, shown under the Music setting while it plays;
//   file     its file's name in public/assets/vch/music/ (.mp3, which every browser plays);
//   station  the station that plays it: cinematic, focus, opera, electric or songs;
//   place    where "Follows the game" plays it (one place or a list): lobby (the menus), game,
//            focus (puzzles, lessons, study, analysis), boss (Campaign bosses), blitz (games of
//            three minutes or less, Blackout Blitz), or sting (the end of a game, no station);
//   part     in a game: calm, tense or storm (your clock running out); a sting's: win, loss, draw;
//   theme    the relic set or realm it was made for (none: it suits every theme);
//   seconds  a sting's length: how long the music steps back for it.
export const STATIONS = [
  { id: 'on', name: 'Follows the game' },
  { id: 'cinematic', name: 'Dark cinematic' },
  { id: 'focus', name: 'Focus' },
  { id: 'opera', name: 'Opera' },
  { id: 'electric', name: 'Electric' },
  { id: 'songs', name: 'Songs' },
];
export const MUSIC_BASE = '/assets/vch/music/';
export const LIBRARY_URL = `${MUSIC_BASE}library.json`;
export const PLACES = ['lobby', 'game', 'focus', 'boss', 'blitz', 'sting'];
export const PARTS = ['calm', 'tense', 'storm'];
export const RESULTS = ['win', 'loss', 'draw'];
const STATION_IDS = new Set(STATIONS.map(s => s.id).filter(id => id !== 'on'));

export const placesOf = t => (Array.isArray(t?.place) ? t.place : [t?.place]).filter(p => typeof p === 'string');
export const isSting = t => placesOf(t).includes('sting');

// The track as the player may use it, or null. A file name never leaves the music folder.
export function checkTrack(t) {
  if (!t || typeof t !== 'object') return null;
  const places = placesOf(t);
  if (typeof t.id !== 'string' || !/^[a-z0-9-]{1,60}$/.test(t.id)) return null;
  if (typeof t.title !== 'string' || !t.title.trim() || t.title.length > 80) return null;
  if (typeof t.file !== 'string' || !/^[a-z0-9-]{1,80}\.mp3$/.test(t.file)) return null;
  if (!places.length || places.some(p => !PLACES.includes(p))) return null;
  if (isSting(t)) {
    if (places.length !== 1 || !RESULTS.includes(t.part)) return null;
  } else {
    if (!STATION_IDS.has(t.station)) return null;
    if (t.part != null && !PARTS.includes(t.part)) return null;
  }
  if (t.theme != null && (typeof t.theme !== 'string' || !/^[a-z]{1,20}$/.test(t.theme))) return null;
  const out = { id: t.id, title: t.title.trim(), file: t.file, place: Array.isArray(t.place) ? places : places[0] };
  if (t.station) out.station = t.station;
  if (t.part) out.part = t.part;
  if (t.theme) out.theme = t.theme;
  if (Number.isFinite(t.seconds) && t.seconds > 0 && t.seconds < 60) out.seconds = t.seconds;
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
