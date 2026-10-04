import './style.css';
import { Chess } from 'chess.js';
import { VchApi, stableGuestToken } from './vch-api.js';
import { initialClocks, normalizeRoomId } from './game-config.js';
import { createClockSnapshot, projectedClocks, seatFromEnvelope } from './server-state.js';
import { OPENINGS, FAMOUS_GAMES, LESSONS, detectOpening } from './content.js';

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const params=new URLSearchParams(location.search), generatedRoom=Math.random().toString(36).slice(2,10).toUpperCase();
let room=normalizeRoomId(params.get('game'),generatedRoom);
const playerToken=stableGuestToken();
const api=new VchApi({token:playerToken});
const SUPABASE_URL='https://ubjldcfiwrwiouwgmduo.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_q3KU0sdaVKOeMcLND2D15Q_Qsu2X5pN';
let authSession=JSON.parse(localStorage.getItem('vanta.auth-session')||'null'),currentProfile=null,authMode='signin';
if(authSession?.access_token)api.accessToken=authSession.access_token;
const guestName=`Guest-${playerToken.slice(-4).toUpperCase()}`;
const game=new Chess(); let selected=null, flipped=false, mode='room', myColor=null, ticking, enginePending, serverGameId=null, serverVersion=0, pollTimer, clockSnapshot=null, serverGame=null, botThinking=false, puzzleSession=null, currentPlayerId=null, orientationSet=false, lastAnimatedVersion=0, lastDrawOffer=null, pollCount=0, currentBot=null, latencyMs=null, installPrompt=null, currentRightView='moves', analysisTimer=null, analysisScore=0, matchTimer=null, searching=false, localClockState=null, localGameOver=false;
const stockfish=new Worker('/stockfish.worker.js');
const analysisWorker=new Worker('/stockfish.worker.js');
stockfish.onmessage=({data})=>{
  if(data.type==='uci'&&String(data.line||'').startsWith('bestmove ')&&enginePending){const u=String(data.line).split(' ')[1];enginePending(u);enginePending=null}
  if(data.type==='unavailable'&&enginePending){enginePending(null);enginePending=null}
};
analysisWorker.onmessage=({data})=>{
  if(data.type==='uci'&&String(data.line||'').startsWith('info '))updateAnalysisFromUci(String(data.line));
  if(data.type==='unavailable'){const line=$('#line');if(line)line.textContent='Stockfish 19 unavailable in this browser.'}
};
const pieceNames={k:'king',q:'queen',r:'rook',b:'bishop',n:'knight',p:'pawn'};
const app=$('#app');
app.innerHTML=`
<div class="shell">
  <header class="topbar">
    <a class="brand" href="#" aria-label="Vanta Chess home"><span class="mark">V</span><b>VANTA<br>CHESS</b></a>
    <nav class="main-nav" aria-label="Primary">
      <button class="active" data-nav="play"><span class="nav-icon"><svg viewBox="0 0 24 24"><path d="m6 3 12 12M14 3h7v7M10 21H3v-7M3 21l7-7M21 3l-7 7"/></svg></span>Play</button>
      <button data-nav="arena"><span class="nav-icon"><svg viewBox="0 0 24 24"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M7 6H4v2a4 4 0 0 0 4 4M17 6h3v2a4 4 0 0 1-4 4"/></svg></span>Arena</button>
      <button data-nav="puzzles"><span class="nav-icon"><svg viewBox="0 0 24 24"><path d="M8 3h4v4h4V3h5v6h-4v4h4v8h-8v-4H9v4H3v-8h4V9H3V3h5Z"/></svg></span>Puzzles</button>
      <button data-nav="learn"><span class="nav-icon"><svg viewBox="0 0 24 24"><path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H11v18H7.5A3.5 3.5 0 0 0 4 23V5.5ZM20 5.5A3.5 3.5 0 0 0 16.5 2H13v18h3.5A3.5 3.5 0 0 1 20 23V5.5Z"/></svg></span>Learn</button>
      <button data-nav="openings"><span class="nav-icon"><svg viewBox="0 0 24 24"><path d="M7 4h3v3h4V4h3v3h2v4l-2 2v6H7v-6l-2-2V7h2V4ZM5 21h14"/></svg></span>Openings</button>
      <button data-nav="famous"><span class="nav-icon"><svg viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="m7 16 4-4 3 3 3-3 3 3M8 8h.01"/></svg></span>Famous Games</button>
      <button data-nav="review"><span class="nav-icon"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="m7 12 3 3 7-7"/></svg></span>Review</button>
    </nav>
    <div class="header-actions">
      <button id="searchBtn" class="icon-btn" aria-label="Search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg></button>
      <button id="installBtn" class="install-btn">⇩ <span>Install App</span></button>
      <button id="notifyBtn" class="icon-btn" aria-label="Notifications"><svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg></button>
      <button id="accountBtn" class="user" type="button" aria-label="Account"><i></i><span>${guestName}</span><small>1200 rating</small></button>
    </div>
  </header>

  <main>
    <aside class="lpanel panel">
      <div class="hero">
        <div class="hero-art" aria-hidden="true"></div>
        <label>● &nbsp; LIVE CHESS</label>
        <h1>Play your<br>next game.</h1>
        <p>Guest play is instant. Rated games save your Elo and tournament record.</p>
      </div>

      <div class="modes">
        <button data-mode="match">⚡<span>Match</span></button>
        <button data-mode="room" class="on">♟<span>Room</span></button>
        <button data-mode="computer">▣<span>Computer</span></button>
      </div>

      <section class="private-card"><span class="link-icon">↗</span><div><h3>Create a private room</h3><p>Generate a shareable game link instantly.</p><small>Guests can join casual rooms without an account.</small></div><b>›</b></section>
      <label class="tiny">GAME SETTINGS</label>
      <div class="settings">
        <label><span>Time control</span><select id="time"><option value="600">◷ 10+0 Rapid</option><option value="300">◷ 5+0 Blitz</option><option value="180">◷ 3+0 Blitz</option></select></label>
        <label><span id="secondarySettingLabel">Room type</span><select id="level"><option value="casual">♟ Casual – Guest OK</option><option value="rated">Rated – Account required</option></select></label>
      </div>
      <button class="gold" id="create"><span>Create room & get link</span><b>＋</b></button>
      <div class="divider">or join an existing room</div>
      <div class="join"><input id="roomInput" placeholder="Enter room code" maxlength="12"><button id="join">Join room</button></div>
      <div class="room"><small>ROOM CODE</small><strong>${room}</strong><em>● Ready</em><p>Share this link</p><div><input id="share" readonly value="${location.origin+location.pathname}?game=${room}"><button id="copy" aria-label="Copy room link">▣</button></div><small class="room-note">Keep this tab open. Your opponent can enter from any modern browser.</small></div>
    </aside>

    <section class="game">
      <div class="player top"><span class="avatar">GU</span><div><b>Waiting for opponent</b><small>☆ 1200</small></div><i class="signal" id="topSignal">▥ live</i><time id="blackClock">10:00</time></div>
      <div id="board" class="board" aria-label="Chess board"></div>
      <div class="player bottom"><span class="avatar light">GU</span><div><b>You · ${guestName}</b><small>☆ 1200</small></div><i class="signal" id="bottomSignal">▥ connecting…</i><time id="whiteClock">10:00</time></div>
      <div class="tools"><button id="flip">⇄ Flip board</button><button id="sound">♫ Sound on</button><button id="theme">▦ Board theme</button><button id="resign" class="danger">⚑ Resign</button></div>
    </section>

    <aside class="rpanel panel">
      <div class="tabs" role="tablist">
        <button class="on" data-tab="moves">Moves</button><button data-tab="analysis">Analysis</button><button data-tab="openings">Openings</button><button data-tab="famous">Famous Games</button>
      </div>
      <div id="rightWorkspace">
        <section class="live-card">
          <div class="live-card-copy"><small>● &nbsp; Live Game</small><h2 id="turn">White to move</h2><p id="state">Real time &nbsp;•&nbsp; Casual game</p></div>
          <div class="live-actions"><button id="draw" class="draw-chip">½ Draw</button><button id="openChat" class="chat-chip">Chat</button></div>
        </section>

        <div id="movesView" class="right-view">
          <div class="moves-head"><span>Move</span><span>Eval</span><span>Time</span></div>
          <div id="moves" class="moves"><span>Game ready — make a move.</span></div>
          <div class="analysis">
            <header><b>▣ Engine Analysis</b><small>Stockfish 19 · Depth <span id="depth">—</span></small></header>
            <div class="analysis-row"><h2 id="score">+0.0</h2><div class="meter"><i id="meterFill"></i></div></div>
            <p id="advantage">Equal position</p>
            <small>Principal variation</small><p id="line">Analysis begins after your move.</p>
          </div>
          <div class="feature-grid">
            <button class="feature-card opening" data-action="openings"><span class="asset"></span><span class="feature-icon">▤</span><b>Opening Explorer</b><small>Explore moves, theory and master plans.</small><i>›</i></button>
            <button class="feature-card famous" data-action="famous"><span class="asset"></span><span class="feature-icon">♛</span><b>Famous Games</b><small>Study legendary matches and ideas.</small><i>›</i></button>
            <button class="feature-card review" data-action="review"><span class="asset"></span><span class="feature-icon">▥</span><b>Post-Game Review</b><small>Deep engine analysis and game insights.</small><i>›</i></button>
            <button class="feature-card practice" data-action="learn"><span class="asset"></span><span class="feature-icon">◎</span><b>Practice & Learn</b><small>Puzzles, lessons and structured training.</small><i>›</i></button>
          </div>
        </div>
        <div id="dynamicView" class="right-view hidden"></div>
      </div>
    </aside>
  </main>
</div>

<div id="toast"></div>

<aside id="chatDrawer" class="chat-drawer" aria-hidden="true">
  <header><div><small>PLAYER CHAT</small><h3>Game conversation</h3></div><button id="closeChat" aria-label="Close chat">×</button></header>
  <div id="messages"></div>
  <form id="chat"><input id="message" maxlength="160" placeholder="Send a friendly message…"><button>Send</button></form>
</aside>

<dialog id="promotion"><h2>Promote pawn</h2><div><button data-piece="q">♕</button><button data-piece="r">♖</button><button data-piece="b">♗</button><button data-piece="n">♘</button></div></dialog>
<dialog id="themeStudio"><h2>Theme Studio</h2><label>Light squares <input data-theme="--light" type="color" value="#d9cfb2"></label><label>Dark squares <input data-theme="--dark" type="color" value="#29463b"></label><label>Accent <input data-theme="--mint" type="color" value="#82edba"></label><label>Gold <input data-theme="--gold" type="color" value="#e5c17c"></label><label>Glass opacity <input data-theme="--glass" type="range" min="35" max="100" value="94"></label><label>Motion <input data-theme="--motion" type="range" min="0" max="100" value="100"></label><label>Ivory piece tint <input id="whitePiece" type="color" value="#f0d9a4"></label><label>Black piece tint <input id="blackPiece" type="color" value="#342019"></label><label>Piece tint strength <input id="pieceTint" type="range" min="0" max="70" value="18"></label><label>Wallpaper <select id="wallpaper"><option value="classic">Midnight Emerald</option><option value="cobalt">Midnight Cobalt</option><option value="burgundy">Burgundy Brass</option><option value="ivory">Ivory Noir</option></select></label><button id="closeTheme">Done</button></dialog>


<dialog id="accountDialog" class="account-dialog">
  <form method="dialog"><button class="account-close" aria-label="Close">×</button></form>
  <div class="account-head"><small>VANTA CHESS ACCOUNT</small><h2>Save your rating and record</h2><p>Guest games stay instant. Sign in only when you want rated play, tournaments, and a persistent profile.</p></div>
  <div id="accountGuest">
    <div class="auth-tabs"><button type="button" class="on" data-auth="signin">Sign in</button><button type="button" data-auth="signup">Create account</button></div>
    <label id="usernameField" class="hidden">Username<input id="authUsername" autocomplete="username" maxlength="20" placeholder="3–20 letters, numbers or _"></label>
    <label>Email<input id="authEmail" type="email" autocomplete="email" placeholder="you@example.com"></label>
    <label>Password<input id="authPassword" type="password" autocomplete="current-password" minlength="6" placeholder="••••••••"></label>
    <button id="authSubmit" class="primary-action" type="button">Sign in</button>
    <p id="authMessage" class="auth-message"></p>
  </div>
  <div id="accountSigned" class="hidden">
    <div class="profile-card"><span class="avatar light">VC</span><div><b id="profileName">Player</b><small id="profileRating">1200 rapid</small></div></div>
    <div class="rating-grid"><div><small>Bullet</small><b id="ratingBullet">1200</b></div><div><small>Blitz</small><b id="ratingBlitz">1200</b></div><div><small>Rapid</small><b id="ratingRapid">1200</b></div><div><small>Classical</small><b id="ratingClassical">1200</b></div></div>
    <button id="signOutBtn" class="secondary-action" type="button">Sign out</button>
  </div>
</dialog>

<dialog id="searchDialog" class="search-dialog"><form method="dialog"><button class="close-search">×</button></form><h2>Search Vanta Chess</h2><input id="searchInput" autocomplete="off" placeholder="Search openings, lessons, famous games…"><div id="searchResults"></div></dialog>
`

