import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { Chess } from "npm:chess.js@1.4.0";
import { calculateMoveTiming } from "./latency.js";
import { applyCastle, castleOptions, initialRights, replay960, rightsAfterCastle, rightsAfterMove } from "./castle960.js";
import { zhPlay, zhState, zhStatus } from "./crazyhouse.js";
import { BATTLE_QUEUE_MS, LADDER_POINTS, PREP_PLIES, isoWeek, previousWeek } from "./rules.js";
import { MOMENT_DAYS, MOMENT_MIN_PLIES, momentCaption, momentScore } from "./rules.js";
import { BATTLE_COUNTDOWN_MS, BATTLE_MAX_MISSES, BATTLE_MS, BATTLE_PUZZLES, SIMUL_MAX_PLAYERS, VACATION_DAYS, battleOver, battleSet, battleWinner, cleanRepertoire, onVacation, vacationLeft, vacationOverlapMs, CLUB_LEAGUE_TOP, EXPLORER_PLIES, SANDBAG_FLAG, abortDue, clubLeagueTable, explorerKey, firstMovesPending, nextSandbagScore, sandbagAdjust, sandbagDelta, swissPairs } from "./rules.js";
import { CONDITIONAL_MAX_LINES, CONDITIONAL_MAX_PLIES, DIVISIONS, LEAGUE_MIN_GAMES, arenaScore, berserkAfter, berserkClock, dailyIndex, dailyMoveMs, freestyleFen, kMultiplier, leagueMoves, leaguePoints, matchConditional, newAchievements, previousSeason, puzzleRatingUpdate, seasonEnds, seasonOf, verifyJwt, zoneSizes } from "./rules.js";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const configuredOrigins=(Deno.env.get("VCH_ALLOWED_ORIGINS")||"").split(",").map(x=>x.trim()).filter(Boolean);
const allowedOrigin=(req:Request)=>{
  const origin=req.headers.get("origin")||"";
  if(!origin)return "";
  if(configuredOrigins.includes(origin))return origin;
  if(origin==="https://vanta-chess-play.netlify.app")return origin;
  if(/^https:\/\/(?:deploy-preview-\d+--|[a-z0-9-]+--)?vanta-chess-play\.netlify\.app$/i.test(origin))return origin;
  if(/^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(origin))return origin;
  return "";
};
const corsFor=(req:Request)=>{
  const origin=allowedOrigin(req);
  return {
    ...(origin?{"Access-Control-Allow-Origin":origin,"Vary":"Origin"}:{}),
    "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods":"POST,OPTIONS",
    "Access-Control-Max-Age":"86400",
    "Content-Type":"application/json",
    "Cache-Control":"no-store",
  };
};
const START_FEN="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const POOLS=["bullet","blitz","rapid","classical","daily","freestyle","crazyhouse"];
const nowIso=()=>new Date().toISOString();
async function broadcastGameState(game:any){
  if(!game?.id)return;
  const url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!url||!key)return;
  try{
    const response=await fetch(url+"/realtime/v1/api/broadcast",{
      method:"POST",
      headers:{apikey:key,authorization:"Bearer "+key,"content-type":"application/json"},
      body:JSON.stringify({messages:[{topic:"game:"+game.id,event:"state",payload:{game,serverNow:nowIso()}}]})
    });
    if(!response.ok)console.error("Realtime game broadcast failed",response.status,await response.text());
  }catch(error){console.error("Realtime game broadcast failed",error)}
}
const cleanName=(v:any)=>String(v||"Guest").replace(/[<>]/g,"").trim().slice(0,40)||"Guest";
const cleanCode=(v:any)=>String(v||"").replace(/[^A-Za-z0-9]/g,"").toUpperCase().slice(0,10);
const cleanUsername=(v:any)=>String(v||"").trim().replace(/[^A-Za-z0-9_]/g,"").slice(0,20);
const hash=async(v:string)=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v)))).map(x=>x.toString(16).padStart(2,"0")).join("");
const code8=()=>crypto.randomUUID().replace(/-/g,"").slice(0,8).toUpperCase();
const poolFor=(base:number,inc=0)=>{const e=Number(base)+(Number(inc)*40);return e<180?"bullet":e<600?"blitz":e<1800?"rapid":"classical"};
const ratingOf=(p:any,pool:string)=>Number(p?.ratings?.[pool]??p?.rating??1200);
const gamesOf=(p:any,pool:string)=>Number(p?.provisional_games?.[pool]??0);
const effectiveRating=(p:any,pool:string)=>{const base=ratingOf(p,pool)+sandbagAdjust(p?.sandbag_score),n=gamesOf(p,pool),sm=Number(p?.smurf_score||0);return n<10?Math.round(base+Math.min(450,sm*90)):base};
const publicPlayer=(p:any)=>({id:p.id,username:p.username,display_name:p.display_name,rating:p.rating,ratings:p.ratings,provisional_games:p.provisional_games,wins:p.wins,losses:p.losses,draws:p.draws,bot_stats:p.bot_stats,smurf_score:Number(p.smurf_score||0),account:!!p.auth_user_id,country_code:p.country_code||null,has_avatar:!!p.avatar_data,puzzle_rating:Number(p.puzzle_rating||1200),achievements:Array.isArray(p.achievements)?p.achievements:[]});
// The player's own profile also carries their portrait (a small data: image, see profileUpdate).
const ownPlayer=(p:any)=>({...publicPlayer(p),avatar_data:p.avatar_data||null,berserk_ready:!!p.berserk_ready,rated_win_streak:Number(p.rated_win_streak||0),puzzle_games:Number(p.puzzle_games||0),puzzle_best_streak:Number(p.puzzle_best_streak||0),league_division:Number(p.league_division||0),role:p.role||"player",muted_until:p.muted_until||null,banned:!!p.banned_at});
// Portraits: small inline images only (data: URLs, so the site's CSP needs no new origin).
const AVATAR_MAX=48000;
const AVATAR_RE=/^data:image\/(?:webp|jpeg|png);base64,[A-Za-z0-9+\/]+={0,2}$/;
const outcome=(c:Chess)=>!c.isGameOver()?{status:"active",result:"*"}:c.isCheckmate()?(c.turn()==="w"?{status:"black_won",result:"0-1"}:{status:"white_won",result:"1-0"}):{status:"draw",result:"1/2-1/2"};
const expected=(ra:number,rb:number)=>1/(1+Math.pow(10,(rb-ra)/400));
const scoreFor=(result:string,color:string)=>result==="1/2-1/2"?.5:(result===(color==="w"?"1-0":"0-1")?1:0);
const searchRange=(seconds:number)=>seconds<10?75:seconds<20?125:seconds<35?200:seconds<50?300:seconds<75?450:800;
const fail=(message:string,status=400)=>Object.assign(new Error(message),{status});
const send=(req:Request,data:any,status=200)=>new Response(JSON.stringify({...data,serverNow:nowIso()}),{status,headers:corsFor(req)});
async function bodyOf(req:Request){
  const declared=Number(req.headers.get("content-length")||0);
  if(declared>65536)throw fail("Request body is too large.",413);
  const raw=await req.text();
  if(raw.length>65536)throw fail("Request body is too large.",413);
  if(!raw)return {};
  try{return JSON.parse(raw)}catch{throw fail("Invalid JSON body.")}
}
async function one(table:string,col:string,val:any){const {data,error}=await admin.from(table).select("*").eq(col,val).maybeSingle();if(error)throw error;return data}
async function playerById(id:string){return one("chess_players","id",id)}
async function gameById(id:string){return one("chess_games","id",id)}
async function gameByCode(code:string){return one("chess_games","invite_code",cleanCode(code))}
async function botByPlayerId(id:string){const {data,error}=await admin.from("chess_bots").select("*").eq("player_id",id).eq("enabled",true).maybeSingle();if(error)throw error;return data}
async function chooseBot(target:number){const {data,error}=await admin.from("chess_bots").select("*").eq("enabled",true).order("elo");if(error)throw error;const list=data||[];if(!list.length)return null;return list.sort((a:any,b:any)=>Math.abs(Number(a.elo)-target)-Math.abs(Number(b.elo)-target))[0]}
async function uniqueUsername(raw:string,fallback="player"){
  let base=cleanUsername(raw)||cleanUsername(fallback)||"player";if(base.length<3)base=(base+"player").slice(0,20);
  for(let i=0;i<20;i++){const candidate=i?((base.slice(0,15)+"_"+Math.floor(1000+Math.random()*9000)).slice(0,20)):base;const {data}=await admin.from("chess_players").select("id").ilike("username",candidate).limit(1);if(!data?.length)return candidate}
  throw fail("Could not allocate a username.",409)
}
// The token's subject, read without trusting it: only used to start the player lookup while
// auth.getUser verifies the token in parallel (the result is used only if they match).
const jwtSubject=(token:string)=>{try{const part=token.split(".")[1]||"";const json=JSON.parse(atob(part.replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(part.length/4)*4,"=")));return typeof json.sub==="string"?json.sub:""}catch{return ""}};
// Supabase Auth's public signing key (published at /auth/v1/.well-known/jwks.json). With it
// the access token is checked here, without a round trip to Auth; a rotated key or any
// doubt falls back to auth.getUser.
const AUTH_JWKS={keys:[{kty:"EC",crv:"P-256",alg:"ES256",kid:"a9866e4c-e626-4a70-a1e7-6a813b36ff65",x:"IkLIAweoLCD52n5JjVzJ87XDrL5UCE_f2i_b29XMKLo",y:"D9kYIjEy_GonOhL8Uml_H-3i6Dt2AqK0WraWmnetrcs"}]};
const AUTH_ISSUER=(Deno.env.get("SUPABASE_URL")||"")+"/auth/v1";
// touch=false skips the last-seen write (moves: the heartbeat keeps last-seen fresh), so a
// move costs two database round trips instead of five.
async function playerFor(req:Request,b:any={},requireAccount=false,{touch=true}:{touch?:boolean}={}){
  const auth=req.headers.get("authorization")||"";const bearer=auth.toLowerCase().startsWith("bearer ")?auth.slice(7).trim():"";
  if(bearer){
    const sub=jwtSubject(bearer);
    const [claims,early]=await Promise.all([verifyJwt(bearer,AUTH_JWKS,{issuer:AUTH_ISSUER}),sub?one("chess_players","auth_user_id",sub).catch(()=>null):Promise.resolve(null)]);
    let user:any=null;
    if(claims&&early&&early.auth_user_id===claims.sub){user={id:claims.sub,email:claims.email,user_metadata:claims.user_metadata||{}}}
    else{
      if(!claims&&sub)console.warn("local token check fell back to auth.getUser");
      const {data,error}=await admin.auth.getUser(bearer);if(error||!data.user)throw fail("Invalid or expired sign-in.",401);
      user=data.user;
    }
    let p=early&&early.auth_user_id===user.id?early:await one("chess_players","auth_user_id",user.id);
    if(p&&!touch&&!b.name&&!b.username)return p;
    if(!p){
      const seed=b.username||user.user_metadata?.username||String(user.email||"player").split("@")[0],username=await uniqueUsername(seed,"player");
      const {data:made,error:e}=await admin.from("chess_players").insert({auth_user_id:user.id,device_hash:await hash("auth:"+user.id),username,display_name:cleanName(b.name||username),account_created_at:nowIso(),last_seen_at:nowIso()}).select().single();
      if(e)throw e;p=made
    }else{
      const patch:any={last_seen_at:nowIso()};if(b.name)patch.display_name=cleanName(b.name);
      if(b.username){const u=cleanUsername(b.username);if(u.length<3)throw fail("Username must be 3–20 letters, numbers, or underscores.");if(u.toLowerCase()!==String(p.username||"").toLowerCase()){const {data:exists}=await admin.from("chess_players").select("id").ilike("username",u).limit(1);if(exists?.some((x:any)=>x.id!==p.id))throw fail("That username is already taken.",409);patch.username=u}}
      const {data:changed,error:e}=await admin.from("chess_players").update(patch).eq("id",p.id).select().single();if(e)throw e;p=changed
    }
    return p
  }
  if(requireAccount)throw fail("Sign in to use rated play.",401);
  const token=String(b.token||"");if(token.length<20)throw fail("Player identity is missing.");
  const dh=await hash(token);let p=await one("chess_players","device_hash",dh);
  if(p&&!touch)return p;
  if(!p){
    const {data,error}=await admin.from("chess_players").insert({device_hash:dh,display_name:cleanName(b.name),last_seen_at:nowIso()}).select().single();
    if(error){
      if(error.code==="23505"){p=await one("chess_players","device_hash",dh);if(!p)throw error}
      else throw error
    }else p=data
  }else{
    const {data,error}=await admin.from("chess_players").update({display_name:b.name?cleanName(b.name):p.display_name,last_seen_at:nowIso()}).eq("id",p.id).select().single();if(error)throw error;p=data
  }
  return p
}
// Edit your own profile. country_code: a 2-letter ISO code or null to hide the flag (guests
// too). avatar_data: signed-in accounts only, a small data: image or null to remove it.
async function profileUpdate(req:Request,b:any){
  const p=await playerFor(req,b);const patch:any={updated_at:nowIso()};
  if("country_code" in b){
    const c=b.country_code==null||b.country_code===""?null:String(b.country_code).toUpperCase();
    if(c!==null&&!/^[A-Z]{2}$/.test(c))throw fail("Country must be a 2-letter code.");
    patch.country_code=c;
  }
  if("avatar_data" in b){
    if(!p.auth_user_id)throw fail("Sign in to add a profile picture.",401);
    const a=b.avatar_data==null||b.avatar_data===""?null:String(b.avatar_data);
    if(a!==null&&(a.length>AVATAR_MAX||!AVATAR_RE.test(a)))throw fail("Profile picture must be a small WebP, JPEG or PNG image.");
    patch.avatar_data=a;
  }
  const {data,error}=await admin.from("chess_players").update(patch).eq("id",p.id).select().single();if(error)throw error;
  return {player:ownPlayer(data)}
}
// Names, flags and portraits of the two players in a game the caller is playing.
async function gamePlayers(req:Request,b:any){
  const {g}=await assertGameParticipant(req,b);
  const ids=[g.white_player_id,g.black_player_id].filter(Boolean);
  const {data,error}=ids.length?await admin.from("chess_players").select("id,username,display_name,country_code,avatar_data").in("id",ids):{data:[],error:null};
  if(error)throw error;
  return {players:(data||[]).map((x:any)=>({id:x.id,name:x.username||x.display_name,country_code:x.country_code||null,avatar_data:x.avatar_data||null,seat:x.id===g.white_player_id?"w":"b"}))}
}
// ---- Achievements (rules.js ACHIEVEMENTS) ----
async function awardAchievements(p:any,extra:any={}){
  if(!p?.id)return [];
  const ids=newAchievements(p.achievements,p,extra);if(!ids.length)return [];
  const at=nowIso(),next=[...(Array.isArray(p.achievements)?p.achievements:[]),...ids.map(id=>({id,at}))];
  await admin.from("chess_players").update({achievements:next}).eq("id",p.id);
  const title=(id:string)=>({"first-win":"First win","ten-wins":"Ten wins","fifty-wins":"Fifty wins","rated-25":"Seasoned","three-in-a-row":"Berserker","giant-slayer":"Giant slayer","puzzle-50":"Puzzle solver","streak-10":"Streak of ten","arena-podium":"Arena podium","daily-finished":"Correspondent","first-friend":"Good company","club-member":"Club player","league-promoted":"Promoted","mistake-fixer":"Learns fast","freestyle":"Freestyler"} as any)[id]||"Achievement";
  for(const id of ids)EdgeRuntime.waitUntil(notifyPlayer(p.id,{title:`Achievement: ${title(id)}`,body:"See it on your profile.",url:"/?profile=1",tag:`achievement-${id}`},{push:false}).catch(()=>{}));
  return ids;
}
// ---- Web push ("your move" in daily games, challenges) ----
let vapidCache:any=null;
async function vapid(){
  if(vapidCache)return vapidCache;
  const {data}=await admin.from("chess_server_secrets").select("name,value").in("name",["vapid_public","vapid_private","vapid_subject"]);
  const m=Object.fromEntries((data||[]).map((r:any)=>[r.name,r.value]));
  vapidCache=m.vapid_private&&m.vapid_public?m:null;return vapidCache;
}
async function notifyPlayer(playerId:string,payload:any,{push=true}:{push?:boolean}={}){
  try{
    if(!playerId)return;
    await inbox(playerId,payload).catch(e=>console.error("inbox",e));
    if(!push)return;
    const {data:subs}=await admin.from("chess_push_subscriptions").select("id,endpoint,p256dh,auth").eq("player_id",playerId).limit(10);
    if(!subs?.length)return;
    const keys=await vapid();if(!keys)return;
    const webpush=(await import("npm:web-push@3.6.7")).default;
    webpush.setVapidDetails(keys.vapid_subject||"https://vanta-chess-play.netlify.app",keys.vapid_public,keys.vapid_private);
    await Promise.all(subs.map(async(sub:any)=>{
      try{await webpush.sendNotification({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth}},JSON.stringify(payload),{TTL:86400})}
      catch(e:any){if(e?.statusCode===404||e?.statusCode===410)await admin.from("chess_push_subscriptions").delete().eq("id",sub.id);else console.error("push failed",e?.statusCode||e)}
    }));
  }catch(e){console.error("notify failed",e)}
}
async function pushSubscribe(req:Request,b:any){
  const p=await playerFor(req,b),endpoint=String(b.endpoint||""),p256dh=String(b.keys?.p256dh||""),auth=String(b.keys?.auth||"");
  if(!/^https:\/\/[^\s]{10,990}$/.test(endpoint)||!p256dh||p256dh.length>200||!auth||auth.length>100)throw fail("Invalid push subscription.");
  const {error}=await admin.from("chess_push_subscriptions").upsert({player_id:p.id,endpoint,p256dh,auth},{onConflict:"endpoint"});if(error)throw error;
  return {subscribed:true}
}
async function pushUnsubscribe(req:Request,b:any){
  const p=await playerFor(req,b);await admin.from("chess_push_subscriptions").delete().eq("player_id",p.id).eq("endpoint",String(b.endpoint||""));return {subscribed:false}
}
async function settleTournament(g:any){
  if(!g.tournament_id||g.result==="*")return;
  if(g.tournament_round)EdgeRuntime.waitUntil((async()=>{await new Promise(r=>setTimeout(r,300));const t=await one("chess_tournaments","id",g.tournament_id);if(t)await swissTick(t)})().catch(e=>console.error("swiss",e)));
  for(const pid of [g.white_player_id,g.black_player_id].filter(Boolean)){
    const {data:e}=await admin.from("chess_tournament_entries").select("*").eq("tournament_id",g.tournament_id).eq("player_id",pid).maybeSingle();if(!e)continue;
    const color=pid===g.white_player_id?"w":"b",s=scoreFor(g.result,color),berserk=!!(color==="w"?g.white_berserk:g.black_berserk);
    const arena=g.tournament_round?{points:s===1?2:s===.5?1:0,streak:0}:arenaScore({score:s,streakBefore:Number(e.streak||0),berserk}); // Swiss: 2/1/0
    await admin.from("chess_tournament_entries").update({points:Number(e.points)+arena.points,streak:arena.streak,berserks:Number(e.berserks||0)+(berserk?1:0),games:Number(e.games)+1,wins:Number(e.wins)+(s===1?1:0),draws:Number(e.draws)+(s===.5?1:0),losses:Number(e.losses)+(s===0?1:0)}).eq("tournament_id",g.tournament_id).eq("player_id",pid)
  }
}
async function settleRatings(g:any){
  if(g?.result&&g.result!=="*")EdgeRuntime.waitUntil(recordExplorer(g).catch(e=>console.error("explorer",e)));
  if(!g.rated||!g.white_player_id||!g.black_player_id||g.result==="*"||g.white_rating_delta!=null)return g;
  const [w,b]=await Promise.all([playerById(g.white_player_id),playerById(g.black_player_id)]);if(!w||!b)return g;
  const pool=POOLS.includes(g.pool)?g.pool:"rapid",rw=ratingOf(w,pool),rb=ratingOf(b,pool),sw=scoreFor(g.result,"w"),sb=1-sw,nw=gamesOf(w,pool),nb=gamesOf(b,pool);
  // Berserk raises the stakes both ways (rules.js): 1.25 times the rating change, win or lose.
  const kw=(nw<10?64:32)*(nw<10&&Number(w.rated_win_streak||0)>=2&&sw===1?1.5:1)*kMultiplier({berserk:!!g.white_berserk}),kb=(nb<10?64:32)*(nb<10&&Number(b.rated_win_streak||0)>=2&&sb===1?1.5:1)*kMultiplier({berserk:!!g.black_berserk});
  const streakW=sw===1?Number(w.rated_win_streak||0)+1:0,streakB=sb===1?Number(b.rated_win_streak||0)+1:0;
  const dw=Math.round(kw*(sw-expected(rw,rb))),db=Math.round(kb*(sb-expected(rb,rw)));
  const nextW={...(w.ratings||{}),[pool]:Math.max(100,rw+dw)},nextB={...(b.ratings||{}),[pool]:Math.max(100,rb+db)};
  const pgW={...(w.provisional_games||{}),[pool]:nw+1},pgB={...(b.provisional_games||{}),[pool]:nb+1};
  await Promise.all([
    admin.from("chess_players").update({ratings:nextW,provisional_games:pgW,rating:nextW.rapid??rw,wins:Number(w.wins)+(sw===1?1:0),losses:Number(w.losses)+(sw===0?1:0),draws:Number(w.draws)+(sw===.5?1:0),rated_games:Number(w.rated_games)+1,rated_win_streak:streakW,sandbag_score:nextSandbagScore(w.sandbag_score,sandbagDelta({score:sw,plies:Number(g.move_count||0),endReason:g.end_reason,myRating:rw,oppRating:rb})),berserk_ready:berserkAfter({ready:!!w.berserk_ready,score:sw,newStreak:streakW}),smurf_score:Math.max(0,Number(w.smurf_score||0)+(nw<10&&sw===1&&rb>=rw-100?.45:-.15)),color_balance:Number(w.color_balance||0)+1,updated_at:nowIso()}).eq("id",w.id),
    admin.from("chess_players").update({ratings:nextB,provisional_games:pgB,rating:nextB.rapid??rb,wins:Number(b.wins)+(sb===1?1:0),losses:Number(b.losses)+(sb===0?1:0),draws:Number(b.draws)+(sb===.5?1:0),rated_games:Number(b.rated_games)+1,rated_win_streak:streakB,sandbag_score:nextSandbagScore(b.sandbag_score,sandbagDelta({score:sb,plies:Number(g.move_count||0),endReason:g.end_reason,myRating:rb,oppRating:rw})),berserk_ready:berserkAfter({ready:!!b.berserk_ready,score:sb,newStreak:streakB}),smurf_score:Math.max(0,Number(b.smurf_score||0)+(nb<10&&sb===1&&rw>=rb-100?.45:-.15)),color_balance:Number(b.color_balance||0)-1,updated_at:nowIso()}).eq("id",b.id)
  ]);
  const {data}=await admin.from("chess_games").update({white_rating_before:rw,black_rating_before:rb,white_rating_delta:dw,black_rating_delta:db,ended_at:g.ended_at||nowIso(),updated_at:nowIso()}).eq("id",g.id).is("white_rating_delta",null).select().maybeSingle();
  const settled=data||g;await settleTournament(settled);
  await Promise.all([addLeaguePoints(w,sw),addLeaguePoints(b,sb)]).catch(e=>console.error("league",e));
  // Achievements from the new totals; beating someone 200+ rated higher is a giant slaying.
  await Promise.all([
    awardAchievements({...w,wins:Number(w.wins)+(sw===1?1:0),rated_games:Number(w.rated_games)+1,rated_win_streak:streakW},{giantSlayer:sw===1&&rb-rw>=200}),
    awardAchievements({...b,wins:Number(b.wins)+(sb===1?1:0),rated_games:Number(b.rated_games)+1,rated_win_streak:streakB},{giantSlayer:sb===1&&rw-rb>=200})
  ]).catch(e=>console.error("achievements",e));
  return settled
}
function sideCanPossiblyMate(c:Chess,color:"w"|"b"){
  const own:any[]=[];const opp:any[]=[];
  for(const row of c.board())for(const p of row)if(p&&p.type!=="k")(p.color===color?own:opp).push(p);
  if(!own.length)return false;
  if(own.some(p=>["q","r","p"].includes(p.type)))return true;
  if(opp.length)return true;
  const knights=own.filter(p=>p.type==="n").length,bishops=own.filter(p=>p.type==="b");
  if(knights>=2||knights&&bishops.length)return true;
  if(bishops.length>=2){
    const colors=new Set(bishops.map((p:any)=>{const f=p.square.charCodeAt(0)-97,r=Number(p.square[1])-1;return (f+r)&1}));
    return colors.size>=2;
  }
  return false
}
async function resolveTimeout(g:any){
  if(!g||g.status!=="active"||!g.last_move_at)return g;
  if(!g.daily_days&&!g.simul_id&&firstMovesPending(g.move_count)){
    if(!abortDue({moveCount:g.move_count,lastMoveAt:g.last_move_at}))return g;
    const {data}=await admin.from("chess_games").update({status:"aborted",result:"*",end_reason:"aborted",version:Number(g.version)+1,ended_at:nowIso(),updated_at:nowIso()}).eq("id",g.id).eq("status","active").eq("version",Number(g.version)).select().maybeSingle();
    if(data)EdgeRuntime.waitUntil(broadcastGameState(data));
    return data||g;
  }const c=new Chess(g.fen),side=c.turn(),elapsed=Math.max(0,Date.now()-Date.parse(g.last_move_at)),remain=side==="w"?Number(g.white_time_ms):Number(g.black_time_ms);if(elapsed<remain)return g;
  if(g.daily_days){const pid=side==="w"?g.white_player_id:g.black_player_id,away=pid?await playerById(pid):null;if(away&&elapsed-vacationOverlapMs(away,Date.parse(g.last_move_at))<remain)return g}
  const winner=(side==="w"?"b":"w") as "w"|"b";
  const patch=!sideCanPossiblyMate(c,winner)
    ?{status:"draw",result:"1/2-1/2",...(side==="w"?{white_time_ms:0}:{black_time_ms:0})}
    :(side==="w"?{status:"black_won",result:"0-1",white_time_ms:0}:{status:"white_won",result:"1-0",black_time_ms:0});
  const {data}=await admin.from("chess_games").update({...patch,end_reason:"timeout",version:Number(g.version)+1,ended_at:nowIso(),updated_at:nowIso()}).eq("id",g.id).eq("status","active").select().maybeSingle();
  return data?settleRatings(data):g
}
async function freshGame(id:string){return resolveTimeout(await gameById(id))}
async function createGame(req:Request,b:any,{players=null,source="private",tournamentId=null,bot=null,simulId=null}:any={}){
  let white:any,black:any;if(players)[white,black]=players;else{white=await playerFor(req,b,!!b.rated);assertAllowed(white)}
  let code=code8();while(await gameByCode(code))code=code8();const base=Math.max(30,Math.min(7200,Number(b.seconds||600))),inc=Math.max(0,Math.min(60,Number(b.increment||0))),active=!!black;
  // Daily games: days per move instead of a clock, rated in their own "daily" pool.
  const zh=b.variant==="crazyhouse"&&!bot;if(zh&&b.dailyDays)throw fail("Crazyhouse is played live, not as a daily game.");
  const dailyDays=b.dailyDays?Math.max(1,Math.min(14,Number(b.dailyDays))):null,pool=dailyDays?"daily":b.variant==="freestyle"&&!bot?"freestyle":zh?"crazyhouse":poolFor(base,inc),moveMs=dailyDays?dailyMoveMs(dailyDays):base*1000;
  // Freestyle: a random Chess960 start with Chess960 castling (castle960.js), rated in its own pool.
  const freestyle=b.variant==="freestyle"&&!bot,startFen=freestyle?freestyleFen():START_FEN;
  const {data,error}=await admin.from("chess_games").insert({
    invite_code:code,white_player_id:white.id,black_player_id:black?.id||null,
    white_name:white.username||white.display_name,black_name:black?(black.username||black.display_name):null,
    fen:startFen,start_fen:freestyle?startFen:null,variant:freestyle?"freestyle":zh?"crazyhouse":"standard",zh_pockets:zh?{w:{},b:{}}:null,zh_promoted:zh?[]:null,castling960:freestyle?initialRights(startFen):null,status:active?"active":"waiting",result:"*",rated:!!b.rated,pool,source,tournament_id:tournamentId,simul_id:simulId,
    time_control_seconds:dailyDays?dailyDays*86400:base,increment_seconds:dailyDays?0:inc,white_time_ms:moveMs,black_time_ms:moveMs,daily_days:dailyDays,challenge_id:b.challengeId||null,
    last_move_at:active?nowIso():null,started_at:active?nowIso():null,white_last_seen_at:nowIso(),black_last_seen_at:black?nowIso():null,
    bot_player_id:bot?.player_id||null,bot_elo:bot?.elo||null,bot_style:bot?.style||null
  }).select().single();if(error)throw error;return {game:data,player:publicPlayer(white),seat:data.white_player_id===white.id?"w":data.black_player_id===white.id?"b":null,bot:bot?{slug:bot.slug,display_name:bot.display_name,elo:bot.elo,engine_skill:bot.engine_skill,style:bot.style,blurb:bot.blurb}:null}
}
async function joinGame(req:Request,b:any){
  const g=await gameByCode(b.code);if(!g)throw fail("Game not found.",404);const p=await playerFor(req,b,!!g.rated);
  if(g.white_player_id!==p.id&&g.black_player_id!==p.id)assertAllowed(p);
  if(g.white_player_id===p.id||g.black_player_id===p.id)return {game:await resolveTimeout(g),player:publicPlayer(p),seat:g.white_player_id===p.id?"w":"b"};
  if(g.status!=="waiting"||g.black_player_id)throw fail("This room already has two players.",409);
  const {data,error}=await admin.from("chess_games").update({black_player_id:p.id,black_name:p.username||p.display_name,status:"active",version:Number(g.version)+1,started_at:nowIso(),last_move_at:nowIso(),black_last_seen_at:nowIso(),updated_at:nowIso()}).eq("id",g.id).eq("status","waiting").is("black_player_id",null).select().maybeSingle();if(error)throw error;if(!data)throw fail("Another player joined first.",409);return {game:data,player:publicPlayer(p),seat:"b"}
}
async function applyMove(g:any,color:string,b:any,serverReceivedMs=Date.now()){
  if(Number(b.expectedVersion)!==Number(g.version))throw fail("Board changed. Syncing latest position.",409);
  let c=new Chess(g.fen);if(c.turn()!==color)throw fail("It is not that side's turn.",409);
  let m:any,zhNext:any=null;
  if(g.variant==="freestyle"&&b.castle){
    const opt=castleOptions(c,g.castling960||"-",Chess).find((o:any)=>o.san===(b.castle==="O-O-O"?"O-O-O":"O-O"));
    if(!opt)throw fail("Castling isn't allowed here.");
    c=new Chess(applyCastle(c.fen(),opt));
    m={from:opt.kingFrom,to:opt.kingTo,san:opt.san+(c.isCheckmate()?"#":c.inCheck()?"+":""),lan:opt.san,color,piece:"k",captured:null,promotion:null,castle:true,rook_from:opt.rookFrom,rook_to:opt.rookTo};
  }else if(g.variant==="crazyhouse"){
    const r=zhPlay(Chess,g.fen,zhState(g.zh_pockets,g.zh_promoted),b.drop?{drop:b.drop,to:b.to}:{from:b.from,to:b.to,promotion:b.promotion});
    if(!r)throw fail("Illegal move.");c=new Chess(r.fen);m=r.move;zhNext=r.state;
  }else{try{m=c.move({from:String(b.from),to:String(b.to),promotion:String(b.promotion||"q")[0]})}catch{}if(!m)throw fail("Illegal move.")}
  const castling960=g.variant==="freestyle"?(m.castle?rightsAfterCastle(g.castling960,color):rightsAfterMove(g.castling960,m)):undefined;
  const timing=calculateMoveTiming({clientMoveAt:b.clientMoveAt,lastMoveAt:g.last_move_at,serverReceivedAt:serverReceivedMs});
  if(!g.daily_days&&firstMovesPending(g.move_count))timing.chargedElapsedMs=0; // first moves are free; clocks start after both
  let wt=Number(g.white_time_ms),bt=Number(g.black_time_ms);
  if(color==="w")wt=Math.max(0,wt-timing.chargedElapsedMs);else bt=Math.max(0,bt-timing.chargedElapsedMs);
  if((color==="w"?wt:bt)<=0){
    const timeoutBase={...g,last_move_at:new Date(timing.serverReceivedMs-timing.chargedElapsedMs-1).toISOString()};
    const timedOutGame=await resolveTimeout(timeoutBase);
    EdgeRuntime.waitUntil(broadcastGameState(timedOutGame));
    return {game:timedOutGame,move:null,timedOut:true};
  }
  const bonus=Number(g.increment_seconds||0)*1000;if(color==="w")wt+=bonus;else bt+=bonus;const o=zhNext?zhStatus(Chess,c,zhNext):outcome(c),history=Array.isArray(g.move_history)?g.move_history:[];
  if(g.daily_days){wt=dailyMoveMs(g.daily_days);bt=wt} // each move gets the full days again
  const {data,error}=await admin.from("chess_games").update({
    fen:c.fen(),pgn:o.result==="*"?(zhNext?"":c.pgn()):fullPgn(g,[...history,m],o.result),...(zhNext?{zh_pockets:zhNext.pockets,zh_promoted:zhNext.promoted,...(o.result!=="*"?{end_reason:(o as any).reason}:{})}:{}),move_history:[...history,{...(m.drop?{drop:m.drop}:{}),from:m.from,to:m.to,san:m.san,lan:m.lan,color:m.color,piece:m.piece,captured:m.captured||null,promotion:m.promotion||null,...(m.castle?{castle:true,rook_from:m.rook_from,rook_to:m.rook_to}:{}),client_move_at:timing.clientMoveAt,server_received_at:timing.serverReceivedAt,network_compensation_ms:timing.networkCompensationMs}],
    status:o.status,result:o.result,version:Number(g.version)+1,move_count:Number(g.move_count||0)+1,...(castling960!==undefined?{castling960}:{}),
    white_time_ms:wt,black_time_ms:bt,last_move_at:timing.serverReceivedAt,ended_at:o.result==="*"?null:timing.serverReceivedAt,updated_at:timing.serverReceivedAt,draw_offer_by:null,takeback_offer_by:null,takeback_offer_version:null,
    ...(color==="w"?{white_last_seen_at:timing.serverReceivedAt}:{black_last_seen_at:timing.serverReceivedAt})
  }).eq("id",g.id).eq("version",Number(g.version)).select().maybeSingle();
  if(error)throw error;if(!data)throw fail("Move conflict. Syncing latest position.",409);
  const nextGame=o.result==="*"?data:await settleRatings(data);
  // Daily games: the opponent may have planned a reply to exactly this move.
  if(g.daily_days&&o.result==="*"&&!b.conditional){const auto=await conditionalReply(nextGame,color,m).catch(e=>{console.error("conditional",e);return null});if(auto)return {...auto,move:m,conditionalReply:auto.move}}
  EdgeRuntime.waitUntil(broadcastGameState(nextGame));
  if(g.daily_days){
    const next=color==="w"?g.black_player_id:g.white_player_id,name=color==="w"?g.white_name:g.black_name;
    EdgeRuntime.waitUntil(notifyPlayer(next,{title:o.result==="*"?"Your move":"Game over",body:o.result==="*"?`${name||"Your opponent"} played ${m.san}`:`${name||"Your opponent"} played ${m.san} · ${o.result}`,url:`/?game=${g.invite_code}`,tag:`game-${g.id}`}));
    if(o.result!=="*")EdgeRuntime.waitUntil(Promise.all([g.white_player_id,g.black_player_id].map(async(id:string)=>awardAchievements(await playerById(id),{dailyFinished:true}))).then(()=>{}).catch(()=>{}));
  }
  if(g.variant==="freestyle"&&o.result!=="*")EdgeRuntime.waitUntil(Promise.all([g.white_player_id,g.black_player_id].filter(Boolean).map(async(id:string)=>awardAchievements(await playerById(id),{freestyleFinished:true}))).then(()=>{}).catch(()=>{}));
  return {game:nextGame,move:m}
}
// The whole game as PGN (each move is applied to a board built from the stored FEN, so
// c.pgn() alone only holds the last move). Written when the game ends.
function fullPgn(g:any,moves:any[],result:string){
  if(g.variant==="freestyle"||g.variant==="crazyhouse"){ // chess.js can't write 960 castles or drops; the PGN is assembled by hand
    const fen=g.start_fen||START_FEN,[,turn,,,,full]=fen.split(" ");let n=Number(full)||1,side=turn||"w";const parts:string[]=[];
    moves.forEach((m:any,i:number)=>{if(side==="w")parts.push(`${n}. ${m.san}`);else parts.push(i===0?`${n}... ${m.san}`:m.san);if(side==="b")n++;side=side==="w"?"b":"w"});
    return `[Event "VCH Freestyle"]\n[Site "VCH"]\n[White "${String(g.white_name||"White").replace(/"/g,"")}"]\n[Black "${String(g.black_name||"Black").replace(/"/g,"")}"]\n[Result "${result}"]\n${g.variant==="crazyhouse"?`[Variant "Crazyhouse"]`:`[Variant "Chess960"]\n[SetUp "1"]\n[FEN "${fen}"]`}\n\n${parts.join(" ")} ${result}`;
  }
  try{
    const c=new Chess(g.start_fen||START_FEN);
    for(const m of moves)c.move({from:m.from,to:m.to,promotion:m.promotion||undefined});
    c.setHeader("White",String(g.white_name||"White"));c.setHeader("Black",String(g.black_name||"Black"));c.setHeader("Result",result);c.setHeader("Site","VCH");
    return c.pgn();
  }catch{return ""}
}
async function makeMove(req:Request,b:any,serverReceivedMs=Date.now()){
  // Player and game are fetched at the same time; nothing else is read before the move is written.
  let [p,g]=await Promise.all([playerFor(req,b,false,{touch:false}),gameById(b.gameId)]);if(!g)throw fail("Game not found.",404);
  // A reply sent while the move it answers is still on its way here (both players' clients
  // see moves through the realtime relay first): wait briefly for that move to land.
  if(Number(b.expectedVersion)===Number(g.version)+1&&g.status==="active"){
    const until=Date.now()+1800;
    while(Date.now()<until){await new Promise(r=>setTimeout(r,80));const fresh=await gameById(g.id);if(fresh&&(Number(fresh.version)>=Number(b.expectedVersion)||fresh.status!=="active")){g=fresh;break}}
  }
  if(g.status!=="active")throw fail("Game is not active.",409);
  const color=g.white_player_id===p.id?"w":g.black_player_id===p.id?"b":null;if(!color)throw fail("You are not a player in this game.",403);
  if(g.bot_player_id===p.id)throw fail("Bot seats cannot be controlled by player credentials.",403);
  return applyMove(g,color,b,serverReceivedMs)
}
async function botMove(req:Request,b:any){
  const p=await playerFor(req,b);const g=await freshGame(b.gameId);if(!g)throw fail("Game not found.",404);if(g.status!=="active")throw fail("Game is not active.",409);
  if(!g.bot_player_id)throw fail("This game has no server bot.",409);
  if(p.id!==g.white_player_id&&p.id!==g.black_player_id)throw fail("You are not a player in this game.",403);
  if(p.id===g.bot_player_id)throw fail("Invalid bot controller.",403);
  const bot=await botByPlayerId(g.bot_player_id);if(!bot)throw fail("Bot is unavailable.",409);
  const color=g.white_player_id===g.bot_player_id?"w":"b";
  return applyMove(g,color,b)
}
// An opponent who has been gone (no heartbeat or move) for CLAIM_AFTER_MS can be claimed
// against: a win, or a draw if the claimant asks for one or has no way to checkmate.
const CLAIM_AFTER_MS=30000;
async function claimWin(req:Request,b:any){
  const {p,g}=await assertGameParticipant(req,b);
  if(g.status!=="active")throw fail("Game is not active.",409);
  if(g.bot_player_id)throw fail("Games against a bot can't be claimed.",409);
  if(g.daily_days)throw fail("Daily games are won on time, not by claiming.",409);
  if(g.simul_id)throw fail("In a simul the host moves between boards; the clock decides.",409);
  const seat=g.white_player_id===p.id?"w":"b";
  const seen=Date.parse((seat==="w"?g.black_last_seen_at:g.white_last_seen_at)||"")||0;
  if(Date.now()-seen<CLAIM_AFTER_MS)throw fail("Your opponent is still connected.",409);
  const draw=b.outcome==="draw"||!sideCanPossiblyMate(new Chess(g.fen),seat as "w"|"b");
  const patch=draw?{status:"draw",result:"1/2-1/2"}:seat==="w"?{status:"white_won",result:"1-0"}:{status:"black_won",result:"0-1"};
  const {data,error}=await admin.from("chess_games").update({...patch,end_reason:"abandoned",draw_offer_by:null,version:Number(g.version)+1,ended_at:nowIso(),updated_at:nowIso()}).eq("id",g.id).eq("status","active").eq("version",Number(g.version)).select().maybeSingle();
  if(error)throw error;if(!data)throw fail("The game changed. Sync the game.",409);
  const settled=await settleRatings(data);
  EdgeRuntime.waitUntil(broadcastGameState(settled));
  return {game:settled,claimed:draw?"draw":"win"}
}
// Takebacks: casual games between two people only (never rated, bot or tournament games).
// The requester takes back their own last move: one ply if the opponent hasn't replied yet,
// two if they have. The offer lapses when anyone moves (applyMove clears it).
function takebackPlies(g:any,requesterColor:string){
  const turn=new Chess(g.fen).turn(),history=Array.isArray(g.move_history)?g.move_history:[];
  const plies=turn===requesterColor?2:1;
  if(history.length<plies)return 0;
  if(history[history.length-plies]?.color!==requesterColor)return 0;
  return plies;
}
function takebackAllowed(g:any){
  if(g.status!=="active")throw fail("Game is not active.",409);
  if(g.rated||g.bot_player_id||g.tournament_id)throw fail("Takebacks are for casual games between two players.",409);
}
async function takebackOffer(req:Request,b:any){
  const {p,g}=await assertGameParticipant(req,b);takebackAllowed(g);
  const color=g.white_player_id===p.id?"w":"b";
  if(!takebackPlies(g,color))throw fail("You have no move to take back yet.",409);
  if(g.takeback_offer_by===p.id)return {game:g,offered:true};
  const {data,error}=await admin.from("chess_games").update({takeback_offer_by:p.id,takeback_offer_version:Number(g.version),updated_at:nowIso()}).eq("id",g.id).eq("status","active").eq("version",Number(g.version)).select().maybeSingle();
  if(error)throw error;if(!data)throw fail("The game changed. Sync the game.",409);
  EdgeRuntime.waitUntil(broadcastGameState(data));
  return {game:data,offered:true}
}
async function takebackRespond(req:Request,b:any){
  const {p,g}=await assertGameParticipant(req,b);takebackAllowed(g);
  const asker=g.takeback_offer_by;
  if(!asker||asker===p.id||Number(g.takeback_offer_version)!==Number(g.version))throw fail("There is no takeback request to answer.",409);
  if(!b.accept){
    const {data,error}=await admin.from("chess_games").update({takeback_offer_by:null,takeback_offer_version:null,updated_at:nowIso()}).eq("id",g.id).eq("version",Number(g.version)).select().maybeSingle();
    if(error)throw error;const out=data||g;EdgeRuntime.waitUntil(broadcastGameState(out));return {game:out,accepted:false}
  }
  if(g.variant==="crazyhouse")throw fail("Takebacks aren't available in Crazyhouse.",409);
  const askerColor=asker===g.white_player_id?"w":"b",plies=takebackPlies(g,askerColor);
  if(!plies)throw fail("There is no move to take back.",409);
  const history=(Array.isArray(g.move_history)?g.move_history:[]).slice(0,-plies);
  const rebuilt=replay960(Chess,g.start_fen||START_FEN,history,g.variant==="freestyle"?initialRights(g.start_fen||START_FEN):"-"),c=rebuilt.chess;
  if(rebuilt.moves.length!==history.length)throw fail("Could not rebuild the position.",500);
  const {data,error}=await admin.from("chess_games").update({
    fen:c.fen(),pgn:"",move_history:history,move_count:history.length,version:Number(g.version)+1,...(g.variant==="freestyle"?{castling960:rebuilt.rights}:{}),
    last_move_at:nowIso(),updated_at:nowIso(),takeback_offer_by:null,takeback_offer_version:null,draw_offer_by:null
  }).eq("id",g.id).eq("status","active").eq("version",Number(g.version)).select().maybeSingle();
  if(error)throw error;if(!data)throw fail("The game changed. Sync the game.",409);
  EdgeRuntime.waitUntil(broadcastGameState(data));
  return {game:data,accepted:true,plies}
}
// Watch: recent public games (matchmaking and tournament games; private rooms are never
// listed). Spectators get the board, names, ratings and clocks, nothing else.
const WATCH_FIELDS="zh_pockets,zh_promoted,variant,start_fen,id,white_name,black_name,status,result,rated,pool,source,fen,version,move_count,move_history,time_control_seconds,increment_seconds,white_time_ms,black_time_ms,last_move_at,started_at,ended_at,end_reason,white_rating_before,black_rating_before,bot_player_id,updated_at";
const publicGame=(g:any)=>{const {bot_player_id,...rest}=g;return {...rest,bot:!!bot_player_id}};
async function liveGames(){
  const since=new Date(Date.now()-3*60000).toISOString();
  const {data,error}=await admin.from("chess_games").select(WATCH_FIELDS).eq("status","active").in("source",["queue","tournament"]).gte("updated_at",since).gt("move_count",0).order("updated_at",{ascending:false}).limit(30);
  if(error)throw error;
  return {games:(data||[]).map((g:any)=>{const {move_history,...rest}=publicGame(g);return {...rest,last_move:Array.isArray(move_history)?move_history.at(-1)||null:null}})}
}
async function watchState(b:any){
  const id=String(b.gameId||"");if(!/^[0-9a-f-]{36}$/i.test(id))throw fail("Game not found.",404);
  const {data,error}=await admin.from("chess_games").select(WATCH_FIELDS).eq("id",id).in("source",["queue","tournament"]).maybeSingle();
  if(error)throw error;if(!data)throw fail("This game can't be watched.",404);
  return {game:publicGame(await resolveTimeout(data))}
}
// The weekly arena: every Saturday 18:00 UTC for 90 minutes, rated 3+2 blitz. tournaments()
// makes sure this week's (or next week's) exists and moves arenas through their statuses.
const WEEKLY_ARENA={hourUtc:18,minutes:90,base:180,inc:2,pool:"blitz"};
function weeklyArenaWindow(now=new Date()){
  const start=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate(),WEEKLY_ARENA.hourUtc));
  start.setUTCDate(start.getUTCDate()+((6-start.getUTCDay()+7)%7));
  let end=new Date(start.getTime()+WEEKLY_ARENA.minutes*60000);
  if(end<=now){start.setUTCDate(start.getUTCDate()+7);end=new Date(start.getTime()+WEEKLY_ARENA.minutes*60000)}
  return {start,end};
}
async function ensureWeeklyArena(){
  const {start,end}=weeklyArenaWindow(),slug="weekly-arena-"+start.toISOString().slice(0,10);
  await admin.from("chess_tournaments").upsert({slug,name:"VCH Weekly Arena",description:"Every Saturday · 90 minutes · rated 3+2 blitz. Win to score 2, draw for 1. Most points takes the week.",format:"arena",status:Date.now()>=start.getTime()?"active":"scheduled",rated:true,pool:WEEKLY_ARENA.pool,base_seconds:WEEKLY_ARENA.base,increment_seconds:WEEKLY_ARENA.inc,starts_at:start.toISOString(),ends_at:end.toISOString()},{onConflict:"slug",ignoreDuplicates:true});
  const now=nowIso();
  await Promise.all([
    admin.from("chess_tournaments").update({status:"active"}).like("slug","weekly-arena-%").eq("status","scheduled").lte("starts_at",now).gt("ends_at",now),
    admin.from("chess_tournaments").update({status:"finished"}).like("slug","weekly-arena-%").in("status",["scheduled","active"]).lte("ends_at",now)
  ]);
}
function arenaOpen(t:any){
  const now=Date.now();
  if(t.starts_at&&now<Date.parse(t.starts_at))throw fail("The arena hasn't started yet. You're registered; come back when it opens.",409);
  if(t.ends_at&&now>=Date.parse(t.ends_at))throw fail("This arena has ended.",409);
}
// ---- Berserk (rules.js) ----
async function goBerserk(req:Request,b:any){
  const {p,g}=await assertGameParticipant(req,b);
  if(g.status!=="active"||!g.rated||g.daily_days||g.bot_player_id)throw fail("Berserk is for live rated games.",409);
  const color=g.white_player_id===p.id?"w":"b",flag=color==="w"?"white_berserk":"black_berserk",timeKey=color==="w"?"white_time_ms":"black_time_ms";
  if(g[flag])return {game:g,berserk:true};
  if((Array.isArray(g.move_history)?g.move_history:[]).some((m:any)=>m.color===color))throw fail("Berserk only before your first move.",409);
  if(!p.berserk_ready)throw fail("Win three rated games in a row to earn Berserk.",409);
  const {data:spent}=await admin.from("chess_players").update({berserk_ready:false}).eq("id",p.id).eq("berserk_ready",true).select("id").maybeSingle();
  if(!spent)throw fail("Berserk is not available.",409);
  const {data,error}=await admin.from("chess_games").update({[flag]:true,[timeKey]:berserkClock(g[timeKey]),version:Number(g.version)+1,updated_at:nowIso()}).eq("id",g.id).eq("status","active").eq("version",Number(g.version)).select().maybeSingle();
  if(error||!data){await admin.from("chess_players").update({berserk_ready:true}).eq("id",p.id);if(error)throw error;throw fail("The game changed. Try again.",409)}
  EdgeRuntime.waitUntil(broadcastGameState(data));
  return {game:data,berserk:true}
}
// ---- Friends and challenges ----
const ONLINE_MS=120000;
const friendCard=(x:any,following=false)=>({id:x.id,name:x.username||x.display_name||"Player",account:!!x.auth_user_id,rating:ratingOf(x,"rapid"),ratings:x.ratings||{},country_code:x.country_code||null,online:!!x.last_seen_at&&Date.now()-Date.parse(x.last_seen_at)<ONLINE_MS,following});
const FRIEND_FIELDS="id,username,display_name,auth_user_id,ratings,rating,country_code,last_seen_at";
async function playerSearch(req:Request,b:any){
  const p=await playerFor(req,b,false,{touch:false}),q=cleanUsername(b.q).toLowerCase();
  if(q.length<2)return {players:[]};
  const [{data,error},{data:mine}]=await Promise.all([
    admin.from("chess_players").select(FRIEND_FIELDS).ilike("username",`${q}%`).neq("id",p.id).not("auth_user_id","is",null).limit(12),
    admin.from("chess_follows").select("followee_id").eq("follower_id",p.id)
  ]);
  if(error)throw error;const following=new Set((mine||[]).map((x:any)=>x.followee_id));
  return {players:(data||[]).map((x:any)=>friendCard(x,following.has(x.id)))}
}
async function follow(req:Request,b:any){
  const p=await playerFor(req,b,false,{touch:false}),id=String(b.playerId||"");
  if(!/^[0-9a-f-]{36}$/i.test(id)||id===p.id)throw fail("Player not found.",404);
  if(b.on===false){await admin.from("chess_follows").delete().eq("follower_id",p.id).eq("followee_id",id);return {following:false}}
  const target=await playerById(id);if(!target)throw fail("Player not found.",404);
  const {count}=await admin.from("chess_follows").select("followee_id",{count:"exact",head:true}).eq("follower_id",p.id);
  if(Number(count||0)>=500)throw fail("You follow the maximum number of players.",409);
  const {error}=await admin.from("chess_follows").upsert({follower_id:p.id,followee_id:id},{onConflict:"follower_id,followee_id",ignoreDuplicates:true});if(error)throw error;
  EdgeRuntime.waitUntil(awardAchievements(p,{followed:true}).then(()=>{}).catch(()=>{}));
  return {following:true}
}
async function friends(req:Request,b:any){
  const p=await playerFor(req,b);
  const [{data:out},{count:followers}]=await Promise.all([
    admin.from("chess_follows").select("followee_id").eq("follower_id",p.id).limit(500),
    admin.from("chess_follows").select("follower_id",{count:"exact",head:true}).eq("followee_id",p.id)
  ]);
  const ids=(out||[]).map((x:any)=>x.followee_id);
  const {data}=ids.length?await admin.from("chess_players").select(FRIEND_FIELDS).in("id",ids):{data:[]};
  const list=(data||[]).map((x:any)=>friendCard(x,true)).sort((a:any,c:any)=>Number(c.online)-Number(a.online)||a.name.localeCompare(c.name));
  return {friends:list,followers:Number(followers||0)}
}
async function challengeSend(req:Request,b:any){
  const p=await playerFor(req,b),to=String(b.toPlayerId||"");assertAllowed(p);
  if(!/^[0-9a-f-]{36}$/i.test(to)||to===p.id)throw fail("Player not found.",404);
  const target=await playerById(to);if(!target)throw fail("Player not found.",404);
  const rated=!!b.rated,dailyDays=b.dailyDays?Math.max(1,Math.min(14,Number(b.dailyDays))):null;
  if(rated&&(!p.auth_user_id||!target.auth_user_id))throw fail("Rated challenges are between signed-in players.",401);
  const {count}=await admin.from("chess_challenges").select("id",{count:"exact",head:true}).eq("from_player_id",p.id).eq("status","pending").gt("expires_at",nowIso());
  if(Number(count||0)>=5)throw fail("You have too many open challenges.",429);
  const color=["w","b"].includes(b.color)?b.color:"random";
  const variant=["freestyle","crazyhouse"].includes(b.variant)?b.variant:"standard";
  if(variant==="crazyhouse"&&b.dailyDays)throw fail("Crazyhouse is played live, not as a daily game.");
  const {data,error}=await admin.from("chess_challenges").insert({variant,from_player_id:p.id,to_player_id:to,base_seconds:Math.max(30,Math.min(7200,Number(b.seconds||600))),increment_seconds:Math.max(0,Math.min(60,Number(b.increment||0))),daily_days:dailyDays,rated,color,expires_at:new Date(Date.now()+(dailyDays?3*86400000:10*60000)).toISOString()}).select().single();
  if(error)throw error;
  EdgeRuntime.waitUntil(Promise.all([
    broadcastTo("player:"+to,"challenge",{id:data.id}),
    notifyPlayer(to,{title:"New challenge",body:`${p.username||p.display_name||"A player"} challenges you to ${dailyDays?`a daily game (${dailyDays}d/move)`:`${Math.round(data.base_seconds/60)}+${data.increment_seconds}`}${rated?" · rated":""}`,url:"/?challenges=1",tag:"challenge-"+data.id})
  ]).then(()=>{}));
  return {challenge:data}
}
async function broadcastTo(topic:string,event:string,payload:any){
  const url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(!url||!key)return;
  try{await fetch(url+"/realtime/v1/api/broadcast",{method:"POST",headers:{apikey:key,authorization:"Bearer "+key,"content-type":"application/json"},body:JSON.stringify({messages:[{topic,event,payload}]})})}catch{}
}
async function challengeList(req:Request,b:any){
  const p=await playerFor(req,b,false,{touch:false}),now=nowIso();
  await admin.from("chess_challenges").update({status:"expired"}).eq("status","pending").lte("expires_at",now).or(`from_player_id.eq.${p.id},to_player_id.eq.${p.id}`);
  const {data,error}=await admin.from("chess_challenges").select("*").eq("status","pending").or(`from_player_id.eq.${p.id},to_player_id.eq.${p.id}`).order("created_at",{ascending:false}).limit(30);
  if(error)throw error;
  const ids=[...new Set((data||[]).flatMap((c:any)=>[c.from_player_id,c.to_player_id]))];
  const {data:players}=ids.length?await admin.from("chess_players").select(FRIEND_FIELDS).in("id",ids):{data:[]};
  const map=new Map((players||[]).map((x:any)=>[x.id,friendCard(x)]));
  const card=(c:any)=>({id:c.id,from:map.get(c.from_player_id)||null,to:map.get(c.to_player_id)||null,base_seconds:c.base_seconds,increment_seconds:c.increment_seconds,daily_days:c.daily_days,rated:c.rated,color:c.color,variant:c.variant||"standard",expires_at:c.expires_at});
  // Your challenges accepted in the last 10 minutes, with the game to open (in case the realtime hint was missed).
  const {data:acc}=await admin.from("chess_challenges").select("id,game_id,daily_days").eq("from_player_id",p.id).eq("status","accepted").not("game_id","is",null).gte("created_at",new Date(Date.now()-600000).toISOString()).limit(5);
  const gids=(acc||[]).map((c:any)=>c.game_id),{data:ag}=gids.length?await admin.from("chess_games").select("id,invite_code,status").in("id",gids):{data:[]};
  const accepted=(acc||[]).map((c:any)=>{const g=(ag||[]).find((x:any)=>x.id===c.game_id);return g&&g.status==="active"?{id:c.id,code:g.invite_code,daily_days:c.daily_days}:null}).filter(Boolean);
  return {incoming:(data||[]).filter((c:any)=>c.to_player_id===p.id).map(card),outgoing:(data||[]).filter((c:any)=>c.from_player_id===p.id).map(card),accepted}
}
async function challengeRespond(req:Request,b:any){
  const p=await playerFor(req,b),c=await one("chess_challenges","id",String(b.challengeId||""));assertAllowed(p);
  if(!c||c.to_player_id!==p.id)throw fail("Challenge not found.",404);
  if(c.status!=="pending"||Date.parse(c.expires_at)<=Date.now())throw fail("This challenge is no longer open.",409);
  if(!b.accept){await admin.from("chess_challenges").update({status:"declined"}).eq("id",c.id).eq("status","pending");EdgeRuntime.waitUntil(broadcastTo("player:"+c.from_player_id,"challenge_answer",{id:c.id,accepted:false}));return {declined:true}}
  const {data:claimed}=await admin.from("chess_challenges").update({status:"accepted"}).eq("id",c.id).eq("status","pending").select().maybeSingle();
  if(!claimed)throw fail("This challenge is no longer open.",409);
  const from=await playerById(c.from_player_id);if(!from)throw fail("The challenger is gone.",404);
  if(c.rated&&(!from.auth_user_id||!p.auth_user_id))throw fail("Rated challenges are between signed-in players.",401);
  const fromWhite=c.color==="w"?true:c.color==="b"?false:crypto.getRandomValues(new Uint8Array(1))[0]%2===0;
  const made=await createGame(req,{seconds:c.base_seconds,increment:c.increment_seconds,rated:c.rated,dailyDays:c.daily_days,challengeId:c.id,variant:c.variant},{players:fromWhite?[from,p]:[p,from],source:"private"});
  await admin.from("chess_challenges").update({game_id:made.game.id}).eq("id",c.id);
  EdgeRuntime.waitUntil(Promise.all([
    broadcastTo("player:"+c.from_player_id,"challenge_answer",{id:c.id,accepted:true,code:made.game.invite_code}),
    notifyPlayer(c.from_player_id,{title:"Challenge accepted",body:`${p.username||p.display_name||"Your opponent"} accepted. ${c.daily_days?"Your game is ready.":"Join now."}`,url:`/?game=${made.game.invite_code}`,tag:"challenge-"+c.id})
  ]).then(()=>{}));
  return {game:made.game,player:publicPlayer(p),seat:made.game.white_player_id===p.id?"w":"b"}
}
async function challengeCancel(req:Request,b:any){
  const p=await playerFor(req,b,false,{touch:false});
  await admin.from("chess_challenges").update({status:"cancelled"}).eq("id",String(b.challengeId||"")).eq("from_player_id",p.id).eq("status","pending");
  return {cancelled:true}
}
// ---- Daily games: the ones you're in, with whose turn it is ----
async function dailyGames(req:Request,b:any){
  const p=await playerFor(req,b,false,{touch:false});
  const {data,error}=await admin.from("chess_games").select("id,invite_code,white_player_id,black_player_id,white_name,black_name,status,fen,daily_days,last_move_at,move_count,rated").not("daily_days","is",null).in("status",["active","waiting"]).or(`white_player_id.eq.${p.id},black_player_id.eq.${p.id}`).order("last_move_at",{ascending:true}).limit(50);
  if(error)throw error;
  const oppIds=[...new Set((data||[]).map((g:any)=>g.white_player_id===p.id?g.black_player_id:g.white_player_id).filter(Boolean))];
  const {data:opps}=oppIds.length?await admin.from("chess_players").select("id,vacation_from,vacation_until").in("id",oppIds):{data:[]};const away=new Map((opps||[]).filter((x:any)=>onVacation(x)).map((x:any)=>[x.id,x.vacation_until]));
  return {vacation:vacationInfo(p),games:(data||[]).map((g:any)=>{const seat=g.white_player_id===p.id?"w":"b",turn=String(g.fen||"").split(" ")[1]||"w";return {opponentAwayUntil:away.get(seat==="w"?g.black_player_id:g.white_player_id)||null,id:g.id,code:g.invite_code,opponent:seat==="w"?g.black_name:g.white_name,seat,yourTurn:g.status==="active"&&turn===seat,status:g.status,fen:g.fen,daily_days:g.daily_days,deadline:g.last_move_at?new Date(Date.parse(g.last_move_at)+dailyMoveMs(g.daily_days)).toISOString():null,moves:g.move_count,rated:g.rated}})}
}
// ---- Puzzles: daily puzzle, themes, streak record ----
async function puzzleDaily(req:Request,b:any){
  // Chosen among puzzles cached before today (and of middling difficulty), so the pick
  // stays the same all day even as new puzzles are cached.
  const today=nowIso().slice(0,10),pool=()=>admin.from("chess_puzzles").select("id",{count:"exact",head:true}).lt("fetched_at",today+"T00:00:00Z").gte("rating",1300).lte("rating",2100);
  const {count}=await pool();
  if(!count)throw fail("No daily puzzle yet. Try the regular puzzles.",404);
  const idx=dailyIndex(today,Number(count));
  const {data,error}=await admin.from("chess_puzzles").select("*").lt("fetched_at",today+"T00:00:00Z").gte("rating",1300).lte("rating",2100).order("id").range(idx,idx);if(error)throw error;
  const pick=data?.[0];if(!pick)throw fail("No puzzle today.",404);
  let solved=false;try{const p=await playerFor(req,b,false,{touch:false});const {data:a}=await admin.from("chess_puzzle_attempts").select("id").eq("player_id",p.id).eq("puzzle_id",pick.id).eq("success",true).gte("created_at",today+"T00:00:00Z").limit(1);solved=!!a?.length}catch{}
  return {date:today,solved,puzzle:{id:pick.id,fen:pick.fen,solution:pick.solution,rating:pick.rating,plays:pick.plays,themes:pick.themes,source:pick.source}}
}
async function puzzleStats(req:Request,b:any){
  const p=await playerFor(req,b,false,{touch:false});
  const {data:attempts,error}=await admin.from("chess_puzzle_attempts").select("puzzle_id,success,rating_after,created_at").eq("player_id",p.id).order("created_at",{ascending:false}).limit(300);
  if(error)throw error;
  const ids=[...new Set((attempts||[]).map((a:any)=>a.puzzle_id))];
  const {data:puzzles}=ids.length?await admin.from("chess_puzzles").select("id,themes").in("id",ids):{data:[]};
  const themesOf=new Map((puzzles||[]).map((x:any)=>[x.id,Array.isArray(x.themes)?x.themes:[]]));
  const agg=new Map<string,{theme:string,tries:number,solved:number}>();
  for(const a of attempts||[])for(const t of themesOf.get(a.puzzle_id)||[]){const r=agg.get(t)||{theme:t,tries:0,solved:0};r.tries++;if(a.success)r.solved++;agg.set(t,r)}
  const themes=[...agg.values()].filter(r=>r.tries>=2).map(r=>({...r,rate:Math.round(100*r.solved/r.tries)})).sort((a,c)=>c.tries-a.tries).slice(0,24);
  const history=(attempts||[]).filter((a:any)=>Number.isFinite(a.rating_after)).slice(0,60).reverse().map((a:any)=>a.rating_after);
  return {rating:Number(p.puzzle_rating||1200),games:Number(p.puzzle_games||0),best_streak:Number(p.puzzle_best_streak||0),themes,history}
}
async function puzzleStreakRecord(req:Request,b:any){
  const p=await playerFor(req,b,false,{touch:false}),n=Math.max(0,Math.min(500,Math.floor(Number(b.count)||0)));
  if(n<=Number(p.puzzle_best_streak||0))return {best:Number(p.puzzle_best_streak||0)};
  await admin.from("chess_players").update({puzzle_best_streak:n}).eq("id",p.id);
  await awardAchievements({...p,puzzle_best_streak:n});
  return {best:n}
}
async function achievementsFor(req:Request,b:any){
  const p=await playerFor(req,b,false,{touch:false});
  return {achievements:Array.isArray(p.achievements)?p.achievements:[]}
}
// ---- Conditional moves (daily games; rules.js matchConditional) ----
async function conditionalReply(g:any,moverColor:string,m:any){
  const replier=moverColor==="w"?g.black_player_id:g.white_player_id;if(!replier)return null;
  const {data:row}=await admin.from("chess_conditional_moves").select("lines").eq("game_id",g.id).eq("player_id",replier).maybeSingle();
  const lines=Array.isArray(row?.lines)?row.lines:[];if(!lines.length)return null;
  const {reply,rest}=matchConditional(lines,m.from+m.to+(m.promotion||""));
  await admin.from("chess_conditional_moves").update({lines:rest,updated_at:nowIso()}).eq("game_id",g.id).eq("player_id",replier);
  if(!reply)return null;
  try{return await applyMove(g,moverColor==="w"?"b":"w",{from:reply.slice(0,2),to:reply.slice(2,4),promotion:reply[4]||undefined,expectedVersion:g.version,conditional:true})}
  catch(e){console.error("conditional reply failed",e);await admin.from("chess_conditional_moves").update({lines:[]}).eq("game_id",g.id).eq("player_id",replier);return null}
}
async function conditionalList(req:Request,b:any){
  const {p,g}=await assertGameParticipant(req,b);
  const {data}=await admin.from("chess_conditional_moves").select("lines").eq("game_id",g.id).eq("player_id",p.id).maybeSingle();
  return {lines:Array.isArray(data?.lines)?data.lines:[]}
}
async function conditionalSet(req:Request,b:any){
  const {p,g}=await assertGameParticipant(req,b);
  if(!g.daily_days||g.status!=="active")throw fail("Conditional moves are for daily games in progress.",409);
  const color=g.white_player_id===p.id?"w":"b";
  if(new Chess(g.fen).turn()===color)throw fail("It's your move. Plan replies while you wait for your opponent.",409);
  const incoming=Array.isArray(b.lines)?b.lines:[];
  if(incoming.length>CONDITIONAL_MAX_LINES)throw fail(`Up to ${CONDITIONAL_MAX_LINES} plans per game.`);
  const lines:string[][]=[];
  for(const line of incoming){
    if(!Array.isArray(line)||line.length<2||line.length>CONDITIONAL_MAX_PLIES)throw fail("Each plan is 2 to 12 moves.");
    const c=new Chess(g.fen),out:string[]=[];
    for(const u of line){
      const x=String(u);if(!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(x))throw fail("Invalid move in a plan.");
      let mv:any=null;try{mv=c.move({from:x.slice(0,2),to:x.slice(2,4),promotion:x[4]||undefined})}catch{}
      if(!mv)throw fail("A planned move is not legal.");out.push(mv.from+mv.to+(mv.promotion||""));
    }
    if(out.length%2===1)out.pop(); // a plan ends on your reply
    lines.push(out);
  }
  const {error}=await admin.from("chess_conditional_moves").upsert({game_id:g.id,player_id:p.id,lines,updated_at:nowIso()},{onConflict:"game_id,player_id"});if(error)throw error;
  return {lines}
}
// ---- Monthly leagues (rules.js) ----
async function processSeasonIfDue(){
  let season=seasonOf();
  for(let i=0;i<3;i++){
    season=previousSeason(season);
    const {data:claimed}=await admin.from("chess_league_seasons").upsert({season},{onConflict:"season",ignoreDuplicates:true}).select();
    if(!claimed?.length)continue; // already processed (or being processed)
    const {data:entries}=await admin.from("chess_league_entries").select("player_id,division,points,games,wins").eq("season",season).limit(5000);
    const moves=leagueMoves(entries||[]),moved=new Map(moves.map(x=>[x.player_id,x.to]));
    for(const mv of moves){await admin.from("chess_players").update({league_division:mv.to}).eq("id",mv.player_id);await inbox(mv.player_id,{title:mv.to>mv.from?`Promoted to ${DIVISIONS[mv.to]}`:`Moved to ${DIVISIONS[mv.to]}`,body:`Season ${season} is over.`,url:"/?league=1",tag:`league-${season}`}).catch(()=>{})}
    // Season badge for everyone who played the minimum, in the division they finished in.
    const at=nowIso();
    for(const e of (entries||[]).filter((x:any)=>Number(x.games)>=LEAGUE_MIN_GAMES)){
      const pl=await playerById(e.player_id);if(!pl)continue;
      const finished=moved.has(e.player_id)?moved.get(e.player_id):Number(e.division),badge=`season-${season}-${DIVISIONS[finished].toLowerCase()}`;
      const have=Array.isArray(pl.achievements)?pl.achievements:[];
      const extra=newAchievements(have,pl,{promoted:Number(finished)>Number(e.division)});
      const next=[...have.filter((a:any)=>a?.id!==badge),{id:badge,at},...extra.map((id:string)=>({id,at}))];
      await admin.from("chess_players").update({achievements:next}).eq("id",pl.id);
    }
  }
}
async function addLeaguePoints(p:any,score:number){
  if(!p?.id||!p.auth_user_id)return;
  const season=seasonOf(),pts=leaguePoints(score),win=score===1?1:0;
  const {data:e}=await admin.from("chess_league_entries").select("*").eq("season",season).eq("player_id",p.id).maybeSingle();
  if(e){await admin.from("chess_league_entries").update({points:Number(e.points)+pts,games:Number(e.games)+1,wins:Number(e.wins)+win,updated_at:nowIso()}).eq("season",season).eq("player_id",p.id);return}
  await processSeasonIfDue();
  const fresh=await playerById(p.id);
  const {error}=await admin.from("chess_league_entries").insert({season,player_id:p.id,division:Number(fresh?.league_division||0),points:pts,games:1,wins:win});
  if(error?.code==="23505")return addLeaguePoints(p,score);if(error)throw error;
}
async function league(req:Request,b:any){
  let p:any=null;try{p=await playerFor(req,b,false,{touch:false})}catch{}
  await processSeasonIfDue().catch(e=>console.error("season",e));
  const season=seasonOf();
  const {data:mine}=p?await admin.from("chess_league_entries").select("*").eq("season",season).eq("player_id",p.id).maybeSingle():{data:null};
  const fresh=p?await playerById(p.id):null;
  const asked=Number.isInteger(Number(b.division))&&b.division!==null&&b.division!==undefined?Math.max(0,Math.min(4,Number(b.division))):null;
  const division=asked??(mine?Number(mine.division):Number(fresh?.league_division||0));
  const {data:rows,error}=await admin.from("chess_league_entries").select("player_id,points,games,wins").eq("season",season).eq("division",division).order("points",{ascending:false}).order("wins",{ascending:false}).limit(100);
  if(error)throw error;
  const ids=(rows||[]).map((r:any)=>r.player_id),{data:players}=ids.length?await admin.from("chess_players").select("id,username,display_name,country_code").in("id",ids):{data:[]};
  const names=new Map((players||[]).map((x:any)=>[x.id,x]));
  const {count}=await admin.from("chess_league_entries").select("player_id",{count:"exact",head:true}).eq("season",season).eq("division",division);
  const badges=(Array.isArray(fresh?.achievements)?fresh.achievements:[]).filter((a:any)=>String(a?.id||"").startsWith("season-"));
  // Clubs as teams: the best members' league points this season.
  let clubTable:any[]=[],myClub:any=null;
  try{
    const {data:all}=await admin.from("chess_league_entries").select("player_id,points").eq("season",season).gt("points",0).limit(5000);
    // Every club member (a long .in() list would overflow the request URL); entries without a club drop out.
    const {data:mem}=(all||[]).length?await admin.from("chess_club_members").select("player_id,club_id").limit(20000):{data:[]};
    const memberClub=new Map((mem||[]).map((m:any)=>[m.player_id,m.club_id]));
    const ranked=clubLeagueTable(all||[],memberClub).slice(0,30),cids=ranked.map((c:any)=>c.id);
    const {data:cl}=cids.length?await admin.from("chess_clubs").select("id,name,slug").in("id",cids):{data:[]};
    const names=new Map((cl||[]).map((c:any)=>[c.id,c]));
    clubTable=ranked.map((c:any,i:number)=>({...c,name:names.get(c.id)?.name||"Club",slug:names.get(c.id)?.slug||"",rank:i+1}));
    if(p){const m=await clubOf(p.id);if(m)myClub=clubTable.find((c:any)=>c.id===m.club_id)||null}
    clubTable=clubTable.map(({id,...rest}:any)=>rest);if(myClub){const {id,...rest}=myClub;myClub=rest}
  }catch(e){console.error("club league",e)}
  return {season,ends:seasonEnds(season),division,divisions:DIVISIONS,myDivision:Number(fresh?.league_division||0),me:mine||null,minGames:LEAGUE_MIN_GAMES,zones:zoneSizes(Number(count||0)),total:Number(count||0),
    clubs:clubTable,myClub,clubTop:CLUB_LEAGUE_TOP,standings:(rows||[]).map((r:any,i:number)=>{const x:any=names.get(r.player_id);return {rank:i+1,name:x?.username||x?.display_name||"Player",country_code:x?.country_code||null,points:r.points,games:r.games,wins:r.wins,me:r.player_id===p?.id}}),badges}
}
// ---- Clubs and club battles ----
const cleanSlug=(v:any)=>String(v||"").toLowerCase().trim().replace(/[^a-z0-9-]+/g,"-").replace(/^-+|-+$/g,"").slice(0,32);
const cleanClubName=(v:any)=>String(v||"").replace(/[<>\u0000-\u001F]/g,"").replace(/\s+/g," ").trim().slice(0,40);
async function clubOf(playerId:string){const {data}=await admin.from("chess_club_members").select("club_id,role").eq("player_id",playerId).maybeSingle();return data}
async function recountClub(id:string){const {count}=await admin.from("chess_club_members").select("player_id",{count:"exact",head:true}).eq("club_id",id);await admin.from("chess_clubs").update({member_count:Number(count||0)}).eq("id",id);return Number(count||0)}
const clubCard=(c:any)=>({slug:c.slug,name:c.name,description:c.description,member_count:c.member_count,created_at:c.created_at});
async function clubList(req:Request,b:any){
  let p:any=null;try{p=await playerFor(req,b,false,{touch:false})}catch{}
  const q=cleanClubName(b.q).replace(/[%_\\]/g,"");
  let query=admin.from("chess_clubs").select("*").order("member_count",{ascending:false}).limit(30);
  if(q.length>=2)query=query.ilike("name",`%${q}%`);
  const {data,error}=await query;if(error)throw error;
  const m=p?await clubOf(p.id):null,mine=m?await one("chess_clubs","id",m.club_id):null;
  return {clubs:(data||[]).map(clubCard),mine:mine?{...clubCard(mine),role:m.role}:null}
}
async function clubView(req:Request,b:any){
  let p:any=null;try{p=await playerFor(req,b,false,{touch:false})}catch{}
  const club=await one("chess_clubs","slug",cleanSlug(b.slug));if(!club)throw fail("Club not found.",404);
  const {data:mem}=await admin.from("chess_club_members").select("player_id,role,joined_at").eq("club_id",club.id).order("joined_at").limit(300);
  const ids=(mem||[]).map((x:any)=>x.player_id),{data:players}=ids.length?await admin.from("chess_players").select(FRIEND_FIELDS).in("id",ids):{data:[]};
  const map=new Map((players||[]).map((x:any)=>[x.id,x])),me=(mem||[]).find((x:any)=>x.player_id===p?.id);
  const members=(mem||[]).map((x:any)=>{const pl:any=map.get(x.player_id);return pl?{...friendCard(pl),role:x.role}:null}).filter(Boolean).sort((a:any,c:any)=>Number(c.online)-Number(a.online)||c.rating-a.rating);
  let messages:any[]=[];
  if(me){ // club chat is for members only
    const {data:msgs}=await admin.from("chess_club_messages").select("id,player_id,body,created_at").eq("club_id",club.id).order("created_at",{ascending:false}).limit(50);
    messages=(msgs||[]).reverse().map((x:any)=>{const pl:any=map.get(x.player_id);return {id:x.id,name:pl?.username||pl?.display_name||"Former member",body:x.body,created_at:x.created_at,mine:x.player_id===p?.id}});
  }
  return {club:{...clubCard(club),id:club.id},members,messages,member:!!me,role:me?.role||null}
}
async function clubCreate(req:Request,b:any){
  const p=await playerFor(req,b,true);assertAllowed(p,"chat");
  if(await clubOf(p.id))throw fail("Leave your club before starting a new one.",409);
  const name=cleanClubName(b.name);if(name.length<3)throw fail("Club names are 3 to 40 characters.");
  const slug=cleanSlug(b.slug||name);if(!/^[a-z0-9][a-z0-9-]{2,31}$/.test(slug))throw fail("Pick a club link of 3 to 32 letters, numbers or dashes.");
  const {data:club,error}=await admin.from("chess_clubs").insert({slug,name,description:cleanChat(b.description),owner_id:p.id}).select().single();
  if(error){if(error.code==="23505")throw fail("That club link is taken.",409);throw error}
  const {error:e2}=await admin.from("chess_club_members").insert({club_id:club.id,player_id:p.id,role:"owner"});
  if(e2){await admin.from("chess_clubs").delete().eq("id",club.id);throw e2}
  EdgeRuntime.waitUntil(awardAchievements(p,{joinedClub:true}).then(()=>{}).catch(()=>{}));
  return {club:clubCard(club)}
}
async function clubJoin(req:Request,b:any){
  const p=await playerFor(req,b,true),club=await one("chess_clubs","slug",cleanSlug(b.slug));if(!club)throw fail("Club not found.",404);
  const m=await clubOf(p.id);if(m){if(m.club_id===club.id)return {joined:true};throw fail("You're already in a club. Leave it first.",409)}
  const {error}=await admin.from("chess_club_members").insert({club_id:club.id,player_id:p.id});
  if(error){if(error.code==="23505")throw fail("You're already in a club.",409);throw error}
  await recountClub(club.id);EdgeRuntime.waitUntil(awardAchievements(p,{joinedClub:true}).then(()=>{}).catch(()=>{}));
  return {joined:true}
}
async function clubLeave(req:Request,b:any){
  const p=await playerFor(req,b,true),m=await clubOf(p.id);if(!m)return {left:true};
  await admin.from("chess_club_members").delete().eq("club_id",m.club_id).eq("player_id",p.id);
  const left=await recountClub(m.club_id);
  if(m.role==="owner"){ // the longest-standing member takes over; an empty club closes
    if(!left)await admin.from("chess_clubs").delete().eq("id",m.club_id);
    else{const {data:next}=await admin.from("chess_club_members").select("player_id").eq("club_id",m.club_id).order("joined_at").limit(1).maybeSingle();if(next){await admin.from("chess_club_members").update({role:"owner"}).eq("club_id",m.club_id).eq("player_id",next.player_id);await admin.from("chess_clubs").update({owner_id:next.player_id}).eq("id",m.club_id)}}
  }
  return {left:true}
}
async function clubChat(req:Request,b:any){
  const p=await playerFor(req,b,true),m=await clubOf(p.id),club=await one("chess_clubs","slug",cleanSlug(b.slug));assertAllowed(p,"chat");
  if(!club||!m||m.club_id!==club.id)throw fail("Only club members can chat here.",403);
  const body=cleanChat(b.body);if(!body)throw fail("Write a message first.");
  const {count}=await admin.from("chess_club_messages").select("id",{count:"exact",head:true}).eq("player_id",p.id).gte("created_at",new Date(Date.now()-15000).toISOString());
  if(Number(count||0)>=3)throw fail("Slow down a little.",429);
  const {data,error}=await admin.from("chess_club_messages").insert({club_id:club.id,player_id:p.id,body}).select("id,body,created_at").single();if(error)throw error;
  EdgeRuntime.waitUntil(broadcastTo("club:"+club.id,"message",{id:data.id}));
  EdgeRuntime.waitUntil((async()=>{const {data:mem}=await admin.from("chess_club_members").select("player_id").eq("club_id",club.id).neq("player_id",p.id).limit(300);for(const m of mem||[])await inbox(m.player_id,{title:`New messages in ${club.name}`,body:`${p.username||"A member"}: ${body.slice(0,120)}`,url:`/?club=${club.slug}`,tag:`club-${club.id}`})})().catch(e=>console.error("club inbox",e)));
  return {message:{...data,name:p.username||p.display_name,mine:true}}
}
// Club battle: every Sunday 18:00 UTC for 90 minutes, rated 5+0. A club scores its best five
// players' arena points; you are never paired against your own club.
const CLUB_BATTLE={day:0,hourUtc:18,minutes:90,base:300,inc:0,pool:"blitz",top:5};
async function ensureClubBattle(){
  const now=new Date(),start=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate(),CLUB_BATTLE.hourUtc));
  start.setUTCDate(start.getUTCDate()+((CLUB_BATTLE.day-start.getUTCDay()+7)%7));
  let end=new Date(start.getTime()+CLUB_BATTLE.minutes*60000);
  if(end<=now){start.setUTCDate(start.getUTCDate()+7);end=new Date(start.getTime()+CLUB_BATTLE.minutes*60000)}
  await admin.from("chess_tournaments").upsert({slug:"club-battle-"+start.toISOString().slice(0,10),name:"VCH Club Battle",kind:"club_battle",description:`Every Sunday · 90 minutes · rated 5+0. Play for your club: its best ${CLUB_BATTLE.top} players' points count.`,format:"arena",status:Date.now()>=start.getTime()?"active":"scheduled",rated:true,pool:CLUB_BATTLE.pool,base_seconds:CLUB_BATTLE.base,increment_seconds:CLUB_BATTLE.inc,starts_at:start.toISOString(),ends_at:end.toISOString()},{onConflict:"slug",ignoreDuplicates:true});
  const iso=nowIso();
  await Promise.all([
    admin.from("chess_tournaments").update({status:"active"}).like("slug","club-battle-%").eq("status","scheduled").lte("starts_at",iso).gt("ends_at",iso),
    admin.from("chess_tournaments").update({status:"finished"}).like("slug","club-battle-%").in("status",["scheduled","active"]).lte("ends_at",iso)
  ]);
}
async function clubBattleTable(entries:any[]){
  const byClub=new Map<string,any[]>();
  for(const e of entries)if(e.club_id){const l=byClub.get(e.club_id)||[];l.push(e);byClub.set(e.club_id,l)}
  if(!byClub.size)return [];
  const {data:clubs}=await admin.from("chess_clubs").select("id,slug,name").in("id",[...byClub.keys()]);
  return (clubs||[]).map((c:any)=>{const rows=(byClub.get(c.id)||[]).sort((a:any,x:any)=>Number(x.points)-Number(a.points));return {slug:c.slug,name:c.name,points:rows.slice(0,CLUB_BATTLE.top).reduce((s:number,x:any)=>s+Number(x.points||0),0),players:rows.length}}).sort((a:any,c:any)=>c.points-a.points||c.players-a.players)
}
// ---- Public profile: rating history, best wins, head-to-head ----
async function publicProfile(req:Request,b:any){
  const u=cleanUsername(b.username);if(u.length<3)throw fail("Player not found.",404);
  const {data:found}=await admin.from("chess_players").select("*").ilike("username",u).not("auth_user_id","is",null).limit(5);
  const t=(found||[]).find((x:any)=>String(x.username).toLowerCase()===u.toLowerCase());if(!t)throw fail("Player not found.",404);
  let viewer:any=null;try{viewer=await playerFor(req,b,false,{touch:false})}catch{}
  const fields="id,white_player_id,black_player_id,white_name,black_name,result,pool,rated,variant,ended_at,white_rating_before,black_rating_before,white_rating_delta,black_rating_delta";
  const {data:games}=await admin.from("chess_games").select(fields).eq("rated",true).not("white_rating_delta","is",null).or(`white_player_id.eq.${t.id},black_player_id.eq.${t.id}`).order("ended_at",{ascending:false}).limit(300);
  const list=(games||[]).reverse(),side=(g:any)=>g.white_player_id===t.id?"w":"b";
  const history=list.map((g:any)=>{const s=side(g);return {pool:g.pool,at:g.ended_at,rating:Number(s==="w"?g.white_rating_before:g.black_rating_before)+Number(s==="w"?g.white_rating_delta:g.black_rating_delta)}});
  const row=(g:any)=>{const s=side(g);return {opponent:s==="w"?g.black_name:g.white_name,opponent_rating:Number(s==="w"?g.black_rating_before:g.white_rating_before),result:scoreFor(g.result,s)===1?"win":g.result==="1/2-1/2"?"draw":"loss",pool:g.pool,at:g.ended_at}};
  const bestWins=list.filter((g:any)=>scoreFor(g.result,side(g))===1).map(row).sort((a:any,c:any)=>c.opponent_rating-a.opponent_rating).slice(0,5);
  let headToHead=null,following=false;
  if(viewer&&viewer.id!==t.id){
    const {data:h2h}=await admin.from("chess_games").select("white_player_id,result").not("result","eq","*").or(`and(white_player_id.eq.${viewer.id},black_player_id.eq.${t.id}),and(white_player_id.eq.${t.id},black_player_id.eq.${viewer.id})`).limit(500);
    const r={wins:0,draws:0,losses:0};for(const g of h2h||[]){const s=scoreFor(g.result,g.white_player_id===viewer.id?"w":"b");if(s===1)r.wins++;else if(s===.5)r.draws++;else r.losses++}
    headToHead=r;
    const {data:f}=await admin.from("chess_follows").select("followee_id").eq("follower_id",viewer.id).eq("followee_id",t.id).maybeSingle();following=!!f;
  }
  const m=await clubOf(t.id),club=m?await one("chess_clubs","id",m.club_id):null;
  return {player:{id:t.id,username:t.username,country_code:t.country_code||null,avatar_data:t.avatar_data||null,ratings:t.ratings||{},provisional_games:t.provisional_games||{},wins:t.wins,losses:t.losses,draws:t.draws,rated_games:t.rated_games,puzzle_rating:Number(t.puzzle_rating||1200),achievements:Array.isArray(t.achievements)?t.achievements:[],league_division:Number(t.league_division||0),member_since:String(t.account_created_at||t.created_at||"").slice(0,7),suspended:!!t.banned_at,online:!!t.last_seen_at&&Date.now()-Date.parse(t.last_seen_at)<ONLINE_MS},
    history,bestWins,recent:list.slice(-10).reverse().map(row),headToHead,following,self:viewer?.id===t.id,club:club?{slug:club.slug,name:club.name}:null,division:DIVISIONS[Number(t.league_division||0)]}
}
// ---- Fair play ----
async function reportPlayer(req:Request,b:any){
  const p=await playerFor(req,b,true),id=String(b.playerId||"");
  if(!/^[0-9a-f-]{36}$/i.test(id)||id===p.id)throw fail("Player not found.",404);
  if(!await playerById(id))throw fail("Player not found.",404);
  const reason=["engine","abuse","sandbagging","other"].includes(b.reason)?b.reason:"other";
  let gameId=null;
  if(b.gameId){const g=await gameById(String(b.gameId));if(g&&[g.white_player_id,g.black_player_id].includes(p.id)&&[g.white_player_id,g.black_player_id].includes(id))gameId=g.id}
  const {count}=await admin.from("chess_reports").select("id",{count:"exact",head:true}).eq("reporter_id",p.id).gte("created_at",new Date(Date.now()-86400000).toISOString());
  if(Number(count||0)>=10)throw fail("You've sent a lot of reports today. Thank you; we'll look at them.",429);
  const {error}=await admin.from("chess_reports").insert({reporter_id:p.id,reported_id:id,game_id:gameId,reason,note:String(b.note||"").replace(/[\u0000-\u001F]/g," ").trim().slice(0,500)});
  if(error&&error.code!=="23505")throw error;
  return {reported:true}
}
// Your own engine review of a rated game you played sends the opponent's accuracy. Used only
// as a signal for a human to look at (chess_fairplay_review), never to act automatically.
async function fairplaySignal(req:Request,b:any){
  const p=await playerFor(req,b,false,{touch:false}),g=await gameById(String(b.gameId||""));
  if(!g||!g.rated||["waiting","active"].includes(g.status))return {ok:false};
  const color=g.white_player_id===p.id?"w":g.black_player_id===p.id?"b":null;if(!color)throw fail("You are not a player in this game.",403);
  const subject=color==="w"?g.black_player_id:g.white_player_id;if(!subject||subject===g.bot_player_id)return {ok:false};
  const accuracy=Number(b.accuracy),avgLoss=Number(b.avgLoss),moves=Math.floor(Number(b.moves));
  if(!(accuracy>=0&&accuracy<=100)||!(avgLoss>=0&&avgLoss<=100)||!(moves>=1&&moves<=Math.ceil(Number(g.move_count||0)/2)))throw fail("Invalid review data.");
  await admin.from("chess_fairplay_signals").upsert({game_id:g.id,submitter_id:p.id,subject_id:subject,accuracy:Math.round(accuracy*100)/100,avg_loss:Math.round(avgLoss*100)/100,moves},{onConflict:"game_id,submitter_id",ignoreDuplicates:true});
  return {ok:true}
}

