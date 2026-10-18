import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { REVEAL, backgroundUrls, decodeImage, revealApp } from '../src/boot-reveal.js';
import { ARRIVAL, arrivalDelay, arrivalMs, startArrival } from '../src/board-arrival.js';

// The smoothness pass (owner, 2026-10-17: "it feels choppy ... when you go to the menu ... it does
// not land naturally ... the elements on the board ... seem to be floating on the board", and
// "the game start screen and the game end screen").
const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const main = read('../src/main.js'), css = read('../src/style.css'), html = read('../index.html');

// ---- A fake page: a clock you move by hand, frames, pictures that decode when you say. ----
function fakePage({ decodeAfter = null } = {}) {
  let time = 0; const timers = []; const frames = []; const decoders = [];
  const classes = new Set(); let veilRemoved = false; const veilClasses = new Set();
  const win = {
    performance: { now: () => time },
    setTimeout(fn, ms) { timers.push({ at: time + ms, fn }); return timers.length; },
    clearTimeout() {},
    requestAnimationFrame(fn) { frames.push(fn); return frames.length; },
    Image: class { set src(url) { this.url = url; } decode() { return new Promise(resolve => decoders.push({ url: this.url, resolve })); } },
  };
  const doc = {
    documentElement: { classList: { add: (...n) => n.forEach(c => classes.add(c)), remove: (...n) => n.forEach(c => classes.delete(c)), contains: c => classes.has(c) } },
    getElementById: id => (id === 'bootVeil' && !veilRemoved ? { classList: { add: c => veilClasses.add(c) }, remove: () => { veilRemoved = true; } } : null),
  };
  const tick = async ms => {
    time += ms;
    for (const t of timers.splice(0).sort((a, b) => a.at - b.at)) { if (t.at <= time) t.fn(); else timers.push(t); }
    await new Promise(r => setTimeout(r, 0));
  };
  const flushFrames = async () => { for (let i = 0; i < 4; i++) { for (const f of frames.splice(0)) f(); await new Promise(r => setTimeout(r, 0)); } };
  return { win, doc, classes, veilClasses, decoders, tick, flushFrames, get veilRemoved() { return veilRemoved; } };
}

test('the veil is the first paint: the theme colour, over everything, lifting by itself if the script never runs', () => {
  assert.match(html, /<body><div id="bootVeil" class="boot-veil" aria-hidden="true"><\/div><div id="app"><\/div>/);
  assert.match(html, /\.boot-veil\{position:fixed;inset:0;z-index:2147483000;background:#07110f;pointer-events:none;/);
  assert.match(html, /animation:boot-veil-lift \.42s ease 6s forwards/, 'a failsafe if main.js never runs');
  assert.match(html, /\.boot-veil::after\{[^}]*background:url\(\/icon\.svg\)[^}]*opacity:0;animation:boot-veil-mark \.6s ease \.9s forwards\}/, 'only a slow load shows the V');
  assert.match(html, /<meta name="theme-color" content="#07110f">/);
});

test('the reveal waits for the pictures on screen, then two frames, then fades the veil and starts the rise', async () => {
  const page = fakePage();
  const done = revealApp({ doc: page.doc, win: page.win, urls: ['/w.webp', '/p.png', '/w.webp'], now: page.win.performance.now });
  await page.tick(10);
  assert.equal(page.decoders.length, 2, 'each picture once');
  assert.ok(!page.classes.has('app-revealed'), 'not before the pictures');
  page.decoders.forEach(d => d.resolve());
  await page.tick(0); await page.flushFrames();
  assert.equal(await done, true);
  assert.ok(page.classes.has('app-revealed') && page.classes.has('app-revealing'));
  assert.ok(page.veilClasses.has('out'));
  await page.tick(REVEAL.fadeMs + 200);
  assert.ok(page.veilRemoved, 'the veil leaves the page');
  await page.tick(REVEAL.riseMs + 200);
  assert.ok(!page.classes.has('app-revealing'), 'the rise is once');
});

test('a slow picture never holds the page: the veil lifts at the cap', async () => {
  const page = fakePage();
  const done = revealApp({ doc: page.doc, win: page.win, urls: ['/slow.webp'], now: page.win.performance.now, maxWaitMs: 1400 });
  await page.tick(1300); await page.flushFrames();
  assert.ok(!page.classes.has('app-revealed'));
  await page.tick(150); await page.flushFrames();
  assert.equal(await done, true);
  assert.ok(page.classes.has('app-revealed'));
});

test('the installed app\'s splash is already up: the veil lifts at once; and the reveal happens once', async () => {
  const page = fakePage();
  const first = revealApp({ doc: page.doc, win: page.win, urls: ['/slow.webp'], immediate: true });
  await page.tick(0); await page.flushFrames();
  assert.equal(await first, true);
  assert.equal(page.decoders.length, 1, 'the picture still loads, unwaited');
  assert.equal(await revealApp({ doc: page.doc, win: page.win }), false, 'never twice');
});

