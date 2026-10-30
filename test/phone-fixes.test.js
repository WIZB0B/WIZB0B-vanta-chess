import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Bug pass (2026-10-30): phones, overlays and slow loads.
const read = path => readFile(new URL(path, import.meta.url), 'utf8');
const [css, main, html, dialog] = await Promise.all([read('../src/style.css'), read('../src/main.js'), read('../index.html'), read('../src/vch-dialog.js')]);

// Every style rule with the @media conditions it sits in.
function rules(text) {
  const out = [], stack = [];
  let i = 0, start = 0;
  text = text.replace(/\/\*[\s\S]*?\*\//g, m => ' '.repeat(m.length));
  while (i < text.length) {
    const ch = text[i];
    if (ch === '{') {
      const head = text.slice(start, i).trim();
      if (head.startsWith('@')) { stack.push(head); start = i + 1; }
      else { const end = text.indexOf('}', i); out.push({ selector: head, media: [...stack] }); i = end; start = end + 1; }
    } else if (ch === '}') { stack.pop(); start = i + 1; }
    i++;
  }
  return out;
}

test('hover effects only where there is a pointer that hovers: a tap no longer leaves a button lifted or lit', () => {
  const hover = rules(css).filter(r => r.selector.includes(':hover'));
  assert.ok(hover.length > 25);
  // The one exception switches an effect off (squares never move or fade), so it may apply anywhere.
  const loose = hover.filter(r => !r.media.some(m => /\(hover:\s*hover\)/.test(m)) && !r.selector.startsWith('.board .square,'));
  assert.deepEqual(loose.map(r => r.selector), []);
  // Keyboard focus keeps its look on every device.
  assert.match(css, /\.course-card:focus-visible\{transform:translateY\(-2px\)/);
  assert.match(css, /\.now-playing:focus-within\{opacity:1/);
});

test('the page reaches the screen edges and keeps its bars clear of the notch and the home indicator', () => {
  assert.match(html, /<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">/);
  assert.match(css, /padding-left:env\(safe-area-inset-left,0px\);padding-right:env\(safe-area-inset-right,0px\);/);
  assert.match(css, /body\.m-app \.m-tabs\{[^}]*padding:0 env\(safe-area-inset-right,0px\) env\(safe-area-inset-bottom\) env\(safe-area-inset-left,0px\)/);
  assert.match(css, /body\.m-app \.topbar\{[^}]*padding:calc\(6px \+ env\(safe-area-inset-top\)\)/);
});

test('full-height screens follow the visible height (the browser bar comes and goes)', () => {
  assert.match(css, /body\[data-screen="game"\]\{height:100vh;height:100dvh;min-height:100vh;min-height:100dvh;overflow:hidden\}/);
  assert.match(css, /\.shell\.intro-active,\.shell\.game-active\{height:100vh;height:100dvh;min-height:0\}/);
});

test('the music panel stays off a phone\'s game and review screens', () => {
  assert.match(css, /body\.m-app:has\(\.shell\[data-mview="game"\]\) \.now-playing,body\.m-app:has\(\.shell\[data-mview="review"\]\) \.now-playing\{display:none\}/);
});

test('sheets and dialogs: scrolling inside never scrolls the page behind; the chat fits a narrow phone', () => {
  assert.match(css, /\.m-sheet-card\{[^}]*overscroll-behavior:contain/);
  assert.match(css, /\.m-sheet-backdrop\{[^}]*touch-action:none/);
  assert.match(css, /\.vch-dialog-layer\{[^}]*overflow:auto;overscroll-behavior:contain/);
  assert.match(css, /\.chat-drawer input\{flex:1;min-width:0;/, 'the Send button used to stick out of the drawer');
});

test('Escape and focus: each overlay closes alone and gives focus back', () => {
  assert.match(dialog, /if\(event\.key==='Escape'\)\{event\.preventDefault\(\);event\.stopPropagation\(\);/);
  assert.match(main, /if\(event\.key==='Escape'&&closeSheet\(\)\)\{event\.preventDefault\(\);event\.stopImmediatePropagation\(\)\}/);
  assert.match(main, /if\(restore&&inside&&back instanceof HTMLElement&&back\.isConnected\)back\.focus\(\{preventScroll:true\}\)/);
  assert.match(main, /button\.onclick=\(\)=>\{closeSheet\(\{restore:false\}\);item\.run\(\)\}/);
  assert.match(main, /hideGameEndPanel\(\);gameEndReturn=document\.activeElement;/);
  assert.match(main, /<aside id="chatDrawer" class="chat-drawer" aria-hidden="true" inert>/);
  assert.match(main, /drawer\.classList\.remove\('open'\);drawer\.setAttribute\('aria-hidden','true'\);drawer\.inert=true;/);
});

test('a slow load only fills the view that asked for it', () => {
  assert.match(main, /function viewContent\(gen\)\{return gen===dynamicViewGen\?\$\('#dynamicView \.view-content'\):null\}/);
  assert.match(main, /currentRightView=kind;dynamicViewGen\+\+;/);
  assert.match(main, /currentRightView='moves';dynamicViewGen\+\+;/);
  // No section reads the view after waiting for the server without checking it is still its view.
  const late = main.match(/await [^;]*?,target=\$\('#dynamicView \.view-content'\)/g) || [];
  assert.deepEqual(late, []);
  assert.match(main, /if\(viewGen!==dynamicViewGen\|\|onlineGameBusy\(\)\)return;/, 'a puzzle never replaces a game started while it loaded');
});

test('copying the room link works where the clipboard is refused', () => {
  assert.match(main, /\$\('#copy'\)\.onclick=async\(\)=>\{const field=\$\('#share'\);try\{await navigator\.clipboard\.writeText\(field\.value\);toast\('Room link copied'\)\}catch\{field\.focus\(\);field\.select\(\);/);
});

test('smoother: the toast and the eval bars move by transform; endless pulses only scale and fade', () => {
  assert.match(css, /#toast\{position:fixed;left:50%;bottom:25px;transform:translate\(-50%,calc\(100% \+ 40px\)\);[^}]*transition:transform \.2s,opacity \.2s,visibility \.2s\}#toast\.show\{transform:translate\(-50%,0\)\}/);
  assert.match(css, /body\.m-app #toast\{bottom:calc\(var\(--m-tabs-h\) \+ 14px\)\}/);
  assert.match(main, /fill\.style\.transform=`scaleY\(\$\{whiteShare\/100\}\)`/);
  assert.match(main, /const fill=\$\('#meterFill'\);if\(fill\)fill\.style\.transform=`scaleX\(/);
  assert.match(css, /\.analysis \.meter #meterFill\{width:100%;transform-origin:0 50%;transform:scaleX\(\.5\);transition:transform \.2s\}/);
  // No endless animation changes a box-shadow or a background (each frame would be repainted).
  const frames = [...css.matchAll(/@keyframes ([\w-]+)\{((?:[^{}]*\{[^}]*\})*)\}/g)];
  const endless = new Set([...css.matchAll(/animation:\s*([\w-]+)[^;}]*infinite/g)].map(m => m[1]));
  const repaint = frames.filter(([, name, body]) => endless.has(name) && /box-shadow|background/.test(body)).map(([, name]) => name);
  assert.deepEqual(repaint, []);
});

test('dragging measures the board once per pointer move', () => {
  assert.match(main, /const area=boardPlayArea\(\);\n  positionDragFloat\(drag,event\.clientX,event\.clientY,area\);\n  markDragOver\(drag,squareFromPoint\(area,event\.clientX,event\.clientY,flipped\)\);/);
});
