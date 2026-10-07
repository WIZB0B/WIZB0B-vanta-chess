import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { AUTH_CALLBACK_PATH, authRedirectUrl, withAuthRedirect, isAuthCallback, readAuthCallback, friendlyAuthError, handleAuthCallback } from '../src/auth-callback.js';

const main=await readFile(new URL('../src/main.js',import.meta.url),'utf8');
const helper=await readFile(new URL('../src/auth-callback.js',import.meta.url),'utf8');
const TOKEN='tok.en-SECRET-value';
const loc=href=>{const url=new URL(href);return {href:url.href,origin:url.origin,pathname:url.pathname,search:url.search,hash:url.hash}};
function fakeHistory(){const calls=[];return {calls,replaceState:(state,title,url)=>calls.push(url)}}

test('redirect URL is the current origin plus /auth/callback',()=>{
  assert.equal(AUTH_CALLBACK_PATH,'/auth/callback');
  assert.equal(authRedirectUrl(loc('https://vanta-chess-play.netlify.app/play?game=AB12#x')),'https://vanta-chess-play.netlify.app/auth/callback');
  assert.equal(authRedirectUrl(loc('https://deploy-preview-1--vanta-chess-play.netlify.app/')),'https://deploy-preview-1--vanta-chess-play.netlify.app/auth/callback');
  assert.equal(authRedirectUrl(loc('http://localhost:5173/anything')),'http://localhost:5173/auth/callback');
});

test('auth REST paths carry an encoded redirect_to',()=>{
  const at=loc('https://deploy-preview-1--vanta-chess-play.netlify.app/');
  assert.equal(withAuthRedirect('/auth/v1/signup',at),'/auth/v1/signup?redirect_to=https%3A%2F%2Fdeploy-preview-1--vanta-chess-play.netlify.app%2Fauth%2Fcallback');
  assert.equal(withAuthRedirect('/auth/v1/verify?type=signup',at),'/auth/v1/verify?type=signup&redirect_to=https%3A%2F%2Fdeploy-preview-1--vanta-chess-play.netlify.app%2Fauth%2Fcallback');
});

test('every email-sending auth call passes the redirect',()=>{
  assert.match(main,/authFetch\(withAuthRedirect\('\/auth\/v1\/signup'\),\{email,password,data:\{username\}\}\)/);
  assert.match(main,/authFetch\(withAuthRedirect\('\/auth\/v1\/resend'\),\{type:'signup',email\}\)/);
  for(const endpoint of ['signup','resend','recover','otp','magiclink','authorize']){
    for(const call of main.matchAll(new RegExp(`authFetch\\(([^,]*\\/auth\\/v1\\/${endpoint}[^,]*)`,'g')))assert.match(call[1],/^withAuthRedirect\(/,`${endpoint} must use withAuthRedirect`);
  }
  assert.doesNotMatch(main,/supabase\.auth\.(signUp|resetPasswordForEmail|signInWithOtp|signInWithOAuth)\(/,'no direct supabase-js email calls bypass the redirect');
});

test('callback parsing reads hash and query, and recognises errors',()=>{
  assert.equal(isAuthCallback(loc('https://x.test/auth/callback')),true);
  assert.equal(isAuthCallback(loc('https://x.test/auth/callback/')),true);
  assert.equal(isAuthCallback(loc('https://x.test/')),false);
  assert.deepEqual(readAuthCallback(`https://x.test/auth/callback#access_token=${TOKEN}&refresh_token=r&type=signup`),{hasTokens:true,error:null});
  assert.deepEqual(readAuthCallback('https://x.test/auth/callback#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired'),{hasTokens:false,error:{code:'otp_expired'}});
  assert.deepEqual(readAuthCallback('https://x.test/auth/callback?error=access_denied&error_description=bad'),{hasTokens:false,error:{code:'access_denied'}});
  assert.match(friendlyAuthError({code:'otp_expired'}).body,/expired/);
  assert.match(friendlyAuthError({code:'access_denied'}).body,/already been used/);
  assert.equal(typeof friendlyAuthError({code:'weird'}).title,'string');
});

test('successful callback clears tokens from the address bar and signs in',async()=>{
  const history=fakeHistory(),seen=[];let urlWhenDetecting=null;
  const result=await handleAuthCallback({
    location:loc(`https://x.test/auth/callback#access_token=${TOKEN}&refresh_token=r&expires_in=3600&token_type=bearer&type=signup`),history,
    detectSession:async()=>{urlWhenDetecting=history.calls.length;return {session:{access_token:TOKEN,refresh_token:'r'},error:null}},
    onSignedIn:session=>seen.push(session.access_token),onError:()=>assert.fail('no error expected')
  });
  assert.equal(result.status,'signed-in');
  assert.equal(urlWhenDetecting,0,'supabase-js reads the URL before it is cleared');
  assert.deepEqual(history.calls,['/'],'hash is replaced with the home path');
  assert.ok(history.calls.every(url=>!url.includes(TOKEN)));
  assert.deepEqual(seen,[TOKEN]);
});

test('failed session detection still clears the hash and shows the friendly error',async()=>{
  const history=fakeHistory(),errors=[];
  const result=await handleAuthCallback({
    location:loc(`https://x.test/auth/callback#access_token=${TOKEN}&refresh_token=r`),history,
    detectSession:async()=>{throw Object.assign(new Error('invalid JWT'),{code:'bad_jwt'})},
    onSignedIn:()=>assert.fail('must not sign in'),onError:error=>errors.push(error.code)
  });
  assert.equal(result.status,'error');assert.deepEqual(history.calls,['/']);assert.deepEqual(errors,['bad_jwt']);
});

test('error links are cleared without touching supabase and open the resend dialog',async()=>{
  const history=fakeHistory(),errors=[];
  await handleAuthCallback({
    location:loc('https://x.test/auth/callback#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired'),history,
    detectSession:()=>assert.fail('no session detection for error links'),onSignedIn:()=>assert.fail(),onError:error=>errors.push(error.code)
  });
  assert.deepEqual(history.calls,['/']);assert.deepEqual(errors,['otp_expired']);
  const dialog=main.slice(main.indexOf('async function showAuthLinkError'),main.indexOf('\n}\n',main.indexOf('async function showAuthLinkError')));
  assert.match(dialog,/label:'Resend confirmation email'/);
});

test('other pages are left alone',async()=>{
  const history=fakeHistory();
  assert.deepEqual(await handleAuthCallback({location:loc('https://x.test/?game=AB12'),history,detectSession:()=>assert.fail(),onSignedIn:()=>assert.fail(),onError:()=>assert.fail()}),{handled:false});
  assert.deepEqual(history.calls,[]);
});

test('tokens are never logged or rendered by the callback code',()=>{
  assert.doesNotMatch(helper,/console\./);
  const flow=main.slice(main.indexOf('async function detectCallbackSession'),main.indexOf('async function showAuthLinkError'));
  assert.doesNotMatch(flow,/console\.|innerHTML|textContent/);
  assert.match(flow,/detectSessionInUrl:true,flowType:'implicit'/);
  assert.match(flow,/persistSession:false/);
  assert.match(main,/toast\("Email confirmed, you're signed in"/);
});
