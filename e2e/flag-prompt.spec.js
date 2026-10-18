import { test, expect } from '@playwright/test';

// The one-time "Show your country flag" card used to pop up in the middle of a live game, over
// the chat's Send button (the live two-browser acceptance test got stuck on it). It now waits
// for a quiet moment: no game in progress, chat closed, no dialog open.
const START='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
async function mockServer(page,{status='active'}={}){
  const game={id:'g1',invite_code:'ABCD1234',status,result:'*',fen:START,version:1,move_count:0,move_history:[],white_player_id:'me',black_player_id:'opp',white_name:'Guest-ME',black_name:'Guest-OP',time_control_seconds:600,increment_seconds:0,white_time_ms:600000,black_time_ms:600000,last_move_at:new Date().toISOString(),started_at:new Date().toISOString(),rated:false,pool:'rapid',variant:'standard'};
  const sent=[];
  await page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', async route=>{
    let body={};try{body=route.request().postDataJSON()}catch{}
    const a=body?.action;if(a==='chat_send')sent.push(body.body);
    const payload=a==='profile'?{player:{id:'me',display_name:'Guest-ME',ratings:{rapid:1200}}}
      :['create','state','join','heartbeat'].includes(a)?{game,seat:'w',player:{id:'me',display_name:'Guest-ME'}}
      :a==='chat_list'?{messages:[]}
      :a==='chat_send'?{message:{id:'m1',game_id:'g1',player_id:'me',display_name:'Guest-ME',body:body.body,client_nonce:body.nonce||'n',created_at:new Date().toISOString()}}:{};
    await route.fulfill({contentType:'application/json',body:JSON.stringify(payload)});
  });
  await page.addInitScript(()=>localStorage.setItem('vch.intro-seen','1'));
  return sent;
}

test('the flag prompt waits while a game is on and never covers the chat', async ({ page, isMobile }) => {
  test.skip(isMobile,'phones open chat from the action bar; the prompt logic is shared');
  await mockServer(page);
  await page.goto('/');
  await page.locator('#create').click();
  await expect.poll(()=>new URL(page.url()).searchParams.get('game')).not.toBeNull();
  await page.waitForTimeout(3500); // past the prompt's 2.5s delay
  await expect(page.locator('.flag-prompt')).toHaveCount(0);
  await page.locator('.game-more>summary').click();await page.locator('#openChat').click();
  await expect(page.locator('#chatDrawer')).toHaveClass(/open/);
  await page.locator('#message').fill('hello');
  await page.locator('#chat .chat-send').click({timeout:3000});
  await expect(page.locator('#message')).toHaveValue('');
});

test('the flag prompt still appears when no game is on, and stays dismissed', async ({ page, isMobile }) => {
  await mockServer(page);
  await page.goto('/');
  if(isMobile){
    // Phones: never over the Play tab's Start game / Create room buttons; it asks on another tab.
    await page.waitForTimeout(3500);
    await expect(page.locator('.flag-prompt')).toHaveCount(0);
    await page.locator('[data-m-tab="puzzles"]').click();
    await expect(page.locator('.flag-prompt')).toBeVisible({timeout:9000});
    await page.locator('[data-m-tab="play"]').click();
    await expect(page.locator('.flag-prompt')).toHaveCount(0);
    await page.locator('[data-m-tab="puzzles"]').click();
  }
  await expect(page.locator('.flag-prompt')).toBeVisible({timeout:9000});
  await page.locator('.flag-prompt [data-flag="no"]').click();
  await expect(page.locator('.flag-prompt')).toHaveCount(0);
  await page.reload();await page.waitForTimeout(3500);
  await expect(page.locator('.flag-prompt')).toHaveCount(0);
});
