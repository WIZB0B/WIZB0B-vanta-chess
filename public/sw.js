const CACHE = 'vanta-shell-v3';
// Offline play: the engine and the built app bundles are cached at install, so the
// computer opponent works with no connection.
const ENGINE = ['/stockfish.worker.js', '/engines/stockfish-19-lite-single.js', '/engines/stockfish-19-lite-single.wasm'];
async function appBundles() {
  try {
    const html = await (await fetch('/', { cache: 'no-cache' })).text();
    return [...new Set([...html.matchAll(/(?:src|href)="(\/assets\/[^"]+\.(?:js|css))"/g)].map(m => m[1]))];
  } catch { return []; }
}
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg', '/icon-192.png', '/icon-512.png', '/assets/vch/brand/vch-metal.svg', '/assets/vch/brand/vch-logo-light.svg', '/assets/vch/brand/brand-atmosphere.png', '/assets/vch/pieces/vanta-3d-1x.png', '/assets/vch/pieces/vanta-3d.png', '/assets/vch/wallpapers/wallpaper-emerald.webp', '/assets/vch/ui/hero-knight.webp', '/assets/vch/ui/opening-card.webp', '/assets/vch/ui/famous-card.webp', '/assets/vch/ui/review-card.webp', '/assets/vch/ui/practice-card.webp', '/assets/vch/ui/live-banner.webp'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(async cache => {
  await cache.addAll(SHELL);
  await Promise.all([...ENGINE, ...(await appBundles())].map(url => cache.add(url).catch(() => {})));
}).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))));
// A new worker takes over at once (skipWaiting above), so the pages an older one controlled have
// My music's route; a page the worker does not control yet (a first visit, a hard reload) asks to
// be taken over when it needs My music. (Not every page on activation: taking over a page in the
// middle of a game would cost it a frame.)
self.addEventListener('message', event => { if (event.data === 'claim') event.waitUntil(self.clients.claim()); });
// My music (src/my-music.js): the player's own song files, kept on this device in IndexedDB and
// never uploaded, play from /my-music/<id>: the app's own origin, so the page's strict CSP needs
// no blob: media. A range request gets the slice it asks for (206), so the player can seek.
const MY_MUSIC_DB = 'vch-my-music', MY_MUSIC_STORE = 'songs', MY_MUSIC_ROUTE = /^\/my-music\/(mine-[a-f0-9]{8}|ping)$/;
function readSong(id) {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(MY_MUSIC_DB, 1);
    open.onupgradeneeded = () => { if (!open.result.objectStoreNames.contains(MY_MUSIC_STORE)) open.result.createObjectStore(MY_MUSIC_STORE, { keyPath: 'id' }); };
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result, get = db.transaction(MY_MUSIC_STORE).objectStore(MY_MUSIC_STORE).get(id);
      get.onsuccess = () => { db.close(); resolve(get.result || null); };
      get.onerror = () => { db.close(); reject(get.error); };
    };
  });
}
async function mySong(id, range) {
  if (id === 'ping') return new Response(null, { status: 204, headers: { 'x-vch-my-music': '1', 'Cache-Control': 'no-store' } });
  let song = null;
  try { song = await readSong(id); } catch { song = null; }
  const blob = song && song.blob;
  if (!(blob instanceof Blob)) return new Response(null, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  const size = blob.size, type = String(song.type || blob.type || 'audio/mpeg');
  const headers = { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' };
  const m = /^bytes=(\d*)-(\d*)$/.exec(String(range || '').trim());
  if (!m || (!m[1] && !m[2])) return new Response(blob, { status: 200, headers: { ...headers, 'Content-Length': String(size) } });
  const start = m[1] ? Number(m[1]) : Math.max(0, size - Number(m[2])), end = m[1] && m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
  if (!(start < size) || start > end) return new Response(null, { status: 416, headers: { ...headers, 'Content-Range': `bytes */${size}` } });
  return new Response(blob.slice(start, end + 1, type), { status: 206, headers: { ...headers, 'Content-Length': String(end - start + 1), 'Content-Range': `bytes ${start}-${end}/${size}` } });
}
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const mine = event.request.method === 'GET' && url.origin === self.location.origin && MY_MUSIC_ROUTE.exec(url.pathname);
  if (mine) { event.respondWith(mySong(mine[1], event.request.headers.get('range'))); return; }
  // Music streams straight from the network (the browser asks for it in ranges, which a cache
  // cannot hold, and a whole library would fill it).
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/functions/') || url.pathname.startsWith('/api/') || url.pathname.startsWith('/assets/vch/music/')) return;
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok && !response.headers.get('set-cookie')) caches.open(CACHE).then(cache => cache.put(event.request, response.clone()));
    return response;
  }).catch(async () => (await caches.match(event.request, { ignoreVary: true, ignoreSearch: event.request.mode === 'navigate' })) || (event.request.mode === 'navigate' ? caches.match('/') : Response.error())));
});
// Web push: "your move" in daily games and new challenges. The game server sends a small
// JSON payload {title, body, url, tag}; only same-site paths are opened.
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = {}; }
  const title = String(data.title || 'VCH').slice(0, 80);
  const url = typeof data.url === 'string' && data.url.startsWith('/') && !data.url.startsWith('//') ? data.url : '/';
  event.waitUntil(self.registration.showNotification(title, { body: String(data.body || '').slice(0, 200), tag: String(data.tag || 'vch').slice(0, 64), icon: '/icon-192.png', badge: '/icon-192.png', data: { url } }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const client of list) if (new URL(client.url).origin === self.location.origin && 'focus' in client) { client.navigate(url).catch(() => {}); return client.focus(); }
    return self.clients.openWindow(url);
  }));
});
