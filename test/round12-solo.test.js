import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { RANKS, addGames, armyList, careers, countsForCareer, deeds, emptyCareers, epithetOf, forkTargets, gameDeeds, identitiesAfter, loadVeterans, pieceId, pieceName, rankOf, saveVeterans, totalsMap } from '../src/veterans.js';
import { HONOR_RELICS, OATHS, dailyOaths, loadOaths, oathById, oathStatus, oathSummary, recordOath, saveOaths } from '../src/oaths.js';
import { atmosphereFor, materialFromFen, tensionFor } from '../src/atmosphere.js';
import { MAX_STARS, REALMS, battleKey, battleOpen, loadCampaign, realmFreed, realmOpen, realmsFreed, recordBattle, saveCampaign, starsFor, totalStars } from '../src/campaign.js';
import { KEY_FOR_THEME, MAX_LEVEL, MUSIC_KEYS, VantaScore, barSeconds, chordFor, entryOf, equalPower, hideTrack, keysRelated, levelFor, likeTrack, loadMusic, loadMusicLikes, midiHz, moodFor, nextLine, partFor, pickTrack, saveMusic, saveMusicLikes, stingFor, tracksFor } from '../src/music.js';
import { DIVISIONS, LIBRARY_URL, MUSIC_BASE, PLACES, STATIONS, STINGS, checkTrack, isSting, loadLibrary, placesOf, readLibrary } from '../src/music-library.js';
import { playMoveSound, soundPlace } from '../src/move-sound.js';
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

// ---- Music ----
test('music: each theme has its key, chords are triads in that key; the setting keeps its station', () => {
  assert.equal(midiHz(69), 440); assert.equal(Math.round(midiHz(81)), 880);
  assert.deepEqual(chordFor('vanta', 0), [50, 53, 57], 'D minor');
  assert.deepEqual(chordFor('gilded', 0), [53, 57, 60], 'F major (lydian)');
  assert.deepEqual(chordFor('vanta', 4), chordFor('vanta', 0), 'the progression loops every four bars');
  assert.deepEqual(chordFor('nope', 1), chordFor('vanta', 1));
  for (const key of Object.values(KEY_FOR_THEME)) assert.ok(MUSIC_KEYS[key], key);
  for (const r of RELICS) assert.ok(KEY_FOR_THEME[r.id], `${r.id} has a key`);
  const store = memory(); assert.deepEqual(loadMusic(store), { on: false, volume: 0.5, station: 'on' }, 'off unless you turn it on');
  saveMusic({ on: true, volume: 2 }, store); assert.deepEqual(loadMusic(store), { on: true, volume: 1, station: 'on' });
  saveMusic({ on: true, volume: 0.3, station: 'opera' }, store); assert.deepEqual(loadMusic(store), { on: true, volume: 0.3, station: 'opera' });
  assert.deepEqual(STATIONS.map(s => s.id), ['on', 'cinematic', 'focus', 'opera', 'electric', 'songs', 'mix', 'liked']);
  // The volume has a ceiling (owner: "too loud"), and a curve: full is about 3 dB down.
  assert.equal(levelFor(1), MAX_LEVEL); assert.equal(levelFor(0), 0); assert.ok(MAX_LEVEL <= 0.71);
  assert.ok(levelFor(0.5) < 0.3 && levelFor(0.5) > 0.25, 'half way is a quiet bed'); assert.equal(levelFor(7), MAX_LEVEL);
  // The game's part, held a little longer once it turns so the music does not flicker.
  assert.equal(partFor(0.2, 0.5), 'storm'); assert.equal(partFor(0.6, 0), 'tense'); assert.equal(partFor(0, 0), 'calm');
  assert.equal(partFor(0.4, 0, 'calm'), 'calm'); assert.equal(partFor(0.4, 0, 'tense'), 'tense'); assert.equal(partFor(0.3, 0, 'tense'), 'calm');
  assert.equal(partFor(0, 0.25, 'storm'), 'storm'); assert.equal(partFor(0, 0.25, 'calm'), 'calm');
  // How the game is going colours the middlegame: ahead or behind; the opening stays calm, and
  // the clock comes first.
  assert.equal(partFor(0.6, 0, 'calm', 'ahead'), 'ahead'); assert.equal(partFor(0.6, 0, 'tense', 'behind'), 'behind');
  assert.equal(partFor(0.2, 0, 'calm', 'ahead'), 'calm'); assert.equal(partFor(0.6, 0.5, 'ahead', 'ahead'), 'storm');
  assert.equal(partFor(0.4, 0, 'ahead', 'ahead'), 'ahead', 'held like the tense part');
  // Ahead from three points up, behind from three down, held until it comes back within one.
  assert.equal(moodFor(3), 'ahead'); assert.equal(moodFor(2), 'even'); assert.equal(moodFor(2, 'ahead'), 'ahead'); assert.equal(moodFor(1, 'ahead'), 'even');
  assert.equal(moodFor(-3), 'behind'); assert.equal(moodFor(-2, 'behind'), 'behind'); assert.equal(moodFor(-1, 'behind'), 'even'); assert.equal(moodFor(-2, 'ahead'), 'even');
});

