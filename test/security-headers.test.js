import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { securityHeaders } from '../scripts/security-headers.mjs';

test('preview and Netlify share the CSP that permits WebAssembly without unsafe-eval',async()=>{
  const csp=securityHeaders['Content-Security-Policy'];
  const scriptSrc=csp.split(';').map(value=>value.trim()).find(value=>value.startsWith('script-src ')).split(/\s+/).slice(1);
  assert.deepEqual(scriptSrc,["'self'","'wasm-unsafe-eval'"]);
  assert.equal(scriptSrc.includes("'unsafe-eval'"),false);
  const vite=await readFile(new URL('../vite.config.js',import.meta.url),'utf8');
  assert.match(vite,/import \{ securityHeaders \} from '\.\/scripts\/security-headers\.mjs'/);
  assert.match(vite,/preview:\s*\{\s*headers: securityHeaders/);
});
