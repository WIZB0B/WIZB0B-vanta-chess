import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { Chess } from 'chess.js';
import { zhPlay } from '../src/crazyhouse.js';
import { zhFen, parseZhFen, parseUciMove, zhLine, zhRecordsFromSans, zhReviewPositions, zhBotStrength, ZH_BOT_LEVELS } from '../src/variant-engine.js';
import { readFileSync } from 'node:fs';

const workerSource = await readFile(new URL('../public/variant.worker.js', import.meta.url), 'utf8');
const START = new Chess().fen();
const ZH_START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR[] w KQkq - 0 1';
const SMOTHER = '6rk/6pp/8/8/8/8/8/K7[N] w - - 0 1';

// A short real Crazyhouse game (captures, drops by both sides, checks), played with zhPlay.
const GAME = [
  ['e2', 'e4'], ['e7', 'e5'], ['g1', 'f3'], ['b8', 'c6'], ['f1', 'c4'], ['g8', 'f6'], ['f3', 'g5'], ['d7', 'd5'],
  ['e4', 'd5'], ['f6', 'd5'], ['g5', 'f7'], ['e8', 'f7'], ['c4', 'd5'], ['d8', 'd5'], [null, 'c3', 'n'], ['d5', 'e6'],
  ['d1', 'f3'], [null, 'f6', 'n'], [null, 'd5', 'p'], [null, 'g4', 'b'], ['d5', 'e6'], ['f7', 'e6'], [null, 'd5', 'q'],
];
function play(moves, fen = START) {
  let state = { pockets: { w: {}, b: {} }, promoted: [] };
  const records = [];
  for (const move of moves) {
    const [from, to, drop] = Array.isArray(move) ? move : [move.from, move.to, move.drop];
    const out = zhPlay(Chess, fen, state, drop ? { drop, to } : { from, to, promotion: move.promotion });
    assert.ok(out, `legal: ${from || drop + '@'}${to}`);
    records.push(drop ? { san: out.move.san, to, drop } : { san: out.move.san, from, to, ...(move.promotion ? { promotion: move.promotion } : {}) });
    fen = out.fen; state = out.state;
  }
  return { records, fen, state };
}
const PROMO_START = 'r3k3/1P6/8/8/8/8/8/4K3 w - - 0 1';
const PROMO = [{ from: 'b7', to: 'b8', promotion: 'q' }, { from: 'a8', to: 'b8' }, { from: 'e1', to: 'd2' }, { drop: 'p', to: 'd3' }];

