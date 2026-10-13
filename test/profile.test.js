import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SILHOUETTE, isAvatarData } from '../src/portrait.js';

const main=await readFile(new URL('../src/main.js',import.meta.url),'utf8');
const fn=await readFile(new URL('../supabase/functions/chess/index.ts',import.meta.url),'utf8');
const geo=await readFile(new URL('../netlify/edge-functions/geo.js',import.meta.url),'utf8');
const sql=await readFile(new URL('../supabase/migrations/20261010090000_player_country_avatar.sql',import.meta.url),'utf8');

test('portraits: only small inline images are accepted; guests get a silhouette',()=>{
  assert.ok(isAvatarData('data:image/webp;base64,AAAA'));
  assert.ok(!isAvatarData('https://evil.example/x.png'));
  assert.ok(!isAvatarData('data:image/svg+xml;base64,AAAA'),'no SVG (scripts)');
  assert.ok(!isAvatarData('data:image/png;base64,AA"onerror="x'));
  assert.match(SILHOUETTE,/^<svg class="portrait-silhouette"/);
});

test('server: profile_update validates the flag and portrait; game_players is for participants only',()=>{
  assert.match(fn,/case "profile_update":out=await profileUpdate\(req,b\);break;/);
  assert.match(fn,/if\(!p\.auth_user_id\)throw fail\("Sign in to add a profile picture\.",401\);/);
  assert.match(fn,/const AVATAR_MAX=48000;/);
  assert.match(fn,/async function gamePlayers\(req:Request,b:any\)\{\s*const \{g\}=await assertGameParticipant\(req,b\);/);
  const pub=fn.match(/const publicPlayer=[^\n]*/)[0];
  assert.match(pub,/has_avatar:!!p\.avatar_data[,}]/);assert.doesNotMatch(pub,/avatar_data:p\.avatar_data/,'portraits are not sent with every heartbeat');
  assert.match(sql,/country_code ~ '\^\[A-Z\]\{2\}\$'/);assert.match(sql,/length\(avatar_data\) <= 48000/);
});

test('consent: the country is looked up only when the player asks, and only the code is kept',()=>{
  assert.match(geo,/country:context\?\.geo\?\.country\?\.code\|\|null/);
  assert.match(geo,/export const config=\{path:'\/api\/geo'\};/);
  assert.equal((main.match(/await detectCountry\(\)/g)||[]).length,2,'called only from the two Detect buttons');
  assert.ok(main.includes('we keep the 2-letter code, never your IP address'));
});