const LIB = [
  { id: 'menus', title: 'Menus', file: 'menus.mp3', station: 'cinematic', place: 'lobby' },
  { id: 'calm', title: 'Calm', file: 'calm.mp3', station: 'cinematic', place: 'game', part: 'calm' },
  { id: 'calm-ember', title: 'Calm Ember', file: 'calm-ember.mp3', station: 'cinematic', place: 'game', part: 'calm', theme: 'ember' },
  { id: 'tense', title: 'Tense', file: 'tense.mp3', station: 'cinematic', place: 'game', part: 'tense' },
  { id: 'storm', title: 'Storm', file: 'storm.mp3', station: 'cinematic', place: 'game', part: 'storm' },
  { id: 'think', title: 'Think', file: 'think.mp3', station: 'focus', place: 'focus' },
  { id: 'aria', title: 'Aria', file: 'aria.mp3', station: 'opera', place: 'boss' },
  { id: 'funk', title: 'Funk', file: 'funk.mp3', station: 'electric', place: ['blitz', 'lobby'] },
  { id: 'chair', title: 'Chair', file: 'chair.mp3', station: 'songs', place: 'lobby' },
  { id: 'stove', title: 'Stove', file: 'stove.mp3', station: 'songs', place: 'lobby' },
  { id: 'win', title: 'Win', file: 'win.mp3', place: 'sting', part: 'win', seconds: 6 },
  { id: 'loss', title: 'Loss', file: 'loss.mp3', place: 'sting', part: 'loss', seconds: 5 },
];
test('music: the library plays what suits the moment; a station plays its own tracks in turn', () => {
  const ids = moment => tracksFor(LIB, moment).map(t => t.id);
  assert.deepEqual(ids({ place: 'lobby' }), ['menus', 'funk', 'chair', 'stove']);
  assert.deepEqual(ids({ place: 'game', part: 'tense' }), ['tense']);
  assert.deepEqual(ids({ place: 'game', part: 'calm' }), ['calm'], 'music made for another theme is left out');
  assert.deepEqual(ids({ place: 'game', part: 'calm', theme: 'ember' }), ['calm-ember'], 'a theme plays its own');
  assert.deepEqual(ids({ place: 'game', part: 'tense', theme: 'ember' }), ['calm-ember'], 'the theme\'s nearest part where it has not that one (its key and tempo)');
  assert.deepEqual(ids({ place: 'game', part: 'storm', theme: 'umbra' }), ['storm'], 'Vanta\'s for a theme with no music of its own');
  assert.deepEqual(ids({ place: 'boss' }), ['aria']); assert.deepEqual(ids({ place: 'blitz' }), ['funk']); assert.deepEqual(ids({ place: 'focus' }), ['think']);
  assert.deepEqual(ids({ station: 'songs', place: 'game', part: 'storm' }), ['chair', 'stove'], 'a station plays everywhere');
  assert.deepEqual(ids({ station: 'cinematic' }), ['menus', 'calm', 'calm-ember', 'tense', 'storm']);
  assert.deepEqual(ids({ station: 'mix' }), LIB.filter(t => t.place !== 'sting').map(t => t.id), 'Everything: all of it, no stings');
  // What a moment borrows when it has no music of its own.
  const few = LIB.filter(t => !['storm', 'think', 'aria'].includes(t.id));
  assert.deepEqual(tracksFor(few, { place: 'game', part: 'storm' }).map(t => t.id), ['tense'], 'the storm borrows the tense part');
  assert.deepEqual(tracksFor(few, { place: 'boss', part: 'tense' }).map(t => t.id), ['tense'], 'a boss borrows the game\'s');
  assert.deepEqual(tracksFor(few, { place: 'focus' }).map(t => t.id), ['menus', 'funk', 'chair', 'stove'], 'focus borrows the lobby\'s');
  assert.deepEqual(tracksFor([], { place: 'lobby' }), []);
  assert.equal(pickTrack(LIB, { place: 'lobby', after: 'menus', random: () => 0 }).id, 'funk', 'not the one just played');
  assert.equal(pickTrack(LIB, { place: 'lobby', history: ['funk', 'chair'], after: 'stove', random: () => 0 }).id, 'menus', 'nor any of the last three');
  assert.equal(pickTrack(LIB, { place: 'boss', after: 'aria' }).id, 'aria', 'the only one, again');
  assert.equal(pickTrack(LIB, { place: 'lobby', random: () => 0.99 }).id, 'stove');
  assert.equal(pickTrack([], {}), null);
  assert.equal(stingFor(LIB, 'win').id, 'win'); assert.equal(stingFor(LIB, 'draw').id, 'loss', 'a draw borrows the loss\'s');
  assert.equal(stingFor(LIB, 'checkmate').id, 'win', 'a checkmate the win\'s'); assert.equal(stingFor(LIB.slice(0, 3), 'win'), null);
});

// The library as VCH has it: your division's hall in the menus, songs between the themes, the
// win and loss music after a game, each relic set's theme, and stings of its own for a theme.
const HALLS = [
  { id: 'hall', title: 'Hall', file: 'hall.m4a', station: 'cinematic', place: 'lobby' },
  { id: 'hall-bronze', title: 'Bronze Hall', file: 'hall-bronze.m4a', station: 'cinematic', place: 'lobby', division: 'bronze' },
  { id: 'hall-gold', title: 'Gold Hall', file: 'hall-gold.m4a', station: 'cinematic', place: 'lobby', division: 'gold' },
  { id: 'song-a', title: 'Song A', file: 'song-a.m4a', station: 'songs', place: 'lobby', kind: 'song' },
  { id: 'song-b', title: 'Song B', file: 'song-b.m4a', station: 'songs', place: 'lobby', kind: 'song' },
  { id: 'won', title: 'After the Win', file: 'won.m4a', station: 'cinematic', place: 'result', part: 'win' },
  { id: 'lost', title: 'After the Loss', file: 'lost.m4a', station: 'cinematic', place: 'result', part: 'loss' },
  { id: 'relic-ember', title: 'Ember Relics', file: 'relic-ember.m4a', station: 'cinematic', place: 'skin', skin: 'ember' },
  { id: 'relic-tidal', title: 'Tidal Relics', file: 'relic-tidal.m4a', station: 'cinematic', place: 'skin', skin: 'tidal' },
  { id: 'calm', title: 'Calm', file: 'calm.m4a', station: 'cinematic', place: 'game', part: 'calm' },
  { id: 'tense', title: 'Tense', file: 'tense.m4a', station: 'cinematic', place: 'game', part: 'tense' },
  { id: 'ahead', title: 'Ahead', file: 'ahead.m4a', station: 'cinematic', place: 'game', part: 'ahead' },
  { id: 'win', title: 'Victory', file: 'win.m4a', place: 'sting', part: 'win', seconds: 8 },
  { id: 'win-ember', title: 'Ember Victory', file: 'win-ember.m4a', place: 'sting', part: 'win', theme: 'ember', seconds: 6 },
  { id: 'down', title: 'Rank down', file: 'down.m4a', place: 'sting', part: 'rank-down', seconds: 5 },
  { id: 'down-2', title: 'Rank down II', file: 'down-2.m4a', place: 'sting', part: 'rank-down', seconds: 7 },
];
test('music: your division\'s hall, songs between the themes, the music after a game and each relic set\'s', () => {
  assert.equal(readLibrary({ tracks: HALLS }).length, HALLS.length, 'every field is one the library takes');
  const ids = moment => tracksFor(HALLS, moment).map(t => t.id);
  assert.deepEqual(ids({ place: 'lobby', division: 'gold' }), ['hall-gold', 'hall'], 'your hall and the open themes (songs only on the Songs station)');
  assert.deepEqual(ids({ place: 'lobby' }), ['hall-bronze', 'hall'], 'Bronze before you have a division');
  assert.deepEqual(ids({ place: 'lobby', division: 'diamond' }), ['hall'], 'a division without a hall yet: the open ones');
  assert.deepEqual(ids({ place: 'result', part: 'win' }), ['won']); assert.deepEqual(ids({ place: 'result', part: 'loss' }), ['lost']);
  assert.deepEqual(ids({ place: 'result', part: 'draw' }), ['lost'], 'a draw: the quieter one');
  assert.deepEqual(ids({ place: 'skin', skin: 'tidal' }), ['relic-tidal']); assert.deepEqual(ids({ place: 'skin', skin: 'mirror' }), ['relic-ember', 'relic-tidal']);
  assert.deepEqual(ids({ place: 'game', part: 'ahead' }), ['ahead']); assert.deepEqual(ids({ place: 'game', part: 'behind' }), ['tense'], 'behind, without its own: tense');
  assert.ok(!ids({ station: 'mix' }).some(id => id.startsWith('relic-')), 'Everything leaves the relic themes to the Relic sets');
  // The menus never play a song; the Songs station plays them, one after another, and a song in
  // your language comes round three times as often as one in another.
  for (const r of [0, 0.2, 0.5, 0.99]) assert.notEqual(pickTrack(HALLS, { place: 'lobby', division: 'gold', random: () => r }).kind, 'song');
  assert.equal(pickTrack(HALLS, { station: 'songs', after: 'song-a', random: () => 0.9 }).id, 'song-b', 'the Songs station: songs, one after another');
  const sung = [...HALLS, { id: 'song-ko', title: '편의점 불빛', file: 'song-ko.m4a', station: 'songs', place: 'lobby', kind: 'song', lang: 'ko' }, { id: 'song-fr', title: 'Mon vieux vélo', file: 'song-fr.m4a', station: 'songs', place: 'lobby', kind: 'song', lang: 'fr' }];
  const share = (lang, id) => { let n = 0; for (let i = 0; i < 400; i++) if (pickTrack(sung, { station: 'songs', language: lang, random: () => (i + 0.5) / 400 }).id === id) n++; return n / 400; };
  assert.ok(Math.abs(share('ko', 'song-ko') - 3 / 6) < 0.01, 'Korean chosen: the Korean song half the time (3 of 6 shares)');
  assert.ok(Math.abs(share('de', 'song-ko') - 1 / 4) < 0.01, 'no song in your language: all alike');
  // A theme's own sting first; several for a moment: any one of them.
  assert.equal(stingFor(HALLS, 'win', 'ember').id, 'win-ember'); assert.equal(stingFor(HALLS, 'win', 'umbra').id, 'win');
  assert.equal(stingFor(HALLS, 'rank-down', 'vanta', () => 0).id, 'down'); assert.equal(stingFor(HALLS, 'rank-down', 'vanta', () => 0.9).id, 'down-2');
  assert.equal(stingFor(HALLS, 'rank-up').id, 'win', 'rank up borrows the win\'s');
});

