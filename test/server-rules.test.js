import test from 'node:test';
import assert from 'node:assert/strict';
import { ACHIEVEMENTS, arenaScore, berserkAfter, berserkClock, dailyIndex, dailyMoveMs, earnsBerserk, kMultiplier, newAchievements, puzzleRatingUpdate, verifyJwt } from '../supabase/functions/chess/rules.js';

test('Berserk: earned every three straight wins, lost on a loss, balanced stakes', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6].map(earnsBerserk), [false, false, true, false, false, true]);
  assert.equal(berserkAfter({ ready: false, score: 1, newStreak: 3 }), true);
  assert.equal(berserkAfter({ ready: true, score: 0, newStreak: 0 }), false, 'a loss takes the charge away');
  assert.equal(berserkAfter({ ready: true, score: 0.5, newStreak: 0 }), true, 'a draw keeps it');
  assert.equal(berserkClock(300000), 150000);
  // Same multiplier for a win and a loss: the expected rating change stays fair.
  const k = 32 * kMultiplier({ berserk: true }), even = 0.5;
  assert.equal(k * (1 - even), -(k * (0 - even)));
  assert.equal(kMultiplier({ berserk: false }), 1);
});

test('arena: three wins in a row and you are on fire; berserk wins add a point', () => {
  assert.deepEqual(arenaScore({ score: 1, streakBefore: 0 }), { points: 2, streak: 1, fire: false });
  assert.deepEqual(arenaScore({ score: 1, streakBefore: 3 }), { points: 4, streak: 4, fire: true });
  assert.equal(arenaScore({ score: 1, streakBefore: 3, berserk: true }).points, 5);
  assert.deepEqual(arenaScore({ score: 0.5, streakBefore: 4 }), { points: 2, streak: 0, fire: true });
  assert.equal(arenaScore({ score: 0, streakBefore: 5 }).streak, 0);
});

test('puzzle rating moves toward the puzzle and settles with experience', () => {
  const up = puzzleRatingUpdate(1200, 0, 1200, true), down = puzzleRatingUpdate(1200, 0, 1200, false);
  assert.equal(up, 1220); assert.equal(down, 1180);
  assert.ok(puzzleRatingUpdate(1200, 200, 1200, true) - 1200 < up - 1200);
  assert.ok(puzzleRatingUpdate(1200, 0, 1800, true) > up, 'beating a hard puzzle is worth more');
  assert.equal(dailyIndex('2026-10-10T08:00:00Z', 50), dailyIndex('2026-10-10T23:00:00Z', 50));
  assert.equal(dailyMoveMs(3), 3 * 86400000);
});

test('achievements are earned once', () => {
  assert.deepEqual(newAchievements([], { wins: 1 }), ['first-win']);
  assert.deepEqual(newAchievements(['first-win'], { wins: 1 }), []);
  assert.ok(newAchievements([], {}, { giantSlayer: true }).includes('giant-slayer'));
  assert.equal(new Set(ACHIEVEMENTS.map(a => a.id)).size, ACHIEVEMENTS.length);
});

test('local sign-in check accepts a good ES256 token and nothing else', async () => {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const pub = await crypto.subtle.exportKey('jwk', pair.publicKey);
  const jwks = { keys: [{ ...pub, kid: 'k1', alg: 'ES256' }] };
  const enc = obj => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const sign = async (claims, kid = 'k1') => {
    const head = enc({ alg: 'ES256', kid, typ: 'JWT' }), body = enc(claims);
    const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, pair.privateKey, new TextEncoder().encode(`${head}.${body}`));
    return `${head}.${body}.${Buffer.from(sig).toString('base64url')}`;
  };
  const issuer = 'https://x.supabase.co/auth/v1', exp = Math.floor(Date.now() / 1000) + 600;
  const good = await sign({ sub: 'u1', exp, iss: issuer, role: 'authenticated' });
  assert.equal((await verifyJwt(good, jwks, { issuer })).sub, 'u1');
  assert.equal(await verifyJwt(good.slice(0, -4) + 'AAAA', jwks, { issuer }), null, 'tampered signature');
  assert.equal(await verifyJwt(await sign({ sub: 'u1', exp: 10, iss: issuer }), jwks, { issuer }), null, 'expired');
  assert.equal(await verifyJwt(await sign({ sub: 'u1', exp, iss: 'https://evil/auth/v1' }), jwks, { issuer }), null, 'wrong issuer');
  assert.equal(await verifyJwt(await sign({ sub: 'u1', exp, iss: issuer }, 'k2'), jwks, { issuer }), null, 'unknown key');
  assert.equal(await verifyJwt(await sign({ sub: 'u1', exp, iss: issuer, role: 'service_role' }), jwks, { issuer }), null, 'not a user token');
  const [h, , s] = good.split('.');
  assert.equal(await verifyJwt(`${h}.${enc({ sub: 'admin', exp, iss: issuer })}.${s}`, jwks, { issuer }), null, 'swapped claims');
});
