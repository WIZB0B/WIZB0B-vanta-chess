import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { explorerRows } from '../src/explorer-view.js';
import { badgeCount, safeNotificationUrl, timeAgo } from '../src/notifications.js';

const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
test('explorer rows: share of games and results per move', () => {
  assert.deepEqual(explorerRows([{ san: 'e4', games: 30, white: 15, draws: 3, black: 12 }, { san: 'd4', games: 10, white: 5, draws: 5, black: 0 }]),
    [{ san: 'e4', games: 30, share: 75, white: 50, draws: 10, black: 40 }, { san: 'd4', games: 10, share: 25, white: 50, draws: 50, black: 0 }]);
});
test('notifications: same-site links only, time ago, badge', () => {
  assert.equal(safeNotificationUrl('/?game=AB12'), '/?game=AB12');
  assert.equal(safeNotificationUrl('//evil.example'), '/');
  assert.equal(safeNotificationUrl('https://evil.example'), '/');
  assert.equal(safeNotificationUrl('/\\evil'), '/');
  assert.equal(timeAgo('2026-10-10T12:00:00Z', Date.parse('2026-10-10T12:30:00Z')), '30m');
  assert.equal(badgeCount({ unread: 3, incoming: 1, yourTurn: 1 }), 3);
  assert.equal(badgeCount({ unread: 0, incoming: 1, yourTurn: 1, inboxAvailable: false }), 2);
});
test('wiring: explorer is a free board that never opens during a live game', () => {
  assert.match(main, /if\(liveGameOn\(\)&&mode!=='computer'\)return toast\('The explorer opens after your game'\)/);
  assert.match(main, /function freeBoard\(\)\{return !!planSession\|\|!!studySession\?\.editing\|\|!!exploreSession\}/);
  assert.match(main, /location\.assign\(url\)/);
  assert.match(main, /const url=safeNotificationUrl\(b\.dataset\.url\)/);
});
