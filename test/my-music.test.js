// My music (owner, 2026-10-14: players "add their own songs"): song files kept on the player's
// device, played by the service worker from /my-music/<id>, measured and brought to the
// library's loudness, on the My music station and in Everything.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { ACCEPT, MAX_SONGS, MY_MUSIC_DB, MY_MUSIC_STORE, addSongs, cleanTitle, gainFor, isSongId, listSongs, loudnessOf, myMusicServed, newSongId, putSong, removeSong, renameSong, songTitle, songTrack, songType } from '../src/my-music.js';
import { VantaScore, tracksFor } from '../src/music.js';
import { STATIONS, checkTrack } from '../src/music-library.js';

// ---- A small IndexedDB: requests answer a moment later, and a transaction commits once its
// requests have answered and no new one follows (as a browser's does). ----
function fakeIndexedDB() {
  const dbs = new Map(), knobs = { putError: null };
  const later = fn => setTimeout(fn, 0);
  const clone = v => (v && typeof v === 'object' && !Array.isArray(v) ? { ...v } : v);
  return {
    dbs, knobs,
    open(name, version) {
      const r = { result: null, error: null };
      later(() => {
        let entry = dbs.get(name);
        const upgrade = !entry || entry.version < version;
        if (!entry) { entry = { version, stores: new Map() }; dbs.set(name, entry); }
        r.result = {
          objectStoreNames: { contains: n => entry.stores.has(n) },
          createObjectStore(n) { entry.stores.set(n, new Map()); return {}; },
          close() {},
          transaction(storeName, mode = 'readonly') {
            const rows = entry.stores.get(storeName);
            if (!rows) throw new Error('NotFoundError');
            let pending = 0, timer = null, over = false;
            const tx = { error: null, abort() { over = true; clearTimeout(timer); later(() => tx.onabort?.()); }, objectStore: () => store };
            const settle = () => { clearTimeout(timer); if (!pending && !over) timer = setTimeout(() => { over = true; tx.oncomplete?.(); }, 0); };
            const op = fn => {
              const q = { result: undefined, error: null }; pending++; clearTimeout(timer);
              later(() => { pending--; try { q.result = fn(); q.onsuccess?.(); } catch (e) { q.error = e; q.onerror?.(); tx.error = e; over = true; tx.onerror?.(); } settle(); });
              return q;
            };
            const write = () => { if (mode !== 'readwrite') throw new Error('ReadOnlyError'); };
            const store = {
              get: id => op(() => clone(rows.get(id))),
              getAll: () => op(() => [...rows.values()].map(clone)),
              put: v => op(() => { write(); if (knobs.putError) throw Object.assign(new Error('no room'), { name: knobs.putError }); rows.set(v.id, clone(v)); return v.id; }),
              delete: id => op(() => { write(); rows.delete(id); }),
            };
            settle();
            return tx;
          },
        };
        if (upgrade) { entry.version = version; r.onupgradeneeded?.(); }
        r.onsuccess?.();
      });
      return r;
    },
  };
}

test('my music: song files are known by their type or name, and named from the file', () => {
  assert.equal(songType('Ocean Drive.mp3', ''), 'audio/mpeg');
  assert.equal(songType('x.M4A', 'audio/x-m4a'), 'audio/mp4');
  assert.equal(songType('voice memo.m4a', 'video/mp4'), 'audio/mp4', 'phones label some m4a files as video');
  assert.equal(songType('take.wav', 'audio/wave'), 'audio/wav');
  assert.equal(songType('live.flac', ''), 'audio/flac');
  assert.equal(songType('track.opus', 'audio/ogg; codecs=opus'), 'audio/ogg');
  assert.equal(songType('notes.txt', 'text/plain'), '', 'not a song file');
  assert.equal(songType('cover.jpg', 'image/jpeg'), '');
  assert.ok(ACCEPT.startsWith('audio/*,') && ACCEPT.includes('.mp3') && ACCEPT.includes('.flac'));
  assert.equal(songTitle('01 - Ocean_Drive.mp3'), 'Ocean Drive', 'no track number, no underscores');
  assert.equal(songTitle('7 Rings.mp3'), '7 Rings', 'a number that is part of the name stays');
  assert.equal(songTitle('  Late   Night\tDrive .flac'), 'Late Night Drive');
  assert.equal(songTitle('.mp3'), 'Song');
  assert.equal(songTitle(`${'a'.repeat(120)}.mp3`).length, 80);
  assert.equal(cleanTitle('A\u0000B\nC'), 'A B C');
  assert.equal(newSongId(n => Uint8Array.from({ length: n }, (_, i) => i * 17)), 'mine-00112233');
  assert.ok(isSongId(newSongId()) && !isSongId('mine-xyz') && !isSongId('menus'));
});

