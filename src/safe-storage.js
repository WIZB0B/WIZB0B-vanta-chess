// Browser storage that never throws.
//
// Some browsers refuse storage outright (Safari and Firefox private modes in some versions,
// in-app browsers, "block all site data"): even *reading* `window.localStorage` throws there. Every
// part of the app that touched it while the page was being built then stopped, and the whole app
// was a blank page. A full disk makes writes throw too.
//
// `localStore` and `sessionStore` have the same methods as the real stores. They look the real
// store up on every call (so tests can swap `globalThis.localStorage`), use it when it works, and
// otherwise keep the values in memory for the rest of the visit: the app works, it just doesn't
// remember anything after a reload. A value that couldn't be written to a full store is also kept
// in memory, and read from there, so the app sees what it saved.
function makeStore(name) {
  const memory = new Map();
  const real = () => { try { return globalThis[name] || null; } catch { return null; } };
  const use = (fn, fallback) => { const store = real(); if (store) { try { return fn(store); } catch { /* blocked or full */ } } return fallback(); };
  return {
    getItem(key) {
      key = String(key);
      if (memory.has(key)) return memory.get(key);
      return use(store => store.getItem(key), () => null);
    },
    setItem(key, value) {
      key = String(key); value = String(value);
      const saved = use(store => { store.setItem(key, value); return true; }, () => false);
      if (saved) memory.delete(key); else memory.set(key, value);
    },
    removeItem(key) {
      key = String(key); memory.delete(key);
      use(store => store.removeItem(key), () => undefined);
    },
    clear() { memory.clear(); use(store => store.clear(), () => undefined); },
    key(index) { return use(store => store.key(index), () => [...memory.keys()][index] ?? null); },
    get length() { return use(store => store.length, () => memory.size); },
  };
}

export const localStore = makeStore('localStorage');
export const sessionStore = makeStore('sessionStorage');

// JSON from storage, or `fallback` when it is missing, unreadable or not valid JSON.
export function readJson(key, fallback = null, store = localStore) {
  try {
    const raw = store.getItem(key);
    if (raw === null || raw === undefined || raw === '') return fallback;
    const value = JSON.parse(raw);
    return value === null || value === undefined ? fallback : value;
  } catch { return fallback; }
}
