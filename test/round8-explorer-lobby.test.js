import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { formatScore, parseMultiPv, scoreValue } from '../src/explorer-view.js';

const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const worker = readFileSync(new URL('../public/stockfish.worker.js', import.meta.url), 'utf8');
const start = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const afterE4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';

test('explorer scores: MultiPV lines become White-side scores per move', () => {
  assert.deepEqual(parseMultiPv('info depth 10 seldepth 14 multipv 2 score cp 31 nodes 1 pv d2d4 d7d5', start), { multipv: 2, depth: 10, uci: 'd2d4', cp: 31, mate: null });
  assert.equal(parseMultiPv('info depth 10 multipv 1 score cp 40 pv c7c5 g1f3', afterE4).cp, -40, 'Black to move: flipped to White\'s side');
  assert.equal(parseMultiPv('info depth 9 multipv 1 score mate 3 pv d8h4', afterE4).mate, -3);
  assert.equal(parseMultiPv('info string NNUE enabled', start), null);
  assert.equal(parseMultiPv('bestmove e2e4', start), null);
  assert.equal(formatScore({ cp: 31, mate: null }), '+0.3'); assert.equal(formatScore({ cp: -150, mate: null }), '−1.5'); assert.equal(formatScore({ cp: 0, mate: null }), '0.0');
  assert.equal(formatScore({ cp: null, mate: 2 }), '#2'); assert.equal(formatScore({ cp: null, mate: -4 }), '−#4'); assert.equal(formatScore(null), '…');
  assert.ok(scoreValue({ cp: null, mate: 1 }) > scoreValue({ cp: 900, mate: null }));
});
test('engine worker: MultiPV and searchmoves, validated', () => {
  assert.match(worker, /setoption name MultiPV value \$\{request\.mode==='analysis'\?request\.multipv:1\}/, 'bots always search one line');
  assert.match(worker, /searchmoves \$\{request\.searchmoves\.join\(' '\)\}/);
  assert.match(worker, /filter\(m=>\/\^\[a-h\]\[1-8\]\[a-h\]\[1-8\]\[qrbn\]\?\$\/\.test\(m\)\)/, 'only UCI moves reach the engine');
  assert.match(worker, /multipv:clamp\(data\.multipv,1,10,1\)/);
});
test('wiring: explorer sources and its own engine, lobby, club league, sandbag lead', () => {
  assert.match(main, /const explorerWorker=lazyWorker\('\/stockfish\.worker\.js'\)/, 'never the live-game engine');
  assert.match(main, /data-src="mine"/); assert.match(main, /api\.openingExplorer\(fen,\{mine\}\)/);
  assert.match(main, /if\(explorerEval\)\{explorerWorker\.postMessage\(\{action:'stop'\}\);explorerEval=null\}/);
  assert.match(main, /async function openTournamentLobby\(t\)/); assert.match(main, /lobbyTimer=setInterval\(\(\)=>\{if\(document\.hidden\)return;void draw\(\)\},10000\)/);
  assert.match(main, /if\(currentRightView!=='lobby'\)\{clearInterval\(lobbyTimer\);return\}/, 'the lobby stops refreshing when you leave');
  assert.match(main, /class="league-table club-league"/);
  assert.match(main, /Possible sandbagging · \$\{Number\(c\.sandbag\)\.toFixed\(1\)\}/);
});
