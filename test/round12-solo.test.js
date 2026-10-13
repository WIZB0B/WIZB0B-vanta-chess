import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { RANKS, addGames, armyList, careers, countsForCareer, deeds, emptyCareers, epithetOf, forkTargets, gameDeeds, identitiesAfter, loadVeterans, pieceId, pieceName, rankOf, saveVeterans, totalsMap } from '../src/veterans.js';
import { HONOR_RELICS, OATHS, dailyOaths, loadOaths, oathById, oathStatus, oathSummary, recordOath, saveOaths } from '../src/oaths.js';
import { atmosphereFor, materialFromFen, tensionFor } from '../src/atmosphere.js';
import { MAX_STARS, REALMS, battleKey, battleOpen, loadCampaign, realmFreed, realmOpen, realmsFreed, recordBattle, saveCampaign, starsFor, totalStars } from '../src/campaign.js';
import { KEY_FOR_THEME, MUSIC_KEYS, VantaScore, chordFor, loadMusic, midiHz, saveMusic } from '../src/music.js';
import { RELICS, relicById } from '../src/relics.js';

const memory = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) }; };
const OPERA = 'e4 e5 Nf3 d6 d4 Bg4 dxe5 Bxf3 Qxf3 dxe5 Bc4 Nf6 Qb3 Qe7 Nc3 c6 Bg5 b5 Nxb5 cxb5 Bxb5+ Nbd7 O-O-O Rd8 Rxd7 Rxd7 Rd1 Qe6 Bxd7+ Nxd7 Qb8+ Nxb8 Rd8#'.split(' ');
const verbose = sans => { const c = new Chess(); return sans.map(s => c.move(s)); };