test('zhFen: holdings in brackets in QRBNP order, "[]" when empty, ~ after promoted pieces', () => {
  assert.equal(zhFen(START, { pockets: { w: {}, b: {} }, promoted: [] }), ZH_START);
  assert.equal(zhFen(START), ZH_START, 'no state means empty pockets');
  assert.equal(zhFen(START, { pockets: { w: { p: 2, n: 1, q: 1 }, b: { r: 1, p: 1, b: 2 } } }), 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR[QNPPrbbp] w KQkq - 0 1');
  // Promoted queen on f8; a stale promoted square (empty) and a promoted pawn/king square are ignored.
  assert.equal(zhFen('5Q1k/8/8/8/8/8/1P6/K7 b - - 7 40', { pockets: { w: { n: 1 } }, promoted: ['f8', 'c3', 'b2', 'a1', 'zz'] }), '5Q~1k/8/8/8/8/8/1P6/K7[N] b - - 0 40');
  assert.equal(zhFen('r1q~bk3/8/8/8/8/8/8/4K2R[] w K - 0 9'.replace('~', ''), { promoted: ['c8', 'h1'] }), 'r1q~bk3/8/8/8/8/8/8/4K2R~[] w K - 0 9');
  assert.match(zhFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 57 30'), / 0 30$/, 'no 50-move rule in VCH Crazyhouse: halfmove clock sent as 0');
  assert.equal(zhFen(zhFen(START, { pockets: { w: { p: 1 } } }), { pockets: { w: { p: 1 } } }), zhFen(START, { pockets: { w: { p: 1 } } }), 'an engine FEN goes back in unchanged');
  assert.throws(() => zhFen('8/8/8 w - - 0 1'));
  assert.throws(() => zhFen(''));
});

test('parseZhFen and zhFen round-trip', () => {
  for (const fen of [ZH_START, SMOTHER, '5Q~1k/8/8/8/8/8/1P6/K7[QRBNPPqrbnp] b - - 0 40', 'r1b2b1r/ppp3pp/2n1kn2/3Qp3/6b1/2N2Q2/PPPP1PPP/RNB1K2R~[Ppp] b KQ - 0 12']) {
    const parsed = parseZhFen(fen);
    assert.doesNotMatch(parsed.fen, /[[~]/);
    assert.equal(zhFen(parsed.fen, parsed.state), fen);
  }
  assert.deepEqual(parseZhFen('5Q~1k/8/8/8/8/8/8/K7[NPPr] b - - 0 1').state, { pockets: { w: { n: 1, p: 2 }, b: { r: 1 } }, promoted: ['f8'] });
  assert.deepEqual(parseZhFen(START), { fen: START, state: { pockets: { w: {}, b: {} }, promoted: [] } });
  assert.throws(() => parseZhFen('nonsense'));
});

test('parseUciMove reads board moves, promotions and drops; rejects everything else', () => {
  assert.deepEqual(parseUciMove('e2e4'), { from: 'e2', to: 'e4' });
  assert.deepEqual(parseUciMove('e7e8q'), { from: 'e7', to: 'e8', promotion: 'q' });
  assert.deepEqual(parseUciMove('a2a1N'), { from: 'a2', to: 'a1', promotion: 'n' });
  assert.deepEqual(parseUciMove('N@f3'), { drop: 'n', to: 'f3' });
  assert.deepEqual(parseUciMove('P@e4'), { drop: 'p', to: 'e4' });
  assert.deepEqual(parseUciMove(' q@d5 '), { drop: 'q', to: 'd5' });
  for (const bad of ['(none)', '0000', '', null, undefined, 'K@e4', 'e2e9', 'e2e4k', 'N@f9', 'Nf3', 'e2-e4']) assert.equal(parseUciMove(bad), null, String(bad));
});

test('zhReviewPositions: every position of a real game with captures and drops, as the engine sees it', () => {
  const { records } = play(GAME);
  const positions = zhReviewPositions(Chess, records);
  assert.equal(positions.length, GAME.length + 1);
  assert.deepEqual({ ...positions[0], state: null }, { ply: 0, fen: START, engineFen: ZH_START, turn: 'w', state: null, move: null });
  positions.forEach((p, i) => { assert.equal(p.ply, i); assert.equal(p.turn, i % 2 ? 'b' : 'w'); assert.equal(p.engineFen, zhFen(p.fen, p.state)); });
  assert.equal(positions[9].engineFen, 'r1bqkb1r/ppp2ppp/2n2n2/3Pp1N1/2B5/8/PPPP1PPP/RNBQK2R[P] b KQkq - 0 5');
  assert.equal(positions[14].engineFen, 'r1b2b1r/ppp2kpp/2n5/3qp3/8/8/PPPP1PPP/RNBQK2R[NPPbnp] w KQ - 0 8');
  assert.equal(positions[15].engineFen, 'r1b2b1r/ppp2kpp/2n5/3qp3/8/2N5/PPPP1PPP/RNBQK2R[PPbnp] b KQ - 0 8');
  assert.equal(positions[23].engineFen, 'r1b2b1r/ppp3pp/2n1kn2/3Qp3/6b1/2N2Q2/PPPP1PPP/RNB1K2R[Ppp] b KQ - 0 12');
  assert.deepEqual(positions[13].move, { san: 'Bxd5+', uci: 'c4d5', from: 'c4', to: 'd5', drop: null, color: 'w' });
  assert.deepEqual(positions[15].move, { san: 'N@c3', uci: 'N@c3', from: null, to: 'c3', drop: 'n', color: 'w' });
  assert.deepEqual(positions[18].move, { san: 'N@f6', uci: 'N@f6', from: null, to: 'f6', drop: 'n', color: 'b' });
  assert.deepEqual(positions[23].move, { san: 'Q@d5+', uci: 'Q@d5', from: null, to: 'd5', drop: 'q', color: 'w' });
  assert.deepEqual(positions.slice(1).map(p => p.move.san), records.map(r => r.san));
  // A promoted queen is marked, and captured it is a pawn in hand.
  const promo = zhReviewPositions(Chess, play(PROMO, PROMO_START).records, PROMO_START);
  assert.deepEqual(promo.map(p => p.engineFen), [
    'r3k3/1P6/8/8/8/8/8/4K3[] w - - 0 1', 'rQ~2k3/8/8/8/8/8/8/4K3[] b - - 0 1', '1r2k3/8/8/8/8/8/8/4K3[p] w - - 0 2',
    '1r2k3/8/8/8/8/8/3K4/8[p] b - - 0 2', '1r2k3/8/8/8/8/3p4/3K4/8[] w - - 0 3',
  ]);
  assert.equal(promo[1].move.san, 'b8=Q+');
  // A broken record stops the replay there, like zhReplay.
  assert.equal(zhReviewPositions(Chess, [...records.slice(0, 3), { from: 'e2', to: 'e4' }]).length, 4);
  assert.equal(zhReviewPositions(Chess, [{ drop: 'n', to: 'f3' }]).length, 1, 'no drop without a piece in hand');
});

test('zhLine turns an engine pv into SAN with drops and stops at an illegal move', () => {
  const line = zhLine(Chess, '6rk/6pp/8/8/8/8/8/K7 w - - 0 1', { pockets: { w: { n: 1 } } }, ['N@f7', 'h8g8']);
  assert.deepEqual(line.map(m => m.san), ['N@f7#'], 'no move after mate');
  const opening = zhLine(Chess, START, {}, ['e2e4', 'd7d5', 'e4d5', 'd8d5', 'P@e4', 'zz']);
  assert.deepEqual(opening.map(m => m.san), ['e4', 'd5', 'exd5', 'Qxd5', 'P@e4']);
  assert.deepEqual(opening.at(-1).state.pockets, { w: {}, b: { p: 1 } });
});

test('zhBotStrength: Skill Level and node budget grow with the level; the worker uses the same table', () => {
  for (let i = 1; i < ZH_BOT_LEVELS.length; i++) {
    assert.ok(ZH_BOT_LEVELS[i][0] > ZH_BOT_LEVELS[i - 1][0] && ZH_BOT_LEVELS[i][1] >= ZH_BOT_LEVELS[i - 1][1] && ZH_BOT_LEVELS[i][2] > ZH_BOT_LEVELS[i - 1][2]);
    assert.ok(ZH_BOT_LEVELS[i][1] <= 20);
  }
  assert.deepEqual(zhBotStrength(800), { elo: 800, skill: 0, nodes: 400 });
  assert.deepEqual(zhBotStrength(1999), { elo: 1800, skill: 13, nodes: 50000 });
  assert.deepEqual(zhBotStrength(3200), { elo: 2800, skill: 20, nodes: 1000000 });
  assert.deepEqual(zhBotStrength(100), zhBotStrength(800));
  assert.deepEqual(zhBotStrength('strong'), zhBotStrength(1500));
  assert.match(workerSource, new RegExp(`const LEVELS=${JSON.stringify(ZH_BOT_LEVELS.map(l => [...l])).replace(/[[\]]/g, '\\$&')};`));
  for (const elo of [0, 799, 800, 1000, 1399.6, 1500, 2199, 2200, 2500, 2800, 4000, undefined]) {
    const bridge = loadBridge();
    bridge.request({ mode: 'bot', fen: ZH_START, elo, requestId: 'b' });
    const { skill, nodes } = zhBotStrength(elo);
    assert.ok(bridge.sent.includes(`setoption name Skill Level value ${skill}`), `skill for ${elo}`);
    assert.equal(bridge.sent.at(-1), `go nodes ${nodes}`, `default nodes for ${elo}`);
  }
});

// Runs the real worker bridge against a fake engine that records UCI commands.
function loadBridge({ uciok = true } = {}) {
  const sent = [], posted = [];
  let engine, created = 0;
  class FakeEngine {
    constructor(url) { engine = this; this.url = url; created++; }
    postMessage(command) { sent.push(command); if (command === 'uci' && uciok) this.onmessage({ data: 'uciok' }); }
    terminate() { this.terminated = true; }
  }
  const self = { postMessage: message => posted.push({ ...message }) };
  vm.runInNewContext(workerSource, { self, Worker: FakeEngine });
  return {
    sent, posted,
    get engine() { return engine; },
    get created() { return created; },
    request: data => self.onmessage({ data }),
    engineSays: line => engine.onmessage({ data: line }),
    lines: id => posted.filter(m => m.requestId === id).map(m => m.line ?? m.type),
  };
}

test('variant worker: sets UCI_Variant once, analyses at full strength without contempt', () => {
  const bridge = loadBridge();
  bridge.request({ mode: 'analysis', fen: SMOTHER, depth: 12, requestId: 'a1' });
  assert.equal(bridge.engine.url, '/engines/stockfish-mv-10.js');
  assert.deepEqual(bridge.sent, ['uci', 'setoption name UCI_Variant value crazyhouse', 'setoption name MultiPV value 1',
    'setoption name UCI_AnalyseMode value true', 'setoption name Analysis Contempt value Off', 'setoption name Skill Level value 20',
    `position fen ${SMOTHER}`, 'go depth 12']);
  bridge.engineSays('info string variant crazyhouse startpos rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR[] w KQkq - 0 1');
  bridge.engineSays('info depth 1 seldepth 2 multipv 1 score mate 1 nodes 553 nps 26333 tbhits 0 time 21 pv N@f7');
  bridge.engineSays('bestmove N@f7');
  assert.deepEqual(bridge.lines('a1'), ['info depth 1 seldepth 2 multipv 1 score mate 1 nodes 553 nps 26333 tbhits 0 time 21 pv N@f7', 'bestmove N@f7']);
  bridge.request({ mode: 'analysis', variant: 'bughouse', fen: ZH_START, depth: 99, multipv: 3, searchmoves: ['e2e4', 'n@f3', 'Q@d5', 'K@e4', 'quit', 'P@e9'], requestId: 'a2' });
  assert.ok(!bridge.sent.slice(8).some(c => c.includes('UCI_Variant')), 'variant only set when it changes (Bughouse boards use Crazyhouse)');
  assert.deepEqual(bridge.sent.slice(-6), ['setoption name MultiPV value 3', 'setoption name UCI_AnalyseMode value true', 'setoption name Analysis Contempt value Off',
    'setoption name Skill Level value 20', `position fen ${ZH_START}`, 'go depth 30 searchmoves e2e4 N@f3 Q@d5']);
});

test('variant worker: bots use Skill Level and a fixed node budget, never time', () => {
  const bridge = loadBridge();
  bridge.request({ mode: 'bot', fen: ZH_START, elo: 1200, nodes: 3000, multipv: 4, requestId: 'b1' });
  assert.deepEqual(bridge.sent.slice(-5), ['setoption name MultiPV value 1', 'setoption name UCI_AnalyseMode value false', 'setoption name Skill Level value 4', `position fen ${ZH_START}`, 'go nodes 3000']);
  bridge.engineSays('bestmove e2e4');
  bridge.request({ mode: 'bot', fen: ZH_START, elo: 2800, nodes: 9e9, requestId: 'b2' });
  assert.equal(bridge.sent.at(-1), 'go nodes 2000000');
  assert.doesNotMatch(workerSource, /movetime|wtime|go infinite/);
});

test('variant worker: positions are validated strictly and bad ones never reach the engine', () => {
  const bad = [
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR[] w KQkq - 0 1\ngo infinite', 'quit', 'position startpos',
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR[X] w KQkq - 0 1', 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR[K] w KQkq - 0 1',
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR[ w KQkq - 0 1', 'rnbqkbnr/pppppppp/8/8/8/8/PPPP~PPPP/RNBQKBNR[] w KQkq - 0 1',
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQK~BNR[] w KQkq - 0 1', 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBN~~R[] w KQkq - 0 1',
    '~rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR[] w KQkq - 0 1', 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBN[] w KQkq - 0 1',
    'rnbqkbnr/pppppppp/9/8/8/8/PPPPPPPP/RNBQKBNR[] w KQkq - 0 1', 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP[] w KQkq - 0 1',
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQQBNR[] w - - 0 1', 'rnbqkbnr/pppppppp/8/8/8/K7/PPPPPPPP/RNBQKBNR[] w - - 0 1',
    'Pnbqkbnr/pppppppp/8/8/8/8/PPPPPPP1/RNBQKBNR[] w - - 0 1', '7k/8/8/8/8/8/8/K7[PPPPPPPPPPPPPPPPP] w - - 0 1',
    '7k/8/8/8/8/8/8/K7[] w K - 0 1', 'r3k3/8/8/8/8/8/8/4K3[] b k - 0 1', '4k2r/8/8/8/8/8/8/4K3[] b kq - 0 1',
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR[] w KQkq e3 0 1', 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR[] x KQkq - 0 1',
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR[] w KKkq - 0 1', 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR[] w KQkq - 0',
  ];
  const bridge = loadBridge();
  bad.forEach((fen, i) => bridge.request({ mode: 'analysis', fen, requestId: `bad-${i}` }));
  bridge.request({ mode: 'analysis', variant: 'atomic', fen: ZH_START, requestId: 'bad-variant' });
  assert.deepEqual(bridge.sent, [], 'the engine is never even started for them');
  for (const id of [...bad.keys()].map(i => `bad-${i}`).concat('bad-variant')) assert.deepEqual(bridge.lines(id), ['info string invalid position', 'bestmove (none)'], id);
  // Everything zhFen produces for a real game passes.
  const ok = loadBridge();
  const fens = [...zhReviewPositions(Chess, play(GAME).records), ...zhReviewPositions(Chess, play(PROMO, PROMO_START).records, PROMO_START)].map(p => p.engineFen);
  for (const fen of [...fens, '7k/8/8/8/8/8/8/K7 w - - 0 1', 'r3k2r/8/8/8/8/8/8/R3K2R[QQ] w KQkq - 0 1', '4k3/8/8/3pP3/8/8/8/4K3[] w - d6 0 9']) {
    ok.request({ mode: 'analysis', fen, depth: 1, requestId: fen });
    assert.equal(ok.sent.at(-2), `position fen ${fen}`);
    ok.engineSays('bestmove (none)');
  }
});

test('variant worker: no legal move ends the search with bestmove (none); a new request stops the old one', () => {
  const bridge = loadBridge();
  bridge.request({ mode: 'analysis', fen: 'k7/1Q6/1K6/8/8/8/8/8[] b - - 0 1', depth: 18, requestId: 'mated' });
  bridge.request({ mode: 'analysis', fen: SMOTHER, depth: 18, requestId: 'next' });
  assert.equal(bridge.sent.at(-1), 'stop');
  bridge.engineSays('info depth 0 score mate 0'); // this engine sends no bestmove here
  assert.deepEqual(bridge.lines('mated'), ['info depth 0 score mate 0', 'bestmove (none)']);
  assert.deepEqual(bridge.sent.slice(-2), [`position fen ${SMOTHER}`, 'go depth 18'], 'the queued request starts');
  bridge.engineSays('info depth 3 seldepth 2 multipv 1 score mate 1 nodes 9 nps 9 tbhits 0 time 1 pv N@f7');
  bridge.engineSays('bestmove N@f7');
  bridge.request({ mode: 'analysis', fen: 'k7/8/1QK5/8/8/8/8/8[] b - - 0 1', requestId: 'stalemate' });
  bridge.engineSays('info depth 0 score cp 0');
  assert.deepEqual(bridge.lines('stalemate'), ['info depth 0 score cp 0', 'bestmove (none)']);
  assert.deepEqual(bridge.lines('next'), ['info depth 3 seldepth 2 multipv 1 score mate 1 nodes 9 nps 9 tbhits 0 time 1 pv N@f7', 'bestmove N@f7']);
  bridge.request({ action: 'stop' });
  assert.notEqual(bridge.sent.at(-1), 'stop', 'nothing running, nothing to stop');
});

test('variant worker: fails closed when the engine cannot load', () => {
  const bridge = loadBridge({ uciok: false });
  bridge.request({ mode: 'bot', fen: ZH_START, elo: 1500, requestId: 'x' });
  bridge.engine.onerror({ preventDefault() {} });
  assert.deepEqual(bridge.lines('x'), ['unavailable']);
  bridge.request({ mode: 'bot', fen: ZH_START, elo: 1500, requestId: 'y' });
  assert.deepEqual(bridge.lines('y'), ['unavailable']);
  assert.equal(bridge.created, 1, 'a missing engine is not refetched for every request');
});

// The vendored engine itself, run in Node (pretest prepares public/engines).
function startEngine() {
  const dir = fileURLToPath(new URL('../public/engines/', import.meta.url));
  const shim = `globalThis.postMessage=l=>process.stdout.write(String(l)+'\\n');delete globalThis.fetch;
require('vm').runInThisContext('(function(require,module,__dirname){'+require('fs').readFileSync('stockfish-mv-10.js','utf8')+'\\n})')(require,{exports:{}},process.cwd());
let buf='';process.stdin.on('data',d=>{buf+=d;let i;while((i=buf.indexOf('\\n'))>=0){const c=buf.slice(0,i);buf=buf.slice(i+1);globalThis.onmessage({data:c})}});`;
  const child = spawn(process.execPath, ['-e', shim], { cwd: dir, stdio: ['pipe', 'pipe', 'inherit'] });
  let pending = '', lines = [], waiter = null;
  child.stdout.on('data', chunk => {
    pending += chunk;
    let i;
    while ((i = pending.indexOf('\n')) >= 0) { lines.push(pending.slice(0, i)); pending = pending.slice(i + 1); }
    if (waiter && lines.some(waiter.until)) { const w = waiter; waiter = null; const out = lines; lines = []; w.resolve(out); }
  });
  return {
    run(commands, until, ms = 20000) {
      lines = [];
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`engine timeout after ${commands.at(-1)}`)), ms);
        waiter = { until, resolve: out => { clearTimeout(timer); resolve(out); } };
        for (const command of commands) child.stdin.write(command + '\n');
      });
    },
    stop() { child.kill(); },
  };
}

