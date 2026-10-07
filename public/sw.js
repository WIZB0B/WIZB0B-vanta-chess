const CACHE = 'vanta-shell-v1';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg', '/icon-192.png', '/icon-512.png', '/assets/vch/brand/vch-metal.svg', '/assets/vch/brand/vch-logo-light.svg', '/assets/vch/brand/brand-atmosphere.png', '/assets/vch/pieces/wk.webp', '/assets/vch/pieces/wq.webp', '/assets/vch/pieces/wr.webp', '/assets/vch/pieces/wb.webp', '/assets/vch/pieces/wn.webp', '/assets/vch/pieces/wp.webp', '/assets/vch/pieces/bk.webp', '/assets/vch/pieces/bq.webp', '/assets/vch/pieces/br.webp', '/assets/vch/pieces/bb.webp', '/assets/vch/pieces/bn.webp', '/assets/vch/pieces/bp.webp', '/assets/vch/wallpapers/wallpaper-emerald.webp', '/assets/vch/ui/hero-knight.webp', '/assets/vch/ui/opening-card.webp', '/assets/vch/ui/famous-card.webp', '/assets/vch/ui/review-card.webp', '/assets/vch/ui/practice-card.webp', '/assets/vch/ui/live-banner.webp'];
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
