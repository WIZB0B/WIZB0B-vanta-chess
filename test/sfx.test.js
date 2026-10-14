import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { PIECE_SETS, PIECE_SOUNDS, SET_FOR_RELIC, SFX_BASE, SFX_URL, SoundBank, UI_PRIORITY, UI_SOUNDS, moveSoundName, readManifest, uiGate } from '../src/sfx.js';
import { MenuController } from '../src/menus.js';
import { RELICS } from '../src/relics.js';

const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const moves = sans => { const c = new Chess(); return sans.map(s => c.move(s)); };

test('sfx: every move has its sound: the piece, a capture, castling, a promotion, a check, a mate', () => {
  const [e4, e5, nf3, nc6, bc4, bc5, oo] = moves(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'O-O']);
  assert.deepEqual([e4, e5, nf3, nc6, bc4, bc5].map(moveSoundName), ['pawn', 'pawn', 'knight', 'knight', 'bishop', 'bishop']);
  assert.equal(moveSoundName(oo), 'castle');
  const line = moves(['e3', 'e6', 'Qf3', 'Qf6', 'Ke2', 'Ke7', 'a4', 'a5', 'Ra3', 'Ra6']);
  assert.deepEqual([line[2], line[4], line[8], line[6]].map(moveSoundName), ['queen', 'king', 'rook', 'pawn']);
  const ex = moves(['e4', 'd5', 'exd5'])[2]; assert.equal(moveSoundName(ex), 'capture');
  const mate = moves(['f3', 'e5', 'g4', 'Qh4#'])[3]; assert.equal(moveSoundName(mate), 'mate');
  const check = moves(['e4', 'f5', 'Qh5+'])[2]; assert.equal(moveSoundName(check), 'check', 'a check is heard before what made it');
  const promo = new Chess('8/4P3/8/8/8/8/k7/4K3 w - - 0 1').move('e8=Q'); assert.equal(moveSoundName(promo), 'promote');
  // Moves from the server carry only their SAN.
  assert.deepEqual(['Nf3', 'Rxa8+', 'Qxf7#', 'O-O-O', 'exd6', 'b8=N', 'Ke2', 'Qd1', 'a3'].map(san => moveSoundName({ san })), ['knight', 'check', 'mate', 'castle', 'capture', 'promote', 'king', 'queen', 'pawn']);
  assert.equal(moveSoundName(null), 'pawn'); assert.equal(moveSoundName({}), 'pawn');
});

test('sfx: the sound sets are read with care', () => {
  assert.equal(SFX_BASE, '/assets/vch/sfx/'); assert.equal(SFX_URL, '/assets/vch/sfx/sfx.json');
  const m = readManifest({ sets: {
    ui: { name: 'Interface', sounds: { tap: { file: 'ui/tap.m4a' }, page: { file: 'ui/page.m4a', gain: -3 }, pawn: { file: 'ui/pawn.m4a' }, nope: { file: 'ui/nope.m4a' } } },
    wood: { name: 'Wood', sounds: { pawn: { file: 'wood/pawn.m4a', gain: 40 }, knight: { file: '../secret.m4a' }, bishop: { file: 'https://elsewhere.example/b.m4a' }, rook: { file: 'wood/rook.wav' } } },
    Bad: { sounds: { pawn: { file: 'bad/pawn.m4a' } } }, empty: { sounds: {} }, junk: null,
  } });
  assert.deepEqual(Object.keys(m.sets), ['ui', 'wood'], 'only sets with sounds, under plain names');
  assert.deepEqual(Object.keys(m.sets.ui.sounds), ['tap', 'page'], 'a set keeps only its own kind of sound');
  assert.equal(m.sets.ui.sounds.page.gain, -3); assert.equal(m.sets.wood.sounds.pawn.gain, 0, 'a gain out of range is left out');
  assert.deepEqual(Object.keys(m.sets.wood.sounds), ['pawn'], 'files stay in the sfx folder, as audio');
  assert.deepEqual(readManifest(null), { sets: {} }); assert.deepEqual(readManifest({ sets: 'x' }), { sets: {} });
  // Every relic set's pieces sound like a set that exists.
  for (const set of Object.values(SET_FOR_RELIC)) assert.ok(PIECE_SETS.includes(set), set);
  for (const id of Object.keys(SET_FOR_RELIC)) assert.ok(RELICS.some(r => r.id === id), id);
});

