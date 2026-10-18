import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { VantaScore } from '../src/music.js';
import { SandBackdrop } from '../src/resonance.js';

// Fixes from the owner's iPad test of the live build (2026-10-17): the music never started, the
// Settings opened as a colour panel, the board sat in a corner with the moves below the fold, and
// the game stuttered.
const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');

// ---- iOS audio, faked: sound starts only inside a tap, and an element plays on its own later
// only once a tap has readied it (by play() or load() inside the tap). ----
let tapping = false;
class Param { constructor() { this.value = 0; } setValueAtTime(v) { this.value = v; } linearRampToValueAtTime(v) { this.value = v; } setValueCurveAtTime(c) { this.value = c.at(-1); } cancelScheduledValues() {} cancelAndHoldAtTime() {} }
class Node { constructor() { this.gain = new Param(); this.frequency = new Param(); this.Q = new Param(); } connect(n) { return n; } }
class SafariContext {
  constructor() { this.currentTime = 1; this.state = 'suspended'; this.sampleRate = 44100; this.destination = {}; this.silent = 0; }
  createGain() { return new Node(); } createBiquadFilter() { return new Node(); } createMediaElementSource() { return new Node(); }
  createBuffer() { return {}; } createBufferSource() { const ctx = this; return { connect() {}, start() { ctx.silent++; } }; }
  resume() { if (tapping) this.state = 'running'; return Promise.resolve(); }
}
class SafariAudio {
  constructor() { this.src = ''; this.paused = true; this.currentTime = 0; this.error = null; this.readied = false; this.loads = 0; }
  play() {
    if (tapping) this.readied = true;
    if (!this.readied) return Promise.reject(Object.assign(new Error('not allowed'), { name: 'NotAllowedError' }));
    this.paused = false; return Promise.resolve();
  }
  pause() { this.paused = true; } load() { this.loads++; if (tapping) this.readied = true; } addEventListener() {}
  canPlayType(type) { return /mpeg|mp4/.test(type) ? 'probably' : ''; }
}
const tap = fn => { tapping = true; try { return fn(); } finally { tapping = false; } };
const settle = () => new Promise(r => setTimeout(r, 0));
const LIB = [{ id: 'menus', title: 'Menus', file: 'menus.m4a', station: 'cinematic', place: 'lobby' }];

test('iPhone and iPad: a track Safari refused to start plays at the next tap', async () => {
  const score = new VantaScore({ AudioContextClass: SafariContext, AudioElement: SafariAudio, timers: { setInterval: () => 1, clearInterval() {}, setTimeout: fn => { fn(); return 1; }, clearTimeout() {} }, tracks: LIB, base: '/m/', random: () => 0, clock: () => 0 });
  // The music asks to start outside a tap (a touch's start, a timer): Safari says no.
  assert.equal(score.start(), true);
  const deck = score.active;
  await settle();
  assert.ok(deck.el.paused, 'refused outside a tap');
  assert.equal(score.refused, deck, 'the refusal is remembered');
  // The touch ends: the tap wakes the audio and starts the track that was refused.
  tap(() => score.unlock());
  await settle();
  assert.equal(score.ctx.state, 'running');
  assert.equal(score.ctx.silent, 1, 'a silent sample wakes the audio once');
  assert.ok(!deck.el.paused, 'the refused track plays now');
  assert.equal(score.refused, null);
  // The other decks are readied in the same tap, so later changes of track play on their own.
  assert.ok(score.decks.filter(d => d !== deck).every(d => d.el.readied));
  tap(() => score.unlock());
  assert.equal(score.ctx.silent, 1, 'only the first tap readies');
});

test('iPhone and iPad: the first tap readies the audio even before the music library has arrived', () => {
  const score = new VantaScore({ AudioContextClass: SafariContext, AudioElement: SafariAudio, timers: { setInterval: () => 1, clearInterval() {}, setTimeout: () => 1 }, tracks: [], base: '/m/' });
  assert.equal(score.available, false);
  assert.equal(tap(() => score.unlock()), true);
  assert.ok(score.ctx && score.decks.length === 3 && score.decks.every(d => d.el.readied && d.el.loads === 1));
  assert.ok(score.stingDeck.el.readied, 'the stings too');
});

test('every tap readies the music: a touch\'s end, a click or a key; and a world turns the music on', () => {
  assert.match(main, /const unlockMusic=\(\)=>\{if\(!musicPrefsGet\(\)\.on\|\|\$\('#sound'\)\?\.dataset\.off\)return;ensureScore\(\);if\(!vantaScore\?\.unlock\(\)\)return;if\(!vantaScore\.playing\)queueAtmosphere\(\)\};/);
  assert.match(main, /for\(const type of \['touchend','pointerup','click','keydown'\]\)document\.addEventListener\(type,unlockMusic,\{capture:true,passive:true\}\);/);
  assert.match(main, /if\(w&&!musicPrefsGet\(\)\.on\)setMusicOn\(true,'on'\);/);
  // The tap that turns the music on readies it too: a listener that runs after the control's own
  // handler (the capture listeners run before it, while the music is still off).
  assert.match(main, /for\(const type of \['click','change'\]\)document\.addEventListener\(type,unlockMusic,\{passive:true\}\);/);
});

