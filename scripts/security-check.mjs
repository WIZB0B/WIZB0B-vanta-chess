import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
const ignored = new Set(['.git', 'node_modules', 'dist']);
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
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log(`security-check: ${files.length} files inspected`);