test('my music: a song plays as a track of the My music station, from its own address', () => {
  const song = { id: 'mine-0a0b0c0d', title: ' Ocean  Drive ', type: 'audio/mpeg', seconds: 201.4, gain: -7.2, size: 4, blob: {} };
  assert.deepEqual(songTrack(song), { id: 'mine-0a0b0c0d', title: 'Ocean Drive', src: '/my-music/mine-0a0b0c0d', station: 'mine', kind: 'mine', type: 'audio/mpeg', seconds: 201.4, gain: -7.2 });
  assert.equal(songTrack({ ...song, gain: 30 }).gain, 4, 'never raised by more than 4 dB');
  assert.equal(songTrack({ ...song, title: '' }).title, 'Song');
  assert.equal(STATIONS.at(-1).id, 'mine'); assert.equal(STATIONS.at(-1).name, 'My music');
  // The library itself can never claim a track is one of yours.
  assert.equal(checkTrack({ id: 'x', title: 'X', file: 'x.m4a', station: 'mine', place: 'lobby' }), null);
});

// ---- Loudness, as ITU-R BS.1770 measures it ----
const sine = (hz, seconds, rate, amp = 1) => Float32Array.from({ length: Math.round(seconds * rate) }, (_, i) => amp * Math.sin(2 * Math.PI * hz * i / rate));
test('my music: loudness is measured as broadcasters do (BS.1770), at any sample rate', () => {
  // The standard's reference: a full-scale 997 Hz tone in one channel reads -3.01 LUFS.
  for (const rate of [48000, 44100, 22050]) {
    const { lufs, peak } = loudnessOf([sine(997, 5, rate)], rate);
    assert.ok(Math.abs(lufs + 3.01) < 0.05, `${rate} Hz: ${lufs}`); assert.ok(peak > 0.999 && peak <= 1);
  }
  assert.ok(Math.abs(loudnessOf([sine(997, 5, 48000), sine(997, 5, 48000)], 48000).lufs) < 0.05, 'the same tone in both channels: 0 LUFS');
  assert.ok(Math.abs(loudnessOf([sine(997, 5, 48000, 0.1)], 48000).lufs + 23.01) < 0.05, '20 dB down');
  // Silence between the music does not make it quieter (the gate), and silence is not measured.
  const half = sine(997, 10, 22050, 0.1), withSilence = new Float32Array(half.length * 2); withSilence.set(half);
  assert.ok(Math.abs(loudnessOf([withSilence], 22050).lufs + 23.01) < 0.1);
  assert.equal(loudnessOf([new Float32Array(22050 * 3)], 22050).lufs, -Infinity);
  assert.equal(loudnessOf([new Float32Array(100)], 22050).lufs, -Infinity, 'too short to measure');
  // The gain to the library's -16 LUFS: down as far as needed, up by at most 4 dB.
  assert.equal(gainFor(-9.5), -6.5); assert.equal(gainFor(-16), 0); assert.equal(gainFor(-30), 4); assert.equal(gainFor(-Infinity), 0);
});