// "Learn from your mistakes" lives in the browser; it reports progress for the badge only.
async function mistakesFixed(req:Request,b:any){
  const p=await playerFor(req,b,false,{touch:false}),n=Math.max(0,Math.min(10000,Math.floor(Number(b.count)||0)));
  const awarded=n>=10?await awardAchievements(p,{fixedMistakes:true}):[];return {awarded}
}
// ---- Moderation ----
function assertAllowed(p:any,kind:"play"|"chat"="play"){
  if(p?.banned_at)throw fail("This account is suspended. Contact support if you think this is a mistake.",403);
  if(kind==="chat"&&p?.muted_until&&Date.parse(p.muted_until)>Date.now())throw fail(`You're muted until ${new Date(p.muted_until).toUTCString().slice(5,22)} UTC.`,403);
}
async function adminFor(req:Request,b:any){
  const p=await playerFor(req,b,true,{touch:false});
  if(p.role!=="admin")throw fail("Not found.",404); // the moderation API is invisible to players
  return p;
}
const modCard=(x:any)=>({sandbag_score:Number(x.sandbag_score||0),id:x.id,username:x.username||x.display_name||"Player",account:!!x.auth_user_id,rating:ratingOf(x,"blitz"),rated_games:Number(x.rated_games||0),created_at:x.account_created_at||x.created_at,muted_until:x.muted_until||null,banned_at:x.banned_at||null,ban_reason:x.ban_reason||null});
async function modQueue(req:Request,b:any){
  await adminFor(req,b);
  const [{data:reports},{data:review},{data:log}]=await Promise.all([
    admin.from("chess_reports").select("id,reporter_id,reported_id,game_id,reason,note,created_at").eq("status","open").order("created_at",{ascending:false}).limit(300),
    admin.from("chess_fairplay_review").select("*").limit(100),
    admin.from("chess_mod_actions").select("moderator_id,player_id,action,note,created_at").order("created_at",{ascending:false}).limit(40)
  ]);
  const ids=[...new Set([...(reports||[]).flatMap((r:any)=>[r.reported_id,r.reporter_id]),...(review||[]).map((r:any)=>r.player_id),...(log||[]).flatMap((l:any)=>[l.player_id,l.moderator_id])].filter(Boolean))];
  const {data:players}=ids.length?await admin.from("chess_players").select("*").in("id",ids):{data:[]};
  const map=new Map((players||[]).map((x:any)=>[x.id,x]));
  const cases=new Map<string,any>();
  for(const r of reports||[]){
    const c=cases.get(r.reported_id)||{player:modCard(map.get(r.reported_id)||{id:r.reported_id}),reports:[],reasons:{},fairplay:null};
    c.reports.push({id:r.id,reason:r.reason,note:r.note,game_id:r.game_id,created_at:r.created_at,by:(map.get(r.reporter_id) as any)?.username||"Player"});
    c.reasons[r.reason]=(c.reasons[r.reason]||0)+1;cases.set(r.reported_id,c);
  }
  for(const f of review||[]){
    const c=cases.get(f.player_id)||{player:modCard(map.get(f.player_id)||{id:f.player_id}),reports:[],reasons:{},fairplay:null};
    c.fairplay={reviewed_games:Number(f.reviewed_games||0),games_95_plus:Number(f.games_95_plus||0),avg_accuracy:f.avg_opponent_measured_accuracy===null?null:Number(f.avg_opponent_measured_accuracy)};cases.set(f.player_id,c);
  }
  const {data:bags}=await admin.from("chess_players").select("*").gte("sandbag_score",SANDBAG_FLAG).is("banned_at",null).order("sandbag_score",{ascending:false}).limit(50);
  for(const x of bags||[]){const c=cases.get(x.id)||{player:modCard(x),reports:[],reasons:{},fairplay:null};c.sandbag=Number(x.sandbag_score);cases.set(x.id,c)}
  const list=[...cases.values()].sort((a,c)=>(c.reports.length+(c.fairplay?.games_95_plus||0)*2)-(a.reports.length+(a.fairplay?.games_95_plus||0)*2));
  return {cases:list,log:(log||[]).map((l:any)=>({...l,player:(map.get(l.player_id) as any)?.username||"Player",moderator:(map.get(l.moderator_id) as any)?.username||"Moderator"}))}
}
async function modAction(req:Request,b:any){
  const mod=await adminFor(req,b),id=String(b.playerId||"");
  const target=await playerById(id);if(!target)throw fail("Player not found.",404);
  if(target.role==="admin"&&target.id!==mod.id)throw fail("Admins can't moderate each other here.",409);
  const action=["mute","unmute","ban","unban","dismiss","resolve"].includes(b.act)?b.act:null;if(!action)throw fail("Unknown action.");
  const note=String(b.note||"").replace(/[\u0000-\u001F]/g," ").trim().slice(0,500);
  const patch:any={};
  if(action==="mute")patch.muted_until=new Date(Date.now()+Math.max(1,Math.min(24*30,Number(b.hours)||24))*3600000).toISOString();
  if(action==="unmute")patch.muted_until=null;
  if(action==="ban"){patch.banned_at=nowIso();patch.ban_reason=note.slice(0,300)||"Fair-play violation"}
  if(action==="unban"){patch.banned_at=null;patch.ban_reason=null}
  if(Object.keys(patch).length)await admin.from("chess_players").update(patch).eq("id",id);
  if(["dismiss","resolve","ban"].includes(action))await admin.from("chess_reports").update({status:action==="dismiss"?"dismissed":"reviewed"}).eq("reported_id",id).eq("status","open");
  if(action==="ban")await admin.from("chess_matchmaking_queue").update({state:"cancelled"}).eq("player_id",id).eq("state","searching");
  await admin.from("chess_mod_actions").insert({moderator_id:mod.id,player_id:id,action,note});
  return {ok:true,player:modCard({...target,...patch})}
}
async function modPlayer(req:Request,b:any){
  await adminFor(req,b);const id=String(b.playerId||"");
  const target=await playerById(id);if(!target)throw fail("Player not found.",404);
  const [{data:reports},{data:signals},{data:games},{data:log}]=await Promise.all([
    admin.from("chess_reports").select("reason,note,status,created_at,game_id").eq("reported_id",id).order("created_at",{ascending:false}).limit(50),
    admin.from("chess_fairplay_signals").select("game_id,accuracy,avg_loss,moves,created_at").eq("subject_id",id).order("created_at",{ascending:false}).limit(50),
    admin.from("chess_games").select("id,invite_code,white_player_id,white_name,black_name,result,pool,rated,move_count,ended_at,move_history").or(`white_player_id.eq.${id},black_player_id.eq.${id}`).not("ended_at","is",null).order("ended_at",{ascending:false}).limit(20),
    admin.from("chess_mod_actions").select("action,note,created_at").eq("player_id",id).order("created_at",{ascending:false}).limit(20)
  ]);
  // Move-time profile from server receive times: very even thinking times over many moves
  // are one more thing a human reviewer may want to look at.
  const gameRows=(games||[]).map((g:any)=>{
    const side=g.white_player_id===id?"w":"b",h=Array.isArray(g.move_history)?g.move_history:[];
    const times:number[]=[];for(let i=1;i<h.length;i++)if(h[i].color===side){const t=Date.parse(h[i].server_received_at)-Date.parse(h[i-1].server_received_at);if(t>0&&t<600000)times.push(t/1000)}
    const mean=times.length?times.reduce((s,x)=>s+x,0)/times.length:null,sd=mean!==null?Math.sqrt(times.reduce((s,x)=>s+(x-mean)**2,0)/times.length):null;
    return {id:g.id,code:g.invite_code,opponent:side==="w"?g.black_name:g.white_name,result:g.result,side,pool:g.pool,rated:g.rated,moves:g.move_count,ended_at:g.ended_at,avg_move_s:mean===null?null:Math.round(mean*10)/10,move_time_sd:sd===null?null:Math.round(sd*10)/10}
  });
  return {player:modCard(target),reports:reports||[],signals:signals||[],games:gameRows,log:log||[]}
}
// ---- Studies: annotated lines shared by link ----
const STUDY_MAX_PLIES=300;
async function studySave(req:Request,b:any){
  const p=await playerFor(req,b,true);assertAllowed(p);
  const title=String(b.title||"").replace(/[<>\u0000-\u001F]/g,"").trim().slice(0,80)||"Untitled study";
  const startFen=String(b.startFen||START_FEN).trim().slice(0,100);
  let c:any;try{c=new Chess(startFen)}catch{throw fail("That starting position isn't valid.")}
  const raw=Array.isArray(b.moves)?b.moves.slice(0,STUDY_MAX_PLIES):[],moves:any[]=[];
  for(const x of raw){let m:any=null;try{m=c.move(String(x?.san||""))}catch{}if(!m)throw fail("A move in the study isn't legal.");moves.push({san:m.san,comment:String(x?.comment||"").replace(/[\u0000-\u0008\u000B-\u001F]/g," ").trim().slice(0,500)})}
  const intro=String(b.intro||"").replace(/[\u0000-\u0008\u000B-\u001F]/g," ").trim().slice(0,500);
  if(b.code){
    const s=await one("chess_studies","code",cleanCode(b.code));if(!s||s.owner_id!==p.id)throw fail("Study not found.",404);
    const {data,error}=await admin.from("chess_studies").update({title,start_fen:startFen,moves:{intro,line:moves},updated_at:nowIso()}).eq("id",s.id).select("code,title").single();if(error)throw error;return {study:data}
  }
  const {count}=await admin.from("chess_studies").select("id",{count:"exact",head:true}).eq("owner_id",p.id);
  if(Number(count||0)>=200)throw fail("You have 200 studies. Delete one to save another.",409);
  let code=code8();while(await one("chess_studies","code",code))code=code8();
  const {data,error}=await admin.from("chess_studies").insert({code,owner_id:p.id,title,start_fen:startFen,moves:{intro,line:moves}}).select("code,title").single();if(error)throw error;
  return {study:data}
}
async function studyGet(req:Request,b:any){
  const s=await one("chess_studies","code",cleanCode(b.code));if(!s)throw fail("Study not found.",404);
  let mine=false;try{const p=await playerFor(req,b,false,{touch:false});mine=p.id===s.owner_id}catch{}
  const owner=await playerById(s.owner_id);
  if(!mine)EdgeRuntime.waitUntil(admin.from("chess_studies").update({views:Number(s.views||0)+1}).eq("id",s.id).then(()=>{}));
  const body=Array.isArray(s.moves)?{intro:"",line:s.moves}:s.moves||{intro:"",line:[]};
  return {study:{code:s.code,title:s.title,start_fen:s.start_fen,intro:body.intro||"",moves:body.line||[],views:s.views,updated_at:s.updated_at,owner:owner?.username||owner?.display_name||"Player",mine}}
}
async function studyList(req:Request,b:any){
  const p=await playerFor(req,b,true,{touch:false});
  const {data,error}=await admin.from("chess_studies").select("code,title,views,updated_at").eq("owner_id",p.id).order("updated_at",{ascending:false}).limit(200);if(error)throw error;
  return {studies:data||[]}
}
async function studyDelete(req:Request,b:any){
  const p=await playerFor(req,b,true,{touch:false});
  await admin.from("chess_studies").delete().eq("code",cleanCode(b.code)).eq("owner_id",p.id);return {deleted:true}
}
// ---- Player- and club-run tournaments; the Swiss system ----
async function tournamentCreate(req:Request,b:any){
  const p=await playerFor(req,b,true);assertAllowed(p);
  const format=b.format==="swiss"?"swiss":"arena";
  const name=cleanClubName(b.name);if(name.length<3)throw fail("Tournament names are 3 to 40 characters.");
  const base=Math.max(60,Math.min(1800,Number(b.seconds)||300)),inc=Math.max(0,Math.min(30,Number(b.increment)||0)),pool=poolFor(base,inc);
  const startsAt=Date.parse(String(b.startsAt||""));if(!Number.isFinite(startsAt)||startsAt<Date.now()-60000||startsAt>Date.now()+30*86400000)throw fail("Pick a start time within the next 30 days.");
  const rounds=format==="swiss"?Math.max(3,Math.min(11,Number(b.rounds)||5)):null;
  const minutes=format==="arena"?Math.max(20,Math.min(180,Number(b.minutes)||60)):Math.ceil(rounds!*(base*2+inc*80+120)/60)+30;
  let clubId=null;
  if(b.clubSlug){const club=await one("chess_clubs","slug",cleanSlug(b.clubSlug));const m=await clubOf(p.id);if(!club||!m||m.club_id!==club.id||m.role!=="owner")throw fail("Only the club's owner can run club events.",403);clubId=club.id}
  const {count}=await admin.from("chess_tournaments").select("id",{count:"exact",head:true}).eq("created_by",p.id).in("status",["scheduled","active"]);
  if(Number(count||0)>=3)throw fail("You already run three upcoming events.",409);
  const slug=`${format}-${cleanSlug(name).slice(0,20)||"event"}-${code8().toLowerCase()}`;
  const {data,error}=await admin.from("chess_tournaments").insert({slug,name,description:cleanChat(b.description),format,kind:"arena",status:"scheduled",rated:!!b.rated,pool,base_seconds:base,increment_seconds:inc,starts_at:new Date(startsAt).toISOString(),ends_at:new Date(startsAt+minutes*60000).toISOString(),rounds,created_by:p.id,club_id:clubId}).select().single();
  if(error)throw error;
  await admin.from("chess_tournament_entries").insert({tournament_id:data.id,player_id:p.id});
  return {tournament:data}
}
// Pairs the next round when every game of the current one is over (or starts round 1).
async function swissTick(t:any){
  if(t.format!=="swiss"||t.status==="finished"||t.status==="cancelled")return t;
  if(Date.now()<Date.parse(t.starts_at))return t;
  if(Number(t.current_round)>0){
    const {data:open}=await admin.from("chess_games").select("id").eq("tournament_id",t.id).eq("tournament_round",t.current_round).in("status",["active","waiting"]).limit(1);
    if(open?.length)return t;
  }
  if(Number(t.current_round)>=Number(t.rounds||5)){await admin.from("chess_tournaments").update({status:"finished",ends_at:nowIso()}).eq("id",t.id);return {...t,status:"finished"}}
  const next=Number(t.current_round)+1;
  const {data:claimed}=await admin.from("chess_tournaments").update({current_round:next,status:"active"}).eq("id",t.id).eq("current_round",t.current_round).select().maybeSingle();
  if(!claimed)return t; // someone else is pairing this round
  const {data:entries}=await admin.from("chess_tournament_entries").select("*").eq("tournament_id",t.id);
  const ids=(entries||[]).map((e:any)=>e.player_id),{data:players}=ids.length?await admin.from("chess_players").select("*").in("id",ids):{data:[]};
  const pmap=new Map((players||[]).map((x:any)=>[x.id,x]));
  const pool=(entries||[]).filter((e:any)=>pmap.get(e.player_id)&&!(pmap.get(e.player_id) as any).banned_at)
    .sort((a:any,c:any)=>Number(c.points)-Number(a.points)||ratingOf(pmap.get(c.player_id),t.pool)-ratingOf(pmap.get(a.player_id),t.pool));
  const {pairs,bye}=swissPairs(pool.map((e:any)=>({id:e.player_id,opponents:e.opponents||[],whites:Number(e.whites||0),games:Number(e.games||0),byes:Number(e.byes||0)})));
  if(bye){const e:any=pool.find((x:any)=>x.player_id===bye);await admin.from("chess_tournament_entries").update({points:Number(e.points)+2,byes:Number(e.byes||0)+1,games:Number(e.games)+1}).eq("tournament_id",t.id).eq("player_id",bye)}
  for(const [w,bk] of pairs){
    const made=await createGame(new Request("https://internal"),{seconds:t.base_seconds,increment:t.increment_seconds,rated:t.rated},{players:[pmap.get(w),pmap.get(bk)],source:"tournament",tournamentId:t.id});
    await admin.from("chess_games").update({tournament_round:next}).eq("id",made.game.id);
    for(const [me,opp,white] of [[w,bk,1],[bk,w,0]] as any){
      const e:any=pool.find((x:any)=>x.player_id===me);
      await admin.from("chess_tournament_entries").update({opponents:[...(e.opponents||[]),opp],whites:Number(e.whites||0)+white}).eq("tournament_id",t.id).eq("player_id",me);
      EdgeRuntime.waitUntil(Promise.all([broadcastTo("player:"+me,"tournament_game",{code:made.game.invite_code,round:next}),notifyPlayer(me,{title:`${t.name} · round ${next}`,body:"Your game is ready.",url:`/?game=${made.game.invite_code}`,tag:`swiss-${t.id}`})]).then(()=>{}));
    }
  }
  return claimed
}
async function tournamentVisibleTo(list:any[],p:any){
  const m=p?await clubOf(p.id):null;
  return list.filter((t:any)=>!t.club_id||t.club_id===m?.club_id);
}
// ---- Your data: export and delete ----
async function accountExport(req:Request,b:any){
  const p=await playerFor(req,b,true,{touch:false});
  const {device_hash,auth_user_id,...profile}=p;
  const [games,attempts,follows,followers,club,messages,reports,studies,league,subs]=await Promise.all([
    admin.from("chess_games").select("id,created_at,ended_at,white_name,black_name,result,pool,rated,variant,start_fen,move_history,white_rating_before,black_rating_before,white_rating_delta,black_rating_delta").or(`white_player_id.eq.${p.id},black_player_id.eq.${p.id}`).order("created_at",{ascending:false}).limit(2000),
    admin.from("chess_puzzle_attempts").select("puzzle_id,success,rating_before,rating_after,created_at").eq("player_id",p.id).limit(5000),
    admin.from("chess_follows").select("followee_id,created_at").eq("follower_id",p.id),
    admin.from("chess_follows").select("follower_id",{count:"exact",head:true}).eq("followee_id",p.id),
    admin.from("chess_club_members").select("club_id,role,joined_at").eq("player_id",p.id),
    admin.from("chess_club_messages").select("body,created_at").eq("player_id",p.id).limit(5000),
    admin.from("chess_reports").select("reason,note,created_at").eq("reporter_id",p.id),
    admin.from("chess_studies").select("code,title,start_fen,moves,created_at,updated_at").eq("owner_id",p.id),
    admin.from("chess_league_entries").select("*").eq("player_id",p.id),
    admin.from("chess_push_subscriptions").select("created_at").eq("player_id",p.id)
  ]);
  const followIds=(follows.data||[]).map((f:any)=>f.followee_id),{data:fnames}=followIds.length?await admin.from("chess_players").select("id,username").in("id",followIds):{data:[]};
  return {exported_at:nowIso(),profile,games:(games.data||[]).map((g:any)=>({...g,moves:Array.isArray(g.move_history)?g.move_history.map((m:any)=>m.san):[],move_history:undefined})),puzzle_attempts:attempts.data||[],following:(fnames||[]).map((x:any)=>x.username),followers:followers.count||0,club:club.data||[],club_messages:messages.data||[],reports_filed:reports.data||[],studies:studies.data||[],league:league.data||[],push_devices:(subs.data||[]).length}
}
async function accountDelete(req:Request,b:any){
  const p=await playerFor(req,b,true,{touch:false});
  if(String(b.confirm||"").trim().toLowerCase()!==String(p.username||"").toLowerCase())throw fail("Type your username exactly to confirm.");
  const m=await clubOf(p.id);
  if(m){ // hand the club over (or close it) the same way leaving does
    await admin.from("chess_club_members").delete().eq("club_id",m.club_id).eq("player_id",p.id);
    const left=await recountClub(m.club_id);
    if(m.role==="owner"){if(!left)await admin.from("chess_clubs").delete().eq("id",m.club_id);else{const {data:next}=await admin.from("chess_club_members").select("player_id").eq("club_id",m.club_id).order("joined_at").limit(1).maybeSingle();if(next){await admin.from("chess_club_members").update({role:"owner"}).eq("club_id",m.club_id).eq("player_id",next.player_id);await admin.from("chess_clubs").update({owner_id:next.player_id}).eq("id",m.club_id)}}}
  }
  // Results stay in opponents' histories, without your name.
  await Promise.all([
    admin.from("chess_follows").delete().or(`follower_id.eq.${p.id},followee_id.eq.${p.id}`),
    admin.from("chess_push_subscriptions").delete().eq("player_id",p.id),
    admin.from("chess_club_messages").delete().eq("player_id",p.id),
    admin.from("chess_studies").delete().eq("owner_id",p.id),
    admin.from("chess_conditional_moves").delete().eq("player_id",p.id),
    admin.from("chess_challenges").delete().or(`from_player_id.eq.${p.id},to_player_id.eq.${p.id}`),
    admin.from("chess_matchmaking_queue").update({state:"cancelled"}).eq("player_id",p.id).eq("state","searching"),
    admin.from("chess_games").update({white_name:"Deleted player"}).eq("white_player_id",p.id),
    admin.from("chess_games").update({black_name:"Deleted player"}).eq("black_player_id",p.id),
  ]);
  const authId=p.auth_user_id;
  await admin.from("chess_players").update({username:null,display_name:"Deleted player",auth_user_id:null,device_hash:await hash("deleted:"+crypto.randomUUID()),avatar_data:null,country_code:null,achievements:[],role:"player"}).eq("id",p.id);
  if(authId){const {error}=await admin.auth.admin.deleteUser(authId);if(error)console.error("auth delete failed",error)}
  return {deleted:true}
}

