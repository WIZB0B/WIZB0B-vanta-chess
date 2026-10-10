import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { difficultyForRating, ratingDeltaText, sparklinePoints, themeLabel, weakestThemes } from '../src/puzzle-rating.js';
import { dailyIndex, puzzleRatingUpdate } from '../supabase/functions/chess/rules.js';

const fn = readFileSync(new URL('../supabase/functions/chess/index.ts', import.meta.url), 'utf8');

test('puzzle difficulty follows the puzzle rating', () => {
  assert.equal(difficultyForRating(900), 'easiest');
  assert.equal(difficultyForRating(1200), 'easier');
  assert.equal(difficultyForRating(1500), 'normal');
  assert.equal(difficultyForRating(1800), 'harder');
  assert.equal(difficultyForRating(2300), 'hardest');
});
test('rating text, theme names, weakest themes, sparkline', () => {
  assert.equal(ratingDeltaText(1500, 1512), '+12');
  assert.equal(ratingDeltaText(1500, 1491), '−9');
  assert.equal(ratingDeltaText(1500, 1500), '±0');
  assert.equal(themeLabel('backRankMate'), 'Back rank mate');
  assert.equal(themeLabel('mateIn2'), 'Mate in 2');
  assert.deepEqual(weakestThemes([{ theme: 'a', tries: 2, rate: 0 }, { theme: 'b', tries: 5, rate: 40 }, { theme: 'c', tries: 3, rate: 20 }]).map(t => t.theme), ['c', 'b']);
  assert.equal(sparklinePoints([1]), '');
  assert.equal(sparklinePoints([1, 2], 10, 10, 0), '0.0,10.0 10.0,0.0');
});
test('server: rating only on the first try, a stable daily puzzle', () => {
  assert.ok(puzzleRatingUpdate(1500, 0, 1500, true) > 1500);
  assert.ok(puzzleRatingUpdate(1500, 0, 1500, false) < 1500);
  assert.equal(dailyIndex('2026-10-10', 50), dailyIndex('2026-10-10T23:59:00Z', 50));
  assert.match(fn, /after=seen\?\.length\?before:puzzleRatingUpdate/);
  assert.match(fn, /lt\("fetched_at",today\+"T00:00:00Z"\)/);
});