test('music: what you like comes round more often; what is not for you never plays', () => {
  const store = memory();
  assert.deepEqual(loadMusicLikes(store), { liked: [], hidden: [] });
  let likes = likeTrack({ liked: [], hidden: [] }, 'menus'); likes = hideTrack(likes, 'funk'); likes = likeTrack(likes, 'funk');
  assert.deepEqual(likes, { liked: ['menus', 'funk'], hidden: [] }, 'a like undoes a Not for me');
  likes = hideTrack(likes, 'menus'); assert.deepEqual(likes, { liked: ['funk'], hidden: ['menus'] }, 'and the other way round');
  assert.deepEqual(likeTrack(likes, 'funk', false), { liked: [], hidden: ['menus'] }, 'unliked');
  saveMusicLikes({ liked: ['funk', 'funk', '../x', 7], hidden: ['menus', 'funk'] }, store);
  assert.deepEqual(loadMusicLikes(store), { liked: ['funk'], hidden: ['menus'] }, 'kept clean: no repeats, no junk, a liked track is not also hidden');
  store.setItem('vch.music.likes', '{nope'); assert.deepEqual(loadMusicLikes(store), { liked: [], hidden: [] });
  // Not for you: never chosen while anything else suits; still played when nothing else does.
  for (const r of [0, 0.3, 0.6, 0.99]) assert.notEqual(pickTrack(LIB, { place: 'lobby', likes: { hidden: ['menus'] }, random: () => r }).id, 'menus');
  assert.equal(pickTrack(LIB, { place: 'boss', likes: { hidden: ['aria'] } }).id, 'aria', 'the only one: it plays rather than silence');
  // Liked: three shares to one.
  const shares = id => { let n = 0; for (let i = 0; i < 600; i++) if (pickTrack(LIB, { place: 'lobby', likes: { liked: ['chair'] }, random: () => (i + 0.5) / 600 }).id === id) n++; return n / 600; };
  assert.ok(Math.abs(shares('chair') - 3 / 6) < 0.01, `liked: half the picks among four (${shares('chair')})`); assert.ok(Math.abs(shares('menus') - 1 / 6) < 0.01);
  // The Liked station: your liked tracks, wherever you are; until you like one, it follows the game.
  assert.deepEqual(tracksFor(LIB, { station: 'liked', place: 'game', likes: { liked: ['aria', 'chair', 'win'] } }).map(t => t.id), ['aria', 'chair'], 'no stings');
  assert.deepEqual(tracksFor(LIB, { station: 'liked', place: 'boss', likes: { liked: [] } }).map(t => t.id), ['aria']);
  // Keys: related ones may overlap as they change (the same, the relative, a fifth away; one piece).
  const k = key => ({ file: `${key}.m4a`, key });
  assert.ok(keysRelated(k('A minor'), k('C major')), 'relative'); assert.ok(keysRelated(k('D minor'), k('A minor')), 'a fifth');
  assert.ok(keysRelated(k('Bb major'), k('F major'))); assert.ok(keysRelated(k('C# minor'), k('E major')));
  assert.ok(!keysRelated(k('D minor'), k('B major')), 'far apart'); assert.ok(!keysRelated(k('C major'), k('C minor')), 'parallel keys clash');
  assert.ok(!keysRelated(k('C major'), { file: 'x.m4a' }), 'an unknown key: hand over quickly');
  assert.ok(keysRelated({ file: 'suite.m4a', key: 'D minor' }, { file: 'suite.m4a', key: 'F# major' }), 'two parts of one piece');
});