// ---- Notifications inbox ----
const notifyKind=(tag:string)=>tag.startsWith("game-")?"game":tag.startsWith("challenge-")?"challenge":tag.startsWith("swiss-")||tag.startsWith("tournament-")?"tournament":tag.startsWith("club-")?"club":tag.startsWith("achievement-")?"achievement":tag.startsWith("league-")?"league":"info";
async function inbox(playerId:string,payload:any){
  if(!playerId)return;
  const tag=String(payload.tag||"info-"+crypto.randomUUID()).slice(0,80),url=String(payload.url||"/");
  await admin.from("chess_notifications").upsert({player_id:playerId,tag,kind:notifyKind(tag),title:String(payload.title||"VCH").slice(0,120),body:String(payload.body||"").slice(0,300),url:url.startsWith("/")&&!url.startsWith("//")?url.slice(0,200):"/",created_at:nowIso(),read_at:null},{onConflict:"player_id,tag"});
  await broadcastTo("player:"+playerId,"notify",{tag});
}
async function notificationsList(req:Request,b:any){
  const p=await playerFor(req,b,false,{touch:false});
  if(Math.random()<.05)EdgeRuntime.waitUntil(admin.from("chess_notifications").delete().eq("player_id",p.id).lt("created_at",new Date(Date.now()-60*86400000).toISOString()).then(()=>{}));
  const [{data,error},{count}]=await Promise.all([
    admin.from("chess_notifications").select("id,kind,title,body,url,created_at,read_at").eq("player_id",p.id).order("created_at",{ascending:false}).limit(60),
    admin.from("chess_notifications").select("id",{count:"exact",head:true}).eq("player_id",p.id).is("read_at",null)
  ]);
  if(error)throw error;return {notifications:data||[],unread:Number(count||0)}
}
async function notificationsRead(req:Request,b:any){
  const p=await playerFor(req,b,false,{touch:false});
  let q=admin.from("chess_notifications").update({read_at:nowIso()}).eq("player_id",p.id).is("read_at",null);
  if(Array.isArray(b.ids)&&b.ids.length)q=q.in("id",b.ids.map(String).filter((x:string)=>/^[0-9a-f-]{36}$/i.test(x)).slice(0,100));
  await q;return {ok:true}
}
// ---- Opening explorer from VCH games ----
async function recordExplorer(g:any){
  if(!g||g.result==="*"||g.bot_player_id||g.variant==="freestyle"||g.variant==="crazyhouse"||Number(g.move_count||0)<6)return;
  const {data:claimed}=await admin.from("chess_games").update({explorer_at:nowIso()}).eq("id",g.id).is("explorer_at",null).select("id").maybeSingle();
  if(!claimed)return;
  const w=g.result==="1-0"?1:0,bl=g.result==="0-1"?1:0,d=g.result==="1/2-1/2"?1:0;
  const c=new Chess(),seen=new Set<string>(),rows:any[]=[];
  for(const m of (Array.isArray(g.move_history)?g.move_history:[]).slice(0,EXPLORER_PLIES)){
    const position=explorerKey(c.fen());let made:any=null;
    try{made=c.move({from:m.from,to:m.to,promotion:m.promotion||undefined})}catch{}
    if(!made)break;
    const key=position+"|"+made.san;if(seen.has(key))continue;seen.add(key);
    rows.push({position,san:made.san,w,d,b:bl});
  }
  if(rows.length){const {error}=await admin.rpc("chess_explorer_add",{p_rows:rows});if(error)console.error("explorer",error)}
}
async function openingExplorer(req:Request,b:any){
  let fen=String(b.fen||"");try{fen=new Chess(fen||undefined).fen()}catch{throw fail("That position isn't valid.")}
  const key=explorerKey(fen);
  // Fair play: no explorer for a position in your own live game.
  try{
    const p=await playerFor(req,b,false,{touch:false});
    const {data:live}=await admin.from("chess_games").select("fen").eq("status","active").is("daily_days",null).or(`white_player_id.eq.${p.id},black_player_id.eq.${p.id}`).limit(5);
    if((live||[]).some((g:any)=>explorerKey(g.fen)===key))throw fail("The explorer is off for positions in your live games.",409);
  }catch(e:any){if(e?.status===409)throw e}
  if(b.mine){
    const p=await playerFor(req,b,false,{touch:false});
    const {data:games}=await admin.from("chess_games").select("move_history,result,white_player_id,start_fen").or(`white_player_id.eq.${p.id},black_player_id.eq.${p.id}`).in("result",["1-0","0-1","1/2-1/2"]).eq("variant","standard").gte("move_count",2).order("ended_at",{ascending:false}).limit(300);
    const agg=new Map<string,any>();
    for(const g of games||[]){
      const c=new Chess();
      for(const m of (Array.isArray(g.move_history)?g.move_history:[]).slice(0,EXPLORER_PLIES)){
        const here=explorerKey(c.fen())===key;let made:any=null;try{made=c.move({from:m.from,to:m.to,promotion:m.promotion||undefined})}catch{}if(!made)break;
        if(here){const r=agg.get(made.san)||{san:made.san,games:0,white:0,draws:0,black:0};r.games++;if(g.result==="1-0")r.white++;else if(g.result==="0-1")r.black++;else r.draws++;agg.set(made.san,r);break}
      }
    }
    const moves=[...agg.values()].sort((a,c)=>c.games-a.games).slice(0,20);
    return {position:key,moves,total:moves.reduce((s:number,x:any)=>s+x.games,0),mine:true}
  }
  const {data,error}=await admin.from("chess_opening_moves").select("san,games,white,draws,black").eq("position",key).order("games",{ascending:false}).limit(20);
  if(error)throw error;
  return {position:key,moves:data||[],total:(data||[]).reduce((s:number,x:any)=>s+Number(x.games),0)}
}
async function explorerBackfill(req:Request,b:any){
  await adminFor(req,b);
  const {data}=await admin.from("chess_games").select("*").is("explorer_at",null).not("result","eq","*").is("bot_player_id",null).gte("move_count",6).limit(150);
  for(const g of data||[])await recordExplorer(g);
  return {processed:(data||[]).length}
}

