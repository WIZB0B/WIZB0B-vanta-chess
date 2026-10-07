import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { securityHeaders } from './security-headers.mjs';
const ignored = new Set(['.git', 'node_modules']);
const files = [];
function walk(directory) { for (const name of readdirSync(directory)) { if (ignored.has(name)) continue; const path = join(directory, name); statSync(path).isDirectory() ? walk(path) : files.push(path); } }
walk('.');
const normalized=path=>path.replace(/\\/g,'/');
const textByFile=new Map();
for(const path of files){
  const bytes=readFileSync(path);
  if(bytes.includes(0))continue;
  textByFile.set(path,bytes.toString('utf8'));
}
const isBrowserFile=path=>{
  const value=normalized(path).replace(/^\.\//,'');
  return value==='index.html'||value.startsWith('src/')||value.startsWith('public/')||value.startsWith('dist/');
};
const clientFiles=[...textByFile.keys()].filter(isBrowserFile);
const clientSource=clientFiles.map(path=>`${normalized(path)}\n${textByFile.get(path)}`).join('\n');
const repoSource=[...textByFile.entries()].map(([path,content])=>`${normalized(path)}\n${content}`).join('\n');
const failures = [];
if (/service_role|SUPABASE_SERVICE_ROLE/i.test(clientSource)) failures.push('service-role reference found in browser code');
if (/Access-Control-Allow-Origin\s*[:=]\s*["']?\*/i.test(clientSource)) failures.push('wildcard CORS found in browser code');
if (/-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(clientSource)) failures.push('private key found in browser code');
const jwtPrefix=['e','y','J'].join('');
const secretPrefix=['sb','secret'].join('_')+'_';
const hardCodedSupabaseKey=new RegExp(`(?:${jwtPrefix}[A-Za-z0-9_-]{20,}|${secretPrefix}[A-Za-z0-9_-]{8,})`,'g');
if(hardCodedSupabaseKey.test(repoSource))failures.push('hard-coded Supabase secret found');
const netlify = readFileSync('netlify.toml', 'utf8');
for (const header of ['Content-Security-Policy', 'Strict-Transport-Security', 'X-Content-Type-Options', 'Referrer-Policy', 'Permissions-Policy']) if (!netlify.includes(header)) failures.push(`missing ${header}`);
const csp=securityHeaders['Content-Security-Policy']||'';
const scriptSrc=csp.split(';').map(value=>value.trim()).find(value=>value.startsWith('script-src '))?.split(/\s+/).slice(1)||[];
if(!scriptSrc.includes("'wasm-unsafe-eval'"))failures.push("script-src must allow 'wasm-unsafe-eval' for Stockfish WebAssembly");
if(scriptSrc.includes("'unsafe-eval'"))failures.push("script-src must not allow 'unsafe-eval'");
const worker = readFileSync('public/sw.js', 'utf8');
if (!worker.includes("url.origin !== self.location.origin") || !worker.includes("event.request.method !== 'GET'")) failures.push('service worker may cache private traffic');
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
if (packageJson.dependencies?.stockfish !== '19.0.0') failures.push('Stockfish dependency must be pinned to 19.0.0');
for (const asset of ['stockfish-19-lite-single.js', 'stockfish-19-lite-single.wasm', 'Copying.txt', 'README.md']) {
  if (!existsSync(join('public/engines', asset))) failures.push(`prepared Stockfish asset missing: ${asset}`);
}
if (existsSync('public/engines/Copying.txt') && !readFileSync('public/engines/Copying.txt', 'utf8').includes('GNU GENERAL PUBLIC LICENSE')) failures.push('prepared Stockfish GPL license is invalid');
const vchAssets = [
  'pieces/wk.webp','pieces/wq.webp','pieces/wr.webp','pieces/wb.webp','pieces/wn.webp','pieces/wp.webp',
  'pieces/bk.webp','pieces/bq.webp','pieces/br.webp','pieces/bb.webp','pieces/bn.webp','pieces/bp.webp',
  'pieces/atlas/atlas-white.png','pieces/atlas/atlas-black.png',
  'wallpapers/wallpaper-emerald.webp','wallpapers/wallpaper-cobalt.webp','wallpapers/wallpaper-burgundy.webp','wallpapers/wallpaper-ivory.webp',
  'ui/hero-knight.webp','ui/live-banner.webp','ui/opening-card.webp','ui/famous-card.webp','ui/review-card.webp','ui/practice-card.webp'
];
for (const asset of vchAssets) if (!existsSync(join('public/assets/vch', asset))) failures.push(`committed VCH visual asset missing: ${asset}`);
for (const asset of ['vch-metal.svg','vch-logo-light.svg','brand-atmosphere.png']) if (!existsSync(join('public/assets/vch/brand', asset))) failures.push(`committed VCH brand asset missing: ${asset}`);
for (const icon of ['icon.svg','icon-192.png','icon-512.png']) if (!existsSync(join('public', icon))) failures.push(`VCH app icon missing: ${icon}`);
if (existsSync('public/icon.svg') && existsSync('public/assets/vch/brand/vch-logo-light.svg') && readFileSync('public/icon.svg','utf8') !== readFileSync('public/assets/vch/brand/vch-logo-light.svg','utf8')) failures.push('public/icon.svg must exactly match vch-logo-light.svg');
for (const name of ['hero-knight','live-banner','opening-card','famous-card','review-card','practice-card']) if (existsSync(join('public/assets/vch/ui', name + '.png'))) failures.push(`source UI PNG must not be deployed: ${name}.png`);
if (!existsSync(join('e2e/fixtures/reference-ui.png'))) failures.push('reference-ui.png must remain test-only under e2e/fixtures');
for (const name of ['wk','wq','wr','wb','wn','wp','bk','bq','br','bb','bn','bp']) if (existsSync(join('public/assets/vch/pieces', name + '.png'))) failures.push(`source PNG must not be deployed: ${name}.png`);
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log(`security-check: ${clientFiles.length} browser files inspected; ${textByFile.size} repo files checked for hard-coded secrets`);
