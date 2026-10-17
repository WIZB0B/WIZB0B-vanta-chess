import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MOBILE_MAX_WIDTH, MOBILE_QUERY, TABLET_MAX_WIDTH, moveStripHtml, moveStripItems, viewForTab } from '../src/mobile-shell.js';

const main = readFileSync('src/main.js', 'utf8');
const css = readFileSync('src/style.css', 'utf8');

test('tabs map to views; Play returns to a game in progress', () => {
  assert.equal(viewForTab('play'), 'home');
  assert.equal(viewForTab('play', { gameLive: true }), 'game');
  assert.equal(viewForTab('learn'), 'panel');
  assert.equal(viewForTab('more'), null);
  assert.equal(MOBILE_QUERY, `(max-width: ${MOBILE_MAX_WIDTH}px), (pointer: coarse) and (orientation: portrait) and (max-width: ${TABLET_MAX_WIDTH}px)`);
});

test('settings are one tap away on phones and tablets, not only in the desktop account menu', () => {
  assert.match(main, /<button id="settingsBtn"[^>]*aria-label="Settings"/, 'a settings button in the header');
  assert.match(main, /\$\('#settingsBtn'\)\.onclick=\(\)=>openSettings\(\)/, 'it opens the same settings as desktop');
  assert.match(main, /openSheet\('More',\[\s*\{label:'Settings',run:\(\)=>openSettings\(\)\}/, 'Settings leads the More sheet');
  assert.match(main, /openSheet\('Game options',\[[\s\S]*?\{label:'Settings',run:\(\)=>openSettings\(\)\}/, 'and the in-game options');
  assert.doesNotMatch(css, /\.header-actions \.user\{display:none\}/, 'the account button never disappears on narrower screens');
});

test('move strip numbers moves and marks the newest', () => {
  assert.deepEqual(moveStripItems(['e4', 'e5', 'Nf3']).map(i => i.number), ['1.', '', '2.']);
  const html = moveStripHtml(['e4', 'e5']);
  assert.match(html, /<i>1\.<\/i><b data-ply="1">e4<\/b><b data-ply="2" class="last">e5<\/b>/);
  assert.match(moveStripHtml(['e4', 'e5'], 1), /<b data-ply="1" class="last">e4<\/b><b data-ply="2">e5<\/b>/, 'the move being looked at is marked');
  assert.match(moveStripHtml([]), /Moves appear here/);
  assert.doesNotMatch(moveStripHtml(['<x>']), /<x>/, 'SAN is escaped');
});

test('phone layout is scoped to body.m-app so desktop is untouched', () => {
  const start = css.indexOf('=== PHONE APP SHELL'), block = css.slice(css.indexOf('*/', start) + 2, css.indexOf('=== END PHONE APP SHELL'));
  const rules = block.split('}').map(r => r.trim()).filter(r => r && !r.startsWith('@') && !r.startsWith('/*'));
  for (const rule of rules) {
    const selector = rule.split('{')[0].replace(/\/\*[\s\S]*?\*\//g, '').trim();
    if (!selector || selector.startsWith('@')) continue;
    const ok = selector.split(',').every(s => /body\.m-app|^\s*\.m-(tabs|gamebar|moves|actions|sheet|return|room|sheet-|moves-empty)|^\s*\.m-sheet|^\s*\.m-moves|^\s*\.m-tabs|^\s*\.m-actions|^\s*\.m-room/.test(s.trim()));
    assert.ok(ok, `unscoped phone rule: ${selector}`);
  }
  assert.match(main, /document\.body\.classList\.toggle\('m-app',mobile\)/);
});

test('board keeps one square aspect ratio and 8 equal columns', () => {
  assert.match(css, /\.board\{width:100%;aspect-ratio:1;display:grid;grid-template-columns:repeat\(8,1fr\)/);
});

test('a tap never zooms the page on a phone: no double-tap zoom, no zoom into a field', () => {
  // Owner, 2026-10-13: "when I click... it zooms in... even while playing games".
  assert.match(css, /html\{touch-action:manipulation;-webkit-text-size-adjust:100%;text-size-adjust:100%\}/, 'a double tap (a piece, then its square) does not zoom');
  assert.match(css, /@media \(hover:none\) and \(pointer:coarse\)\{input,select,textarea\{font-size:16px!important\}\}/, 'iOS zooms into any field under 16px');
  const viewport = readFileSync(new URL('../index.html', import.meta.url), 'utf8').match(/name="viewport" content="([^"]+)"/)[1];
  assert.doesNotMatch(viewport, /maximum-scale|user-scalable/, 'two fingers can still zoom, for anyone who needs to');
});