test('vendored multi-variant Stockfish plays Crazyhouse: drops, holdings and promoted pieces', async () => {
  const files = await readdir(new URL('../public/engines/', import.meta.url));
  assert.ok(files.includes('stockfish-mv-10.js') && files.includes('stockfish-mv-10.wasm'));
  assert.deepEqual(files.filter(f => /\.(js|wasm)$/.test(f)).sort(), ['stockfish-19-lite-single.js', 'stockfish-19-lite-single.wasm', 'stockfish-mv-10.js', 'stockfish-mv-10.wasm'], 'no asm.js fallback or other engine build is shipped');
  const loader = await readFile(new URL('../public/engines/stockfish-mv-10.js', import.meta.url), 'utf8');
  assert.match(loader, /wasmBinaryFile="stockfish-mv-10\.wasm"/);
  assert.match(loader, /GNU General Public License v3/);
  assert.doesNotMatch(loader, /\beval\s*\(|\bFunction\s*\(/, 'runs under script-src without unsafe-eval');
  assert.match(await readFile(new URL('../public/engines/Copying.txt', import.meta.url), 'utf8'), /GNU GENERAL PUBLIC LICENSE/);
  assert.match(await readFile(new URL('../public/engines/SOURCE.md', import.meta.url), 'utf8'), /stockfish\.js@10\.0\.2/);

  const engine = startEngine();
  try {
    const uci = await engine.run(['uci'], l => l === 'uciok');
    assert.ok(uci.some(l => /^option name UCI_Variant type combo .*var crazyhouse/.test(l)));
    await engine.run(['setoption name UCI_Variant value crazyhouse', 'isready'], l => l === 'readyok');
    // White mates by dropping the knight in hand; Black does the same with its own.
    const white = await engine.run([`position fen ${zhFen('6rk/6pp/8/8/8/8/8/K7 w - - 0 1', { pockets: { w: { n: 1 } } })}`, 'go depth 8'], l => l.startsWith('bestmove'));
    assert.equal(white.at(-1), 'bestmove N@f7');
    assert.ok(white.some(l => / score mate 1 .* pv N@f7$/.test(l)));
    const black = await engine.run(['position fen k7/8/8/8/8/8/6PP/6RK[n] b - - 0 1', 'go depth 8'], l => l.startsWith('bestmove'));
    assert.equal(black.at(-1), 'bestmove N@f2', 'drops are upper case for Black too');
    // The engine reaches exactly the positions zhReviewPositions computes (halfmove clock aside).
    const positions = [...zhReviewPositions(Chess, play(GAME).records)];
    const promo = zhReviewPositions(Chess, play(PROMO, PROMO_START).records, PROMO_START);
    const strip = fen => fen.split(' ').filter((_, i) => i !== 4).join(' ');
    for (const [list, ply] of [[positions, 14], [positions, 18], [positions, 23], [promo, 1], [promo, 2], [promo, 4]]) {
      const moves = list.slice(1, ply + 1).map(p => p.move.uci).join(' ');
      const shown = await engine.run([`position fen ${list[0].engineFen} moves ${moves}`, 'd'], l => l.startsWith('Checkers:'));
      assert.equal(strip(shown.find(l => l.startsWith('Fen: ')).slice(5)), strip(list[ply].engineFen), `ply ${ply}`);
    }
  } finally { engine.stop(); }
});

test('zhRecordsFromSans: an archived SAN list (drops, checks, promotions) replays to the same game', () => {
  const game = play(GAME), sans = game.records.map(r => r.san);
  assert.ok(sans.some(s => s.includes('@')), 'the fixture has drops');
  const back = zhRecordsFromSans(Chess, sans);
  assert.equal(back.records.length, GAME.length);
  assert.equal(back.fen, game.fen);
  assert.deepEqual(back.state, game.state);
  assert.deepEqual(zhReviewPositions(Chess, back.records).map(p => p.engineFen), zhReviewPositions(Chess, game.records).map(p => p.engineFen));
  const promo = play(PROMO, PROMO_START), promoBack = zhRecordsFromSans(Chess, promo.records.map(r => r.san), PROMO_START);
  assert.equal(promoBack.fen, promo.fen, 'promotion and the promoted piece going back to a pawn in hand');
  assert.equal(zhRecordsFromSans(Chess, ['e4', 'N@f3']).records.length, 1, 'stops at a drop with nothing in hand');
  assert.equal(zhRecordsFromSans(Chess, ['e4', 'nonsense', 'e5']).records.length, 1);
  assert.deepEqual(zhRecordsFromSans(Chess, null).records, []);
});

test('Crazyhouse review is wired: archived games replay with drops, review uses the variant engine', () => {
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(main, /const zh=entry\.variant==='crazyhouse'\?zhRecordsFromSans\(Chess,entry\.sans,entry\.startFen\):null;/);
  assert.match(main, /archiveSession=\{entry,prevMode,records:zh\?zh\.records:/);
  assert.match(main, /const built=variant==='crazyhouse'\?buildZhReviewGame\(\):buildReviewGame\(\);/);
  assert.match(main, /const worker=variant\?variantReviewWorker:reviewWorker;/);
  assert.match(main, /if\(variant==='bughouse'\)return toast\(/, 'bughouse boards are not reviewed move by move');
});
