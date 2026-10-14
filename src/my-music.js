// My music (owner, 2026-10-14: players "add their own songs"): song files a player adds from
// their own device. They stay on that device, in the browser's own storage (IndexedDB), and are
// never uploaded. The service worker (public/sw.js) plays them from /my-music/<id>, the app's own
// origin, so the page's strict Content-Security-Policy needs no blob: media. The My music station
// plays them (each to its end, like an album), Everything mixes them in, and a liked one plays
// on the Liked station too. Each song's loudness is measured when it is added (ITU-R BS.1770, as
// the library's was) and brought to the library's, so your own songs are no louder than the rest.

export const MY_MUSIC_DB = 'vch-my-music'; // public/sw.js opens the same database
export const MY_MUSIC_STORE = 'songs';
export const MY_MUSIC_PATH = '/my-music/';
export const MY_MUSIC_STATION = 'mine';
export const MAX_SONG_MB = 80;
export const MAX_SONGS = 300;
export const TARGET_LUFS = -16; // the library's loudness

const EXT_TYPES = { mp3: 'audio/mpeg', m4a: 'audio/mp4', mp4: 'audio/mp4', aac: 'audio/aac', ogg: 'audio/ogg', oga: 'audio/ogg', opus: 'audio/ogg', webm: 'audio/webm', wav: 'audio/wav', flac: 'audio/flac' };
const TYPE_ALIASES = { 'audio/mp3': 'audio/mpeg', 'audio/x-mp3': 'audio/mpeg', 'audio/mpeg3': 'audio/mpeg', 'audio/x-m4a': 'audio/mp4', 'audio/m4a': 'audio/mp4', 'audio/x-wav': 'audio/wav', 'audio/wave': 'audio/wav', 'audio/vnd.wave': 'audio/wav', 'audio/x-flac': 'audio/flac', 'audio/x-aac': 'audio/aac', 'audio/opus': 'audio/ogg', 'video/mp4': 'audio/mp4', 'video/webm': 'audio/webm', 'application/ogg': 'audio/ogg' };
const TYPES = new Set(Object.values(EXT_TYPES));
// What the file picker offers.
export const ACCEPT = ['audio/*', ...Object.keys(EXT_TYPES).map(e => `.${e}`)].join(',');

// A song file's audio type, normalised ('' when it is not a song file the app can play).
export function songType(name = '', type = '') {
  const t = String(type || '').toLowerCase().split(';')[0].trim();
  const ext = /\.([a-z0-9]{2,4})$/i.exec(String(name))?.[1]?.toLowerCase();
  return TYPE_ALIASES[t] || (TYPES.has(t) ? t : '') || (ext && EXT_TYPES[ext]) || '';
}
export const cleanTitle = s => String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
// A song's title from its file name: no extension, no leading track number, underscores as spaces.
export function songTitle(name = '') {
  const base = cleanTitle(String(name).replace(/\.[a-z0-9]{2,4}$/i, '').replace(/_+/g, ' '));
  return cleanTitle(base.replace(/^\d{1,3}\s*[-.)]\s*(?=\S)/, '')) || base || 'Song';
}
export const isSongId = id => typeof id === 'string' && /^mine-[a-f0-9]{8}$/.test(id);
export function newSongId(random = n => globalThis.crypto.getRandomValues(new Uint8Array(n))) {
  return `mine-${[...random(4)].map(b => b.toString(16).padStart(2, '0')).join('')}`;
}
// A song as the music player plays it (src/music.js plays `src` when a track has one).
export function songTrack(song) {
  const track = { id: song.id, title: cleanTitle(song.title) || 'Song', src: `${MY_MUSIC_PATH}${song.id}`, station: MY_MUSIC_STATION, kind: 'mine' };
  if (song.type) track.type = song.type;
  if (Number.isFinite(song.seconds) && song.seconds > 0) track.seconds = song.seconds;
  if (Number.isFinite(song.gain)) track.gain = Math.max(-24, Math.min(4, song.gain));
  return track;
}

