import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { MenuController, backdropHit } from '../src/menus.js';

const main=await readFile(new URL('../src/main.js',import.meta.url),'utf8');
const css=await readFile(new URL('../src/style.css',import.meta.url),'utf8');

function fakeMenu(log,name,inside=new Set()){
  return {open:()=>log.push(`open:${name}`),close:()=>log.push(`close:${name}`),contains:target=>inside.has(target)};
}

test('only one menu is open at a time; opening another closes the current one',()=>{
  const log=[],menus=new MenuController();
  menus.register('profile',fakeMenu(log,'profile')).register('theme',fakeMenu(log,'theme'));
  menus.open('profile');menus.open('theme');
  assert.deepEqual(log,['open:profile','close:profile','open:theme']);
  assert.equal(menus.current,'theme');
});

test('toggle, Escape and outside presses close the open menu; inside presses do not',()=>{
  const log=[],inside=Symbol('inside'),outside=Symbol('outside'),menus=new MenuController();
  menus.register('profile',fakeMenu(log,'profile',new Set([inside])));
  menus.toggle('profile');
  assert.equal(menus.handleOutside(inside),false);
  assert.equal(menus.current,'profile');
  assert.equal(menus.handleOutside(outside),true);
  assert.equal(menus.current,null);
  menus.open('profile');assert.equal(menus.handleEscape(),true);
  assert.equal(menus.handleEscape(),false,'Escape with nothing open is left for other handlers');
  menus.toggle('profile');menus.toggle('profile');
  assert.deepEqual(log,['open:profile','close:profile','open:profile','close:profile','open:profile','close:profile']);
});

test('a surface that closes itself clears the open state without re-closing',()=>{
  const log=[],menus=new MenuController();
  menus.register('account',fakeMenu(log,'account'));
  menus.open('account');menus.closed('account');
  assert.equal(menus.current,null);
  assert.deepEqual(log,['open:account']);
});

test('backdrop hits only count presses outside the dialog box',()=>{
  const element={getBoundingClientRect:()=>({left:10,right:110,top:10,bottom:110})};
  assert.equal(backdropHit({target:element,clientX:5,clientY:50},element),true);
  assert.equal(backdropHit({target:element,clientX:50,clientY:50},element),false);
  assert.equal(backdropHit({target:{},clientX:5,clientY:50},element),false);
});

test('every menu, popover and dialog goes through the shared controller',()=>{
  for(const name of ['profile','notifications'])assert.match(main,new RegExp(`registerPopover\\('${name}'`));
  for(const name of ['theme','account','search','promotion'])assert.match(main,new RegExp(`registerModal\\('${name}'`));
  assert.match(main,/menus\.register\('game-more'/);
  assert.match(main,/document\.addEventListener\('pointerdown',event=>\{menus\.handleOutside\(event\.target\)\},true\)/);
  assert.match(main,/if\(event\.key==='Escape'&&menus\.handleEscape\(\)\)/);
  assert.doesNotMatch(main,/\$\('#(?:themeStudio|accountDialog|searchDialog|promotion)'\)\.showModal\(\)/,'dialogs must open through the menu controller');
  assert.match(main,/\$\('#accountBtn'\)\.onclick=\(\)=>\{syncIdentityUI\(\);menus\.toggle\('profile'\)\}/);
  assert.match(main,/\$\('#notifyBtn'\)\.onclick=\(\)=>menus\.toggle\('notifications'\)/);
});

test('profile menu is a compact dropdown with identity, links, auth and a close button',()=>{
  assert.match(main,/<section id="profileMenu" class="header-menu profile-menu"[^>]*hidden>/);
  for(const id of ['profileMenuName','profileMenuRating','profileMenuProfile','profileMenuSettings','profileMenuAuth','closeProfileMenu'])assert.ok(main.includes(`id="${id}"`),`missing #${id}`);
  assert.match(css,/\.header-menu\{\s*position:absolute;[^}]*width:280px;max-width:calc\(100vw - 24px\)/);
  assert.match(css,/\.header-actions\{position:relative\}/);
});

test('dismissed promotion dialog cancels the move instead of hanging',()=>{
  assert.match(main,/d\.addEventListener\('close',\(\)=>resolve\(piece\),\{once:true\}\)/);
  assert.match(main,/promotion=await choosePromotion\(\);if\(!promotion\)\{selected=null;render\(\);return\}/);
});