test('music: the library file is read with care', async () => {
  assert.equal(LIBRARY_URL, '/assets/vch/music/library.json'); assert.equal(MUSIC_BASE, '/assets/vch/music/');
  assert.deepEqual(readLibrary({ tracks: LIB }).map(t => t.id), LIB.map(t => t.id), 'every test track is a track');
  for (const bad of [
    { ...LIB[0], file: '../secret.mp3' }, { ...LIB[0], file: 'https://elsewhere.example/a.mp3' }, { ...LIB[0], file: 'menus.wav' }, { ...LIB[0], id: 'Menus!' },
    { ...LIB[0], title: '' }, { ...LIB[0], station: 'polka' }, { ...LIB[0], station: 'mix' }, { ...LIB[0], place: 'kitchen' }, { ...LIB[1], part: 'furious' }, { ...LIB[10], part: 'calm' },
    { ...LIB[0], theme: 'Ember' }, { ...LIB[0], division: 'wood' }, { ...LIB[0], kind: 'album' }, { ...LIB[0], skin: 'Ember' },
    { ...LIB[0], lang: 'kor' }, { ...LIB[0], key: 'H minor' }, { ...LIB[0], key: 'D' }, { ...LIB[0], station: 'liked' },
    { ...HALLS[5], part: 'calm' }, { ...LIB[0], place: 'result', part: 'storm' }, null, 'menus.mp3',
  ]) assert.equal(checkTrack(bad), null, JSON.stringify(bad));
  assert.deepEqual(readLibrary({ tracks: [LIB[0], LIB[0], { nope: 1 }] }).map(t => t.id), ['menus'], 'one of each, junk left out');
  assert.deepEqual(readLibrary(null), []); assert.deepEqual(readLibrary({ tracks: 'x' }), []);
  assert.equal(checkTrack({ ...LIB[10], seconds: 900 }).seconds, 900); assert.equal(checkTrack({ ...LIB[10], seconds: 901 }).seconds, undefined);
  // Its sound, its loudness and its beat grid: kept when sensible, dropped when not.
  const t = checkTrack({ ...LIB[0], file: 'menus.m4a', seconds: 150, start: 0.4, end: 148, gain: -2.5, bpm: 90, beat: 0.25 });
  assert.deepEqual([t.file, t.start, t.end, t.gain, t.bpm, t.beat], ['menus.m4a', 0.4, 148, -2.5, 90, 0.25]);
  assert.equal(checkTrack({ ...LIB[0], beat: 0.25 }).beat, undefined, 'a downbeat needs a tempo');
  assert.equal(checkTrack({ ...LIB[0], bpm: 300 }).bpm, undefined); assert.equal(checkTrack({ ...LIB[0], gain: 30 }).gain, undefined);
  assert.equal(checkTrack({ ...LIB[0], start: 10, end: 10.2 }).end, undefined, 'an end before its start is no end');
  const part = checkTrack({ ...LIB[0], file: 'suite.m4a', start: 61.2, end: 121.4, key: 'D minor', lang: 'ko' });
  assert.deepEqual([part.start, part.end, part.key, part.lang], [61.2, 121.4, 'D minor', 'ko'], 'a section of a longer piece, its key, a song\'s language');
  const served = body => async url => { assert.equal(url, LIBRARY_URL); return { ok: true, json: async () => body }; };
  assert.deepEqual((await loadLibrary(served({ tracks: LIB.slice(0, 2) }))).map(t => t.id), ['menus', 'calm']);
  assert.deepEqual(await loadLibrary(async () => ({ ok: false })), [], 'no library yet: the music waits');
  assert.deepEqual(await loadLibrary(async () => { throw new Error('offline'); }), []);
  assert.deepEqual(await loadLibrary(async () => ({ ok: true, json: async () => { throw new SyntaxError('the page, not JSON'); } })), []);
});

test('music: VCH\'s own library has music for every moment, made with Lyria 3.5', () => {
  const json = JSON.parse(readFileSync(new URL('../public/assets/vch/music/library.json', import.meta.url), 'utf8'));
  const tracks = readLibrary(json), music = tracks.filter(t => !isSting(t)), stings = tracks.filter(isSting);
  assert.equal(tracks.length, json.tracks.length, 'every track in library.json is well formed');
  assert.ok(music.length >= 80, `${music.length} pieces of music`);
  for (const t of json.tracks) assert.ok(existsSync(new URL(`../public/assets/vch/music/${t.file}`, import.meta.url)), `${t.file} is in public/assets/vch/music/`);
  for (const t of music) { assert.ok(t.seconds > 45 && t.end > t.start, `${t.id}: a whole piece`); assert.ok(Number.isFinite(t.gain), `${t.id}: its loudness`); assert.ok(t.bpm > 0, `${t.id}: its beat grid`); }
  for (const t of stings) assert.ok(t.seconds > 2 && t.seconds <= 10, `${t.id}: how long the music steps back`);
  // Every theme's game music, each part.
  for (const theme of Object.keys(MUSIC_KEYS)) for (const part of ['calm', 'tense', 'storm'])
    assert.ok(music.some(t => placesOf(t).includes('game') && (t.theme || 'vanta') === theme && t.part === part), `${theme} ${part}`);
  assert.ok(music.some(t => t.part === 'ahead') && music.some(t => t.part === 'behind'), 'ahead and behind');
  for (const d of DIVISIONS) assert.ok(music.filter(t => t.division === d).length >= 2, `${d}: a hall of its own`);
  for (const r of REALMS) assert.ok(music.some(t => placesOf(t).includes('boss') && t.theme === r.music), `${r.id}: its boss's opera`);
  for (const p of ['focus', 'blitz', 'result', 'skin']) assert.ok(music.some(t => placesOf(t).includes(p)), p);
  for (const st of STATIONS.filter(s => !['on', 'mix', 'liked'].includes(s.id))) assert.ok(music.some(t => t.station === st.id), `${st.id} station`);
  assert.ok(music.filter(t => t.kind === 'song').length >= 10, 'songs');
  for (const k of STINGS) assert.ok(stings.some(t => t.part === k), `a sting for ${k}`);
  assert.ok(PLACES.includes('sting'));
});

test('music: in musical time, a bar line, a downbeat and an even crossfade', () => {
  assert.equal(barSeconds({ bpm: 120 }), 2); assert.equal(barSeconds({}), 0);
  assert.equal(entryOf({ start: 0.2, bpm: 120, beat: 0.5 }), 0.5, 'the first downbeat after the sound starts');
  assert.equal(entryOf({ start: 1, bpm: 120, beat: 0.5 }), 2.5); assert.equal(entryOf({ start: 0.3 }), 0.3, 'no beat grid: where the sound starts');
  assert.equal(nextLine({ beat: 0.5 }, 3.2, 2, 0.35), 4.5, 'the next bar line, at least a moment ahead');
  assert.equal(nextLine({ beat: 0.5 }, 4.3, 2, 0.35), 6.5); assert.equal(nextLine({}, 3.2, 0.5), 3.5); assert.equal(nextLine({}, 1, 0), null);
  const rise = equalPower(0.8, 1), fall = equalPower(0.8, -1);
  assert.equal(rise[0], 0); assert.ok(Math.abs(rise.at(-1) - 0.8) < 1e-6); assert.ok(Math.abs(fall[0] - 0.8) < 1e-6); assert.ok(Math.abs(fall.at(-1)) < 1e-6);
  for (let i = 0; i < rise.length; i++) assert.ok(Math.abs(rise[i] ** 2 + fall[i] ** 2 - 0.64) < 1e-6, 'the same loudness all the way through');
});