// ---- Loudness (ITU-R BS.1770-4: K-weighting, 400 ms blocks overlapping by 75%, gated at
// -70 LUFS and 10 LU under the level of the blocks above that) ----
// The two K-weighting filters (a high shelf, then a high pass) for any sample rate.
export function kWeighting(rate) {
  let f0 = 1681.974450955533, Q = 0.7071752369554196, K = Math.tan(Math.PI * f0 / rate);
  const Vh = 10 ** (3.999843853973347 / 20), Vb = Vh ** 0.4996667741545416, a0 = 1 + K / Q + K * K;
  const shelf = { b: [(Vh + Vb * K / Q + K * K) / a0, 2 * (K * K - Vh) / a0, (Vh - Vb * K / Q + K * K) / a0], a: [2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0] };
  f0 = 38.13547087602444; Q = 0.5003270373238773; K = Math.tan(Math.PI * f0 / rate);
  const d = 1 + K / Q + K * K;
  return [shelf, { b: [1, -2, 1], a: [2 * (K * K - 1) / d, (1 - K / Q + K * K) / d] }];
}
// Integrated loudness (LUFS) and sample peak of up to two channels of samples at `rate`.
export function loudnessOf(channels, rate) {
  const [s, p] = kWeighting(rate), seg = Math.max(1, Math.round(rate / 10)), n = channels[0]?.length || 0, segs = Math.floor(n / seg);
  let peak = 0;
  if (segs < 4) return { lufs: -Infinity, peak };
  const power = new Float64Array(segs); // the K-weighted energy of each 100 ms, summed over the channels
  for (const x of channels.slice(0, 2)) {
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0, w1 = 0, w2 = 0;
    for (let k = 0; k < segs; k++) {
      let sum = 0;
      for (let i = k * seg, end = i + seg; i < end; i++) {
        const v = x[i], a = v < 0 ? -v : v; if (a > peak) peak = a;
        const y = s.b[0] * v + s.b[1] * x1 + s.b[2] * x2 - s.a[0] * y1 - s.a[1] * y2; x2 = x1; x1 = v;
        const w = y - 2 * y1 + y2 - p.a[0] * w1 - p.a[1] * w2; y2 = y1; y1 = y; w2 = w1; w1 = w;
        sum += w * w;
      }
      power[k] += sum;
    }
  }
  const lufs = z => -0.691 + 10 * Math.log10(z), mean = a => a.reduce((t, v) => t + v, 0) / a.length;
  const blocks = [];
  for (let k = 0; k + 4 <= segs; k++) blocks.push((power[k] + power[k + 1] + power[k + 2] + power[k + 3]) / (4 * seg));
  const loud = blocks.filter(z => z > 0 && lufs(z) > -70);
  if (!loud.length) return { lufs: -Infinity, peak };
  const gate = lufs(mean(loud)) - 10, kept = loud.filter(z => lufs(z) > gate);
  return { lufs: lufs(mean(kept.length ? kept : loud)), peak };
}
// The gain (dB) that brings a song to the library's loudness: a quiet recording is raised by at
// most 4 dB (it stays a little quiet rather than distorting); silence is left alone.
export function gainFor(lufs) {
  if (!Number.isFinite(lufs)) return 0;
  return Math.round(Math.max(-24, Math.min(4, TARGET_LUFS - lufs)) * 10) / 10;
}
// A song file's length (seconds) and gain, measured in the browser. Rejects when the browser
// cannot decode it (its music player could not play it either).
export async function measureSong(blob, { OfflineContext = globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext } = {}) {
  if (!OfflineContext) return { seconds: null, gain: 0, lufs: null };
  const data = await blob.arrayBuffer();
  let buffer = null, failure = null;
  for (const rate of [22050, 44100]) { // a low rate is plenty to measure, and decodes into less memory
    try {
      const ctx = new OfflineContext(1, 1, rate);
      buffer = await new Promise((resolve, reject) => { const r = ctx.decodeAudioData(data.slice(0), resolve, reject); r?.then?.(resolve, reject); });
      break;
    } catch (e) { failure = e; }
  }
  if (!buffer) throw failure || new Error('cannot decode');
  const channels = [];
  for (let c = 0; c < Math.min(2, buffer.numberOfChannels); c++) channels.push(buffer.getChannelData(c));
  const { lufs } = loudnessOf(channels, buffer.sampleRate);
  return { seconds: Math.round(buffer.duration * 10) / 10, gain: gainFor(lufs), lufs: Number.isFinite(lufs) ? Math.round(lufs * 10) / 10 : null };
}

