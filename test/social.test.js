import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { achievementBoard, berserkProgress, canBerserk, challengePayload, clockLabel, dailyDeadlineLabel, sortFriends, timeChoice, timeControlLabel, urlBase64ToBytes, VAPID_PUBLIC_KEY } from '../src/social.js';
import { ACHIEVEMENTS } from '../supabase/functions/chess/rules.js';

const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const sw = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
const fn = readFileSync(new URL('../supabase/functions/chess/index.ts', import.meta.url), 'utf8');

const live = { status: 'active', rated: true, move_history: [] };
test('berserk: only rated live games, before your own first move, with a charge', () => {
  assert.equal(canBerserk({ game: live, seat: 'w', ready: true }), true);
  assert.equal(canBerserk({ game: live, seat: 'w', ready: false }), false);
  assert.equal(canBerserk({ game: { ...live, rated: false }, seat: 'w', ready: true }), false);
  assert.equal(canBerserk({ game: { ...live, daily_days: 3 }, seat: 'w', ready: true }), false);
  assert.equal(canBerserk({ game: { ...live, white_berserk: true }, seat: 'w', ready: true }), false);
  assert.equal(canBerserk({ game: { ...live, move_history: [{ color: 'w' }] }, seat: 'w', ready: true }), false);
  assert.equal(canBerserk({ game: { ...live, move_history: [{ color: 'w' }] }, seat: 'b', ready: true }), true);
  assert.equal(berserkProgress(0).label, '3 more rated wins to Berserk');
  assert.equal(berserkProgress(5).label, '1 more rated win to Berserk');
  assert.equal(berserkProgress(3, true).ready, true);
});

test('daily games: time choices, clocks in days, deadlines', () => {
  assert.deepEqual(timeChoice('daily-3'), { dailyDays: 3, seconds: 259200, increment: 0 });
  assert.deepEqual(timeChoice('600'), { dailyDays: null, seconds: 600, increment: 0 });
  assert.equal(clockLabel(65), '1:05');
  assert.equal(clockLabel(3723), '1:02:03');
  assert.equal(clockLabel(5 * 3600 * 3 + 120), '15h 2m');
  assert.equal(clockLabel(2 * 86400 + 4 * 3600), '2d 4h');
  assert.equal(timeControlLabel({ daily_days: 1 }), 'Daily · 1 day/move');
  assert.equal(timeControlLabel({ base_seconds: 180, increment_seconds: 2 }), '3+2');
  const now = Date.parse('2026-10-10T00:00:00Z');
  assert.equal(dailyDeadlineLabel('2026-10-13T00:00:00Z', now), '3 days left');
  assert.equal(dailyDeadlineLabel('2026-10-10T05:30:00Z', now), '5h left');
  assert.equal(dailyDeadlineLabel('2026-10-09T00:00:00Z', now), 'Time is up');
});

test('friends and challenges', () => {
  assert.deepEqual(sortFriends([{ name: 'b' }, { name: 'a', online: true }, { name: 'a' }]).map(f => `${f.name}${f.online ? '*' : ''}`), ['a*', 'a', 'b']);
  assert.deepEqual(challengePayload('id', 'daily-3', { rated: true }), { toPlayerId: 'id', rated: true, color: 'random', dailyDays: 3 });
  assert.deepEqual(challengePayload('id', '180-2', { color: 'w' }), { toPlayerId: 'id', rated: false, color: 'w', seconds: 180, increment: 2 });
});

test('achievements: the client list matches the server list', () => {
  assert.deepEqual(achievementBoard([]).map(a => a.id), ACHIEVEMENTS.map(a => a.id));
  const board = achievementBoard([{ id: 'first-win', at: '2026-10-10T00:00:00Z' }]);
  assert.equal(board.find(a => a.id === 'first-win').earned, true);
  assert.equal(board.find(a => a.id === 'ten-wins').earned, false);
  for (const a of board) assert.doesNotMatch(a.mark, /\p{Extended_Pictographic}/u, 'no emoji badges');
});

test('push: public key decodes to an uncompressed P-256 point; private key never in the client', () => {
  const bytes = urlBase64ToBytes(VAPID_PUBLIC_KEY);
  assert.equal(bytes.length, 65); assert.equal(bytes[0], 4);
  assert.doesNotMatch(main, /vapid_private|privateKey/);
  assert.match(fn, /from\("chess_server_secrets"\)/);
  assert.match(sw, /addEventListener\('push'/);
  assert.match(sw, /data\.url\.startsWith\('\/'\) && !data\.url\.startsWith\('\/\/'\)/, 'notifications open same-site paths only');
});

test('wiring: berserk card, friends nav, daily room options, no abandon claims in daily games', () => {
  assert.match(main, /id="berserkCard"/);
  assert.match(main, /data-nav="friends"/);
  assert.match(main, /<option value="daily-3">/);
  assert.match(main, /!serverGame\?\.daily_days&&!currentBot;/);
  assert.match(fn, /if\(g\.daily_days\)throw fail\("Daily games are won on time, not by claiming\.",409\);/);
  assert.match(fn, /case "berserk":out=await goBerserk\(req,b\);break;/);
});
