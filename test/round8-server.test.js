import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SANDBAG_FLAG, clubLeagueTable, nextSandbagScore, sandbagAdjust, sandbagDelta } from '../supabase/functions/chess/rules.js';

const fn = readFileSync(new URL('../supabase/functions/chess/index.ts', import.meta.url), 'utf8');
const sql = readFileSync(new URL('../supabase/migrations/20261011090000_round8_sandbagging.sql', import.meta.url), 'utf8');

test('sandbagging: quick rated losses add up, normal play washes the score out', () => {
  assert.equal(sandbagDelta({ score: 0, plies: 6, endReason: 'resign' }), 1);
  assert.equal(sandbagDelta({ score: 0, plies: 4, endReason: 'abandoned', myRating: 1800, oppRating: 1300 }), 1.5);
  assert.equal(sandbagDelta({ score: 0, plies: 24, endReason: 'checkmate', myRating: 1800, oppRating: 1400 }), 0.5);
  assert.equal(sandbagDelta({ score: 0, plies: 60, endReason: 'checkmate' }), -0.1, 'an honest long loss');
  assert.equal(sandbagDelta({ score: 0, plies: 40, endReason: 'resign' }), -0.1, 'resigning a lost middlegame is normal');
  assert.equal(sandbagDelta({ score: 1, plies: 5 }), -0.25);
  let s = 0; for (let i = 0; i < 3; i++) s = nextSandbagScore(s, sandbagDelta({ score: 0, plies: 2, endReason: 'resign' }));
  assert.equal(s, SANDBAG_FLAG);
  assert.equal(nextSandbagScore(0, -1), 0); assert.equal(nextSandbagScore(9.9, 1.5), 10);
});
test('sandbaggers are matched as if rated higher (up to +300)', () => {
  assert.equal(sandbagAdjust(0), 0); assert.equal(sandbagAdjust(1), 0); assert.equal(sandbagAdjust(3), 200); assert.equal(sandbagAdjust(10), 300);
  assert.match(fn, /const base=ratingOf\(p,pool\)\+sandbagAdjust\(p\?\.sandbag_score\)/);
  assert.match(fn, /end_reason:"resign"/); assert.match(fn, /end_reason:"timeout"/);
  assert.match(fn, /\.gte\("sandbag_score",SANDBAG_FLAG\)/, 'flagged players reach the moderation queue');
  assert.match(sql, /sandbag_score numeric\(5,2\) not null default 0 check \(sandbag_score between 0 and 10\)/);
});
test('club league table: sum of the best ten members, other players ignored', () => {
  const entries = [...Array(12)].map((_, i) => ({ player_id: `a${i}`, points: 10 })).concat([{ player_id: 'b0', points: 150 }, { player_id: 'x', points: 999 }]);
  const memberClub = new Map([...Array(12)].map((_, i) => [`a${i}`, 'A']).concat([['b0', 'B']]));
  const t = clubLeagueTable(entries, memberClub, new Map([['A', { name: 'Alpha', slug: 'alpha' }], ['B', { name: 'Beta', slug: 'beta' }]]));
  assert.deepEqual(t.map(c => [c.name, c.points, c.players]), [['Beta', 150, 1], ['Alpha', 100, 12]]);
});
test('server wiring: lobby and your-games explorer', () => {
  assert.match(fn, /case "tournament_lobby":out=await tournamentLobby\(req,b\);break;/);
  assert.match(fn, /if\(\(await tournamentVisibleTo\(\[t\],viewer\)\)\.length===0\)throw fail\("Tournament not found\.",404\);/, 'club events stay private');
  assert.match(fn, /code:viewer&&\[g\.white_player_id,g\.black_player_id\]\.includes\(viewer\.id\)\?g\.invite_code:null/, 'only your own room code is shared');
  assert.match(fn, /if\(b\.mine\)\{/);
  assert.ok(fn.indexOf('The explorer is off for positions in your live games.') < fn.indexOf('if(b.mine){'), 'fair-play check runs first');
});