class FakeParam { constructor() { this.value = 0; this.events = []; } setValueAtTime(v, t) { this.events.push(['set', v, t]); } linearRampToValueAtTime(v, t) { this.events.push(['linear', v, t]); } setTargetAtTime(v, t) { this.events.push(['target', v, t]); this.value = v; } exponentialRampToValueAtTime(v, t) { this.events.push(['ramp', v, t]); } cancelScheduledValues() {} }
// A context with value curves (the crossfades are equal-power curves).
class CurveParam extends FakeParam { setValueCurveAtTime(values, t, len) { this.events.push(['curve', [...values], t, len]); } }
class FakeNode { constructor(ctx, kind = 'node') { this.ctx = ctx; this.kind = kind; this.gain = new ctx.Param(); this.frequency = new ctx.Param(); this.Q = new ctx.Param(); this.detune = new ctx.Param(); this.outputs = []; } connect(n) { this.outputs.push(n); return n; } start() { this.ctx.started++; } stop() {} }
class FakeContext { constructor() { this.currentTime = 1; this.state = 'running'; this.sampleRate = 8000; this.started = 0; this.destination = {}; this.panners = []; this.Param = FakeParam; }
  createGain() { return new FakeNode(this, 'gain'); } createOscillator() { return new FakeNode(this, 'osc'); } createBiquadFilter() { return new FakeNode(this, 'filter'); } createDynamicsCompressor() { return new FakeNode(this, 'comp'); }
  createBufferSource() { return new FakeNode(this, 'source'); } createBuffer(_c, len) { return { getChannelData: () => new Float32Array(len) }; } resume() {} }
// A browser's context: places around you (HRTF panners), tracks played through it (media
// elements) and a listening tap whose spectrum the test sets.
class RoomContext extends FakeContext {
  constructor() { super(); this.Param = CurveParam; }
  createPanner() { const p = new FakeNode(this, 'panner'); for (const k of ['positionX', 'positionY', 'positionZ']) p[k] = new FakeParam(); this.panners.push(p); return p; }
  createMediaElementSource(el) { const n = new FakeNode(this, 'media'); n.el = el; return n; }
  createAnalyser() { const a = new FakeNode(this, 'analyser'); a.frequencyBinCount = 256; a.fill = d => d.fill(0); a.getByteFrequencyData = d => a.fill(d); return a; }
}
class FakeAudio {
  constructor() { this.src = ''; this.paused = true; this.currentTime = 0; this.duration = NaN; this.error = null; this.on = {}; this.loads = 0; }
  play() { this.paused = false; return Promise.resolve(); } pause() { this.paused = true; } load() { this.loads++; }
  canPlayType(type) { return /mpeg|mp4/.test(type) ? 'probably' : ''; }
  addEventListener(type, fn) { (this.on[type] ||= []).push(fn); } fire(type) { for (const fn of this.on[type] || []) fn(); }
}
// Where a gain is heading: the end of its last curve or ramp.
const target = param => { const e = param.events.filter(x => x[0] === 'linear' || x[0] === 'curve').at(-1); return e ? (e[0] === 'curve' ? e[1].at(-1) : e[1]) : undefined; };
const curve = param => param.events.filter(x => x[0] === 'curve').at(-1);
const player = (options = {}) => {
  const later = [], clock = { now: 0 };
  const score = new VantaScore({ AudioContextClass: RoomContext, AudioElement: FakeAudio, timers: { setInterval: () => 1, clearInterval() {}, setTimeout: (fn, ms) => later.push(Object.assign(fn, { ms })) }, tracks: LIB, base: '/m/', random: () => 0, clock: () => clock.now, ...options });
  const notes = []; score.onNote(ev => notes.push(ev));
  return { score, notes, clock, later, flush: () => later.splice(0).forEach(fn => fn()) };
};

test('music: the player crossfades real tracks and follows you, the game\'s part and the station', () => {
  assert.equal(player({ tracks: [] }).score.start(), false, 'no tracks yet: no music');
  assert.equal(player({ AudioContextClass: null }).score.start(), false, 'no Web Audio, no music');
  assert.equal(player({ AudioElement: class extends FakeAudio { canPlayType() { return ''; } } }).score.available, false, 'a browser that cannot play the files does not try');
  const { score, notes, clock, flush } = player();
  assert.equal(score.start(), true); assert.ok(score.playing);
  assert.equal(score.decks.length, 3, 'three decks: a quick second change never cuts a fading track');
  const [a, b] = score.decks;
  assert.equal(score.nowPlaying.id, 'menus', 'the menus\' music'); assert.equal(a.el.src, '/m/menus.mp3'); assert.equal(a.el.paused, false);
  assert.equal(target(a.gain.gain), 1); assert.equal(target(score.master.gain), levelFor(0.5), 'up to the volume, under its ceiling');
  assert.equal(curve(a.gain.gain)[3], 1.2, 'from silence it fades in');
  assert.deepEqual([notes.at(-1).kind, notes.at(-1).track], ['chord', 'menus'], 'the room hears each new track');
  // A game begins: its calm part on the next bar line, the menus fading out just before it (their
  // keys are unknown, so the two never overlap).
  clock.now = 1000; score.setPlace('game', true);
  assert.equal(score.nowPlaying.id, 'calm'); assert.equal(b.el.src, '/m/calm.mp3'); assert.equal(target(a.gain.gain), 0); assert.equal(target(b.gain.gain), 1);
  assert.ok(curve(a.gain.gain)[2] + curve(a.gain.gain)[3] <= curve(b.gain.gain)[2] + 1e-9, 'the old one is gone when the new one starts');
  flush(); assert.equal(a.el.paused, true, 'the faded deck stops'); assert.equal(b.el.paused, false);
  // The game grows tense: the music follows once the calm part has played ten seconds.
  clock.now = 2000; score.setTension(0.9);
  assert.equal(score.part, 'tense'); assert.equal(score.nowPlaying.id, 'calm', 'not yet');
  clock.now = 11500; score.tick(); assert.equal(score.nowPlaying.id, 'tense');
  score.setTension(0.4); assert.equal(score.part, 'tense', 'a small dip does not bring the calm back');
  score.setTension(0.2); assert.equal(score.part, 'calm'); assert.equal(score.nowPlaying.id, 'tense', 'and not at once');
  // The storm (your clock running out) comes in at once.
  clock.now = 12000; score.setStorm(1); assert.equal(score.nowPlaying.id, 'storm');
  flush();
  // In a game the next track loads twenty seconds before the end and comes in on the bar line
  // before the last one, so the music runs on.
  clock.now = 40000;
  const deck = score.active, other = score.spare();
  deck.el.duration = 100; deck.el.currentTime = 70; score.tick(); assert.equal(score.next, null, 'not yet');
  deck.el.currentTime = 85; score.tick();
  assert.equal(score.next.id, 'storm', 'the only storm, again'); assert.equal(other.el.src, '/m/storm.mp3'); assert.equal(other.el.loads, 1);
  other.el.currentTime = 3; deck.el.currentTime = 97; score.tick(); assert.equal(score.active, deck, 'not yet: more than a bar left');
  deck.el.currentTime = 97.6; score.tick();
  assert.equal(score.active, other); assert.equal(other.el.currentTime, 0, 'from the top'); assert.equal(target(deck.gain.gain), 0);
  flush();
  // A station plays its own tracks wherever you are; a track that will not load is skipped.
  score.setStation('songs'); assert.equal(score.nowPlaying.id, 'chair');
  score.active.el.fire('error'); assert.equal(score.nowPlaying.id, 'stove');
  score.active.el.fire('playing'); score.active.el.fire('error'); assert.equal(score.nowPlaying.id, 'chair', 'once it plays, it may fail again');
  for (let k = 0; k < 3; k++) score.active.el.fire('error');
  assert.equal(score.playing, false, 'when none will load (offline), the music stops trying');
  assert.equal(score.start(), false, 'for a minute'); clock.now += 61000; assert.equal(score.start(), true);
  // Paused (Music off, a hidden tab) and back: the same track carries on where it was.
  flush(); const now = score.active, el = now.el; el.currentTime = 42;
  score.stop(); assert.equal(target(score.master.gain), 0); flush(); assert.equal(el.paused, true);
  score.start(); assert.equal(score.active, now); assert.equal(el.currentTime, 42); assert.equal(el.paused, false);
  // Back to following the game: the station's music gives way.
  score.setStation('on'); assert.equal(score.nowPlaying.id, 'storm');
  score.setTracks([]); assert.equal(score.available, false);
});

