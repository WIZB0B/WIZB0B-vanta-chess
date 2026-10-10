import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { opponentUsername, poolsPlayed, profileUrl, ratingChartModel, recordText } from '../src/profile-view.js';

const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const H = [{ pool: 'blitz', rating: 1210, at: '2026-10-01' }, { pool: 'rapid', rating: 1190, at: '2026-10-02' }, { pool: 'blitz', rating: 1236, at: '2026-10-03' }, { pool: 'blitz', rating: 1220, at: '2026-10-04' }];
test('rating chart: one pool, padded round range, last point on the right', () => {
  assert.deepEqual(poolsPlayed(H), ['blitz', 'rapid']);
  const m = ratingChartModel(H, 'blitz');
  assert.equal(m.points.length, 3); assert.equal(m.min, 1200); assert.equal(m.max, 1250);
  assert.equal(m.points.at(-1).x, m.width - 8); assert.ok(m.points[1].y < m.points[0].y, 'higher rating is higher up');
  assert.equal(ratingChartModel(H, 'rapid'), null);
});
test('links and records', () => {
  assert.equal(profileUrl('joshua_1', 'https://x.app'), 'https://x.app/?player=joshua_1');
  assert.equal(recordText({ wins: 3, draws: 1, losses: 2 }), '3W 1D 2L');
  assert.equal(opponentUsername({ white_name: 'me', black_name: 'Rival_9' }, 'w'), 'Rival_9');
  assert.equal(opponentUsername({ white_name: 'Guest 4', black_name: 'me' }, 'b'), null, 'guests have no profile');
});
test('wiring: profile from the opponent name, ?player= links, reports go to a person', () => {
  assert.match(main, /\$\('#topPlayerName'\)\.addEventListener\('click'/);
  assert.match(main, /params\.get\('player'\)/);
  assert.match(main, /Nothing happens automatically\./);
  assert.match(main, /<details class="pp-table"><summary>Show as a table<\/summary>/);
});
