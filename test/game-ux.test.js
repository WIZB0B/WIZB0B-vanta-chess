import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const main=await readFile(new URL('../src/main.js',import.meta.url),'utf8');
const css=await readFile(new URL('../src/style.css',import.meta.url),'utf8');
const api=await readFile(new URL('../src/vch-api.js',import.meta.url),'utf8');
const edge=await readFile(new URL('../supabase/functions/chess/index.ts',import.meta.url),'utf8');

test('draw offers use cancellable sender state and a timed non-blocking receiver card',()=>{
  assert.ok(main.includes('id="drawOfferCard" class="draw-offer-card hidden"'));
  assert.ok(main.includes("button.textContent=own?'Draw offered · Cancel':'Offer draw'"));
  assert.ok(main.includes("respondToDrawOffer(false,'expired')"));
  assert.ok(main.includes('},10000)'));
  assert.ok(main.includes('id="acceptDrawOffer"'));
  assert.ok(main.includes('id="declineDrawOffer"'));
  assert.ok(main.includes("toast('Draw offer declined')"));
  assert.ok(main.includes("toast('Draw offer expired')"));
  assert.ok(api.includes("drawCancel(gameId) { return this.request('draw_cancel', { gameId }); }"));
  assert.ok(edge.includes('async function cancelDraw('));
  assert.ok(edge.includes('case "draw_cancel":out=await cancelDraw(req,b);break'));
});

test('chat shows unread badge and clickable 60 character toast previews',()=>{
  assert.ok(main.includes('id="chatUnread" class="chat-unread hidden"'));
  assert.ok(main.includes('chatUnread+=fresh.length'));
  assert.ok(main.includes("String(item?.body||'').slice(0,60)"));
  assert.ok(main.includes('onClick:openChatDrawer'));
  assert.ok(main.includes("broadcastAux('chat_hint'"));
  assert.match(css,/\.chat-unread\{/);
});

test('low time triggers once below ten seconds with warning sound and red pulse',()=>{
  const start=main.indexOf('function syncLowTimeWarning'),end=main.indexOf('function checkLocalTimeout',start),body=main.slice(start,end);
  assert.ok(body.includes('seconds>0&&seconds<10'));
  assert.ok(body.includes("if(low&&!lowTimeWarned){lowTimeWarned=true;toast('Low time · under 10 seconds');playUiSound('warning')}"));
  assert.ok(body.includes("classList.toggle('low-time',low)"));
  assert.ok(main.includes('warning:[760,620]'));
  assert.match(css,/#bottomClock\.low-time/);
  assert.match(css,/@keyframes vch-low-time-pulse/);
});
