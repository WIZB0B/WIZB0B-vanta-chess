import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { localStore, sessionStore, readJson } from '../src/safe-storage.js';

function fakeStore() {
  const m = new Map();
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), clear: () => m.clear(), key: i => [...m.keys()][i] ?? null, get length() { return m.size; }, m };
}
function withGlobal(name, value, fn) {
  const had = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, { configurable: true, ...value });
  try { return fn(); } finally { if (had) Object.defineProperty(globalThis, name, had); else delete globalThis[name]; }
}

test('uses the real store when it works', () => {
  const real = fakeStore();
  withGlobal('localStorage', { value: real }, () => {
    localStore.setItem('a', 1);
    assert.equal(real.m.get('a'), '1');
    assert.equal(localStore.getItem('a'), '1');
    localStore.removeItem('a');
    assert.equal(localStore.getItem('a'), null);
  });
});

test('blocked storage (even reading the property throws): nothing throws, values last for the visit', () => {
  withGlobal('localStorage', { get() { throw new DOMException('The operation is insecure.', 'SecurityError'); } }, () => {
    assert.doesNotThrow(() => localStore.getItem('x'));
    assert.equal(localStore.getItem('x'), null);
    localStore.setItem('x', 'kept');
    assert.equal(localStore.getItem('x'), 'kept');
    assert.equal(localStore.length, 1);
    localStore.removeItem('x');
    assert.equal(localStore.getItem('x'), null);
  });
  withGlobal('sessionStorage', { get() { throw new Error('blocked'); } }, () => {
    sessionStore.setItem('s', 'v');
    assert.equal(sessionStore.getItem('s'), 'v');
  });
});

test('a full store: the write is kept in memory and read back, and a later successful write wins', () => {
  const real = fakeStore();
  let full = true;
  const quota = { ...real, setItem: (k, v) => { if (full) throw new DOMException('full', 'QuotaExceededError'); real.setItem(k, v); } };
  withGlobal('localStorage', { value: quota }, () => {
    localStore.setItem('big', 'v1');
    assert.equal(localStore.getItem('big'), 'v1');
    full = false;
    localStore.setItem('big', 'v2');
    assert.equal(real.m.get('big'), 'v2');
    assert.equal(localStore.getItem('big'), 'v2');
    localStore.removeItem('big');
  });
});

test('readJson: missing, damaged or null values give the fallback', () => {
  const real = fakeStore();
  withGlobal('localStorage', { value: real }, () => {
    assert.deepEqual(readJson('none', { a: 1 }), { a: 1 });
    real.setItem('bad', '{not json');
    assert.deepEqual(readJson('bad', {}), {});
    real.setItem('nul', 'null');
    assert.deepEqual(readJson('nul', {}), {});
    real.setItem('ok', '{"b":2}');
    assert.deepEqual(readJson('ok', {}), { b: 2 });
  });
});

test('nothing in the app reads browser storage directly (it goes through safe-storage.js)', async () => {
  const dir = new URL('../src/', import.meta.url);
  for (const name of (await readdir(dir)).filter(f => f.endsWith('.js') && f !== 'safe-storage.js')) {
    const code = (await readFile(new URL(name, dir), 'utf8')).replace(/\/\/.*$/gm, '');
    const bare = code.match(/(?<![\w.'"`])(?:window\.|globalThis\.)?(?:localStorage|sessionStorage)\b(?!['"`])/g) || [];
    // i18n.js reads the language inside its own try at load time; that is the one allowed use.
    if (name === 'i18n.js') { assert.ok(/try \{[\s\S]*window\.localStorage[\s\S]*\} catch/.test(code), 'i18n keeps its read inside try'); continue; }
    assert.deepEqual(bare, [], `${name} touches browser storage directly`);
  }
});

test('startup reads of saved JSON can not stop the app', async () => {
  const main = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(main, /authSession=readJson\('vanta\.auth-session',null\)/);
  assert.match(main, /const savedTheme=\(t=>t&&typeof t==='object'&&!Array\.isArray\(t\)\?t:\{\}\)\(readJson\('vanta\.theme',\{\}\)\)/);
});
