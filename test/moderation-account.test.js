import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readAuthCallback, handleAuthCallback } from '../src/auth-callback.js';

const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
test('password reset links open "set a new password"', async () => {
  assert.equal(readAuthCallback('https://x.app/auth/callback#access_token=a&type=recovery').type, 'recovery');
  let got = null;
  await handleAuthCallback({ location: new URL('https://x.app/auth/callback#access_token=a&type=recovery'), history: { replaceState() {} }, detectSession: async () => ({ session: { access_token: 'a' } }), onSignedIn: async (s, info) => { got = info }, onError: async () => {} });
  assert.deepEqual(got, { type: 'recovery' });
  assert.match(main, /if\(info\?\.type==='recovery'\)\{void openSetPassword/);
  assert.match(main, /authFetch\(withAuthRedirect\('\/auth\/v1\/recover'\),\{email\}\)/);
});
test('moderation menu only for admins; deleting asks for the username', () => {
  assert.match(main, /function isAdmin\(\)\{return signedIn\(\)&&currentProfile\?\.role==='admin'\}/);
  assert.match(main, /id="profileMenuModeration" type="button" class="hidden"/);
  assert.match(main, /Type your username \(\$\{escapeHtml\(name\)\}\) to confirm/);
});
test('api: a payload field named "action" can never replace the request action', () => {
  const api = readFileSync(new URL('../src/vch-api.js', import.meta.url), 'utf8');
  assert.match(api, /body: JSON\.stringify\(\{ \.\.\.payload, action, \.\.\.\(this\.token \? \{ token: this\.token \} : \{\}\) \}\)/);
});
