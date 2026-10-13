import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { applyLagQuota, calculateMoveTiming, lagQuotaMs, lagUsed } from '../supabase/functions/chess/latency.js';
import { fogFen, lightsOutPly, movesBy, viewFor } from '../supabase/functions/chess/fog.js';

const index = readFileSync(new URL('../supabase/functions/chess/index.ts', import.meta.url), 'utf8');
const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');

test('H1: guest tokens must look like the browser id; "auth:<uuid>" is refused', () => {
  assert.match(index, /if\(!\/\^\[A-Za-z0-9_-\]\{20,128\}\$\/\.test\(token\)\)throw fail\("Player identity is missing\."\)/);
  const re = /^[A-Za-z0-9_-]{20,128}$/;
  assert.ok(re.test(`${crypto.randomUUID()}${crypto.randomUUID()}`));
  assert.ok(!re.test('auth:6f1c2b0e-1111-4222-8333-944455556666'));
});
test('C1/H2: game and player topics come from a server secret; spectators get the watch fields', () => {
  assert.match(index, /async function topicFor\(\.\.\.parts:string\[\]\)\{return \(await hash\("topic:"\+TOPIC_SEED/);
  assert.ok(index.includes('topic:"game:"+await topicFor("game",game.id)'));
  assert.ok(index.includes('if(topic.startsWith("player:"))topic="player:"+await topicFor("player",topic.slice(7))'));
  assert.ok(index.includes('payload:{game:watchView(game),serverNow}'));
  assert.ok(!index.includes('topic:"game:"+game.id'), 'no game state on the guessable topic');
});
test('L1: the move action checks the seat before waiting for a relayed move', () => {
  const body = index.slice(index.indexOf('async function makeMove('));
  assert.ok(body.indexOf('You are not a player in this game.') < body.indexOf('const until=Date.now()+1800'));
});
test('M2: lag compensation has a per-game budget', () => {
  assert.equal(lagQuotaMs(60000), 3000);
  assert.equal(lagQuotaMs(10000), 1000);
  assert.equal(lagQuotaMs(1800000), 5000);
  const history = Array.from({ length: 20 }, (_, i) => ({ color: i % 2 ? 'b' : 'w', network_compensation_ms: 300 }));
  assert.equal(lagUsed(history, 'w'), 3000);
  const t = calculateMoveTiming({ clientMoveAt: 1000 - 300, lastMoveAt: 0, serverReceivedAt: 1000 });
  assert.equal(t.networkCompensationMs, 300);
  const capped = applyLagQuota(t, lagUsed(history, 'w'), 60000);
  assert.equal(capped.networkCompensationMs, 0);
  assert.equal(capped.chargedElapsedMs, 1000);
  assert.equal(applyLagQuota(t, 2900, 60000).networkCompensationMs, 100);
});
test('fog: Vanta Dark hides what the seat cannot see, sends legal moves on its turn', () => {
  const c = new Chess(); for (const m of ['e4', 'd5', 'Bb5+']) c.move(m);
  const history = c.history({ verbose: true }).map(m => ({ from: m.from, to: m.to, san: m.san, color: m.color, k: 'secret', client_move_at: 'x' }));
  const game = { id: 'g', variant: 'dark', status: 'active', fen: c.fen(), move_history: history, pgn: 'x' };
  const black = viewFor(Chess, game, 'b');
  assert.equal(black.pgn, null);
  assert.ok(black.fog.checkers.includes('b5'), 'the checking bishop is revealed');
  assert.ok(black.fen.startsWith('rnbqkbnr/ppp1pppp/8/1B'), 'the checker shows on the board');
  assert.ok(!black.fen.split(' ')[0].includes('K'), 'the white king is out of sight');
  assert.deepEqual(black.move_history[0], { color: 'w', hidden: true });
  assert.equal(black.move_history[1].san, 'd5');
  assert.ok(!('k' in black.move_history[1]) && !('client_move_at' in black.move_history[1]));
  assert.ok(black.legal.length > 0 && black.legal.every(m => /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(m)));
  const white = viewFor(Chess, game, 'w');
  assert.deepEqual(white.legal, [], 'not your turn, no list');
  assert.equal(viewFor(Chess, { ...game, status: 'white_won' }, 'b').fen, c.fen(), 'everything shows at the end');
});
test('fog: Blackout hides the board and the moves since the lights went out', () => {
  const sans = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'd3', 'd6', 'O-O', 'Nf6'];
  const c = new Chess(); const history = sans.map(s => { const m = c.move(s); return { san: m.san, color: m.color, from: m.from, to: m.to } });
  const game = { id: 'g', variant: 'blackout', status: 'active', fen: c.fen(), move_history: history };
  assert.equal(movesBy(history, 'w'), 5);
  const white = viewFor(Chess, game, 'w');
  assert.equal(white.fen, null); assert.equal(white.fog.blind, true);
  assert.equal(lightsOutPly(history, 'w'), 7, 'the lights went out after White\'s 4th move (ply 7)');
  assert.equal(white.move_history[6].san, 'd3');
  assert.deepEqual(white.move_history[7], { color: 'b', hidden: true });
  const black = viewFor(Chess, game, 'b');
  assert.equal(black.fog.blind, true, 'Black has made 5 moves: also blind');
  const early = viewFor(Chess, { ...game, move_history: history.slice(0, 4), fen: 'x' }, 'w');
  assert.equal(early.fog.blind, false); assert.equal(early.fen, 'x');
});
test('fogFen keeps your pieces and what you see', () => {
  assert.equal(fogFen('4k3/8/8/8/8/8/8/4K2R w K - 0 1', 'w', new Set(['e2'])), '8/8/8/8/8/8/8/4K2R w K - 0 1');
  assert.equal(fogFen('4k3/8/8/8/8/8/8/4K2R w K - 0 1', 'w', new Set(['e8'])), '4k3/8/8/8/8/8/8/4K2R w K - 0 1');
});
test('rematch is a server action; peer codes are never followed', () => {
  assert.ok(index.includes('case "rematch":out=await rematch(req,b);break;'));
  assert.ok(!main.includes("rematch_ready"), 'no game codes over the game channel');
});
test('an undecided Vanta Dark / Blackout game leaks no moves through history, export or the explorer', () => {
  assert.ok(index.includes('const fogSealed=(g:any)=>FOG_VARIANTS.has(g?.variant)&&!["1-0","0-1","1/2-1/2"].includes(g?.result);'));
  assert.ok(index.includes('if(fogSealed(g))return {...rest,pgn:null,sans:[]};'), 'game history');
  assert.ok(index.includes('moves:!fogSealed(g)&&Array.isArray(g.move_history)'), 'data export');
  // A refusal for "your live position" would confirm a guessed hidden board, so the explorer is
  // off altogether during a fog game.
  assert.ok(index.includes('if((live||[]).some((g:any)=>FOG_VARIANTS.has(g.variant)))throw fail('));
  assert.ok(index.includes('select("fen,variant").eq("status","active")'));
});