let clocks=initialClocks(Number($('#time').value));
function render(){
  const board=$('#board'), order=flipped?[...Array(64).keys()].reverse():[...Array(64).keys()];
  board.innerHTML='';
  const pos=game.board().flat(), legal=selected?game.moves({square:selected,verbose:true}):[];
  const localLast=game.history({verbose:true}).at(-1),serverLast=serverGameId&&Array.isArray(serverGame?.move_history)?serverGame.move_history.at(-1):null,lastMove=serverLast||localLast;
  let checked=-1;
  if(game.inCheck()){
    const checkedColor=game.turn();
    checked=pos.findIndex(p=>p?.type==='k'&&p.color===checkedColor);
  }
  order.forEach(i=>{
    const r=Math.floor(i/8),f=i%8,sq='abcdefgh'[f]+(8-r),p=pos[i],el=document.createElement('button');
    el.className=`square ${(r+f)%2?'dark':'light'} ${lastMove&&(lastMove.from===sq||lastMove.to===sq)?'last-move':''} ${selected===sq?'selected':''} ${legal.some(m=>m.to===sq)?'legal':''} ${checked===i?'check':''}`;
    el.dataset.sq=sq;
    el.setAttribute('aria-label',sq+(p?` ${p.color==='w'?'white':'black'} ${pieceNames[p.type]}`:' empty'));
    if(p)el.innerHTML=`<span class="piece ${p.color} piece-${p.type}" draggable="true" aria-hidden="true"></span>`;
    if(f===(flipped?7:0))el.insertAdjacentHTML('beforeend',`<small class="rank">${8-r}</small>`);
    if(r===(flipped?0:7))el.insertAdjacentHTML('beforeend',`<small class="file">${'abcdefgh'[f]}</small>`);
    el.onclick=()=>clickSquare(sq,p); board.append(el);
  });
  board.classList.toggle('mate',game.isCheckmate());
  if(localGameOver){
    $('#turn').textContent='Game over · You resigned';
    $('#state').textContent='Computer game finished';
  }else if(serverGameId&&serverGame&&!['active','playing','in_progress','waiting'].includes(serverGame.status)){
    $('#turn').textContent=`Game over · ${serverGame.end_reason||serverGame.result||serverGame.status}`;
    $('#state').textContent='Authoritative server result';
  }else{
    $('#turn').textContent=game.isGameOver()?endText():`${game.turn()==='w'?'White':'Black'} to move`;
    $('#state').textContent=game.inCheck()?'Check · Real time':'Real time  •  Casual game';
  }
  document.body.dataset.seat=myColor||'';
  document.body.dataset.botGame=serverGame?.bot_player_id?'true':'false';
  updateOpeningLabel();scheduleAnalysis();
}
function endText(){if(game.isCheckmate())return `Checkmate · ${game.turn()==='w'?'Black':'White'} wins`;if(game.isStalemate())return 'Draw · Stalemate';if(game.isThreefoldRepetition())return 'Draw · Repetition';return 'Draw';}
async function clickSquare(sq,p){if(localGameOver||game.isGameOver()||(serverGameId&&myColor&&myColor!==game.turn())||(mode==='computer'&&game.turn()!=='w'))return;if(!selected){if(p?.color===game.turn()){selected=sq;render()}return} if(p?.color===game.turn()){selected=sq;render();return} const candidates=game.moves({square:selected,verbose:true}).filter(m=>m.to===sq);if(!candidates.length){selected=null;render();return}let promotion;if(candidates.some(m=>m.promotion))promotion=await choosePromotion();makeMove({from:selected,to:sq,promotion:promotion||'q'});selected=null;}
function choosePromotion(){return new Promise(resolve=>{const d=$('#promotion');d.showModal();$$('#promotion button').forEach(b=>b.onclick=()=>{d.close();resolve(b.dataset.piece)})})}
function resetLocalClock(){
  clocks=initialClocks(Number($('#time').value));
  localClockState={w:clocks.w,b:clocks.b,active:game.turn(),startedAt:performance.now()};
  $('#whiteClock').textContent=clockText(clocks.w);$('#blackClock').textContent=clockText(clocks.b);
}
function settleLocalClock(){
  if(!localClockState)return;
  const now=performance.now(),elapsed=(now-localClockState.startedAt)/1000;
  localClockState[localClockState.active]=Math.max(0,localClockState[localClockState.active]-elapsed);
  localClockState.startedAt=now;
}
function switchLocalClock(){
  if(!localClockState)return;
  settleLocalClock();localClockState.active=game.turn();localClockState.startedAt=performance.now();
}
function setModeSettings(next){
  const label=$('#secondarySettingLabel'),select=$('#level');if(!label||!select)return;
  if(next==='computer'){
    label.textContent='Computer strength';
    select.innerHTML='<option value="900">Easy · 900</option><option value="1200">Medium · 1200</option><option value="1500" selected>Hard · 1500</option><option value="1800">Advanced · 1800</option><option value="2200">Expert · 2200</option><option value="2700">Legend · 2700</option>';
  }else{
    label.textContent='Room type';
    select.innerHTML='<option value="casual">♟ Casual – Guest OK</option><option value="rated">Rated – Account required</option>';
  }
}
async function makeMove(move,remote=false,retry=true){if(puzzleSession&&!remote){const uci=move.from+move.to+(move.promotion||'');const expected=puzzleSession.solution[puzzleSession.index];if(uci!==expected){toast('Try another move');return}
  game.move(move);puzzleSession.played.push(uci);puzzleSession.index++;render();
  if(puzzleSession.index>=puzzleSession.solution.length){await api.puzzleAttempt({puzzleId:puzzleSession.id,success:true,durationMs:Date.now()-puzzleSession.started,playedMoves:puzzleSession.played});toast('Puzzle solved');puzzleSession=null;return}
  const reply=puzzleSession.solution[puzzleSession.index];
  if(reply){setTimeout(async()=>{if(!puzzleSession)return;try{game.move({from:reply.slice(0,2),to:reply.slice(2,4),promotion:reply[4]});puzzleSession.played.push(reply);puzzleSession.index++;render();if(puzzleSession.index>=puzzleSession.solution.length){await api.puzzleAttempt({puzzleId:puzzleSession.id,success:true,durationMs:Date.now()-puzzleSession.started,playedMoves:puzzleSession.played});toast('Puzzle solved');puzzleSession=null}}catch{toast('Puzzle line could not continue')}},260)}
  return}if(serverGameId&&!remote){try{const state=await api.move(serverGameId,serverVersion,{from:move.from,to:move.to,promotion:move.promotion});applyServerState(state);playTone()}catch(error){toast(error.message);await refreshServerState();if(retry&&error.status===409&&myColor===game.turn()&&game.moves({square:move.from,verbose:true}).some(x=>x.to===move.to))return makeMove(move,false,false)}return}let made;try{if(mode==='computer')settleLocalClock();made=game.move(move)}catch{return}if(mode==='computer'){localClockState.active=game.turn();localClockState.startedAt=performance.now()}render();updateMoves();playTone();if(mode==='computer'&&!game.isGameOver())setTimeout(engineMove,280);}
