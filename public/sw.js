const CACHE = 'vanta-shell-v1';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg', '/assets/generated/wk.png', '/assets/generated/wq.png', '/assets/generated/wr.png', '/assets/generated/wb.png', '/assets/generated/wn.png', '/assets/generated/wp.png', '/assets/generated/bk.png', '/assets/generated/bq.png', '/assets/generated/br.png', '/assets/generated/bb.png', '/assets/generated/bn.png', '/assets/generated/bp.png', '/assets/generated/wallpaper-emerald.webp', '/assets/generated/hero-knight.png', '/assets/generated/opening-card.png', '/assets/generated/famous-card.png', '/assets/generated/review-card.png', '/assets/generated/practice-card.png', '/assets/generated/live-banner.png'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL))));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))));
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/functions/')) return;
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok && !response.headers.get('set-cookie')) caches.open(CACHE).then(cache => cache.put(event.request, response.clone()));
    return response;
  }).catch(() => caches.match(event.request)));
});