test('pictures come from the wallpaper, the piece set and the images on screen', () => {
  assert.deepEqual(backgroundUrls('linear-gradient(rgb(2 7 8 / .42),rgb(2 7 8 / .52)), url("/assets/vch/wallpapers/wallpaper-emerald.webp")'), ['/assets/vch/wallpapers/wallpaper-emerald.webp']);
  assert.deepEqual(backgroundUrls('url(/a.png), url(\'/b.png\')'), ['/a.png', '/b.png']);
  assert.deepEqual(backgroundUrls('none'), []);
  assert.match(main, /void revealApp\(\{urls:firstPaintImages\(\),immediate:!!splash\}\);\s*$/, 'at the very end of main.js, once everything is built');
  assert.match(main, /\.\.\.backgroundUrls\(getComputedStyle\(document\.body\)\.backgroundImage\),\.\.\.pieceStyleImages\(document\.documentElement\.dataset\.pieceStyle\|\|'vanta'\)/);
});

test('a picture that fails to load still lets the page in', async () => {
  class Broken { set src(v) {} decode() { return Promise.reject(new Error('404')); } }
  await decodeImage('/missing.png', Broken);
  class Old { set src(v) { setTimeout(() => this.onerror?.(), 0); } }
  await decodeImage('/old.png', Old);
});