function updateMoves(){
  const records=serverGameId&&Array.isArray(serverGame?.move_history)?serverGame.move_history:game.history().map((san,index)=>({san,color:index%2?'b':'w'}));
  const target=$('#moves');if(!target)return;
  if(!records.length){target.innerHTML='<span>Game ready — make a move.</span>';return}
  target.innerHTML=records.map((record,index)=>{
    const color=record.color||(index%2?'b':'w'),moveNo=Math.floor(index/2)+1,prefix=color==='w'?moveNo+'.':moveNo+'...';
    const isLast=index===records.length-1,evalText=isLast?(analysisScore>=0?'+':'')+analysisScore.toFixed(1):'';
    return `<div class="move-row"><span><b>${prefix}</b> ${escapeHtml(record.san||record.lan||'')}</span><span>${evalText}</span><span>${record.elapsed_ms?Math.max(1,Math.round(record.elapsed_ms/1000))+'s':''}</span></div>`;
  }).join('');
  target.scrollTop=target.scrollHeight;
}
async function findEngineMove(){const moves=game.moves({verbose:true});if(!moves.length)return null;const requestedElo=Number(currentBot?.elo||currentBot?.rating||$('#level').value||1200);const uci=await new Promise(resolve=>{enginePending=resolve;stockfish.postMessage({fen:game.fen(),elo:requestedElo,movetime:350});setTimeout(()=>{if(enginePending){enginePending(null);enginePending=null}},4000)});return uci&&moves.find(x=>x.from+x.to+(x.promotion||'')===uci)}
async function engineMove(){const move=await findEngineMove();if(!move)return toast('Stockfish 19 is unavailable — no substitute move was played');makeMove(move,true)}
function playTone(){if($('#sound').dataset.off)return;const a=new AudioContext(),o=a.createOscillator(),g=a.createGain();o.frequency.value=420;g.gain.setValueAtTime(.05,a.currentTime);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+.09);o.connect(g).connect(a.destination);o.start();o.stop(a.currentTime+.1)}
function clockText(n){return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`}
function startClock(){clearInterval(ticking);ticking=setInterval(()=>{
  if(clockSnapshot){
    const value=projectedClocks(clockSnapshot);$('#whiteClock').textContent=clockText(Math.ceil(value.w/1000));$('#blackClock').textContent=clockText(Math.ceil(value.b/1000));return;
  }
  if(mode==='computer'&&localClockState&&!localGameOver&&!game.isGameOver()){
    const elapsed=(performance.now()-localClockState.startedAt)/1000;
    const w=localClockState.w-(localClockState.active==='w'?elapsed:0),b=localClockState.b-(localClockState.active==='b'?elapsed:0);
    $('#whiteClock').textContent=clockText(Math.max(0,Math.ceil(w)));$('#blackClock').textContent=clockText(Math.max(0,Math.ceil(b)));
  }
},250)}
function toast(s){$('#toast').textContent=s;$('#toast').className='show';setTimeout(()=>$('#toast').className='',1800)}
function animateGhost(from,to){
  const source=$(`.square[data-sq="${from}"] .piece`),target=$(`.square[data-sq="${to}"]`);
  if(!source||!target)return;
  const a=source.getBoundingClientRect(),b=target.getBoundingClientRect(),ghost=source.cloneNode(true);
  ghost.classList.add('piece-ghost');Object.assign(ghost.style,{position:'fixed',left:a.left+'px',top:a.top+'px',width:a.width+'px',height:a.height+'px',zIndex:99,pointerEvents:'none'});
  document.body.append(ghost);
  ghost.animate([{transform:'translate(0,0)'},{transform:`translate(${b.left-a.left}px,${b.top-a.top}px)`}],{duration:180,easing:'cubic-bezier(.2,.8,.2,1)'}).finished.finally(()=>ghost.remove());
}
function animateLastServerMove(state,previousVersion){
  if(!previousVersion||Number(state.version)<=previousVersion)return;
  const last=state.move_history?.at?.(-1);if(!last?.from||!last?.to)return;
  animateGhost(last.from,last.to);
  if(last.piece==='k'&&Math.abs(last.from.charCodeAt(0)-last.to.charCodeAt(0))===2){
    const rank=last.from[1],kingSide=last.to[0]==='g';animateGhost((kingSide?'h':'a')+rank,(kingSide?'f':'d')+rank);
  }
  const targetPiece=$(`.square[data-sq="${last.to}"] .piece`);
  if(last.captured&&targetPiece)targetPiece.animate([{opacity:1,transform:'scale(1)'},{opacity:0,transform:'scale(.55) rotate(7deg)'}],{duration:150,easing:'ease-in'});
  if(last.captured&&last.piece==='p'&&!targetPiece){
    const ep=$(`.square[data-sq="${last.to[0]+last.from[1]}"] .piece`);
    ep?.animate([{opacity:1,transform:'scale(1)'},{opacity:0,transform:'scale(.5)'}],{duration:150});
  }
}
function syncRoomUi(){
  const code=serverGame?.invite_code||room;
  const strong=$('.room strong');if(strong)strong.textContent=code||'—';
  if(code)$('#share').value=`${location.origin}${location.pathname}?game=${encodeURIComponent(code)}`;
  const opponentId=serverGame&&(myColor==='w'?serverGame.black_player_id:serverGame.white_player_id);
  const opponentName=serverGame&&(myColor==='w'?serverGame.black_name:serverGame.white_name);
  const topName=currentBot?.display_name||currentBot?.name||opponentName||(opponentId?'Opponent connected':'Waiting for opponent');
  $('.player.top b').textContent=topName;
  const ownName=(currentProfile?.account&&(currentProfile.username||currentProfile.display_name))||guestName;
  $('.player.bottom b').textContent=`You · ${ownName}`;
  const opponentRating=myColor==='w'?serverGame?.black_rating_before:serverGame?.white_rating_before;
  const topRating=$('.player.top small');if(topRating)topRating.textContent='☆ '+(currentBot?.elo||opponentRating||1200);
  const bottomRating=$('.player.bottom small');if(bottomRating)bottomRating.textContent='☆ '+ratingFor(serverGame?.pool||'rapid');
}
function applyServerState(payload){
  const state=payload.game||payload;if(!state)return;
  const previousVersion=serverVersion,previousGameId=serverGameId;
  animateLastServerMove(state,previousGameId===state.id?previousVersion:0);
  serverGame=state;serverGameId=state.id||serverGameId;serverVersion=Number(state.version??serverVersion);
  currentPlayerId=payload.player?.id||currentPlayerId;currentBot=payload.bot||currentBot;
  myColor=seatFromEnvelope(payload,myColor);
  if(myColor&&!orientationSet){flipped=myColor==='b';orientationSet=true}
  clockSnapshot=createClockSnapshot(payload);
  if(state.fen){try{game.load(state.fen)}catch{}}
  syncRoomUi();render();updateMoves();
  if(state.draw_offer_by&&currentPlayerId&&state.draw_offer_by!==currentPlayerId&&lastDrawOffer!==state.draw_offer_by&&['active','playing','in_progress'].includes(state.status)){
    lastDrawOffer=state.draw_offer_by;
    setTimeout(async()=>{const accept=confirm('Your opponent offered a draw. Accept?');try{applyServerState(await api.drawRespond(serverGameId,accept))}catch(error){toast(error.message)}},60);
  }
  maybePlayBot();
}
async function refreshServerState(){if(!serverGameId)return;try{applyServerState(await api.state(serverGameId));await loadChat()}catch(error){toast(error.message)}}
async function maybePlayBot(){if(botThinking||!serverGame?.bot_player_id||game.isGameOver())return;const activePlayer=game.turn()==='w'?serverGame.white_player_id:serverGame.black_player_id;if(activePlayer!==serverGame.bot_player_id)return;botThinking=true;try{const move=await findEngineMove();if(!move)throw new Error('Stockfish 19 is required for the matched bot');applyServerState(await api.botMove(serverGameId,serverVersion,{from:move.from,to:move.to,promotion:move.promotion||undefined}))}catch(error){toast(error.message)}finally{botThinking=false}}
function saveAuthSession(session){
  authSession=session||null;
  if(authSession)localStorage.setItem('vanta.auth-session',JSON.stringify(authSession));else localStorage.removeItem('vanta.auth-session');
  api.accessToken=authSession?.access_token||undefined;
}
async function authFetch(path,body,token){
  const response=await fetch(SUPABASE_URL+path,{method:'POST',headers:{'content-type':'application/json',apikey:SUPABASE_PUBLISHABLE_KEY,...(token?{authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.msg||data.message||data.error_description||data.error||'Account request failed');
  return data;
}
async function refreshAuthSession(){
  if(!authSession?.refresh_token)return false;
  try{const next=await authFetch('/auth/v1/token?grant_type=refresh_token',{refresh_token:authSession.refresh_token});saveAuthSession(next);return true}catch{saveAuthSession(null);return false}
}
function ratingFor(pool='rapid'){return Number(currentProfile?.ratings?.[pool]??currentProfile?.rating??1200)}
function syncIdentityUI(){
  const signed=!!authSession?.access_token&&!!currentProfile?.account;
  const name=signed?(currentProfile.username||currentProfile.display_name||'Player'):guestName;
  const rating=ratingFor('rapid');
  const user=$('#accountBtn');if(user){user.querySelector('span').textContent=name;user.querySelector('small').textContent=rating+' rating'}
  const bottom=$('.player.bottom b');if(bottom)bottom.textContent='You · '+name;
  const bottomRating=$('.player.bottom small');if(bottomRating)bottomRating.textContent='☆ '+rating;
  $('#accountGuest')?.classList.toggle('hidden',signed);$('#accountSigned')?.classList.toggle('hidden',!signed);
  if(signed){
    $('#profileName').textContent=name;$('#profileRating').textContent=rating+' rapid';
    for(const pool of ['bullet','blitz','rapid','classical']){const el=$('#rating'+pool[0].toUpperCase()+pool.slice(1));if(el)el.textContent=ratingFor(pool)}
  }
}
async function loadProfile(){
  try{const out=await api.profile(guestName);currentProfile=out.player||out.profile||null;syncIdentityUI();return out}
  catch(error){
    if(error.status===401&&authSession&&await refreshAuthSession()){const out=await api.profile(guestName);currentProfile=out.player||out.profile||null;syncIdentityUI();return out}
    if(error.status===401&&authSession){saveAuthSession(null);currentProfile=null;syncIdentityUI()}
    throw error
  }
}
function openAccount(){syncIdentityUI();$('#accountDialog').showModal()}
async function connect(){try{await loadProfile();if(params.get('game')){const state=await api.join(room,guestName);applyServerState(state);await loadChat();toast(`Joined room ${room}`);startPolling()}}catch(error){toast(error.message)}}
function startPolling(){
  clearInterval(pollTimer);pollCount=0;
  pollTimer=setInterval(async()=>{
    if(document.hidden||!serverGameId)return;
    const started=performance.now();
    try{
      const payload=await api.heartbeat(serverGameId);
      latencyMs=Math.max(1,Math.round(performance.now()-started));
      const signal=$('#bottomSignal');if(signal)signal.textContent='▥ '+latencyMs+' ms';
      applyServerState(payload);
      if(++pollCount%2===0)await loadChat();
    }catch{const signal=$('#bottomSignal');if(signal)signal.textContent='▥ reconnecting…'}
  },1000)
}
function addMessage(text,mine=true){const e=document.createElement('p');e.className=mine?'mine':'';e.textContent=String(text).slice(0,160);$('#messages').append(e);e.scrollIntoView()}
async function loadChat(){if(!serverGameId)return;const data=await api.chatList(serverGameId);$('#messages').replaceChildren();for(const item of data.messages||[])addMessage(item.body,item.player_id===data.playerId)}
$('#chat').onsubmit=async e=>{e.preventDefault();const v=$('#message').value.trim();if(!v||v.length>160)return;if(!serverGameId)return toast('Start or join a game to chat');try{await api.chatSend(serverGameId,v);$('#message').value='';await loadChat()}catch(error){toast(error.message)}};
$$('.modes button').forEach(b=>b.onclick=async()=>{
  const next=b.dataset.mode;
  if(matchTimer){clearInterval(matchTimer);matchTimer=null}
  if(searching&&next!=='match'){searching=false;try{await api.queueLeave()}catch{}}
  $$('.modes button').forEach(x=>x.classList.remove('on'));b.classList.add('on');mode=next;setModeSettings(mode);
  if(mode==='computer'){serverGameId=null;serverGame=null;clockSnapshot=null;localGameOver=false;currentBot={display_name:'Stockfish 19',elo:Number($('#level').value)||1500};myColor='w';orientationSet=true;flipped=false;game.reset();resetLocalClock();syncRoomUi();render();updateMoves();toast('Computer mode ready')}
  if(mode==='room'){currentBot=null;localClockState=null;localGameOver=false;toast('Private-room mode ready')}
  if(mode==='match'){
    try{
      const rated=$('#level').value==='rated';
      if(rated&&!authSession?.access_token){openAccount();throw new Error('Sign in to start rated matchmaking')}
      searching=true;await api.queueJoin({seconds:Number($('#time').value),increment:0,rated});toast(rated?'Searching for a rated opponent…':'Searching for a player…');
      const started=Date.now();
      matchTimer=setInterval(async()=>{
        try{
          const state=await api.queueStatus($('#level').value==='rated');
          if(state.game||state.matched){clearInterval(matchTimer);matchTimer=null;searching=false;applyServerState(state);startPolling();showMovesView();toast(Date.now()-started>=15000?'Closest Elo engine matched':'Player matched')}
        }catch(error){clearInterval(matchTimer);matchTimer=null;searching=false;toast(error.message)}
      },1000);
    }catch(error){searching=false;toast(error.message)}
  }
});
$('#flip').onclick=()=>{flipped=!flipped;render()};$('#sound').onclick=e=>{e.currentTarget.dataset.off=e.currentTarget.dataset.off?'':'1';e.currentTarget.textContent=e.currentTarget.dataset.off?'♫ Sound off':'♫ Sound on'};$('#theme').onclick=()=>$('#themeStudio').showModal();$('#resign').onclick=async()=>{if(mode==='computer'&&!localGameOver){if(confirm('Resign this computer game?')){settleLocalClock();localGameOver=true;render();toast('You resigned')}}else if(serverGameId&&confirm('Resign this game?')){try{applyServerState(await api.resign(serverGameId))}catch(error){toast(error.message)}}else if(!serverGameId)toast('Start a game first')};$('#draw').onclick=async()=>{if(mode==='computer')return toast('Draw offers are available in multiplayer games');if(!serverGameId)return toast('Start a game first');try{applyServerState(await api.drawOffer(serverGameId));toast('Draw offer sent')}catch(error){toast(error.message)}};$('#copy').onclick=async()=>{await navigator.clipboard.writeText($('#share').value);toast('Room link copied')};$('#create').onclick=async()=>{const rated=$('#level').value==='rated';if(rated&&!authSession?.access_token){openAccount();return toast('Sign in is required for rated games')}try{const state=await api.create({name:(currentProfile?.username||guestName),seconds:Number($('#time').value),increment:0,rated});applyServerState(state);room=(state.game||state).invite_code;history.replaceState(null,'',`?game=${encodeURIComponent(room)}`);syncRoomUi();await loadChat();toast('Private room is ready');startPolling()}catch(error){toast(error.message)}};$('#join').onclick=()=>{const v=$('#roomInput').value.trim();if(v)location.search='?game='+encodeURIComponent(v)};$('#level').onchange=()=>{if(mode==='computer'){currentBot={display_name:'Stockfish 19',elo:Number($('#level').value)||1500};syncRoomUi();toast('Engine strength updated')}};
$('#time').onchange=e=>{if(game.history().length)return toast('Time control cannot change after the first move');clocks=initialClocks(Number(e.target.value));if(mode==='computer')resetLocalClock();else{$('#whiteClock').textContent=clockText(clocks.w);$('#blackClock').textContent=clockText(clocks.b)}};
const boardEl=$('#board');
boardEl.addEventListener('dragstart',event=>{
  const piece=event.target.closest?.('.piece'),square=piece?.closest?.('.square')?.dataset.sq;if(!square)return;
  const p=game.get(square);if(!p||localGameOver||game.isGameOver()||(serverGameId&&myColor&&myColor!==game.turn())||(mode==='computer'&&game.turn()!=='w')||p.color!==game.turn()){event.preventDefault();return}
  selected=square;event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',square);render();
});
boardEl.addEventListener('dragover',event=>{
  const to=event.target.closest?.('.square')?.dataset.sq;if(selected&&to&&game.moves({square:selected,verbose:true}).some(m=>m.to===to)){event.preventDefault();event.dataTransfer.dropEffect='move'}
});
boardEl.addEventListener('drop',event=>{
  const to=event.target.closest?.('.square')?.dataset.sq;if(!selected||!to)return;event.preventDefault();clickSquare(to,game.get(to));
});
boardEl.addEventListener('dragend',()=>{if(selected){selected=null;render()}});
render();startClock();connect();

if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js'));

function escapeHtml(value=''){return String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
function currentHistory(){return serverGameId&&Array.isArray(serverGame?.move_history)?serverGame.move_history.map(x=>x.san||x.lan||''):game.history()}
function updateOpeningLabel(){
  const opening=detectOpening(currentHistory());
  const state=$('#state');if(!state)return;
  const base=game.inCheck()?'Check · Real time':(serverGame?.rated?'Real time · Rated game':'Real time · Casual game');
  state.textContent=opening?`${base} · ${opening.name}`:base;
}
function formatPv(pv=''){
  try{
    const position=new Chess(game.fen()),out=[];
    for(const token of pv.trim().split(/\s+/).slice(0,8)){
      const move=position.move({from:token.slice(0,2),to:token.slice(2,4),promotion:token[4]});
      if(!move)break;out.push(move.san);
    }
    return out.join(' ');
  }catch{return pv}
}
function updateAnalysisFromUci(text){
  const depth=Number(text.match(/\bdepth (\d+)/)?.[1]||0);
  const scoreMatch=text.match(/\bscore (cp|mate) (-?\d+)/);
  const pv=text.match(/\bpv (.+)$/)?.[1]||'';
  if(scoreMatch){
    let score=scoreMatch[1]==='mate'?(Number(scoreMatch[2])>0?99:-99):Number(scoreMatch[2])/100;
    if(game.turn()==='b')score=-score;
    analysisScore=Math.max(-99,Math.min(99,score));
    const scoreEl=$('#score');if(scoreEl)scoreEl.textContent=(analysisScore>=0?'+':'')+(Math.abs(analysisScore)>=90?'M'+Math.abs(Number(scoreMatch[2])||1):analysisScore.toFixed(1));
    const fill=$('#meterFill');if(fill)fill.style.width=(50+Math.max(-45,Math.min(45,analysisScore*8)))+'%';
    const advantage=$('#advantage');if(advantage)advantage.textContent=Math.abs(analysisScore)<.2?'Equal position':analysisScore>0?'Advantage for White':'Advantage for Black';
    updateMoves();
  }
  const depthEl=$('#depth');if(depthEl&&depth)depthEl.textContent=String(depth);
  const line=$('#line');if(line&&pv)line.textContent=formatPv(pv);
}
function scheduleAnalysis(){
  clearTimeout(analysisTimer);
  if(mode==='puzzle'||(serverGame?.rated&&serverGame?.status==='active'&&!serverGame?.bot_player_id))return;
  analysisTimer=setTimeout(()=>{if(!botThinking)analysisWorker.postMessage({fen:game.fen(),elo:3190,movetime:280})},220);
}
function showMovesView(){
  currentRightView='moves';$('#movesView')?.classList.remove('hidden');$('#dynamicView')?.classList.add('hidden');
  $$('.tabs button').forEach(b=>b.classList.toggle('on',b.dataset.tab==='moves'));
  updateMoves();scheduleAnalysis();
}
function setDynamicView(kind,title,html){
  currentRightView=kind;
  $('#movesView')?.classList.add('hidden');
  const target=$('#dynamicView');target.classList.remove('hidden');target.innerHTML=`<div class="view-title"><button class="back-view">←</button><div><small>VANTA CHESS</small><h3>${escapeHtml(title)}</h3></div></div><div class="view-content">${html}</div>`;
  target.querySelector('.back-view').onclick=showMovesView;
  $$('.tabs button').forEach(b=>b.classList.toggle('on',b.dataset.tab===kind));
}
function studyBoardHtml(fen){
  const position=new Chess(fen),pieces=position.board().flat();
  return `<div class="study-board">${pieces.map((p,i)=>{
    const r=Math.floor(i/8),f=i%8;
    return `<div class="study-square ${(r+f)%2?'dark':'light'}">${p?`<span class="piece ${p.color} piece-${p.type}" aria-hidden="true"></span>`:''}</div>`;
  }).join('')}</div>`;
}
function legalStudyPositions(moves=[]){
  const position=new Chess(),states=[{fen:position.fen(),san:'Start'}];
  for(const san of moves){
    try{const move=position.move(san);if(!move)break;states.push({fen:position.fen(),san:move.san})}catch{break}
  }
  return states;
}
function renderStudy(kind,title,moves,meta=''){
  const states=legalStudyPositions(moves);let index=0;
  setDynamicView(kind,title,`<div class="study-shell"><div id="studyBoardSlot">${studyBoardHtml(states[0].fen)}</div><div class="study-meta"><small>${escapeHtml(meta)}</small><b id="studyPly">Start position</b><span id="studyCount">0 / ${Math.max(0,states.length-1)}</span></div><div class="study-controls"><button id="studyFirst">|←</button><button id="studyPrev">← Previous</button><button id="studyNext">Next →</button><button id="studyLast">→|</button></div><div class="study-moves">${moves.map((m,i)=>`<button data-ply="${i+1}">${i%2===0?Math.floor(i/2)+1+'. ':''}${escapeHtml(m)}</button>`).join('')}</div></div>`);
  const update=()=>{
    $('#studyBoardSlot').innerHTML=studyBoardHtml(states[index].fen);
    $('#studyPly').textContent=index?states[index].san:'Start position';
    $('#studyCount').textContent=`${index} / ${states.length-1}`;
    $$('.study-moves button').forEach((b,i)=>b.classList.toggle('current',i+1===index));
  };
  $('#studyFirst').onclick=()=>{index=0;update()};
  $('#studyPrev').onclick=()=>{index=Math.max(0,index-1);update()};
  $('#studyNext').onclick=()=>{index=Math.min(states.length-1,index+1);update()};
  $('#studyLast').onclick=()=>{index=states.length-1;update()};
  $$('.study-moves button').forEach(b=>b.onclick=()=>{index=Math.min(states.length-1,Number(b.dataset.ply));update()});
}
function renderOpenings(){
  const current=detectOpening(currentHistory());
  setDynamicView('openings','Opening Explorer',`
    ${current?`<article class="current-opening"><small>CURRENT POSITION</small><h4>${escapeHtml(current.name)} <span>${current.eco}</span></h4><p>${escapeHtml(current.idea)}</p></article>`:''}
    <div class="library-list">${OPENINGS.map((o,i)=>`<article><div><b>${escapeHtml(o.name)}</b><small>${o.eco} · ${o.line.join(' ')}</small></div><p>${escapeHtml(o.idea)}</p><button class="library-action" data-opening="${i}">Study this line</button></article>`).join('')}</div>`);
  $$('#dynamicView [data-opening]').forEach(b=>b.onclick=()=>{const o=OPENINGS[Number(b.dataset.opening)];renderStudy('openings',o.name,o.line,`${o.eco} · ${o.idea}`)});
}
function renderFamous(){
  setDynamicView('famous','Famous Games',`<div class="library-list famous-list">${FAMOUS_GAMES.map((g,i)=>`<article><div><b>${escapeHtml(g.title)}</b><small>${escapeHtml(g.players)} · ${g.place} ${g.year}</small></div><p><strong>${g.result}</strong> · ${escapeHtml(g.opening)} — ${escapeHtml(g.lesson)}</p><button class="library-action" data-famous="${i}">Replay game</button></article>`).join('')}</div>`);
  $$('#dynamicView [data-famous]').forEach(b=>b.onclick=()=>{const g=FAMOUS_GAMES[Number(b.dataset.famous)];renderStudy('famous',g.title,g.moves,`${g.players} · ${g.year} · ${g.result}`)});
}
function renderLesson(index){
  const lesson=LESSONS[index];
  setDynamicView('learn',lesson.title,`<article class="lesson-detail"><small>${escapeHtml(lesson.level)}</small><h4>${escapeHtml(lesson.title)}</h4><p>${escapeHtml(lesson.body)}</p><div class="lesson-checklist"><b>Training focus</b><span>✓ Identify the position goal before calculating.</span><span>✓ Compare forcing moves: checks, captures and threats.</span><span>✓ Explain the move in words before playing it.</span></div><button class="primary-action start-puzzle">Practice with a live puzzle</button><button class="secondary-action all-lessons">Back to lessons</button></article>`);
  $('#dynamicView .start-puzzle').onclick=()=>showBackendView('puzzle');
  $('#dynamicView .all-lessons').onclick=renderLearn;
}
function renderLearn(){
  setDynamicView('learn','Practice & Learn',`<div class="lesson-grid">${LESSONS.map((l,i)=>`<article><small>${escapeHtml(l.level)}</small><h4>${escapeHtml(l.title)}</h4><p>${escapeHtml(l.body)}</p><button data-lesson="${i}">Study lesson</button></article>`).join('')}</div><button class="primary-action start-puzzle">Start a live puzzle</button>`);
  $$('#dynamicView [data-lesson]').forEach(b=>b.onclick=()=>renderLesson(Number(b.dataset.lesson)));
  $('#dynamicView .start-puzzle').onclick=()=>showBackendView('puzzle');
}
function renderReview(){
  const records=serverGame?.move_history||[],sans=records.map(x=>x.san||x.lan||'').filter(Boolean),captures=records.filter(x=>x.captured).length,checks=records.filter(x=>String(x.san||'').includes('+')).length;
  const opening=detectOpening(sans);
  setDynamicView('review','Post-Game Review',`<div class="review-summary"><div><b>${records.length}</b><small>plies played</small></div><div><b>${captures}</b><small>captures</small></div><div><b>${checks}</b><small>checks</small></div><div><b>${analysisScore>=0?'+':''}${analysisScore.toFixed(1)}</b><small>current eval</small></div></div><article class="review-note"><h4>${opening?escapeHtml(opening.name):'Unclassified opening'}</h4><p>${opening?escapeHtml(opening.idea):'Play a few moves to identify the opening family.'}</p></article><button class="primary-action analyze-now">Analyze current position</button>${sans.length?'<button class="secondary-action replay-review">Replay every move</button>':''}`);
  $('#dynamicView .analyze-now').onclick=()=>{showMovesView();scheduleAnalysis()};
  const replay=$('#dynamicView .replay-review');if(replay)replay.onclick=()=>renderStudy('review','Game Replay',sans,opening?opening.name:'Current game');
}
async function showBackendView(kind){
  if(kind==='puzzle'){
    setDynamicView('puzzles','Puzzle Training','<div class="loading-card">Loading a real tactical position…</div>');
    try{
      const data=await api.puzzleNext('normal',1400),puzzle=data.puzzle||data;
      game.load(puzzle.fen);mode='puzzle';serverGameId=null;clockSnapshot=null;
      puzzleSession={id:puzzle.id||puzzle.puzzleId,solution:puzzle.solution||puzzle.moves||[],index:0,played:[],started:Date.now()};
      render();
      $('#dynamicView .view-content').innerHTML=`<article class="puzzle-info"><small>LIVE PUZZLE · ${puzzle.rating||'—'} RATING</small><h4>Find the best continuation</h4><p>${escapeHtml((puzzle.themes||[]).join(' · ')||'Tactical training')}</p><div class="puzzle-progress">Move <b>1</b> of ${Math.max(1,Math.ceil((puzzleSession.solution.length||1)/2))}</div><button class="primary-action next-puzzle">Next puzzle</button></article>`;
      $('#dynamicView .next-puzzle').onclick=()=>showBackendView('puzzle');
    }catch(error){toast(error.message);showMovesView()}
    return;
  }
  if(kind==='arena'){
    setDynamicView('arena','Arena','<div class="loading-card">Loading live Vanta tournaments…</div>');
    try{
      const data=await api.tournaments(),events=data.tournaments||data.events||[];
      const target=$('#dynamicView .view-content');
      target.innerHTML=`<div class="arena-list">${events.map((t,i)=>`<article data-arena="${i}"><div><small>${t.rated?'RATED':'CASUAL'} · ${escapeHtml(t.pool||'arena')}</small><h4>${escapeHtml(t.name||t.title||'Arena')}</h4><p>${Number(t.base_seconds||600)/60}+${t.increment_seconds||0} · ${t.status||'active'}</p></div><div><button class="arena-join">Join</button><button class="arena-standings">Standings</button></div><section class="standings-slot"></section></article>`).join('')}</div>`;
      [...target.querySelectorAll('[data-arena]')].forEach((row,i)=>{
        const t=events[i];
        row.querySelector('.arena-join').onclick=async()=>{try{await api.tournamentJoin(t.id);await api.queueJoin({seconds:Number(t.base_seconds||600),increment:Number(t.increment_seconds||0),rated:!!t.rated,tournamentId:t.id});mode='match';toast('Arena queue joined');const timer=setInterval(async()=>{try{const state=await api.queueStatus(!!t.rated);if(state.game||state.matched){clearInterval(timer);applyServerState(state);startPolling();showMovesView();toast('Arena match found')}}catch(error){clearInterval(timer);toast(error.message)}},1000)}catch(error){toast(error.message)}};
        row.querySelector('.arena-standings').onclick=async()=>{try{const result=await api.tournamentStandings(t.id),slot=row.querySelector('.standings-slot');slot.innerHTML=(result.standings||[]).slice(0,10).map(p=>`<p>${p.rank||'–'}. ${escapeHtml(p.display_name||p.name||'Player')} <b>${p.score||0}</b></p>`).join('')||'<p>No scores yet.</p>'}catch(error){toast(error.message)}};
      });
    }catch(error){toast(error.message);showMovesView()}
  }
}
function activateNav(kind){
  $$('.main-nav button').forEach(b=>b.classList.toggle('active',b.dataset.nav===kind));
  if(kind==='play')showMovesView();
  if(kind==='arena')showBackendView('arena');
  if(kind==='puzzles')showBackendView('puzzle');
  if(kind==='learn')renderLearn();
  if(kind==='openings')renderOpenings();
  if(kind==='famous')renderFamous();
  if(kind==='review')renderReview();
}
$$('.main-nav button').forEach(button=>button.onclick=()=>activateNav(button.dataset.nav));
$$('.feature-card').forEach(button=>button.onclick=()=>activateNav(button.dataset.action));
$$('.tabs button').forEach(button=>button.onclick=()=>{const kind=button.dataset.tab;if(kind==='moves')showMovesView();if(kind==='analysis'){showMovesView();document.querySelector('.analysis')?.scrollIntoView({block:'nearest'})}if(kind==='openings')renderOpenings();if(kind==='famous')renderFamous()});
$('#openChat').onclick=()=>{$('#chatDrawer').classList.add('open');$('#chatDrawer').setAttribute('aria-hidden','false');loadChat()};
$('#closeChat').onclick=()=>{$('#chatDrawer').classList.remove('open');$('#chatDrawer').setAttribute('aria-hidden','true')};
$('#accountBtn').onclick=openAccount;
$('[data-auth]').forEach(button=>button.onclick=()=>{
  authMode=button.dataset.auth;$('[data-auth]').forEach(x=>x.classList.toggle('on',x===button));
  $('#usernameField').classList.toggle('hidden',authMode!=='signup');$('#authSubmit').textContent=authMode==='signup'?'Create account':'Sign in';$('#authMessage').textContent='';
});
$('#authSubmit').onclick=async()=>{
  const email=$('#authEmail').value.trim(),password=$('#authPassword').value,username=$('#authUsername').value.trim(),message=$('#authMessage');
  message.textContent='';if(!email||password.length<6){message.textContent='Enter a valid email and a password of at least 6 characters.';return}
  try{
    let session;
    if(authMode==='signup'){
      if(!/^[A-Za-z0-9_]{3,20}$/.test(username)){message.textContent='Username must be 3–20 letters, numbers, or underscores.';return}
      const made=await authFetch('/auth/v1/signup',{email,password,data:{username}});
      session=made.access_token?made:null;
      if(!session){message.textContent='Account created. Confirm your email, then sign in.';return}
    }else session=await authFetch('/auth/v1/token?grant_type=password',{email,password});
    saveAuthSession(session);await loadProfile();syncIdentityUI();message.textContent='Signed in.';setTimeout(()=>$('#accountDialog').close(),450);
  }catch(error){message.textContent=error.message}
};
$('#signOutBtn').onclick=async()=>{try{if(authSession?.access_token)await authFetch('/auth/v1/logout',null,authSession.access_token)}catch{}saveAuthSession(null);currentProfile=null;await loadProfile().catch(()=>{});syncIdentityUI();$('#accountDialog').close();toast('Signed out')};
$('#searchBtn').onclick=()=>{$('#searchDialog').showModal();$('#searchInput').focus()};
$('#searchInput').oninput=e=>{
  const q=e.target.value.trim().toLowerCase(),target=$('#searchResults');if(!q){target.innerHTML='';return}
  const results=[
    ...OPENINGS.filter(x=>(x.name+' '+x.eco+' '+x.idea).toLowerCase().includes(q)).map(x=>({type:'Opening',title:x.name,sub:x.idea,action:'openings'})),
    ...FAMOUS_GAMES.filter(x=>(x.title+' '+x.players+' '+x.opening).toLowerCase().includes(q)).map(x=>({type:'Famous game',title:x.title,sub:x.players,action:'famous'})),
    ...LESSONS.filter(x=>(x.title+' '+x.body).toLowerCase().includes(q)).map(x=>({type:'Lesson',title:x.title,sub:x.level,action:'learn'}))
  ].slice(0,8);
  target.innerHTML=results.map((r,i)=>`<button data-result="${i}"><small>${r.type}</small><b>${escapeHtml(r.title)}</b><span>${escapeHtml(r.sub)}</span></button>`).join('')||'<p>No results yet.</p>';
  [...target.querySelectorAll('[data-result]')].forEach((b,i)=>b.onclick=()=>{$('#searchDialog').close();activateNav(results[i].action)});
};
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;$('#installBtn').classList.add('ready')});
$('#installBtn').onclick=async()=>{if(installPrompt){installPrompt.prompt();await installPrompt.userChoice;installPrompt=null}else toast('Use your browser menu to install Vanta Chess')};
$('#notifyBtn').onclick=()=>toast('Game notifications will appear here');
const savedTheme=JSON.parse(localStorage.getItem('vanta.theme')||'{}');document.documentElement.style.setProperty('--white-piece',savedTheme.whitePiece||'#f0d9a4');document.documentElement.style.setProperty('--black-piece',savedTheme.blackPiece||'#342019');document.documentElement.style.setProperty('--piece-tint',String(savedTheme.pieceTint??.18));
for(const [key,value] of Object.entries(savedTheme)){if(key==='wallpaper')document.body.dataset.wallpaper=value;else document.documentElement.style.setProperty(key,value)}
$$('[data-theme]').forEach(input=>input.oninput=()=>{const value=input.type==='range'?(input.dataset.theme==='--glass'?`${input.value/100}`:`${input.value/100}s`):input.value;document.documentElement.style.setProperty(input.dataset.theme,value);savedTheme[input.dataset.theme]=value;localStorage.setItem('vanta.theme',JSON.stringify(savedTheme))});
$('#whitePiece').value=savedTheme.whitePiece||'#f0d9a4';$('#blackPiece').value=savedTheme.blackPiece||'#342019';$('#pieceTint').value=Math.round((savedTheme.pieceTint??.18)*100);$('#whitePiece').oninput=e=>{savedTheme.whitePiece=e.target.value;document.documentElement.style.setProperty('--white-piece',e.target.value);localStorage.setItem('vanta.theme',JSON.stringify(savedTheme))};$('#blackPiece').oninput=e=>{savedTheme.blackPiece=e.target.value;document.documentElement.style.setProperty('--black-piece',e.target.value);localStorage.setItem('vanta.theme',JSON.stringify(savedTheme))};$('#pieceTint').oninput=e=>{savedTheme.pieceTint=Number(e.target.value)/100;document.documentElement.style.setProperty('--piece-tint',String(savedTheme.pieceTint));localStorage.setItem('vanta.theme',JSON.stringify(savedTheme))};$('#wallpaper').onchange=e=>{document.body.dataset.wallpaper=e.target.value;savedTheme.wallpaper=e.target.value;localStorage.setItem('vanta.theme',JSON.stringify(savedTheme))};
$('#closeTheme').onclick=()=>$('#themeStudio').close();
