import './style.css';
import { Chess } from 'chess.js';
import { createClient } from '@supabase/supabase-js';
import { VchApi, stableGuestToken } from './vch-api.js';
import { initialClocks, normalizeRoomId } from './game-config.js';
import { createClockSnapshot, projectedClocks, seatFromEnvelope } from './server-state.js';
import { OPENINGS, FAMOUS_GAMES, LESSONS, detectOpening } from './content.js';
import { REVIEW_DEPTH, CLASSIFICATION_META, accuracyFromLosses, classificationAsset, classifyMove, formatMoveDuration, winPercentageLoss } from './review.js';

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const params=new URLSearchParams(location.search), generatedRoom=Math.random().toString(36).slice(2,10).toUpperCase();
const directGame=Boolean(params.get('game'));
const introSeen=localStorage.getItem('vch.intro-seen')==='1';
const startsInGame=directGame||introSeen;
let room=normalizeRoomId(params.get('game'),generatedRoom);
const playerToken=stableGuestToken();
const api=new VchApi({token:playerToken});
const SUPABASE_URL='https://ubjldcfiwrwiouwgmduo.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_q3KU0sdaVKOeMcLND2D15Q_Qsu2X5pN';
const realtimeClient=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
let authSession=JSON.parse(localStorage.getItem('vanta.auth-session')||'null'),currentProfile=null,authMode='signin';
if(authSession?.access_token)api.accessToken=authSession.access_token;
const guestName=`Guest-${playerToken.slice(-4).toUpperCase()}`;
const game=new Chess(); let selected=null, flipped=false, mode='room', myColor=null, ticking, enginePending, serverGameId=null, serverVersion=0, pollTimer, clockSnapshot=null, serverGame=null, botThinking=false, puzzleSession=null, currentPlayerId=null, orientationSet=false, lastAnimatedVersion=0, lastDrawOffer=null, pollCount=0, currentBot=null, latencyMs=null, realtimeChannel=null, realtimeGameId=null, realtimeReady=false, realtimePingTimer=null, pingProbe=null, realtimeRefreshPromise=null, installPrompt=null, currentRightView='moves', analysisTimer=null, analysisScore=0, matchTimer=null, searching=false, localClockState=null, localGameOver=false, roomCreated=false, computerStarted=false, computerSideChoice='w', computerSide='w', botsLoaded=false, selectedComputerBotSlug='gambit';
let matchSelection={seconds:600,increment:0,rated:false};
const DEFAULT_COMPUTER_BOTS=[
  {slug:'scout',display_name:'Scout',elo:900,portrait:'bn'},
  {slug:'forge',display_name:'Forge',elo:1200,portrait:'bb'},
  {slug:'gambit',display_name:'Gambit',elo:1500,portrait:'br'},
  {slug:'cipher',display_name:'Cipher',elo:1800,portrait:'bq'},
  {slug:'oracle',display_name:'Oracle',elo:2200,portrait:'bk'},
  {slug:'legend',display_name:'Legend',elo:2700,portrait:'bp'}
];
let computerBots=DEFAULT_COMPUTER_BOTS.map(bot=>({...bot}));
let moveEvalByPly=[],moveTimeByPly=[];
let reviewState={running:false,viewing:false,currentPly:0,signature:'',token:0,positions:[],moves:[],evaluations:[],results:[]};
let reviewPending=null;
const stockfish=new Worker('/stockfish.worker.js');
const analysisWorker=new Worker('/stockfish.worker.js');
const reviewWorker=new Worker('/stockfish.worker.js');
stockfish.onmessage=({data})=>{
  if(data.type==='uci'&&String(data.line||'').startsWith('bestmove ')&&enginePending){const u=String(data.line).split(' ')[1];enginePending(u);enginePending=null}
  if(data.type==='unavailable'&&enginePending){enginePending(null);enginePending=null}
};
analysisWorker.onmessage=({data})=>{
  if(data.type==='uci'&&String(data.line||'').startsWith('info '))updateAnalysisFromUci(String(data.line));
  if(data.type==='unavailable'){const line=$('#line');if(line)line.textContent='Stockfish 19 unavailable in this browser.'}
};
reviewWorker.onmessage=({data})=>{
  if(!reviewPending||data.requestId!==reviewPending.id)return;
  const line=String(data.line||'');
  if(data.type==='uci'&&line.startsWith('info ')){
    const parsed=parseReviewInfo(line,reviewPending.fen);
    if(parsed)reviewPending.latest=parsed;
    return;
  }
  if(data.type==='uci'&&line.startsWith('bestmove ')){
    const pending=reviewPending;reviewPending=null;clearTimeout(pending.timer);
    const bestMove=line.split(/\s+/)[1]||pending.latest?.bestMove||'';
    pending.resolve({...pending.latest,bestMove});
    return;
  }
  if(data.type==='unavailable'){
    const pending=reviewPending;reviewPending=null;clearTimeout(pending.timer);
    pending.reject(new Error(data.message||'Stockfish 19 is unavailable'));
  }
};
const pieceNames={k:'king',q:'queen',r:'rook',b:'bishop',n:'knight',p:'pawn'};
const pieceStyles=new Set(['vanta-3d','vanta-2d','staunton-3d','staunton-2d']);
function normalizePieceStyle(value){
  if(value==='3d'||value==='2d')return 'vanta-3d';
  return pieceStyles.has(value)?value:'vanta-3d';
}
document.documentElement.dataset.pieceStyle='vanta-3d';
function pieceAsset(name){
  const style=normalizePieceStyle(document.documentElement.dataset.pieceStyle);
  const folder=style.endsWith('2d')?'2d':'3d';
  return `/assets/vch/pieces/${folder}/${name}.webp`;
}
function applyPieceStyle(value){
  const style=normalizePieceStyle(value);
  document.documentElement.dataset.pieceStyle=style;
  const control=$('#pieceStyle');if(control)control.value=style;
  const menuPiece=$('.main-menu-art img');if(menuPiece)menuPiece.src=pieceAsset('bk');
  renderComputerBots();
  return style;
}
const app=$('#app');
app.innerHTML=`
<div id="brandSplash" class="brand-splash" aria-hidden="true">
  <div class="brand-splash-wordmark"><img src="/assets/vch/brand/vch-metal.svg" alt=""></div>
</div>
<div class="shell ${startsInGame?'game-active':'intro-active'}">
  <header class="topbar">
    <a class="brand vch-brand" href="#" aria-label="VCH home">
      <img class="vch-wordmark vch-wordmark-top" src="/assets/vch/brand/vch-metal.svg" alt="VCH">
    </a>
    <nav class="main-nav" aria-label="Primary">
      <button class="active" data-nav="play"><span class="nav-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 18 17 6M8 5l2.4 2.4M5 8l2.4 2.4M14.5 14.5 19 19M16.5 16.5 19 14"/></svg></span>Play</button>
      <button data-nav="arena"><span class="nav-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8v5a4 4 0 0 1-8 0V4Z"/><path d="M8 6H5v2a4 4 0 0 0 4 4M16 6h3v2a4 4 0 0 1-4 4M12 13v5M8 21h8M9 18h6"/></svg></span>Arena</button>
      <button data-nav="puzzles"><span class="nav-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h6v4.2a2.8 2.8 0 1 0 4 0V4h6v6h-4.2a2.8 2.8 0 1 0 0 4H20v6h-6v-4.2a2.8 2.8 0 1 0-4 0V20H4v-6h4.2a2.8 2.8 0 1 0 0-4H4V4Z"/></svg></span>Puzzles</button>
      <button data-nav="learn"><span class="nav-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 5.5A3.5 3.5 0 0 1 7 2h4v18H7a3.5 3.5 0 0 0-3.5 3V5.5ZM20.5 5.5A3.5 3.5 0 0 0 17 2h-4v18h4a3.5 3.5 0 0 1 3.5 3V5.5Z"/></svg></span>Learn</button>
      <button data-nav="openings"><span class="nav-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3h3v3h2V3h3v3h2v4l-2 2v5H8v-5l-2-2V6h2V3ZM6 20h12M8 17h8"/></svg></span>Openings</button>
      <button data-nav="famous"><span class="nav-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3v18M12 8h4M12 12h4M12 16h3"/></svg></span>Famous Games</button>
      <button data-nav="review"><span class="nav-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="m8 12 2.8 2.8L16.8 9"/></svg></span>Review</button>
    </nav>
    <div class="header-actions">
      <button id="searchBtn" class="icon-btn search-btn" aria-label="Search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.7" cy="10.7" r="6.3"/><path d="m16 16 4.2 4.2"/></svg></button>
      <button id="installBtn" class="install-btn"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v11M8 10l4 4 4-4M5 18v2h14v-2"/></svg><span>Install App</span></button>
      <button id="notifyBtn" class="icon-btn bell-btn" aria-label="Notifications"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 5-2 6.5-3 8h18c-1-1.5-3-3-3-8M10 21h4"/></svg></button>
      <button id="accountBtn" class="user" type="button" aria-label="Account">
        <i aria-hidden="true"></i><span>${guestName}</span><small>1200 rating</small>
        <svg class="account-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m8 10 4 4 4-4"/></svg>
      </button>
    </div>
  </header>

  <section id="mainMenu" class="main-menu" aria-labelledby="mainMenuTitle" aria-hidden="${startsInGame?'true':'false'}">
    <div class="main-menu-tagline">Play <span>/</span> Improve <span>/</span> Belong</div>
    <div class="main-menu-hero">
      <div class="main-menu-copy">
        <img class="main-menu-wordmark" src="/assets/vch/brand/vch-metal.svg" alt="VCH">
        <h1 id="mainMenuTitle">Play Better<br>Chess</h1>
        <p class="main-menu-subtext">Competitive games. Real progress. A community that thinks ahead.</p>
        <button id="joinNow" class="join-now" type="button"><span>Join Now</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 12h10M13 8l4 4-4 4"/></svg></button>
      </div>
      <div class="main-menu-art" aria-hidden="true">
        <div class="main-menu-art-glow"></div>
        <img src="/assets/vch/pieces/3d/bk.webp" alt="">
      </div>
    </div>
    <div class="main-menu-tiles" aria-label="VCH features">
      <article class="menu-tile">
        <span class="menu-tile-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M13 2 6 13h5l-1 9 8-12h-5l0-8Z"/></svg></span>
        <div><h2>Rapid &amp; Blitz</h2></div>
      </article>
      <article class="menu-tile">
        <span class="menu-tile-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 4h8v5a4 4 0 0 1-8 0V4Z"/><path d="M8 6H5v2a4 4 0 0 0 4 4M16 6h3v2a4 4 0 0 1-4 4M12 13v5M8 21h8"/></svg></span>
        <div><h2>Tournaments</h2></div>
      </article>
      <article class="menu-tile">
        <span class="menu-tile-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 18V10M10 18V6M15 18v-5M20 18V3"/></svg></span>
        <div><h2>Ratings</h2></div>
      </article>
      <article class="menu-tile">
        <span class="menu-tile-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM16 11a3 3 0 1 0 0-6M2 20c0-4 2.7-6 6-6s6 2 6 6M14 14c4 0 7 1.8 7 6"/></svg></span>
        <div><h2>Community</h2></div>
      </article>
    </div>
  </section>

  <main id="gameWorkspace" aria-hidden="${startsInGame?'false':'true'}">
    <aside class="lpanel panel">\n      <div class="hero">\n        <div class="hero-art" aria-hidden="true"><img src="/assets/vch/ui/hero-knight.webp" alt=""></div>\n        <label>LIVE CHESS</label>\n        <h1>Play your<br>next game.</h1>\n        <p>Guest play is instant. Rated games save your Elo and tournament record.</p>\n      </div>\n\n      <div class="modes" aria-label="Play mode">\n        <button data-mode="match"><span>Match</span></button>\n        <button data-mode="room" class="on"><span>Room</span></button>\n        <button data-mode="computer"><span>Computer</span></button>\n      </div>\n\n      <div class="mode-stage">\n        <section class="mode-view match-view" data-mode-view="match" aria-hidden="true">\n          <div class="mode-heading"><small class="mode-kicker">QUICK MATCH</small><h3>Find your next opponent.</h3><p>Choose a clock and queue for the closest available player.</p></div>\n          <div class="time-chips" aria-label="Match time control">\n            <button data-match-time="60-0">1+0</button><button data-match-time="180-0">3+0</button><button data-match-time="300-0">5+0</button><button class="on" data-match-time="600-0">10+0</button><button data-match-time="900-10">15+10</button>\n          </div>\n          <div class="rated-switch" aria-label="Match type"><button class="on" data-match-rated="false">Casual</button><button data-match-rated="true">Rated</button></div>\n          <button class="gold match-action" id="findOpponent"><span id="findOpponentLabel">Find opponent</span></button>\n          <div id="matchSearch" class="match-search hidden" aria-live="polite"><span class="search-pulse" aria-hidden="true"></span><div><b>Searching the pool</b><small>Expanding the Elo window while you wait.</small></div></div>\n          <div class="online-count"><b id="playersOnline">—</b> players online</div>\n        </section>\n\n        <section class="mode-view room-view active" data-mode-view="room" aria-hidden="false">\n          <div class="private-card"><div><h3>Create a private room</h3><p>Generate a shareable game link instantly.</p><small>Guests can join casual rooms without an account.</small></div></div>\n          <label class="tiny">GAME SETTINGS</label>\n          <div class="settings">\n            <label><span>Time control</span><select id="time"><option value="600">10+0 Rapid</option><option value="300">5+0 Blitz</option><option value="180">3+0 Blitz</option></select></label>\n            <label><span>Room type</span><select id="level"><option value="casual">Casual — Guest OK</option><option value="rated">Rated — Account required</option></select></label>\n          </div>\n          <button class="gold" id="create"><span>Create room & get link</span></button>\n          <div class="divider">or join an existing room</div>\n          <div class="join"><input id="roomInput" placeholder="Enter room code" maxlength="12"><button id="join">Join room</button></div>\n          <div class="room room-created hidden"><small>ROOM CODE</small><strong>${room}</strong><em>Ready</em><p>Share this link</p><div><input id="share" readonly value="${location.origin+location.pathname}?game=${room}"><button id="copy" aria-label="Copy room link">Copy</button></div><small class="room-note">Keep this tab open. Your opponent can enter from any modern browser.</small></div>\n        </section>\n\n        <section class="mode-view computer-view" data-mode-view="computer" aria-hidden="true">\n          <div class="mode-heading"><small class="mode-kicker">PLAY STOCKFISH</small><h3>Choose your opponent.</h3><p>Each personality uses Stockfish 19 at a different target strength.</p></div>\n          <div id="botGrid" class="bot-grid" aria-label="Computer opponents"></div>\n          <div class="computer-side" aria-label="Play as"><button class="on" data-computer-side="w">White</button><button data-computer-side="b">Black</button><button data-computer-side="random">Random</button></div>\n          <button class="gold computer-start" id="computerStart"><span>Start game</span></button>\n          <p class="computer-note">The board resets when you start. Choose Black and the engine moves first.</p>\n        </section>\n      </div>\n    </aside>\n    <section class="game">
      <div class="player top" data-player-bar="opponent">
        <span class="avatar" id="topAvatar">OP</span>
        <div class="player-info">
          <div class="player-name-row"><b id="topPlayerName">Waiting for opponent</b><span class="player-flag hidden" id="topFlag" aria-hidden="true"></span></div>
          <div class="player-meta"><span class="player-rating" id="topRating">1200</span><span class="player-presence" id="topPresence"><i class="live-dot" aria-hidden="true"></i><span>WAITING</span></span></div>
        </div>
        <time id="topClock" data-color="b">10:00</time>
      </div>
      <div class="board-shell">
        <div id="reviewEvalBar" class="review-eval-bar hidden" aria-label="Review evaluation"><div><i id="reviewEvalFill"></i></div><span id="reviewEvalText">0.0</span></div>
        <div id="rankCoords" class="board-coords board-ranks" aria-hidden="true"></div>
        <div id="board" class="board" aria-label="Chess board"></div>
        <svg id="reviewArrows" class="review-arrows hidden" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"></svg>
        <div id="fileCoords" class="board-coords board-files" aria-hidden="true"></div>
      </div>
      <div class="player bottom" data-player-bar="local">
        <span class="avatar light" id="bottomAvatar">GU</span>
        <div class="player-info">
          <div class="player-name-row"><b id="bottomPlayerName">You · ${guestName}</b><span class="player-flag hidden" id="bottomFlag" aria-hidden="true"></span></div>
          <div class="player-meta"><span class="player-rating" id="bottomRating">1200</span><span class="player-presence" id="bottomPresence"><i class="live-dot" aria-hidden="true"></i><span>LOCAL</span></span></div>
        </div>
        <div class="player-connection hidden" id="bottomConnection" aria-label="Network latency">
          <span class="ping-bars" id="bottomPingBars" aria-hidden="true"><i></i><i></i><i></i></span><span id="bottomPing">-- ms</span>
        </div>
        <time id="bottomClock" data-color="w">10:00</time>
      </div>
      <div class="tools"><button id="flip">⇄ Flip board</button><button id="sound">♫ Sound on</button><button id="theme">▦ Board theme</button><button id="resign" class="danger">⚑ Resign</button><details class="game-more"><summary aria-label="More game actions"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg></summary><div class="game-more-menu"><button id="draw" type="button">Offer draw</button><button id="openChat" type="button">Chat</button></div></details></div>
    </section>

    <aside class="rpanel panel">
      <div class="tabs" role="tablist">
        <button class="on" data-tab="moves">Moves</button><button data-tab="analysis">Analysis</button><button data-tab="openings">Openings</button><button data-tab="famous">Famous Games</button>
      </div>
      <div id="rightWorkspace">
        <section class="live-card"><span class="live-art" aria-hidden="true"><img src="/assets/vch/ui/live-banner.webp" alt=""></span>
          <div class="live-card-copy"><small>● &nbsp; Live Game</small><h2 id="turn">White to move</h2><p id="state">Real time &nbsp;•&nbsp; Casual game</p></div>
        </section>

        <div id="movesView" class="right-view">
          <div class="moves-head"><span>#</span><span>White</span><span>Black</span></div>
          <div id="moves" class="moves"><span>Game ready — make a move.</span></div>
          <div class="analysis">
            <header><b><img class="analysis-title-icon" src="/assets/vch/icons/review.svg" alt="">Engine Analysis</b><small>Stockfish 19 · Depth <span id="depth">—</span></small></header>
            <div id="reviewProgress" class="review-progress hidden" aria-live="polite"><span><b id="reviewProgressLabel">Analyzing game</b><em id="reviewProgressCount">0 / 0</em></span><div><i id="reviewProgressFill"></i></div></div>
            <div class="analysis-row"><h2 id="score">+0.0</h2><div class="meter"><i id="meterFill"></i></div></div>
            <p id="advantage">Equal position</p>
            <small>Principal variation</small><p id="line">Analysis begins after your move.</p>
            <button id="reviewGame" class="review-game hidden" type="button"><img src="/assets/vch/icons/review.svg" alt="">Review game</button>
            <section id="reviewDashboard" class="review-dashboard hidden" aria-label="Game review">
              <div class="review-accuracy">
                <div><small>White accuracy</small><b id="whiteAccuracy">—</b></div>
                <div><small>Black accuracy</small><b id="blackAccuracy">—</b></div>
              </div>
              <div id="reviewCounts" class="review-counts" aria-label="Move classifications"></div>
              <div class="review-graph-shell"><div class="review-graph-head"><small>Evaluation graph</small><span id="reviewPlyLabel">Start</span></div><svg id="reviewGraph" class="review-graph" viewBox="0 0 320 96" preserveAspectRatio="none" aria-label="Game evaluation graph"></svg></div>
              <div class="review-step-controls" aria-label="Review navigation">
                <button id="reviewFirst" type="button">First</button>
                <button id="reviewPrev" type="button">Previous</button>
                <button id="reviewNext" type="button">Next</button>
                <button id="reviewLast" type="button">Last</button>
              </div>
              <p id="reviewExplanation" class="review-explanation">Select a move to see the engine explanation.</p>
            </section>
          </div>
          <div class="feature-grid">
            <button class="feature-card opening" data-action="openings"><span class="asset"><img src="/assets/vch/ui/opening-card.webp" alt=""></span><span class="feature-icon-tile"><img src="/assets/vch/icons/opening.svg" alt=""></span><b>Opening Explorer</b><small>Explore moves, theory and master plans.</small><span class="feature-arrow" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg></span></button>
            <button class="feature-card famous" data-action="famous"><span class="asset"><img src="/assets/vch/ui/famous-card.webp" alt=""></span><span class="feature-icon-tile"><img src="/assets/vch/icons/famous.svg" alt=""></span><b>Famous Games</b><small>Study legendary matches and ideas.</small><span class="feature-arrow" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg></span></button>
            <button class="feature-card review" data-action="review"><span class="asset"><img src="/assets/vch/ui/review-card.webp" alt=""></span><span class="feature-icon-tile"><img src="/assets/vch/icons/review.svg" alt=""></span><b>Post-Game Review</b><small>Deep engine analysis and game insights.</small><span class="feature-arrow" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg></span></button>
            <button class="feature-card practice" data-action="learn"><span class="asset"><img src="/assets/vch/ui/practice-card.webp" alt=""></span><span class="feature-icon-tile"><img src="/assets/vch/icons/learn.svg" alt=""></span><b>Practice & Learn</b><small>Puzzles, lessons and structured training.</small><span class="feature-arrow" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg></span></button>
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
<dialog id="themeStudio"><h2>Theme Studio</h2><label>Light squares <input data-theme="--light" type="color" value="#d9cfb2"></label><label>Dark squares <input data-theme="--dark" type="color" value="#29463b"></label><label>Accent <input data-theme="--mint" type="color" value="#82edba"></label><label>Gold <input data-theme="--gold" type="color" value="#e5c17c"></label><label>Glass opacity <input data-theme="--glass" type="range" min="35" max="100" value="94"></label><label>Motion <input data-theme="--motion" type="range" min="0" max="100" value="100"></label><label>Ivory piece tint <input id="whitePiece" type="color" value="#f0d9a4"></label><label>Black piece tint <input id="blackPiece" type="color" value="#342019"></label><label>Piece tint strength <input id="pieceTint" type="range" min="0" max="70" value="18"></label><label>Piece style <select id="pieceStyle"><option value="vanta-3d">Vanta 3D</option><option value="vanta-2d">Vanta 2D</option><option value="staunton-3d">Staunton 3D</option><option value="staunton-2d">Staunton 2D</option></select></label><label>Wallpaper <select id="wallpaper"><option value="classic">Midnight Emerald</option><option value="cobalt">Midnight Cobalt</option><option value="burgundy">Burgundy Brass</option><option value="ivory">Ivory Noir</option></select></label><button id="closeTheme">Done</button></dialog>


<dialog id="accountDialog" class="account-dialog">
  <form method="dialog"><button class="account-close" aria-label="Close">×</button></form>
  <div class="account-head"><img class="account-wordmark" src="/assets/vch/brand/vch-metal.svg" alt="VCH"><h2>Save your rating and record</h2><p>Guest games stay instant. Sign in only when you want rated play, tournaments, and a persistent profile.</p></div>
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

<dialog id="searchDialog" class="search-dialog"><form method="dialog"><button class="close-search">×</button></form><div class="search-title"><img class="search-wordmark" src="/assets/vch/brand/vch-metal.svg" alt="VCH"><h2>Search</h2></div><input id="searchInput" autocomplete="off" placeholder="Search openings, lessons, famous games…"><div id="searchResults"></div></dialog>
`