// ---- The songs, in IndexedDB: {id, title, type, size, added, seconds, gain, blob} ----
const request = r => new Promise((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
const finished = tx => new Promise((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error || new Error('aborted')); });
export function openSongs(idb = globalThis.indexedDB) {
  return new Promise((resolve, reject) => {
    if (!idb) { reject(new Error('no storage')); return; }
    const r = idb.open(MY_MUSIC_DB, 1);
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(MY_MUSIC_STORE)) r.result.createObjectStore(MY_MUSIC_STORE, { keyPath: 'id' }); };
    r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); r.onblocked = () => reject(new Error('blocked'));
  });
}
async function withSongs(mode, work, idb) {
  const db = await openSongs(idb);
  try {
    const tx = db.transaction(MY_MUSIC_STORE, mode), done = finished(tx);
    done.catch(() => {}); // (awaited below, unless the work fails first)
    const out = await work(tx.objectStore(MY_MUSIC_STORE)).catch(e => { try { tx.abort(); } catch {} throw e; });
    await done; return out;
  } finally { db.close(); }
}
const metaOf = ({ blob, ...meta }) => ({ ...meta, size: blob?.size ?? meta.size ?? 0 });
// Your songs, oldest first, without their files.
export async function listSongs(idb) {
  const all = await withSongs('readonly', store => request(store.getAll()), idb);
  return all.filter(s => isSongId(s?.id)).map(metaOf).sort((a, b) => (a.added || 0) - (b.added || 0));
}
export const putSong = (song, idb) => withSongs('readwrite', store => request(store.put(song)), idb);
export async function renameSong(id, title, idb) {
  const name = cleanTitle(title); if (!name) return null;
  return withSongs('readwrite', async store => { const song = await request(store.get(id)); if (!song) return null; song.title = name; await request(store.put(song)); return metaOf(song); }, idb);
}
// Removes a song; returns it (with its file) so it can be put back.
export const removeSong = (id, idb) => withSongs('readwrite', async store => { const song = await request(store.get(id)); if (song) await request(store.delete(id)); return song || null; }, idb);

// Adds song files. Each is checked (a song file, not too big, room for it) and measured first;
// `added` are the new songs, `skipped` the files left out ({name, why: 'type' | 'size' | 'full' |
// 'decode' | 'space' | 'store'}: not a song file, too big, My music full, not playable here, the
// device out of space, or the browser would not keep it).
export async function addSongs(files, { have = 0, measure = measureSong, idb, now = () => Date.now(), id = newSongId } = {}) {
  const added = [], skipped = [];
  for (const file of Array.from(files || [])) {
    const name = String(file?.name || ''), type = songType(name, file?.type);
    if (!type) { skipped.push({ name, why: 'type' }); continue; }
    if (!(file.size > 0) || file.size > MAX_SONG_MB * 1024 * 1024) { skipped.push({ name, why: 'size' }); continue; }
    if (have + added.length >= MAX_SONGS) { skipped.push({ name, why: 'full' }); continue; }
    let measured;
    try { measured = await measure(file); } catch { skipped.push({ name, why: 'decode' }); continue; }
    const song = { id: id(), title: songTitle(name), type, size: file.size, added: now() + added.length, seconds: measured.seconds ?? null, gain: measured.gain ?? 0, blob: file };
    try { await putSong(song, idb); } catch (e) { skipped.push({ name, why: e?.name === 'QuotaExceededError' ? 'space' : 'store' }); continue; }
    added.push(metaOf(song));
  }
  return { added, skipped };
}

// Whether this page's service worker plays My music: it must control the page and know the
// /my-music/ route. A worker from before My music is updated (it takes over at once), and a
// first visit waits for the worker to take control.
export async function myMusicServed({ nav = globalThis.navigator, fetchFn = globalThis.fetch, timeout = 10000 } = {}) {
  const sw = nav?.serviceWorker;
  if (!sw || !fetchFn) return false;
  const served = async () => {
    if (!sw.controller) return false;
    try { const r = await fetchFn(`${MY_MUSIC_PATH}ping`, { cache: 'no-store' }); return r.status === 204 && r.headers.get('x-vch-my-music') === '1'; }
    catch { return false; }
  };
  if (await served()) return true;
  try {
    const changed = new Promise(resolve => { sw.addEventListener?.('controllerchange', resolve, { once: true }); setTimeout(resolve, timeout); });
    const reg = await sw.register('/sw.js');
    reg?.update?.()?.catch?.(() => {}); // a worker from before My music: fetch the new one
    if (!sw.controller) reg?.active?.postMessage?.('claim'); // the page opened without its worker (a hard reload)
    await changed;
    return await served();
  } catch { return false; }
}
