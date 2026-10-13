import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GUIDE, guideFor, timeControlName } from '../src/hover-guide.js';

const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');

// A tiny element stand-in: matches() by attribute selectors and classes, enough for the guide.
function el({ attrs = {}, cls = [], text = '', parent = null, children = {} } = {}) {
  const node = {
    nodeType: 1, parentElement: parent, textContent: text, dataset: {},
    matches(selector) {
      return selector.split(',').some(sel => {
        sel = sel.trim();
        let m;
        if ((m = /^\[([\w-]+)(?:="([^"]*)")?\]$/.exec(sel))) return m[1] in attrs && (m[2] === undefined || attrs[m[1]] === m[2]);
        if ((m = /^\.([\w-]+)$/.exec(sel))) return cls.includes(m[1]);
        if ((m = /^#([\w-]+)$/.exec(sel))) return attrs.id === m[1];
        return false;
      });
    },
    querySelector: sel => children[sel] || null,
  };
  for (const [k, v] of Object.entries(attrs)) if (k.startsWith('data-')) node.dataset[k.slice(5).replace(/-(\w)/g, (_, c) => c.toUpperCase())] = v;
  return node;
}

test('every section in the top bar, every way to play and every variant has a description', () => {
  for (const nav of ['play', 'arena', 'watch', 'friends', 'puzzles', 'learn', 'openings', 'famous', 'review']) {
    const info = guideFor(el({ attrs: { 'data-nav': nav } }));
    assert.ok(info?.title && info.text.length > 20, nav);
  }
  for (const mode of ['match', 'room', 'computer']) assert.ok(guideFor(el({ attrs: { 'data-mode': mode } }))?.text, mode);
  for (const v of ['standard', 'dark', 'blackout']) assert.ok(guideFor(el({ attrs: { 'data-match-variant': v } }))?.text, v);
  for (const v of ['standard', 'freestyle', 'dark', 'blackout']) assert.ok(guideFor(el({ attrs: { 'data-computer-variant': v } }))?.text, v);
  for (const c of ['start-streak', 'start-survival', 'start-battle', 'computer-campaign', 'computer-gauntlet', 'computer-shadow']) assert.ok(guideFor(el({ cls: [c] }))?.text, c);
});

test('a child of a described button shows its button; plain elements show nothing', () => {
  const button = el({ attrs: { 'data-nav': 'arena' } }), icon = el({ parent: button });
  assert.equal(guideFor(icon)?.el, button);
  assert.equal(guideFor(el({ attrs: { 'data-sq': 'e4' } })), null);
  assert.equal(guideFor(null), null);
});

test('time controls are named by Lichess\'s estimate (base + 40 x increment)', () => {
  assert.equal(timeControlName('60-0'), 'Bullet · 1+0');
  assert.equal(timeControlName('180-0'), 'Blitz · 3+0');
  assert.equal(timeControlName('300-0'), 'Blitz · 5+0');
  assert.equal(timeControlName('600-0'), 'Rapid · 10+0');
  assert.equal(timeControlName('900-10'), 'Rapid · 15+10');
  assert.equal(timeControlName('1800-20'), 'Classical · 30+20');
  assert.equal(timeControlName('x'), null);
  const info = guideFor(el({ attrs: { 'data-match-time': '180-0' } }));
  assert.equal(info.title, 'Blitz · 3+0');
  assert.match(info.text, /Three to eight minutes/);
});

test('bot cards describe their engine', () => {
  const card = el({ cls: ['bot-card'], children: { b: { textContent: 'Fruitwood' }, '.bot-engine': { dataset: { about: 'A JavaScript engine.' } } } });
  assert.deepEqual({ ...guideFor(card), el: null }, { el: null, title: 'Fruitwood', text: 'A JavaScript engine.' });
});

test('the guide is wired once, for mouse and keyboard, and no icon is a unicode glyph', () => {
  assert.match(main, /import \{ guideFor \} from '\.\/hover-guide\.js';/);
  assert.match(main, /document\.addEventListener\('pointerover',event=>\{\n    if\(event\.pointerType!=='mouse'\)return;/);
  assert.match(main, /document\.addEventListener\('focusin'/);
  assert.match(main, /b\.textContent=tr\(info\.title\);span\.textContent=tr\(info\.text\)/, 'text, never HTML');
  assert.doesNotMatch(main, /[⇄♫▦⚑]/);
  assert.doesNotMatch(main, /class="back-view">←/);
  assert.ok(GUIDE.length >= 40);
});
