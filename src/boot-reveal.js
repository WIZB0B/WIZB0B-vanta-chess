// The page's first appearance (owner, 2026-10-17: the menu "does not land naturally"). The
// visitor used to see the default wallpaper, then a splash, then the app built in pieces, with a
// saved wallpaper swapping in on top. Now index.html's veil (the theme's one dark colour) covers
// the page until it is ready: built, the saved theme applied and the pictures on screen (the
// wallpaper, the piece set, the hero art) decoded, or at most a moment after navigation started
// (maxWaitMs). Then the veil fades and the page's regions rise a few pixels into place, once.
export const REVEAL = Object.freeze({ maxWaitMs: 1400, fadeMs: 420, riseMs: 470, frameWaitMs: 250 });

// The url(...) values in a CSS background-image (a wallpaper is a gradient over a picture).
export function backgroundUrls(value = '') {
  return [...String(value).matchAll(/url\((["']?)(.*?)\1\)/g)].map(m => m[2]).filter(Boolean);
}

// Resolves when the picture is decoded (ready to paint), or failed: never rejects.
export function decodeImage(url, ImageClass = globalThis.Image) {
  return new Promise(resolve => {
    try {
      const img = new ImageClass();
      img.decoding = 'async';
      img.src = url;
      if (typeof img.decode === 'function') img.decode().then(resolve, resolve);
      else { img.onload = resolve; img.onerror = resolve; }
    } catch { resolve(); }
  });
}

// Resolves when an <img> already in the page is decoded (one chosen from a srcset is decoded as
// the browser chose it, not fetched again), or failed: never rejects.
export function decodeElement(img) {
  return new Promise(resolve => {
    try { if (typeof img?.decode === 'function') img.decode().then(resolve, resolve); else resolve(); } catch { resolve(); }
  });
}

// Reveals the page once: waits for the pictures (or the cap), then two frames so the first frame
// shown is a whole one, then fades the veil and starts the rise. A page that paints no frames (a
// tab or pane opened in the background) is not held: frameWaitMs later it goes on. `immediate`
// (the installed app's splash is already up) reveals at once. Returns a promise that settles when
// the veil is on its way out.
export function revealApp({ doc = globalThis.document, win = globalThis, urls = [], images = [], now = () => win.performance?.now?.() ?? 0, maxWaitMs = REVEAL.maxWaitMs, frameWaitMs = REVEAL.frameWaitMs, immediate = false } = {}) {
  const root = doc.documentElement;
  if (root.classList.contains('app-revealed')) return Promise.resolve(false);
  const capped = new Promise(resolve => win.setTimeout(resolve, Math.max(0, maxWaitMs - now())));
  const pictures = Promise.all([...[...new Set(urls.filter(Boolean))].map(url => decodeImage(url, win.Image)), ...images.filter(Boolean).map(decodeElement)]);
  const ready = immediate ? Promise.resolve() : Promise.race([pictures, capped]);
  const twoFrames = () => new Promise(resolve => {
    win.requestAnimationFrame(() => win.requestAnimationFrame(resolve));
    win.setTimeout(resolve, frameWaitMs);
  });
  return ready
    .then(twoFrames)
    .then(() => {
      if (root.classList.contains('app-revealed')) return false;
      root.classList.add('app-revealed', 'app-revealing');
      const veil = doc.getElementById('bootVeil');
      if (veil) { veil.classList.add('out'); win.setTimeout(() => veil.remove(), REVEAL.fadeMs + 120); }
      win.setTimeout(() => root.classList.remove('app-revealing'), REVEAL.riseMs + 200);
      return true;
    });
}