test('sfx: VCH\'s own sound sets have every sound, made from packs recorded with Lyria 3.5', () => {
  const json = JSON.parse(readFileSync(new URL('../public/assets/vch/sfx/sfx.json', import.meta.url), 'utf8')), m = readManifest(json);
  assert.deepEqual(Object.keys(m.sets).sort(), ['ui', ...PIECE_SETS].sort());
  assert.deepEqual(Object.keys(m.sets.ui.sounds).sort(), [...UI_SOUNDS].sort(), 'the whole interface');
  for (const set of PIECE_SETS) assert.deepEqual(Object.keys(m.sets[set].sounds).sort(), [...PIECE_SOUNDS].sort(), `${set}: every piece and moment`);
  for (const set of Object.values(json.sets)) for (const s of Object.values(set.sounds)) {
    assert.ok(existsSync(new URL(`../public/assets/vch/sfx/${s.file}`, import.meta.url)), `${s.file} is in public/assets/vch/sfx/`);
    assert.ok(s.seconds > 0.05 && s.seconds < 2, `${s.file}: a short sound`);
  }
});

test('sfx: a game starts with a brief trumpet call, not a tune (owner, 2026-10-14)', () => {
  const lib = JSON.parse(readFileSync(new URL('../public/assets/vch/music/library.json', import.meta.url), 'utf8'));
  const sting = lib.tracks.find(t => t.id === 'sting-start');
  assert.equal(sting.place, 'sting'); assert.equal(sting.part, 'start');
  assert.ok(sting.end - (sting.start || 0) <= 2.5, 'the start sting is brief');
  const json = JSON.parse(readFileSync(new URL('../public/assets/vch/sfx/sfx.json', import.meta.url), 'utf8'));
  assert.ok(json.sets.ui.sounds.start.seconds > 1, 'without the music, the interface plays the same call, not a click');
});

test('sfx: one sound per action, the most telling one', () => {
  const later = [], played = [], gate = uiGate(k => played.push(k), { timers: { setTimeout: fn => later.push(fn) } });
  const flush = () => later.splice(0).forEach(fn => fn());
  gate('tap'); gate('page'); flush(); assert.deepEqual(played, ['page'], 'a tap that opens a page is heard as the page');
  gate('open'); gate('tap'); flush(); assert.deepEqual(played.slice(1), ['open']);
  gate('close'); gate('open'); flush(); assert.deepEqual(played.slice(2), ['open'], 'the same weight: the later one');
  gate('nope'); flush(); assert.equal(played.length, 3, 'only known sounds');
  gate('tick'); flush(); gate('tick'); flush(); assert.deepEqual(played.slice(3), ['tick', 'tick'], 'one per moment, not one ever');
  assert.ok(UI_PRIORITY.win > UI_PRIORITY.notify && UI_PRIORITY.notify > UI_PRIORITY.open && UI_PRIORITY.open > UI_PRIORITY.page && UI_PRIORITY.page > UI_PRIORITY.tap);
});

class Param { constructor() { this.value = 0; } }
class Node { constructor(ctx, kind) { this.ctx = ctx; this.kind = kind; this.gain = new Param(); this.playbackRate = new Param(); this.outputs = []; } connect(n) { this.outputs.push(n); return n; } start(at) { this.startedAt = at; this.ctx.started.push(this); } }
class Ctx {
  constructor() { this.currentTime = 2; this.destination = { kind: 'out' }; this.started = []; this.decoded = 0; }
  createBufferSource() { return new Node(this, 'source'); } createGain() { return new Node(this, 'gain'); }
  createPanner() { const p = new Node(this, 'panner'); for (const k of ['positionX', 'positionY', 'positionZ']) p[k] = new Param(); return p; }
  decodeAudioData(data, ok, fail) { this.decoded++; if (data.byteLength === 0) { fail?.(new Error('cannot decode')); return Promise.reject(new Error('cannot decode')); } const b = { duration: 0.2 }; ok?.(b); return Promise.resolve(b); }
}
const MANIFEST = { sets: { ui: { name: 'Interface', sounds: { tap: { file: 'ui/tap.m4a', gain: -6 } } }, wood: { name: 'Wood', sounds: { pawn: { file: 'wood/pawn.m4a' }, capture: { file: 'wood/capture.m4a' } } } } };
const bankFor = (files = {}) => {
  const ctx = new Ctx(), asked = [], clock = { now: 0 };
  const fetch = async url => { asked.push(url); if (url === SFX_URL) return { ok: true, json: async () => MANIFEST }; const body = files[url]; return body === undefined ? { ok: false, status: 404 } : { ok: true, arrayBuffer: async () => body }; };
  return { ctx, asked, clock, bank: new SoundBank({ context: () => ctx, fetch, random: () => 1, clock: () => clock.now }) };
};