// ======== Round 9: repertoire, insights, Puzzle Battle, simuls, vacation ========
const code6=()=>crypto.randomUUID().replace(/-/g,"").slice(0,6).toUpperCase();
// ---- Repertoire: your opening lines as White and Black ----
async function repertoireGet(req:Request,b:any){
  const p=await playerFor(req,b,true,{touch:false});
  const {data,error}=await admin.from("chess_repertoires").select("color,lines,updated_at").eq("player_id",p.id);if(error)throw error;
  const by=(c:string)=>(data||[]).find((r:any)=>r.color===c);
  return {w:by("w")?.lines||[],b:by("b")?.lines||[],updated_at:(data||[]).map((r:any)=>r.updated_at).sort().at(-1)||null}
}
async function repertoireSave(req:Request,b:any){
  const p=await playerFor(req,b,true,{touch:false});assertAllowed(p);
  const color=b.color==="b"?"b":"w";
  // Every line must be legal from the start position.
  const lines=cleanRepertoire(b.lines).filter((sans:string[])=>{const c=new Chess();try{for(const s of sans)if(!c.move(s))return false;return true}catch{return false}});
  const {error}=await admin.from("chess_repertoires").upsert({player_id:p.id,color,lines,updated_at:nowIso()},{onConflict:"player_id,color"});if(error)throw error;
  return {color,lines}
}
// ---- Insights: one compact row per finished game (the browser does the sums) ----
async function insights(req:Request,b:any){
  const p=await playerFor(req,b,true,{touch:false});
  const {data,error}=await admin.from("chess_games").select("ended_at,pool,rated,result,end_reason,move_count,white_player_id,black_player_id,white_rating_before,black_rating_before,white_rating_delta,black_rating_delta,time_control_seconds,increment_seconds,daily_days,move_history,bot_player_id,variant")
    .or(`white_player_id.eq.${p.id},black_player_id.eq.${p.id}`).in("result",["1-0","0-1","1/2-1/2"]).order("ended_at",{ascending:false}).limit(500);
  if(error)throw error;
  const rows=(data||[]).map((g:any)=>{
    const w=g.white_player_id===p.id,res=g.result==="1/2-1/2"?.5:(g.result==="1-0")===w?1:0;
    const before=w?g.white_rating_before:g.black_rating_before,delta=w?g.white_rating_delta:g.black_rating_delta;
    return {at:g.ended_at,pool:g.pool,rated:!!g.rated,color:w?"w":"b",score:res,reason:g.end_reason||null,plies:Number(g.move_count||0),
      rating:before!=null&&delta!=null?Number(before)+Number(delta):null,opp:w?g.black_rating_before:g.white_rating_before,bot:!!g.bot_player_id,variant:g.variant||"standard",
      tc:g.daily_days?"daily":`${Math.round(Number(g.time_control_seconds||0)/60)}+${Number(g.increment_seconds||0)}`,
      sans:(Array.isArray(g.move_history)?g.move_history:[]).slice(0,12).map((m:any)=>m.san||"").filter(Boolean)}
  });
  return {games:rows,ratings:p.ratings||{},puzzle_rating:p.puzzle_rating??null}
}
// ---- Puzzle Battle: same puzzles, three minutes, three misses and you're out ----
async function battlePuzzles(){
  const {data}=await admin.from("chess_puzzles").select("id,fen,solution,rating").order("fetched_at",{ascending:false}).limit(400);
  const set=battleSet(data||[]);if(set.length<10)throw fail("Not enough puzzles yet. Solve a few first, then try again.",503);
  return set.map((x:any)=>({id:x.id,fen:x.fen,solution:x.solution,rating:x.rating}))
}
const battleView=(t:any,p:any,names:Map<string,string>)=>{const seat=t.host_id===p.id?"host":t.guest_id===p.id?"guest":null;
  return {id:t.id,code:t.code,status:t.status,seat,starts_at:t.starts_at,ends_at:t.ends_at,puzzles:seat&&t.status!=="waiting"?t.puzzles:[],
    host:{name:names.get(t.host_id)||"Host",score:t.host_score,misses:t.host_misses},guest:t.guest_id?{name:names.get(t.guest_id)||"Guest",score:t.guest_score,misses:t.guest_misses}:null,
    winner:t.status==="finished"?battleWinner(t):null,maxMisses:BATTLE_MAX_MISSES}};
