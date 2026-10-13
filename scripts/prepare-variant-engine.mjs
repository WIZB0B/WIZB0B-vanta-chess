// Prepares the multi-variant Stockfish (Crazyhouse) browser files in public/engines from the
// pinned GPL-3.0 stockfish.js@10.0.2 npm dependency. Only the WebAssembly build is shipped:
// stockfish.wasm.js (the worker loader) and stockfish.wasm. The package's asm.js fallback
// (stockfish.js) is never copied.
//
// The loader fetches its binary by the bare name "stockfish.wasm", relative to the worker
// script. The one change made here renames that to "stockfish-mv-10.wasm" so the pair can sit
// beside the Stockfish 19 files under clear names, and prepends a notice saying so (GPLv3 §5a).
// The upstream files are checked against pinned SHA-256 digests before anything is written.
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const VERSION = '10.0.2';
const packageRoot = resolve('node_modules/stockfish.js');
const outputRoot = resolve('public/engines');
const VARIANT_ENGINE_JS = 'stockfish-mv-10.js';
const VARIANT_ENGINE_WASM = 'stockfish-mv-10.wasm';
const UPSTREAM_SHA256 = {
  'stockfish.wasm.js': '064175042d8b72eb9fba8311b730f6f5cebcfec736494698d675dc433f3bd275',
  'stockfish.wasm': '45816b436eb8c180acb2c5b9fda0148101f411edbfa6bf919918e0a362eafca8',
  'Copying.txt': '0b383d5a63da644f628d99c33976ea6487ed89aaa59f0b3257992deac1171e6b',
};
const WASM_REFERENCE = 'wasmBinaryFile="stockfish.wasm"';

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
async function upstream(name) {
  const bytes = await readFile(resolve(packageRoot, name));
  if (sha256(bytes) !== UPSTREAM_SHA256[name]) throw new Error(`stockfish.js@${VERSION} ${name} does not match its pinned SHA-256`);
  return bytes;
}

const metadata = JSON.parse(await readFile(resolve(packageRoot, 'package.json'), 'utf8'));
if (metadata.name !== 'stockfish.js' || metadata.version !== VERSION || metadata.license !== 'GPL-3.0') {
  throw new Error(`Expected the pinned GPL-3.0 stockfish.js@${VERSION} package`);
}

const loader = (await upstream('stockfish.wasm.js')).toString('utf8');
if (loader.split(WASM_REFERENCE).length !== 2) throw new Error('stockfish.wasm.js: expected exactly one reference to stockfish.wasm');
if (/\beval\s*\(|\bFunction\s*\(/.test(loader)) throw new Error('stockfish.wasm.js must not use eval or the Function constructor');
const notice = `/* Vanta Chess build step (scripts/prepare-variant-engine.mjs), 2026-10-12: the only change to the
 * stockfish.wasm.js loader of stockfish.js@${VERSION} (GPLv3) is this notice and the WebAssembly file name,
 * "stockfish.wasm" -> "${VARIANT_ENGINE_WASM}". Source links: /engines/SOURCE.md. */\n`;
const patched = notice + loader.replace(WASM_REFERENCE, `wasmBinaryFile="${VARIANT_ENGINE_WASM}"`);

const wasm = await upstream('stockfish.wasm');
// The GPLv3 text is the same file Stockfish 19 ships, so one Copying.txt covers both engines.
const license = await upstream('Copying.txt');
const readme = await readFile(resolve(packageRoot, 'Readme.md'));

await mkdir(outputRoot, { recursive: true });
await Promise.all([
  writeFile(resolve(outputRoot, VARIANT_ENGINE_JS), patched),
  writeFile(resolve(outputRoot, VARIANT_ENGINE_WASM), wasm),
  writeFile(resolve(outputRoot, 'Copying.txt'), license),
  writeFile(resolve(outputRoot, 'README-stockfish-mv-10.md'), readme),
]);
console.log(`Prepared local multi-variant Stockfish (stockfish.js@${VERSION}) browser assets in public/engines`);