// ---- Veteran pieces ----
test('veterans: pieces are known by their starting square, through castling and en passant', () => {
  assert.equal(pieceId('w', 'n', 'g1'), 'w-n-g1');
  assert.equal(pieceName('w-n-g1'), 'Knight of g1'); assert.equal(pieceName('b-k-e8'), 'The King'); assert.equal(pieceName('w-q-d1'), 'The Queen');
  const castled = identitiesAfter(verbose(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'O-O']), 'w');
  assert.equal(castled.get('g1'), 'w-k-e1'); assert.equal(castled.get('f1'), 'w-r-h1'); assert.equal(castled.get('f3'), 'w-n-g1');
  assert.ok(!castled.has('e1') && !castled.has('h1'));
  const long = identitiesAfter(verbose(OPERA.slice(0, 23)), 'w'); // after 12.O-O-O
  assert.equal(long.get('c1'), 'w-k-e1'); assert.equal(long.get('d1'), 'w-r-a1');
  const ep = verbose(['e4', 'a6', 'e5', 'd5', 'exd6']);
  assert.equal(identitiesAfter(ep, 'w').get('d6'), 'w-p-e2');
  const black = identitiesAfter(ep, 'b'); assert.ok(!black.has('d5'), 'the pawn taken en passant is gone'); assert.equal(black.size, 15);
});
test('veterans: the Opera game, deed by deed', () => {
  const d = gameDeeds(OPERA, 'w');
  assert.equal(d.get('w-r-h1').mates, 1, 'the h1 rook delivered Rd8#');
  assert.equal(d.get('w-r-a1').captures, 1); assert.equal(d.get('w-r-a1').fell, 1);
  assert.equal(d.get('w-b-f1').captures, 2); assert.equal(d.get('w-b-f1').checks, 2); assert.equal(d.get('w-b-f1').fell, 1);
  assert.equal(d.get('w-n-g1').fell, 1); assert.equal(d.get('w-n-b1').captures, 1);
  assert.equal(d.get('w-p-d2').captures, 1); assert.equal(d.get('w-p-d2').fell, 1);
  assert.equal(d.get('w-q-d1').checks, 1); assert.equal(d.get('w-q-d1').fell, 1);
  for (const s of d.values()) assert.equal(s.games, 1);
  const black = gameDeeds(OPERA, 'b');
  assert.equal(black.get('b-b-c8').captures, 1); assert.equal(black.get('b-n-g8').captures, 2, 'Nxd7 and Nxb8 were both the g8 knight (via f6)');
});
test('veterans: a fork is two winnable targets, not two defended pieces', () => {
  const royal = new Chess('r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1'); royal.move('Nc7+');
  assert.equal(forkTargets(royal, 'c7', 'w'), 2, 'king and rook');
  const loose = new Chess('4k3/8/8/1n3n2/8/8/8/3QK3 w - - 0 1'); loose.move('Qd3');
  assert.equal(forkTargets(loose, 'd3', 'w'), 2, 'two loose knights: a queen fork');
  const defended = new Chess('4k3/8/p5p1/1n3n2/8/8/8/3QK3 w - - 0 1'); defended.move('Qd3');
  assert.equal(forkTargets(defended, 'd3', 'w'), 0, 'a queen attacking defended knights wins nothing');
});
test('veterans: ranks, epithets and careers', () => {
  assert.deepEqual(RANKS.map(r => r.min), [40, 15, 5]);
  const s = { games: 3, captures: 4, forks: 0, checks: 2, mates: 0, promotions: 0, fell: 1, value: 4 };
  assert.equal(deeds(s), 5); assert.equal(rankOf(s).id, 'veteran'); assert.equal(rankOf({ ...s, captures: 3 }), null);
  assert.equal(epithetOf({ ...s, mates: 1, forks: 5 }), 'Kingslayer', 'mates come first');
  assert.equal(epithetOf({ ...s, forks: 3 }), 'the Fork'); assert.equal(epithetOf(s), null);
  const games = [{ id: 'a', sans: OPERA, myColor: 'w' }, { id: 'a', sans: OPERA, myColor: 'w' }, { id: 'b', sans: OPERA, myColor: 'w', variant: 'freestyle' }, { id: 'c', sans: ['e4'], myColor: 'w' }];
  assert.equal(countsForCareer(games[2]), false); assert.equal(countsForCareer(games[3]), false);
  const all = careers(games);
  assert.equal(all.get('w-r-h1').mates, 1, 'a game counts once'); assert.equal(all.get('w-r-h1').games, 1);
  const list = armyList(all, 'w');
  assert.equal(list[0].id, 'w-b-f1', 'best first'); assert.equal(list.length, 16); assert.ok(list.every(x => x.color === 'w'));
});
test('veterans: careers grow one game at a time and survive a reload', () => {
  const store = memory();
  let st = addGames(emptyCareers(), [{ id: 'g1', sans: OPERA, myColor: 'w' }]);
  st = addGames(st, [{ id: 'g1', sans: OPERA, myColor: 'w' }, { id: 'g2', sans: OPERA, myColor: 'w' }]);
  assert.deepEqual(st.ids, ['g1', 'g2']); assert.equal(st.totals['w-r-h1'].mates, 2);
  const full = { ids: Array.from({ length: 600 }, (_, i) => `old${i}`), totals: {} };
  const more = addGames(full, [{ id: 'new', sans: OPERA, myColor: 'w' }]);
  assert.equal(more.ids.length, 600); assert.equal(more.ids.at(-1), 'new', 'a full list still takes new games (the app counts what was added)');
  saveVeterans(st, store);
  const back = loadVeterans(store);
  assert.deepEqual(back.ids, ['g1', 'g2']); assert.equal(totalsMap(back.totals).get('w-r-h1').mates, 2);
  store.setItem('vch.veterans', JSON.stringify({ ids: [1, 'x'], totals: { 'w-n-g1': { captures: '3', games: -2 }, 'bad id': { captures: 9 } } }));
  const clean = loadVeterans(store);
  assert.deepEqual(clean.ids, ['x']); assert.deepEqual(Object.keys(clean.totals), ['w-n-g1']);
  assert.equal(clean.totals['w-n-g1'].captures, 3); assert.equal(clean.totals['w-n-g1'].games, 0);
  store.setItem('vch.veterans', '{nope'); assert.deepEqual(loadVeterans(store), emptyCareers());
});

