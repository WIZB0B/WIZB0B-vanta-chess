import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { DIVISIONS, LEAGUE_MIN_GAMES, freestyleBackRank, freestyleFen, isFreestyleRank, leagueMoves, leaguePoints, matchConditional, previousSeason, seasonEnds, seasonOf } from '../supabase/functions/chess/rules.js';

const fn = readFileSync(new URL('../supabase/functions/chess/index.ts', import.meta.url), 'utf8');
const sql = readFileSync(new URL('../supabase/migrations/20261010200000_round5_clubs_leagues_profiles.sql', import.meta.url), 'utf8');

test('freestyle: every start is a valid 960 back rank, legal for chess.js, without castling', () => {
  for (let i = 0; i < 500; i++) {
    const rank = freestyleBackRank();
    assert.ok(isFreestyleRank(rank), rank);
    const c = new Chess(freestyleFen(rank));
    assert.equal(c.fen().split(' ')[2], '-');
    assert.ok(c.moves().length >= 18);
  }
  assert.equal(isFreestyleRank('rnbqkbnr'), true);
  assert.equal(isFreestyleRank('brbqknnr'), false, 'bishops on the same colour');
  assert.equal(isFreestyleRank('krbqnbnr'), false, 'king outside the rooks');
});

test('leagues: points, seasons, promotion and relegation by fifths', () => {
  assert.deepEqual([leaguePoints(1), leaguePoints(0.5), leaguePoints(0)], [3, 1, 0]);
  assert.equal(seasonOf('2026-10-31T23:59:00Z'), '2026-10');
  assert.equal(previousSeason('2026-01'), '2025-12');
  assert.equal(seasonEnds('2026-12'), '2027-01-01T00:00:00.000Z');
  const rows = Array.from({ length: 10 }, (_, i) => ({ player_id: `p${i}`, division: 1, points: 30 - i * 3, games: i === 1 ? 2 : 6, wins: 5 }));
  const moves = leagueMoves(rows);
  assert.deepEqual(moves.filter(m => m.to === 2).map(m => m.player_id), ['p0', 'p2'], 'top fifth with enough games goes up');
  assert.deepEqual(moves.filter(m => m.to === 0).map(m => m.player_id).sort(), ['p8', 'p9']);
  assert.deepEqual(leagueMoves([{ player_id: 'x', division: 4, points: 99, games: 50, wins: 30 }]), [], 'Diamond is the top');
  assert.equal(DIVISIONS.length, 5); assert.equal(LEAGUE_MIN_GAMES, 5);
});

test('conditional moves: the reply follows only the matching plans', () => {
  const lines = [['e7e5', 'g1f3', 'b8c6', 'f1b5'], ['e7e5', 'g1f3', 'd7d6', 'd2d4'], ['c7c5', 'c2c3']];
  assert.deepEqual(matchConditional(lines, 'e7e5'), { reply: 'g1f3', rest: [['b8c6', 'f1b5'], ['d7d6', 'd2d4']] });
  assert.deepEqual(matchConditional(lines, 'd7d5'), { reply: null, rest: [] });
});

test('server wiring: new actions, server-only tables, club battles never pair clubmates', () => {
  for (const a of ['public_profile', 'club_list', 'club_view', 'club_create', 'club_join', 'club_leave', 'club_chat', 'league', 'conditional_list', 'conditional_set', 'report_player', 'fairplay_signal'])
    assert.match(fn, new RegExp(`case "${a}":out=await`));
  assert.match(fn, /candidates=candidates\.filter\(\(x:any\)=>!mine\|\|clubOfP\.get\(x\.player_id\)!==mine\)/);
  assert.match(fn, /if\(me\)\{ \/\/ club chat is for members only/);
  assert.match(fn, /replay960\(Chess,g\.start_fen\|\|START_FEN,history,/, 'takebacks rebuild from the real start');
  assert.match(fn, /const freestyle=b\.variant==="freestyle"&&!bot/);
  assert.match(fn, /if\(g\.daily_days&&o\.result==="\*"&&!b\.conditional\)/, 'one automatic reply, no chains');
  for (const t of ['chess_clubs', 'chess_club_members', 'chess_club_messages', 'chess_league_entries', 'chess_league_seasons', 'chess_conditional_moves', 'chess_reports', 'chess_fairplay_signals'])
    assert.match(sql, new RegExp(`alter table public\\.${t} enable row level security`));
  assert.match(sql, /with \(security_invoker = true\)/);
  assert.match(sql, /revoke all on public\.chess_fairplay_review from anon, authenticated/);
});

test('client: Community tabs, club battle first after the weekly arena', async () => {
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  const { sortArenas } = await import('../src/arena.js');
  assert.match(main, /data-community="\$\{k\}"/);
  const now = Date.parse('2026-10-10T12:00:00Z');
  const list = [{ slug: 'x', starts_at: '2026-10-10T13:00:00Z', ends_at: '2026-10-10T14:00:00Z' }, { slug: 'club-battle-2026-10-11', kind: 'club_battle', starts_at: '2026-10-11T18:00:00Z', ends_at: '2026-10-11T19:30:00Z' }, { slug: 'weekly-arena-2026-10-10', starts_at: '2026-10-10T18:00:00Z', ends_at: '2026-10-10T19:30:00Z' }];
  assert.deepEqual(sortArenas(list, now).map(t => t.slug), ['weekly-arena-2026-10-10', 'club-battle-2026-10-11', 'x']);
});