test('my music: songs are kept on the device: added (checked and measured), listed, renamed, removed and put back', async () => {
  const idb = fakeIndexedDB();
  const measure = async file => { if (file.name.startsWith('broken')) throw new Error('cannot decode'); return { seconds: 200, gain: -6 }; };
  let n = 0; const id = () => `mine-0000000${n++}`;
  const files = [
    { name: '01 - Ocean_Drive.mp3', type: 'audio/mpeg', size: 1000 },
    { name: 'notes.txt', type: 'text/plain', size: 10 },
    { name: 'huge.wav', type: 'audio/wav', size: 81 * 1024 * 1024 },
    { name: 'broken.mp3', type: 'audio/mpeg', size: 5 },
    { name: 'empty.mp3', type: 'audio/mpeg', size: 0 },
    { name: 'Night Swim.m4a', type: '', size: 2000 },
  ];
  const { added, skipped } = await addSongs(files, { idb, measure, id, now: () => 1000 });
  assert.deepEqual(added.map(s => [s.id, s.title, s.type, s.size, s.seconds, s.gain]), [['mine-00000000', 'Ocean Drive', 'audio/mpeg', 1000, 200, -6], ['mine-00000001', 'Night Swim', 'audio/mp4', 2000, 200, -6]]);
  assert.ok(added.every(s => !('blob' in s)), 'the list carries no files');
  assert.deepEqual(skipped, [{ name: 'notes.txt', why: 'type' }, { name: 'huge.wav', why: 'size' }, { name: 'broken.mp3', why: 'decode' }, { name: 'empty.mp3', why: 'size' }]);
  const stored = idb.dbs.get(MY_MUSIC_DB).stores.get(MY_MUSIC_STORE);
  assert.equal(stored.get('mine-00000000').blob, files[0], 'the file itself is kept, on the device');
  assert.deepEqual((await listSongs(idb)).map(s => s.title), ['Ocean Drive', 'Night Swim'], 'oldest first');
  // Full, or no room left on the device.
  assert.deepEqual((await addSongs([files[0]], { idb, measure, id, have: MAX_SONGS })).skipped, [{ name: '01 - Ocean_Drive.mp3', why: 'full' }]);
  idb.knobs.putError = 'QuotaExceededError';
  assert.deepEqual((await addSongs([files[0]], { idb, measure, id })).skipped, [{ name: '01 - Ocean_Drive.mp3', why: 'space' }]);
  idb.knobs.putError = 'UnknownError';
  assert.deepEqual((await addSongs([files[0]], { idb, measure, id })).skipped, [{ name: '01 - Ocean_Drive.mp3', why: 'store' }], 'the browser would not keep it');
  idb.knobs.putError = null;
  // Renamed, removed, and put back (Undo).
  assert.equal((await renameSong('mine-00000001', '  Night  Swim (live) ', idb)).title, 'Night Swim (live)');
  assert.equal(await renameSong('mine-00000001', '   ', idb), null, 'a blank name is not a name');
  assert.equal(await renameSong('mine-99999999', 'X', idb), null);
  const gone = await removeSong('mine-00000000', idb);
  assert.equal(gone.blob, files[0]); assert.deepEqual((await listSongs(idb)).map(s => s.id), ['mine-00000001']);
  assert.equal(await removeSong('mine-00000000', idb), null);
  await putSong(gone, idb);
  assert.deepEqual((await listSongs(idb)).map(s => s.title), ['Ocean Drive', 'Night Swim (live)']);
});

