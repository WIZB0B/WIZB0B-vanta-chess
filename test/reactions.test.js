import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EMOJI_SET, REACTIONS, REACTION_CSS, REACTION_IDS, parseReaction, reactionById, reactionMarkup, reactionMessage } from '../src/reactions.js';
import { isReactionBody, reactionIdOf } from '../supabase/functions/chess/reaction-ids.js';
import { isReactionBody as moderationIsReactionBody } from '../supabase/functions/chess/moderation.js';

const EMOJI = /\p{Extended_Pictographic}/u;

test('reactions: sixteen unique ids, in step with the server list, each labelled and described', () => {
  const ids = REACTIONS.map(r => r.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(ids, [...REACTION_IDS]);
  assert.equal(ids.length, 16);
  for (const r of REACTIONS) {
    assert.match(r.id, /^[a-z]{2,12}$/);
    assert.ok(r.label && r.alt, r.id);
    assert.doesNotMatch(r.label + r.alt, EMOJI, `${r.id} uses no emoji`);
    assert.ok(Object.isFrozen(r));
  }
  assert.ok(Object.isFrozen(REACTIONS));
});

test('reactions: every picture is self-contained inline SVG with nothing executable or external', () => {
  for (const { id, svg } of REACTIONS) {
    assert.match(svg, /^<svg class="vr-svg" xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 100 100" aria-hidden="true" focusable="false">/, id);
    assert.ok(svg.endsWith('</svg>'), id);
    assert.doesNotMatch(svg, /<script|<foreignObject|<image|<use|<a[\s>]|<style|<iframe/i, id);
    assert.doesNotMatch(svg, /\son[a-z]+\s*=/i, `${id} has no event handler attributes`);
    assert.doesNotMatch(svg, /href|url\(|javascript:|data:/i, `${id} points nowhere`);
    assert.doesNotMatch(svg, /\sid=/, `${id} declares no ids (many copies share a page)`);
    assert.doesNotMatch(svg, /NaN|undefined|\$\{/, id);
    assert.doesNotMatch(svg, EMOJI, `${id} draws, it doesn't use emoji`);
    for (const tag of ['g', 'svg', 'text']) {
      const open = (svg.match(new RegExp(`<${tag}[\\s>]`, 'g')) || []).length, close = (svg.match(new RegExp(`</${tag}>`, 'g')) || []).length;
      assert.equal(open, close, `${id}: <${tag}> tags balance`);
    }
    assert.match(svg, /class="vr-[a-z-]+/, `${id} has an animated part`);
  }
  assert.doesNotMatch(readFileSync(new URL('../src/reactions.js', import.meta.url), 'utf8'), /\.(png|gif|webp|jpe?g)\b/i, 'no image files');
});

test('reactions: chat body round-trips and only exact known ids are accepted', () => {
  for (const { id } of REACTIONS) {
    const body = reactionMessage(id);
    assert.equal(body, `:r:${id}`);
    assert.equal(parseReaction(body), reactionById(id));
    assert.equal(isReactionBody(body), true);
    assert.equal(moderationIsReactionBody(body), true);
    assert.equal(reactionIdOf(body), id);
  }
  for (const bad of [':r:nope', ':r:GG', ' :r:gg', ':r:gg ', ':r:gg!', ':r: gg', 'r:gg', ':R:gg', ':r:', ':r:__proto__', ':r:constructor', ':r:toString', ':r:gg<script>', 'gg', '', null, undefined, 5, {}, [':r:gg']]) {
    assert.equal(parseReaction(bad), null, String(bad));
    assert.equal(isReactionBody(bad), false, String(bad));
  }
  for (const bad of ['nope', '__proto__', 'GG', '', null]) {
    assert.equal(reactionMessage(bad), null);
    assert.equal(reactionById(bad), null);
  }
});

test('reactions: markup is a labelled span around our own SVG, with a clamped size', () => {
  const html = reactionMarkup('gg');
  assert.match(html, /^<span class="vch-reaction" data-reaction="gg" role="img" aria-label="GG: Two pawns bow to each other" style="width:64px;height:64px"><svg /);
  assert.ok(html.endsWith('</svg></span>'));
  assert.match(reactionMarkup('fire', { size: 128 }), /width:128px;height:128px/);
  assert.match(reactionMarkup('fire', { size: 9999 }), /width:256px;height:256px/);
  assert.match(reactionMarkup('fire', { size: 2 }), /width:16px;height:16px/);
  assert.match(reactionMarkup('fire', { size: '"><script>' }), /width:64px;height:64px/);
  assert.equal(reactionMarkup('<img src=x onerror=alert(1)>'), '');
  assert.equal(reactionMarkup(':r:gg'), '');
});

test('reactions: CSS is scoped, prefixed, respects reduced motion, and every animation runs 1.2-2.4s', () => {
  assert.match(REACTION_CSS, /@media \(prefers-reduced-motion:reduce\)\{\.vch-reaction \*\{animation:none!important\}\}/);
  assert.match(REACTION_CSS, /\.vch-reaction\.vr-still \*\{animation:none!important\}/);
  assert.match(REACTION_CSS, /var\(--vr-loops,infinite\)/);
  const rules = REACTION_CSS.split('\n');
  for (const rule of rules) {
    if (rule.startsWith('@keyframes')) assert.match(rule, /^@keyframes vr-[a-z-]+\{/, rule);
    else if (!rule.startsWith('@media')) for (const selector of rule.slice(0, rule.indexOf('{')).split(',')) assert.match(selector, /^\.vch-reaction(?:$|[ .])/, selector);
  }
  const names = new Set([...REACTION_CSS.matchAll(/@keyframes (vr-[a-z-]+)/g)].map(m => m[1]));
  const used = [...REACTION_CSS.matchAll(/animation:(vr-[a-z-]+) ([\d.]+)s/g)];
  assert.ok(used.length >= 16);
  for (const [, name, seconds] of used) {
    assert.ok(names.has(name), `${name} has keyframes`);
    assert.ok(Number(seconds) >= 1.2 && Number(seconds) <= 2.4, `${name} runs ${seconds}s`);
  }
  for (const { id, svg } of REACTIONS) {
    for (const [, classes] of svg.matchAll(/class="([^"]+)"/g)) for (const c of classes.split(' ')) {
      if (c !== 'vr-svg') assert.ok(REACTION_CSS.includes(`.${c}{`) || REACTION_CSS.includes(`.${c},`), `${id}: .${c} is styled`);
    }
  }
});

test('emoji picker: about forty common emoji in named groups, each with a name', () => {
  const items = EMOJI_SET.flatMap(g => g.items);
  assert.ok(items.length >= 36 && items.length <= 48, `${items.length} emoji`);
  assert.equal(new Set(items.map(i => i.char)).size, items.length);
  for (const { group, items: list } of EMOJI_SET) {
    assert.ok(group && list.length, group);
    for (const { char, name } of list) {
      assert.match(char, EMOJI, name);
      assert.ok(name.length > 2 && !EMOJI.test(name), char);
    }
  }
  assert.ok(Object.isFrozen(EMOJI_SET) && EMOJI_SET.every(g => Object.isFrozen(g) && Object.isFrozen(g.items)));
  const source = readFileSync(new URL('../src/reactions.js', import.meta.url), 'utf8');
  assert.ok([...source].every(c => c.codePointAt(0) < 128), 'emoji are written as escapes, so the source stays ASCII');
});
