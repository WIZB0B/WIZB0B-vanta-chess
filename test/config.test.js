import test from 'node:test';
import assert from 'node:assert/strict';
import { initialClocks, normalizeRoomId } from '../src/game-config.js';

test('room ids are normalized and markup is rejected', () => {
  assert.equal(normalizeRoomId('ab-cd_12', 'SAFE1234'), 'AB-CD_12');
  assert.equal(normalizeRoomId('<img src=x onerror=alert(1)>', 'SAFE1234'), 'SAFE1234');
});

test('selected time control initializes both clocks', () => {
  assert.deepEqual(initialClocks(300), { w: 300, b: 300 });
  assert.deepEqual(initialClocks(180), { w: 180, b: 180 });
  assert.deepEqual(initialClocks(Number.NaN), { w: 600, b: 600 });
});