test('my music: the My music station plays your songs; Everything mixes them in; Follows the game does not', () => {
  const lib = [
    { id: 'menus', title: 'Menus', file: 'menus.mp3', station: 'cinematic', place: 'lobby' },
    { id: 'calm', title: 'Calm', file: 'calm.mp3', station: 'cinematic', place: 'game', part: 'calm' },
  ];
  const mine = songTrack({ id: 'mine-0a0b0c0d', title: 'Ocean Drive', type: 'audio/mpeg' }), all = [...lib, mine];
  assert.deepEqual(tracksFor(all, { station: 'mine' }).map(t => t.id), ['mine-0a0b0c0d']);
  assert.deepEqual(tracksFor(lib, { station: 'mine', place: 'lobby' }).map(t => t.id), ['menus'], 'no songs yet: it follows the game');
  assert.ok(tracksFor(all, { station: 'mix' }).some(t => t.id === mine.id), 'Everything');
  assert.ok(!tracksFor(all, { station: 'on', place: 'lobby' }).some(t => t.id === mine.id) && !tracksFor(all, { station: 'on', place: 'game' }).some(t => t.id === mine.id), 'the game keeps its own music');
  assert.deepEqual(tracksFor(all, { station: 'liked', likes: { liked: [mine.id] } }).map(t => t.id), [mine.id], 'a liked song is on Liked');
});

// ---- The player, with a browser's audio faked ----
class Param { constructor() { this.value = 0; this.events = []; } setValueAtTime(v, t) { this.events.push(['set', v, t]); } linearRampToValueAtTime(v, t) { this.events.push(['linear', v, t]); } setTargetAtTime(v, t) { this.events.push(['target', v, t]); } setValueCurveAtTime(values, t, len) { this.events.push(['curve', [...values], t, len]); } cancelScheduledValues() {} }
class Node { constructor(ctx) { this.ctx = ctx; this.gain = new Param(); this.frequency = new Param(); this.Q = new Param(); } connect(n) { return n; } }
class Context {
  constructor() { this.currentTime = 1; this.state = 'running'; this.sampleRate = 8000; this.destination = {}; }
  createGain() { return new Node(this); } createBiquadFilter() { return new Node(this); } createMediaElementSource() { return new Node(this); }
  createAnalyser() { const a = new Node(this); a.frequencyBinCount = 64; a.getByteFrequencyData = d => d.fill(0); return a; } resume() {}
}
class Audio {
  constructor() { this.src = ''; this.paused = true; this.currentTime = 0; this.duration = NaN; this.error = null; }
  play() { this.paused = false; return Promise.resolve(); } pause() { this.paused = true; } load() {} addEventListener() {}
  canPlayType(type) { return /mpeg|mp4/.test(type) ? 'probably' : ''; }
}
const curve = param => param.events.filter(e => e[0] === 'curve').at(-1);
test('my music: the player plays a song from its own address, at its measured level, and hands over without overlapping', () => {
  const later = [], lib = [{ id: 'menus', title: 'Menus', file: 'menus.mp3', station: 'cinematic', place: 'lobby' }];
  const mine = songTrack({ id: 'mine-0a0b0c0d', title: 'Ocean Drive', type: 'audio/mpeg', gain: -6 }), flac = songTrack({ id: 'mine-0e0e0e0e', title: 'Lossless', type: 'audio/flac' });
  const score = new VantaScore({ AudioContextClass: Context, AudioElement: Audio, timers: { setInterval: () => 1, clearInterval() {}, setTimeout: fn => later.push(fn) }, tracks: [...lib, mine, flac], base: '/m/', random: () => 0, clock: () => 0 });
  assert.ok(!score.tracks.includes(flac) && score.tracks.includes(mine), 'a song this browser cannot play is left out');
  assert.equal(score.start(), true);
  const [first] = score.decks; assert.equal(first.el.src, '/m/menus.mp3');
  // Choosing My music: the menus' music (no beat grid) fades away over a moment, then the song.
  score.setStation('mine');
  const second = score.active; assert.equal(second.el.src, '/my-music/mine-0a0b0c0d'); assert.equal(score.nowPlaying.title, 'Ocean Drive');
  const out = curve(first.gain.gain), into = curve(second.gain.gain);
  assert.ok(Math.abs(out[3] - 0.8) < 0.01, `the old one fades out over a moment (${out[3]} s)`); assert.ok(out[2] + out[3] <= into[2] + 1e-9, 'and is gone before the song starts');
  assert.ok(Math.abs(into[1].at(-1) - 10 ** (-6 / 20)) < 1e-6, 'at its measured level');
  // Renamed while it plays: the new name shows, the song carries on.
  score.setTracks([...lib, { ...mine, title: 'Ocean Drive (live)' }]);
  assert.equal(score.active, second); assert.equal(score.nowPlaying.title, 'Ocean Drive (live)');
  // Removed while it plays: the station has nothing left, so the music follows the game again.
  score.setTracks(lib); assert.equal(score.nowPlaying.id, 'menus');
});

