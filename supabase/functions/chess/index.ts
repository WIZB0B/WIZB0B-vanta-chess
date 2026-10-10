import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { Chess } from "npm:chess.js@1.4.0";
import { calculateMoveTiming } from "./latency.js";

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
const POOLS=["bullet","blitz","rapid","classical"];
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
const effectiveRating=(p:any,pool:string)=>{const base=ratingOf(p,pool),n=gamesOf(p,pool),sm=Number(p?.smurf_score||0);return n<10?Math.round(base+Math.min(450,sm*90)):base};
const publicPlayer=(p:any)=>({id:p.id,username:p.username,display_name:p.display_name,rating:p.rating,ratings:p.ratings,provisional_games:p.provisional_games,wins:p.wins,losses:p.losses,draws:p.draws,bot_stats:p.bot_stats,smurf_score:Number(p.smurf_score||0),account:!!p.auth_user_id,country_code:p.country_code||null,has_avatar:!!p.avatar_data});
// The player's own profile also carries their portrait (a small data: image, see profileUpdate).
const ownPlayer=(p:any)=>({...publicPlayer(p),avatar_data:p.avatar_data||null});
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
// touch=false skips the last-seen write (moves: the heartbeat keeps last-seen fresh), so a
// move costs two database round trips instead of five.
async function playerFor(req:Request,b:any={},requireAccount=false,{touch=true}:{touch?:boolean}={}){
  const auth=req.headers.get("authorization")||"";const bearer=auth.toLowerCase().startsWith("bearer ")?auth.slice(7).trim():"";
  if(bearer){
    const sub=jwtSubject(bearer);
    const [verified,early]=await Promise.all([admin.auth.getUser(bearer),sub?one("chess_players","auth_user_id",sub).catch(()=>null):Promise.resolve(null)]);
    const {data,error}=verified;if(error||!data.user)throw fail("Invalid or expired sign-in.",401);
    const user=data.user;let p=early&&early.auth_user_id===user.id?early:await one("chess_players","auth_user_id",user.id);
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
async function settleTournament(g:any){
  if(!g.tournament_id||g.result==="*")return;
  for(const pid of [g.white_player_id,g.black_player_id].filter(Boolean)){
    const {data:e}=await admin.from("chess_tournament_entries").select("*").eq("tournament_id",g.tournament_id).eq("player_id",pid).maybeSingle();if(!e)continue;
    const s=scoreFor(g.result,pid===g.white_player_id?"w":"b");
    await admin.from("chess_tournament_entries").update({points:Number(e.points)+(s===1?2:s===.5?1:0),games:Number(e.games)+1,wins:Number(e.wins)+(s===1?1:0),draws:Number(e.draws)+(s===.5?1:0),losses:Number(e.losses)+(s===0?1:0)}).eq("tournament_id",g.tournament_id).eq("player_id",pid)
  }
}
async function settleRatings(g:any){
  if(!g.rated||!g.white_player_id||!g.black_player_id||g.result==="*"||g.white_rating_delta!=null)return g;
  const [w,b]=await Promise.all([playerById(g.white_player_id),playerById(g.black_player_id)]);if(!w||!b)return g;
  const pool=POOLS.includes(g.pool)?g.pool:"rapid",rw=ratingOf(w,pool),rb=ratingOf(b,pool),sw=scoreFor(g.result,"w"),sb=1-sw,nw=gamesOf(w,pool),nb=gamesOf(b,pool);
  const kw=(nw<10?64:32)*(nw<10&&Number(w.rated_win_streak||0)>=2&&sw===1?1.5:1),kb=(nb<10?64:32)*(nb<10&&Number(b.rated_win_streak||0)>=2&&sb===1?1.5:1);
  const dw=Math.round(kw*(sw-expected(rw,rb))),db=Math.round(kb*(sb-expected(rb,rw)));
  const nextW={...(w.ratings||{}),[pool]:Math.max(100,rw+dw)},nextB={...(b.ratings||{}),[pool]:Math.max(100,rb+db)};
  const pgW={...(w.provisional_games||{}),[pool]:nw+1},pgB={...(b.provisional_games||{}),[pool]:nb+1};
  await Promise.all([
    admin.from("chess_players").update({ratings:nextW,provisional_games:pgW,rating:nextW.rapid??rw,wins:Number(w.wins)+(sw===1?1:0),losses:Number(w.losses)+(sw===0?1:0),draws:Number(w.draws)+(sw===.5?1:0),rated_games:Number(w.rated_games)+1,rated_win_streak:sw===1?Number(w.rated_win_streak||0)+1:0,smurf_score:Math.max(0,Number(w.smurf_score||0)+(nw<10&&sw===1&&rb>=rw-100?.45:-.15)),color_balance:Number(w.color_balance||0)+1,updated_at:nowIso()}).eq("id",w.id),
    admin.from("chess_players").update({ratings:nextB,provisional_games:pgB,rating:nextB.rapid??rb,wins:Number(b.wins)+(sb===1?1:0),losses:Number(b.losses)+(sb===0?1:0),draws:Number(b.draws)+(sb===.5?1:0),rated_games:Number(b.rated_games)+1,rated_win_streak:sb===1?Number(b.rated_win_streak||0)+1:0,smurf_score:Math.max(0,Number(b.smurf_score||0)+(nb<10&&sb===1&&rw>=rb-100?.45:-.15)),color_balance:Number(b.color_balance||0)-1,updated_at:nowIso()}).eq("id",b.id)
  ]);
  const {data}=await admin.from("chess_games").update({white_rating_before:rw,black_rating_before:rb,white_rating_delta:dw,black_rating_delta:db,ended_at:g.ended_at||nowIso(),updated_at:nowIso()}).eq("id",g.id).is("white_rating_delta",null).select().maybeSingle();
  const settled=data||g;await settleTournament(settled);return settled
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
  if(!g||g.status!=="active"||!g.last_move_at)return g;const c=new Chess(g.fen),side=c.turn(),elapsed=Math.max(0,Date.now()-Date.parse(g.last_move_at)),remain=side==="w"?Number(g.white_time_ms):Number(g.black_time_ms);if(elapsed<remain)return g;
  const winner=(side==="w"?"b":"w") as "w"|"b";
  const patch=!sideCanPossiblyMate(c,winner)
    ?{status:"draw",result:"1/2-1/2",...(side==="w"?{white_time_ms:0}:{black_time_ms:0})}
    :(side==="w"?{status:"black_won",result:"0-1",white_time_ms:0}:{status:"white_won",result:"1-0",black_time_ms:0});
  const {data}=await admin.from("chess_games").update({...patch,version:Number(g.version)+1,ended_at:nowIso(),updated_at:nowIso()}).eq("id",g.id).eq("status","active").select().maybeSingle();
  return data?settleRatings(data):g
}
async function freshGame(id:string){return resolveTimeout(await gameById(id))}
async function createGame(req:Request,b:any,{players=null,source="private",tournamentId=null,bot=null}:any={}){
  let white:any,black:any;if(players)[white,black]=players;else white=await playerFor(req,b,!!b.rated);
  let code=code8();while(await gameByCode(code))code=code8();const base=Math.max(30,Math.min(7200,Number(b.seconds||600))),inc=Math.max(0,Math.min(60,Number(b.increment||0))),pool=poolFor(base,inc),active=!!black;
  const {data,error}=await admin.from("chess_games").insert({
    invite_code:code,white_player_id:white.id,black_player_id:black?.id||null,
    white_name:white.username||white.display_name,black_name:black?(black.username||black.display_name):null,
    fen:START_FEN,status:active?"active":"waiting",result:"*",rated:!!b.rated,pool,source,tournament_id:tournamentId,
    time_control_seconds:base,increment_seconds:inc,white_time_ms:base*1000,black_time_ms:base*1000,
    last_move_at:active?nowIso():null,started_at:active?nowIso():null,white_last_seen_at:nowIso(),black_last_seen_at:black?nowIso():null,
    bot_player_id:bot?.player_id||null,bot_elo:bot?.elo||null,bot_style:bot?.style||null
  }).select().single();if(error)throw error;return {game:data,player:publicPlayer(white),seat:data.white_player_id===white.id?"w":data.black_player_id===white.id?"b":null,bot:bot?{slug:bot.slug,display_name:bot.display_name,elo:bot.elo,engine_skill:bot.engine_skill,style:bot.style,blurb:bot.blurb}:null}
}
async function joinGame(req:Request,b:any){
  const g=await gameByCode(b.code);if(!g)throw fail("Game not found.",404);const p=await playerFor(req,b,!!g.rated);
  if(g.white_player_id===p.id||g.black_player_id===p.id)return {game:await resolveTimeout(g),player:publicPlayer(p),seat:g.white_player_id===p.id?"w":"b"};
  if(g.status!=="waiting"||g.black_player_id)throw fail("This room already has two players.",409);
  const {data,error}=await admin.from("chess_games").update({black_player_id:p.id,black_name:p.username||p.display_name,status:"active",version:Number(g.version)+1,started_at:nowIso(),last_move_at:nowIso(),black_last_seen_at:nowIso(),updated_at:nowIso()}).eq("id",g.id).eq("status","waiting").is("black_player_id",null).select().maybeSingle();if(error)throw error;if(!data)throw fail("Another player joined first.",409);return {game:data,player:publicPlayer(p),seat:"b"}
}
async function applyMove(g:any,color:string,b:any,serverReceivedMs=Date.now()){
  if(Number(b.expectedVersion)!==Number(g.version))throw fail("Board changed. Syncing latest position.",409);
  const c=new Chess(g.fen);if(c.turn()!==color)throw fail("It is not that side's turn.",409);
  let m:any;try{m=c.move({from:String(b.from),to:String(b.to),promotion:String(b.promotion||"q")[0]})}catch{}if(!m)throw fail("Illegal move.");
  const timing=calculateMoveTiming({clientMoveAt:b.clientMoveAt,lastMoveAt:g.last_move_at,serverReceivedAt:serverReceivedMs});
  let wt=Number(g.white_time_ms),bt=Number(g.black_time_ms);
  if(color==="w")wt=Math.max(0,wt-timing.chargedElapsedMs);else bt=Math.max(0,bt-timing.chargedElapsedMs);
  if((color==="w"?wt:bt)<=0){
    const timeoutBase={...g,last_move_at:new Date(timing.serverReceivedMs-timing.chargedElapsedMs-1).toISOString()};
    const timedOutGame=await resolveTimeout(timeoutBase);
    EdgeRuntime.waitUntil(broadcastGameState(timedOutGame));
    return {game:timedOutGame,move:null,timedOut:true};
  }
  const bonus=Number(g.increment_seconds||0)*1000;if(color==="w")wt+=bonus;else bt+=bonus;const o=outcome(c),history=Array.isArray(g.move_history)?g.move_history:[];
  const {data,error}=await admin.from("chess_games").update({
    fen:c.fen(),pgn:c.pgn(),move_history:[...history,{from:m.from,to:m.to,san:m.san,lan:m.lan,color:m.color,piece:m.piece,captured:m.captured||null,promotion:m.promotion||null,client_move_at:timing.clientMoveAt,server_received_at:timing.serverReceivedAt,network_compensation_ms:timing.networkCompensationMs}],
    status:o.status,result:o.result,version:Number(g.version)+1,move_count:Number(g.move_count||0)+1,
    white_time_ms:wt,black_time_ms:bt,last_move_at:timing.serverReceivedAt,ended_at:o.result==="*"?null:timing.serverReceivedAt,updated_at:timing.serverReceivedAt,draw_offer_by:null,
    ...(color==="w"?{white_last_seen_at:timing.serverReceivedAt}:{black_last_seen_at:timing.serverReceivedAt})
  }).eq("id",g.id).eq("version",Number(g.version)).select().maybeSingle();
  if(error)throw error;if(!data)throw fail("Move conflict. Syncing latest position.",409);
  const nextGame=o.result==="*"?data:await settleRatings(data);
  EdgeRuntime.waitUntil(broadcastGameState(nextGame));
  return {game:nextGame,move:m}
}
async function makeMove(req:Request,b:any,serverReceivedMs=Date.now()){
  // Player and game are fetched at the same time; nothing else is read before the move is written.
  const [p,g]=await Promise.all([playerFor(req,b,false,{touch:false}),gameById(b.gameId)]);if(!g)throw fail("Game not found.",404);if(g.status!=="active")throw fail("Game is not active.",409);
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
async function resign(req:Request,b:any){
  const p=await playerFor(req,b),g=await freshGame(b.gameId);if(!g)throw fail("Game not found.",404);if(g.status!=="active")return {game:g};let patch:any;
  if(g.white_player_id===p.id)patch={status:"black_won",result:"0-1"};else if(g.black_player_id===p.id)patch={status:"white_won",result:"1-0"};else throw fail("Not your game.",403);
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
  const {data,error}=await admin.from("chess_games").select("id,invite_code,white_player_id,black_player_id,white_name,black_name,status,result,rated,pool,source,time_control_seconds,increment_seconds,pgn,move_count,started_at,ended_at,created_at,white_rating_before,black_rating_before,white_rating_delta,black_rating_delta").or(`white_player_id.eq.${p.id},black_player_id.eq.${p.id}`).order("created_at",{ascending:false}).limit(limit);
  if(error)throw error;return {games:data||[]}
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
  const {p,g}=await assertGameParticipant(req,b);
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
  const {data,error}=await admin.from("chess_puzzle_attempts").insert({
    player_id:p.id,puzzle_id:id,success:!!b.success,
    duration_ms:b.durationMs==null?null:Math.max(0,Math.min(3600000,Number(b.durationMs)||0)),
    played_moves:played
  }).select("id,success,duration_ms,created_at").single();
  if(error)throw error;
  const {data:stats,error:se}=await admin.from("chess_puzzle_attempts").select("success").eq("player_id",p.id);
  if(se)throw se;const attempts=stats||[],solved=attempts.filter((x:any)=>x.success).length;
  return {attempt:data,stats:{attempts:attempts.length,solved,accuracy:attempts.length?Math.round(1000*solved/attempts.length)/10:0}}
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
  const p=await playerFor(req,b,!!b.rated);const base=Math.max(30,Math.min(7200,Number(b.seconds||600))),inc=Math.max(0,Math.min(60,Number(b.increment||0)));let pool=poolFor(base,inc),rated=!!b.rated,tournament:any=null;
  if(b.tournamentId){tournament=await one("chess_tournaments","id",b.tournamentId);if(!tournament||!["active","scheduled"].includes(tournament.status))throw fail("Tournament is not available.",409);pool=tournament.pool;rated=tournament.rated;if(rated&&!p.auth_user_id)throw fail("Sign in to play this rated tournament.",401)}
  await admin.from("chess_matchmaking_queue").update({state:"cancelled"}).eq("player_id",p.id).eq("state","searching");
  const r=ratingOf(p,pool),er=effectiveRating(p,pool);const {data:q,error}=await admin.from("chess_matchmaking_queue").insert({player_id:p.id,rated,pool,base_seconds:tournament?.base_seconds||base,increment_seconds:tournament?.increment_seconds||inc,rating:r,effective_rating:er,tournament_id:tournament?.id||null,state:"searching",heartbeat_at:nowIso()}).select().single();if(error)throw error;
  const cutoff=new Date(Date.now()-90000).toISOString();let query=admin.from("chess_matchmaking_queue").select("*").eq("state","searching").eq("rated",rated).eq("pool",pool).neq("player_id",p.id).gte("heartbeat_at",cutoff).order("created_at").limit(60);const {data:raw,error:e2}=await query;if(e2)throw e2;let candidates=raw||[];
  candidates=candidates.filter((x:any)=>tournament?x.tournament_id===tournament.id:!x.tournament_id);const wait=(x:any)=>(Date.now()-Date.parse(x.created_at))/1000;
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
async function tournaments(req:Request,b:any){const {data:list,error}=await admin.from("chess_tournaments").select("*").in("status",["scheduled","active"]).order("starts_at").limit(30);if(error)throw error;let memberships:any[]=[];try{const p=await playerFor(req,b);const {data}=await admin.from("chess_tournament_entries").select("tournament_id,points,games,wins,draws,losses").eq("player_id",p.id);memberships=data||[]}catch{}return {tournaments:list||[],memberships}}
async function tournamentJoin(req:Request,b:any){const t=await one("chess_tournaments","id",b.tournamentId);if(!t)throw fail("Tournament not found.",404);const p=await playerFor(req,b,!!t.rated);const {data:exists}=await admin.from("chess_tournament_entries").select("*").eq("tournament_id",t.id).eq("player_id",p.id).maybeSingle();if(!exists){const {error}=await admin.from("chess_tournament_entries").insert({tournament_id:t.id,player_id:p.id});if(error)throw error}return {joined:true,tournament:t,player:publicPlayer(p)}}
async function tournamentStandings(b:any){const {data:e,error}=await admin.from("chess_tournament_entries").select("*").eq("tournament_id",b.tournamentId).order("points",{ascending:false}).order("wins",{ascending:false}).order("joined_at").limit(100);if(error)throw error;const ids=(e||[]).map((x:any)=>x.player_id),{data:players}=ids.length?await admin.from("chess_players").select("id,username,display_name,ratings").in("id",ids):{data:[]};const map=new Map((players||[]).map((p:any)=>[p.id,p]));return {standings:(e||[]).map((x:any)=>{const p:any=map.get(x.player_id);return {...x,username:p?.username||p?.display_name||"Player",rating:ratingOf(p,"blitz")}})}}
async function leaderboard(b:any){const pool=POOLS.includes(b.pool)?b.pool:"rapid";const {data,error}=await admin.from("chess_players").select("id,username,display_name,ratings,provisional_games,wins,losses,draws,rated_games,smurf_score").not("auth_user_id","is",null).limit(300);if(error)throw error;return {pool,leaderboard:(data||[]).map((p:any)=>({...publicPlayer(p),pool_rating:ratingOf(p,pool),pool_games:gamesOf(p,pool)})).filter((x:any)=>x.pool_games>0).sort((a:any,bx:any)=>bx.pool_rating-a.pool_rating).slice(0,100)}}
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