async function battleNames(t:any){const ids=[t.host_id,t.guest_id].filter(Boolean);const {data}=await admin.from("chess_players").select("id,username,display_name").in("id",ids);return new Map((data||[]).map((x:any)=>[x.id,x.username||x.display_name]))}
async function battleSettle(t:any){
  if(t.status==="live"&&battleOver(t)){const {data}=await admin.from("chess_puzzle_battles").update({status:"finished"}).eq("id",t.id).eq("status","live").select().maybeSingle();if(data){t=data;EdgeRuntime.waitUntil(broadcastTo(`battle:${t.id}`,"battle",{status:"finished"}));if(t.ladder)EdgeRuntime.waitUntil(ladderRecord(t).catch(e=>console.error("ladder",e)))}}
  return t
}
async function battleCreate(req:Request,b:any){
  const p=await playerFor(req,b,false,{touch:false});assertAllowed(p);
  let code=code6();while(await one("chess_puzzle_battles","code",code))code=code6();
  const {data,error}=await admin.from("chess_puzzle_battles").insert({code,host_id:p.id,puzzles:await battlePuzzles()}).select().single();if(error)throw error;
  if(b.to){const to=await playerById(String(b.to));if(to&&to.id!==p.id)EdgeRuntime.waitUntil(notifyPlayer(to.id,{title:"Puzzle Battle",body:`${p.username||p.display_name||"A player"} wants to race you through puzzles.`,url:`/?battle=${code}`,tag:"battle-"+code},{push:true}).catch(()=>{}))}
  return {battle:battleView(data,p,new Map([[p.id,p.username||p.display_name]]))}
}
async function battleJoin(req:Request,b:any){
  const p=await playerFor(req,b,false,{touch:false});assertAllowed(p);
  let t=await one("chess_puzzle_battles","code",String(b.code||"").toUpperCase().slice(0,6));if(!t)throw fail("Battle not found.",404);
  if(t.host_id!==p.id&&!t.guest_id&&t.status==="waiting"){
    const starts=Date.now()+BATTLE_COUNTDOWN_MS;
    const {data}=await admin.from("chess_puzzle_battles").update({guest_id:p.id,status:"live",starts_at:new Date(starts).toISOString(),ends_at:new Date(starts+BATTLE_MS).toISOString()}).eq("id",t.id).is("guest_id",null).select().maybeSingle();
    if(!data)throw fail("Someone else joined first.",409);t=data;
    EdgeRuntime.waitUntil(broadcastTo(`battle:${t.id}`,"battle",{status:"live"}));
  }
  t=await battleSettle(t);
  return {battle:battleView(t,p,await battleNames(t))}
}
async function battleState(req:Request,b:any){
  const p=await playerFor(req,b,false,{touch:false});
  let t=await one("chess_puzzle_battles","id",String(b.battleId||""));if(!t)throw fail("Battle not found.",404);
  t=await battleSettle(t);return {battle:battleView(t,p,await battleNames(t))}
}
// The browser checks each puzzle; the server only keeps the count (unrated, for fun).
async function battleProgress(req:Request,b:any){
  const p=await playerFor(req,b,false,{touch:false});
  let t=await one("chess_puzzle_battles","id",String(b.battleId||""));if(!t)throw fail("Battle not found.",404);
  const seat=t.host_id===p.id?"host":t.guest_id===p.id?"guest":null;if(!seat)throw fail("Not your battle.",403);
  if(t.status!=="live"||Date.now()<Date.parse(t.starts_at)-1000)return {battle:battleView(t,p,await battleNames(t))};
  const score=Math.max(Number(t[seat+"_score"]),Math.min(BATTLE_PUZZLES,Number(b.score||0))),misses=Math.max(Number(t[seat+"_misses"]),Math.min(BATTLE_MAX_MISSES,Number(b.misses||0)));
  if(Date.now()<=Date.parse(t.ends_at)+2000){const {data}=await admin.from("chess_puzzle_battles").update({[seat+"_score"]:score,[seat+"_misses"]:misses}).eq("id",t.id).select().single();t=data}
  t=await battleSettle(t);
  EdgeRuntime.waitUntil(broadcastTo(`battle:${t.id}`,"battle",{seat,score:t[seat+"_score"],misses:t[seat+"_misses"],status:t.status}));
  return {battle:battleView(t,p,await battleNames(t))}
}
async function battleCancel(req:Request,b:any){
  const p=await playerFor(req,b,false,{touch:false});
  await admin.from("chess_puzzle_battles").update({status:"cancelled"}).eq("id",String(b.battleId||"")).eq("host_id",p.id).eq("status","waiting");
  return {ok:true}
}
// ---- Simuls: the host plays every entrant on their own board ----
const simulCard=(s:any,host:any,entries:any[],p:any)=>({id:s.id,code:s.code,name:s.name,status:s.status,base_seconds:s.base_seconds,increment_seconds:s.increment_seconds,max_players:s.max_players,
  host:host?(host.username||host.display_name):"Host",hostRating:host?ratingOf(host,poolFor(s.base_seconds,s.increment_seconds)):null,players:entries.length,joined:!!p&&entries.some((e:any)=>e.player_id===p.id),mine:!!p&&s.host_id===p.id,created_at:s.created_at});
