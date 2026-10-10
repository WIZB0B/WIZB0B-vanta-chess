import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { REPERTOIRE, bookExit, drillFor, openingName, trainerReport } from '../src/opening-trainer.js';

test('every repertoire line is legal chess', () => {
  for (const o of REPERTOIRE) {
    const c = new Chess();
    for (const m of o.moves) assert.doesNotThrow(() => c.move(m), `${o.name}: ${m}`);
  }
});
test('names the deepest line the game followed', () => {
  assert.equal(openingName('e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bg5'.split(' ')), 'Sicilian · Najdorf');
  assert.equal(openingName('e4 e5 Nf3 Nc6 Bb5 Nf6'.split(' ')), 'Ruy Lopez · Berlin');
  assert.equal(openingName(['a3']), null);
});
test('book exit: who left theory, and what the book plays', () => {
  const exit = bookExit('e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 b4'.split(' '));
  assert.deepEqual({ ...exit, book: exit.book.sort() }, { ply: 8, by: 'w', played: 'b4', book: ['d3'] });
  assert.equal(bookExit('e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O h3'.split(' ')), null, 'the book ran out first');
});
test('drill: position before the deviation and the book line, ending on your move', () => {
  const d = drillFor('e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 b4'.split(' '), 8);
  assert.equal(d.name, 'Italian · Giuoco Pianissimo');
  assert.equal(new Chess(d.fen).turn(), 'w');
  assert.deepEqual(d.solution, ['d2d3', 'd7d6', 'e1g1']);
});
test('trainer report: openings by colour with score, drills only for your deviations, deduplicated', () => {
  const games = [
    { id: 1, myColor: 'w', result: '1-0', sans: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 b4'.split(' ') },
    { id: 2, myColor: 'w', result: '0-1', sans: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 b4 d5'.split(' ') },
    { id: 3, myColor: 'b', result: '1/2-1/2', sans: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 h6'.split(' ') },
    { id: 4, myColor: 'w', result: '1-0', sans: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 h6'.split(' ') },
  ];
  const r = trainerReport(games);
  assert.deepEqual(r.openings[0], { name: 'Italian · Giuoco Pianissimo', color: 'w', games: 3, points: 2, score: 67 });
  assert.equal(r.drills.length, 2);
  assert.equal(r.drills[0].times, 2);
  assert.equal(r.drills[0].played, 'b4');
  assert.equal(r.drills[1].color, 'b');
});