test('the page rises into place once, region by region, and not at all with reduced motion', () => {
  assert.match(css, /@keyframes vch-rise\{from\{translate:0 8px\}to\{translate:0 0\}\}/);
  // Brief, so nothing is still moving when a finger reaches for it; never the game panel, whose
  // cards are fixed to the screen (a translate would carry them along).
  assert.match(css, /html\.app-revealing \.shell>\.topbar,html\.app-revealing \.shell>main>:not\(\.game\),html\.app-revealing \.shell>\.m-tabs\{animation:vch-rise 420ms/);
  assert.ok(REVEAL.riseMs <= 500);
  assert.match(css, /@media \(prefers-reduced-motion:reduce\)\{html\.app-revealing \.shell \*\{animation:none!important\}\}/);
});

test('moving between screens and sections: the one you go to fades in briefly, never at load or without motion', () => {
  assert.match(main, /if\(shell&&shell\.classList\.contains\('game-active'\)!==showGame\)markEntering\(showGame\?'game':'intro'\);/);
  assert.match(main, /if\(shell\.dataset\.mview!==mView\)\{const first=!shell\.dataset\.mview;shell\.dataset\.mview=mView;if\(!first\)markEntering\(mView\)\}/);
  assert.match(main, /const arriving=currentRightView!==kind;currentRightView=kind;/);
  assert.match(main, /if\(arriving\)enterView\(target\);/, 'not when a section fills in after loading');
  assert.match(main, /function markEntering\(view\)\{\n\s*const shell=\$\('\.shell'\);if\(!shell\|\|!document\.documentElement\.classList\.contains\('app-revealed'\)\|\|motionScale\(\)===0\)return;/);
  assert.match(css, /\.shell:is\(\[data-entering="game"\],\[data-entering="review"\]\)>main>\.game\{animation:vch-view-fade 240ms ease-out both\}/, 'opacity only on the game panel');
  assert.doesNotMatch(css, /@keyframes vch-view-fade\{[^}]*translate/);
});

test('a computer reply that comes after the game has ended is dropped', () => {
  assert.match(main, /if\(game\.fen\(\)===book\.fen&&!localGameOver\)makeMove\(book\.move,true\);/);
  assert.match(main, /const move=await findEngineMove\(\);if\(move===undefined\|\|localGameOver\)return;/);
});

test('on a small board the end card tightens so it shows whole (measured on the board)', () => {
  assert.match(css, /\.game-end\{container-type:size\}/);
  assert.match(css, /@container \(max-height:440px\)\{[^@]*\.ge-actions>\.ge-review:nth-last-child\(2\),\.ge-actions>\.ge-secondary:nth-child\(2\):last-child\{grid-column:auto\}/);
});

// ---- The start of a game ----
test('the pieces settle from the middle files out: d and e first, a and h last', () => {
  assert.deepEqual(['d1', 'e8', 'c2', 'f7', 'b1', 'g8', 'a1', 'h8'].map(s => arrivalDelay(s)), [0, 0, 36, 36, 72, 72, 108, 108]);
  assert.equal(arrivalDelay('z9'), 0);
  assert.equal(arrivalMs(), ARRIVAL.holdMs + 3 * ARRIVAL.stepMs + ARRIVAL.dropMs);
  assert.ok(arrivalMs() < 1600, 'the whole start in about a second and a half');
});

function fakeTimers() {
  let now = 0; const list = [];
  return { setTimeout(fn, ms) { list.push({ at: now + ms, fn, id: list.length + 1 }); return list.length; }, clearTimeout(id) { const t = list.find(x => x.id === id); if (t) t.fn = () => {}; }, advance(ms) { now += ms; for (const t of list.filter(t => t.at <= now && !t.done)) { t.done = true; t.fn(); } } };
}
const fakePiece = () => { const props = new Map(); return { style: { setProperty: (k, v) => props.set(k, v), removeProperty: k => props.delete(k) }, props }; };

test('the arrival: hidden under the card, then settling, then plain pieces again', async () => {
  const timers = fakeTimers(), board = { dataset: {} };
  const pieces = new Map([['e2', fakePiece()], ['a1', fakePiece()]]);
  const arrival = startArrival(board, pieces, { timers });
  assert.equal(board.dataset.arrival, 'hold');
  const shown = { dataset: {} }; startArrival(shown, new Map(), { timers, onScreen: true });
  assert.equal(shown.dataset.arrival, 'clear', 'a board already on screen fades its pieces away');
  assert.equal(pieces.get('e2').props.get('--arrive-delay'), '0ms');
  assert.equal(pieces.get('a1').props.get('--arrive-delay'), '108ms');
  timers.advance(ARRIVAL.holdMs);
  assert.equal(board.dataset.arrival, 'drop');
  timers.advance(arrivalMs());
  await arrival.done;
  assert.equal(board.dataset.arrival, undefined);
  assert.equal(pieces.get('a1').props.size, 0);
});

test('a touch on the board ends the arrival at once: it never holds up a move', async () => {
  const timers = fakeTimers(), board = { dataset: {} }, pieces = new Map([['e2', fakePiece()]]);
  const arrival = startArrival(board, pieces, { timers });
  arrival.finish();
  await arrival.done;
  assert.equal(board.dataset.arrival, undefined);
  timers.advance(ARRIVAL.holdMs);
  assert.equal(board.dataset.arrival, undefined, 'the timers it had set do nothing now');
  assert.match(main, /document\.addEventListener\('pointerdown',event=>\{if\(boardArrival&&event\.target\?\.closest\?\.\('#board'\)\)\{finishBoardArrival\(\);\$\('#gameStartCard'\)\?\.classList\.remove\('show'\)\}\},\{capture:true,passive:true\}\);/);
});

test('the start: the card over the empty squares, the pieces settling as it leaves; the computer moves once they are down', () => {
  assert.match(main, /const dom=ensureBoardDom\(\),arrival=arrivalWanted\(\)\?startArrival\(dom\.board,dom\.pieces\.elements,\{onScreen:dom\.board\.getClientRects\(\)\.length>0\}\):null;/);
  // A board already on screen (tablet, desktop, a room waiting) fades its pieces away; a phone's
  // game screen coming into view shows its squares empty from the first frame.
  assert.match(css, /\.board\[data-arrival="clear"\] \.board-piece\{opacity:0;transition:opacity 200ms ease\}/);
  assert.match(main, /function arrivalWanted\(\)\{return motionScale\(\)>0&&!document\.hidden\}/, 'Motion off or reduced motion: no arrival');
  assert.match(main, /if\(game\.turn\(\)!==computerSide\)setTimeout\(engineMove,Math\.max\(280,startCeremonyMs\(\)\)\);/);
  // Opacity on the piece, transform on its artwork: each set's per-piece lift (the artwork's
  // translate) and the piece's square (its own transform) are left alone.
  assert.match(css, /\.board\[data-arrival="hold"\] \.board-piece\{opacity:0\}/);
  assert.match(css, /\.board\[data-arrival="drop"\] \.board-piece \.piece\{animation:vch-arrive-drop 460ms [^}]*var\(--arrive-delay,0ms\) both\}/);
  assert.match(css, /@keyframes vch-arrive-drop\{from\{transform:translateY\(-12%\)\}to\{transform:none\}\}/);
  assert.doesNotMatch(css.slice(css.indexOf('@keyframes vch-arrive-drop')), /@keyframes vch-arrive-[a-z]+\{[^}]*translate:/, 'never the translate property the sets use for their lifts');
});

// ---- The end of a game ----
test('the end card counts a rating change to its new value, and shows each player\'s score', () => {
  assert.match(main, /function endScore\(result,color\)\{\n\s*if\(result==='1\/2-1\/2'\)return '½';\n\s*if\(result==='1-0'\)return color==='w'\?'1':'0';\n\s*if\(result==='0-1'\)return color==='b'\?'1':'0';/);
  assert.match(main, /data-from="\$\{change\.before\}" data-to="\$\{change\.before\+change\.delta\}"/);
  assert.match(main, /const t=Math\.min\(1,Math\.max\(0,\(now-start\)\/span\)\),ease=1-\(1-t\)\*\*3;/);
  assert.match(main, /\}else for\(const el of counters\)el\.textContent=el\.dataset\.to;/, 'without motion, the new rating at once');
});

// ---- A first visit: nothing pops up ----
test('the flag question waits for a first finished game, and for the end card to close', () => {
  assert.match(main, /function scheduleFlagPrompt\(\)\{\n\s*if\(flagPromptDone\(\)\|\|currentProfile\?\.country_code\|\|scheduleFlagPrompt\.pending\|\|!gamesFinished\(\)\)return;/);
  assert.match(main, /if\(info\.result!=='\*'\)countFinishedGame\(\);/);
  assert.match(main, /showGameEndPanel\(info,title\);\n\s*scheduleFlagPrompt\(\);/);
  assert.match(main, /&&!\$\('#gameEndPanel'\)&&!phonePlaySetupShowing\(\)\}/);
});
