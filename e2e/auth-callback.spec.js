import { test, expect } from '@playwright/test';

const TOKEN='e2e-access-token-should-never-show';
async function mockSupabase(page,calls){
  await page.route('https://ubjldcfiwrwiouwgmduo.supabase.co/**', async route=>{
    const request=route.request(),url=new URL(request.url());calls.push({path:url.pathname,search:url.search,auth:request.headers()['authorization']||''});
    if(url.pathname==='/auth/v1/user')return route.fulfill({contentType:'application/json',body:JSON.stringify({id:'user-1',email:'player@example.com',aud:'authenticated',role:'authenticated'})});
    if(url.pathname==='/auth/v1/resend')return route.fulfill({contentType:'application/json',body:'{}'});
    let body={};try{body=request.postDataJSON()}catch{}
    const payload=body.action==='profile'?{player:{id:'p-1',username:'Confirmed',account:true,ratings:{rapid:1200}}}:{};
    return route.fulfill({contentType:'application/json',body:JSON.stringify(payload)});
  });
}

test('email confirmation link signs in, clears tokens and toasts',async({page})=>{
  const calls=[],consoleText=[];page.on('console',message=>consoleText.push(message.text()));
  await mockSupabase(page,calls);
  await page.addInitScript(()=>localStorage.setItem('vch.intro-seen','1'));
  const now=Math.floor(Date.now()/1000);
  await page.goto(`/auth/callback#access_token=${TOKEN}&expires_at=${now+3600}&expires_in=3600&refresh_token=e2e-refresh&token_type=bearer&type=signup`);
  await expect(page.locator('#toast')).toContainText("Email confirmed, you're signed in");
  expect(new URL(page.url()).pathname).toBe('/');
  expect(page.url()).not.toContain(TOKEN);expect(page.url()).not.toContain('#');
  expect(calls.some(call=>call.path==='/auth/v1/user'&&call.auth===`Bearer ${TOKEN}`)).toBeTruthy();
  const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('vanta.auth-session')||'null'));
  expect(stored?.access_token).toBe(TOKEN);
  await expect(page.locator('body')).not.toContainText(TOKEN);
  expect(consoleText.join('\n')).not.toContain(TOKEN);
});

test('expired link shows a friendly dialog that resends to the callback URL',async({page})=>{
  const calls=[];await mockSupabase(page,calls);
  await page.addInitScript(()=>localStorage.setItem('vch.intro-seen','1'));
  await page.goto('/auth/callback#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired');
  const dialog=page.locator('.vch-dialog-panel');
  await expect(dialog).toContainText('Confirmation link expired');
  expect(page.url()).not.toContain('error');expect(new URL(page.url()).pathname).toBe('/');
  await dialog.locator('input[type="email"]').fill('player@example.com');
  await dialog.getByRole('button',{name:'Resend confirmation email'}).click();
  await expect(page.locator('#toast')).toContainText('Confirmation email sent');
  const resend=calls.find(call=>call.path==='/auth/v1/resend');
  expect(new URLSearchParams(resend.search).get('redirect_to')).toBe(new URL('/auth/callback',page.url()).toString());
  expect(calls.some(call=>call.path==='/auth/v1/user')).toBeFalsy();
});

test('sign-up asks Supabase to redirect back to this origin',async({page,isMobile})=>{
  test.skip(isMobile,'account button is hidden on narrow screens');
  const calls=[];await mockSupabase(page,calls);
  await page.addInitScript(()=>localStorage.setItem('vch.intro-seen','1'));
  await page.goto('/');
  await page.locator('#accountBtn').click();await page.locator('#profileMenuAuth').click();
  await page.locator('[data-auth="signup"]').click();
  await page.locator('#authUsername').fill('new_player');await page.locator('#authEmail').fill('new@example.com');await page.locator('#authPassword').fill('secret123');
  await page.locator('#authSubmit').click();
  await expect(page.locator('#authMessage')).toContainText('Confirm your email');
  const signup=calls.find(call=>call.path==='/auth/v1/signup');
  expect(new URLSearchParams(signup.search).get('redirect_to')).toBe(new URL('/auth/callback',page.url()).toString());
});