// Tracks with beat grids, as the real library has them.
const GRID = [
  { id: 'menus', title: 'Menus', file: 'menus.m4a', station: 'cinematic', place: 'lobby', bpm: 120, beat: 0.5, start: 0.2, gain: -6 },
  { id: 'study', title: 'Study', file: 'study.m4a', station: 'focus', place: 'focus', bpm: 90, beat: 0.25 },
  { id: 'calm', title: 'Calm', file: 'calm.m4a', station: 'cinematic', place: 'game', part: 'calm', bpm: 120, beat: 0 },
  { id: 'tense', title: 'Tense', file: 'tense.m4a', station: 'cinematic', place: 'game', part: 'tense', bpm: 120, beat: 1 },
  { id: 'storm', title: 'Storm', file: 'storm.m4a', station: 'cinematic', place: 'game', part: 'storm', bpm: 120, beat: 0 },
  { id: 'won', title: 'After the Win', file: 'won.m4a', station: 'cinematic', place: 'result', part: 'win', bpm: 80, beat: 0 },
  { id: 'lost', title: 'After the Loss', file: 'lost.m4a', station: 'cinematic', place: 'result', part: 'loss', bpm: 72, beat: 0 },
  { id: 'win', title: 'Victory', file: 'win.m4a', place: 'sting', part: 'win', seconds: 8, gain: 2 },
];
test('music: changes land on the bar line, wait to be sure you are staying, and never cut a fading track', () => {
  const { score, clock, later, flush } = player({ tracks: GRID });
  score.start(); const [a, b, c] = score.decks;
  assert.equal(a.el.currentTime, 0.5, 'it starts on its first downbeat'); assert.ok(Math.abs(target(a.gain.gain) - 10 ** (-6 / 20)) < 1e-6, 'at its own loudness');
  // Passing through a page: the music waits a moment, and stays when you come back.
  clock.now = 5000; score.setPlace('focus'); assert.equal(score.nowPlaying.id, 'menus', 'not at once');
  score.setPlace('lobby'); flush(); assert.equal(score.nowPlaying.id, 'menus', 'you were only passing through');
  // Staying: the study music comes in on the menus' next bar line. The menus are 3.2 s in (bars
  // at 0.5, 2.5, 4.5 ...): the line is 1.3 s away, and the study music (first downbeat 0.25 s
  // in) starts silently 0.25 s before it, so its downbeat lands on the line.
  a.el.currentTime = 3.2; score.setPlace('focus'); assert.equal(later.at(-1).ms, 1200, 'a moment to be sure'); later.pop()();
  assert.equal(score.nowPlaying.id, 'study'); assert.equal(b.el.src, '/m/study.m4a');
  // Their keys are unknown: a quick handover, the menus fading out in the 0.8 s before the line.
  const now = score.ctx.currentTime, fadeIn = curve(b.gain.gain), fadeOut = curve(a.gain.gain);
  assert.ok(Math.abs(fadeIn[2] - (now + 1.3)) < 1e-9, 'the study music on the bar line');
  assert.ok(Math.abs(fadeOut[2] - (now + 0.5)) < 1e-9 && fadeOut[3] === 0.8, 'the menus gone by then');
  assert.equal(fadeIn[3], 0.12, 'in at once'); assert.equal(fadeIn[1][0], 0); assert.equal(b.el.currentTime, 0); assert.equal(b.el.paused, true, 'silent until its lead-in');
  assert.ok(later.some(fn => Math.abs(fn.ms - 1050) < 1e-6), 'it starts 0.25 s before the line');
  assert.ok(!a.filter.frequency.events.some(([k]) => k === 'ramp'), 'no sweep: nothing overlaps');
  // Another change at once (before the menus have faded): the third deck, the menus untouched.
  score.setPlace('game', true);
  assert.equal(score.nowPlaying.id, 'calm'); assert.equal(score.active, c); assert.equal(a.el.src, '/m/menus.m4a', 'still fading');
  // And another: the oldest deck steps back in a tenth of a second before it takes the new track.
  score.setPlace('result', true);
  assert.equal(score.active, a); assert.equal(a.el.src, '/m/menus.m4a', 'not cut'); assert.equal(target(a.gain.gain), 1, 'heading for the new track\'s level after its step back');
  assert.ok(a.gain.gain.events.some(([k, v]) => k === 'linear' && v === 0), 'the step back');
  flush(); assert.equal(a.el.src, '/m/won.m4a', 'then the new track'); assert.equal(score.nowPlaying.id, 'won', 'after a win, the win music');
  score.setResult('loss'); flush(); assert.equal(score.nowPlaying.id, 'lost');
  // In a game the part turns on the bar too, and stays bright (one piece); the storm comes in on
  // the next beat.
  score.setPlace('game', true); flush(); const calm = score.active; calm.el.currentTime = 0.7;
  const swept = calm.filter.frequency.events.length;
  clock.now = 30000; score.setTension(0.9); assert.equal(score.nowPlaying.id, 'tense');
  assert.ok(!calm.filter.frequency.events.slice(swept).some(([k]) => k === 'ramp'), 'no muffling between a game\'s parts');
  assert.ok(Math.abs(curve(score.active.gain.gain)[2] - (score.ctx.currentTime + 1.3)) < 1e-9, 'the next bar line (2 s) of the calm part');
  flush(); const tense = score.active; tense.el.currentTime = 4.1;
  clock.now = 31000; score.setStorm(1); assert.equal(score.nowPlaying.id, 'storm');
  const stormIn = curve(score.active.gain.gain), stormOut = curve(tense.gain.gain);
  assert.ok(Math.abs(stormIn[2] - (score.ctx.currentTime + 0.4)) < 1e-9, 'on the next beat (beats at 4.0, 4.5 ...: 4.5 s)'); assert.equal(stormIn[3], 0.12, 'at once');
  assert.ok(Math.abs(stormOut[2] + stormOut[3] - (score.ctx.currentTime + 0.4)) < 1e-9 && stormOut[3] <= 0.35, 'the tense part out just before it');
});

