import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const packageRoot = resolve('node_modules/stockfish');
const outputRoot = resolve('public/engines');
const files = [
  ['bin/stockfish-19-lite-single.js', 'stockfish-19-lite-single.js'],
  ['bin/stockfish-19-lite-single.wasm', 'stockfish-19-lite-single.wasm'],
  ['Copying.txt', 'Copying.txt'],
  ['README.md', 'README.md'],
];

const metadata = JSON.parse(await readFile(resolve(packageRoot, 'package.json'), 'utf8'));
if (metadata.name !== 'stockfish' || metadata.version !== '19.0.0' || metadata.license !== 'GPL-3.0') {
  throw new Error('Expected the pinned GPL-3.0 stockfish@19.0.0 package');
}

await mkdir(outputRoot, { recursive: true });
await Promise.all(files.map(([source, destination]) =>
  copyFile(resolve(packageRoot, source), resolve(outputRoot, destination))));
await writeFile(resolve(outputRoot, '.prepared'), 'stockfish@19.0.0\n');
console.log('Prepared local Stockfish 19 browser assets in public/engines');