const brandSplash=$('#brandSplash');
setTimeout(()=>brandSplash?.classList.add('done'),2050);
setTimeout(()=>brandSplash?.remove(),2550);

let clocks=initialClocks(Number($('#time').value));
function render(){
  const board=$('#board'), order=flipped?[...Array(64).keys()].reverse():[...Array(64).keys()];
  board.innerHTML='';
  const rankCoords=$('#rankCoords'),fileCoords=$('#fileCoords');
  if(rankCoords)rankCoords.innerHTML=(flipped?['1','2','3','4','5','6','7','8']:['8','7','6','5','4','3','2','1']).map(value=>`<span>${value}</span>`).join('');
  if(fileCoords)fileCoords.innerHTML=(flipped?['h','g','f','e','d','c','b','a']:['a','b','c','d','e','f','g','h']).map(value=>`<span>${value}</span>`).join('');
  const reviewFen=reviewState.viewing?reviewState.positions[reviewState.currentPly]:null;
  const boardGame=reviewFen?new Chess(reviewFen):game;
  const pos=boardGame.board().flat(), legal=reviewState.viewing?[]:(selected?game.moves({square:selected,verbose:true}):[]);
  const localLast=game.history({verbose:true}).at(-1),serverLast=serverGameId&&Array.isArray(serverGame?.move_history)?serverGame.move_history.at(-1):null;
  const reviewLast=reviewState.viewing&&reviewState.currentPly>0?reviewState.moves[reviewState.currentPly-1]:null,lastMove=reviewLast||serverLast||localLast;
  let checked=-1;
  if(boardGame.inCheck()){
    const checkedColor=boardGame.turn();
    checked=pos.findIndex(p=>p?.type==='k'&&p.color===checkedColor);
  }
  order.forEach(i=>{
    const r=Math.floor(i/8),f=i%8,sq='abcdefgh'[f]+(8-r),p=pos[i],el=document.createElement('button');
    el.className=`square ${(r+f)%2?'dark':'light'} ${lastMove&&(lastMove.from===sq||lastMove.to===sq)?'last-move':''} ${selected===sq?'selected':''} ${legal.some(m=>m.to===sq)?'legal':''} ${checked===i?'check':''}`;
    el.dataset.sq=sq;
    el.setAttribute('aria-label',sq+(p?` ${p.color==='w'?'white':'black'} ${pieceNames[p.type]}`:' empty'));
    if(p)el.innerHTML=`<span class="piece ${p.color} piece-${p.type}" draggable="true" aria-hidden="true"></span>`;
    const boardReview=reviewState.viewing?reviewState.results[reviewState.currentPly-1]:reviewResultForCurrentLastMove(lastMove);
    if(boardReview&&lastMove?.to===sq)el.insertAdjacentHTML('beforeend',reviewBadgeMarkup(boardReview,'board-review-badge'));
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
  const reviewButton=$('#reviewGame');if(reviewButton)reviewButton.classList.toggle('hidden',!isGameFinishedForReview()||!currentHistory().length);
  renderReviewBoardDecorations();syncClockBars();
  updateOpeningLabel();scheduleAnalysis();
}
function endText(){if(game.isCheckmate())return `Checkmate · ${game.turn()==='w'?'Black':'White'} wins`;if(game.isStalemate())return 'Draw · Stalemate';if(game.isThreefoldRepetition())return 'Draw · Repetition';return 'Draw';}
async function clickSquare(sq,p){if(reviewState.viewing||localGameOver||game.isGameOver()||(serverGameId&&myColor&&myColor!==game.turn())||(mode==='computer'&&(!computerStarted||game.turn()!==computerSide)))return;if(!selected){if(p?.color===game.turn()){selected=sq;render()}return} if(p?.color===game.turn()){selected=sq;render();return} const candidates=game.moves({square:selected,verbose:true}).filter(m=>m.to===sq);if(!candidates.length){selected=null;render();return}let promotion;if(candidates.some(m=>m.promotion))promotion=await choosePromotion();makeMove({from:selected,to:sq,promotion:promotion||'q'});selected=null;}
function choosePromotion(){return new Promise(resolve=>{const d=$('#promotion');d.showModal();$$('#promotion button').forEach(b=>b.onclick=()=>{d.close();resolve(b.dataset.piece)})})}
function resetLocalClock(){
  const seconds=mode==='computer'?600:Number($('#time').value);
  clocks=initialClocks(seconds);
  localClockState={w:clocks.w,b:clocks.b,active:game.turn(),startedAt:performance.now()};
  syncClockBars(clocks,localClockState.active);
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
function updateOnlineCount(value){
  const el=$('#playersOnline');if(el)el.textContent=String(value??'—');
}
function setMatchSearching(active){
  searching=active;
  $('#matchSearch')?.classList.toggle('hidden',!active);
  const label=$('#findOpponentLabel');if(label)label.textContent=active?'Cancel search':'Find opponent';
  $('#findOpponent')?.classList.toggle('searching',active);
  updateOnlineCount(serverGameId?'2':active?'1+':'—');
}
async function cancelMatchSearch({announce=true}={}){
  if(matchTimer){clearInterval(matchTimer);matchTimer=null}
  const wasSearching=searching;setMatchSearching(false);
  if(wasSearching){try{await api.queueLeave()}catch{}}
  if(announce&&wasSearching)toast('Search cancelled');
}
async function beginMatchSearch(){
  if(searching){await cancelMatchSearch();return}
  if(matchSelection.rated&&!authSession?.access_token){openAccount();return toast('Sign in to start rated matchmaking')}
  stopOnlineSync();
  serverGameId=null;serverGame=null;clockSnapshot=null;serverVersion=0;currentBot=null;myColor=null;orientationSet=false;selected=null;flipped=false;roomCreated=false;moveEvalByPly=[];moveTimeByPly=[];resetReviewState();
  game.reset();render();updateMoves();setMatchSearching(true);
  const started=Date.now();
  try{
    const first=await api.queueJoin({seconds:matchSelection.seconds,increment:matchSelection.increment,rated:matchSelection.rated});
    if(first.game||first.matched){setMatchSearching(false);updateOnlineCount(2);applyServerState(first);showMovesView();toast('Player matched');return}
    matchTimer=setInterval(async()=>{
      try{
        const state=await api.queueStatus(matchSelection.rated);
        if(state.game||state.matched){
          clearInterval(matchTimer);matchTimer=null;setMatchSearching(false);updateOnlineCount(2);
          applyServerState(state);showMovesView();
          toast(state.botFallback||Date.now()-started>=15000?'Closest Elo engine matched':'Player matched');
        }
      }catch(error){clearInterval(matchTimer);matchTimer=null;setMatchSearching(false);toast(error.message)}
    },1000);
  }catch(error){setMatchSearching(false);toast(error.message)}
}
function renderComputerBots(){
  const grid=$('#botGrid');if(!grid)return;
  if(!computerBots.some(bot=>bot.slug===selectedComputerBotSlug))selectedComputerBotSlug=computerBots.find(bot=>Number(bot.elo)===1500)?.slug||computerBots[0]?.slug||'';
  grid.innerHTML=computerBots.map(bot=>`<button class="bot-card ${bot.slug===selectedComputerBotSlug?'on':''}" data-bot-slug="${escapeHtml(bot.slug)}" type="button"><span class="bot-portrait"><img src="${pieceAsset(escapeHtml(bot.portrait||'bn'))}" alt=""></span><span><b>${escapeHtml(bot.display_name||bot.name||'Stockfish')}</b><small>${Number(bot.elo)||1200} Elo</small></span></button>`).join('');
  $$('#botGrid .bot-card').forEach(button=>button.onclick=()=>{selectedComputerBotSlug=button.dataset.botSlug;renderComputerBots()});
}
async function loadComputerBots(){
  if(botsLoaded)return;botsLoaded=true;
  try{
    const data=await api.bots(),remote=(data.bots||[]).filter(bot=>Number(bot.elo)>=900&&Number(bot.elo)<=2700).sort((a,b)=>Number(a.elo)-Number(b.elo));
    if(remote.length){
      const portraits=['bn','bb','br','bq','bk','bp'];
      computerBots=DEFAULT_COMPUTER_BOTS.map((fallback,index)=>{
        const bot=remote[index]||fallback;
        return {...fallback,...bot,slug:bot.slug||fallback.slug,portrait:portraits[index]};
      });
    }
  }catch{}
  renderComputerBots();
}
function selectedComputerSide(){
  if(computerSideChoice==='random')return crypto.getRandomValues(new Uint8Array(1))[0]%2?'b':'w';
  return computerSideChoice;
}
function startComputerGame(){
  const selectedBot=computerBots.find(bot=>bot.slug===selectedComputerBotSlug)||computerBots[0]||DEFAULT_COMPUTER_BOTS[2];
  stopOnlineSync();serverGameId=null;serverGame=null;clockSnapshot=null;serverVersion=0;roomCreated=false;moveEvalByPly=[];moveTimeByPly=[];resetReviewState();
  currentBot={...selectedBot};localGameOver=false;computerStarted=true;computerSide=selectedComputerSide();
  myColor=computerSide;orientationSet=true;flipped=computerSide==='b';selected=null;game.reset();resetLocalClock();syncRoomUi();render();updateMoves();
  const label=$('#computerStart span');if(label)label.textContent='Restart game';
  toast(`Computer game started · You are ${computerSide==='w'?'White':'Black'}`);
  if(game.turn()!==computerSide)setTimeout(engineMove,280);
}
async function activateLeftMode(next){
  if(!['match','room','computer'].includes(next))return;
  const previous=mode;
  if(searching&&next!=='match')await cancelMatchSearch({announce:false});
  if(previous==='computer'&&next!=='computer'&&computerStarted){
    computerStarted=false;localClockState=null;localGameOver=false;currentBot=null;myColor=null;orientationSet=false;flipped=false;selected=null;game.reset();render();updateMoves();
  }
  mode=next;syncPlayerBars();
  $$('.modes button').forEach(button=>button.classList.toggle('on',button.dataset.mode===next));
  $$('.mode-view').forEach(view=>{const active=view.dataset.modeView===next;view.classList.toggle('active',active);view.setAttribute('aria-hidden',String(!active))});
  if(next==='computer'){renderComputerBots();loadComputerBots()}
  syncOnlineTransport();
}
async function makeMove(move,remote=false,retry=true){if(puzzleSession&&!remote){const uci=move.from+move.to+(move.promotion||'');const expected=puzzleSession.solution[puzzleSession.index];if(uci!==expected){toast('Try another move');return}
  game.move(move);puzzleSession.played.push(uci);puzzleSession.index++;render();
  if(puzzleSession.index>=puzzleSession.solution.length){await api.puzzleAttempt({puzzleId:puzzleSession.id,success:true,durationMs:Date.now()-puzzleSession.started,playedMoves:puzzleSession.played});toast('Puzzle solved');puzzleSession=null;return}
  const reply=puzzleSession.solution[puzzleSession.index];
  if(reply){setTimeout(async()=>{if(!puzzleSession)return;try{game.move({from:reply.slice(0,2),to:reply.slice(2,4),promotion:reply[4]});puzzleSession.played.push(reply);puzzleSession.index++;render();if(puzzleSession.index>=puzzleSession.solution.length){await api.puzzleAttempt({puzzleId:puzzleSession.id,success:true,durationMs:Date.now()-puzzleSession.started,playedMoves:puzzleSession.played});toast('Puzzle solved');puzzleSession=null}}catch{toast('Puzzle line could not continue')}},260)}
  return}if(serverGameId&&!remote){try{const state=await api.move(serverGameId,serverVersion,{from:move.from,to:move.to,promotion:move.promotion,clientMoveAt:serverAlignedNowIso()});const acceptedGame=state.game||state,incomingVersion=Number(acceptedGame?.version??0),movedGameId=acceptedGame?.id||serverGameId;broadcastMoved(movedGameId,incomingVersion);if(incomingVersion>serverVersion){applyServerState(state);playTone()}}catch(error){toast(error.message);await refreshServerState();if(retry&&error.status===409&&myColor===game.turn()&&game.moves({square:move.from,verbose:true}).some(x=>x.to===move.to))return makeMove(move,false,false)}return}let made,localElapsedMs=null;try{if(mode==='computer'&&localClockState){localElapsedMs=Math.max(0,performance.now()-localClockState.startedAt);settleLocalClock()}made=game.move(move)}catch{return}if(localElapsedMs!==null)moveTimeByPly[Math.max(0,game.history().length-1)]=localElapsedMs;if(mode==='computer'){localClockState.active=game.turn();localClockState.startedAt=performance.now()}render();updateMoves();playTone();if(mode==='computer'&&!remote&&!game.isGameOver())setTimeout(engineMove,280);}
function normalizedSan(value=''){return String(value).replace(/[+#?!]/g,'')}
function isBookMove(records,index){
  const sans=records.slice(0,index+1).map(record=>normalizedSan(record.san||record.lan||''));
  return OPENINGS.some(opening=>index<opening.line.length&&sans.every((san,ply)=>san===normalizedSan(opening.line[ply])));
}
function recordEval(record,index){
  const raw=record?.eval??record?.evaluation??record?.eval_cp??record?.score_cp;
  if(raw!==undefined&&raw!==null&&raw!==''){
    let value=Number(raw);
    if(Number.isFinite(value)){
      if((record.eval_cp!==undefined||record.score_cp!==undefined)&&Math.abs(value)>20)value/=100;
      return (value>=0?'+':'')+value.toFixed(1);
    }
  }
  const cached=moveEvalByPly[index];
  return Number.isFinite(cached)?(cached>=0?'+':'')+cached.toFixed(1):'—';
}
function recordTime(record,index){
  const raw=record?.elapsed_ms??record?.move_time_ms??record?.time_ms??moveTimeByPly[index];
  return formatMoveDuration(raw)||'1s';
}
function reviewBadgeMarkup(result,className='classification-badge'){
  if(!result?.classification)return '';
  const meta=CLASSIFICATION_META[result.classification]||CLASSIFICATION_META.good;
  return `<span class="${className} classification-${result.classification}" title="${escapeHtml(meta.label)}"><img src="${classificationAsset(result.classification)}" alt="${escapeHtml(meta.label)}"></span>`;
}
function moveCell(record,index,records,signature){
  if(!record)return '<span class="move-cell empty" aria-hidden="true"></span>';
  const san=escapeHtml(record.san||record.lan||''),reviewResult=reviewState.signature===signature?reviewState.results[index]:null;
  const bookMove=isBookMove(records,index),book=bookMove&&reviewResult?.classification!=='book'?'<img class="book-icon" src="/assets/vch/icons/book.svg" alt="Book move">':'';
  const badge=reviewResult?reviewBadgeMarkup(reviewResult):bookMove?'<span class="classification-badge classification-book" title="Book"><img src="/assets/vch/icons/book.svg" alt="Book"></span>':'';
  const current=reviewState.viewing&&reviewState.currentPly===index+1?' current':'';
  return `<span class="move-cell${current}" role="button" tabindex="0" data-review-ply="${index+1}"><span class="move-san">${book}${badge}<b>${san}</b></span><span class="move-meta"><em>${recordEval(record,index)}</em><time>${recordTime(record,index)}</time></span></span>`;
}
function updateMoves(){
  const records=serverGameId&&Array.isArray(serverGame?.move_history)?serverGame.move_history:game.history({verbose:true});
  const target=$('#moves');if(!target)return;
  if(!records.length){target.innerHTML='<span class="moves-empty">Game ready — make a move.</span>';target.scrollTop=0;return}
  const signature=moveRecordSignature(records),rows=[];
  for(let i=0;i<records.length;i+=2){
    rows.push(`<div class="move-pair-row"><span class="move-number">${Math.floor(i/2)+1}</span>${moveCell(records[i],i,records,signature)}${moveCell(records[i+1],i+1,records,signature)}</div>`);
  }
  target.innerHTML=rows.join('');
  target.scrollTop=0;
  $$('#moves [data-review-ply]').forEach(cell=>{
    const jump=()=>{if(reviewState.results.length)setReviewPly(Number(cell.dataset.reviewPly))};
    cell.onclick=jump;cell.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();jump()}};
  });
}
async function findEngineMove(){const moves=game.moves({verbose:true});if(!moves.length)return null;const requestedElo=Number(currentBot?.elo||currentBot?.rating||1500);const uci=await new Promise(resolve=>{enginePending=resolve;stockfish.postMessage({fen:game.fen(),elo:requestedElo,movetime:350});setTimeout(()=>{if(enginePending){enginePending(null);enginePending=null}},4000)});return uci&&moves.find(x=>x.from+x.to+(x.promotion||'')===uci)}
async function engineMove(){if(mode==='computer'&&(!computerStarted||game.turn()===computerSide))return;const move=await findEngineMove();if(!move)return toast('Stockfish 19 is unavailable — no substitute move was played');makeMove(move,true)}
function playTone(){if($('#sound').dataset.off)return;const a=new AudioContext(),o=a.createOscillator(),g=a.createGain();o.frequency.value=420;g.gain.setValueAtTime(.05,a.currentTime);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+.09);o.connect(g).connect(a.destination);o.start();o.stop(a.currentTime+.1)}
function clockText(n){return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`}
function playerBarClockColors(){
  const bottom=myColor==='b'?'b':'w';
  return {top:bottom==='w'?'b':'w',bottom};
}
function activeClockColor(){
  if(reviewState.viewing||localGameOver||game.isGameOver())return null;
  if(mode==='computer')return computerStarted?game.turn():null;
  return serverGameId&&['active','playing','in_progress'].includes(serverGame?.status)?game.turn():null;
}
function currentClockSeconds(){
  if(clockSnapshot){
    const value=projectedClocks(clockSnapshot);
    return {w:Math.max(0,value.w/1000),b:Math.max(0,value.b/1000)};
  }
  if(mode==='computer'&&localClockState){
    const elapsed=(performance.now()-localClockState.startedAt)/1000;
    return {
      w:Math.max(0,localClockState.w-(localClockState.active==='w'?elapsed:0)),
      b:Math.max(0,localClockState.b-(localClockState.active==='b'?elapsed:0))
    };
  }
  return {w:Math.max(0,clocks.w),b:Math.max(0,clocks.b)};
}
function syncClockBars(values=currentClockSeconds(),active=activeClockColor()){
  const colors=playerBarClockColors(),top=$('#topClock'),bottom=$('#bottomClock');
  const apply=(element,color)=>{
    if(!element)return;
    element.dataset.color=color;
    element.textContent=clockText(Math.max(0,Math.ceil(Number(values?.[color])||0)));
    element.classList.toggle('running',active===color);
  };
  apply(top,colors.top);apply(bottom,colors.bottom);
  const topBar=$('.player.top'),bottomBar=$('.player.bottom');
  if(topBar)topBar.dataset.color=colors.top;
  if(bottomBar)bottomBar.dataset.color=colors.bottom;
}
function startClock(){clearInterval(ticking);ticking=setInterval(()=>syncClockBars(),250)}
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
function playerInitials(value,fallback='GU'){
  const words=String(value||'').replace(/^You ·\s*/,'').trim().split(/\s+/).filter(Boolean);
  if(!words.length)return fallback;
  return words.slice(0,2).map(word=>word[0]).join('').toUpperCase();
}
function setPlayerFlag(element,code){
  if(!element)return;
  const normalized=/^[a-z]{2}$/i.test(String(code||''))?String(code).toUpperCase():'';
  const flagSrc=normalized==='US'?'/assets/vch/flags/us.svg':'';
  element.classList.toggle('hidden',!flagSrc);
  element.toggleAttribute('aria-hidden',!flagSrc);
  if(flagSrc){
    element.innerHTML=`<img src="${flagSrc}" alt="">`;
    element.setAttribute('aria-label','United States flag');
  }else{
    element.replaceChildren();
    element.removeAttribute('aria-label');
  }
}
function setPresence(element,label,online=false){
  if(!element)return;
  element.classList.toggle('online',online);
  const text=element.querySelector('span');if(text)text.textContent=label;
}
function isOnlineGame(){
  return !!serverGameId&&mode!=='computer'&&(mode==='match'||mode==='room')&&(!serverGame||['waiting','active','playing','in_progress'].includes(serverGame.status));
}
function serverAlignedNowIso(){
  const offset=Number(clockSnapshot?.serverOffset)||0;
  return new Date(Date.now()+offset).toISOString();
}
function syncConnectionUi(){
  const online=isOnlineGame();
  const connection=$('#bottomConnection');
  if(connection)connection.classList.toggle('hidden',!online);
  const ping=$('#bottomPing'),bars=$('#bottomPingBars');
  if(!online){if(ping)ping.textContent='-- ms';if(bars)bars.dataset.quality='';return}
  if(Number.isFinite(latencyMs)){
    if(ping)ping.textContent=`${latencyMs} ms`;
    if(bars)bars.dataset.quality=latencyMs<=100?'good':latencyMs<=250?'fair':'poor';
  }else{
    if(ping)ping.textContent='-- ms';
    if(bars)bars.dataset.quality=realtimeReady?'pending':'';
  }
}
function syncPlayerBars(){
  const opponentId=serverGame&&(myColor==='w'?serverGame.black_player_id:serverGame.white_player_id);
  const opponentName=serverGame&&(myColor==='w'?serverGame.black_name:serverGame.white_name);
  const topName=currentBot?.display_name||currentBot?.name||(mode==='computer'?'Choose an opponent':opponentName||(opponentId?'Opponent connected':'Waiting for opponent'));
  const ownName=(currentProfile?.account&&(currentProfile.username||currentProfile.display_name))||guestName;
  const opponentRating=myColor==='w'?serverGame?.black_rating_before:serverGame?.white_rating_before;
  const topRating=currentBot?.elo||opponentRating||1200;
  const pool=serverGame?.pool||'rapid';
  $('#topPlayerName').textContent=topName;
  $('#bottomPlayerName').textContent=`You · ${ownName}`;
  $('#topRating').textContent=`${topRating} rating`;
  $('#bottomRating').textContent=`${ratingFor(pool)} rating`;
  $('#topAvatar').textContent=playerInitials(topName,'OP');
  $('#bottomAvatar').textContent=playerInitials(ownName,'GU');
  const opponentColor=myColor==='w'?'black':'white',ownColor=myColor==='w'?'white':myColor==='b'?'black':null;
  setPlayerFlag($('#topFlag'),opponentColor?serverGame?.[`${opponentColor}_country_code`]:null);
  setPlayerFlag($('#bottomFlag'),currentProfile?.country_code||(ownColor?serverGame?.[`${ownColor}_country_code`]:null));
  const online=isOnlineGame();
  setPresence($('#topPresence'),currentBot?'ENGINE':opponentId&&online?'LIVE':'WAITING',!!opponentId&&online&&!currentBot);
  setPresence($('#bottomPresence'),online?'LIVE':'LOCAL',online);
  syncConnectionUi();syncClockBars();
}
function syncRoomUi(){
  const code=serverGame?.invite_code||room;
  $('.room-created')?.classList.toggle('hidden',!roomCreated);
  const strong=$('.room strong');if(strong)strong.textContent=code||'—';
  if(code)$('#share').value=`${location.origin}${location.pathname}?game=${encodeURIComponent(code)}`;
  syncPlayerBars();
}
function applyServerState(payload){
  const state=payload.game||payload;if(!state)return;
  const previousVersion=serverVersion,previousGameId=serverGameId,previousState=serverGame;
  if(state.id&&state.id!==previousGameId){moveEvalByPly=[];moveTimeByPly=[];resetReviewState()}
  syncServerMoveTimes(previousState,state);
  animateLastServerMove(state,previousGameId===state.id?previousVersion:0);
  serverGame=state;serverGameId=state.id||serverGameId;serverVersion=Number(state.version??serverVersion);
  currentPlayerId=payload.player?.id||currentPlayerId;currentBot=payload.bot||currentBot;
  myColor=seatFromEnvelope(payload,myColor);
  if(myColor&&!orientationSet){flipped=myColor==='b';orientationSet=true}
  clockSnapshot=createClockSnapshot(payload);
  if(state.fen){try{game.load(state.fen)}catch{}}
  syncRoomUi();render();updateMoves();syncOnlineTransport();
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
  const bottom=$('#bottomPlayerName');if(bottom)bottom.textContent='You · '+name;
  const bottomRating=$('#bottomRating');if(bottomRating)bottomRating.textContent=rating+' rating';
  const bottomAvatar=$('#bottomAvatar');if(bottomAvatar)bottomAvatar.textContent=playerInitials(name,'GU');
  setPlayerFlag($('#bottomFlag'),currentProfile?.country_code);
  syncPlayerBars();
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
async function connect(){try{await loadProfile();if(params.get('game')){const state=await api.join(room,guestName);applyServerState(state);await loadChat();toast(`Joined room ${room}`)}}catch(error){toast(error.message)}}
function stopPolling(){
  if(pollTimer){clearInterval(pollTimer);pollTimer=null}
  pollCount=0;
}
function clearPingProbe(){
  if(pingProbe?.timeout)clearTimeout(pingProbe.timeout);
  pingProbe=null;
}
function stopRealtime(){
  if(realtimePingTimer){clearInterval(realtimePingTimer);realtimePingTimer=null}
  clearPingProbe();realtimeReady=false;latencyMs=null;realtimeRefreshPromise=null;
  if(realtimeChannel){
    const channel=realtimeChannel;realtimeChannel=null;realtimeGameId=null;
    realtimeClient.removeChannel(channel).catch(()=>{});
  }else realtimeGameId=null;
}
function stopOnlineSync(){
  stopPolling();stopRealtime();syncConnectionUi();
}
function sendRealtimePing(){
  if(!isOnlineGame()||!realtimeChannel||!realtimeReady||pingProbe)return;
  const nonce=crypto.randomUUID(),started=performance.now();
  const timeout=setTimeout(()=>{
    if(pingProbe?.nonce!==nonce)return;
    pingProbe=null;latencyMs=null;syncConnectionUi();
  },3000);
  pingProbe={nonce,started,timeout};
  realtimeChannel.send({type:'broadcast',event:'ping',payload:{nonce}}).catch(()=>{
    if(pingProbe?.nonce===nonce){clearPingProbe();latencyMs=null;syncConnectionUi()}
  });
}
function broadcastMoved(gameId,version){
  if(!realtimeChannel||!realtimeReady||realtimeGameId!==gameId)return;
  realtimeChannel.send({type:'broadcast',event:'moved',payload:{gameId,version:Number(version)}}).catch(()=>{});
}
function realtimeVersion(message){
  const payload=message?.payload||{},gameState=payload.game||payload;
  return {gameId:payload.gameId||gameState?.id,version:Number(payload.version??gameState?.version??0)};
}
async function refreshFromRealtime(message){
  const incoming=realtimeVersion(message);
  if(!isOnlineGame()||incoming.gameId!==serverGameId||incoming.version<=serverVersion)return;
  if(realtimeRefreshPromise)return realtimeRefreshPromise;
  const requestedGameId=serverGameId;
  realtimeRefreshPromise=(async()=>{
    try{
      const authoritative=await api.heartbeat(requestedGameId);
      if(requestedGameId!==serverGameId)return;
      const authoritativeVersion=Number((authoritative.game||authoritative)?.version??0);
      if(authoritativeVersion>serverVersion){applyServerState(authoritative);playTone()}
    }catch{}
    finally{realtimeRefreshPromise=null}
  })();
  return realtimeRefreshPromise;
}
function startRealtime(){
  if(!isOnlineGame()){stopRealtime();return}
  if(realtimeChannel&&realtimeGameId===serverGameId)return;
  stopRealtime();
  const gameId=serverGameId;
  realtimeGameId=gameId;latencyMs=null;syncConnectionUi();
  realtimeChannel=realtimeClient
    .channel(`game:${gameId}`,{config:{broadcast:{self:true}}})
    .on('broadcast',{event:'state'},message=>{refreshFromRealtime(message)})
    .on('broadcast',{event:'moved'},message=>{refreshFromRealtime(message)})
    .on('broadcast',{event:'ping'},message=>{
      const nonce=message?.payload?.nonce;
      if(!pingProbe||nonce!==pingProbe.nonce)return;
      const started=pingProbe.started;clearPingProbe();
      latencyMs=Math.max(1,Math.round(performance.now()-started));syncConnectionUi();
    })
    .subscribe(status=>{
      if(realtimeGameId!==gameId)return;
      realtimeReady=status==='SUBSCRIBED';
      if(realtimeReady){
        latencyMs=null;syncConnectionUi();sendRealtimePing();
        if(!realtimePingTimer)realtimePingTimer=setInterval(sendRealtimePing,5000);
      }else if(['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(status)){
        latencyMs=null;syncConnectionUi();
      }
    });
}
function startPolling(){
  if(!isOnlineGame()){stopPolling();return}
  if(pollTimer)return;
  pollCount=0;let inFlight=false;
  pollTimer=setInterval(async()=>{
    if(document.hidden||!isOnlineGame()||inFlight)return;inFlight=true;
    try{
      const payload=await api.heartbeat(serverGameId);
      applyServerState(payload);
      if(++pollCount%1===0)await loadChat();
    }catch{}
    finally{inFlight=false}
  },5000);
}
function syncOnlineTransport(){
  if(!isOnlineGame()){stopOnlineSync();return}
  startRealtime();startPolling();
}
function addMessage(text,mine=true){const e=document.createElement('p');e.className=mine?'mine':'';e.textContent=String(text).slice(0,160);$('#messages').append(e);e.scrollIntoView()}
async function loadChat(){if(!serverGameId)return;const data=await api.chatList(serverGameId);$('#messages').replaceChildren();for(const item of data.messages||[])addMessage(item.body,item.player_id===data.playerId)}
$('#chat').onsubmit=async e=>{e.preventDefault();const v=$('#message').value.trim();if(!v||v.length>160)return;if(!serverGameId)return toast('Start or join a game to chat');try{await api.chatSend(serverGameId,v);$('#message').value='';await loadChat()}catch(error){toast(error.message)}};
$$('.modes button').forEach(button=>button.onclick=()=>activateLeftMode(button.dataset.mode));
$$('[data-match-time]').forEach(button=>button.onclick=()=>{
  const [seconds,increment]=button.dataset.matchTime.split('-').map(Number);
  matchSelection={...matchSelection,seconds,increment};
  $$('[data-match-time]').forEach(item=>item.classList.toggle('on',item===button));
});
$$('[data-match-rated]').forEach(button=>button.onclick=()=>{
  matchSelection={...matchSelection,rated:button.dataset.matchRated==='true'};
  $$('[data-match-rated]').forEach(item=>item.classList.toggle('on',item===button));
});
$$('[data-computer-side]').forEach(button=>button.onclick=()=>{
  computerSideChoice=button.dataset.computerSide;
  $$('[data-computer-side]').forEach(item=>item.classList.toggle('on',item===button));
});
$('#findOpponent').onclick=beginMatchSearch;
$('#computerStart').onclick=startComputerGame;
renderComputerBots();
$('#flip').onclick=()=>{flipped=!flipped;render()};$('#sound').onclick=e=>{e.currentTarget.dataset.off=e.currentTarget.dataset.off?'':'1';e.currentTarget.textContent=e.currentTarget.dataset.off?'♫ Sound off':'♫ Sound on'};$('#theme').onclick=()=>$('#themeStudio').showModal();$('#resign').onclick=async()=>{if(mode==='computer'&&computerStarted&&!localGameOver){if(confirm('Resign this computer game?')){settleLocalClock();localGameOver=true;render();toast('You resigned')}}else if(serverGameId&&confirm('Resign this game?')){try{applyServerState(await api.resign(serverGameId))}catch(error){toast(error.message)}}else if(!serverGameId)toast('Start a game first')};$('#draw').onclick=async()=>{if(mode==='computer')return toast('Draw offers are available in multiplayer games');if(!serverGameId)return toast('Start a game first');try{applyServerState(await api.drawOffer(serverGameId));toast('Draw offer sent')}catch(error){toast(error.message)}};$('#copy').onclick=async()=>{await navigator.clipboard.writeText($('#share').value);toast('Room link copied')};$('#create').onclick=async()=>{const rated=$('#level').value==='rated';if(rated&&!authSession?.access_token){openAccount();return toast('Sign in is required for rated games')}try{const state=await api.create({name:(currentProfile?.username||guestName),seconds:Number($('#time').value),increment:0,rated});applyServerState(state);room=(state.game||state).invite_code;roomCreated=true;history.replaceState(null,'',`?game=${encodeURIComponent(room)}`);syncRoomUi();await loadChat();toast('Private room is ready')}catch(error){toast(error.message)}};$('#join').onclick=()=>{const v=$('#roomInput').value.trim();if(v)location.search='?game='+encodeURIComponent(v)};
$('#time').onchange=e=>{if(game.history().length)return toast('Time control cannot change after the first move');clocks=initialClocks(Number(e.target.value));syncClockBars(clocks,null)};
const boardEl=$('#board');
function clearDragTargets(){boardEl.querySelectorAll('.drag-selected,.drag-legal').forEach(el=>el.classList.remove('drag-selected','drag-legal'))}
function paintDragTargets(square){
  clearDragTargets();boardEl.querySelector(`[data-sq="${square}"]`)?.classList.add('drag-selected');
  for(const move of game.moves({square,verbose:true}))boardEl.querySelector(`[data-sq="${move.to}"]`)?.classList.add('drag-legal');
}
boardEl.addEventListener('dragstart',event=>{
  const piece=event.target.closest?.('.piece'),square=piece?.closest?.('.square')?.dataset.sq;if(!square)return;
  const p=game.get(square);if(!p||reviewState.viewing||localGameOver||game.isGameOver()||(serverGameId&&myColor&&myColor!==game.turn())||(mode==='computer'&&(!computerStarted||game.turn()!==computerSide))||p.color!==game.turn()){event.preventDefault();return}
  selected=square;piece.classList.add('dragging');paintDragTargets(square);event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',square);
});
boardEl.addEventListener('dragover',event=>{
  const to=event.target.closest?.('.square')?.dataset.sq;if(selected&&to&&game.moves({square:selected,verbose:true}).some(m=>m.to===to)){event.preventDefault();event.dataTransfer.dropEffect='move'}
});
boardEl.addEventListener('drop',event=>{
  const to=event.target.closest?.('.square')?.dataset.sq;if(!selected||!to)return;event.preventDefault();clearDragTargets();clickSquare(to,game.get(to));
});
boardEl.addEventListener('dragend',()=>{boardEl.querySelectorAll('.piece.dragging').forEach(piece=>piece.classList.remove('dragging'));clearDragTargets();if(selected){selected=null;render()}});
render();startClock();connect();

if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js'));

function escapeHtml(value=''){return String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
function moveRecordSignature(records=[]){return records.map(record=>`${record.from||''}${record.to||''}${record.promotion||''}:${normalizedSan(record.san||record.lan||'')}`).join('|')}
function currentReviewRecords(){return serverGameId&&Array.isArray(serverGame?.move_history)?serverGame.move_history:game.history({verbose:true})}
function resetReviewState(){
  const nextToken=reviewState.token+1;
  if(reviewPending){
    const pending=reviewPending;reviewPending=null;clearTimeout(pending.timer);reviewWorker.postMessage({action:'stop'});
    pending.reject(new Error('Review cancelled'));
  }
  reviewState={running:false,viewing:false,currentPly:0,signature:'',token:nextToken,positions:[],moves:[],evaluations:[],results:[]};
  const progress=$('#reviewProgress');progress?.classList.add('hidden');
}
function isGameFinishedForReview(){
  if(localGameOver||game.isGameOver())return true;
  return !!(serverGame&&serverGameId&&!['active','playing','in_progress','waiting'].includes(serverGame.status));
}
function parseReviewInfo(line,fen){
  const score=line.match(/\bscore (cp|mate) (-?\d+)/);if(!score)return null;
  let cp=score[1]==='mate'?(Number(score[2])>0?100000:-100000):Number(score[2]);
  if(String(fen).split(' ')[1]==='b')cp=-cp;
  const depth=Number(line.match(/\bdepth (\d+)/)?.[1]||0),pv=line.match(/\bpv (.+)$/)?.[1]||'';
  return {cp,depth,pv,bestMove:pv.split(/\s+/)[0]||''};
}
function analyzeReviewFen(fen,index,token){
  return new Promise((resolve,reject)=>{
    const id=`review-${token}-${index}`;
    const timer=setTimeout(()=>{if(reviewPending?.id===id){reviewPending=null;reviewWorker.postMessage({action:'stop'});reject(new Error('Game review timed out'))}},30000);
    reviewPending={id,fen,latest:{cp:0,depth:0,pv:'',bestMove:''},resolve,reject,timer};
    reviewWorker.postMessage({fen,elo:3190,depth:REVIEW_DEPTH,requestId:id});
  });
}
function buildReviewGame(records=currentReviewRecords()){
  const position=new Chess(),positions=[position.fen()],moves=[];
  for(const record of records){
    let made=null;
    try{made=record?.from&&record?.to?position.move({from:record.from,to:record.to,promotion:record.promotion||undefined}):position.move(record.san||record.lan||'')}catch{}
    if(!made)break;
    moves.push({...record,from:made.from,to:made.to,san:made.san,lan:made.lan,color:made.color,piece:made.piece,captured:made.captured||record.captured||null,promotion:made.promotion||record.promotion||null});
    positions.push(position.fen());
  }
  return {records:moves,positions,signature:moveRecordSignature(moves)};
}
function isReviewSacrifice(move,beforeFen){
  const values={p:1,n:3,b:3,r:5,q:9,k:99},pieceValue=values[move?.piece]||0,capturedValue=values[move?.captured]||0;
  if(!['n','b','r','q'].includes(move?.piece)||pieceValue<=capturedValue+1)return false;
  try{
    const position=new Chess(beforeFen);position.move({from:move.from,to:move.to,promotion:move.promotion||undefined});
    const opponent=move.color==='w'?'b':'w';
    return typeof position.isAttacked==='function'?position.isAttacked(move.to,opponent):true;
  }catch{return false}
}
function setReviewProgress(done,total,label='Analyzing game'){
  const wrap=$('#reviewProgress'),fill=$('#reviewProgressFill'),count=$('#reviewProgressCount'),title=$('#reviewProgressLabel');
  if(!wrap)return;
  wrap.classList.remove('hidden');if(title)title.textContent=label;if(count)count.textContent=`${done} / ${total}`;if(fill)fill.style.width=`${total?Math.round(100*done/total):0}%`;
}
function reviewResultForCurrentLastMove(lastMove){
  if(!lastMove)return null;
  const records=currentReviewRecords(),signature=moveRecordSignature(records);
  if(reviewState.signature!==signature)return null;
  const index=records.length-1,result=reviewState.results[index];
  return result&&result.to===lastMove.to?result:null;
}
function reviewSquareCenter(square){
  if(!/^[a-h][1-8]$/.test(String(square||'')))return null;
  const file=square.charCodeAt(0)-97,rank=Number(square[1]);
  const col=flipped?7-file:file,row=flipped?rank-1:8-rank;
  return {x:(col+.5)*12.5,y:(row+.5)*12.5};
}
function reviewArrowLine(from,to,kind){
  const a=reviewSquareCenter(from),b=reviewSquareCenter(to);if(!a||!b)return '';
  return `<line class="review-arrow ${kind}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" vector-effect="non-scaling-stroke" marker-end="url(#${kind==='best'?'reviewBestHead':'reviewPlayedHead'})"/>`;
}
function renderReviewBoardDecorations(){
  const arrows=$('#reviewArrows'),bar=$('#reviewEvalBar');
  if(!reviewState.viewing||!reviewState.results.length){
    arrows?.classList.add('hidden');bar?.classList.add('hidden');return;
  }
  bar?.classList.remove('hidden');arrows?.classList.remove('hidden');
  const evaluation=reviewState.evaluations[reviewState.currentPly]||{cp:0},cp=Math.max(-1200,Math.min(1200,Number(evaluation.cp)||0));
  const whiteShare=50+45*Math.tanh(cp/420),fill=$('#reviewEvalFill'),text=$('#reviewEvalText');
  if(fill)fill.style.height=`${whiteShare}%`;if(text)text.textContent=(cp>=0?'+':'')+(cp/100).toFixed(1);
  const result=reviewState.currentPly>0?reviewState.results[reviewState.currentPly-1]:null;
  if(!arrows)return;
  const defs='<defs><marker id="reviewBestHead" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0 0 5 2.5 0 5Z"/></marker><marker id="reviewPlayedHead" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0 0 5 2.5 0 5Z"/></marker></defs>';
  if(!result){arrows.innerHTML=defs;return}
  const best=String(result.bestMove||''),bestFrom=best.slice(0,2),bestTo=best.slice(2,4),played=`${result.from}${result.to}${reviewState.moves[reviewState.currentPly-1]?.promotion||''}`.toLowerCase();
  arrows.innerHTML=defs+(bestFrom&&bestTo?reviewArrowLine(bestFrom,bestTo,'best'):'')+(best&&played!==best.toLowerCase()?reviewArrowLine(result.from,result.to,'played'):'');
}
function reviewBestSan(index){
  const result=reviewState.results[index],fen=reviewState.positions[index],uci=String(result?.bestMove||'');
  if(!result||!fen||uci.length<4)return '';
  try{
    const position=new Chess(fen),move=position.move({from:uci.slice(0,2),to:uci.slice(2,4),promotion:uci[4]||undefined});
    return move?.san||uci;
  }catch{return uci}
}
function reviewExplanation(index){
  const result=reviewState.results[index],move=reviewState.moves[index];if(!result||!move)return 'Start position — use Next to step through the review.';
  const label=CLASSIFICATION_META[result.classification]?.label||'Move',best=reviewBestSan(index);
  if(result.classification==='book')return `Book move ${move.san} — follows established opening theory.`;
  if(result.classification==='brilliant')return `Brilliant ${move.san} — a strong sacrifice that keeps the engine's best continuation.`;
  if(result.classification==='best')return `Best move ${move.san} — matches Stockfish's first choice.`;
  if(result.classification==='great')return `Great move ${move.san} — keeps nearly all of the position's winning chances.`;
  if(best&&normalizedSan(best)!==normalizedSan(move.san))return `${label}: ${move.san}. Best was ${best} — it preserves more winning chances.`;
  return `${label}: ${move.san} — the engine line confirms the position remains close to best play.`;
}
function reviewAccuracyFor(color){
  const losses=reviewState.results.filter((result,index)=>reviewState.moves[index]?.color===color).map(result=>result.loss);
  return accuracyFromLosses(losses);
}
function renderReviewCounts(){
  const target=$('#reviewCounts');if(!target)return;
  const order=['brilliant','great','best','excellent','good','book','inaccuracy','mistake','miss','blunder'];
  target.innerHTML=order.map(key=>{
    const count=reviewState.results.filter(result=>result.classification===key).length,meta=CLASSIFICATION_META[key];
    return `<span title="${escapeHtml(meta.label)}"><img src="${classificationAsset(key)}" alt=""><b>${count}</b><small>${escapeHtml(meta.label)}</small></span>`;
  }).join('');
}
function renderReviewGraph(){
  const graph=$('#reviewGraph');if(!graph)return;
  const evaluations=reviewState.evaluations;if(!evaluations.length){graph.innerHTML='';return}
  const width=320,height=96,pad=7,span=Math.max(1,evaluations.length-1);
  const point=(evaluation,index)=>{
    const cp=Math.max(-1000,Math.min(1000,Number(evaluation?.cp)||0)),x=pad+(width-pad*2)*(index/span),y=height/2-(height/2-pad)*Math.tanh(cp/420);
    return {x,y,cp};
  };
  const points=evaluations.map(point),polyline=points.map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  graph.innerHTML=`<line class="graph-zero" x1="0" y1="${height/2}" x2="${width}" y2="${height/2}"/><polyline class="graph-line" points="${polyline}"/>`+points.map((p,index)=>`<circle class="graph-point${reviewState.currentPly===index?' current':''}" data-review-ply="${index}" cx="${p.x}" cy="${p.y}" r="${reviewState.currentPly===index?4:2.5}"/>`).join('');
  graph.querySelectorAll('[data-review-ply]').forEach(point=>point.onclick=()=>setReviewPly(Number(point.dataset.reviewPly)));
}
function renderReviewDashboard(){
  const dashboard=$('#reviewDashboard');if(!dashboard)return;
  dashboard.classList.toggle('hidden',!reviewState.viewing||!reviewState.results.length);
  if(!reviewState.viewing||!reviewState.results.length)return;
  $('#whiteAccuracy').textContent=`${reviewAccuracyFor('w').toFixed(1)}%`;
  $('#blackAccuracy').textContent=`${reviewAccuracyFor('b').toFixed(1)}%`;
  const label=$('#reviewPlyLabel');if(label)label.textContent=reviewState.currentPly?`Move ${Math.ceil(reviewState.currentPly/2)} · ${reviewState.moves[reviewState.currentPly-1]?.san||''}`:'Start';
  const explanation=$('#reviewExplanation');if(explanation)explanation.textContent=reviewState.currentPly?reviewExplanation(reviewState.currentPly-1):'Start position — use Next to step through the review.';
  renderReviewCounts();renderReviewGraph();
  $('#reviewFirst').disabled=reviewState.currentPly===0;$('#reviewPrev').disabled=reviewState.currentPly===0;
  $('#reviewNext').disabled=reviewState.currentPly>=reviewState.moves.length;$('#reviewLast').disabled=reviewState.currentPly>=reviewState.moves.length;
}
function setReviewPly(ply){
  if(!reviewState.results.length)return;
  reviewState.viewing=true;reviewState.currentPly=Math.max(0,Math.min(reviewState.moves.length,Number(ply)||0));
  const depthEl=$('#depth');if(depthEl)depthEl.textContent=String(REVIEW_DEPTH);
  render();updateMoves();renderReviewDashboard();
}
async function startGameReview(){
  const built=buildReviewGame();
  if(!built.records.length)return toast('Play at least one move before starting review');
  showMovesView();
  $$('.tabs button').forEach(button=>button.classList.toggle('on',button.dataset.tab==='analysis'));
  const depthEl=$('#depth');if(depthEl)depthEl.textContent=String(REVIEW_DEPTH);
  if(reviewState.signature===built.signature&&!reviewState.running&&reviewState.results.length===built.records.length){
    setReviewProgress(built.positions.length,built.positions.length,'Review complete');setReviewPly(reviewState.moves.length);return;
  }
  const token=reviewState.token+1;
  reviewState={running:true,viewing:false,currentPly:0,signature:built.signature,token,positions:built.positions,moves:built.records,evaluations:[],results:[]};
  setReviewProgress(0,built.positions.length,'Analyzing every position');
  try{
    for(let index=0;index<built.positions.length;index++){
      const evaluation=await analyzeReviewFen(built.positions[index],index,token);
      if(reviewState.token!==token){reviewState.running=false;return}
      reviewState.evaluations[index]=evaluation;
      setReviewProgress(index+1,built.positions.length,'Analyzing every position');
    }
    reviewState.results=built.records.map((move,index)=>{
      const before=reviewState.evaluations[index]||{cp:0,bestMove:''},after=reviewState.evaluations[index+1]||before;
      const actual=`${move.from}${move.to}${move.promotion||''}`.toLowerCase(),best=String(before.bestMove||'').toLowerCase();
      const isBest=!!best&&actual===best,isBook=isBookMove(built.records,index),isSacrifice=isReviewSacrifice(move,built.positions[index]);
      const classification=classifyMove({beforeCp:before.cp,afterCp:after.cp,color:move.color,isBook,isBest,isSacrifice});
      return {classification,from:move.from,to:move.to,beforeCp:before.cp,afterCp:after.cp,loss:winPercentageLoss(before.cp,after.cp,move.color),bestMove:before.bestMove||''};
    });
    reviewState.running=false;
    moveEvalByPly=reviewState.results.map(result=>result.afterCp/100);
    setReviewProgress(built.positions.length,built.positions.length,'Review complete');
    if(depthEl)depthEl.textContent=String(REVIEW_DEPTH);
    setReviewPly(reviewState.moves.length);
  }catch(error){
    if(reviewState.token!==token)return;
    reviewState.running=false;setReviewProgress(reviewState.evaluations.length,built.positions.length,'Review unavailable');toast(error.message);
  }
}
function syncServerMoveTimes(previous,state){
  const records=Array.isArray(state?.move_history)?state.move_history:[],previousRecords=Array.isArray(previous?.move_history)?previous.move_history:[];
  const increment=Math.max(0,Number(state?.increment_seconds||0))*1000;
  if(previous?.id&&state?.id===previous.id&&records.length===previousRecords.length+1){
    const index=records.length-1,move=records[index],before=Number(move?.color==='b'?previous.black_time_ms:previous.white_time_ms),after=Number(move?.color==='b'?state.black_time_ms:state.white_time_ms);
    const elapsed=before+increment-after;if(Number.isFinite(elapsed)&&elapsed>=0)moveTimeByPly[index]=elapsed;
  }
  const base=Math.max(0,Number(state?.base_seconds||0))*1000;
  if(base>0){
    for(const color of ['w','b']){
      const indices=records.map((record,index)=>record?.color===color?index:-1).filter(index=>index>=0),remaining=Number(color==='w'?state.white_time_ms:state.black_time_ms);
      if(!indices.length||!Number.isFinite(remaining))continue;
      const total=Math.max(0,base+increment*indices.length-remaining),average=indices.length?total/indices.length:0;
      for(const index of indices)if(!Number.isFinite(moveTimeByPly[index]))moveTimeByPly[index]=average;
    }
  }
}
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
  if(reviewState.running||reviewState.viewing){const depthEl=$('#depth');if(depthEl)depthEl.textContent=String(REVIEW_DEPTH);return}
  const depth=Number(text.match(/\bdepth (\d+)/)?.[1]||0);
  const scoreMatch=text.match(/\bscore (cp|mate) (-?\d+)/);
  const pv=text.match(/\bpv (.+)$/)?.[1]||'';
  if(scoreMatch){
    let score=scoreMatch[1]==='mate'?(Number(scoreMatch[2])>0?99:-99):Number(scoreMatch[2])/100;
    if(game.turn()==='b')score=-score;
    analysisScore=Math.max(-99,Math.min(99,score));
    const analyzedPly=currentHistory().length;if(analyzedPly)moveEvalByPly[analyzedPly-1]=analysisScore;
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
  if(reviewState.running||reviewState.viewing||mode==='puzzle'||(serverGame?.rated&&serverGame?.status==='active'&&!serverGame?.bot_player_id))return;
  analysisTimer=setTimeout(()=>{if(!botThinking)analysisWorker.postMessage({fen:game.fen(),elo:3190,movetime:280})},220);
}
function showMovesView(){
  currentRightView='moves';$('#movesView')?.classList.remove('hidden');$('#dynamicView')?.classList.add('hidden');
  if(reviewState.viewing){reviewState.viewing=false;renderReviewDashboard();render()}
  $$('.tabs button').forEach(b=>b.classList.toggle('on',b.dataset.tab==='moves'));
  updateMoves();scheduleAnalysis();
}
function setDynamicView(kind,title,html){
  currentRightView=kind;
  $('#movesView')?.classList.add('hidden');
  const target=$('#dynamicView');target.classList.remove('hidden');target.innerHTML=`<div class="view-title"><button class="back-view">←</button><div><img class="view-wordmark" src="/assets/vch/brand/vch-metal.svg" alt="VCH"><h3>${escapeHtml(title)}</h3></div></div><div class="view-content">${html}</div>`;
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
function brandLoading(label){
  return `<div class="loading-card brand-loading"><img src="/assets/vch/brand/vch-metal.svg" alt="VCH"><span>${escapeHtml(label)}</span></div>`;
}
async function showBackendView(kind){
  if(kind==='puzzle'){
    setDynamicView('puzzles','Puzzle Training',brandLoading('Loading a real tactical position…'));
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
    setDynamicView('arena','Arena',brandLoading('Loading live tournaments…'));
    try{
      const data=await api.tournaments(),events=data.tournaments||data.events||[];
      const target=$('#dynamicView .view-content');
      target.innerHTML=`<div class="arena-list">${events.map((t,i)=>`<article data-arena="${i}"><div><small>${t.rated?'RATED':'CASUAL'} · ${escapeHtml(t.pool||'arena')}</small><h4>${escapeHtml(t.name||t.title||'Arena')}</h4><p>${Number(t.base_seconds||600)/60}+${t.increment_seconds||0} · ${t.status||'active'}</p></div><div><button class="arena-join">Join</button><button class="arena-standings">Standings</button></div><section class="standings-slot"></section></article>`).join('')}</div>`;
      [...target.querySelectorAll('[data-arena]')].forEach((row,i)=>{
        const t=events[i];
        row.querySelector('.arena-join').onclick=async()=>{try{await api.tournamentJoin(t.id);await api.queueJoin({seconds:Number(t.base_seconds||600),increment:Number(t.increment_seconds||0),rated:!!t.rated,tournamentId:t.id});mode='match';toast('Arena queue joined');const timer=setInterval(async()=>{try{const state=await api.queueStatus(!!t.rated);if(state.game||state.matched){clearInterval(timer);applyServerState(state);showMovesView();toast('Arena match found')}}catch(error){clearInterval(timer);toast(error.message)}},1000)}catch(error){toast(error.message)}};
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
function setPrimaryScreen(screen,{remember=false}={}){
  const shell=$('.shell'),menu=$('#mainMenu'),workspace=$('#gameWorkspace'),showGame=screen==='game';
  shell?.classList.toggle('game-active',showGame);shell?.classList.toggle('intro-active',!showGame);
  menu?.setAttribute('aria-hidden',String(showGame));workspace?.setAttribute('aria-hidden',String(!showGame));
  document.body.dataset.screen=showGame?'game':'intro';
  if(showGame&&remember)localStorage.setItem('vch.intro-seen','1');
  window.scrollTo(0,0);
}
document.body.dataset.screen=startsInGame?'game':'intro';
$$('.main-nav button').forEach(button=>button.onclick=()=>{if($('.shell')?.classList.contains('intro-active'))setPrimaryScreen('game',{remember:true});activateNav(button.dataset.nav)});
$('#joinNow').onclick=()=>{setPrimaryScreen('game',{remember:true});activateNav('play')};
$$('.feature-card').forEach(button=>button.onclick=()=>activateNav(button.dataset.action));
$$('.tabs button').forEach(button=>button.onclick=()=>{const kind=button.dataset.tab;if(kind==='moves')showMovesView();if(kind==='analysis'){startGameReview();document.querySelector('.analysis')?.scrollIntoView({block:'nearest'})}if(kind==='openings')renderOpenings();if(kind==='famous')renderFamous()});
$('#reviewGame').onclick=startGameReview;
$('#reviewFirst').onclick=()=>setReviewPly(0);
$('#reviewPrev').onclick=()=>setReviewPly(reviewState.currentPly-1);
$('#reviewNext').onclick=()=>setReviewPly(reviewState.currentPly+1);
$('#reviewLast').onclick=()=>setReviewPly(reviewState.moves.length);
document.addEventListener('keydown',event=>{
  if(!reviewState.viewing||event.metaKey||event.ctrlKey||event.altKey||/INPUT|TEXTAREA|SELECT/.test(event.target?.tagName||''))return;
  if(event.key==='ArrowLeft'){event.preventDefault();setReviewPly(reviewState.currentPly-1)}
  if(event.key==='ArrowRight'){event.preventDefault();setReviewPly(reviewState.currentPly+1)}
  if(event.key==='Home'){event.preventDefault();setReviewPly(0)}
  if(event.key==='End'){event.preventDefault();setReviewPly(reviewState.moves.length)}
});
$('#openChat').onclick=()=>{$('#chatDrawer').classList.add('open');$('#chatDrawer').setAttribute('aria-hidden','false');loadChat()};
$('#closeChat').onclick=()=>{$('#chatDrawer').classList.remove('open');$('#chatDrawer').setAttribute('aria-hidden','true')};
$('#accountBtn').onclick=openAccount;
$$('[data-auth]').forEach(button=>button.onclick=()=>{
  authMode=button.dataset.auth;$$('[data-auth]').forEach(x=>x.classList.toggle('on',x===button));
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
$('#installBtn').onclick=async()=>{if(installPrompt){installPrompt.prompt();await installPrompt.userChoice;installPrompt=null}else toast('Use your browser menu to install this app')};
$('#notifyBtn').onclick=()=>toast('Game notifications will appear here');
const savedTheme=JSON.parse(localStorage.getItem('vanta.theme')||'{}');
savedTheme.pieceTint=0;
document.documentElement.style.setProperty('--white-piece',savedTheme.whitePiece||'#f0d9a4');
document.documentElement.style.setProperty('--black-piece',savedTheme.blackPiece||'#342019');
document.documentElement.style.setProperty('--piece-tint','0');
for(const [key,value] of Object.entries(savedTheme)){if(key==='wallpaper')document.body.dataset.wallpaper=value;else if(key!=='pieceStyle'&&key!=='pieceTint')document.documentElement.style.setProperty(key,value)}
$$('[data-theme]').forEach(input=>input.oninput=()=>{const value=input.type==='range'?(input.dataset.theme==='--glass'?`${input.value/100}`:`${input.value/100}s`):input.value;document.documentElement.style.setProperty(input.dataset.theme,value);savedTheme[input.dataset.theme]=value;localStorage.setItem('vanta.theme',JSON.stringify(savedTheme))});
savedTheme.pieceStyle=applyPieceStyle(savedTheme.pieceStyle);
localStorage.setItem('vanta.theme',JSON.stringify(savedTheme));
$('#pieceStyle').onchange=e=>{savedTheme.pieceStyle=applyPieceStyle(e.target.value);localStorage.setItem('vanta.theme',JSON.stringify(savedTheme))};
$('#whitePiece').value=savedTheme.whitePiece||'#f0d9a4';$('#blackPiece').value=savedTheme.blackPiece||'#342019';$('#pieceTint').value=0;$('#whitePiece').oninput=e=>{savedTheme.whitePiece=e.target.value;document.documentElement.style.setProperty('--white-piece',e.target.value);localStorage.setItem('vanta.theme',JSON.stringify(savedTheme))};$('#blackPiece').oninput=e=>{savedTheme.blackPiece=e.target.value;document.documentElement.style.setProperty('--black-piece',e.target.value);localStorage.setItem('vanta.theme',JSON.stringify(savedTheme))};$('#pieceTint').oninput=e=>{savedTheme.pieceTint=Number(e.target.value)/100;document.documentElement.style.setProperty('--piece-tint',String(savedTheme.pieceTint));localStorage.setItem('vanta.theme',JSON.stringify(savedTheme))};$('#wallpaper').onchange=e=>{document.body.dataset.wallpaper=e.target.value;savedTheme.wallpaper=e.target.value;localStorage.setItem('vanta.theme',JSON.stringify(savedTheme))};
$('#closeTheme').onclick=()=>$('#themeStudio').close();