// Tracks with keys: related ones overlap for a bar; the menus play like an album.
const KEYED = [
  { id: 'hall-a', title: 'Hall A', file: 'hall-a.m4a', station: 'cinematic', place: 'lobby', bpm: 120, beat: 0.5, start: 0.2, end: 100, key: 'D minor' },
  { id: 'hall-b', title: 'Hall B', file: 'hall-b.m4a', station: 'cinematic', place: 'lobby', bpm: 90, beat: 0, start: 0.4, key: 'F major' },
  { id: 'study', title: 'Study', file: 'study.m4a', station: 'focus', place: 'focus', bpm: 120, beat: 0, key: 'A minor' },
  { id: 'calm', title: 'Calm', file: 'suite.m4a', station: 'cinematic', place: 'game', part: 'calm', bpm: 120, beat: 0, start: 0, end: 60, key: 'D minor' },
  { id: 'tense', title: 'Tense', file: 'suite.m4a', station: 'cinematic', place: 'game', part: 'tense', bpm: 120, beat: 60, start: 60, end: 120, key: 'D minor' },
  { id: 'win', title: 'Victory', file: 'win.m4a', place: 'sting', part: 'win', seconds: 6 },
];
test('music: related keys overlap for a bar, a suite\'s parts hand over in place, and the menus play like an album', () => {
  const { score, clock, later, flush } = player({ tracks: KEYED });
  score.start(); const a = score.active;
  assert.equal(score.nowPlaying.id, 'hall-a');
  // Into the focus music (A minor, a fifth from D minor): one bar's equal-power crossfade, the old
  // music sinking away as it goes.
  a.el.currentTime = 3.2; clock.now = 5000; score.setPlace('focus'); later.pop()();
  const b = score.active, now = score.ctx.currentTime;
  assert.equal(score.nowPlaying.id, 'study');
  assert.ok(Math.abs(curve(b.gain.gain)[2] - (now + 1.3)) < 1e-9 && curve(b.gain.gain)[3] === 2, 'in over a bar from the line');
  assert.ok(Math.abs(curve(a.gain.gain)[2] - (now + 1.3)) < 1e-9 && curve(a.gain.gain)[3] === 2, 'out over the same bar');
  assert.ok(a.filter.frequency.events.some(([k, v]) => k === 'ramp' && v === 600), 'sinking into the distance');
  flush();
  // A game: its calm part starts on its downbeat; the tense part of the same piece takes over on
  // the bar line, overlapping for a bar (one piece, one key), and starting where its part begins.
  clock.now = 9000; score.setPlace('game', true); flush();
  const calm = score.active; calm.el.currentTime = 10.7;
  clock.now = 30000; score.setTension(0.9);
  assert.equal(score.nowPlaying.id, 'tense'); assert.ok(Math.abs(score.active.el.currentTime - (60 - 1.3)) < 1e-9, 'its part: silently from just before its first downbeat, which lands on the line');
  assert.equal(curve(score.active.gain.gain)[3], 2, 'a bar\'s overlap');
  // In a game the part's end runs straight on into the same part again.
  flush(); const t1 = score.active; t1.el.duration = 180; t1.el.currentTime = 117; clock.now = 60000; score.tick();
  assert.equal(score.active, t1, 'more than a bar left'); t1.el.currentTime = 117.6; score.tick();
  assert.notEqual(score.active, t1); assert.equal(score.nowPlaying.id, 'tense', 'again, on the bar line');
  // The menus play like an album: to the very end, a pause, then the next from its beginning.
  clock.now = 90000; score.setPlace('lobby', true); flush();
  const hall = score.active, hallId = score.nowPlaying.id; hall.el.duration = 200;
  hall.el.currentTime = (hall.track.end || 200) - 1; clock.now = 120000; score.tick();
  assert.equal(score.active, hall, 'it plays to its end');
  hall.el.currentTime = (hall.track.end || 200) - 0.05; score.tick();
  const next = score.active; assert.notEqual(next, hall); assert.notEqual(score.nowPlaying.id, hallId, 'the other hall');
  assert.equal(next.el.currentTime, next.track.start, 'from its own beginning'); assert.equal(next.el.paused, true, 'after a pause');
  assert.ok(later.some(fn => Math.abs(fn.ms - 1600) < 1), 'a pause of 1.6 s');
});

test('music: Next, Not for me, a chosen track, and what comes next', () => {
  const { score, clock, flush } = player({ tracks: KEYED });
  score.start(); flush(); clock.now = 5000;
  assert.equal(score.nowPlaying.id, 'hall-a'); assert.equal(score.upcoming.id, 'hall-b', 'what comes next'); assert.equal(score.upcoming, score.upcoming, 'kept until it plays');
  assert.equal(score.skip(), true); assert.equal(score.nowPlaying.id, 'hall-b', 'Next'); flush();
  // Not for me: that track gives way at once and is not chosen again.
  score.setLikes({ liked: [], hidden: ['hall-b'] }); assert.equal(score.nowPlaying.id, 'hall-a'); flush();
  assert.equal(score.upcoming.id, 'hall-a', 'only the other one comes round');
  // A track chosen from the list plays now, wherever you are, until you go somewhere else.
  assert.equal(score.playNow('study'), true); assert.equal(score.nowPlaying.id, 'study'); flush();
  score.setTension(0.1); score.update('switch'); assert.equal(score.nowPlaying.id, 'study', 'it stays');
  score.setPlace('game', true); assert.equal(score.nowPlaying.id, 'calm', 'a game: the game\'s music');
  assert.equal(score.playNow('nope'), false); assert.equal(score.playNow('win'), false, 'not a sting');
  // The Liked station: what you liked, and nothing else.
  score.setLikes({ liked: ['study'], hidden: [] }); score.setStation('liked'); assert.equal(score.nowPlaying.id, 'study');
});

