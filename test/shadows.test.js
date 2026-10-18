import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { REALMS } from '../src/campaign.js';
import { relicById } from '../src/relics.js';

// Cast shadows (src/shadows.css): each piece's soft shadow falls away from its theme's light.
const read=path=>readFile(new URL(path,import.meta.url),'utf8');
const css=await read('../src/shadows.css');
const code=css.replace(/\/\*[\s\S]*?\*\//g,'');
const main=await read('../src/main.js');
const style=await read('../src/style.css');
const LIGHT=['--light-x','--light-y','--shadow-length','--shadow-softness','--shadow-strength','--shadow-rgb'];

// The declarations of the first rule whose selector is exactly `selector`.
function rule(selector){
  const start=[...code.matchAll(/(?:^|[}\n])\s*([^{}]+?)\{/g)].find(m=>m[1]===selector);
  assert.ok(start,`missing rule ${selector}`);
  const at=start.index+start[0].length;
  const body=code.slice(at,code.indexOf('}',at));
  return Object.fromEntries(body.split(';').map(d=>d.trim()).filter(Boolean).map(d=>{const i=d.indexOf(':');return [d.slice(0,i).trim(),d.slice(i+1).trim()]}));
}
const wallpapers=[...main.match(/<select id="wallpaper">([\s\S]*?)<\/select>/)[1].matchAll(/value="([a-z-]+)"/g)].map(m=>m[1]);
const light=selector=>{const r=rule(selector);return {x:Number(r['--light-x']),y:Number(r['--light-y']),length:Number(r['--shadow-length']),soft:Number(r['--shadow-softness']),strength:Number(r['--shadow-strength']),rgb:r['--shadow-rgb']}};

test('main.js loads the shadows right after the other stylesheets',()=>{
  assert.ok(main.includes("import './rtl.css';\nimport './shadows.css';"));
});

test('every Theme Studio wallpaper has its own light, and :root carries a gentle default (Emerald)',()=>{
  assert.deepEqual(wallpapers,['classic','cobalt','burgundy','ivory']);
  for(const selector of [':root',...wallpapers.map(w=>`body[data-wallpaper="${w}"]`)]){
    const r=rule(selector);
    for(const key of LIGHT)assert.ok(key in r,`${selector} sets ${key}`);
    const l=light(selector);
    assert.ok(Math.abs(l.x)<=1&&Math.abs(l.y)<=1&&(l.x||l.y),`${selector}: a light direction`);
    assert.ok(l.length>0&&l.length<=.8,`${selector}: shadow length in squares`);
    assert.ok(l.soft>=0&&l.soft<=1,`${selector}: softness 0..1`);
    assert.ok(l.strength>0&&l.strength<=.45,`${selector}: soft, never a black blot`);
    const rgb=l.rgb.split(/\s+/).map(Number);
    assert.equal(rgb.length,3,selector);
    assert.ok(rgb.every(c=>Number.isInteger(c)&&c>=0&&c<=40),`${selector}: a tinted near-black`);
  }
  assert.deepEqual(light(':root'),light('body[data-wallpaper="classic"]'));
});

test('the shadows fall where each wallpaper\'s light sends them',()=>{
  const [emerald,cobalt,burgundy,ivory]=wallpapers.map(w=>light(`body[data-wallpaper="${w}"]`));
  // Emerald and Cobalt are lit from the far end of the room (chandelier, moonlit window):
  // shadows come toward the player, Emerald's leaning right, Cobalt's (moon right of centre) left.
  for(const l of [emerald,cobalt])assert.ok(l.y<0&&Math.abs(l.y)>Math.abs(l.x));
  assert.ok(emerald.x<0&&cobalt.x>0);
  // Burgundy's candles and Ivory's window are on the right: shadows fall left; Ivory's
  // window is level with the board, so its shadows are the most sideways and the longest.
  assert.ok(burgundy.x>0&&ivory.x>0);
  assert.ok(Math.abs(ivory.x/ivory.y)>Math.abs(burgundy.x/burgundy.y));
  assert.ok(ivory.length>=Math.max(emerald.length,cobalt.length,burgundy.length));
  // Moonlight is crisper and cooler than candlelight.
  assert.ok(cobalt.soft<burgundy.soft);
  const [r,,b]=cobalt.rgb.split(' ').map(Number);assert.ok(b>r,'a cool shadow under the moon');
});

test('campaign realms tune only realms that exist, over a wallpaper that has a light',()=>{
  const tuned=[...code.matchAll(/body\[data-realm="([a-z]+)"\]/g)].map(m=>m[1]);
  assert.deepEqual([...new Set(tuned)].sort(),REALMS.map(r=>r.id).sort());
  for(const realm of REALMS)assert.ok(wallpapers.includes(relicById(realm.relic)?.wallpaper),realm.id);
  // The Spire's storm flashes from the upper left (style.css #atmosphere .atmo-flash at 30% 0%).
  assert.ok(Number(rule('body[data-realm="spire"]')['--light-x'])<0);
});

test('the shadow is cheap to composite: painted gradients only, nothing filtered or animated',()=>{
  // No transitions either: hovering a piece just before it moves must not start a second
  // animation alongside the move.
  assert.doesNotMatch(code,/filter|blur\(|drop-shadow|mask|mix-blend|blend-mode|box-shadow|@keyframes|animation|transition|will-change/);
  const shadow=rule('.board.cast-shadows .board-piece:not([data-react="triumph"])::after');
  assert.match(shadow.background,/^radial-gradient\([\s\S]*\),\s*radial-gradient\(/);
  // It is part of the piece, so it travels with the piece's transform (compositor-only moves).
  assert.match(style,/\.board-piece\{[^}]*will-change:transform;/);
});

test('the shadow lies under its piece and above the squares, turned away from the light',()=>{
  const shadow=rule('.board.cast-shadows .board-piece:not([data-react="triumph"])::after');
  assert.equal(shadow.content,'""');
  assert.equal(shadow.position,'absolute');
  assert.equal(shadow['z-index'],'-1');
  assert.equal(shadow['pointer-events'],'none');
  assert.equal(shadow.transform,'scaleY(var(--shadow-depth)) rotate(atan2(calc(var(--light-y) * -1),calc(var(--light-x) * -1)))');
  // Pieces stack by screen row, so a nearer piece covers a shadow falling toward it.
  assert.match(style,/\.board-piece\{[^}]*z-index:calc\(1 \+ var\(--row,0\)\);/);
});

// Owner, 2026-10-17: the pieces "seem to be floating on the board". On the flat board, seen
// from straight above, a shadow running down the screen into the next square reads as a piece
// hovering, so the cast shadow is drawn only on a board shown in perspective, which no screen
// is yet; the flat board's pieces keep their contact shadow, nudged by the same light.
test('on the flat board a piece casts no long shadow: only a board in perspective does',()=>{
  assert.match(code,/\.board\.cast-shadows \.board-piece:not\(\[data-react="triumph"\]\)::after\{/);
  assert.doesNotMatch(code,/(^|[},])\s*\.board-piece:not\(\[data-react="triumph"\]\)::after\{/m,'no shadow rule for every board');
  assert.doesNotMatch(main,/cast-shadows/,'no screen shows the board in perspective yet');
  assert.match(style,/\.board-piece::before\{[^}]*left:calc\(20% - var\(--light-x,0\) \* 2\.5%\);/,'the light still nudges the contact shadow');
});

test('taller pieces throw longer shadows',()=>{
  const h=Object.fromEntries([...'kqbnrp'].map(t=>[t,Number(rule(`.board-piece[data-piece$="${t}"]`)['--piece-h'])]));
  assert.deepEqual(Object.keys(h).sort((a,b)=>h[b]-h[a]),[...'kqbnrp']);
  assert.equal(h.k,1);assert.ok(h.p>=.6);
});

test('the dragged copy and Blackout show no shadow; the Ink sets a faint one; the triumph glow keeps ::after',()=>{
  assert.ok(code.includes('.drag-layer .board-piece::after,.board.blackout .board-piece::after{display:none}'));
  const ink=Number(rule(':root[data-piece-style$="-ink"]')['--shadow-set-strength']);
  assert.ok(ink>0&&ink<.6);
  assert.ok(style.includes(':root[data-piece-style$="-ink"] .board-piece::before{display:none}'),'Ink still has no contact shadow');
  assert.ok(style.includes('.board-piece[data-react="triumph"]::after{content:"";'));
  // Rules that could reach a triumph piece's ::after only ever hide it.
  for(const [,selector,body] of code.matchAll(/([^{}]*\.board-piece::after)\{([^}]*)\}/g))assert.equal(body,'display:none',selector.trim());
});