// ---- The service worker serves your songs from the device ----
function worker(idb) {
  const handlers = {}, calls = [];
  const self = { addEventListener: (type, fn) => { handlers[type] = fn; }, location: { origin: 'https://vchess.test' }, skipWaiting: async () => { calls.push('skipWaiting'); }, clients: { claim: async () => { calls.push('claim'); } }, registration: {} };
  const cache = { addAll: async () => {}, add: async () => {}, put: async () => {} };
  const caches = { open: async () => cache, keys: async () => ['vanta-shell-v2'], delete: async () => true, match: async () => undefined };
  vm.runInNewContext(readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8'), { self, indexedDB: idb, caches, fetch: async () => new Response('from the network'), Response, Request, Headers, Blob, URL, setTimeout, clearTimeout, console });
  const ask = async (url, init = {}) => { let answer = null; handlers.fetch({ request: new Request(url, init), respondWith: p => { answer = p; } }); return answer && await answer; };
  return { handlers, calls, ask };
}
test('my music: the service worker plays your songs from the device, a slice at a time', async () => {
  const src = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
  assert.ok(src.includes(`MY_MUSIC_DB = '${MY_MUSIC_DB}'`) && src.includes(`MY_MUSIC_STORE = '${MY_MUSIC_STORE}'`), 'the worker opens the same database as the page');
  const idb = fakeIndexedDB(), bytes = Uint8Array.from({ length: 100 }, (_, i) => i);
  await putSong({ id: 'mine-0a0b0c0d', title: 'Ocean Drive', type: 'audio/mpeg', size: 100, added: 1, blob: new Blob([bytes], { type: 'audio/mpeg' }) }, idb);
  const { handlers, calls, ask } = worker(idb), at = path => `https://vchess.test/my-music/${path}`;
  const ping = await ask(at('ping'));
  assert.equal(ping.status, 204); assert.equal(ping.headers.get('x-vch-my-music'), '1');
  const whole = await ask(at('mine-0a0b0c0d'));
  assert.equal(whole.status, 200); assert.equal(whole.headers.get('content-type'), 'audio/mpeg'); assert.equal(whole.headers.get('accept-ranges'), 'bytes');
  assert.equal(whole.headers.get('content-length'), '100'); assert.equal(whole.headers.get('cache-control'), 'no-store');
  assert.deepEqual([...new Uint8Array(await whole.arrayBuffer())], [...bytes]);
  const slice = async (range, status, contentRange, first, count) => {
    const r = await ask(at('mine-0a0b0c0d'), { headers: { range } });
    assert.equal(r.status, status, range); assert.equal(r.headers.get('content-range'), contentRange, range);
    if (status === 206) { const got = [...new Uint8Array(await r.arrayBuffer())]; assert.deepEqual(got, [...bytes.slice(first, first + count)], range); assert.equal(r.headers.get('content-length'), String(count)); }
  };
  await slice('bytes=10-19', 206, 'bytes 10-19/100', 10, 10);
  await slice('bytes=0-1', 206, 'bytes 0-1/100', 0, 2); // Safari asks for two bytes first
  await slice('bytes=90-', 206, 'bytes 90-99/100', 90, 10);
  await slice('bytes=95-500', 206, 'bytes 95-99/100', 95, 5);
  await slice('bytes=-5', 206, 'bytes 95-99/100', 95, 5);
  await slice('bytes=100-', 416, 'bytes */100');
  await slice('bytes=20-10', 416, 'bytes */100');
  assert.equal((await ask(at('mine-ffffffff'))).status, 404, 'a song that is not there');
  // Only same-site GETs of a song's own address: anything else goes on as before.
  assert.equal(await (await ask(at('mine-0A0B0C0D'))).text(), 'from the network');
  assert.equal(await (await ask(at('../mine-0a0b0c0d'))).text(), 'from the network');
  assert.equal(await ask('https://elsewhere.test/my-music/mine-0a0b0c0d'), null);
  assert.equal(await ask(at('mine-0a0b0c0d'), { method: 'POST', body: 'x' }), null);
  // A new worker takes over at once, so a page open from before My music can play your songs.
  let installed = null, activated = null;
  handlers.install({ waitUntil: p => { installed = p; } }); await installed;
  handlers.activate({ waitUntil: p => { activated = p; } }); await activated;
  assert.deepEqual(calls, ['skipWaiting', 'claim']);
});

test('my music: the page checks that its service worker plays your songs, and waits for a new one', async () => {
  const pinged = (ok = true) => async () => ({ status: ok ? 204 : 404, headers: { get: k => (ok && k === 'x-vch-my-music' ? '1' : null) } });
  assert.equal(await myMusicServed({ nav: {} }), false, 'no service worker: no My music');
  assert.equal(await myMusicServed({ nav: { serviceWorker: { controller: {} } }, fetchFn: pinged() }), true);
  // An old worker (before My music) is in control: the page asks for the new one and waits for it.
  const listeners = {}, sw = { controller: {}, addEventListener: (type, fn) => { listeners[type] = fn; }, register: async () => ({ update: async () => { setTimeout(() => { ok = true; listeners.controllerchange?.(); }, 5); } }) };
  let ok = false;
  assert.equal(await myMusicServed({ nav: { serviceWorker: sw }, fetchFn: async (...a) => pinged(ok)(...a), timeout: 1000 }), true);
  // No worker takes control in time: no My music (yet).
  const idle = { controller: null, addEventListener() {}, register: async () => ({ update: async () => {} }) };
  assert.equal(await myMusicServed({ nav: { serviceWorker: idle }, fetchFn: pinged(), timeout: 20 }), false);
});

test('my music speaks every language, and file names stay as they are', async () => {
  const { LANGUAGES, loadLanguage, translateText } = await import('../src/i18n.js');
  const codes = Object.keys(LANGUAGES).filter(c => c !== 'en');
  await Promise.all(codes.map(loadLanguage));
  const texts = ['My music', 'Add songs', 'Play My music', 'Rename', 'Song title', 'Removed', 'No songs yet', 'Add your songs in the Music list', 'Not enough space on this device',
    "This browser can't play your own songs here", 'Saved. Reload the page to play your songs', 'Songs you add stay on this device: nothing is uploaded. They play on the My music station and in Everything.',
    'Adding 3 songs', 'Adding 1 song', 'Added 1 song', 'Added 12 songs', '3 songs · 24 MB on this device', '1 song · 4.2 MB on this device', 'notes.txt: not a song file',
    'huge.wav is over 80 MB', 'My music is full (300 songs)', "broken.mp3: this browser can't play it", "Ocean Drive.mp3: couldn't be saved on this device", 'Added 2 songs · notes.txt: not a song file'];
  for (const code of codes) for (const s of texts) { const out = translateText(s, code); assert.ok(out && out !== s, `${code}: ${s}`); }
  for (const code of codes) assert.ok(translateText('Late_Night v2.flac: not a song file', code).includes('Late_Night v2.flac'), `${code}: the file's name`);
  assert.equal(translateText('3 songs · 24 MB on this device', 'fr'), '3 chanson(s) · 24 Mo sur cet appareil');
  assert.equal(translateText('Added 2 songs · notes.txt: not a song file', 'de'), '2 Song(s) hinzugefügt · notes.txt: keine Musikdatei');
});