test('music: a dialog muffles the music, and a sting steps it back', () => {
  const { score, notes } = player({ tracks: GRID });
  score.start();
  score.muffle(1);
  assert.ok(Math.abs(score.muffleFilter.frequency.value - 900) < 1e-6, 'as if behind a door'); assert.ok(Math.abs(score.muffleGain.gain.value - 0.7) < 1e-9);
  score.muffle(0); assert.equal(score.muffleFilter.frequency.value, 20000); assert.equal(score.muffleGain.gain.value, 1);
  const before = score.master.gain.events.length;
  assert.equal(score.sting('win'), true); assert.equal(score.stingDeck.el.src, '/m/win.m4a'); assert.equal(score.stingDeck.el.paused, false);
  assert.ok(score.stings !== score.master, 'the sting has its own bus, so the music can step back under it');
  const steps = score.master.gain.events.slice(before);
  assert.ok(steps.some(([k, v]) => k === 'linear' && v === 0), 'the sting plays alone: the music steps out');
  assert.ok(steps.some(([k, v]) => k === 'linear' && Math.abs(v - levelFor(0.5)) < 1e-9), 'and comes back after');
  assert.deepEqual([notes.at(-1).kind, notes.at(-1).result], ['sting', 'win']);
  const n = score.master.gain.events.length; score.setVolume(0.5); assert.equal(score.master.gain.events.length, n, 'the same volume again does not cut the step back short');
  score.setVolume(0.6); assert.ok(score.master.gain.events.length > n);
  assert.equal(player({ tracks: LIB.slice(0, 2) }).score.sting('win'), false, 'no sting in the library: nothing');
});

test('music: the room hears every beat', () => {
  const { score, notes } = player();
  score.start();
  // Listening: a rise through the middle of the spectrum is a beat; one in the low end (under
  // 200 Hz: the first twelve bins here) is a drum; every sixteenth beat starts a phrase.
  const a = score.analyser, ctx = score.ctx, kinds = () => notes.slice(start).map(n => n.kind);
  let start = notes.length, level = 60, lows = 60;
  a.fill = d => { d.fill(level); for (let i = 1; i < 13; i++) d[i] = lows; };
  const frame = () => { ctx.currentTime += 0.04; score.listen(); };
  for (let k = 0; k < 40; k++) frame(); // the sound starting is itself an onset
  start = notes.length; for (let k = 0; k < 40; k++) frame();
  assert.deepEqual(kinds(), [], 'a steady sound has no beat');
  level = 120; frame(); assert.deepEqual(kinds(), ['beat']);
  level = 60; for (let k = 0; k < 60; k++) frame();
  start = notes.length; level = 120; lows = 120; frame(); assert.deepEqual(kinds(), ['drum'], 'both at once: the drum leads');
  level = 60; lows = 60; for (let k = 0; k < 60; k++) frame();
  start = notes.length; lows = 255; frame(); assert.deepEqual(kinds(), ['drum'], 'the low end: a drum');
  assert.ok(notes.at(-1).strength > 0 && notes.at(-1).strength <= 1);
  // Two onsets closer than a fifth of a second count once; the bar a beat must clear follows the
  // music, so just after loud ones a soft one is not heard, though alone it is.
  lows = 60; frame(); lows = 255; frame(); assert.deepEqual(kinds(), ['drum'], 'once');
  lows = 60; for (let k = 0; k < 6; k++) frame(); lows = 80; frame(); assert.deepEqual(kinds(), ['drum'], 'a soft one after loud ones');
  lows = 60; for (let k = 0; k < 60; k++) frame();
  start = notes.length; lows = 80; frame(); assert.deepEqual(kinds(), ['drum'], 'the same soft one, alone');
  score.setPlace('game', true); score.setStorm(1); lows = 60; for (let k = 0; k < 30; k++) frame();
  start = notes.length; lows = 255; frame(); assert.deepEqual(kinds().filter(k => k !== 'chord'), ['heartbeat'], 'in the storm, a heartbeat');
  start = notes.length;
  for (let n = 0; n < 16; n++) { lows = 60; for (let k = 0; k < 8; k++) frame(); lows = 255; frame(); }
  assert.equal(kinds().filter(k => k === 'heartbeat').length, 16, 'a steady drum: every stroke');
  assert.ok(kinds().includes('chord'), 'every sixteenth beat, a phrase');
  assert.equal(score.readSpectrum().length, 256, 'Resonance reads the same spectrum');
  assert.equal(score.eighth, score.beats * 2 + 1); assert.deepEqual(score.chord, chordFor('vanta', score.beats >> 4));
  score.stop(); assert.equal(score.readSpectrum(), null);
});
test('music: moves are heard where they land', () => {
  const ctx = new RoomContext();
  assert.deepEqual(soundPlace(-1, -1), [-1.4, -0.5, -0.9], 'the near left corner: left, close');
  assert.deepEqual(soundPlace(1, 1), [1.4, -0.5, -2.7], 'the far right corner: right, further away');
  const placed = playMoveSound(ctx, { place: soundPlace(0.5, 0.2) });
  assert.equal(placed.kind, 'panner'); assert.equal(placed.panningModel, 'HRTF'); assert.equal(placed.positionX.value, 0.7);
  const plain = ctx.started; playMoveSound(ctx, {}); const one = ctx.started - plain;
  const before = ctx.started; playMoveSound(ctx, { capture: true, check: true });
  assert.ok(ctx.started - before > one * 2, 'a capture knocks twice, a check rings');
  assert.equal(playMoveSound(new FakeContext(), { place: [1, 0, -2] }).kind, 'gain', 'no panner: straight out');
});

// ---- Wiring in the app ----
test('round 12 is wired into the app', () => {
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
  assert.match(main, /roundElevenGameOver\(info\);const stung=roundTwelveGameOver\(info\);/);
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
  for (const st of STATIONS) for (const lang of ['fr', 'es', 'pt', 'ar']) assert.ok(translateText(st.name, lang), `${st.name} ${lang}`);
  assert.equal(translateText('Now playing · The Quiet Board', 'fr'), 'En cours de lecture · The Quiet Board', 'a track keeps its title');
  assert.ok(translateText('The music library is on its way', 'ar'));
});