async function simulList(req:Request,b:any){
  let p:any=null;try{p=await playerFor(req,b,false,{touch:false})}catch{}
  const {data,error}=await admin.from("chess_simuls").select("*").in("status",["open","live"]).gte("created_at",new Date(Date.now()-2*86400000).toISOString()).order("created_at",{ascending:false}).limit(30);if(error)throw error;
  const m=p?await clubOf(p.id):null,visible=(data||[]).filter((s:any)=>!s.club_id||s.club_id===m?.club_id);
  const ids=visible.map((s:any)=>s.id),hosts=[...new Set(visible.map((s:any)=>s.host_id))];
  const [{data:entries},{data:hp}]=await Promise.all([ids.length?admin.from("chess_simul_entries").select("simul_id,player_id").in("simul_id",ids):Promise.resolve({data:[]}),hosts.length?admin.from("chess_players").select("id,username,display_name,ratings").in("id",hosts):Promise.resolve({data:[]})]);
  const hm=new Map((hp||[]).map((x:any)=>[x.id,x]));
  return {simuls:visible.map((s:any)=>simulCard(s,hm.get(s.host_id),(entries||[]).filter((e:any)=>e.simul_id===s.id),p))}
}
async function simulCreate(req:Request,b:any){
  const p=await playerFor(req,b,true,{touch:false});assertAllowed(p);
  const {count}=await admin.from("chess_simuls").select("id",{count:"exact",head:true}).eq("host_id",p.id).in("status",["open","live"]);if(Number(count)>0)throw fail("Finish your current simul first.",409);
  const name=String(b.name||"").replace(/[\u0000-\u001F\u007F]/g," ").trim().slice(0,60)||`${p.username||"Host"}'s simul`;
  const club=b.club?await clubOf(p.id):null;
  let code=code6();while(await one("chess_simuls","code",code))code=code6();
  const {data,error}=await admin.from("chess_simuls").insert({code,host_id:p.id,name,base_seconds:Math.max(300,Math.min(7200,Number(b.seconds||1800))),increment_seconds:Math.max(0,Math.min(60,Number(b.increment??30))),max_players:Math.max(2,Math.min(SIMUL_MAX_PLAYERS,Number(b.maxPlayers||10))),club_id:club?.club_id||null}).select().single();if(error)throw error;
  return {simul:simulCard(data,p,[],p)}
}
async function simulJoin(req:Request,b:any){
  const p=await playerFor(req,b,true,{touch:false});assertAllowed(p);
  const s=await one("chess_simuls","id",String(b.simulId||""));if(!s||s.status!=="open")throw fail("This simul is not taking players.",409);
  if(s.host_id===p.id)throw fail("You are hosting this simul.",409);
  if(s.club_id){const m=await clubOf(p.id);if(m?.club_id!==s.club_id)throw fail("This simul is for club members.",403)}
  const {count}=await admin.from("chess_simul_entries").select("player_id",{count:"exact",head:true}).eq("simul_id",s.id);if(Number(count)>=s.max_players)throw fail("This simul is full.",409);
  const {error}=await admin.from("chess_simul_entries").upsert({simul_id:s.id,player_id:p.id},{onConflict:"simul_id,player_id",ignoreDuplicates:true});if(error)throw error;
  EdgeRuntime.waitUntil(broadcastTo(`player:${s.host_id}`,"notify",{kind:"simul",title:`${p.username||"A player"} joined your simul`}));
  return {ok:true}
}
async function simulLeave(req:Request,b:any){
  const p=await playerFor(req,b,true,{touch:false});
  await admin.from("chess_simul_entries").delete().eq("simul_id",String(b.simulId||"")).eq("player_id",p.id).is("game_id",null);
  return {ok:true}
}
async function simulStart(req:Request,b:any){
  const p=await playerFor(req,b,true,{touch:false});
  const s=await one("chess_simuls","id",String(b.simulId||""));if(!s||s.host_id!==p.id)throw fail("Only the host can start the simul.",403);
  if(b.cancel){await admin.from("chess_simuls").update({status:"cancelled"}).eq("id",s.id).eq("status","open");return {ok:true}}
  const {data:entries}=await admin.from("chess_simul_entries").select("player_id").eq("simul_id",s.id);
  if(!(entries||[]).length)throw fail("Wait for at least one player.",409);
  const {data:claimed}=await admin.from("chess_simuls").update({status:"live",started_at:nowIso()}).eq("id",s.id).eq("status","open").select().maybeSingle();if(!claimed)throw fail("The simul has already started.",409);
  for(const e of entries||[]){
    const opp=await playerById(e.player_id);if(!opp)continue;
    const made=await createGame(req,{seconds:s.base_seconds,increment:s.increment_seconds,rated:false},{players:[p,opp],source:"private",simulId:s.id});
    await admin.from("chess_simul_entries").update({game_id:made.game.id}).eq("simul_id",s.id).eq("player_id",opp.id);
    EdgeRuntime.waitUntil(notifyPlayer(opp.id,{title:`${s.name} has started`,body:`Your board against ${p.username||"the host"} is ready.`,url:`/?game=${made.game.invite_code}`,tag:"simul-"+s.id},{push:true}).catch(()=>{}));
  }
  return simulState(req,{...b,simulId:s.id})
}
async function simulState(req:Request,b:any){
  let p:any=null;try{p=await playerFor(req,b,false,{touch:false})}catch{}
  const s=await one("chess_simuls","id",String(b.simulId||""));if(!s)throw fail("Simul not found.",404);
  if(s.club_id){const m=p?await clubOf(p.id):null;if(m?.club_id!==s.club_id&&s.host_id!==p?.id)throw fail("Simul not found.",404)}
  const [{data:entries},host]=await Promise.all([admin.from("chess_simul_entries").select("player_id,game_id").eq("simul_id",s.id),playerById(s.host_id)]);
  const gids=(entries||[]).map((e:any)=>e.game_id).filter(Boolean);
  const {data:games}=gids.length?await admin.from("chess_games").select("id,invite_code,white_player_id,black_player_id,white_name,black_name,status,result,fen,move_count,last_move_at,white_time_ms,black_time_ms").in("id",gids):{data:[]};
  const isHost=!!p&&p.id===s.host_id;
  const boards=(games||[]).map((g:any)=>{const turn=String(g.fen).split(" ")[1],hostSeat=g.white_player_id===s.host_id?"w":"b",mine=isHost||(!!p&&[g.white_player_id,g.black_player_id].includes(p.id));
    return {id:g.id,code:mine?g.invite_code:null,opponent:hostSeat==="w"?g.black_name:g.white_name,status:g.status,result:g.result,fen:g.fen,moves:g.move_count,hostToMove:g.status==="active"&&turn===hostSeat,mine:!isHost&&mine}});
  // Finished when every board is.
  if(s.status==="live"&&boards.length&&boards.every((x:any)=>x.status!=="active"))await admin.from("chess_simuls").update({status:"finished"}).eq("id",s.id).eq("status","live");
  const names=new Map<string,string>();if(s.status==="open"&&(entries||[]).length){const {data:pl}=await admin.from("chess_players").select("id,username,display_name").in("id",(entries||[]).map((e:any)=>e.player_id));for(const x of pl||[])names.set(x.id,x.username||x.display_name)}
  const score=boards.reduce((acc:any,x:any)=>{if(x.status==="active")return acc;const hostWhite=(games||[]).find((g:any)=>g.id===x.id)?.white_player_id===s.host_id,hostWon=(x.result==="1-0")===hostWhite;if(x.result==="1/2-1/2")acc.draws++;else if(hostWon)acc.host++;else acc.players++;return acc},{host:0,players:0,draws:0});
  return {simul:simulCard(s,host,entries||[],p),boards:boards.sort((a:any,c:any)=>Number(c.hostToMove)-Number(a.hostToMove)),entrants:s.status==="open"?(entries||[]).map((e:any)=>names.get(e.player_id)||"Player"):[],score,isHost}
}
// ---- Vacation for daily games ----
async function vacation(req:Request,b:any){
  const p=await playerFor(req,b,true,{touch:false}),now=Date.now(),year=new Date(now).getUTCFullYear();
  const base={vacation_year:year,vacation_used:Number(p.vacation_year)===year?Number(p.vacation_used||0):0};
  if(b.end){
    if(!onVacation(p,now))return {vacation:vacationInfo({...p,...base},now)};
    const unused=Math.floor((Date.parse(p.vacation_until)-now)/86400000);
    const patch={...base,vacation_used:Math.max(0,base.vacation_used-unused),vacation_until:nowIso()};
    await admin.from("chess_players").update(patch).eq("id",p.id);return {vacation:vacationInfo({...p,...patch},now)}
  }
  if(b.days==null)return {vacation:vacationInfo({...p,...base},now)};
  if(onVacation(p,now))throw fail("You are already on vacation.",409);
  const days=Math.round(Number(b.days)),left=VACATION_DAYS-base.vacation_used;
  if(!(days>=1&&days<=left))throw fail(left?`Pick 1 to ${left} days.`:"No vacation days left this year.",409);
  const patch={...base,vacation_used:base.vacation_used+days,vacation_from:nowIso(),vacation_until:new Date(now+days*86400000).toISOString()};
  await admin.from("chess_players").update(patch).eq("id",p.id);
  return {vacation:vacationInfo({...p,...patch},now)}
}
const vacationInfo=(p:any,now=Date.now())=>({on:onVacation(p,now),until:onVacation(p,now)?p.vacation_until:null,left:vacationLeft(p,now),perYear:VACATION_DAYS});