// ---- Oaths ----
test('oaths: three a day, one of each weight, the same all day', () => {
  const day = dailyOaths(new Date('2026-10-12T01:00:00Z'));
  assert.equal(day.length, 3); assert.deepEqual(day, dailyOaths(new Date('2026-10-12T22:00:00Z')));
  assert.deepEqual(day.map(id => oathById(id).honor >= 3 ? 3 : oathById(id).honor), [1, 2, 3]);
  const seen = new Set(); for (let i = 0; i < 40; i++) dailyOaths(new Date(Date.UTC(2026, 0, 1 + i))).forEach(id => seen.add(id));
  assert.ok(seen.size >= 9, 'the oaths rotate');
  assert.ok(OATHS.every(o => ['keep', 'deed'].includes(o.kind) && o.honor >= 1 && o.vow));
});
test('oaths: vows of restraint and vows of deeds', () => {
  const opera = oathSummary(OPERA, 'w');
  assert.equal(opera.castled, 'q'); assert.equal(opera.mateBy, 'r'); assert.equal(opera.tookQueen, false); assert.ok(opera.checks >= 3);
  assert.equal(oathStatus('open-gate', opera), 'broken');
  assert.equal(oathStatus('long-road', opera, { over: true, score: 1 }), 'fulfilled');
  assert.equal(oathStatus('long-road', opera, { over: true, score: 0.5 }), 'failed', 'deeds need the win');
  assert.equal(oathStatus('swift-blade', opera, { over: true, score: 1 }), 'fulfilled', '17 moves');
  assert.equal(oathStatus('swift-blade', opera), 'pending', 'a swift win is known only at the end');
  assert.equal(oathStatus('squire', opera, { over: true, score: 1 }), 'failed');
  const quiet = oathSummary(['e4', 'e5', 'Nf3', 'Nc6'], 'w');
  assert.equal(oathStatus('open-gate', quiet), 'holding');
  assert.equal(oathStatus('open-gate', quiet, { over: true, score: 0.5 }), 'fulfilled', 'kept and not lost');
  assert.equal(oathStatus('open-gate', quiet, { over: true, score: 0 }), 'failed');
  assert.equal(oathSummary(['Nf3', 'e5', 'Ng1'], 'w').knightRetreat, true);
  assert.equal(oathSummary(['e4', 'e5', 'Qh5', 'Nc6'], 'w').queenMovedAt, 2);
  assert.equal(oathStatus('patient-queen', oathSummary(['e4', 'e5', 'Qh5'], 'w')), 'broken');
  const lowly = oathSummary(['f3', 'e5', 'g4', 'Qh4#'], 'b'); assert.equal(lowly.mateBy, 'q');
  assert.equal(oathSummary(['e4', 'e5'], 'w', '8/8/8/8/8/8/8/8 w - - 0 1').myMoves, 0, 'a bad start position counts nothing');
  assert.equal(oathStatus('nope', opera), null);
});
test('oaths: honor and the relics it earns', () => {
  const store = memory();
  let st = loadOaths(store); assert.deepEqual(st, { honor: 0, sworn: 0, kept: 0, history: [] });
  let out = recordOath(st, 'lowly', 'fulfilled'); assert.equal(out.gained, 5); assert.deepEqual(out.relics, []);
  st = out.state; out = recordOath(st, 'lowly', 'fulfilled'); assert.deepEqual(out.relics, ['oathbound'], '10 honor');
  st = out.state; out = recordOath(st, 'hound', 'broken'); assert.equal(out.gained, 0); assert.equal(out.state.sworn, 3); assert.equal(out.state.kept, 2);
  assert.deepEqual(recordOath(st, 'hound', 'holding').gained, 0, 'only finished oaths count');
  saveOaths(out.state, store); assert.equal(loadOaths(store).honor, 10);
  assert.deepEqual(HONOR_RELICS.map(r => r.relic).filter(id => relicById(id)), ['oathbound', 'paladin']);
});

// ---- Living atmosphere ----
test('atmosphere: moods from the position and the clocks', () => {
  assert.deepEqual(materialFromFen(new Chess().fen()), { w: 39, b: 39 });
  assert.equal(atmosphereFor({}).mood, 'calm');
  assert.equal(atmosphereFor({ over: true, won: true }).mood, 'dawn'); assert.equal(atmosphereFor({ over: true, won: false }).mood, 'dusk');
  assert.equal(atmosphereFor({ live: true, inCheck: true }).mood, 'check');
  const storm = atmosphereFor({ live: true, myClockSec: 10, baseSec: 300 }); assert.equal(storm.mood, 'storm'); assert.ok(storm.strength > 0.6);
  assert.equal(atmosphereFor({ live: true, myClockSec: 50, baseSec: 300 }).mood, 'calm', '12% of 5 minutes is 36 seconds');
  assert.equal(atmosphereFor({ live: true, myClockSec: 0, baseSec: 60 }).strength, 1);
  const up = '4k3/8/8/8/8/8/8/R3K3 w - - 0 1';
  assert.equal(atmosphereFor({ live: true, fen: up, myColor: 'w' }).mood, 'lead'); assert.equal(atmosphereFor({ live: true, fen: up, myColor: 'b' }).mood, 'fall');
  assert.equal(tensionFor({}), 0); assert.equal(tensionFor({ plies: 200, inCheck: true, recentCaptures: 9, storm: 1 }), 1);
  assert.ok(tensionFor({ plies: 30 }) < tensionFor({ plies: 30, inCheck: true }));
});