test('sfx: a sound loads the first time it is wanted; until then the game plays its own', async () => {
  const { ctx, asked, clock, bank } = bankFor({ '/assets/vch/sfx/ui/tap.m4a': new ArrayBuffer(8), '/assets/vch/sfx/wood/pawn.m4a': new ArrayBuffer(8), '/assets/vch/sfx/wood/capture.m4a': new ArrayBuffer(0) });
  assert.equal(bank.play('ui', 'tap'), false, 'no list yet');
  await bank.load(); assert.deepEqual(asked, [SFX_URL]);
  assert.equal(bank.play('ui', 'tap'), false, 'not loaded yet: the caller plays its own sound');
  await bank.buffer('ui', 'tap'); assert.equal(ctx.decoded, 1); assert.ok(bank.ready('ui', 'tap'));
  assert.equal(bank.play('ui', 'tap', { volume: 0.5 }), true);
  const [src] = ctx.started, gain = src.outputs[0];
  assert.equal(src.buffer.duration, 0.2); assert.ok(Math.abs(gain.gain.value - 0.5 * 10 ** (-6 / 20)) < 1e-9, 'at the set\'s loudness for it'); assert.equal(gain.outputs[0], ctx.destination);
  assert.equal(bank.play('ui', 'tap'), true); assert.equal(ctx.started.length, 1, 'the same sound twice at once: once');
  clock.now = 50; assert.equal(bank.play('ui', 'tap'), true); assert.equal(ctx.started.length, 2);
  // A move: heard where it lands (HRTF), its pitch a touch different each time.
  await bank.warm('wood', ['pawn']);
  assert.equal(bank.play('wood', 'pawn', { place: [1.4, -0.5, -2.7], vary: 0.02 }), true);
  const pawn = ctx.started.at(-1), panner = pawn.outputs[0].outputs[0];
  assert.equal(panner.kind, 'panner'); assert.equal(panner.panningModel, 'HRTF'); assert.equal(panner.positionX.value, 1.4); assert.equal(panner.positionZ.value, -2.7);
  assert.equal(pawn.playbackRate.value, 1.02);
  // A sound that cannot be decoded (or found) is left alone after the first try.
  assert.equal(await bank.buffer('wood', 'capture'), null); assert.equal(bank.play('wood', 'capture'), false); assert.equal(bank.has('wood', 'capture'), false);
  const tries = ctx.decoded; await bank.buffer('wood', 'capture'); assert.equal(ctx.decoded, tries, 'not tried again');
  assert.equal(bank.play('wood', 'king'), false, 'not in the set'); assert.equal(bank.play('ember', 'pawn'), false, 'no such set');
  const offline = new SoundBank({ context: () => ctx, fetch: async () => { throw new Error('offline'); } });
  assert.deepEqual(await offline.load(), { sets: {} }); assert.equal(offline.play('ui', 'tap'), false);
});

test('menus: each menu and dialog is heard opening and closing', () => {
  const menus = new MenuController(), heard = [];
  const item = () => ({ open() {}, close() {} });
  menus.register('profile', item()).register('theme', item());
  const stop = menus.onChange((name, open) => heard.push(`${open ? 'open' : 'close'}:${name}`));
  menus.open('profile'); menus.open('profile'); menus.open('theme'); menus.close(); menus.close('theme'); menus.open('profile'); menus.closed('profile'); menus.closed('profile');
  assert.deepEqual(heard, ['open:profile', 'close:profile', 'open:theme', 'close:theme', 'open:profile', 'close:profile'], 'once each way, not again for one already open or closed');
  stop(); menus.open('theme'); assert.equal(heard.length, 6, 'stops listening');
  menus.onChange(() => { throw new Error('a listener that fails'); }); assert.equal(menus.open('profile'), true, 'does not stop the menu');
});

