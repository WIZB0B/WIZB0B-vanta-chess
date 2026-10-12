import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { checkers, darkSan, fogPosition, visibleSquares } from '../src/vanta-dark.js';
import { BLACKOUT_SECONDS, blindMovesLeft, inBlackout, movesUntilBlackout, myMoveCount } from '../src/blackout.js';
import { shadowBook, shadowElo, shadowLines } from '../src/shadow.js';
import { prepReply } from '../src/prep.js';
import { GAUNTLET_LIVES, GAUNTLET_STAGES, loadGauntlet, newRun, recordStage, saveGauntlet, stageColor } from '../src/gauntlet.js';
import { rivalLine, rivalsFrom } from '../src/rivals.js';
import { RELICS, equipRelic, loadRelics, saveRelics, unlockRelic } from '../src/relics.js';

const memory = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) }; };
const START = new Chess().fen();

test('vanta dark: you see your pieces and the squares they reach, nothing else', () => {
  const v = visibleSquares(START, 'w');
  for (const s of ['a1', 'e2', 'e3', 'e4', 'a3', 'c3', 'f3', 'h3']) assert.ok(v.has(s), s);
  for (const s of ['e5', 'd7', 'e8', 'a6']) assert.ok(!v.has(s), s);
  const pos = new Map(new Chess().board().flat().filter(Boolean).map(p => [p.square, p.color + p.type]));
  const fog = fogPosition(pos, v, 'w');
  assert.equal([...fog.values()].filter(k => k[0] === 'b').length, 0, 'no black piece is visible at the start');
  assert.equal(fog.size, 16);
});
test('vanta dark: sliders stop at the first piece, pawns see diagonals only with a target', () => {
  const fen = '4k3/8/8/3p4/8/8/8/R3K3 w - - 0 1';
  const v = visibleSquares(fen, 'w');
  assert.ok(v.has('a8') && v.has('d1') && v.has('e2'), 'rook sees the a-file and along rank 1; king sees e2');
  assert.ok(!v.has('d5'), 'd5 is not reachable');
  const p = visibleSquares('4k3/8/8/8/3p4/4P3/8/4K3 w - - 0 1', 'w');
  assert.ok(p.has('d4'), 'pawn sees the piece it can take'); assert.ok(!p.has('f4'), 'empty diagonal stays dark'); assert.ok(p.has('e4'));
  const blocked = visibleSquares('4k3/8/8/8/4p3/4P3/8/4K3 w - - 0 1', 'w');
  assert.equal(blocked.has('e4'), false, 'a pawn blocked head-on does not see the blocker');
  const ep = visibleSquares('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1', 'w');
  assert.ok(ep.has('d6'), 'the en passant square is visible');
});
test('vanta dark: checking pieces are revealed, opponent moves hidden until the end', () => {
  const g = new Chess('4k3/8/8/8/8/8/8/q3K3 w - - 0 1');
  assert.deepEqual(checkers(g, 'w'), ['a1']);
  assert.deepEqual(checkers(g, 'b'), []);
  assert.equal(darkSan({ san: 'e5', color: 'b' }, 1, 'w'), '?');
  assert.equal(darkSan({ san: 'e4', color: 'w' }, 0, 'w'), 'e4');
  assert.equal(darkSan({ san: 'e5', color: 'b' }, 1, 'w', true), 'e5');
});
test('blackout blitz: four moves lit, two blind, repeating', () => {
  assert.equal(BLACKOUT_SECONDS, 180);
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 9, 10, 11, 12].map(inBlackout), [false, false, false, false, true, true, false, false, true, true, false]);
  assert.equal(movesUntilBlackout(1), 3); assert.equal(movesUntilBlackout(4), 0);
  assert.equal(blindMovesLeft(4), 2); assert.equal(blindMovesLeft(5), 1); assert.equal(blindMovesLeft(6), 0);
  assert.equal(myMoveCount(['e4', 'e5', 'Nf3'], 'w'), 2); assert.equal(myMoveCount(['e4', 'e5', 'Nf3'], 'b'), 1);
});
test('your shadow: opens with your own moves and plays at your rating', () => {
  const games = [
    { id: 'a', result: '1-0', white_player_id: 'me', black_player_id: 'x', sans: ['e4', 'c5', 'Nf3'] },
    { id: 'b', result: '0-1', white_player_id: 'x', black_player_id: 'me', sans: ['d4', 'Nf6', 'c4'] },
    { id: 'c', result: '*', white_player_id: 'me', black_player_id: 'x', sans: ['a4', 'a5'] },
    { id: 'd', result: '1-0', white_player_id: 'me', black_player_id: 'x', variant: 'freestyle', sans: ['b4', 'b5'] },
  ];
  const local = [{ id: 'l1', result: '1/2-1/2', myColor: 'w', pgn: '1. e4 e5 2. Nf3 *' }, { id: 'a', result: '1-0', myColor: 'w', pgn: '1. h4 *' }];
  const lines = shadowLines(games, 'me', local);
  assert.equal(lines.w.length, 2, 'finished standard games only, local duplicates skipped');
  assert.equal(lines.b.length, 1);
  const asWhite = shadowBook(lines, 'w');
  assert.equal(prepReply(asWhite, START, () => 0), 'e4', 'as White the shadow opens like you do');
  const asBlack = shadowBook(lines, 'b'); const c = new Chess(); c.move('d4');
  assert.equal(prepReply(asBlack, c.fen(), () => 0), 'Nf6');
  assert.equal(shadowElo(1437), 1450); assert.equal(shadowElo(400), 900); assert.equal(shadowElo(3100), 2700); assert.equal(shadowElo(null), 1200);
});
test('vanta gauntlet: seven stages, three lives, colours alternate', () => {
  const s = memory(); assert.equal(GAUNTLET_STAGES.length, 7); assert.ok(GAUNTLET_STAGES.every((x, i) => !i || x.elo > GAUNTLET_STAGES[i - 1].elo));
  let st = newRun(loadGauntlet(s)); assert.equal(st.run.lives, GAUNTLET_LIVES); assert.equal(stageColor(0), 'w'); assert.equal(stageColor(1), 'b');
  let r = recordStage(st, 1); assert.equal(r.event, 'advanced'); assert.equal(r.state.run.stage, 1); assert.equal(r.state.best, 1);
  r = recordStage(r.state, 0.5); assert.equal(r.event, 'life'); assert.equal(r.state.run.lives, 2);
  r = recordStage(r.state, 0); r = recordStage(r.state, 0); assert.equal(r.event, 'over'); assert.equal(r.state.run, null); assert.equal(r.state.best, 1);
  saveGauntlet(r.state, s); assert.equal(loadGauntlet(s).best, 1);
  st = newRun(r.state); for (let i = 0; i < 6; i++) st = recordStage(st, 1).state;
  r = recordStage(st, 1); assert.equal(r.event, 'cleared'); assert.equal(r.state.clears, 1); assert.equal(r.state.best, 7);
});
test('rivals: close records with real players, no computers', () => {
  const g = (opp, result, me = 'w', extra = {}) => ({ result, white_player_id: me === 'w' ? 'me' : opp, black_player_id: me === 'w' ? opp : 'me', white_name: me === 'w' ? 'Me' : opp.toUpperCase(), black_name: me === 'w' ? opp.toUpperCase() : 'Me', ended_at: '2026-10-01T00:00:00Z', ...extra });
  const games = [g('a', '1-0'), g('a', '0-1'), g('a', '1/2-1/2'), g('a', '1-0', 'b'),
    g('b', '1-0'), g('b', '1-0'), g('b', '1-0'), g('b', '1-0'),
    g('c', '1-0'), g('c', '0-1'),
    g('bot', '0-1', 'w', { bot_player_id: 'bot' }), g('bot', '0-1', 'w', { bot_player_id: 'bot' }), g('bot', '1-0', 'w', { bot_player_id: 'bot' }),
    g('a', '*')];
  const rivals = rivalsFrom(games, 'me');
  assert.deepEqual(rivals.map(r => r.id), ['a', 'b'], 'c has too few games; bots and unfinished games never count');
  assert.equal(rivals[0].games, 4); assert.equal(rivals[0].wins, 1); assert.equal(rivals[0].losses, 2); assert.equal(rivals[0].draws, 1);
  assert.equal(rivalLine(rivals[0]), 'They lead 2–1'); assert.equal(rivalLine(rivals[1]), 'You lead 4–0');
});
test('relic sets: earned once, equipping remembers and restores your theme', () => {
  const s = memory(); let st = loadRelics(s);
  assert.ok(RELICS.length >= 6 && RELICS.every(r => r.theme['--light'] && r.theme['--dark'] && r.how));
  assert.equal(equipRelic(st, 'umbra').equipped, null, 'locked relics cannot be equipped');
  let u = unlockRelic(st, 'umbra', 't'); assert.equal(u.unlocked.id, 'umbra'); assert.equal(unlockRelic(u.state, 'umbra').unlocked, null);
  st = equipRelic(u.state, 'umbra', { '--light': '#111111' }); assert.equal(st.equipped, 'umbra'); assert.deepEqual(st.prev, { '--light': '#111111' });
  st = unlockRelic(st, 'ember').state; st = equipRelic(st, 'ember', { '--light': '#9a9fb0' }); assert.deepEqual(st.prev, { '--light': '#111111' }, 'switching relics keeps your own theme');
  saveRelics(st, s); assert.equal(loadRelics(s).equipped, 'ember');
  assert.equal(equipRelic(st, null).equipped, null);
  s.setItem('vch.relics', '{"unlocked":{"fake":"x"},"equipped":"fake"}'); assert.deepEqual(loadRelics(s).unlocked, {});
});