// ---- The Vanta Campaign ----
test('campaign: five realms, each opened by the boss before it', () => {
  assert.equal(REALMS.length, 5); assert.equal(MAX_STARS, 45);
  for (const r of REALMS) {
    assert.ok(relicById(r.relic), `${r.id} relic`); assert.ok(MUSIC_KEYS[r.music], `${r.id} music`);
    assert.equal(r.battles.length, 3); assert.equal(r.battles.filter(b => b.boss).length, 1); assert.ok(r.battles[2].boss && r.battles[2].twist);
    assert.ok(['standard', 'blackout', 'dark', 'shadow', 'freestyle'].includes(r.battles[2].rules));
  }
  let st = loadCampaign(memory());
  assert.ok(realmOpen(st, 0)); assert.ok(!realmOpen(st, 1)); assert.ok(battleOpen(st, 0, 0)); assert.ok(!battleOpen(st, 0, 1));
  st = recordBattle(st, 'ashen', 0, { score: 1, plies: 120 }).state; assert.ok(battleOpen(st, 0, 1));
  st = recordBattle(st, 'ashen', 1, { score: 1, plies: 60, oath: 'fulfilled' }).state;
  const boss = recordBattle(st, 'ashen', 2, { score: 1, plies: 70 });
  assert.equal(boss.freed.id, 'ashen'); assert.equal(boss.stars, 2); st = boss.state;
  assert.ok(realmFreed(st, 'ashen')); assert.ok(realmOpen(st, 1)); assert.equal(realmsFreed(st), 1);
  assert.equal(recordBattle(st, 'ashen', 2, { score: 1, plies: 200 }).freed, null, 'a realm is freed once');
  assert.equal(recordBattle(st, 'ashen', 2, { score: 1, plies: 200 }).state.won[battleKey('ashen', 2)].stars, 2, 'your best stars are kept');
  assert.equal(totalStars(st), 1 + 3 + 2);
  assert.equal(recordBattle(st, 'tidal', 0, { score: 0.5 }).stars, 0, 'a draw is not a victory');
  assert.equal(starsFor({ score: 1, plies: 80, oath: 'fulfilled' }), 3); assert.equal(starsFor({ score: 0 }), 0);
});
test('campaign: progress survives a reload, junk does not', () => {
  const store = memory();
  saveCampaign(recordBattle(loadCampaign(store), 'ashen', 0, { score: 1, plies: 50 }).state, store);
  assert.equal(loadCampaign(store).won['ashen-0'].stars, 2);
  store.setItem('vch.campaign', JSON.stringify({ won: { 'ashen-0': { stars: 3 }, 'evil-9': { stars: 3 }, 'tidal-1': { stars: 'x' } }, pending: { realm: 'nowhere' } }));
  assert.deepEqual(Object.keys(loadCampaign(store).won), ['ashen-0']); assert.equal(loadCampaign(store).pending, null);
});
test('relics: the campaign and oath relics are full sets', () => {
  assert.equal(RELICS.length, 13);
  for (const id of ['oathbound', 'paladin', 'ashen', 'tidal', 'court', 'crown', 'eclipse']) {
    const r = relicById(id); assert.ok(r && r.how && r.wallpaper, id);
    for (const k of ['--light', '--dark', '--mint', '--gold']) assert.match(r.theme[k], /^#[0-9a-f]{6}$/, `${id} ${k}`);
  }
});

// ---- Adaptive music ----
test('music: each theme has its key, chords are triads in that key', () => {
  assert.equal(midiHz(69), 440); assert.equal(Math.round(midiHz(81)), 880);
  assert.deepEqual(chordFor('vanta', 0), [50, 53, 57], 'D minor');
  assert.deepEqual(chordFor('gilded', 0), [53, 57, 60], 'F major (lydian)');
  assert.deepEqual(chordFor('vanta', 4), chordFor('vanta', 0), 'the progression loops every four bars');
  assert.deepEqual(chordFor('nope', 1), chordFor('vanta', 1));
  for (const key of Object.values(KEY_FOR_THEME)) assert.ok(MUSIC_KEYS[key], key);
  for (const r of RELICS) assert.ok(KEY_FOR_THEME[r.id], `${r.id} has a key`);
  const store = memory(); assert.deepEqual(loadMusic(store), { on: false, volume: 0.5 }, 'off unless you turn it on');
  saveMusic({ on: true, volume: 2 }, store); assert.deepEqual(loadMusic(store), { on: true, volume: 1 });
});
class FakeParam { constructor() { this.value = 0; this.events = []; } setValueAtTime(v, t) { this.events.push(['set', v, t]); } setTargetAtTime(v, t) { this.events.push(['target', v, t]); this.value = v; } exponentialRampToValueAtTime(v, t) { this.events.push(['ramp', v, t]); } cancelScheduledValues() {} }
class FakeNode { constructor(ctx) { this.ctx = ctx; this.gain = new FakeParam(); this.frequency = new FakeParam(); this.Q = new FakeParam(); } connect() {} start() { this.ctx.started++; } stop() {} }
class FakeContext { constructor() { this.currentTime = 1; this.state = 'running'; this.sampleRate = 8000; this.started = 0; this.destination = {}; }
  createGain() { return new FakeNode(this); } createOscillator() { return new FakeNode(this); } createBiquadFilter() { return new FakeNode(this); } createDynamicsCompressor() { return new FakeNode(this); }
  createBufferSource() { return new FakeNode(this); } createBuffer(_c, len) { return { getChannelData: () => new Float32Array(len) }; } resume() {} }
test('music: the score schedules ahead, grows with tension and ends with a sting', () => {
  const timers = { setInterval: () => 1, clearInterval() {}, setTimeout: fn => fn() };
  const score = new VantaScore({ AudioContextClass: FakeContext, timers });
  assert.equal(score.start(), true); assert.ok(score.playing);
  const calm = score.ctx.started;
  assert.ok(calm > 0, 'the pad starts at once');
  score.setTension(1); score.setStorm(1); score.ctx.currentTime += 2; score.schedule();
  assert.ok(score.ctx.started > calm, 'arpeggio and drums join in'); assert.equal(score.bpm, 102);
  score.stop(); assert.equal(score.playing, false);
  assert.equal(score.master.gain.value, 0, 'stopped music stays silent');
  const before = score.ctx.started; score.sting('win'); assert.equal(score.ctx.started - before, 5);
  assert.ok(score.stings && score.stings !== score.master, 'the sting has its own bus, so the fade does not cut it');
  assert.equal(new VantaScore({ AudioContextClass: null }).start(), false, 'no Web Audio, no music');
});

// ---- Wiring in the app ----
test('round 12 is wired into the app', () => {
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
  assert.match(main, /roundElevenGameOver\(info\);roundTwelveGameOver\(info\);/);
  assert.match(main, /syncVeteranMarks\(dom,boardGame\);queueAtmosphere\(\);/);
  assert.match(main, /if\(opts\.bot\?\.campaign\)applyRealmTheme\(realmById\(opts\.bot\.campaign\.realm\)\);else restoreRealmTheme\(\);/);
  assert.match(main, /if\(blackoutActive\(\)\)return; \/\/ the lights are out/, 'the oath line does not report blind moves');
  // State the board reads while the page starts is declared before any code runs it.
  assert.ok(main.indexOf('let r12PrefsCache=null') < main.indexOf('function renderBoard('));
  assert.match(css, /body\{isolation:isolate\}/); assert.match(css, /#atmosphere\{position:fixed;inset:0;z-index:-1;pointer-events:none/);
  assert.match(css, /:root\[data-glass="clear"\] #atmosphere \*\{animation:none!important\}/, 'no animation behind blurred glass');
  assert.match(css, /prefers-reduced-motion:reduce\)\{#atmosphere \*\{animation:none!important\}/);
});
test('round 12 speaks every language', async () => {
  const { loadLanguage, translateText } = await import('../src/i18n.js');
  await Promise.all(['fr', 'es', 'pt', 'ar'].map(loadLanguage));
  assert.equal(translateText('Oath fulfilled · Oath of the Hound · +1 honor', 'fr'), 'Serment accompli · Serment du Limier · +1 d\'honneur');
  assert.equal(translateText('Knight of g1', 'es'), 'Caballo de g1');
  assert.equal(translateText('Victory · 3 of 3 stars', 'pt'), 'Vitória · 3 de 3 estrelas');
  for (const o of OATHS) for (const lang of ['fr', 'es', 'pt', 'ar']) { assert.ok(translateText(o.name, lang), `${o.name} ${lang}`); assert.ok(translateText(o.vow, lang), `${o.vow} ${lang}`); }
  for (const r of REALMS) assert.ok(translateText(r.story, 'ar'), r.id);
  for (const r of RELICS) assert.ok(translateText(r.how, 'fr'), r.how);
});
