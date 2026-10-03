import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { VchApi, stableGuestToken } from '../src/vch-api.js';

test('move request sends only non-authoritative input and expected version', async () => {
  let request;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    request = { url, options, body: JSON.parse(options.body) };
    return new Response(JSON.stringify({ game: { id: 'game-1', version: 8 } }));
  };
  try {
    const api = new VchApi({ token: 'a'.repeat(40) });
    await api.move('game-1', 7, { from: 'e2', to: 'e4', promotion: 'q' });
    assert.deepEqual(request.body, {
      action: 'move', token: 'a'.repeat(40), gameId: 'game-1', expectedVersion: 7,
      from: 'e2', to: 'e4', promotion: 'q',
    });
    for (const forbidden of ['fen', 'san', 'clocks', 'result', 'rating', 'seat']) assert.equal(forbidden in request.body, false);
    assert.equal(request.options.cache, 'no-store');
    assert.equal(request.options.referrerPolicy, 'no-referrer');
  } finally { globalThis.fetch = originalFetch; }
});

test('stable guest token is opaque, long, and reused without entering a URL', () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
  const first = stableGuestToken(storage);
  assert.ok(first.length >= 20);
  assert.equal(stableGuestToken(storage), first);
});

test('API endpoint validation rejects insecure and unrelated destinations', () => {
  assert.throws(() => new VchApi({ endpoint: 'http://example.com/functions/v1/chess' }));
  assert.throws(() => new VchApi({ endpoint: 'https://example.com/collector' }));
});

test('production headers and service worker private-data boundary are configured', () => {
  const config = readFileSync('netlify.toml', 'utf8');
  for (const header of ['Content-Security-Policy', 'Strict-Transport-Security', 'X-Content-Type-Options', 'Referrer-Policy', 'Permissions-Policy']) assert.match(config, new RegExp(header));
  const worker = readFileSync('public/sw.js', 'utf8');
  assert.match(worker, /url\.origin !== self\.location\.origin/);
  assert.match(worker, /event\.request\.method !== 'GET'/);
});
