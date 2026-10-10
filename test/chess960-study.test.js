import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { browseLine } from '../src/move-browse.js';
import { moveLabels, studyPositions, studyUrl } from '../src/study.js';
import { archiveEntryFromServer } from '../src/game-story.js';

const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const START = 'nrkbqbrn/pppppppp/8/8/8/8/PPPPPPPP/NRKBQBRN w - - 0 1';
test('browsing a Freestyle game with a 960 castle', () => {
  const line = browseLine([{ san: 'e3' }, { san: 'e6' }, { san: 'Bde2' }, { san: 'Bde7' }, { san: 'O-O-O', castle: true, from: 'c1', to: 'c1' }], null, START);
  assert.equal(line.moves.length, 5);
  assert.match(line.positions.at(-1), /N1KRQBRN b/, 'king stays on c1, rook to d1');
});
test('studies: positions, labels, links', () => {
  const s = studyPositions(undefined, [{ san: 'e4' }, { san: 'e5' }, { san: 'Nf3' }]);
  assert.equal(s.valid, true); assert.equal(s.positions.length, 4);
  assert.equal(studyPositions(undefined, [{ san: 'e5' }]).valid, false);
  assert.deepEqual(moveLabels('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', ['e5', 'Nf3']), ['1… e5', '2. Nf3']);
  assert.equal(studyUrl('ABCD1234', 'https://x.app'), 'https://x.app/?study=ABCD1234');
});
test('archive keeps Freestyle start and moves for replay', () => {
  const e = archiveEntryFromServer({ id: 'g', white_player_id: 'me', variant: 'freestyle', start_fen: START, sans: ['e3', 'e6'], result: '*' }, 'me');
  assert.equal(e.variant, 'freestyle'); assert.equal(e.startFen, START); assert.deepEqual(e.sans, ['e3', 'e6']);
});
test('wiring: castling by dropping the king on its rook; studies never move a live game', () => {
  assert.match(main, /const opt=castleForMove\(castleOptions\(game,serverGame\.castling960\|\|'-',Chess\),selected,sq\);/);
  assert.match(main, /api\.move\(serverGameId,version,\{castle:opt\.san/);
  assert.match(main, /if\(studySession\?\.editing&&!remote\)return studyMove\(move\);/);
  assert.match(main, /if\(studySession\)return ''; \/\/ reading a study/);
});