// ======== Round 10: prep, Puzzle Battle ladder, live commentary ========
// ---- Prep: the openings a player usually plays (their finished rated games) ----
async function playerOpenings(req:Request,b:any){
  const name=String(b.username||"").trim().slice(0,32);if(!name)throw fail("Pick a player.");
  const {data:pl}=await admin.from("chess_players").select("id,username,display_name,ratings").ilike("username",name.replace(/[%_]/g,"")).limit(1);
  const target=(pl||[])[0];if(!target)throw fail("Player not found.",404);
  const {data,error}=await admin.from("chess_games").select("white_player_id,black_player_id,result,move_history").or(`white_player_id.eq.${target.id},black_player_id.eq.${target.id}`).eq("rated",true).eq("variant","standard").in("result",["1-0","0-1","1/2-1/2"]).order("ended_at",{ascending:false}).limit(300);
  if(error)throw error;
  const lines={w:[] as any[],b:[] as any[]};
  for(const g of data||[]){const color=g.white_player_id===target.id?"w":"b";const sans=(Array.isArray(g.move_history)?g.move_history:[]).slice(0,PREP_PLIES).map((m:any)=>m.san).filter(Boolean);if(sans.length>=2)lines[color].push({sans,score:scoreFor(g.result,color)})}
  return {player:{name:target.username||target.display_name,rating:ratingOf(target,"blitz")},lines}
}
// ---- Puzzle Battle ladder: matched battles, a weekly table, badges for the top three ----
async function ladderWeekDue(){
  const prev=previousWeek();
  const {data:done}=await admin.from("chess_battle_weeks").select("week").eq("week",prev).maybeSingle();if(done)return;
  const {error:claim}=await admin.from("chess_battle_weeks").insert({week:prev});if(claim)return; // someone else is doing it
  const {data:top}=await admin.from("chess_battle_ladder").select("player_id,points").eq("week",prev).gt("points",0).order("points",{ascending:false}).order("wins",{ascending:false}).limit(3);
  const at=nowIso();
  for(const [i,e] of (top||[]).entries()){const pl=await playerById(e.player_id);if(!pl)continue;const id=`battle-${prev}-${i+1}`,have=Array.isArray(pl.achievements)?pl.achievements:[];
    await admin.from("chess_players").update({achievements:[...have.filter((a:any)=>a?.id!==id),{id,at}]}).eq("id",pl.id);
    EdgeRuntime.waitUntil(inbox(pl.id,{title:`Puzzle Battle ladder: #${i+1}`,body:`You finished week ${prev} on the podium.`,url:"/?ladder=1",tag:`ladder-${prev}`}).catch(()=>{}))}
}
async function ladderRecord(t:any){
  if(!t.ladder||!t.guest_id)return;const week=isoWeek(new Date(t.starts_at||Date.now())),w=battleWinner(t);
  for(const seat of ["host","guest"]){
    const id=t[seat+"_id"],pts=w==="draw"?LADDER_POINTS.draw:w===seat?LADDER_POINTS.win:LADDER_POINTS.loss;
    const {data:row}=await admin.from("chess_battle_ladder").select("*").eq("week",week).eq("player_id",id).maybeSingle();
    await admin.from("chess_battle_ladder").upsert({week,player_id:id,points:Number(row?.points||0)+pts,wins:Number(row?.wins||0)+(w===seat?1:0),battles:Number(row?.battles||0)+1,solved:Number(row?.solved||0)+Number(t[seat+"_score"]||0),updated_at:nowIso()},{onConflict:"week,player_id"});
  }
}
async function battleQueueJoin(req:Request,b:any){
  const p=await playerFor(req,b,true,{touch:false});assertAllowed(p);
  const since=new Date(Date.now()-BATTLE_QUEUE_MS).toISOString();
  const {data:waiting}=await admin.from("chess_battle_queue").select("player_id").neq("player_id",p.id).gte("joined_at",since).order("joined_at").limit(1);
  const other=(waiting||[])[0];
  if(other){
    const {data:taken}=await admin.from("chess_battle_queue").delete().eq("player_id",other.player_id).select();
    if(taken?.length){
      await admin.from("chess_battle_queue").delete().eq("player_id",p.id);
      let code=code6();while(await one("chess_puzzle_battles","code",code))code=code6();
      const starts=Date.now()+BATTLE_COUNTDOWN_MS;
      const {data,error}=await admin.from("chess_puzzle_battles").insert({code,host_id:other.player_id,guest_id:p.id,ladder:true,puzzles:await battlePuzzles(),status:"live",starts_at:new Date(starts).toISOString(),ends_at:new Date(starts+BATTLE_MS).toISOString()}).select().single();if(error)throw error;
      EdgeRuntime.waitUntil(broadcastTo(`player:${other.player_id}`,"battle",{code}));
      return {battle:battleView(data,p,await battleNames(data))}
    }
  }
  await admin.from("chess_battle_queue").upsert({player_id:p.id,joined_at:nowIso()},{onConflict:"player_id"});
  return {waiting:true}
}
async function battleQueueStatus(req:Request,b:any){
  const p=await playerFor(req,b,true,{touch:false});
  const {data}=await admin.from("chess_puzzle_battles").select("*").eq("host_id",p.id).eq("ladder",true).eq("status","live").gte("created_at",new Date(Date.now()-30000).toISOString()).order("created_at",{ascending:false}).limit(1);
  const t=(data||[])[0];if(t)return {battle:battleView(t,p,await battleNames(t))};
  if(b.leave)await admin.from("chess_battle_queue").delete().eq("player_id",p.id);
  else await admin.from("chess_battle_queue").upsert({player_id:p.id,joined_at:nowIso()},{onConflict:"player_id"});
  return {waiting:!b.leave}
}
async function battleLadder(req:Request,b:any){
  let p:any=null;try{p=await playerFor(req,b,false,{touch:false})}catch{}
  await ladderWeekDue().catch(e=>console.error("ladder week",e));
  const week=isoWeek(),prev=previousWeek();
  const [{data:rows},{data:last}]=await Promise.all([
    admin.from("chess_battle_ladder").select("player_id,points,wins,battles,solved").eq("week",week).order("points",{ascending:false}).order("wins",{ascending:false}).limit(50),
    admin.from("chess_battle_ladder").select("player_id,points").eq("week",prev).gt("points",0).order("points",{ascending:false}).order("wins",{ascending:false}).limit(3)]);
  const ids=[...new Set([...(rows||[]),...(last||[])].map((r:any)=>r.player_id))];
  const {data:pl}=ids.length?await admin.from("chess_players").select("id,username,display_name").in("id",ids):{data:[]};
  const names=new Map((pl||[]).map((x:any)=>[x.id,x.username||x.display_name]));
  const {count}=await admin.from("chess_battle_queue").select("player_id",{count:"exact",head:true}).gte("joined_at",new Date(Date.now()-BATTLE_QUEUE_MS).toISOString());
  return {week,waiting:Number(count||0),standings:(rows||[]).map((r:any,i:number)=>({rank:i+1,name:names.get(r.player_id)||"Player",points:r.points,wins:r.wins,battles:r.battles,solved:r.solved,me:!!p&&r.player_id===p.id})),lastWeek:{week:prev,podium:(last||[]).map((r:any)=>({name:names.get(r.player_id)||"Player",points:r.points}))}}
}
// ---- Live commentary in tournament lobbies ----
async function canComment(p:any,t:any){
  if(!p)return false;if(p.role==="admin"||t.created_by===p.id)return true;
  if(t.club_id){const club=await one("chess_clubs","id",t.club_id);if(club?.owner_id===p.id)return true}
  return false
}
async function commentaryPost(req:Request,b:any){
  const p=await playerFor(req,b,true,{touch:false});assertAllowed(p);
  const t=await one("chess_tournaments","id",String(b.tournamentId||""));if(!t)throw fail("Tournament not found.",404);
  if(!(await canComment(p,t)))throw fail("Only the organiser can commentate.",403);
  const body=cleanChat(b.body);if(!body)throw fail("Write something first.");
  let game:any=null;if(b.gameId){game=await gameById(String(b.gameId));if(!game||game.tournament_id!==t.id)game=null}
  const {data,error}=await admin.from("chess_commentary").insert({tournament_id:t.id,game_id:game?.id||null,author_id:p.id,ply:game?Number(game.move_count||0):null,body}).select().single();if(error)throw error;
  const item={id:data.id,body:data.body,ply:data.ply,game:game?`${game.white_name} vs ${game.black_name}`:null,gameId:game?.id||null,author:p.username||p.display_name,at:data.created_at};
  EdgeRuntime.waitUntil(broadcastTo(`lobby:${t.id}`,"comment",item));
  return {comment:item}
}
async function commentaryFor(t:any){
  const {data}=await admin.from("chess_commentary").select("id,body,ply,game_id,author_id,created_at").eq("tournament_id",t.id).order("created_at",{ascending:false}).limit(40);
  const ids=[...new Set((data||[]).map((c:any)=>c.author_id))],gids=[...new Set((data||[]).map((c:any)=>c.game_id).filter(Boolean))];
  const [{data:au},{data:gs}]=await Promise.all([ids.length?admin.from("chess_players").select("id,username,display_name").in("id",ids):Promise.resolve({data:[]}),gids.length?admin.from("chess_games").select("id,white_name,black_name").in("id",gids):Promise.resolve({data:[]})]);
  const an=new Map((au||[]).map((x:any)=>[x.id,x.username||x.display_name])),gn=new Map((gs||[]).map((x:any)=>[x.id,`${x.white_name} vs ${x.black_name}`]));
  return (data||[]).map((c:any)=>({id:c.id,body:c.body,ply:c.ply,game:c.game_id?gn.get(c.game_id)||null:null,gameId:c.game_id,author:an.get(c.author_id)||"Organiser",at:c.created_at}))
}

// ======== Round 11: Vanta Moment of the Week ========
// The week's most striking finish from finished rated standard games: an admin's pick for
// this ISO week, otherwise the best checkmate of the last 7 days (mating while down material
// first, then quick mates). Banned players' games never show. Cached briefly per instance.
let momentCache:{at:number,week:string,moment:any}|null=null;
const MOMENT_FIELDS="id,fen,result,move_count,white_name,black_name,white_player_id,black_player_id,white_rating_before,black_rating_before,pool,move_history,ended_at,rated,variant,status";
function momentCard(g:any,extra:any){
  const hist=Array.isArray(g.move_history)?g.move_history:[],last=hist[hist.length-1]||null;
  return {gameId:g.id,white:g.white_name,black:g.black_name,whiteRating:g.white_rating_before??null,blackRating:g.black_rating_before??null,result:g.result,pool:g.pool,fen:g.fen,
    lastMove:last?.from&&last?.to?{from:last.from,to:last.to}:null,sans:hist.map((m:any)=>m.san||"").filter(Boolean),endedAt:g.ended_at,...extra}
}
async function bannedAmong(ids:string[]){
  if(!ids.length)return new Set<string>();
  const {data}=await admin.from("chess_players").select("id").in("id",ids).not("banned_at","is",null);
  return new Set((data||[]).map((x:any)=>x.id))
}
async function momentAuto(){
  const since=new Date(Date.now()-MOMENT_DAYS*86400000).toISOString();
  const {data,error}=await admin.from("chess_games").select(MOMENT_FIELDS).eq("rated",true).eq("variant","standard").in("result",["1-0","0-1"]).gte("move_count",MOMENT_MIN_PLIES).gte("ended_at",since).order("ended_at",{ascending:false}).limit(500);
  if(error)throw error;
  const ranked=(data||[]).map((g:any)=>{let mate=false;try{mate=new Chess(g.fen).isCheckmate()}catch{}const s=momentScore({fen:g.fen,result:g.result,mate,plies:Number(g.move_count||0)});return s?{g,s}:null}).filter(Boolean).sort((a:any,c:any)=>c.s.score-a.s.score).slice(0,10) as any[];
  const banned=await bannedAmong([...new Set(ranked.flatMap(x=>[x.g.white_player_id,x.g.black_player_id]).filter(Boolean))] as string[]);
  const best=ranked.find(x=>!banned.has(x.g.white_player_id)&&!banned.has(x.g.black_player_id));
  return best?momentCard(best.g,{caption:momentCaption(best.s),picked:false}):null
}
async function momentOfWeek(){
  const week=isoWeek();
  if(momentCache&&momentCache.week===week&&Date.now()-momentCache.at<600000)return {week,moment:momentCache.moment};
  let moment:any=null;
  const {data:pick}=await admin.from("chess_moments").select("game_id,caption").eq("week",week).maybeSingle();
  if(pick?.game_id){const g=await gameById(pick.game_id);const banned=g?await bannedAmong([g.white_player_id,g.black_player_id].filter(Boolean)):new Set();
    if(g&&g.status!=="active"&&!banned.size)moment=momentCard(g,{caption:pick.caption||"Picked by the Vanta team",picked:true})}
  if(!moment)moment=await momentAuto();
  momentCache={at:Date.now(),week,moment};
  return {week,moment}
}
async function momentPick(req:Request,b:any){
  const p=await playerFor(req,b,true,{touch:false});if(p.role!=="admin")throw fail("Not found.",404);
  const week=isoWeek();momentCache=null;
  if(!b.gameId){await admin.from("chess_moments").delete().eq("week",week);return momentOfWeek()}
  const g=await gameById(String(b.gameId));if(!g||g.status==="active"||!g.rated)throw fail("Pick a finished rated game.",409);
  const caption=cleanChat(b.caption).slice(0,120)||null;
  const {error}=await admin.from("chess_moments").upsert({week,game_id:g.id,caption,picked_by:p.id,picked_at:nowIso()});if(error)throw error;
  return momentOfWeek()
}

// Tournament lobby: standings, the current round's pairings, and live games to watch.
async function tournamentLobby(req:Request,b:any){
  const t=await one("chess_tournaments","id",String(b.tournamentId||""));if(!t)throw fail("Tournament not found.",404);
  let viewer:any=null;try{viewer=await playerFor(req,b,false,{touch:false})}catch{}
  if((await tournamentVisibleTo([t],viewer)).length===0)throw fail("Tournament not found.",404);
  const fresh=t.format==="swiss"?await swissTick(t).catch(()=>t):t;
  const [standings,{data:live},{data:round}]=await Promise.all([
    tournamentStandings({tournamentId:t.id}),
    admin.from("chess_games").select("id,white_name,black_name,white_rating_before,black_rating_before,white_player_id,black_player_id,move_count,fen,tournament_round,updated_at").eq("tournament_id",t.id).eq("status","active").order("updated_at",{ascending:false}).limit(40),
    fresh.format==="swiss"&&Number(fresh.current_round)>0?admin.from("chess_games").select("white_name,black_name,result,status,invite_code,white_player_id,black_player_id").eq("tournament_id",t.id).eq("tournament_round",fresh.current_round).limit(100):Promise.resolve({data:[]})
  ]);
  const ratingSum=(g:any)=>Number(g.white_rating_before||0)+Number(g.black_rating_before||0);
  return {commentary:await commentaryFor(t).catch(()=>[]),canComment:await canComment(viewer,t).catch(()=>false),tournament:fresh,standings:standings.standings,clubs:standings.clubs||[],
    games:(live||[]).sort((a:any,c:any)=>ratingSum(c)-ratingSum(a)).map((g:any)=>({id:g.id,white:g.white_name,black:g.black_name,whiteRating:g.white_rating_before,blackRating:g.black_rating_before,moves:g.move_count,fen:g.fen,round:g.tournament_round,mine:!!viewer&&[g.white_player_id,g.black_player_id].includes(viewer.id)})),
    pairings:(round||[]).map((g:any)=>({white:g.white_name,black:g.black_name,result:g.status==="active"?"playing":g.result,mine:!!viewer&&[g.white_player_id,g.black_player_id].includes(viewer.id),code:viewer&&[g.white_player_id,g.black_player_id].includes(viewer.id)?g.invite_code:null}))}
}
async function resign(req:Request,b:any){
  const p=await playerFor(req,b),g=await freshGame(b.gameId);if(!g)throw fail("Game not found.",404);if(g.status!=="active")return {game:g};let patch:any;
  if(g.white_player_id===p.id)patch={status:"black_won",result:"0-1",end_reason:"resign"};else if(g.black_player_id===p.id)patch={status:"white_won",result:"1-0",end_reason:"resign"};else throw fail("Not your game.",403);
  const {data,error}=await admin.from("chess_games").update({...patch,version:Number(g.version)+1,ended_at:nowIso(),updated_at:nowIso()}).eq("id",g.id).eq("status","active").select().maybeSingle();if(error)throw error;return {game:data?await settleRatings(data):g}
}
async function offerDraw(req:Request,b:any){
  const p=await playerFor(req,b),g=await freshGame(b.gameId);if(!g)throw fail("Game not found.",404);
  if(g.status!=="active")throw fail("Game is not active.",409);
  if(g.bot_player_id)throw fail("Draw offers are for human games.",409);
  if(p.id!==g.white_player_id&&p.id!==g.black_player_id)throw fail("Not your game.",403);
  if(g.draw_offer_by===p.id)return {game:g,offered:true};
  if(g.draw_offer_by&&g.draw_offer_by!==p.id)throw fail("Your opponent already offered a draw. Accept or reject it.",409);
  const {data,error}=await admin.from("chess_games").update({draw_offer_by:p.id,updated_at:nowIso()}).eq("id",g.id).eq("status","active").select().single();
  if(error)throw error;return {game:data,offered:true}
}
async function cancelDraw(req:Request,b:any){
  const p=await playerFor(req,b),g=await freshGame(b.gameId);if(!g)throw fail("Game not found.",404);
  if(g.status!=="active")return {game:g,cancelled:false};
  if(p.id!==g.white_player_id&&p.id!==g.black_player_id)throw fail("Not your game.",403);
  if(g.draw_offer_by!==p.id)return {game:g,cancelled:false};
  const {data,error}=await admin.from("chess_games").update({draw_offer_by:null,updated_at:nowIso()}).eq("id",g.id).eq("status","active").eq("draw_offer_by",p.id).select().maybeSingle();
  if(error)throw error;return {game:data||g,cancelled:!!data}
}
async function respondDraw(req:Request,b:any){
  const p=await playerFor(req,b),g=await freshGame(b.gameId);if(!g)throw fail("Game not found.",404);
  if(g.status!=="active")return {game:g};
  if(p.id!==g.white_player_id&&p.id!==g.black_player_id)throw fail("Not your game.",403);
  if(!g.draw_offer_by||g.draw_offer_by===p.id)throw fail("There is no opponent draw offer to answer.",409);
  if(!b.accept){
    const {data,error}=await admin.from("chess_games").update({draw_offer_by:null,updated_at:nowIso()}).eq("id",g.id).eq("status","active").eq("draw_offer_by",g.draw_offer_by).select().maybeSingle();
    if(error)throw error;return {game:data||g,accepted:false}
  }
  const {data,error}=await admin.from("chess_games").update({draw_offer_by:null,status:"draw",result:"1/2-1/2",version:Number(g.version)+1,ended_at:nowIso(),updated_at:nowIso()}).eq("id",g.id).eq("status","active").eq("draw_offer_by",g.draw_offer_by).select().maybeSingle();
  if(error)throw error;if(!data)throw fail("The draw offer changed. Sync the game.",409);
  return {game:await settleRatings(data),accepted:true}
}
async function gameHistory(req:Request,b:any){
  const p=await playerFor(req,b),limit=Math.max(1,Math.min(100,Number(b.limit||30)));
  const {data,error}=await admin.from("chess_games").select("id,invite_code,white_player_id,black_player_id,white_name,black_name,status,result,rated,pool,source,time_control_seconds,increment_seconds,pgn,move_count,started_at,ended_at,created_at,white_rating_before,black_rating_before,white_rating_delta,black_rating_delta,daily_days,white_berserk,black_berserk,variant,start_fen,move_history").or(`white_player_id.eq.${p.id},black_player_id.eq.${p.id}`).order("created_at",{ascending:false}).limit(limit);
  if(error)throw error;
  return {games:(data||[]).map((g:any)=>{const {move_history,...rest}=g;return {...rest,sans:Array.isArray(move_history)?move_history.map((m:any)=>m.san||"").filter(Boolean):[]}})}
}

const cleanChat=(v:any)=>String(v||"").replace(/[\u0000-\u001F\u007F]/g," ").replace(/\s+/g," ").trim().slice(0,280);
const cleanNonce=(v:any)=>String(v||"").replace(/[^A-Za-z0-9_-]/g,"").slice(0,64);

async function assertGameParticipant(req:Request,b:any){
  const p=await playerFor(req,b);
  const g=await freshGame(b.gameId);
  if(!g)throw fail("Game not found.",404);
  if(p.id!==g.white_player_id&&p.id!==g.black_player_id)throw fail("You are not a player in this game.",403);
  return {p,g};
}
async function chatList(req:Request,b:any){
  const {p,g}=await assertGameParticipant(req,b);
  const limit=Math.max(1,Math.min(100,Number(b.limit||60)));
  const {data,error}=await admin.from("chess_game_messages")
    .select("id,game_id,player_id,display_name,body,client_nonce,created_at")
    .eq("game_id",g.id).order("created_at",{ascending:false}).limit(limit);
  if(error)throw error;
  return {gameId:g.id,playerId:p.id,messages:(data||[]).reverse()}
}
async function chatSend(req:Request,b:any){
  const {p,g}=await assertGameParticipant(req,b);assertAllowed(p,"chat");
  const body=cleanChat(b.message);
  if(!body)throw fail("Message is empty.");
  const nonce=cleanNonce(b.clientNonce)||null;
  if(nonce){
    const {data:existing,error:e}=await admin.from("chess_game_messages")
      .select("id,game_id,player_id,display_name,body,client_nonce,created_at")
      .eq("game_id",g.id).eq("player_id",p.id).eq("client_nonce",nonce).maybeSingle();
    if(e)throw e;if(existing)return {message:existing,deduplicated:true}
  }
  const {data:last,error:le}=await admin.from("chess_game_messages")
    .select("created_at").eq("game_id",g.id).eq("player_id",p.id)
    .order("created_at",{ascending:false}).limit(1).maybeSingle();
  if(le)throw le;
  if(last&&Date.now()-Date.parse(last.created_at)<650)throw fail("Please wait a moment before sending another message.",429);
  const display=p.username||p.display_name||"Player";
  const {data,error}=await admin.from("chess_game_messages")
    .insert({game_id:g.id,player_id:p.id,display_name:display,body,client_nonce:nonce})
    .select("id,game_id,player_id,display_name,body,client_nonce,created_at").single();
  if(error)throw error;
  return {message:data}
}
function puzzleFen(payload:any){
  const c=new Chess();
  const moves=String(payload?.game?.pgn||"").trim().split(/\s+/).filter(Boolean);
  const plies=Math.max(0,Math.min(moves.length,Number(payload?.puzzle?.initialPly??moves.length)));
  for(let i=0;i<plies;i++){try{const m=c.move(moves[i]);if(!m)break}catch{break}}
  return c.fen()
}
async function cachedPuzzle(b:any={}){
  let query=admin.from("chess_puzzles").select("*").order("fetched_at",{ascending:false}).limit(80);
  const rating=Number(b.rating||0);
  if(Number.isFinite(rating)&&rating>0)query=query.gte("rating",Math.max(400,rating-350)).lte("rating",rating+350);
  const {data,error}=await query;if(error)throw error;
  const list=data||[];if(!list.length)return null;
  const pick=list[crypto.getRandomValues(new Uint32Array(1))[0]%list.length];
  return {id:pick.id,fen:pick.fen,solution:pick.solution,rating:pick.rating,plays:pick.plays,themes:pick.themes,gameId:pick.game_id,gamePgn:pick.game_pgn,initialPly:pick.initial_ply,source:pick.source}
}
async function puzzleNext(_req:Request,b:any){
  const allowed=new Set(["easiest","easier","normal","harder","hardest"]);
  const difficulty=allowed.has(String(b.difficulty))?String(b.difficulty):"normal";
  const angle=String(b.angle||"").replace(/[^A-Za-z0-9_-]/g,"").slice(0,40);
  const qs=new URLSearchParams({difficulty});if(angle)qs.set("angle",angle);
  try{
    const r=await fetch("https://lichess.org/api/puzzle/next?"+qs.toString(),{
      headers:{"Accept":"application/json","User-Agent":"VCH-Chess/1.0"}
    });
    if(!r.ok)throw new Error("Puzzle provider returned "+r.status);
    const payload=await r.json();
    const p=payload?.puzzle;if(!p?.id||!Array.isArray(p.solution))throw new Error("Puzzle provider returned invalid data");
    const fen=puzzleFen(payload);
    const row={
      id:String(p.id),fen,solution:p.solution.map((x:any)=>String(x)),rating:Number(p.rating||1500),
      plays:Number(p.plays||0),themes:Array.isArray(p.themes)?p.themes.map((x:any)=>String(x)):[],
      game_id:String(payload?.game?.id||""),game_pgn:String(payload?.game?.pgn||""),
      initial_ply:Number(p.initialPly||0),source:"lichess"
    };
    const {error}=await admin.from("chess_puzzles").upsert(row,{onConflict:"id"});if(error)throw error;
    return {puzzle:{id:row.id,fen:row.fen,solution:row.solution,rating:row.rating,plays:row.plays,themes:row.themes,gameId:row.game_id,gamePgn:row.game_pgn,initialPly:row.initial_ply,source:"lichess"}}
  }catch(err){
    const fallback=await cachedPuzzle(b);if(fallback)return {puzzle:fallback,cached:true};
    throw fail("Puzzle service is temporarily unavailable.",503)
  }
}
async function puzzleAttempt(req:Request,b:any){
  const p=await playerFor(req,b);
  const id=String(b.puzzleId||"").slice(0,32);if(!id)throw fail("Puzzle is missing.");
  const puzzle=await one("chess_puzzles","id",id);if(!puzzle)throw fail("Puzzle not found.",404);
  const played=Array.isArray(b.playedMoves)?b.playedMoves.map((x:any)=>String(x).slice(0,8)).slice(0,30):[];
  // Puzzle rating: only the first attempt at a puzzle counts.
  const {data:seen}=await admin.from("chess_puzzle_attempts").select("id").eq("player_id",p.id).eq("puzzle_id",id).limit(1);
  const before=Number(p.puzzle_rating||1200),after=seen?.length?before:puzzleRatingUpdate(before,Number(p.puzzle_games||0),Number(puzzle.rating||1500),!!b.success);
  if(!seen?.length){await admin.from("chess_players").update({puzzle_rating:after,puzzle_games:Number(p.puzzle_games||0)+1}).eq("id",p.id);EdgeRuntime.waitUntil(awardAchievements({...p,puzzle_games:Number(p.puzzle_games||0)+1}).then(()=>{}).catch(()=>{}))}
  const {data,error}=await admin.from("chess_puzzle_attempts").insert({
    player_id:p.id,puzzle_id:id,success:!!b.success,rating_before:before,rating_after:after,
    duration_ms:b.durationMs==null?null:Math.max(0,Math.min(3600000,Number(b.durationMs)||0)),
    played_moves:played
  }).select("id,success,duration_ms,created_at").single();
  if(error)throw error;
  const {data:stats,error:se}=await admin.from("chess_puzzle_attempts").select("success").eq("player_id",p.id);
  if(se)throw se;const attempts=stats||[],solved=attempts.filter((x:any)=>x.success).length;
  return {attempt:data,rating:{before,after,counted:!seen?.length},stats:{attempts:attempts.length,solved,accuracy:attempts.length?Math.round(1000*solved/attempts.length)/10:0}}
}

