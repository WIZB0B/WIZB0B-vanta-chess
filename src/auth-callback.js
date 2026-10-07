// Email links (sign-up confirmation, resend, and any future reset / magic-link / OAuth flows)
// always return to this route on the current origin, so production, deploy previews and
// localhost each get their own callback. Tokens are never logged or rendered.
export const AUTH_CALLBACK_PATH='/auth/callback';

export function authRedirectUrl(location=globalThis.location){
  return new URL(AUTH_CALLBACK_PATH,location.origin).toString();
}

// Supabase Auth REST endpoints read the redirect from the `redirect_to` query parameter
// (supabase-js sends emailRedirectTo / redirectTo the same way).
export function withAuthRedirect(path,location=globalThis.location){
  return `${path}${path.includes('?')?'&':'?'}redirect_to=${encodeURIComponent(authRedirectUrl(location))}`;
}

export function isAuthCallback(location=globalThis.location){
  return location.pathname.replace(/\/+$/,'')===AUTH_CALLBACK_PATH;
}

// Implicit-flow results arrive in the hash; some errors arrive in the query string.
export function readAuthCallback(href){
  const url=new URL(href),params=new URLSearchParams(url.search);
  for(const [key,value] of new URLSearchParams(url.hash.replace(/^#/,'')))params.set(key,value);
  const hasError=params.has('error')||params.has('error_code')||params.has('error_description');
  return {
    hasTokens:params.has('access_token'),
    error:hasError?{code:params.get('error_code')||params.get('error')||'unknown'}:null
  };
}

export function friendlyAuthError(error){
  const code=String(error?.code||'');
  if(code==='otp_expired')return {title:'Confirmation link expired',body:'This confirmation link has expired. Enter your email and we will send you a new one.'};
  if(['access_denied','otp_disabled','bad_jwt','invalid_link','flow_state_not_found','flow_state_expired'].includes(code))return {title:'Link no longer valid',body:'This link is invalid or has already been used. Enter your email and we will send you a new confirmation link.'};
  return {title:'Could not confirm your email',body:'Something went wrong with this link. Enter your email and we will send you a new confirmation link.'};
}

// Runs once at startup. `detectSession` lets supabase-js read the session from the URL; the
// address bar is cleaned right after (success or failure) so tokens never linger or get shared.
export async function handleAuthCallback({location,history,detectSession,onSignedIn,onError,home='/'}){
  if(!isAuthCallback(location))return {handled:false};
  const info=readAuthCallback(location.href);
  const clear=()=>history.replaceState(null,'',home);
  if(info.error){clear();await onError(info.error);return {handled:true,status:'error'}}
  if(!info.hasTokens){clear();return {handled:true,status:'empty'}}
  let session=null,failure=null;
  try{({session=null,error:failure=null}=await detectSession()||{})}
  catch(error){failure=error}
  finally{clear()}
  if(!session?.access_token){await onError({code:failure?.code||'invalid_link'});return {handled:true,status:'error'}}
  await onSignedIn(session);
  return {handled:true,status:'signed-in'};
}
