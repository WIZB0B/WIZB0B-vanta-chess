import { expect } from '@playwright/test';

// A stand-in for /stockfish.worker.js: the bot only answers when the test releases a move
// (see releaseBotMove), so "the opponent replies while I'm premoving" is deterministic.
// Analysis requests are ignored. The page counts bot requests in window.__botRequests.
const FAKE_ENGINE=`
const channel=new BroadcastChannel('vch-test-engine');let pending=null;
channel.onmessage=({data})=>{
  if(pending&&data&&data.move){self.postMessage({type:'uci',line:'bestmove '+data.move,requestId:pending.requestId});pending=null}
};
self.onmessage=({data})=>{if(data&&data.mode==='bot'){pending=data;channel.postMessage({type:'thinking'})}};
`;

export async function mockBackend(page){
  await page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', async route=>{
    let body={};try{body=route.request().postDataJSON()}catch{}
    const payload=body.action==='profile'?{player:{id:'move-player',display_name:'Guest-MV',ratings:{rapid:1200}}}:{};
    await route.fulfill({contentType:'application/json',body:JSON.stringify(payload)});
  });
  await page.addInitScript(()=>localStorage.setItem('vch.intro-seen','1'));
}

export async function useScriptedEngine(page){
  await page.route('**/stockfish.worker.js',route=>route.fulfill({contentType:'text/javascript',body:FAKE_ENGINE}));
  await page.addInitScript(()=>{
    window.__botRequests=0;
    new BroadcastChannel('vch-test-engine').onmessage=({data})=>{if(data?.type==='thinking')window.__botRequests++};
  });
}

// Waits until the bot has been asked for move number `n` (1-based), then lets it play `uci`.
export async function releaseBotMove(page,uci,n){
  await expect.poll(()=>page.evaluate(()=>window.__botRequests),{timeout:5000}).toBeGreaterThanOrEqual(n);
  await page.evaluate(move=>new BroadcastChannel('vch-test-engine').postMessage({move}),uci);
}

export async function startComputerGame(page){
  await page.goto('/');
  await page.locator('[data-mode="computer"]').click();
  await page.locator('[data-bot-slug="gambit"]').click();
  await page.locator('#computerStart').click();
  await expect(page.locator('.board-piece')).toHaveCount(32);
}

export const piece=(page,sq)=>page.locator(`.board-piece[data-square="${sq}"]`);
export async function center(page,sq){
  const square=page.locator(`[data-sq="${sq}"]`);
  // Keep the whole board in view (not just this square): otherwise measuring the next square
  // can scroll the page and leave coordinates measured earlier pointing at the wrong square.
  await square.evaluate(el=>{const board=el.closest('.board')||el,r=board.getBoundingClientRect();if(r.top<0||r.bottom>innerHeight||r.left<0||r.right>innerWidth)board.scrollIntoView({block:'center',inline:'center'})});
  const b=await square.boundingBox();
  return {x:b.x+b.width/2,y:b.y+b.height/2};
}
// Clicks a square by position: pieces sit above the squares, and the board resolves the
// square under the pointer, exactly as for a user.
export async function clickAt(page,sq){const c=await center(page,sq);await page.mouse.click(c.x,c.y)}
export async function nextFrame(page){await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>resolve())))}

export async function openingAfterE4D5(page){
  await mockBackend(page);await useScriptedEngine(page);await startComputerGame(page);
  await clickAt(page,'e2');await clickAt(page,'e4');
  await releaseBotMove(page,'d7d5',1);
  await expect(piece(page,'d5')).toHaveCount(1);
}

// Plays Qd1-h5 by clicks and samples the queen on every animation frame from before the move
// until well after it lands. `input` is when the board's click handler (which makes the move)
// received the click; `progress(frame)` is 0 on d1 and 1 on h5 along the path.
export async function recordQueenMove(page,frameCount=90){
  await clickAt(page,'d1');
  await expect(page.locator('[data-sq="d1"]')).toHaveClass(/selected/);
  const d1=await center(page,'d1'),h5=await center(page,'h5');
  await page.evaluate(count=>{
    const queen=document.querySelector('.board-piece[data-square="d1"]');
    window.__queen=queen;window.__frames=[];window.__input=null;
    document.querySelector('#board').addEventListener('click',()=>{window.__input??=performance.now()},{capture:true});
    const sample=time=>{
      const r=queen.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,hit=document.elementFromPoint(x,y);
      window.__frames.push({time,x,y,onTop:!!hit&&queen.contains(hit),connected:queen.isConnected,visibility:getComputedStyle(queen).visibility,opacity:Number(getComputedStyle(queen).opacity)});
      if(window.__frames.length<count)requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  },frameCount);
  await clickAt(page,'h5');
  // Wait outside the page: polling it (waitForFunction) would add work to the frames measured.
  await page.waitForTimeout(frameCount*17+300);
  await page.waitForFunction(count=>window.__frames.length>=count,frameCount,{timeout:5000});
  const {frames,input}=await page.evaluate(()=>({frames:window.__frames,input:window.__input}));
  expect(input,'the move click reached the board').not.toBeNull();
  const dx=h5.x-d1.x,dy=h5.y-d1.y,length2=dx*dx+dy*dy;
  const progress=f=>((f.x-d1.x)*dx+(f.y-d1.y)*dy)/length2;
  const log=frames.filter(f=>f.time>=input-20).map(f=>`${(f.time-input).toFixed(0)}ms:${(progress(f)*100).toFixed(0)}%`).join(' ');
  return {frames,input,d1,h5,progress,log};
}
