import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { archiveEntryFromServer, chapterAccuracy, formInsights, keyMoments, loadLocalArchive, outcomeFor, pieceMaterial, sansFromPgn, saveLocalGame, saveReviewSummary, loadReviewCache, storyChapters, storyDelayMs, worstMoment } from '../src/game-story.js';

const memory = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) } };

test('outcomes from your side of the board', () => {
  assert.equal(outcomeFor('1-0', 'w'), 'win'); assert.equal(outcomeFor('1-0', 'b'), 'loss');
  assert.equal(outcomeFor('1/2-1/2', 'b'), 'draw'); assert.equal(outcomeFor('*', 'w'), 'unfinished');
});

test('server rows become archive entries from the viewer\'s seat', () => {
  const e = archiveEntryFromServer({ id: 'g', white_player_id: 'a', black_player_id: 'me', white_name: 'A', black_name: 'Me', result: '0-1', black_rating_delta: 9, time_control_seconds: 180, increment_seconds: 2, source: 'tournament', move_count: 40 }, 'me');
  assert.equal(e.myColor, 'b'); assert.equal(e.ratingDelta, 9); assert.equal(e.source, 'arena'); assert.equal(e.base, 180);
});

test('local archive keeps the newest games and the review cache', () => {
  const s = memory();
  saveLocalGame({ id: 'a', pgn: '1. e4' }, s); saveLocalGame({ id: 'b', pgn: '1. d4' }, s); saveLocalGame({ id: 'a', pgn: '1. e4 e5' }, s);
  assert.deepEqual(loadLocalArchive(s).map(e => e.id), ['a', 'b']);
  saveReviewSummary('a', { accuracy: { w: 90, b: 80 } }, s);
  assert.equal(loadReviewCache(s).a.accuracy.w, 90);
  assert.deepEqual(loadLocalArchive(memory()), []);
});

test('form insights: score, reviewed accuracy and the signature opening', () => {
  const entries = [
    { id: '1', result: '1-0', myColor: 'w', pgn: '1. e4 e5' }, { id: '2', result: '0-1', myColor: 'w', pgn: '1. e4 e5' },
    { id: '3', result: '1/2-1/2', myColor: 'b', pgn: '1. d4 d5' },
  ];
  const ins = formInsights(entries, { 1: { accuracy: { w: 90 } }, 3: { accuracy: { b: 80 } } }, sans => sans[0] === 'e4' ? { name: 'Open Game' } : null);
  assert.deepEqual(ins.form, ['win', 'loss', 'draw']);
  assert.equal(ins.winRate, 50); assert.equal(ins.accuracy, 85);
  assert.deepEqual(ins.topOpening, { name: 'Open Game', games: 2, score: 1, percent: 50 });
});

test('chapters: book opening, then middlegame, endgame when the pieces come off', () => {
  assert.equal(pieceMaterial(new Chess().fen()), 62);
  const sans = sansFromPgn('1. e4 e5 2. Nf3 Nc6 3. Bb5 a6');
  const c = new Chess(), positions = [c.fen()];
  for (const san of sans) { c.move(san); positions.push(c.fen()) }
  const chapters = storyChapters(positions, [true, true, true, true, false, false]);
  assert.deepEqual(chapters.map(ch => [ch.key, ch.from, ch.to]), [['opening', 1, 4], ['middlegame', 5, 6]]);
  const endgame = storyChapters(['4k3/8/8/8/8/8/8/R3K3 w - - 0 1', '4k3/8/8/8/8/8/8/R3K3 b - - 0 1'], []);
  assert.equal(endgame.at(-1).key, 'endgame');
});

test('key moments, the worst moment and the story pace', () => {
  const moves = [{ color: 'w', san: 'e4' }, { color: 'b', san: 'f6' }, { color: 'w', san: 'Qh5+' }, { color: 'b', san: 'g5' }];
  const results = [{ loss: 0, beforeCp: 30, afterCp: 30 }, { loss: 12, classification: 'mistake', beforeCp: 30, afterCp: 120, bestMove: 'e7e5' },
    { loss: 0, beforeCp: 120, afterCp: 130 }, { loss: 60, classification: 'blunder', beforeCp: 130, afterCp: 100000, bestMove: 'g7g6' }];
  const moments = keyMoments(results, moves);
  assert.deepEqual(moments.map(m => m.ply), [2, 4]);
  assert.equal(moments[1].label, 'Blunder');
  assert.deepEqual(worstMoment(results, moves, 'b'), { ply: 4, loss: 60, bestMove: 'g7g6', san: 'g5' });
  assert.equal(worstMoment(results, moves, 'w'), null);
  assert.ok(storyDelayMs(4, moments) > storyDelayMs(3, moments));
  assert.equal(chapterAccuracy(results, moves, { from: 1, to: 1 }, 'b'), null);
});