test('iPhone and iPad: the tap that turns the music on starts it, with no second tap', async () => {
  // A new player: music off, so the listener before the control's handler does nothing; the
  // control turns the music on and starts it outside Safari's view of the tap...
  const score = new VantaScore({ AudioContextClass: SafariContext, AudioElement: SafariAudio, timers: { setInterval: () => 1, clearInterval() {}, setTimeout: fn => { fn(); return 1; }, clearTimeout() {} }, tracks: LIB, base: '/m/', random: () => 0, clock: () => 0 });
  let on = false;
  const unlockIfOn = () => { if (on) score.unlock(); };
  tap(() => { unlockIfOn(); on = true; unlockIfOn(); }); // capture listener, the control, then the listener after it
  assert.equal(score.start(), true); // the track arrives a moment later, outside the tap
  await settle();
  assert.ok(!score.active.el.paused, 'it plays: the tap that turned the music on readied it');
});

test('Settings is a full-screen sheet on every phone width, held sideways too', () => {
  assert.match(css, /@media \(max-width:760px\),\(max-height:500px\)\{\n\s*#themeStudio\.settings-dialog\{width:100vw;max-width:100vw;height:100dvh;max-height:100dvh;/);
});

// ---- Settings ----
test('Settings: sections, a title that takes the focus, and the colour pickers folded away', () => {
  const dialog = main.slice(main.indexOf('<dialog id="themeStudio"'), main.indexOf('</dialog>', main.indexOf('<dialog id="themeStudio"')));
  assert.match(dialog, /^<dialog id="themeStudio" class="settings-dialog" aria-labelledby="settingsTitle"><header class="settings-head"><h2 id="settingsTitle" tabindex="-1" autofocus>Settings<\/h2><button id="closeThemeTop" type="button" class="settings-top-done">Done<\/button><\/header>/);
  const titles = [...dialog.matchAll(/<h3 id="\w+">([^<]+)<\/h3>/g)].map(m => m[1]);
  assert.deepEqual(titles, ['Board &amp; pieces', 'Sound &amp; music', 'Look &amp; motion', 'Language']);
  // Every colour picker lives in the closed "Your own colours" fold; nothing before it is one.
  const fold = dialog.slice(dialog.indexOf('<details id="ownColours"'), dialog.indexOf('</details>'));
  assert.equal((dialog.match(/type="color"/g) || []).length, 6);
  assert.equal((fold.match(/type="color"/g) || []).length, 6);
  assert.doesNotMatch(fold, /<details id="ownColours"[^>]*\bopen\b/);
  assert.ok(dialog.indexOf('type="color"') > dialog.indexOf('Piece style'), 'the first control is not a colour');
  // The same controls as before, each once.
  for (const id of ['pieceStyle', 'boardSet', 'expressionsSetting', 'veteranSetting', 'musicSetting', 'musicVolume', 'worldSetting', 'nowPlayingSetting', 'pieceSoundSetting', 'uiSoundSetting', 'speakMoves', 'wallpaper', 'atmosphereSetting', 'resonanceSetting', 'languageSelect', 'whitePiece', 'blackPiece', 'pieceTint', 'openRelics', 'openMusicList', 'openSoundTest', 'openResonance'])
    assert.equal(dialog.split(`id="${id}"`).length, 2, id);
});

test('Settings opens one way everywhere (colours folded); the board\'s Board theme opens the colours', () => {
  assert.match(main, /function openSettings\(\{colours=false\}=\{\}\)\{\n\s*const fold=\$\('#ownColours'\);if\(fold\)fold\.open=colours;\n\s*syncBoardSets\(\);menus\.open\('theme'\);/);
  assert.match(main, /\$\('#settingsBtn'\)\.onclick=\(\)=>openSettings\(\);/);
  assert.match(main, /\$\('#profileMenuSettings'\)\.onclick=\(\)=>openSettings\(\);/);
  assert.match(main, /\$\('#theme'\)\.onclick=\(\)=>openSettings\(\{colours:true\}\);/);
  assert.match(main, /\$\('#closeThemeTop'\)\.onclick=\(\)=>menus\.close\('theme'\);/);
  assert.doesNotMatch(main, /menus\.open\('theme'\)\}/, 'no way in that skips the board sets');
  assert.match(css, /#themeStudio\.settings-dialog\[open\]\{display:flex\}/);
  assert.match(css, /#themeStudio \.settings-body\{[^}]*overflow-y:auto/);
});

// ---- The board on a tablet held sideways ----
test('iPad held sideways: three columns, the moves beside the board, the board fitted to the height', () => {
  const block = css.slice(css.indexOf('@media (min-width:1000px) and (max-width:1180px) and (orientation:landscape) and (pointer:coarse){'));
  assert.ok(block.length > 0);
  assert.match(block, /main\{grid-template-columns:minmax\(280px,1fr\) auto minmax\(260px,1fr\)!important/);
  assert.match(block, /\.rpanel\{grid-column:auto!important/);
  assert.match(block, /--fit-side:calc\(18px \+ 280px \+ 260px/);
  assert.ok(css.lastIndexOf('@media (min-width:801px) and (max-width:1180px){') < css.indexOf('@media (min-width:1000px) and (max-width:1180px) and (orientation:landscape) and (pointer:coarse){'), 'after the two-column rule it replaces');
});

// ---- Smoothness on phones and tablets ----
test('the engine\'s many reports reach the move list at most four times a second', () => {
  const body = main.slice(main.indexOf('function updateAnalysisFromUci(text,request)'), main.indexOf('function scheduleAnalysis'));
  assert.match(body, /queueMovesUpdate\(\);/);
  assert.doesNotMatch(body, /updateMoves\(\)/);
  assert.match(main, /function queueMovesUpdate\(\)\{if\(!movesUpdateTimer\)movesUpdateTimer=setTimeout\(\(\)=>\{movesUpdateTimer=0;updateMoves\(\)\},250\)\}/);
});

test('a finger dragging a piece does not turn the hero piece', () => {
  assert.match(main, /addEventListener\('pointermove',e=>\{\n(?:\s*\/\/[^\n]*\n)*\s*if\(e\.pointerType!=='mouse'\|\|still\(\)\)return;/);
});

test('the Resonance background on a phone or tablet: fewer grains, one pixel per CSS px, no glow layer', () => {
  assert.match(main, /const light=matchMedia\('\(pointer: coarse\)'\)\.matches;\n\s*resonance=new SandBackdrop\(canvas,\{glow:light\?null:layer\.querySelector\('\.resonance-glow'\),density:light\?120:60,fps:light\?24:30,maxDpr:light\?1:2,/);
  const canvas = { width: 0, height: 0, getContext: () => ({ createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }), putImageData() {}, clearRect() {} }) };
  const view = { innerWidth: 390, innerHeight: 844, devicePixelRatio: 3, performance: { now: () => 0 }, requestAnimationFrame: () => 1, cancelAnimationFrame() {}, setTimeout: () => 1, clearTimeout() {} };
  const phone = new SandBackdrop(canvas, { view, maxDpr: 1, density: 120, swell: null, random: () => 0.5 });
  assert.equal(phone.dpr, 1); assert.deepEqual([canvas.width, canvas.height], [390, 844]);
  assert.equal(phone.count, Math.round(390 * 844 / 120));
});

// ---- Found by the phone and tablet matrix (2026-10-18) ----
test('a 360 px phone: the oath picker narrows instead of widening the Play panel', () => {
  assert.match(css, /\.oath-row\{display:grid;grid-template-columns:minmax\(0,1fr\);/);
  assert.match(css, /\.oath-row label\{display:flex;[^}]*min-width:0;/);
  assert.match(css, /\.oath-row select\{min-width:0;max-width:62%;/);
});

test('on a phone the flag prompt never covers the Play tab\'s Start game and Create room buttons', () => {
  assert.match(main, /function phonePlaySetupShowing\(\)\{\n\s*return document\.body\.classList\.contains\('m-app'\)&&!\['game','review'\]\.includes\(document\.querySelector\('\.shell'\)\?\.dataset\.mview\)&&!!document\.querySelector\('\[data-m-tab="play"\]\.on'\);/);
  assert.match(main, /function flagPromptCalm\(\)\{return !liveGameOn\(\)&&!chatIsOpen\(\)&&!document\.querySelector\('\.vch-dialog-layer'\)&&!phonePlaySetupShowing\(\)\}/);
});

test('a new piece set shows once its images are in, so the board never stands empty', () => {
  assert.match(main, /function pieceStyleImages\(style\)\{/);
  assert.match(main, /if\(style==='vanta'\)return \[sheet\('vanta-3d'\)\];/);
  assert.match(main, /\['w','b'\]\.flatMap\(c=>\['k','q','r','b','n','p'\]\.map\(p=>`\/assets\/vch\/pieces\/vanta-2d\/\$\{c\}\$\{p\}\.svg`\)\)/);
  const handler = main.slice(main.indexOf("$('#pieceStyle').onchange=e=>{"));
  assert.match(handler, /Promise\.race\(\[preloadImages\(pieceStyleImages\(normalizePieceStyle\(want\)\)\),new Promise\(done=>setTimeout\(done,2000\)\)\]\)\.then\(\(\)=>\{\n\s*if\(e\.target\.value!==want\)return;/);
});
