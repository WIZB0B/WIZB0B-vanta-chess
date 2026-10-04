const CACHE = 'vanta-shell-v1';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg', '/assets/vch/pieces/wk.png', '/assets/vch/pieces/wq.png', '/assets/vch/pieces/wr.png', '/assets/vch/pieces/wb.png', '/assets/vch/pieces/wn.png', '/assets/vch/pieces/wp.png', '/assets/vch/pieces/bk.png', '/assets/vch/pieces/bq.png', '/assets/vch/pieces/br.png', '/assets/vch/pieces/bb.png', '/assets/vch/pieces/bn.png', '/assets/vch/pieces/bp.png', '/assets/vch/wallpapers/wallpaper-emerald.webp', '/assets/vch/ui/hero-knight.png', '/assets/vch/ui/opening-card.png', '/assets/vch/ui/famous-card.png', '/assets/vch/ui/review-card.png', '/assets/vch/ui/practice-card.png', '/assets/vch/ui/live-banner.png', '/assets/vch/ui/reference-ui.png'];
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
