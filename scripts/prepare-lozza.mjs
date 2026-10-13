// Prepares Lozza 2.5 (MIT, Colin Jenkins, https://github.com/op12no2/lozza, tag 2.5,
// commit 0cf341d0965016adb93bbd6b3575b4a693828deb) for the browser: vendor/lozza/lozza-2.5.js is
// the upstream file, unchanged, checked here against its pinned SHA-256 and copied to
// public/engines with its license. /lozza.worker.js runs it. Lozza is a JavaScript engine with a
// hand-tuned evaluation inspired by Fruit 2.1: a different mind from Stockfish for the campaign.
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const PINNED = {
  'lozza-2.5.js': '72366aad692fdf4e9959998e1d33a98fc3bc3e3c151708529e5d5c9fdf1cd6d4',
  LICENSE: '84fe36c2f32aa669991b097fdd99a3e0c5199ea04552f1998277a3251dc2bcfc',
};
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
async function vendored(name) {
  const bytes = await readFile(resolve('vendor/lozza', name));
  if (sha256(bytes) !== PINNED[name]) throw new Error(`vendor/lozza/${name} does not match its pinned SHA-256`);
  return bytes;
}
const engine = await vendored('lozza-2.5.js'), license = await vendored('LICENSE');
const source = engine.toString('utf8');
if (/\beval\s*\(|\bnew\s+Function\s*\(|\bimportScripts\s*\(|\bfetch\s*\(|XMLHttpRequest|WebSocket/.test(source)) throw new Error('lozza-2.5.js: unexpected dynamic code or network use');
await mkdir(resolve('public/engines'), { recursive: true });
await Promise.all([
  writeFile(resolve('public/engines/lozza-2.5.js'), engine),
  writeFile(resolve('public/engines/LICENSE-lozza.txt'), license),
]);
console.log('Prepared Lozza 2.5 (MIT) in public/engines');
