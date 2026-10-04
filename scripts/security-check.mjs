import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
const ignored = new Set(['.git', 'node_modules', 'dist', 'generated', 'vch']);
const files = [];
function walk(directory) { for (const name of readdirSync(directory)) { if (ignored.has(name)) continue; const path = join(directory, name); statSync(path).isDirectory() ? walk(path) : files.push(path); } }
walk('.');
const source = files.filter(path => !path.endsWith('package-lock.json') && !path.endsWith('security-check.mjs') && !path.endsWith('security-audit.md')).map(path => `${path}\n${readFileSync(path, 'utf8')}`).join('\n');
const failures = [];
if (/service_role|SUPABASE_SERVICE_ROLE/i.test(source)) failures.push('service-role reference found');
if (/Access-Control-Allow-Origin\s*[:=]\s*["']?\*/i.test(source)) failures.push('wildcard CORS found');
if (/-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(source)) failures.push('private key found');
const netlify = readFileSync('netlify.toml', 'utf8');
for (const header of ['Content-Security-Policy', 'Strict-Transport-Security', 'X-Content-Type-Options', 'Referrer-Policy', 'Permissions-Policy']) if (!netlify.includes(header)) failures.push(`missing ${header}`);
const worker = readFileSync('public/sw.js', 'utf8');
if (!worker.includes("url.origin !== self.location.origin") || !worker.includes("event.request.method !== 'GET'")) failures.push('service worker may cache private traffic');
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
if (packageJson.dependencies?.stockfish !== '19.0.0') failures.push('Stockfish dependency must be pinned to 19.0.0');
for (const asset of ['stockfish-19-lite-single.js', 'stockfish-19-lite-single.wasm', 'Copying.txt', 'README.md']) {
  if (!existsSync(join('public/engines', asset))) failures.push(`prepared Stockfish asset missing: ${asset}`);
}
if (existsSync('public/engines/Copying.txt') && !readFileSync('public/engines/Copying.txt', 'utf8').includes('GNU GENERAL PUBLIC LICENSE')) failures.push('prepared Stockfish GPL license is invalid');
const vchAssets = [
  'pieces/wk.png','pieces/wq.png','pieces/wr.png','pieces/wb.png','pieces/wn.png','pieces/wp.png',
  'pieces/bk.png','pieces/bq.png','pieces/br.png','pieces/bb.png','pieces/bn.png','pieces/bp.png',
  'pieces/atlas/atlas-white.png','pieces/atlas/atlas-black.png',
  'wallpapers/wallpaper-emerald.webp','wallpapers/wallpaper-cobalt.webp','wallpapers/wallpaper-burgundy.webp','wallpapers/wallpaper-ivory.webp',
  'ui/hero-knight.png','ui/live-banner.png','ui/opening-card.png','ui/famous-card.png','ui/review-card.png','ui/practice-card.png','ui/reference-ui.png'
];
for (const asset of vchAssets) if (!existsSync(join('public/assets/vch', asset))) failures.push(`committed VCH visual asset missing: ${asset}`);
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log(`security-check: ${files.length} files inspected`);