async function heartbeat(req:Request,b:any){
  const [p,raw]=await Promise.all([playerFor(req,b),gameById(b.gameId)]);
  if(!raw)throw fail("Game not found.",404);
  const seat=raw.white_player_id===p.id?"w":raw.black_player_id===p.id?"b":null;
  if(!seat)throw fail("You are not a player in this game.",403);
  const patch:any=seat==="w"?{white_last_seen_at:nowIso()}:{black_last_seen_at:nowIso()};
  const {data:seen}=await admin.from("chess_games").update(patch).eq("id",raw.id).select().maybeSingle();
  const game=await resolveTimeout(seen||raw);
  return {ok:true,game,player:publicPlayer(p),seat}
}
async function gameState(req:Request,b:any){
  const p=await playerFor(req,b),raw=await gameById(b.gameId);
  if(!raw)throw fail("Game not found.",404);
  const seat=raw.white_player_id===p.id?"w":raw.black_player_id===p.id?"b":null;
  if(!seat)throw fail("You are not a player in this game.",403);
  return {game:await resolveTimeout(raw),player:publicPlayer(p),seat}
}
async function queueJoin(req:Request,b:any){
  const p=await playerFor(req,b,!!b.rated);assertAllowed(p);const base=Math.max(30,Math.min(7200,Number(b.seconds||600))),inc=Math.max(0,Math.min(60,Number(b.increment||0)));let pool=poolFor(base,inc),rated=!!b.rated,tournament:any=null;
  if(b.tournamentId){tournament=await one("chess_tournaments","id",b.tournamentId);if(!tournament||!["active","scheduled"].includes(tournament.status))throw fail("Tournament is not available.",409);if(tournament.format==="swiss")throw fail("Swiss rounds are paired for you. Wait for your game.",409);arenaOpen(tournament);pool=tournament.pool;rated=tournament.rated;if(rated&&!p.auth_user_id)throw fail("Sign in to play this rated tournament.",401)}
  await admin.from("chess_matchmaking_queue").update({state:"cancelled"}).eq("player_id",p.id).eq("state","searching");
  const r=ratingOf(p,pool),er=effectiveRating(p,pool);const {data:q,error}=await admin.from("chess_matchmaking_queue").insert({player_id:p.id,rated,pool,base_seconds:tournament?.base_seconds||base,increment_seconds:tournament?.increment_seconds||inc,rating:r,effective_rating:er,tournament_id:tournament?.id||null,state:"searching",heartbeat_at:nowIso()}).select().single();if(error)throw error;
  const cutoff=new Date(Date.now()-90000).toISOString();let query=admin.from("chess_matchmaking_queue").select("*").eq("state","searching").eq("rated",rated).eq("pool",pool).neq("player_id",p.id).gte("heartbeat_at",cutoff).order("created_at").limit(60);const {data:raw,error:e2}=await query;if(e2)throw e2;let candidates=raw||[];
  candidates=candidates.filter((x:any)=>tournament?x.tournament_id===tournament.id:!x.tournament_id);
  if(tournament?.kind==="club_battle"&&candidates.length){
    const {data:ents}=await admin.from("chess_tournament_entries").select("player_id,club_id").eq("tournament_id",tournament.id).in("player_id",[p.id,...candidates.map((x:any)=>x.player_id)]);
    const clubOfP=new Map((ents||[]).map((x:any)=>[x.player_id,x.club_id])),mine=clubOfP.get(p.id);
    candidates=candidates.filter((x:any)=>!mine||clubOfP.get(x.player_id)!==mine); // never against your own club
  }const wait=(x:any)=>(Date.now()-Date.parse(x.created_at))/1000;
  candidates=candidates.filter((x:any)=>Math.abs(Number(x.effective_rating)-er)<=Math.max(searchRange(wait(q)),searchRange(wait(x)))&&(Math.abs(Number(x.base_seconds)-(tournament?.base_seconds||base))+20*Math.abs(Number(x.increment_seconds)-(tournament?.increment_seconds||inc)))<=Math.max(60,(tournament?.base_seconds||base)*.35)).sort((a:any,bx:any)=>Math.abs(Number(a.effective_rating)-er)-wait(a)*1.4-(Math.abs(Number(bx.effective_rating)-er)-wait(bx)*1.4));
  for(const cand of candidates){const {data:claimed}=await admin.from("chess_matchmaking_queue").update({state:"matched"}).eq("id",cand.id).eq("state","searching").select().maybeSingle();if(!claimed)continue;const opp=await playerById(cand.player_id);if(!opp)continue;const players=Number(p.color_balance||0)<=Number(opp.color_balance||0)?[p,opp]:[opp,p];
    try{const made=await createGame(req,{seconds:tournament?.base_seconds||base,increment:tournament?.increment_seconds||inc,rated},{players,source:tournament?"tournament":"queue",tournamentId:tournament?.id||null});await Promise.all([admin.from("chess_matchmaking_queue").update({state:"matched",matched_game_id:made.game.id}).eq("id",q.id),admin.from("chess_matchmaking_queue").update({state:"matched",matched_game_id:made.game.id}).eq("id",cand.id)]);return {matched:true,game:made.game,player:publicPlayer(p),seat:made.game.white_player_id===p.id?"w":"b"}}catch(err){await admin.from("chess_matchmaking_queue").update({state:"searching"}).eq("id",cand.id);throw err}}
  return {matched:false,queue:q,range:searchRange(0),player:publicPlayer(p)}
}
async function runtimeConfig(){
  const {data,error}=await admin.from("chess_runtime_config").select("*").eq("id","default").maybeSingle();
  if(error)throw error;
  return data||{bot_fallback_enabled:true,bot_fallback_seconds:15,guest_casual_enabled:true,rated_requires_account:true}
}
async function publicConfig(){
  const cfg=await runtimeConfig();
  return {
    botFallbackEnabled:!!cfg.bot_fallback_enabled,
    botFallbackSeconds:Number(cfg.bot_fallback_seconds||15),
    guestCasualEnabled:!!cfg.guest_casual_enabled,
    ratedRequiresAccount:!!cfg.rated_requires_account
  }
}
async function queueStatus(req:Request,b:any){
  const p=await playerFor(req,b,!!b.rated);
  const {data}=await admin.from("chess_matchmaking_queue").select("*").eq("player_id",p.id).order("created_at",{ascending:false}).limit(1).maybeSingle();
  const q=data;if(!q)return {state:"idle"};
  if(q.state==="searching"){
    await admin.from("chess_matchmaking_queue").update({heartbeat_at:nowIso()}).eq("id",q.id);
    const secs=(Date.now()-Date.parse(q.created_at))/1000;
    const cfg=await runtimeConfig(), botAfter=Math.max(3,Number(cfg.bot_fallback_seconds||15));
    if(!q.rated&&!q.tournament_id&&cfg.bot_fallback_enabled&&b.allowBots!==false&&secs>=botAfter){
      const {data:claimed}=await admin.from("chess_matchmaking_queue").update({state:"matched"}).eq("id",q.id).eq("state","searching").select().maybeSingle();
      if(claimed){
        try{
          const bot=await chooseBot(Number(q.effective_rating||q.rating||1200));
          if(bot){
            const bp=await playerById(bot.player_id);
            if(bp){
              const humanWhite=crypto.getRandomValues(new Uint8Array(1))[0]%2===0;
              const made=await createGame(req,{seconds:q.base_seconds,increment:q.increment_seconds,rated:false},{
                players:humanWhite?[p,bp]:[bp,p],source:"queue",bot
              });
              await admin.from("chess_matchmaking_queue").update({state:"matched",matched_game_id:made.game.id}).eq("id",q.id);
              return {state:"matched",game:made.game,bot:made.bot,botFallback:true,player:publicPlayer(p),seat:made.game.white_player_id===p.id?"w":"b"}
            }
          }
          await admin.from("chess_matchmaking_queue").update({state:"searching"}).eq("id",q.id);
        }catch(err){
          await admin.from("chess_matchmaking_queue").update({state:"searching"}).eq("id",q.id);
          throw err
        }
      }
    }
    return {state:"searching",queue:q,range:searchRange(secs),seconds:Math.floor(secs),botAfterSeconds:q.rated||q.tournament_id||!cfg.bot_fallback_enabled?null:botAfter}
  }
  if(q.state==="matched"&&q.matched_game_id){const game=await freshGame(q.matched_game_id);return {state:"matched",game,player:publicPlayer(p),seat:game?.white_player_id===p.id?"w":game?.black_player_id===p.id?"b":null}};
  return {state:q.state,queue:q}
}
async function queueLeave(req:Request,b:any){const p=await playerFor(req,b);await admin.from("chess_matchmaking_queue").update({state:"cancelled"}).eq("player_id",p.id).eq("state","searching");return {state:"cancelled"}}
async function tournaments(req:Request,b:any){try{await Promise.all([ensureWeeklyArena(),ensureClubBattle()])}catch(e){console.error("weekly arena",e)}const recent=new Date(Date.now()-3*86400000).toISOString();const {data:list,error}=await admin.from("chess_tournaments").select("*").or(`status.in.(scheduled,active),and(status.eq.finished,ends_at.gte.${recent})`).order("starts_at").limit(30);if(error)throw error;let memberships:any[]=[],viewer:any=null,myGames:any[]=[];
  try{viewer=await playerFor(req,b);const {data}=await admin.from("chess_tournament_entries").select("tournament_id,points,games,wins,draws,losses,streak").eq("player_id",viewer.id);memberships=data||[]}catch{}
  let shown=await tournamentVisibleTo(list||[],viewer);
  shown=await Promise.all(shown.map((t:any)=>t.format==="swiss"&&["scheduled","active"].includes(t.status)?swissTick(t).catch(()=>t):t));
  if(viewer){const ids=shown.filter((t:any)=>t.format==="swiss"&&t.status==="active").map((t:any)=>t.id);if(ids.length){const {data:g}=await admin.from("chess_games").select("tournament_id,invite_code,tournament_round").in("tournament_id",ids).eq("status","active").or(`white_player_id.eq.${viewer.id},black_player_id.eq.${viewer.id}`);myGames=(g||[]).map((x:any)=>({tournament_id:x.tournament_id,code:x.invite_code,round:x.tournament_round}))}}
  return {tournaments:shown,memberships,myGames}}
async function tournamentJoin(req:Request,b:any){const t=await one("chess_tournaments","id",b.tournamentId);if(!t)throw fail("Tournament not found.",404);const p=await playerFor(req,b,!!t.rated);assertAllowed(p);
  if(t.club_id){const m=await clubOf(p.id);if(!m||m.club_id!==t.club_id)throw fail("This event is for club members.",403)}
  if(t.status==="finished")throw fail("This tournament has finished.",409);
  // Club battles: you play for your club; join a club first.
  let clubId=null;if(t.kind==="club_battle"){const m=await clubOf(p.id);if(!m)throw fail("Join a club to play in the club battle.",409);clubId=m.club_id}
  const {data:exists}=await admin.from("chess_tournament_entries").select("*").eq("tournament_id",t.id).eq("player_id",p.id).maybeSingle();if(!exists){const {error}=await admin.from("chess_tournament_entries").insert({tournament_id:t.id,player_id:p.id,club_id:clubId});if(error)throw error}return {joined:true,tournament:t,player:publicPlayer(p)}}
async function tournamentStandings(b:any){const {data:e,error}=await admin.from("chess_tournament_entries").select("*").eq("tournament_id",b.tournamentId).order("points",{ascending:false}).order("wins",{ascending:false}).order("joined_at").limit(100);if(error)throw error;
  try{const t=await one("chess_tournaments","id",b.tournamentId);if(t?.status==="finished")for(const x of (e||[]).filter((x:any)=>x.games>0).slice(0,3)){const pl=await playerById(x.player_id);await awardAchievements(pl,{arenaPodium:true})}}catch(err){console.error("podium",err)}const ids=(e||[]).map((x:any)=>x.player_id),{data:players}=ids.length?await admin.from("chess_players").select("id,username,display_name,ratings").in("id",ids):{data:[]};const map=new Map((players||[]).map((p:any)=>[p.id,p]));const standings=(e||[]).map((x:any)=>{const p:any=map.get(x.player_id);return {...x,username:p?.username||p?.display_name||"Player",rating:ratingOf(p,"blitz"),on_fire:Number(x.streak||0)>=3}});
  return {standings,clubs:await clubBattleTable(e||[])}}
async function leaderboard(b:any){const pool=POOLS.includes(b.pool)?b.pool:"rapid";const {data,error}=await admin.from("chess_players").select("id,username,display_name,ratings,provisional_games,wins,losses,draws,rated_games,smurf_score").not("auth_user_id","is",null).is("banned_at",null).limit(300);if(error)throw error;return {pool,leaderboard:(data||[]).map((p:any)=>({...publicPlayer(p),pool_rating:ratingOf(p,pool),pool_games:gamesOf(p,pool)})).filter((x:any)=>x.pool_games>0).sort((a:any,bx:any)=>bx.pool_rating-a.pool_rating).slice(0,100)}}
async function botCatalog(){
  const {data,error}=await admin.from("chess_bots").select("slug,display_name,elo,engine_skill,style,blurb").eq("enabled",true).order("elo");
  if(error)throw error;
  return {bots:(data||[]).map((b:any)=>({...b,engine:{
    name:"Stockfish 19",
    uciLimitStrength:Number(b.elo)>=1320&&Number(b.elo)<3190,
    uciElo:Number(b.elo)>=1320&&Number(b.elo)<3190?Number(b.elo):null,
    skillLevel:Number(b.engine_skill||0)
  }}))}
}
async function botResult(req:Request,b:any){const p=await playerFor(req,b),d=["scout","forge","gambit","cipher","warden","oracle","apex","legend"].includes(b.difficulty)?b.difficulty:"cipher",rr=["wins","losses","draws"].includes(b.result)?b.result:"draws",stats=p.bot_stats||{};stats[d]=stats[d]||{wins:0,losses:0,draws:0};stats[d][rr]=Number(stats[d][rr]||0)+1;const {data,error}=await admin.from("chess_players").update({bot_stats:stats,updated_at:nowIso()}).eq("id",p.id).select().single();if(error)throw error;return {player:publicPlayer(data)}}

Deno.serve(async(req)=>{
  const serverReceivedMs=Date.now();
  if(req.method==="OPTIONS"){
    if(req.headers.get("origin")&&!allowedOrigin(req))return new Response("Origin not allowed.",{status:403,headers:{"Content-Type":"text/plain"}});
    return new Response("ok",{headers:corsFor(req)});
  }
  try{
    if(req.method!=="POST")return send(req,{error:"Method not allowed. Use authenticated POST actions."},405);
    const b=await bodyOf(req);let out:any;
    if(b.action==="ping") return send(req,{pong:true});
    switch(b.action){
      case "config":out=await publicConfig();break;
      case "profile":out={player:ownPlayer(await playerFor(req,b))};break;
      case "profile_update":out=await profileUpdate(req,b);break;
      case "game_players":out=await gamePlayers(req,b);break;
      case "create":out=await createGame(req,b);break;
      case "join":out=await joinGame(req,b);break;
      case "move":out=await makeMove(req,b,serverReceivedMs);break;
      case "bot_move":out=await botMove(req,b);break;
      case "resign":out=await resign(req,b);break;
      case "claim_win":out=await claimWin(req,b);break;
      case "takeback_offer":out=await takebackOffer(req,b);break;
      case "berserk":out=await goBerserk(req,b);break;
      case "player_search":out=await playerSearch(req,b);break;
      case "follow":out=await follow(req,b);break;
      case "friends":out=await friends(req,b);break;
      case "challenge_send":out=await challengeSend(req,b);break;
      case "challenges":out=await challengeList(req,b);break;
      case "challenge_respond":out=await challengeRespond(req,b);break;
      case "challenge_cancel":out=await challengeCancel(req,b);break;
      case "daily_games":out=await dailyGames(req,b);break;
      case "push_subscribe":out=await pushSubscribe(req,b);break;
      case "push_unsubscribe":out=await pushUnsubscribe(req,b);break;
      case "puzzle_daily":out=await puzzleDaily(req,b);break;
      case "puzzle_stats":out=await puzzleStats(req,b);break;
      case "puzzle_streak_record":out=await puzzleStreakRecord(req,b);break;
      case "achievements":out=await achievementsFor(req,b);break;
      case "public_profile":out=await publicProfile(req,b);break;
      case "club_list":out=await clubList(req,b);break;
      case "club_view":out=await clubView(req,b);break;
      case "club_create":out=await clubCreate(req,b);break;
      case "club_join":out=await clubJoin(req,b);break;
      case "club_leave":out=await clubLeave(req,b);break;
      case "club_chat":out=await clubChat(req,b);break;
      case "league":out=await league(req,b);break;
      case "conditional_list":out=await conditionalList(req,b);break;
      case "conditional_set":out=await conditionalSet(req,b);break;
      case "report_player":out=await reportPlayer(req,b);break;
      case "fairplay_signal":out=await fairplaySignal(req,b);break;
      case "mistakes_fixed":out=await mistakesFixed(req,b);break;
      case "mod_queue":out=await modQueue(req,b);break;
      case "mod_player":out=await modPlayer(req,b);break;
      case "mod_action":out=await modAction(req,b);break;
      case "study_save":out=await studySave(req,b);break;
      case "study_get":out=await studyGet(req,b);break;
      case "study_list":out=await studyList(req,b);break;
      case "study_delete":out=await studyDelete(req,b);break;
      case "tournament_create":out=await tournamentCreate(req,b);break;
      case "account_export":out=await accountExport(req,b);break;
      case "account_delete":out=await accountDelete(req,b);break;
      case "notifications":out=await notificationsList(req,b);break;
      case "notifications_read":out=await notificationsRead(req,b);break;
      case "opening_explorer":out=await openingExplorer(req,b);break;
      case "explorer_backfill":out=await explorerBackfill(req,b);break;
      case "tournament_lobby":out=await tournamentLobby(req,b);break;
      case "repertoire_get":out=await repertoireGet(req,b);break;
      case "repertoire_save":out=await repertoireSave(req,b);break;
      case "insights":out=await insights(req,b);break;
      case "battle_create":out=await battleCreate(req,b);break;
      case "battle_join":out=await battleJoin(req,b);break;
      case "battle_state":out=await battleState(req,b);break;
      case "battle_progress":out=await battleProgress(req,b);break;
      case "battle_cancel":out=await battleCancel(req,b);break;
      case "simul_list":out=await simulList(req,b);break;
      case "simul_create":out=await simulCreate(req,b);break;
      case "simul_join":out=await simulJoin(req,b);break;
      case "simul_leave":out=await simulLeave(req,b);break;
      case "simul_start":out=await simulStart(req,b);break;
      case "simul_state":out=await simulState(req,b);break;
      case "vacation":out=await vacation(req,b);break;
      case "player_openings":out=await playerOpenings(req,b);break;
      case "battle_queue":out=await battleQueueJoin(req,b);break;
      case "battle_queue_status":out=await battleQueueStatus(req,b);break;
      case "battle_ladder":out=await battleLadder(req,b);break;
      case "commentary_post":out=await commentaryPost(req,b);break;
      case "moment_of_week":out=await momentOfWeek();break;
      case "moment_pick":out=await momentPick(req,b);break;
      case "takeback_respond":out=await takebackRespond(req,b);break;
      case "live_games":out=await liveGames();break;
      case "watch_state":out=await watchState(b);break;
      case "draw_offer":out=await offerDraw(req,b);break;
      case "draw_cancel":out=await cancelDraw(req,b);break;
      case "draw_respond":out=await respondDraw(req,b);break;
      case "history":out=await gameHistory(req,b);break;
      case "state":out=await gameState(req,b);break;
      case "chat_list":out=await chatList(req,b);break;
      case "chat_send":out=await chatSend(req,b);break;
      case "puzzle_next":out=await puzzleNext(req,b);break;
      case "puzzle_attempt":out=await puzzleAttempt(req,b);break;
      case "heartbeat":out=await heartbeat(req,b);break;
      case "queue_join":out=await queueJoin(req,b);break;
      case "queue_status":out=await queueStatus(req,b);break;
      case "queue_leave":out=await queueLeave(req,b);break;
      case "tournaments":out=await tournaments(req,b);break;
      case "tournament_join":out=await tournamentJoin(req,b);break;
      case "tournament_standings":out=await tournamentStandings(b);break;
      case "leaderboard":out=await leaderboard(b);break;
      case "bots":out=await botCatalog();break;
      case "bot_result":out=await botResult(req,b);break;
      default:return send(req,{error:"Unknown chess action."},400)
    }
    return send(req,out)
  }catch(e){console.error(e);return send(req,{error:e?.message||"Server error."},Number(e?.status)||500)}
});