test('wired: every screen, dialog, switch, message and move is heard', () => {
  assert.match(main, /import \{ PIECE_SETS, PIECE_SOUNDS, SET_FOR_RELIC, SoundBank, UI_SOUNDS, moveSoundName, uiGate \} from '\.\/sfx\.js';/);
  assert.match(main, /if\(!first\)\{playUiSound\('page'\);musicResult=null;queueAtmosphere\(\)\}/, 'a new screen turns a page');
  assert.match(main, /navRestoring=true;playUiSound\('back'\);/, 'Back goes back');
  assert.match(main, /menus\.onChange\(\(name,open\)=>\{if\(name!=='promotion'\)playUiSound\(open\?'open':'close'\);if\(\['theme','account','search'\]\.includes\(name\)\)vantaScore\?\.muffle\(open\?1:0\)\}\);/, 'dialogs open and close; the music behind a settings dialog is muffled');
  assert.match(main, /document\.addEventListener\('vch-dialog',e=>playUiSound\(e\.detail\?\.open\?'open':'close'\)\);/);
  assert.match(main, /if\(el&&!el\.disabled&&!el\.closest\('#board,\[data-quiet\]'\)\)playUiSound\('tap'\)\},\{capture:true,passive:true\}\);/, 'every press, but not on the board');
  assert.match(main, /if\(t\.type==='checkbox'\)playUiSound\(t\.checked\?'toggle-on':'toggle-off'\)/);
  assert.match(main, /function toast\(s,\{duration=1800,onClick=null,actionLabel='',onAction=null,sound='notify'\}=\{\}\)\{/);
  assert.match(main, /el\.className='show';if\(sound\)playUiSound\(sound\);/, 'a message chimes');
  assert.match(main, /if\(set!=='classic'\)try\{if\(soundBankNow\(\)\.play\(set,'illegal',\{volume:\.5\}\)\)return\}catch\{\}/);
  assert.match(main, /try\{if\(soundBankNow\(\)\.play\('ui','tick',\{volume:\.4\}\)\)return\}catch\{\}/, 'the clock ticks under ten seconds');
  assert.match(main, /if\(\$\('#sound'\)\?\.dataset\.off\|\|\(menuSound\(kind\)&&!sfxPrefs\(\)\.ui\)\)return;/, 'Sound off silences everything; interface sounds can go on their own');
  assert.match(main, /<label>Piece sounds <select id="pieceSoundSetting">\$\{pieceSoundOptions\(\)\}<\/select><\/label><label class="check-row">Interface sounds <input id="uiSoundSetting" type="checkbox" checked><\/label><button id="openMusicList" type="button" class="theme-relics">Music list<\/button><button id="openSoundTest" type="button" class="theme-relics">Sound test<\/button>/);
  assert.match(main, /function renderSoundTest\(\)\{setDynamicView\('sounds','Sound test',''\);drawSoundTest\(\)\}/);
  assert.match(main, /document\.addEventListener\('pointerdown',warmSounds,\{once:true,capture:true,passive:true\}\);/, 'the sounds load after the first touch');
  // The moments with stings: a game's start and end, puzzles, relics, realms, a brilliant move, a new division.
  for (const re of [/cue\('start','start'\)/, /const stung=cue\('solved','success'\)/, /vantaScore\.sting\('failed'\)/, /const stung=cue\('relic','win'\)/, /\{sound:'win',sting:'realm'\}/, /cue\('brilliant','success'\)/, /const stung=cue\(up\?'rank-up':'rank-down',null\);/])
    assert.match(main, re);
  assert.ok(main.indexOf('let soundBank=null,sfxPrefsCache=null,uiVoiceFn=null') < main.indexOf('function renderBoard('), 'declared before the page starts');
});
