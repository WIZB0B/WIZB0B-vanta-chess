import './style.css';
import { Chess } from 'chess.js';
import { createClient } from '@supabase/supabase-js';
import { VchApi, stableGuestToken } from './vch-api.js';
import { initialClocks, normalizeRoomId } from './game-config.js';
import { createClockSnapshot, projectedClocks, seatFromEnvelope } from './server-state.js';
import { OPENINGS, FAMOUS_GAMES, LESSONS, detectOpening } from './content.js';
import { REVIEW_DEPTH, CLASSIFICATION_META, accuracyFromLosses, classificationAsset, classifyMove, formatMoveDuration, winPercentageLoss } from './review.js';
import { migratePieceStyle, normalizePieceStyle, pieceAssetFor, pieceStyleOptions } from './piece-styles.js';
import { PremoveQueue, consumeLegalPremove } from './premove.js';
import { dragDistanceExceeded, dropOutcome, squareFromPoint } from './board-drag.js';
import { arrowsSvg, brushFor, moveDurationMs, pieceKey, pieceTransform, positionMap, toggleShape } from './board-view.js';
import { PieceLayer } from './piece-layer.js';
import { PieceReactions } from './piece-reactions.js';
import { analyzeMoods, bearing, fairMoods, landingImpact } from './piece-expressions.js';
import { REVIEW_REACTION, HAPTICS, capturedPieces, endingCast, hapticFor } from './game-feel.js';
import { FLAG_URL, countryList, countryName } from './flags.js';
import { avatarFromFile, setPortrait } from './portrait.js';
import { flashSquareFor, illegalReason } from './illegal-move.js';
import { abandonState, firstMoveOfLine, tabTitle, tickSecond } from './game-moments.js';
import { MOBILE_QUERY, moveStripHtml, viewForTab } from './mobile-shell.js';
import { browseLine, browseStep, browseTo, undoPlies } from './move-browse.js';
import { arenaPhase, isWeeklyArena, sortArenas, standingsRows } from './arena.js';
import { archiveEntryFromServer, chapterAccuracy, formInsights, keyMoments, loadLocalArchive, loadReviewCache, outcomeFor, sansFromPgn, saveLocalGame, saveReviewSummary, storyChapters, storyDelayMs, worstMoment } from './game-story.js';
import { CONFIRM_WAIT_MS, confirms, isExpired, isStale, provisionalMove, waiter } from './online-sync.js';
import { vchDialog } from './vch-dialog.js';
import { MenuController, backdropHit } from './menus.js';
import { ANALYSIS_MAX_DEPTH, BOT_MOVE_TIMEOUT_MS, botSearchNodes } from './engine-config.js';
import { friendlyAuthError, handleAuthCallback, withAuthRedirect } from './auth-callback.js';
import { dismissSplash, isStandaloneDisplay, splashMarkup, splashPlan } from './splash.js';

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
const game=new Chess(); const premoves=new PremoveQueue(); const menus=new MenuController(); const realtimeClientId=crypto.randomUUID(); let selected=null, flipped=false, mode='room', myColor=null, ticking, enginePending, serverGameId=null, serverVersion=0, pollTimer, clockSnapshot=null, serverGame=null, botThinking=false, puzzleSession=null, currentPlayerId=null, orientationSet=false, lastAnimatedVersion=0, lastDrawOffer=null, drawOfferTimer=null, drawOfferCountdownTimer=null, drawOfferKey=null, pollCount=0, currentBot=null, latencyMs=null, realtimeChannel=null, realtimeGameId=null, realtimeReady=false, realtimePingTimer=null, pingProbe=null, realtimeRefreshPromise=null, onlineMovePending=false, lastLocalRealtimeMove=null, provisional=null, relayConfirm=null, installPrompt=null, lastGameStartKey=null, lastGameOverKey=null, gameStartBannerTimer=null, localGameOverInfo=null, currentRightView='moves', analysisTimer=null, analysisScore=0, matchTimer=null, searching=false, localClockState=null, localGameOver=false, roomCreated=false, computerStarted=false, computerSideChoice='w', computerSide='w', botsLoaded=false, selectedComputerBotSlug='gambit', toastTimer=null, chatUnread=0, lastChatMessageId=null, chatSessionStartedAt=Date.now(), lowTimeWarned=false, opponentWasConnected=null, rematchOfferPending=false;
// Phone layout state (see the Phone layout section).
let mobileMedia=null,mView='home',mTab='play',mLastGameKey=null,mReviewShown=false;
let archiveSession=null,retrySession=null,storyTimer=null,lastLocalArchiveId=null; // Game Story (src/game-story.js)
let watchSession=null; // spectating a live game: {id,state,timer,channel,prevMode}
let browse=null; // looking at an earlier position: {ply,positions,moves} (src/move-browse.js)
let pointerDrag=null, suppressBoardClick=false, instantMoveAnimation=false, toneContext=null;
let expressionSetting=(()=>{try{return JSON.parse(localStorage.getItem('vanta.theme')||'{}').expressions||'full'}catch{return 'full'}})();
let lastPointerType='mouse'; // touch taps make a selected piece react (no hover on touch)
// Piece reactions (src/piece-reactions.js): hover gestures, lean, press pull and hint swell.
const reactions=new PieceReactions({
  pieceAt:square=>boardDom?.pieces.element(square)||null,
  canPick:square=>!!dragKindFor(square),
  squareEl:square=>boardDom?.squares.get(square)||null,
  enabled:()=>!prefersReducedMotion()&&motionScale()>0,
});
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
// Bot moves, live analysis and game review each own a separate Stockfish worker, so the
// bot and analysis never share one engine.
let engineRequestSeq=0,analysisRequest=null;
stockfish.onmessage=({data})=>{
  if(!enginePending||data.requestId!==enginePending.id)return;
  if(data.type==='uci'&&String(data.line||'').startsWith('bestmove ')){const u=String(data.line).split(' ')[1];enginePending.resolve(u);enginePending=null}
  if(data.type==='unavailable'){enginePending.resolve(null);enginePending=null}
};
analysisWorker.onmessage=({data})=>{
  if(data.type==='unavailable'){const line=$('#line');if(line)line.textContent='Stockfish 19 unavailable in this browser.';return}
  if(!analysisRequest||data.requestId!==analysisRequest.id)return;
  if(data.type==='uci'&&String(data.line||'').startsWith('info '))updateAnalysisFromUci(String(data.line),analysisRequest);
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
document.documentElement.dataset.pieceStyle='vanta';
function pieceAsset(name){return pieceAssetFor(normalizePieceStyle(document.documentElement.dataset.pieceStyle),name)}
function applyPieceStyle(value){
  const style=normalizePieceStyle(value);
  document.documentElement.dataset.pieceStyle=style;
  const control=$('#pieceStyle');if(control)control.value=style;
  const menuPiece=$('.main-menu-art img');if(menuPiece)menuPiece.src=pieceAsset('bk');
  renderComputerBots();
  return style;
}
const app=$('#app');
const splash=splashPlan({standalone:isStandaloneDisplay(window),storage:window.localStorage});
app.innerHTML=`
${splashMarkup(splash)}
<div class="shell ${startsInGame?'game-active':'intro-active'}">
  <header class="topbar">
    <a class="brand vch-brand" href="#" aria-label="VCH home">
      <img class="vch-wordmark vch-wordmark-top" src="/assets/vch/brand/vch-metal.svg" alt="VCH">
    </a>
    <nav class="main-nav" aria-label="Primary">
      <button class="active" data-nav="play"><span class="nav-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 18 17 6M8 5l2.4 2.4M5 8l2.4 2.4M14.5 14.5 19 19M16.5 16.5 19 14"/></svg></span>Play</button>
      <button data-nav="arena"><span class="nav-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8v5a4 4 0 0 1-8 0V4Z"/><path d="M8 6H5v2a4 4 0 0 0 4 4M16 6h3v2a4 4 0 0 1-4 4M12 13v5M8 21h8M9 18h6"/></svg></span>Arena</button>
      <button data-nav="watch"><span class="nav-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg></span>Watch</button>
      <button data-nav="puzzles"><span class="nav-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h6v4.2a2.8 2.8 0 1 0 4 0V4h6v6h-4.2a2.8 2.8 0 1 0 0 4H20v6h-6v-4.2a2.8 2.8 0 1 0-4 0V20H4v-6h4.2a2.8 2.8 0 1 0 0-4H4V4Z"/></svg></span>Puzzles</button>
      <button data-nav="learn"><span class="nav-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 5.5A3.5 3.5 0 0 1 7 2h4v18H7a3.5 3.5 0 0 0-3.5 3V5.5ZM20.5 5.5A3.5 3.5 0 0 0 17 2h-4v18h4a3.5 3.5 0 0 1 3.5 3V5.5Z"/></svg></span>Learn</button>
      <button data-nav="openings"><span class="nav-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3h3v3h2V3h3v3h2v4l-2 2v5H8v-5l-2-2V6h2V3ZM6 20h12M8 17h8"/></svg></span>Openings</button>
      <button data-nav="famous"><span class="nav-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3v18M12 8h4M12 12h4M12 16h3"/></svg></span>Famous Games</button>
      <button data-nav="review"><span class="nav-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="m8 12 2.8 2.8L16.8 9"/></svg></span>Review</button>
    </nav>
    <div class="header-actions">
      <button id="searchBtn" class="icon-btn search-btn" aria-label="Search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.7" cy="10.7" r="6.3"/><path d="m16 16 4.2 4.2"/></svg></button>
      <button id="installBtn" class="install-btn"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v11M8 10l4 4 4-4M5 18v2h14v-2"/></svg><span>Install App</span></button>
      <button id="notifyBtn" class="icon-btn bell-btn" type="button" aria-label="Notifications" aria-haspopup="true" aria-expanded="false" aria-controls="notifyMenu"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 5-2 6.5-3 8h18c-1-1.5-3-3-3-8M10 21h4"/></svg></button>
      <button id="accountBtn" class="user" type="button" aria-label="Account" aria-haspopup="menu" aria-expanded="false" aria-controls="profileMenu">
        <i aria-hidden="true"></i><span>${guestName}</span><small>1200 rating</small>
        <svg class="account-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m8 10 4 4 4-4"/></svg>
      </button>
      <section id="notifyMenu" class="header-menu notify-menu" aria-label="Notifications" hidden>
        <header><b>Notifications</b><button id="closeNotifyMenu" class="menu-close" type="button" aria-label="Close notifications"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></header>
        <p class="menu-empty">No notifications yet. Game invites and your-turn alerts will appear here.</p>
      </section>
      <section id="profileMenu" class="header-menu profile-menu" aria-label="Account menu" hidden>
        <header><span id="profileMenuAvatar" class="avatar light" aria-hidden="true">GU</span><div><b id="profileMenuName">${guestName}</b><small id="profileMenuRating">1200 rating</small></div><button id="closeProfileMenu" class="menu-close" type="button" aria-label="Close account menu"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></header>
        <nav class="profile-menu-items" aria-label="Account">
          <button id="profileMenuProfile" type="button">Profile</button>
          <button id="profileMenuEdit" type="button">Edit portrait &amp; flag</button>
          <button id="profileMenuSettings" type="button">Settings</button>
          <button id="profileMenuAuth" type="button">Sign in</button>
        </nav>
      </section>
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
      <div class="m-gamebar"><button id="mBack" type="button" aria-label="Back"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 8 12l7 7"/></svg></button><div><b id="mGameTitle">Game</b><small id="mGameSub"></small></div></div>
      <div class="player top" data-player-bar="opponent">
        <span class="avatar" id="topAvatar">OP</span>
        <div class="player-info">
          <div class="player-name-row"><b id="topPlayerName">Waiting for opponent</b><span class="player-flag hidden" id="topFlag" aria-hidden="true"></span></div>
          <div class="player-meta"><span class="player-rating" id="topRating">1200</span><span class="player-presence" id="topPresence"><i class="live-dot" aria-hidden="true"></i><span>WAITING</span></span><span class="captured-tray" id="topCaptured" aria-label="Pieces captured"></span></div>
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
      <div id="drawOfferCard" class="draw-offer-card hidden" role="status" aria-live="polite">
        <div><b>Draw offer</b><small>Your opponent offered a draw · <span id="drawOfferCountdown">10s</span></small></div>
        <div><button id="declineDrawOffer" type="button">Decline</button><button id="acceptDrawOffer" type="button">Accept</button></div>
      </div>
      <div id="abandonCard" class="draw-offer-card abandon-card hidden" role="status" aria-live="polite">
        <div><b>Your opponent left</b><small id="abandonText">You can claim the win in 30s if they don't come back</small></div>
        <div><button id="abandonDraw" type="button" class="hidden">Call it a draw</button><button id="abandonClaim" type="button" class="hidden">Claim win</button></div>
      </div>
      <div id="takebackCard" class="draw-offer-card takeback-card hidden" role="status" aria-live="polite">
        <div><b>Takeback request</b><small>Your opponent wants to take back their last move</small></div>
        <div><button id="declineTakeback" type="button">Decline</button><button id="acceptTakeback" type="button">Accept</button></div>
      </div>
      <div class="player bottom" data-player-bar="local">
        <span class="avatar light" id="bottomAvatar">GU</span>
        <div class="player-info">
          <div class="player-name-row"><b id="bottomPlayerName">You · ${guestName}</b><span class="player-flag hidden" id="bottomFlag" aria-hidden="true"></span></div>
          <div class="player-meta"><span class="player-rating" id="bottomRating">1200</span><span class="player-presence" id="bottomPresence"><i class="live-dot" aria-hidden="true"></i><span>LOCAL</span></span><span class="captured-tray" id="bottomCaptured" aria-label="Pieces captured"></span></div>
        </div>
        <div class="player-connection hidden" id="bottomConnection" aria-label="Network latency">
          <span class="ping-bars" id="bottomPingBars" aria-hidden="true"><i></i><i></i><i></i></span><span id="bottomPing">-- ms</span>
        </div>
        <time id="bottomClock" data-color="w">10:00</time>
      </div>
      <div class="tools"><button id="flip">⇄ Flip board</button><button id="sound">♫ Sound on</button><button id="theme">▦ Board theme</button><button id="resign" class="danger">⚑ Resign</button><details class="game-more"><summary aria-label="More game actions"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg></summary><div class="game-more-menu"><button id="hint" type="button" class="hidden">Hint</button><button id="takeback" type="button" class="hidden">Ask to take back</button><button id="draw" type="button">Offer draw</button><button id="openChat" type="button">Chat <span id="chatUnread" class="chat-unread hidden" aria-label="Unread messages">0</span></button></div></details></div>
      <div class="m-movebar"><button type="button" data-browse="prev" aria-label="Previous move"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg></button><div id="mMoves" class="m-moves" aria-label="Moves"></div><button type="button" data-browse="next" aria-label="Next move"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></button></div>
      <div class="m-actions" aria-label="Game actions"><button type="button" data-m-action="options"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg><span>Options</span></button><button type="button" data-m-action="draw"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M12 5v14" transform="rotate(45 12 12)"/></svg><span>Draw</span></button><button type="button" data-m-action="takeback" class="hidden"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7 4 12l5 5M4 12h11a5 5 0 0 1 0 10h-3"/></svg><span>Takeback</span></button><button type="button" data-m-action="leave" class="hidden"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg><span>Stop watching</span></button><button type="button" data-m-action="resign"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 21V4M6 4h11l-2.5 4L17 12H6"/></svg><span>Resign</span></button><button type="button" data-m-action="chat"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4V5Z"/></svg><span>Chat</span></button><button type="button" data-m-action="undo" class="hidden"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7 4 12l5 5"/><path d="M4 12h10a6 6 0 0 1 0 12h-2" transform="translate(0 -6)"/></svg><span>Undo</span></button><button type="button" data-m-action="hint" class="hidden"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3Z"/></svg><span>Hint</span></button><button type="button" data-m-action="review" class="hidden"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="m8 12 2.8 2.8L16.8 9"/></svg><span>Review</span></button><button type="button" data-m-action="rematch" class="hidden"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18 3v4h-4M6 21v-4h4"/></svg><span>Rematch</span></button><button type="button" data-m-action="new" class="hidden"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg><span>New game</span></button></div>
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
          <div class="move-nav" aria-label="Move navigation"><button type="button" data-browse="first" aria-label="First move"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5v14M18 6l-7 6 7 6"/></svg></button><button type="button" data-browse="prev" aria-label="Previous move"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg></button><button type="button" data-browse="next" aria-label="Next move"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></button><button type="button" data-browse="live" aria-label="Back to the live position"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 5v14M6 6l7 6-7 6"/></svg></button><button type="button" id="undoMove" class="undo-move hidden">Undo</button></div>
          <div class="analysis">
            <header><b><img class="analysis-title-icon" src="/assets/vch/icons/review.svg" alt="">Engine Analysis</b><small>Stockfish 19 · Depth <span id="depth">—</span></small></header>
            <div id="reviewProgress" class="review-progress hidden" aria-live="polite"><span><b id="reviewProgressLabel">Analyzing game</b><em id="reviewProgressCount">0 / 0</em></span><div><i id="reviewProgressFill"></i></div></div>
            <p id="engineLockedNote" class="engine-locked-note hidden">Engine analysis is off while a live game is played, for both players. It comes back, with Review game, as soon as the game ends.</p>
            <div class="analysis-row"><h2 id="score">+0.0</h2><div class="meter"><i id="meterFill"></i></div></div>
            <p id="advantage">Equal position</p>
            <small>Principal variation</small><p id="line">Analysis begins after your move.</p>
            <button id="reviewGame" class="review-game hidden" type="button"><img src="/assets/vch/icons/review.svg" alt="">Review game</button>
            <section id="reviewDashboard" class="review-dashboard hidden" aria-label="Game review">
              <section id="storyCard" class="story-card hidden" aria-label="Game story"></section>
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
  <button id="mReturnGame" class="m-return hidden" type="button">Back to your game</button>
  <nav class="m-tabs" aria-label="Sections"><button type="button" data-m-tab="play"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 18 17 6M8 5l2.4 2.4M5 8l2.4 2.4M14.5 14.5 19 19M16.5 16.5 19 14"/></svg><span>Play</span></button><button type="button" data-m-tab="puzzles"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h6v4.2a2.8 2.8 0 1 0 4 0V4h6v6h-4.2a2.8 2.8 0 1 0 0 4H20v6h-6v-4.2a2.8 2.8 0 1 0-4 0V20H4v-6h4.2a2.8 2.8 0 1 0 0-4H4V4Z"/></svg><span>Puzzles</span></button><button type="button" data-m-tab="learn"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 5.5A3.5 3.5 0 0 1 7 2h4v18H7a3.5 3.5 0 0 0-3.5 3V5.5ZM20.5 5.5A3.5 3.5 0 0 0 17 2h-4v18h4a3.5 3.5 0 0 1 3.5 3V5.5Z"/></svg><span>Learn</span></button><button type="button" data-m-tab="watch"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg><span>Watch</span></button><button type="button" data-m-tab="more"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg><span>More</span></button></nav>
  <div id="mSheet" class="m-sheet" hidden><div class="m-sheet-backdrop" data-m-close></div><section class="m-sheet-card" role="dialog" aria-modal="true" aria-labelledby="mSheetTitle"><header><b id="mSheetTitle">More</b><button type="button" data-m-close aria-label="Close"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></header><div id="mSheetItems" class="m-sheet-items"></div></section></div>
</div>

<div id="toast"></div>

<aside id="chatDrawer" class="chat-drawer" aria-hidden="true">
  <header><div><small>PLAYER CHAT</small><h3>Game conversation</h3></div><button id="closeChat" aria-label="Close chat">×</button></header>
  <div id="messages"></div>
  <form id="chat"><input id="message" maxlength="160" placeholder="Send a friendly message…"><button>Send</button></form>
</aside>

<dialog id="promotion"><h2>Promote pawn</h2><div><button data-piece="q">♕</button><button data-piece="r">♖</button><button data-piece="b">♗</button><button data-piece="n">♘</button></div></dialog>
<dialog id="themeStudio"><h2>Theme Studio</h2><label>Light squares <input data-theme="--light" type="color" value="#d9cfb2"></label><label>Dark squares <input data-theme="--dark" type="color" value="#29463b"></label><label>Accent <input data-theme="--mint" type="color" value="#82edba"></label><label>Gold <input data-theme="--gold" type="color" value="#e5c17c"></label><label>Glass opacity <input data-theme="--glass" type="range" min="35" max="100" value="94"></label><label>Motion <input data-theme="--motion" type="range" min="0" max="100" value="100"></label><label>Ivory piece tint <input id="whitePiece" type="color" value="#f0d9a4"></label><label>Black piece tint <input id="blackPiece" type="color" value="#342019"></label><label>Piece tint strength <input id="pieceTint" type="range" min="0" max="70" value="18"></label><label>Piece style <select id="pieceStyle">${pieceStyleOptions()}</select></label><label>Piece expressions <select id="expressionsSetting"><option value="full">Full</option><option value="subtle">Subtle</option><option value="off">Off</option></select></label><label>Wallpaper <select id="wallpaper"><option value="classic">Midnight Emerald</option><option value="cobalt">Midnight Cobalt</option><option value="burgundy">Burgundy Brass</option><option value="ivory">Ivory Noir</option></select></label><button id="closeTheme" class="gold theme-done">Done</button></dialog>


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

dismissSplash($('#brandSplash'),splash);

let clocks=initialClocks(Number($('#time').value));
// Board rendering (backlog V1-fix), chessground-style: the squares grid is built once (again
// only when the board flips) and updated in place; pieces live in ONE absolutely positioned
// layer above it (src/piece-layer.js), arrows in an SVG layer above that, and a dragged piece
// in a fixed drag layer on top. renderBoard() is cheap and synchronous, so a move's highlight
// and its slide (a Web Animations API transform animation) start in the same frame as the
// move. Everything else (status text, move list, clocks, sound, analysis, engine, game-over
// check) waits until the slide has landed and at least two frames have been painted
// (afterBoardPaint); the online move request waits two frames (nextFrames).
let boardDom=null,boardShapes=[],shapeDraft=null,lastBoardPlacement='',lastMoveCache={fen:'',move:null},statusScheduled=false;
let boardMotion=Promise.resolve(),boardMotionUntil=0,motionScaleCache=null;
function nextFrames(count=2){
  return new Promise(resolve=>{
    if(document.hidden){setTimeout(resolve,0);return}
    const step=left=>left?requestAnimationFrame(()=>step(left-1)):resolve();step(count);
  });
}
function afterBoardPaint(fn){
  let done=false;const run=()=>{if(!done){done=true;fn()}};
  if(document.hidden){setTimeout(run,0);return}
  let framesDone=false,landed=false;
  const go=()=>{if(framesDone&&landed)setTimeout(run,0)};
  nextFrames(2).then(()=>{framesDone=true;go()});
  boardMotion.then(()=>{landed=true;go()});
  // Safety net: work is never held back long, even if frames stop (throttled tab).
  setTimeout(run,Math.max(0,boardMotionUntil-performance.now())+400);
}
function boardIsMoving(){return performance.now()<boardMotionUntil}
// The Motion slider (0-400ms, default 400) scales move slides; reduced motion turns them off.
function motionScale(){
  if(prefersReducedMotion())return 0;
  motionScaleCache??=motionDurationMs()/400;
  return motionScaleCache;
}
function ensureBoardDom(){
  const board=$('#board');
  if(!boardDom||boardDom.board!==board){
    const pieceLayer=document.createElement('div');pieceLayer.className='piece-layer';
    const arrowLayer=document.createElementNS('http://www.w3.org/2000/svg','svg');
    arrowLayer.setAttribute('class','arrow-layer');arrowLayer.setAttribute('viewBox','0 0 8 8');arrowLayer.setAttribute('preserveAspectRatio','none');arrowLayer.setAttribute('aria-hidden','true');
    const badge=document.createElement('div');badge.className='board-badge hidden';pieceLayer.append(badge);
    const fxLayer=document.createElement('div');fxLayer.className='fx-layer';fxLayer.setAttribute('aria-hidden','true');
    board.replaceChildren(fxLayer,pieceLayer,arrowLayer);
    let dragLayer=document.querySelector('.drag-layer');
    if(!dragLayer){dragLayer=document.createElement('div');dragLayer.className='drag-layer';dragLayer.setAttribute('aria-hidden','true');document.body.append(dragLayer)}
    boardDom={board,fxLayer,moodKey:'',pieceLayer,arrowLayer,dragLayer,badge,badgeKey:'',arrowsHtml:'',pieces:new PieceLayer(pieceLayer),squares:new Map(),squaresFlipped:null};
  }
  if(boardDom.squaresFlipped!==flipped){
    const order=flipped?[...Array(64).keys()].reverse():[...Array(64).keys()],fragment=document.createDocumentFragment();
    boardDom.squares.forEach(el=>el.remove());boardDom.squares.clear();
    order.forEach(i=>{
      const r=Math.floor(i/8),f=i%8,sq='abcdefgh'[f]+(8-r),el=document.createElement('button');
      el.type='button';el.dataset.sq=sq;el.dataset.shade=(r+f)%2?'dark':'light';el.className=`square ${el.dataset.shade}`;
      boardDom.squares.set(sq,el);fragment.append(el);
    });
    board.insertBefore(fragment,boardDom.pieceLayer);boardDom.squaresFlipped=flipped;
    const rankCoords=$('#rankCoords'),fileCoords=$('#fileCoords');
    if(rankCoords)rankCoords.innerHTML=(flipped?['1','2','3','4','5','6','7','8']:['8','7','6','5','4','3','2','1']).map(value=>`<span>${value}</span>`).join('');
    if(fileCoords)fileCoords.innerHTML=(flipped?['h','g','f','e','d','c','b','a']:['a','b','c','d','e','f','g','h']).map(value=>`<span>${value}</span>`).join('');
  }
  return boardDom;
}
// chess.js replays the whole game for history(), so the last move is remembered when it is
// played and only recomputed when the position came from somewhere else.
function rememberLastMove(made){if(made){lastMoveCache={fen:game.fen(),move:made};if(browse){browse=null;syncBrowseUi()}}return made}
function localLastMove(){
  const fen=game.fen();
  if(lastMoveCache.fen!==fen)lastMoveCache={fen,move:game.history({verbose:true}).at(-1)||null};
  return lastMoveCache.move;
}
function boardLastMove(){
  if(browse&&!reviewState.viewing)return browse.ply>0?browse.moves[browse.ply-1]:null;
  const reviewLast=reviewState.viewing&&reviewState.currentPly>0?reviewState.moves[reviewState.currentPly-1]:null;
  const serverLast=watchSession?watchSession.state?.move_history?.at?.(-1)||localLastMove():serverGameId&&Array.isArray(serverGame?.move_history)?serverGame.move_history.at(-1):null;
  return reviewLast||serverLast||localLastMove();
}
function grabbableColor(){
  if(retrySession)return game.turn();
  if(browse||mode==='watch'||mode==='archive')return '';
  if(canQueuePremove())return premovePlayerColor();
  if(reviewState.viewing||localGameOver||game.isGameOver()||(serverGameId&&myColor&&myColor!==game.turn())||(mode==='computer'&&(!computerStarted||game.turn()!==computerSide)))return '';
  return game.turn();
}
function renderArrows(dom=ensureBoardDom()){
  const html=arrowsSvg(boardShapes,shapeDraft,flipped);
  if(html!==dom.arrowsHtml){dom.arrowsHtml=html;dom.arrowLayer.innerHTML=html}
}
// ---- Piece expressions (src/piece-expressions.js) ----
// Setting (Theme Studio): Full (default), Subtle or Off. A rated game in progress uses the
// "fair" level: softer, and only moods that give nothing away (see fairMoods). Landing rings
// and shockwaves react to a move already made, so they stay on at every level but Off.
function ratedLiveGame(){return !!(serverGameId&&serverGame?.rated&&!localGameOver&&serverGame?.status==='active'&&!serverGame?.bot_player_id)}
function expressionLevel(){
  if(prefersReducedMotion()||motionScale()<=0||expressionSetting==='off')return 'off';
  if(ratedLiveGame())return 'fair';
  return expressionSetting==='subtle'?'subtle':'full';
}
function expressionsEnabled(){return expressionLevel()!=='off'}
function applyMoods(dom,boardGame,placement){
  const level=expressionLevel();
  if(document.documentElement.dataset.expressions!==level)document.documentElement.dataset.expressions=level;
  const key=level==='off'?'off':`${level}|${placement}|${boardGame.turn()}|${flipped}`;
  if(key===dom.moodKey)return;dom.moodKey=key;
  const all=level==='off'?new Map():analyzeMoods(boardGame);
  const moods=level==='fair'?fairMoods(all,boardGame):all;
  for(const [sq,el] of dom.pieces.elements){
    const m=moods.get(sq);
    if(!m){if(el.dataset.mood){delete el.dataset.mood;el.style.removeProperty('--toward')}continue}
    if(el.dataset.mood!==m.mood)el.dataset.mood=m.mood;
    if(m.toward)el.style.setProperty('--toward',`${bearing(sq,m.toward,flipped)}deg`);else el.style.removeProperty('--toward');
  }
}
function squareCenter(square){
  const f=square.charCodeAt(0)-97,r=Number(square[1])-1;
  return {x:((flipped?7-f:f)+.5)*12.5,y:((flipped?r:7-r)+.5)*12.5};
}
function landingFx(made){
  const dom=boardDom;if(!dom||!expressionsEnabled())return;
  const impact=landingImpact(game,made.to,made.color),c=squareCenter(made.to);
  buzz(hapticFor(made,game.inCheck()));
  const ring=document.createElement('i');ring.className=`fx-ring${impact.shock?' fx-shock':''} fx-${made.color}`;
  ring.style.left=c.x+'%';ring.style.top=c.y+'%';
  dom.fxLayer.append(ring);ring.addEventListener('animationend',()=>ring.remove(),{once:true});
  setTimeout(()=>ring.remove(),1600);
  for(const {square,distance} of impact.hit){
    const el=dom.pieces.element(square);if(!el)continue;
    setTimeout(()=>{el.classList.remove('shocked');void el.offsetWidth;el.classList.add('shocked');setTimeout(()=>el.classList.remove('shocked'),520)},90+distance*110);
  }
}
// ---- Game feel (src/game-feel.js) ----
// Captured-pieces trays: each player bar lists the pieces that player has taken, smallest
// last, with the material lead (+N) for the side ahead.
function syncCapturedTrays(boardGame,placement){
  const style=document.documentElement.dataset.pieceStyle||'vanta',bars=playerBarClockColors();
  const key=`${placement}|${style}|${bars.top}`;if(syncCapturedTrays.key===key)return;syncCapturedTrays.key=key;
  const caps=capturedPieces(boardGame.board());
  for(const [id,color] of [['#topCaptured',bars.top],['#bottomCaptured',bars.bottom]]){
    const tray=$(id);if(!tray)continue;
    const enemy=color==='w'?'b':'w',groups=[];
    for(const type of caps[color]){const last=groups.at(-1);if(last?.type===type)last.n++;else groups.push({type,n:1})}
    tray.innerHTML=groups.map(g=>`<span class="tray-group" data-type="${g.type}">${Array(g.n).fill(`<img src="${pieceAssetFor(style,enemy+g.type)}" alt="">`).join('')}</span>`).join('')+(caps.lead[color]?`<b class="tray-lead">+${caps.lead[color]}</b>`:'');
    tray.setAttribute('aria-label',caps[color].length?`Captured: ${caps[color].map(t=>pieceNames[t]).join(', ')}${caps.lead[color]?`, ahead by ${caps.lead[color]}`:''}`:'No captures yet');
  }
}
// The game-end moment: the winner's pieces cheer in a wave, the losing king topples (and
// stays down until the next game); a draw makes both kings bow. Then the result dialog.
function clearEnding(dom){
  dom.endingPlacement=null;
  for(const el of dom.pieceLayer.querySelectorAll('.board-piece[data-ending]')){delete el.dataset.ending;el.style.removeProperty('--wave')}
}
async function playEnding(info){
  const dom=boardDom,cast=endingCast(info?.result);
  if(!dom||!cast||!expressionsEnabled())return;
  clearEnding(dom);dom.endingPlacement=game.fen().split(' ')[0];
  let i=0;
  for(const [sq,el] of dom.pieces.elements){
    const key=el.dataset.piece||'';
    if(cast.draw){if(key[1]==='k')el.dataset.ending='bow';continue}
    if(key[0]===cast.winner){el.dataset.ending='cheer';el.style.setProperty('--wave',`${(i++%8)*70}ms`)}
    else if(key===cast.loser+'k')el.dataset.ending='topple';
  }
  await new Promise(resolve=>setTimeout(resolve,1900));
}
function buzz(pattern){
  if(lastPointerType==='mouse'||!expressionsEnabled())return;
  try{navigator.vibrate?.(pattern)}catch{}
}
function renderBoard({hint=null,instant=false}={}){
  const scale=instant?0:motionScale(),dom=ensureBoardDom();
  const reviewFen=reviewState.viewing?reviewState.positions[reviewState.currentPly]:null;
  const browseFen=!reviewFen&&browse?browse.positions[browse.ply]:null;
  const boardGame=reviewFen||browseFen?new Chess(reviewFen||browseFen):game,placement=boardGame.fen().split(' ')[0];
  dom.board.classList.toggle('browsing',!!browseFen);
  if(placement!==lastBoardPlacement){if(lastBoardPlacement)boardShapes=[];lastBoardPlacement=placement} // a move clears arrows and marks
  const legal=new Set(reviewState.viewing||browse||!selected?[]:game.moves({square:selected,verbose:true}).map(m=>m.to));
  const lastMove=boardLastMove(),position=positionMap(boardGame.board());
  let checked=null;
  if(boardGame.inCheck())for(const [sq,key] of position)if(key===boardGame.turn()+'k')checked=sq;
  const mated=!reviewState.viewing&&checked&&boardGame.isCheckmate();
  const marks=new Map(boardShapes.filter(shape=>!shape.to||shape.to===shape.from).map(shape=>[shape.from,shape.brush]));
  const dragOver=pointerDrag?.started?pointerDrag.over:null;
  for(const [sq,el] of dom.squares){
    const key=position.get(sq),mark=marks.get(sq);
    const cls=`square ${el.dataset.shade}${key?' occupied':''}${lastMove&&(lastMove.from===sq||lastMove.to===sq)?' last-move':''}${selected===sq?' selected':''}${premoves.selected===sq?' premove-selecting':''}${premoves.move&&(premoves.move.from===sq||premoves.move.to===sq)?' premove':''}${legal.has(sq)?' legal':''}${checked===sq?' check':''}${mated&&checked===sq?' mated-king':''}${dragOver===sq?' drag-over':''}${reactions.hoverSquare===sq?' hover-piece':''}${reactions.hintSquare===sq&&legal.has(sq)?' hint-hover':''}${mark?` shape-mark shape-mark-${mark}`:''}`;
    if(el.className!==cls)el.className=cls;
    const label=sq+(key?` ${key[0]==='w'?'white':'black'} ${pieceNames[key[1]]}`:' empty');
    if(el.getAttribute('aria-label')!==label)el.setAttribute('aria-label',label);
  }
  const motion=dom.pieces.sync(position,{flipped,animate:!instant,duration:(from,to)=>moveDurationMs(from,to,scale),hint});
  // A move or a change of turn can leave the hovered piece somewhere else or no longer yours.
  if(reactions.hovered&&(reactions.pieceAt(reactions.hoverSquare)!==reactions.hovered||!reactions.canPick(reactions.hoverSquare)))reactions.clearHover();
  if(reactions.hintSquare&&!legal.has(reactions.hintSquare))reactions.hint(null);
  // Touch: the selected piece gestures once and stays lifted while it is selected.
  if(selected&&lastPointerType!=='mouse'&&!pointerDrag?.started){if(reactions.picked!==reactions.pieceAt(selected))buzz(HAPTICS.pick);reactions.pick(selected)}else reactions.unpick();
  if(motion.animated){boardMotion=motion.finished;boardMotionUntil=performance.now()+motion.durationMs}
  applyMoods(dom,boardGame,placement);
  syncCapturedTrays(boardGame,placement);
  if(dom.endingPlacement&&dom.endingPlacement!==placement)clearEnding(dom);
  if(hint?.to&&!reviewState.viewing){const made=hint;if(motion.animated)motion.finished.then(()=>landingFx(made));else landingFx(made)}
  const hidden=pointerDrag?.started?pointerDrag.from:null;
  for(const [sq,el] of dom.pieces.elements)el.classList.toggle('drag-origin',sq===hidden);
  dom.board.dataset.grab=grabbableColor()||'';
  const boardReview=reviewState.viewing?reviewState.results[reviewState.currentPly-1]:reviewResultForCurrentLastMove(lastMove);
  const badgeKey=boardReview&&lastMove?.to?`${lastMove.to}:${boardReview.classification}:${flipped}`:'';
  if(badgeKey!==dom.badgeKey){
    dom.badgeKey=badgeKey;dom.badge.classList.toggle('hidden',!badgeKey);
    dom.badge.innerHTML=badgeKey?reviewBadgeMarkup(boardReview,'board-review-badge'):'';
    if(badgeKey)dom.badge.style.transform=pieceTransform(lastMove.to,flipped);
    // The moved piece reacts to its grade (triumph, proud, unsure, slump, despair).
    for(const el of dom.pieceLayer.querySelectorAll('.board-piece[data-react]'))delete el.dataset.react;
    const reaction=badgeKey&&expressionsEnabled()?REVIEW_REACTION[boardReview.classification]:null;
    const moved=reaction?dom.pieces.element(lastMove.to):null;
    if(moved)moved.dataset.react=reaction;
  }
  renderArrows(dom);
  dom.board.classList.toggle('mate',game.isCheckmate());
}
function renderStatus(){
  if(localGameOver){
    $('#turn').textContent=localGameOverInfo?.reason==='on time'?'Game over · Time expired':'Game over · Resignation';
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
  updateOpeningLabel();scheduleAnalysis();void maybeShowGameOver();syncMobileShell();
}
// The board updates now; status text, review decorations, opening name, analysis and the
// game-over check follow once the frame with the board change has been painted.
function render(options){
  renderBoard(options);
  if(!statusScheduled){statusScheduled=true;afterBoardPaint(()=>{statusScheduled=false;renderStatus()})}
}
function endText(){if(game.isCheckmate())return `Checkmate · ${game.turn()==='w'?'Black':'White'} wins`;if(game.isStalemate())return 'Draw · Stalemate';if(game.isThreefoldRepetition())return 'Draw · Repetition';return 'Draw';}
function formatTimeControl(seconds,increment=0){
  const base=Math.max(0,Number(seconds)||0),label=base%60===0?String(base/60):`${base}s`;
  return `${label}+${Math.max(0,Number(increment)||0)}`;
}
function playUiSound(kind){
  if($('#sound')?.dataset.off)return;
  const AudioEngine=window.AudioContext||window.webkitAudioContext;if(!AudioEngine)return;
  const patterns={start:[520,720],win:[523,659,784],lose:[392,330,262],draw:[440,494,440],warning:[760,620]},notes=patterns[kind]||[420],audio=new AudioEngine(),gain=audio.createGain();
  gain.gain.setValueAtTime(.0001,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.055,audio.currentTime+.015);gain.connect(audio.destination);
  notes.forEach((frequency,index)=>{const oscillator=audio.createOscillator(),at=audio.currentTime+index*.12;oscillator.frequency.value=frequency;oscillator.connect(gain);oscillator.start(at);oscillator.stop(at+.11)});
  const end=audio.currentTime+notes.length*.12+.04;gain.gain.exponentialRampToValueAtTime(.0001,end);setTimeout(()=>audio.close().catch(()=>{}),Math.ceil((notes.length*.12+.15)*1000));
}
function showGameStartBanner(color,seconds,increment,key){
  if(!color||!key||lastGameStartKey===key)return;
  lastGameStartKey=key;
  let banner=$('#gameStartBanner');
  if(!banner){banner=document.createElement('div');banner.id='gameStartBanner';banner.className='game-start-banner';banner.setAttribute('role','status');banner.setAttribute('aria-live','polite');document.body.append(banner)}
  banner.textContent=`Game started · You play ${color==='w'?'White':'Black'} · ${formatTimeControl(seconds,increment)}`;
  banner.classList.remove('show');void banner.offsetWidth;banner.classList.add('show');playUiSound('start');
  clearTimeout(gameStartBannerTimer);gameStartBannerTimer=setTimeout(()=>banner.classList.remove('show'),2100);
}
function normalizedEndReason(value=''){
  const reason=String(value||'').trim().toLowerCase().replace(/[_-]+/g,' ');
  if(!reason)return '';
  if(reason.includes('checkmate'))return 'by checkmate';
  if(reason.includes('timeout')||reason.includes('time'))return 'on time';
  if(reason.includes('resign'))return 'by resignation';
  if(reason.includes('abandon')||reason.includes('disconnect'))return 'by abandonment';
  if(reason.includes('stalemate'))return 'by stalemate';
  if(reason.includes('repetition'))return 'by repetition';
  if(reason.includes('insufficient'))return 'by insufficient material';
  if(reason.includes('50')||reason.includes('fifty'))return 'by 50-move rule';
  if(reason.includes('agreement'))return 'by agreement';
  return `by ${reason}`;
}
function boardDrawReason(){
  if(game.isStalemate())return 'by stalemate';
  if(game.isThreefoldRepetition())return 'by repetition';
  if(game.isInsufficientMaterial())return 'by insufficient material';
  if(game.isDrawByFiftyMoves?.())return 'by 50-move rule';
  return 'by agreement';
}
function resultFromBoard(){
  if(game.isCheckmate())return game.turn()==='w'?'0-1':'1-0';
  if(game.isDraw())return '1/2-1/2';
  return '*';
}
function resultFromState(state){
  if(['1-0','0-1','1/2-1/2'].includes(state?.result))return state.result;
  if(state?.status==='white_won')return '1-0';
  if(state?.status==='black_won')return '0-1';
  if(String(state?.status||'').includes('draw'))return '1/2-1/2';
  return resultFromBoard();
}
function ownPlayerName(){return (currentProfile?.account&&(currentProfile.username||currentProfile.display_name))||guestName}
function ratingSummary(state,color){
  if(!state?.rated)return 'Unrated';
  const prefix=color==='w'?'white':'black',rawBefore=state?.[`${prefix}_rating_before`],rawDelta=state?.[`${prefix}_rating_delta`],before=Number(rawBefore),delta=Number(rawDelta);
  if(rawBefore!=null&&rawDelta!=null&&Number.isFinite(before)&&Number.isFinite(delta))return `${before} ${delta>=0?'+':''}${delta} → ${before+delta}`;
  if(rawBefore!=null&&Number.isFinite(before))return String(before);
  return 'Rated';
}
function gameOverInfo(){
  if(puzzleSession||reviewState.running||reviewState.viewing)return null;
  if(mode==='computer'&&computerStarted){
    const result=localGameOverInfo?.result||resultFromBoard();
    if(result==='*'&&!localGameOver)return null;
    const reason=localGameOverInfo?.reason||(game.isCheckmate()?'by checkmate':boardDrawReason()),own=ownPlayerName(),bot=currentBot?.display_name||currentBot?.name||'Computer';
    return {online:false,key:`computer:${result}:${game.fen()}:${reason}`,result,reason,myColor:computerSide,whiteName:computerSide==='w'?own:bot,blackName:computerSide==='b'?own:bot,whiteRating:'Unrated',blackRating:'Unrated'};
  }
  if(!serverGameId||!serverGame||['waiting','active','playing','in_progress'].includes(serverGame.status))return null;
  const result=resultFromState(serverGame),status=String(serverGame.status||''),timedOut=Number(serverGame.white_time_ms)<=0||Number(serverGame.black_time_ms)<=0,abandoned=serverGame.abandoned_by||serverGame.abandonment_by||serverGame.disconnect_forfeit_by||/abandon|disconnect/i.test(status);
  let reason=normalizedEndReason(serverGame.end_reason||serverGame.finish_reason||serverGame.termination_reason||serverGame.forfeit_reason);
  if(!reason)reason=game.isCheckmate()?'by checkmate':timedOut?'on time':abandoned?'by abandonment':result==='1/2-1/2'?boardDrawReason():'by resignation';
  return {online:true,key:`online:${serverGame.id}:${serverGame.version}:${status}:${result}`,result,reason,myColor,whiteName:serverGame.white_name||(myColor==='w'?ownPlayerName():'White'),blackName:serverGame.black_name||(myColor==='b'?ownPlayerName():'Black'),whiteRating:ratingSummary(serverGame,'w'),blackRating:ratingSummary(serverGame,'b')};
}
function gameOverTitle(info){
  if(info.result==='1/2-1/2')return 'Draw';
  const won=(info.result==='1-0'&&info.myColor==='w')||(info.result==='0-1'&&info.myColor==='b');
  return won?'You won':'You lost';
}
function gameOverBody(info,title){
  const body=document.createElement('div');body.className='game-over-body';
  const result=document.createElement('div');result.className='game-over-result';result.innerHTML=`<strong>${escapeHtml(title)} · ${escapeHtml(info.reason)}</strong>`;
  const players=document.createElement('div');players.className='game-over-players';
  players.innerHTML=`<div><span class="game-over-avatar">${escapeHtml(playerInitials(info.whiteName,'W'))}</span><span class="game-over-player"><small>White</small><b>${escapeHtml(info.whiteName)}</b></span><em>${escapeHtml(info.whiteRating)}</em></div><div><span class="game-over-avatar">${escapeHtml(playerInitials(info.blackName,'B'))}</span><span class="game-over-player"><small>Black</small><b>${escapeHtml(info.blackName)}</b></span><em>${escapeHtml(info.blackRating)}</em></div>`;
  body.append(result,players);return body;
}
async function resetFinishedGame(nextMode=['match','room','computer'].includes(mode)?mode:'room'){
  stopOnlineSync();serverGameId=null;serverGame=null;clockSnapshot=null;serverVersion=0;currentBot=null;myColor=null;orientationSet=false;selected=null;premoves.cancel();roomCreated=false;lastDrawOffer=null;clearDrawOfferTimer();drawOfferKey=null;localGameOver=false;localGameOverInfo=null;computerStarted=false;localClockState=null;lowTimeWarned=false;opponentWasConnected=null;lastChatMessageId=null;chatSessionStartedAt=Date.now();chatUnread=0;updateChatUnread();rematchOfferPending=false;moveEvalByPly=[];moveTimeByPly=[];resetReviewState();game.reset();history.replaceState(null,'',location.pathname);mode=nextMode;render();updateMoves();await activateLeftMode(nextMode);showMovesView();
}
function rematchSettings(){
  const ended=serverGame||{};
  return {seconds:Number(ended.time_control_seconds||ended.base_seconds||600),increment:Number(ended.increment_seconds||0),rated:!!ended.rated};
}
async function startOnlineRematch(){
  if(!serverGameId||!realtimeChannel||!realtimeReady)return toast('Rematch is unavailable because the game connection has closed');
  rematchOfferPending=true;broadcastAux('rematch_offer',{from:realtimeClientId,...rematchSettings()});toast('Rematch offered');
}
async function acceptRematchOffer(payload){
  if(!payload?.from||payload.gameId!==serverGameId)return;
  broadcastAux('rematch_accept',{from:realtimeClientId,to:payload.from});toast('Rematch accepted');
}
async function createRematchForPeer(payload){
  if(!rematchOfferPending||payload?.to!==realtimeClientId||payload.gameId!==serverGameId)return;
  rematchOfferPending=false;const oldChannel=realtimeChannel,oldGameId=serverGameId,{seconds,increment,rated}=rematchSettings();
  try{
    const state=await api.create({name:(currentProfile?.username||guestName),seconds,increment,rated}),next=state.game||state,code=next.invite_code;
    if(oldChannel&&realtimeReady)await oldChannel.send({type:'broadcast',event:'rematch_ready',payload:{gameId:oldGameId,from:realtimeClientId,to:payload.from,code}});
    applyServerState(state);room=code;roomCreated=true;history.replaceState(null,'',`?game=${encodeURIComponent(code)}`);syncRoomUi();await loadChat();toast('Rematch ready');
  }catch(error){toast(error.message)}
}
async function joinRematchFromPeer(payload){
  if(payload?.to!==realtimeClientId||payload.gameId!==serverGameId||!payload.code)return;
  document.querySelector('.vch-dialog-layer .vch-dialog-close')?.click();
  try{
    const state=await api.join(payload.code,guestName);applyServerState(state);room=(state.game||state).invite_code||payload.code;roomCreated=false;history.replaceState(null,'',`?game=${encodeURIComponent(room)}`);syncRoomUi();await loadChat();toast('Rematch started');
  }catch(error){toast(error.message)}
}
async function maybeShowGameOver(){
  const info=gameOverInfo();if(!info||info.key===lastGameOverKey)return;
  lastGameOverKey=info.key;const title=gameOverTitle(info),won=title==='You won';
  if(!info.online&&mode==='computer'){
    lastLocalArchiveId=`local-${Date.now()}`;
    saveLocalGame({id:lastLocalArchiveId,source:'computer',pgn:game.pgn(),result:info.result,white:info.whiteName,black:info.blackName,myColor:info.myColor,whiteRating:currentBot&&info.myColor==='b'?currentBot.elo:null,blackRating:currentBot&&info.myColor==='w'?currentBot.elo:null,rated:false,base:600,inc:0,date:new Date().toISOString(),moves:game.history().length,reason:info.reason});
  }playUiSound(title==='Draw'?'draw':won?'win':'lose');
  await playEnding(info);
  const actions=[{label:'Game Review',value:'review',primary:true},...(info.online?[{label:'Rematch',value:'rematch'}]:[]),{label:'New game',value:'new'}];
  const action=await vchDialog({title:'Game over',body:gameOverBody(info,title),actions});
  if(action==='review')await startGameReview();
  if(action==='rematch')await startOnlineRematch();
  if(action==='new')await resetFinishedGame();
}
function premovePlayerColor(){if(serverGameId&&myColor)return myColor;if(mode==='computer'&&computerStarted)return computerSide;return null}
function premoveBlocked(){return !!puzzleSession||mode==='puzzle'||reviewState.running||reviewState.viewing||currentRightView==='review'}
function canQueuePremove(){
  const color=premovePlayerColor();
  if(!color||premoveBlocked()||localGameOver||game.isGameOver())return false;
  if(serverGameId&&!['active','playing','in_progress'].includes(serverGame?.status||'active'))return false;
  return game.turn()!==color;
}
function cancelPremove(renderBoard=true){
  if(!premoves.move&&!premoves.selected)return false;
  premoves.cancel();if(renderBoard)render();return true;
}
function playQueuedPremove(){
  const color=premovePlayerColor(),queued=premoves.move;
  if(!queued){
    // A piece picked up for a premove when the opponent replied is now simply selected, so
    // the next click (or the drop, see finishPointerDrag) plays the move for real.
    if(premoves.selected&&color&&game.turn()===color&&!premoveBlocked()&&game.get(premoves.selected)?.color===color){
      selected=premoves.selected;premoves.cancel();render();
    }
    return null;
  }
  if(!color||premoveBlocked()||localGameOver||game.isGameOver()){premoves.cancel();render();return null}
  if(game.turn()!==color)return null;
  const move=consumeLegalPremove(premoves,game);
  if(!move){render();return null}
  return makeMove(move);
}
async function clickSquare(sq,p,{instant=false}={}){
  if(browse){exitBrowse();return} // a tap on the board while looking back returns to the game
  if(mode==='watch')return; // spectators can't move
  if(mode==='archive'&&!retrySession)return;
  if(premoves.move?.from===sq){cancelPremove();return}
  if(canQueuePremove()){
    const color=premovePlayerColor();
    if(!premoves.selected){
      if(p?.color===color){premoves.select(sq);selected=null;render()}
      return
    }
    if(sq===premoves.selected){cancelPremove();return}
    premoves.queue(sq,'q');selected=null;render();return
  }
  if(!retrySession&&(reviewState.viewing||localGameOver||game.isGameOver()||(serverGameId&&myColor&&myColor!==game.turn())||(mode==='computer'&&(!computerStarted||game.turn()!==computerSide))))return;
  premoves.cancel();
  if(!selected){if(p?.color===game.turn()){selected=sq;render()}return}
  if(sq===selected){selected=null;render();return}
  if(p?.color===game.turn()){selected=sq;render();return}
  const candidates=game.moves({square:selected,verbose:true}).filter(m=>m.to===sq);
  if(!candidates.length){rejectMove(selected,sq,{quietRule:true});selected=null;render();return}
  let promotion;if(candidates.some(m=>m.promotion)){promotion=await choosePromotion();if(!promotion){selected=null;render();return}}
  instantMoveAnimation=instant;
  try{makeMove({from:selected,to:sq,promotion:promotion||'q'})}finally{instantMoveAnimation=false}
  selected=null;
}
function choosePromotion(){return new Promise(resolve=>{const d=$('#promotion');let piece=null;d.addEventListener('close',()=>resolve(piece),{once:true});$$('#promotion button').forEach(b=>b.onclick=()=>{piece=b.dataset.piece;menus.close('promotion')});menus.open('promotion')})}
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
function switchOnlineClockOptimistically(){
  if(!clockSnapshot)return;
  const clientNow=Date.now(),value=projectedClocks(clockSnapshot,clientNow);
  clockSnapshot={...clockSnapshot,whiteMs:value.w,blackMs:value.b,active:game.turn(),lastMoveAt:clientNow+Number(clockSnapshot.serverOffset||0)};
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
  serverGameId=null;serverGame=null;clockSnapshot=null;serverVersion=0;currentBot=null;myColor=null;orientationSet=false;selected=null;premoves.cancel();flipped=false;roomCreated=false;moveEvalByPly=[];moveTimeByPly=[];resetReviewState();
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
  if(watchSession)stopWatching();if(archiveSession)leaveArchive({reset:false});
  const selectedBot=computerBots.find(bot=>bot.slug===selectedComputerBotSlug)||computerBots[0]||DEFAULT_COMPUTER_BOTS[2];
  stopOnlineSync();serverGameId=null;serverGame=null;clockSnapshot=null;serverVersion=0;roomCreated=false;moveEvalByPly=[];moveTimeByPly=[];resetReviewState();
  currentBot={...selectedBot};localGameOver=false;localGameOverInfo=null;lowTimeWarned=false;computerStarted=true;computerSide=selectedComputerSide();premoves.cancel();
  myColor=computerSide;orientationSet=true;flipped=computerSide==='b';selected=null;game.reset();resetLocalClock();syncRoomUi();render();updateMoves();
  const label=$('#computerStart span');if(label)label.textContent='Restart game';
  showGameStartBanner(computerSide,600,0,`computer:${Date.now()}`);
  if(game.turn()!==computerSide)setTimeout(engineMove,280);
}
async function activateLeftMode(next){
  if(!['match','room','computer'].includes(next))return;
  if(watchSession)stopWatching();if(archiveSession)leaveArchive();
  const previous=mode;
  if(searching&&next!=='match')await cancelMatchSearch({announce:false});
  if(previous==='computer'&&next!=='computer'&&computerStarted){
    computerStarted=false;localClockState=null;localGameOver=false;localGameOverInfo=null;currentBot=null;myColor=null;orientationSet=false;flipped=false;selected=null;premoves.cancel();game.reset();render();updateMoves();
  }
  mode=next;syncPlayerBars();
  $$('.modes button').forEach(button=>button.classList.toggle('on',button.dataset.mode===next));
  $$('.mode-view').forEach(view=>{const active=view.dataset.modeView===next;view.classList.toggle('active',active);view.setAttribute('aria-hidden',String(!active))});
  if(next==='computer'){renderComputerBots();loadComputerBots()}
  syncOnlineTransport();
}
async function makeMove(move,remote=false,retry=true){if(retrySession&&!remote)return retryAttempt(move);if(puzzleSession&&!remote){const uci=move.from+move.to+(move.promotion||'');const expected=puzzleSession.solution[puzzleSession.index];if(uci!==expected){toast('Try another move');return}
  const made=rememberLastMove(game.move(move));puzzleSession.played.push(uci);puzzleSession.index++;render({hint:made,instant:instantMoveAnimation});afterBoardPaint(playTone);
  if(puzzleSession.index>=puzzleSession.solution.length){await api.puzzleAttempt({puzzleId:puzzleSession.id,success:true,durationMs:Date.now()-puzzleSession.started,playedMoves:puzzleSession.played});toast('Puzzle solved');puzzleSession=null;return}
  const reply=puzzleSession.solution[puzzleSession.index];
  if(reply){setTimeout(async()=>{if(!puzzleSession)return;try{const made=rememberLastMove(game.move({from:reply.slice(0,2),to:reply.slice(2,4),promotion:reply[4]}));puzzleSession.played.push(reply);puzzleSession.index++;render({hint:made});afterBoardPaint(playTone);if(puzzleSession.index>=puzzleSession.solution.length){await api.puzzleAttempt({puzzleId:puzzleSession.id,success:true,durationMs:Date.now()-puzzleSession.started,playedMoves:puzzleSession.played});toast('Puzzle solved');puzzleSession=null}}catch{toast('Puzzle line could not continue')}},260)}
  return}if(serverGameId&&!remote){
  if(onlineMovePending)return;
  let legalMove;
  try{
    const requestedPromotion=move.promotion||'q';
    legalMove=game.moves({square:move.from,verbose:true}).find(candidate=>candidate.to===move.to&&(!candidate.promotion||candidate.promotion===requestedPromotion));
  }catch{return}
  if(!legalMove)return;
  const moveGameId=serverGameId,expectedVersion=serverVersion,clientMoveAt=serverAlignedNowIso(),fenBefore=game.fen();
  let made;
  try{made=game.move({from:move.from,to:move.to,...(legalMove.promotion?{promotion:move.promotion||legalMove.promotion}:{})})}catch{return}
  onlineMovePending=true;let resendStaleMove=false;
  lastLocalRealtimeMove={gameId:moveGameId,version:expectedVersion+1,from:made.from,to:made.to,promotion:made.promotion||null,fenBefore};
  rememberLastMove(made);
  setProvisional(moveGameId,expectedVersion+1);
  selected=null;switchOnlineClockOptimistically();render({hint:made,instant:instantMoveAnimation});afterBoardPaint(playTone);
  // The opponent sees the move now, not after the server round trip.
  broadcastMoved(moveGameId,expectedVersion+1,lastLocalRealtimeMove,{early:true});
  try{
    await nextFrames(2); // the slide is under way before the request is built and sent
    // Replying to a move the server hasn't confirmed yet: give it a moment so our version matches.
    if(relayConfirm)await relayConfirm.promise;
    const state=await api.move(moveGameId,expectedVersion,{from:move.from,to:move.to,promotion:made.promotion||undefined,clientMoveAt});
    const acceptedGame=state.game||state,incomingVersion=Number(acceptedGame?.version??0),movedGameId=acceptedGame?.id||moveGameId;
    if(lastLocalRealtimeMove&&lastLocalRealtimeMove.gameId===moveGameId)lastLocalRealtimeMove={...lastLocalRealtimeMove,version:incomingVersion||lastLocalRealtimeMove.version};
    broadcastMoved(movedGameId,incomingVersion,lastLocalRealtimeMove);
    if(moveGameId===serverGameId&&incomingVersion>serverVersion)applyServerState(state,{animateMove:false});
  }catch(error){
    if(lastLocalRealtimeMove?.gameId===moveGameId)lastLocalRealtimeMove=null;
    if(provisional?.gameId===moveGameId)provisional=null;
    broadcastAux('move_void',{from:realtimeClientId,version:expectedVersion+1});
    if(moveGameId===serverGameId){
      await refreshServerState();render();
      // A 409 means our version was stale (e.g. the opponent's join bumped it); resend once if the move is still ours and legal.
      if(retry&&error?.status===409&&myColor===game.turn()&&game.moves({square:move.from,verbose:true}).some(candidate=>candidate.to===move.to))resendStaleMove=true;
      else toast('Move not accepted');
    }
  }finally{onlineMovePending=false}
  if(resendStaleMove)return makeMove(move,false,false);
  return}let made,localElapsedMs=null;try{if(mode==='computer'&&localClockState){localElapsedMs=Math.max(0,performance.now()-localClockState.startedAt);settleLocalClock()}made=rememberLastMove(game.move(move))}catch{return}if(localElapsedMs!==null)moveTimeByPly[Math.max(0,(game.moveNumber()-1)*2+(game.turn()==='b'?1:0)-1)]=localElapsedMs;if(mode==='computer'){localClockState.active=game.turn();localClockState.startedAt=performance.now()}selected=null;render({hint:made,instant:instantMoveAnimation});afterBoardPaint(()=>{updateMoves();playTone()});if(mode==='computer'&&remote)playQueuedPremove();if(mode==='computer'&&!remote&&!game.isGameOver())afterBoardPaint(()=>setTimeout(engineMove,60));}
function normalizedSan(value=''){return String(value).replace(/[+#?!]/g,'')}
function isBookMove(records,index){
  const sans=records.slice(0,index+1).map(record=>normalizedSan(record.san||record.lan||''));
  return OPENINGS.some(opening=>index<opening.line.length&&sans.every((san,ply)=>san===normalizedSan(opening.line[ply])));
}
function recordEval(record,index){
  if(engineLocked())return '';
  const raw=record?.eval??record?.evaluation??record?.eval_cp??record?.score_cp;
  if(raw!==undefined&&raw!==null&&raw!==''){
    let value=Number(raw);
    if(Number.isFinite(value)){
      if((record.eval_cp!==undefined||record.score_cp!==undefined)&&Math.abs(value)>20)value/=100;
      return (value>=0?'+':'')+value.toFixed(1);
    }
  }
  const cached=moveEvalByPly[index];
  if(Number.isFinite(cached)&&Math.abs(cached)>=90)return cached>0?'+M':'−M'; // a forced mate, not "+1000.0"
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
  const current=(reviewState.viewing&&reviewState.currentPly===index+1)||(!reviewState.viewing&&browse?.ply===index+1)?' current':'';
  return `<span class="move-cell${current}" role="button" tabindex="0" data-review-ply="${index+1}"><span class="move-san">${book}${badge}<b>${san}</b></span><span class="move-meta"><em>${recordEval(record,index)}</em><time>${recordTime(record,index)}</time></span></span>`;
}
function updateMoves(){
  const records=watchSession?(watchSession.state?.move_history||[]):serverGameId&&Array.isArray(serverGame?.move_history)?serverGame.move_history:game.history({verbose:true});
  syncMoveStrip(records);
  const target=$('#moves');if(!target)return;
  if(!records.length){target.innerHTML='<span class="moves-empty">Game ready — make a move.</span>';target.scrollTop=0;return}
  const signature=moveRecordSignature(records),rows=[];
  for(let i=0;i<records.length;i+=2){
    rows.push(`<div class="move-pair-row"><span class="move-number">${Math.floor(i/2)+1}</span>${moveCell(records[i],i,records,signature)}${moveCell(records[i+1],i+1,records,signature)}</div>`);
  }
  target.innerHTML=rows.join('');
  target.scrollTop=0;
  $$('#moves [data-review-ply]').forEach(cell=>{
    const jump=()=>{if(reviewState.results.length)setReviewPly(Number(cell.dataset.reviewPly));else browseGoTo(Number(cell.dataset.reviewPly))};
    cell.onclick=jump;cell.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();jump()}};
  });
}
async function findEngineMove(){
  const moves=game.moves({verbose:true});if(!moves.length)return null;
  const requestedElo=Number(currentBot?.elo||currentBot?.rating||1500),fen=game.fen(),id=`bot-${++engineRequestSeq}`;
  if(enginePending)enginePending.resolve(null);
  const uci=await new Promise(resolve=>{
    enginePending={id,resolve};
    stockfish.postMessage({mode:'bot',fen,elo:requestedElo,nodes:botSearchNodes(requestedElo),requestId:id});
    setTimeout(()=>{if(enginePending?.id===id){enginePending=null;stockfish.postMessage({action:'stop'});resolve(null)}},BOT_MOVE_TIMEOUT_MS);
  });
  if(game.fen()!==fen)return undefined; // position changed while searching (new game, takeback): drop the result
  return uci&&moves.find(x=>x.from+x.to+(x.promotion||'')===uci);
}
async function engineMove(){if(mode==='computer'&&(!computerStarted||game.turn()===computerSide))return;const move=await findEngineMove();if(move===undefined)return;if(!move)return toast('Stockfish 19 is unavailable — no substitute move was played');makeMove(move,true)}
// One AudioContext for the whole session: creating one per move is slow and browsers cap them.
function audioContext(){toneContext??=new AudioContext();if(toneContext.state==='suspended')void toneContext.resume();return toneContext}
function playTone(){
  if($('#sound').dataset.off)return;
  try{
    const a=audioContext(),o=a.createOscillator(),g=a.createGain();o.frequency.value=420;g.gain.setValueAtTime(.05,a.currentTime);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+.09);o.connect(g).connect(a.destination);o.start();o.stop(a.currentTime+.1);
  }catch{}
}
// An illegal try: a low double knock (and a short buzz on phones). When the king is the
// reason (check, a pin, an attacked square) its square flashes red, like a warning light.
function playIllegalTone(){
  if($('#sound').dataset.off)return;
  try{
    const a=audioContext(),t=a.currentTime;
    for(const at of [0,.11]){
      const o=a.createOscillator(),g=a.createGain();o.type='triangle';o.frequency.setValueAtTime(190,t+at);o.frequency.exponentialRampToValueAtTime(120,t+at+.08);
      g.gain.setValueAtTime(.0001,t+at);g.gain.exponentialRampToValueAtTime(.09,t+at+.008);g.gain.exponentialRampToValueAtTime(.0001,t+at+.09);
      o.connect(g).connect(a.destination);o.start(t+at);o.stop(t+at+.1);
    }
  }catch{}
}
function flashIllegal(square){
  const el=boardDom?.squares.get(square);if(!el)return;
  el.querySelector('.illegal-flash')?.remove();
  const flash=document.createElement('span');flash.className='illegal-flash';flash.setAttribute('aria-hidden','true');
  flash.addEventListener('animationend',()=>flash.remove(),{once:true});setTimeout(()=>flash.remove(),1400);
  el.append(flash);
}
// A tap elsewhere is often just "never mind": taps stay quiet unless the king is the reason.
function rejectMove(from,to,{quietRule=false}={}){
  const reason=illegalReason(game,from,to);if(!reason||(quietRule&&reason.kind==='rule'))return;
  playIllegalTone();buzz(HAPTICS.illegal);
  const square=flashSquareFor(reason);if(square)flashIllegal(square);
}
function clockText(n){return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`}
function playerBarClockColors(){
  const bottom=myColor==='b'?'b':'w';
  return {top:bottom==='w'?'b':'w',bottom};
}
function activeClockColor(){
  if(mode==='watch')return watchSession&&['active','playing','in_progress'].includes(watchSession.state?.status)&&!browse?game.turn():null;
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
  syncLowTimeWarning(values,active);
}
function syncLowTimeWarning(values,active){
  const own=myColor,live=!!own&&((mode==='computer'&&computerStarted&&!localGameOver&&!game.isGameOver())||(serverGameId&&['active','playing','in_progress'].includes(serverGame?.status)));
  const seconds=live?Number(values?.[own]):Infinity,low=live&&seconds>0&&seconds<10;
  $('#bottomClock')?.classList.toggle('low-time',low);
  if(low&&!lowTimeWarned){lowTimeWarned=true;toast('Low time · under 10 seconds');playUiSound('warning')}
  // Under 10 seconds on your own running clock: a soft tick every second.
  const tick=tickSecond(seconds,live&&active===own);
  if(tick!==null&&tick!==lastTickSecond){if(lastTickSecond!==null)playTick();lastTickSecond=tick}else if(tick===null)lastTickSecond=null;
}
let lastTickSecond=null;
function playTick(){
  if($('#sound')?.dataset.off)return;
  try{
    const a=audioContext(),t=a.currentTime,o=a.createOscillator(),g=a.createGain();
    o.type='square';o.frequency.setValueAtTime(1650,t);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.035,t+.004);g.gain.exponentialRampToValueAtTime(.0001,t+.035);
    o.connect(g).connect(a.destination);o.start(t);o.stop(t+.04);
  }catch{}
}
function checkLocalTimeout(){
  if(mode!=='computer'||!computerStarted||localGameOver||game.isGameOver()||!localClockState)return;
  const values=currentClockSeconds(),side=game.turn();if(Number(values[side])>0)return;
  localClockState[side]=0;localClockState.startedAt=performance.now();localGameOver=true;localGameOverInfo={result:side==='w'?'0-1':'1-0',reason:'on time'};render();
}
// Clock text is left alone while a piece slides, so the slide's frames carry no other paint.
function startClock(){clearInterval(ticking);ticking=setInterval(()=>{if(!boardIsMoving())syncClockBars();checkLocalTimeout()},250)}
function toast(s,{duration=1800,onClick=null,actionLabel='',onAction=null}={}){
  const el=$('#toast');if(!el)return;clearTimeout(toastTimer);el.replaceChildren();el.className='show';
  const text=document.createElement('span');text.className='toast-text';text.textContent=String(s);el.append(text);
  if(actionLabel&&onAction){const action=document.createElement('button');action.type='button';action.className='toast-action';action.textContent=actionLabel;action.onclick=event=>{event.stopPropagation();el.className='';onAction()};el.append(action)}
  if(onClick){el.classList.add('actionable');el.onclick=()=>{el.className='';onClick()}}else el.onclick=null;
  toastTimer=setTimeout(()=>{el.className='';el.onclick=null},duration);
}
function prefersReducedMotion(){return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true}
function motionDurationMs(){
  if(prefersReducedMotion())return 0;
  const raw=getComputedStyle(document.documentElement).getPropertyValue('--motion').trim(),amount=parseFloat(raw);
  if(!Number.isFinite(amount))return 400;
  const milliseconds=raw.endsWith('s')&&!raw.endsWith('ms')?amount*1000:amount;
  return Math.max(0,Math.min(400,milliseconds));
}
function playerInitials(value,fallback='GU'){
  const words=String(value||'').replace(/^You ·\s*/,'').trim().split(/\s+/).filter(Boolean);
  if(!words.length)return fallback;
  return words.slice(0,2).map(word=>word[0]).join('').toUpperCase();
}
function setPlayerFlag(element,code){
  if(!element)return;
  const normalized=/^[a-z]{2}$/i.test(String(code||''))?String(code).toUpperCase():'';
  const flagSrc=normalized?FLAG_URL[normalized]||'':'';
  element.classList.toggle('hidden',!flagSrc);
  element.toggleAttribute('aria-hidden',!flagSrc);
  if(flagSrc){
    element.innerHTML=`<img src="${flagSrc}" alt="">`;
    element.setAttribute('aria-label',`${countryName(normalized)} flag`);element.title=countryName(normalized);
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
  if(watchSession){syncWatchBars();syncClockBars();return}
  if(archiveSession){syncArchiveBars();return}
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
  const opponent=opponentInfo&&opponentInfo.gameId===serverGameId?opponentInfo:null;
  setPortrait($('#topAvatar'),currentBot?{initials:playerInitials(topName,'OP'),label:topName}:{avatar:opponent?.avatar_data,label:topName});
  setPortrait($('#bottomAvatar'),{avatar:currentProfile?.avatar_data,label:ownName});
  if(serverGameId&&opponentId&&!currentBot)void loadOpponentInfo(serverGameId,opponentId);
  const opponentColor=myColor==='w'?'black':'white',ownColor=myColor==='w'?'white':myColor==='b'?'black':null;
  setPlayerFlag($('#topFlag'),opponent?.country_code||(opponentColor?serverGame?.[`${opponentColor}_country_code`]:null));
  setPlayerFlag($('#bottomFlag'),currentProfile?.country_code||(ownColor?serverGame?.[`${ownColor}_country_code`]:null));
  const online=isOnlineGame();
  setPresence($('#topPresence'),currentBot?'ENGINE':opponentId&&online?'LIVE':'WAITING',!!opponentId&&online&&!currentBot);
  setPresence($('#bottomPresence'),online?'LIVE':'LOCAL',online);
  $('#hint')?.classList.toggle('hidden',mode!=='computer');
  $('#undoMove')?.classList.toggle('hidden',mode!=='computer');
  syncConnectionUi();syncClockBars();
}
function syncRoomUi(){
  const code=serverGame?.invite_code||room;
  $('.room-created')?.classList.toggle('hidden',!roomCreated);
  const strong=$('.room strong');if(strong)strong.textContent=code||'—';
  if(code)$('#share').value=`${location.origin}${location.pathname}?game=${encodeURIComponent(code)}`;
  syncPlayerBars();syncDrawOfferUi();
}
function clearDrawOfferTimer(){
  if(drawOfferTimer){clearTimeout(drawOfferTimer);drawOfferTimer=null}
  if(drawOfferCountdownTimer){clearInterval(drawOfferCountdownTimer);drawOfferCountdownTimer=null}
}
function updateDrawOfferCountdown(seconds){const el=$('#drawOfferCountdown');if(el)el.textContent=`${Math.max(0,seconds)}s`}
function startDrawOfferExpiry(key){
  clearDrawOfferTimer();let remaining=10;updateDrawOfferCountdown(remaining);
  drawOfferCountdownTimer=setInterval(()=>{remaining-=1;updateDrawOfferCountdown(remaining)},1000);
  drawOfferTimer=setTimeout(()=>{if(drawOfferKey===key&&serverGame?.draw_offer_by&&serverGame.draw_offer_by!==currentPlayerId)void respondToDrawOffer(false,'expired')},10000);
}
function syncDrawOfferUi(){
  syncTakebackUi();
  const button=$('#draw'),card=$('#drawOfferCard');if(!button||!card)return;
  const active=serverGame?.draw_offer_by,own=!!active&&active===currentPlayerId,incoming=!!active&&!own&&['active','playing','in_progress'].includes(serverGame?.status);
  button.textContent=own?'Draw offered · Cancel':'Offer draw';button.classList.toggle('offered',own);
  card.classList.toggle('hidden',!incoming);
  if(incoming){
    const key=`${serverGame.id}:${active}:${serverGame.updated_at||serverGame.version||0}`;
    if(drawOfferKey!==key){drawOfferKey=key;startDrawOfferExpiry(key)}
  }else{clearDrawOfferTimer();if(!active)drawOfferKey=null}
}
async function respondToDrawOffer(accept,reason='declined'){
  const offererId=serverGame?.draw_offer_by;if(!serverGameId||!offererId||offererId===currentPlayerId)return;
  clearDrawOfferTimer();$('#drawOfferCard')?.classList.add('hidden');
  try{
    const state=await api.drawRespond(serverGameId,!!accept);applyServerState(state);
    broadcastAux('draw_response',{from:realtimeClientId,to:offererId,status:accept?'accepted':reason});broadcastAux('draw_hint',{from:realtimeClientId});
  }catch(error){if(reason!=='expired')toast(error.message);else void refreshServerState()}
}
async function cancelOwnDrawOffer(){
  if(!serverGameId||serverGame?.draw_offer_by!==currentPlayerId)return;
  try{const state=await api.drawCancel(serverGameId);applyServerState(state);broadcastAux('draw_hint',{from:realtimeClientId});toast('Draw offer cancelled')}catch(error){toast(error.message)}
}
function syncOpponentConnectionToast(state){
  if(!state||state.bot_player_id||!currentPlayerId||!myColor||!['active','playing','in_progress'].includes(state.status)){opponentWasConnected=null;return}
  const opponentId=myColor==='w'?state.black_player_id:state.white_player_id;if(!opponentId)return;
  const seenAt=myColor==='w'?state.black_last_seen_at:state.white_last_seen_at,parsed=Date.parse(seenAt||''),connected=Number.isFinite(parsed)&&Date.now()-parsed<12000;
  if(opponentWasConnected===true&&!connected)toast('Opponent disconnected',{duration:2400});
  if(opponentWasConnected===false&&connected)toast('Opponent reconnected',{duration:2400});
  opponentWasConnected=connected;
}
function applyServerState(payload,{animateMove=true}={}){
  const state=payload.game||payload;if(!state)return;
  if(watchSession)stopWatching({reset:false}); // your own game takes over the board
  if(archiveSession)leaveArchive({reset:false});
  // A heartbeat that left before the latest move must not take that move back.
  if(isStale(provisional,state,performance.now()))return;
  if(provisional&&(confirms(provisional,state)||isExpired(provisional,performance.now())))clearProvisional();
  const previousVersion=serverVersion,previousGameId=serverGameId,previousState=serverGame;
  if(browse&&(state.id!==previousGameId||Number(state.version)>previousVersion)){browse=null;syncBrowseUi()} // a new move returns to the live position
  if(state.id&&state.id!==previousGameId){moveEvalByPly=[];moveTimeByPly=[];premoves.cancel();lowTimeWarned=false;opponentWasConnected=null;lastChatMessageId=null;chatSessionStartedAt=Date.now();chatUnread=0;updateChatUnread();clearDrawOfferTimer();drawOfferKey=null;rematchOfferPending=false;resetReviewState()}
  syncServerMoveTimes(previousState,state);
  serverGame=state;serverGameId=state.id||serverGameId;serverVersion=Number(state.version??serverVersion);
  currentPlayerId=payload.player?.id||currentPlayerId;currentBot=payload.bot||currentBot;
  myColor=seatFromEnvelope(payload,myColor);
  if(myColor&&!orientationSet){flipped=myColor==='b';orientationSet=true}
  if(myColor&&['active','playing','in_progress'].includes(state.status)&&(previousState?.status==='waiting'||Number(state.move_count||0)===0))showGameStartBanner(myColor,state.time_control_seconds||state.base_seconds||600,state.increment_seconds||0,`online:${state.id}:${state.started_at||'active'}`);
  clockSnapshot=createClockSnapshot(payload);
  if(state.fen){try{game.load(state.fen)}catch{}}
  if(state.id&&state.id!==previousGameId)void loadChat();
  const lastServerMove=previousGameId===state.id&&Number(state.version)>previousVersion?state.move_history?.at?.(-1):null;
  syncRoomUi();render({hint:lastServerMove,instant:!animateMove});afterBoardPaint(updateMoves);syncOpponentConnectionToast(state);
  if(isOnlineGame())syncOnlineTransport();else if(serverGameId&&mode!=='computer')stopPolling();else stopOnlineSync();
  playQueuedPremove();afterBoardPaint(()=>void maybePlayBot());
}
async function refreshServerState(){if(!serverGameId)return;try{applyServerState(await api.state(serverGameId));await loadChat()}catch(error){toast(error.message)}}
async function maybePlayBot(){if(botThinking||!serverGame?.bot_player_id||game.isGameOver())return;const activePlayer=game.turn()==='w'?serverGame.white_player_id:serverGame.black_player_id;if(activePlayer!==serverGame.bot_player_id)return;botThinking=true;try{const move=await findEngineMove();if(move===undefined)return;if(!move)throw new Error('Stockfish 19 is required for the matched bot');applyServerState(await api.botMove(serverGameId,serverVersion,{from:move.from,to:move.to,promotion:move.promotion||undefined}))}catch(error){toast(error.message)}finally{botThinking=false}}
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
  setPortrait($('#bottomAvatar'),{avatar:currentProfile?.avatar_data,label:name});
  setPlayerFlag($('#bottomFlag'),currentProfile?.country_code);
  syncPlayerBars();
  $('#profileMenuName').textContent=name;$('#profileMenuRating').textContent=rating+' rating';setPortrait($('#profileMenuAvatar'),{avatar:currentProfile?.avatar_data,label:name});$('#profileMenuAuth').textContent=signed?'Sign out':'Sign in';
  $('#accountGuest')?.classList.toggle('hidden',signed);$('#accountSigned')?.classList.toggle('hidden',!signed);
  if(signed){
    $('#profileName').textContent=name;$('#profileRating').textContent=rating+' rapid';
    for(const pool of ['bullet','blitz','rapid','classical']){const el=$('#rating'+pool[0].toUpperCase()+pool.slice(1));if(el)el.textContent=ratingFor(pool)}
  }
}
// ---- Portrait and country flag ----
// The opponent's flag and portrait come from game_players once per game and seat.
let opponentInfo=null,opponentInfoKey='';
async function loadOpponentInfo(gameId,opponentId){
  const key=`${gameId}:${opponentId}`;if(opponentInfoKey===key)return;opponentInfoKey=key;
  try{
    const out=await api.gamePlayers(gameId),them=(out.players||[]).find(p=>p.id===opponentId);
    opponentInfo=them?{gameId,...them}:null;syncPlayerBars();
  }catch{opponentInfoKey=''}
}
// Country detection asks Netlify's edge for the country code only, and only when the player
// presses "Detect" (their consent). The code is the only thing we keep.
async function detectCountry(){
  const response=await fetch('/api/geo',{cache:'no-store',headers:{accept:'application/json'}});
  const data=await response.json().catch(()=>({}));
  const code=String(data?.country||'').toUpperCase();
  if(!/^[A-Z]{2}$/.test(code)||!FLAG_URL[code])throw new Error('Could not detect your country. Pick it from the list.');
  return code;
}
async function saveProfileChanges(changes){
  const out=await api.profileUpdate(changes);currentProfile={...currentProfile,...(out.player||{})};syncIdentityUI();syncPlayerBars();return out;
}
function flagPromptDone(){try{return !!localStorage.getItem('vanta.flagPrompt')}catch{return true}}
function scheduleFlagPrompt(){
  if(flagPromptDone()||currentProfile?.country_code||scheduleFlagPrompt.pending)return;
  scheduleFlagPrompt.pending=true;setTimeout(showFlagPrompt,2500);
}
function showFlagPrompt(){
  if(flagPromptDone()||currentProfile?.country_code||document.querySelector('.flag-prompt'))return;
  const card=document.createElement('section');card.className='flag-prompt';card.setAttribute('role','dialog');card.setAttribute('aria-label','Show your country flag');
  card.innerHTML=`<b>Show your country flag?</b><p>Opponents see it beside your name. "Detect" looks up only your country from your connection; we keep the 2-letter code, never your IP address.</p><div><button type="button" data-flag="detect" class="primary">Detect my country</button><button type="button" data-flag="choose">Choose myself</button><button type="button" data-flag="no">No thanks</button></div>`;
  const done=()=>{try{localStorage.setItem('vanta.flagPrompt','1')}catch{}card.remove()};
  card.addEventListener('click',async event=>{
    const choice=event.target.closest('[data-flag]')?.dataset.flag;if(!choice)return;
    if(choice==='no'){done();return}
    if(choice==='choose'){done();void openProfileEditor();return}
    try{const code=await detectCountry();await saveProfileChanges({country_code:code});done();toast(`Flag set: ${countryName(code)}`)}
    catch(error){done();toast(error.message);void openProfileEditor()}
  });
  document.body.append(card);
}
async function openProfileEditor(){
  const account=!!authSession?.access_token&&!!currentProfile?.account;
  let avatar=currentProfile?.avatar_data||null,country=currentProfile?.country_code||'';
  const body=document.createElement('div');body.className='profile-editor';
  const options=['<option value="">No flag</option>',...countryList().map(([code,name])=>`<option value="${code}">${escapeHtml(name)}</option>`)].join('');
  body.innerHTML=`<div class="pe-portrait"><span class="avatar pe-avatar" aria-hidden="true"></span><div>${account?`<label class="pe-upload"><input type="file" accept="image/*" hidden><span>Upload picture</span></label><button type="button" class="pe-remove">Remove picture</button><small>Square crop, 128px. JPEG, PNG or WebP.</small>`:`<small>Sign in to add a profile picture. Guests show an empty portrait.</small>`}</div></div>
<label class="pe-country"><span>Country flag</span><select>${options}</select></label>
<button type="button" class="pe-detect">Detect from my connection</button>
<p class="pe-note">Your flag is shown to opponents. Detect looks up only your country from your connection; we keep the 2-letter code, never your IP address. Choose "No flag" to hide it.</p>`;
  const preview=body.querySelector('.pe-avatar'),select=body.querySelector('select');
  const draw=()=>setPortrait(preview,{avatar});draw();select.value=country;
  select.onchange=()=>{country=select.value};
  body.querySelector('.pe-detect').onclick=async()=>{try{country=await detectCountry();select.value=country}catch(error){toast(error.message)}};
  body.querySelector('input[type=file]')?.addEventListener('change',async event=>{try{avatar=await avatarFromFile(event.target.files?.[0]);draw()}catch(error){toast(error.message)}});
  const remove=body.querySelector('.pe-remove');if(remove)remove.onclick=()=>{avatar=null;draw()};
  const action=await vchDialog({title:'Portrait & flag',body,actions:[{label:'Cancel',value:false},{label:'Save',value:true,primary:true}]});
  if(!action)return;
  const changes={country_code:country||null};
  if(account&&avatar!==(currentProfile?.avatar_data||null))changes.avatar_data=avatar;
  try{await saveProfileChanges(changes);try{localStorage.setItem('vanta.flagPrompt','1')}catch{}toast('Profile saved')}catch(error){toast(error.message)}
}
async function loadProfile(){
  try{const out=await api.profile(guestName);currentProfile=out.player||out.profile||null;syncIdentityUI();scheduleFlagPrompt();return out}
  catch(error){
    if(error.status===401&&authSession&&await refreshAuthSession()){const out=await api.profile(guestName);currentProfile=out.player||out.profile||null;syncIdentityUI();return out}
    if(error.status===401&&authSession){saveAuthSession(null);currentProfile=null;syncIdentityUI()}
    throw error
  }
}
function openAccount(){syncIdentityUI();menus.open('account')}
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
function broadcastMoved(gameId,version,{from,to,promotion=null,fenBefore}={},{early=false}={}){
  if(!realtimeChannel||!realtimeReady||realtimeGameId!==gameId)return;
  realtimeChannel.send({type:'broadcast',event:'moved',payload:{gameId,version:Number(version),from,to,promotion:promotion||null,fenBefore,...(early?{provisional:true}:{})}}).catch(()=>{});
}
// Provisional moves (see online-sync.js): shown at once, confirmed by the server shortly after.
function setProvisional(gameId,version){provisional=provisionalMove(gameId,version,performance.now())}
function clearProvisional(){provisional=null;if(relayConfirm){relayConfirm.resolve();relayConfirm=null}}
// The opponent's provisional move: wait (briefly) for the server to confirm it, then make
// sure the board matches the server. Our reply is held until then so its version is right.
function awaitRelayConfirmation(gameId,version){
  if(relayConfirm)relayConfirm.resolve('replaced');
  const wait=waiter(CONFIRM_WAIT_MS);relayConfirm=wait;
  void wait.promise.then(result=>{
    if(relayConfirm===wait)relayConfirm=null;
    if(serverGameId!==gameId)return;
    // No confirmation in time, or a hint arrived: ask the server (rolls back if it never landed).
    if(result!=='replaced'&&(result==='timeout'||provisional?.version===version))void refreshServerState();
  });
}
function confirmRelayHint(incoming){
  if(!provisional||incoming.gameId!==provisional.gameId||incoming.version<provisional.version)return false;
  if(relayConfirm){relayConfirm.resolve('hint');return true}
  return false;
}
function handleMoveVoid(message){
  const payload=message?.payload||{};
  if(payload.gameId!==serverGameId||payload.from===realtimeClientId)return;
  provisional=null;if(relayConfirm){relayConfirm.resolve('void');relayConfirm=null}
  void refreshServerState();
}
function realtimeMove(message){
  const payload=message?.payload||{},gameState=payload.game||payload,history=Array.isArray(gameState?.move_history)?gameState.move_history:[];
  const lastMove=payload.move||payload.lastMove||gameState?.last_move||history.at(-1)||{};
  const incoming={
    gameId:payload.gameId||gameState?.id,
    version:Number(payload.version??gameState?.version??0),
    from:payload.from||lastMove.from,
    to:payload.to||lastMove.to,
    promotion:payload.promotion??lastMove.promotion??null,
    fenBefore:payload.fenBefore||payload.fen_before||lastMove.fenBefore||lastMove.fen_before||gameState?.fenBefore||gameState?.fen_before||'',
    provisional:payload.provisional===true
  };
  if(!incoming.fenBefore&&incoming.from&&incoming.to&&gameState?.fen){
    try{
      const before=game.fen(),probe=new Chess(before),requestedPromotion=incoming.promotion||'q';
      const legal=probe.moves({square:incoming.from,verbose:true}).find(candidate=>candidate.to===incoming.to&&(!candidate.promotion||candidate.promotion===requestedPromotion));
      if(legal){
        probe.move({from:incoming.from,to:incoming.to,...(legal.promotion?{promotion:requestedPromotion}:{})});
        if(probe.fen()===gameState.fen)incoming.fenBefore=before;
      }
    }catch{}
  }
  return incoming;
}
function isOwnRealtimeMove(incoming){
  const own=lastLocalRealtimeMove;
  return !!own&&incoming.gameId===own.gameId&&incoming.version===own.version&&incoming.from===own.from&&incoming.to===own.to&&(incoming.promotion||null)===(own.promotion||null);
}
function applyRealtimeMove(incoming){
  if(incoming.gameId!==serverGameId||incoming.version!==serverVersion+1||incoming.fenBefore!==game.fen()||!incoming.from||!incoming.to)return false;
  let legalMove;
  try{
    const requestedPromotion=incoming.promotion||'q';
    legalMove=game.moves({square:incoming.from,verbose:true}).find(candidate=>candidate.to===incoming.to&&(!candidate.promotion||candidate.promotion===requestedPromotion));
  }catch{return false}
  if(!legalMove)return false;
  let made;
  try{made=game.move({from:incoming.from,to:incoming.to,...(legalMove.promotion?{promotion:incoming.promotion||legalMove.promotion}:{})})}catch{return false}
  rememberLastMove(made);
  serverVersion=incoming.version;selected=null;switchOnlineClockOptimistically();render({hint:made});afterBoardPaint(playTone);
  if(incoming.provisional){
    // Shown straight away; the server's confirmation (or its absence) settles it shortly.
    setProvisional(incoming.gameId,incoming.version);awaitRelayConfirmation(incoming.gameId,incoming.version);
    playQueuedPremove();
    return true;
  }
  const premoveResult=playQueuedPremove();
  if(premoveResult)void Promise.resolve(premoveResult).finally(()=>refreshServerState());else void refreshServerState();
  return true;
}
async function refreshFromRealtime(message){
  const incoming=realtimeMove(message);
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
function handleRealtimeMessage(message){
  const incoming=realtimeMove(message);
  if(!isOnlineGame()||incoming.gameId!==serverGameId)return;
  if(isOwnRealtimeMove(incoming))return;
  if(applyRealtimeMove(incoming))return;
  if(confirmRelayHint(incoming))return;
  refreshFromRealtime(message);
}
function broadcastAux(event,payload={}){
  if(!realtimeChannel||!realtimeReady||realtimeGameId!==serverGameId)return false;
  realtimeChannel.send({type:'broadcast',event,payload:{gameId:serverGameId,...payload}}).catch(()=>{});return true;
}
function handleDrawResponse(message){
  const payload=message?.payload||{};if(payload.gameId!==serverGameId||payload.from===realtimeClientId||payload.to!==currentPlayerId)return;
  if(payload.status==='declined')toast('Draw offer declined');if(payload.status==='expired')toast('Draw offer expired');
}
function handleRematchOffer(message){
  const payload=message?.payload||{};if(payload.gameId!==serverGameId||payload.from===realtimeClientId)return;
  toast('Rematch offered',{duration:8000,actionLabel:'Accept',onAction:()=>acceptRematchOffer(payload)});
}
function handleRematchAccept(message){const payload=message?.payload||{};if(payload.from===realtimeClientId)return;void createRematchForPeer(payload)}
function handleRematchReady(message){const payload=message?.payload||{};if(payload.from===realtimeClientId)return;void joinRematchFromPeer(payload)}
function startRealtime(){
  if(!isOnlineGame()){stopRealtime();return}
  if(realtimeChannel&&realtimeGameId===serverGameId)return;
  stopRealtime();
  const gameId=serverGameId;
  realtimeGameId=gameId;latencyMs=null;syncConnectionUi();
  realtimeChannel=realtimeClient
    .channel(`game:${gameId}`,{config:{broadcast:{self:true}}})
    .on('broadcast',{event:'state'},message=>{handleRealtimeMessage(message)})
    .on('broadcast',{event:'moved'},message=>{handleRealtimeMessage(message)})
    .on('broadcast',{event:'move_void'},message=>{handleMoveVoid(message)})
    .on('broadcast',{event:'draw_hint'},message=>{const payload=message?.payload||{};if(payload.gameId===serverGameId&&payload.from!==realtimeClientId)void refreshServerState()})
    .on('broadcast',{event:'draw_response'},message=>{handleDrawResponse(message)})
    .on('broadcast',{event:'chat_hint'},message=>{const payload=message?.payload||{};if(payload.gameId===serverGameId&&payload.from!==realtimeClientId)void loadChat()})
    .on('broadcast',{event:'rematch_offer'},message=>{handleRematchOffer(message)})
    .on('broadcast',{event:'rematch_accept'},message=>{handleRematchAccept(message)})
    .on('broadcast',{event:'rematch_ready'},message=>{handleRematchReady(message)})
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
// ---- Game moments: opponent left, "your move" tab title, screen kept awake ----
const baseTitle=document.title;let wakeLock=null,wakeLockPending=false;
function liveGameOn(){
  if(mode==='computer')return computerStarted&&!localGameOver&&!game.isGameOver();
  return isOnlineGame()&&!!myColor&&['active','playing','in_progress'].includes(serverGame?.status);
}
function syncAbandonCard(){
  const card=$('#abandonCard');if(!card)return;
  const online=isOnlineGame()&&!!myColor&&serverGame?.status==='active'&&!serverGame?.bot_player_id&&!currentBot;
  const opponentSeen=online?(myColor==='w'?serverGame.black_last_seen_at:serverGame.white_last_seen_at):null;
  const opponentId=online?(myColor==='w'?serverGame.black_player_id:serverGame.white_player_id):null;
  const info=online&&opponentId?abandonState(opponentSeen,Date.now()+(Number(clockSnapshot?.serverOffset)||0)):{state:'here'};
  card.classList.toggle('hidden',info.state==='here');
  $('#abandonClaim')?.classList.toggle('hidden',info.state!=='claimable');
  $('#abandonDraw')?.classList.toggle('hidden',info.state!=='claimable');
  const text=$('#abandonText');
  if(text)text.textContent=info.state==='claimable'?'Claim the win, or call it a draw':`You can claim the win in ${info.secondsLeft}s if they don't come back`;
}
function syncWakeLock(){
  const want=liveGameOn()&&!document.hidden;
  if(want&&!wakeLock&&!wakeLockPending&&navigator.wakeLock?.request){
    wakeLockPending=true;
    navigator.wakeLock.request('screen').then(lock=>{wakeLock=lock;lock.addEventListener('release',()=>{if(wakeLock===lock)wakeLock=null})}).catch(()=>{}).finally(()=>{wakeLockPending=false});
  }else if(!want&&wakeLock){const lock=wakeLock;wakeLock=null;lock.release().catch(()=>{})}
}
function syncGameMoments(){
  syncAbandonCard();syncWakeLock();
  const yourTurn=liveGameOn()&&myColor===game.turn()&&mode!=='computer';
  const title=tabTitle(baseTitle,{hidden:document.hidden,yourTurn});if(document.title!==title)document.title=title;
}
setInterval(syncGameMoments,1000);
document.addEventListener('visibilitychange',syncGameMoments);
// ---- Game archive and Game Story (src/game-story.js) ----
const archiveAgo=iso=>{const t=Date.parse(iso||'');if(!Number.isFinite(t))return '';const m=Math.round((Date.now()-t)/60000);if(m<60)return `${Math.max(1,m)}m ago`;const h=Math.round(m/60);if(h<48)return `${h}h ago`;return new Date(t).toLocaleDateString(undefined,{month:'short',day:'numeric'})};
let archiveEntries=[],archiveFilter='all';
async function renderArchive(){
  cancelPremove(false);
  setDynamicView('review','My games',brandLoading('Opening your game archive…'));
  let online=[];
  try{const out=await api.archive(60),me=currentProfile?.id||currentPlayerId;online=(out.games||[]).filter(g=>g.move_count>0&&!['waiting','active'].includes(g.status)).map(g=>archiveEntryFromServer(g,me))}catch{}
  if(currentRightView!=='review')return;
  archiveEntries=[...online,...loadLocalArchive()].sort((a,b)=>Date.parse(b.date||0)-Date.parse(a.date||0));
  drawArchive();
}
function drawArchive(){
  const target=$('#dynamicView .view-content');if(!target)return;
  const reviews=loadReviewCache(),insight=formInsights(archiveEntries,reviews,detectOpening);
  const keep=e=>archiveFilter==='all'||(archiveFilter==='computer'?e.source==='computer':outcomeFor(e.result,e.myColor)===archiveFilter);
  const rows=archiveEntries.map((e,i)=>({e,i})).filter(({e})=>keep(e));
  const dots=insight.form.map(o=>`<i class="form-dot ${o}" title="${o}"></i>`).join('');
  const current=currentHistory().length&&isGameFinishedForReview()&&mode!=='archive';
  target.innerHTML=`<div class="archive">
    <section class="archive-form" aria-label="Your form">
      <div><small>Last ${insight.form.length||0} games</small><span class="form-dots">${dots||'<em>No finished games yet</em>'}</span></div>
      <div><small>Score</small><b>${insight.winRate===null?'—':insight.winRate+'%'}</b></div>
      <div><small>Reviewed accuracy</small><b>${insight.accuracy===null?'—':insight.accuracy+'%'}</b></div>
      <div class="archive-signature"><small>Signature opening</small><b>${insight.topOpening?escapeHtml(insight.topOpening.name):'—'}</b>${insight.topOpening?`<em>${insight.topOpening.games} games · ${insight.topOpening.percent}%</em>`:''}</div>
    </section>
    ${current?'<button type="button" class="archive-current">Tell the story of the game you just played</button>':''}
    <div class="archive-filters" role="tablist">${['all','win','loss','draw','computer'].map(f=>`<button type="button" data-archive-filter="${f}" class="${archiveFilter===f?'on':''}">${{all:'All',win:'Wins',loss:'Losses',draw:'Draws',computer:'vs Computer'}[f]}</button>`).join('')}</div>
    <div class="archive-list">${rows.map(({e,i})=>{
      const o=outcomeFor(e.result,e.myColor),opp=e.myColor==='w'?e.black:e.white,oppRating=e.myColor==='w'?e.blackRating:e.whiteRating,acc=reviews[e.id]?.accuracy?.[e.myColor],opening=detectOpening(sansFromPgn(e.pgn))?.name;
      return `<button type="button" class="archive-row outcome-${o}" data-archive="${i}"><span class="archive-result">${{win:'W',loss:'L',draw:'D'}[o]||'·'}</span><span class="archive-main"><b>vs ${escapeHtml(opp)}${oppRating?` <em>${escapeHtml(String(oppRating))}</em>`:''}</b><small>${e.source==='computer'?'Computer':e.source==='arena'?'Arena':e.rated?'Rated':'Casual'} · ${formatTimeControl(e.base,e.inc)} · ${Math.ceil((e.moves||0)/2)} moves${opening?` · ${escapeHtml(opening)}`:''}</small></span><span class="archive-side">${e.ratingDelta!=null?`<em class="${e.ratingDelta>=0?'up':'down'}">${e.ratingDelta>=0?'+':''}${e.ratingDelta}</em>`:''}${Number.isFinite(acc)?`<i>${acc.toFixed(1)}%</i>`:'<i class="todo">Not reviewed</i>'}<small>${archiveAgo(e.date)}</small></span></button>`;
    }).join('')||'<p class="archive-empty">Your finished games appear here, online and against the computer. Play one, then open it to see its story.</p>'}</div>
  </div>`;
  target.querySelectorAll('[data-archive-filter]').forEach(b=>b.onclick=()=>{archiveFilter=b.dataset.archiveFilter;drawArchive()});
  target.querySelectorAll('[data-archive]').forEach(b=>b.onclick=()=>void openArchivedGame(archiveEntries[Number(b.dataset.archive)]));
  target.querySelector('.archive-current')?.addEventListener('click',()=>void startGameReview());
}
async function openArchivedGame(entry){
  if(!entry)return;
  const loaded=new Chess();try{loaded.loadPgn(entry.pgn)}catch{return toast('This game could not be opened')}
  if(!loaded.history().length)return toast('This game has no moves to review');
  if(searching)await cancelMatchSearch({announce:false});
  if(watchSession)stopWatching({reset:false});
  stopOnlineSync();stopStory();retrySession=null;
  const prevMode=archiveSession?.prevMode||(['match','room','computer'].includes(mode)?mode:'room');
  serverGameId=null;serverGame=null;currentBot=null;puzzleSession=null;computerStarted=false;localGameOver=false;localClockState=null;clockSnapshot=null;premoves.cancel();selected=null;browse=null;
  resetReviewState();
  game.reset();game.loadPgn(entry.pgn);lastMoveCache={fen:'',move:null};
  mode='archive';myColor=entry.myColor;flipped=entry.myColor==='b';orientationSet=true;
  archiveSession={entry,prevMode};document.body.dataset.archive='1';
  syncPlayerBars();render({instant:true});updateMoves();
  await startGameReview();
  if(archiveSession?.entry===entry&&!isMobileApp())$('#storyCard')?.scrollIntoView({block:'nearest',behavior:'smooth'});
}
function leaveArchive({reset=true}={}){
  const session=archiveSession;if(!session)return;
  stopStory();retrySession=null;archiveSession=null;delete document.body.dataset.archive;
  if(mode==='archive')mode=session.prevMode||'room';
  resetReviewState();
  if(reset){myColor=null;flipped=false;orientationSet=false;game.reset();lastMoveCache={fen:'',move:null};render({instant:true});updateMoves();syncPlayerBars()}
}
function syncArchiveBars(){
  const e=archiveSession.entry,top=flipped?'w':'b',bottom=flipped?'b':'w';
  const name=c=>c==='w'?e.white:e.black,rating=c=>c==='w'?e.whiteRating:e.blackRating;
  $('#topPlayerName').textContent=name(top);$('#bottomPlayerName').textContent=name(bottom);
  $('#topRating').textContent=rating(top)?`${rating(top)} rating`:'—';$('#bottomRating').textContent=rating(bottom)?`${rating(bottom)} rating`:'—';
  setPortrait($('#topAvatar'),{label:name(top)});setPortrait($('#bottomAvatar'),{label:name(bottom)});
  setPlayerFlag($('#topFlag'),null);setPlayerFlag($('#bottomFlag'),null);
  setPresence($('#topPresence'),'STORY',false);setPresence($('#bottomPresence'),'STORY',false);
  $('#bottomConnection')?.classList.add('hidden');
}
// The story card: chapters with each side's accuracy, the moments that decided the game,
// a narrated playback, and a replay of your worst moment.
function storyData(){
  const moves=reviewState.moves,results=reviewState.results;
  const book=moves.map((_,i)=>isBookMove(moves,i));
  const chapters=storyChapters(reviewState.positions,book),moments=keyMoments(results,moves);
  const mine=archiveSession?.entry.myColor||myColor||computerSide||'w';
  return {chapters,moments,mine,worst:worstMoment(results,moves,mine)};
}
function renderStoryCard(){
  const card=$('#storyCard');if(!card)return;
  const show=reviewState.viewing&&reviewState.results.length>0;card.classList.toggle('hidden',!show);if(!show)return;
  const {chapters,moments,mine,worst}=storyData(),them=mine==='w'?'b':'w',pct=v=>v===null?'—':`${v.toFixed(0)}%`;
  const ply=reviewState.currentPly,inChapter=c=>ply>=c.from&&ply<=c.to;
  const key=`${reviewState.signature}:${ply}:${!!storyTimer}:${!!retrySession}`;if(card.dataset.key===key)return;card.dataset.key=key;
  card.innerHTML=`<header><b>The story of this game</b><span>${storyTimer?'<button type="button" data-story="stop">Pause</button>':'<button type="button" data-story="play">Play the story</button>'}</span></header>
    <ol class="story-chapters">${chapters.map(c=>`<li class="${inChapter(c)?'on':''}"><button type="button" data-story-ply="${c.from}"><b>${c.title}</b><small>moves ${Math.ceil(c.from/2)}–${Math.ceil(c.to/2)}</small><span><em>You ${pct(chapterAccuracy(reviewState.results,reviewState.moves,c,mine))}</em><em>Them ${pct(chapterAccuracy(reviewState.results,reviewState.moves,c,them))}</em></span></button></li>`).join('')}</ol>
    ${moments.length?`<div class="story-moments"><small>Moments that decided it</small>${moments.map(m=>`<button type="button" data-story-ply="${m.ply}" class="moment ${m.color===mine?'mine':'theirs'}${ply===m.ply?' on':''}"><b>${escapeHtml(m.label)}</b><span>${Math.ceil(m.ply/2)}${m.color==='w'?'.':'…'} ${escapeHtml(m.san)}</span><em>${m.color===mine?'you':'them'} · −${Math.round(m.loss)}%</em></button>`).join('')}</div>`:'<p class="story-quiet">A clean game: no single move swung it.</p>'}
    ${worst?`<button type="button" class="story-retry" data-story="retry">${retrySession?'Replaying your moment…':`Replay your toughest moment (move ${Math.ceil(worst.ply/2)})`}</button>`:''}`;
  card.querySelectorAll('[data-story-ply]').forEach(b=>b.onclick=()=>{stopStory();setReviewPly(Number(b.dataset.storyPly))});
  card.querySelector('[data-story="play"]')?.addEventListener('click',playStory);
  card.querySelector('[data-story="stop"]')?.addEventListener('click',()=>{stopStory();renderReviewDashboard()});
  card.querySelector('[data-story="retry"]')?.addEventListener('click',()=>{if(!retrySession)startRetry(worst)});
}
function playStory(){
  stopStory();const {moments}=storyData();
  if(reviewState.currentPly>=reviewState.moves.length)setReviewPly(0);
  const step=()=>{
    if(!reviewState.viewing){stopStory();return}
    const next=reviewState.currentPly+1;if(next>reviewState.moves.length){stopStory();renderReviewDashboard();return}
    setReviewPly(next);const moment=moments.find(m=>m.ply===next);if(moment)toast(`${moment.label} · ${Math.ceil(next/2)}${moment.color==='w'?'.':'…'} ${moment.san}`,{duration:2400});
    storyTimer=setTimeout(step,storyDelayMs(next,moments));
  };
  storyTimer=setTimeout(step,500);renderReviewDashboard();
}
function stopStory(){if(storyTimer){clearTimeout(storyTimer);storyTimer=null}}
// Replay the moment: the board goes back to the position before your costliest move and
// you try to find the engine's choice. Two tries, then it is shown.
function startRetry(worst){
  stopStory();if(!worst)return;
  const fen=reviewState.positions[worst.ply-1];if(!fen)return;
  // Put the real game back afterwards: its moves (local and archived games) or its position (online).
  retrySession={...worst,fen,tries:0,returnPly:reviewState.currentPly,restorePgn:serverGameId?null:game.pgn(),restoreFen:game.fen()};
  reviewState.viewing=false;try{game.load(fen)}catch{}lastMoveCache={fen:'',move:null};selected=null;boardShapes=[];
  render({instant:true});renderStoryCard();toast(`Your move ${Math.ceil(worst.ply/2)}: find something better than ${worst.san}`,{duration:3200});
}
function retryAttempt(move){
  const session=retrySession;if(!session)return;
  const uci=`${move.from}${move.to}${move.promotion&&move.promotion!=='q'?move.promotion:''}`,best=String(session.bestMove).toLowerCase();
  const right=uci===best||`${move.from}${move.to}${move.promotion||''}`===best||`${move.from}${move.to}`===best.slice(0,4)&&best.length===4;
  if(right){
    try{rememberLastMove(game.move({from:move.from,to:move.to,promotion:move.promotion||undefined}))}catch{}
    render();afterBoardPaint(playTone);toast('That is the move. Well found.',{duration:2200});setTimeout(()=>endRetry(),1600);return;
  }
  session.tries++;playIllegalTone();buzz(HAPTICS.illegal);
  if(session.tries<2){toast('Not this one. One more try.');selected=null;render();return}
  boardShapes=[{from:best.slice(0,2),to:best.slice(2,4),brush:'green'}];render();
  toast('The engine liked the green arrow. Study it, then the story goes on.',{duration:3200});setTimeout(()=>endRetry(),3200);
}
function endRetry(){
  const session=retrySession;retrySession=null;if(!session)return;
  boardShapes=[];
  try{if(session.restorePgn)game.loadPgn(session.restorePgn);else game.load(session.restoreFen)}catch{}
  lastMoveCache={fen:'',move:null};setReviewPly(session.ply);
}

// ---- Takebacks (casual games between two people; the server checks the rules) ----
let takebackWasMine=null;
function takebackAvailable(){return isOnlineGame()&&!!myColor&&serverGame?.status==='active'&&!serverGame.rated&&!serverGame.bot_player_id&&!serverGame.tournament_id&&!currentBot}
function syncTakebackUi(){
  const ok=takebackAvailable(),offer=serverGame?.takeback_offer_by,valid=!!offer&&Number(serverGame.takeback_offer_version)===Number(serverGame.version);
  const incoming=ok&&valid&&offer!==currentPlayerId,own=ok&&valid&&offer===currentPlayerId;
  $('#takebackCard')?.classList.toggle('hidden',!incoming);
  const button=$('#takeback');if(button){button.classList.toggle('hidden',!ok);button.textContent=own?'Takeback requested':'Ask to take back';button.disabled=own}
  if(takebackWasMine&&!own&&serverGame?.id===takebackWasMine.gameId){
    toast(Number(serverGame.move_count)<takebackWasMine.moves?'Your opponent accepted the takeback':Number(serverGame.version)===takebackWasMine.version?'Takeback declined':'Takeback request lapsed');
  }
  takebackWasMine=own?{gameId:serverGame.id,version:Number(serverGame.version),moves:Number(serverGame.move_count||0)}:null;
}
async function requestTakeback(){
  if(!takebackAvailable())return toast('Takebacks are for casual games between two players');
  try{applyServerState(await api.takebackOffer(serverGameId));broadcastAux('draw_hint',{from:realtimeClientId});toast('Takeback requested')}catch(error){toast(error.message)}
}
async function answerTakeback(accept){
  try{const out=await api.takebackRespond(serverGameId,!!accept);applyServerState(out);broadcastAux('draw_hint',{from:realtimeClientId});toast(accept?'Move taken back':'Takeback declined')}
  catch(error){toast(error.message);void refreshServerState()}
}
$('#takeback').onclick=()=>{$('.game-more')?.removeAttribute('open');void requestTakeback()};
$('#acceptTakeback').onclick=()=>answerTakeback(true);$('#declineTakeback').onclick=()=>answerTakeback(false);

// ---- Watch: public live games, read-only (server watch_state + Realtime) ----
async function renderWatch(){
  setDynamicView('watch','Watch',brandLoading('Finding live games…'));
  try{
    const {games=[]}=await api.liveGames(),target=$('#dynamicView .view-content');if(!target||currentRightView!=='watch')return;
    target.innerHTML=games.length?`<p class="watch-intro">Live games from matchmaking and arenas. Private rooms are never listed, and no engine help is shown while a game is on.</p><div class="watch-grid">${games.map((g,i)=>`<button type="button" class="watch-card" data-watch="${i}">${studyBoardHtml(g.fen)}<span class="watch-meta"><span><b>${escapeHtml(g.white_name||'White')}</b><em>${escapeHtml(String(g.white_rating_before||''))}</em></span><span><b>${escapeHtml(g.black_name||'Black')}</b><em>${escapeHtml(String(g.black_rating_before||''))}</em></span><small>${formatTimeControl(g.time_control_seconds||600,g.increment_seconds||0)} · ${g.rated?'Rated':'Casual'} · move ${Math.max(1,Math.ceil(Number(g.move_count||0)/2))}</small></span></button>`).join('')}</div><button type="button" class="watch-refresh">Refresh</button>`
      :`<div class="watch-empty"><h4>No live games right now</h4><p>Games from matchmaking and arenas appear here while they're played. Private rooms are never listed.</p><button type="button" class="watch-refresh">Refresh</button></div>`;
    target.querySelectorAll('[data-watch]').forEach(el=>el.onclick=()=>startWatching(games[Number(el.dataset.watch)].id));
    target.querySelector('.watch-refresh')?.addEventListener('click',()=>void renderWatch());
  }catch(error){toast(error.message)}
}
async function startWatching(id){
  try{
    const out=await api.watchState(id);if(archiveSession)leaveArchive({reset:false});
    if(searching)await cancelMatchSearch({announce:false});
    stopWatching({reset:false});stopOnlineSync();
    const prevMode=['match','room','computer'].includes(mode)?mode:'room';
    serverGameId=null;serverGame=null;myColor=null;currentBot=null;puzzleSession=null;computerStarted=false;premoves.cancel();selected=null;browse=null;
    mode='watch';flipped=false;orientationSet=true;
    watchSession={id,state:null,prevMode,timer:null,channel:null};
    applyWatchState(out);
    watchSession.timer=setInterval(()=>{if(!watchSession||document.hidden)return;api.watchState(id).then(applyWatchState).catch(()=>{})},5000);
    watchSession.channel=realtimeClient.channel(`game:${id}`)
      .on('broadcast',{event:'state'},message=>{const state=message?.payload?.game;if(watchSession?.id===id&&state?.id===id)applyWatchState({game:state,serverNow:message.payload.serverNow})})
      .on('broadcast',{event:'moved'},message=>watchRelay(message?.payload))
      .subscribe();
    showMovesView();
    toast(`Watching ${out.game?.white_name||'White'} vs ${out.game?.black_name||'Black'}`);
  }catch(error){toast(error.message)}
}
function applyWatchState(payload){
  if(!watchSession)return;
  const state=payload?.game||payload,prev=watchSession.state;if(!state?.id||state.id!==watchSession.id)return;
  if(prev&&Number(state.version)<Number(prev.version))return;
  watchSession.state=state;clockSnapshot=createClockSnapshot(payload);
  const changed=!!state.fen&&state.fen!==game.fen();
  if(changed){try{game.load(state.fen)}catch{}lastMoveCache={fen:'',move:null};browse=null}
  render({hint:changed&&prev?state.move_history?.at?.(-1):null,instant:!prev});afterBoardPaint(()=>{updateMoves();if(changed&&prev)playTone()});
  syncPlayerBars();syncMobileShell();
  const over=!['active','playing','in_progress'].includes(state.status);
  if(over&&!watchSession.over){watchSession.over=true;toast(`Game over · ${state.result||''}${state.end_reason?` · ${state.end_reason}`:''}`)}
}
// The mover's instant relay reaches spectators too: show it at once if it fits the board.
function watchRelay(payload){
  if(!watchSession||payload?.gameId!==watchSession.id||!payload.from||!payload.to||payload.fenBefore!==game.fen())return;
  try{const made=game.move({from:payload.from,to:payload.to,promotion:payload.promotion||undefined});if(made){browse=null;render({hint:made});afterBoardPaint(playTone)}}catch{}
}
function stopWatching({reset=true}={}){
  const session=watchSession;if(!session)return;
  watchSession=null;clearInterval(session.timer);if(session.channel)realtimeClient.removeChannel(session.channel).catch(()=>{});
  if(mode==='watch')mode=session.prevMode||'room';
  if(reset){clockSnapshot=null;browse=null;game.reset();lastMoveCache={fen:'',move:null};render({instant:true});updateMoves();syncPlayerBars()}
}
function syncWatchBars(){
  const state=watchSession?.state||{};
  const top=flipped?'w':'b',bottom=flipped?'b':'w',name=c=>c==='w'?state.white_name||'White':state.black_name||'Black',rating=c=>c==='w'?state.white_rating_before:state.black_rating_before;
  $('#topPlayerName').textContent=name(top);$('#bottomPlayerName').textContent=name(bottom);
  $('#topRating').textContent=`${rating(top)||'—'} rating`;$('#bottomRating').textContent=`${rating(bottom)||'—'} rating`;
  setPortrait($('#topAvatar'),{label:name(top)});setPortrait($('#bottomAvatar'),{label:name(bottom)});
  setPlayerFlag($('#topFlag'),null);setPlayerFlag($('#bottomFlag'),null);
  const live=['active','playing','in_progress'].includes(state.status);
  setPresence($('#topPresence'),live?'LIVE':'ENDED',live);setPresence($('#bottomPresence'),live?'LIVE':'ENDED',live);
  $('#bottomConnection')?.classList.add('hidden');
}

// ---- Looking back through the game (src/move-browse.js) and Undo against the computer ----
function liveLine(){
  const records=watchSession?(watchSession.state?.move_history||[]):serverGameId&&Array.isArray(serverGame?.move_history)?serverGame.move_history:game.history({verbose:true});
  return browseLine(records,game.fen());
}
function browseAction(kind){
  if(reviewState.viewing){
    const map={first:0,prev:reviewState.currentPly-1,next:reviewState.currentPly+1,live:reviewState.moves.length};
    return setReviewPly(map[kind]);
  }
  const line=browse?{positions:browse.positions,moves:browse.moves}:liveLine(),last=line.positions.length-1;
  if(last<1)return;
  const ply=kind==='first'?browseTo(0,last):kind==='live'?null:browseStep(browse?.ply??null,kind==='prev'?-1:1,last);
  setBrowse(ply,line);
}
function browseGoTo(ply){
  const line=browse?{positions:browse.positions,moves:browse.moves}:liveLine();
  setBrowse(browseTo(ply,line.positions.length-1),line);
}
function setBrowse(ply,line){
  const next=ply===null?null:{ply,positions:line.positions,moves:line.moves};
  if((browse?.ply??null)===(next?.ply??null))return;
  browse=next;selected=null;reactions.unpick?.();
  render({instant:true});updateMoves();syncBrowseUi();
}
function exitBrowse(){if(browse)setBrowse(null,null)}
function syncBrowseUi(){
  $('.game')?.classList.toggle('browsing',!!browse);
  $$('[data-browse="live"],[data-browse="next"]').forEach(button=>button.classList.toggle('glow',!!browse));
}
function canUndo(){return mode==='computer'&&computerStarted&&!localGameOver&&!reviewState.viewing&&game.history().length>0}
function undoComputerMove(){
  if(!canUndo())return toast('Undo is for games against the computer');
  const plies=undoPlies(game.turn(),computerSide,game.history().length);if(!plies)return toast('Nothing to take back yet');
  if(enginePending){try{stockfish.postMessage({action:'stop'})}catch{}}
  browse=null;premoves.cancel();selected=null;boardShapes=[];
  if(localClockState)settleLocalClock();
  for(let i=0;i<plies;i++)game.undo();
  const length=game.history().length;moveTimeByPly.length=Math.min(moveTimeByPly.length,length);moveEvalByPly.length=Math.min(moveEvalByPly.length,length);
  lastMoveCache={fen:'',move:null};
  if(localClockState){localClockState.active=game.turn();localClockState.startedAt=performance.now()}
  render({instant:true});updateMoves();syncBrowseUi();toast(plies===2?'Took back your move and the reply':'Took back your move');
  if(game.turn()!==computerSide)setTimeout(engineMove,300);
}
$$('[data-browse]').forEach(button=>button.onclick=()=>browseAction(button.dataset.browse));
$('#mMoves')?.addEventListener('click',event=>{const chip=event.target.closest('[data-ply]');if(chip)browseGoTo(Number(chip.dataset.ply))});
$('#undoMove').onclick=undoComputerMove;
// ---- Phone layout (src/mobile-shell.js): app-style views, tab bar, action bar ----
function isMobileApp(){mobileMedia??=matchMedia(MOBILE_QUERY);return mobileMedia.matches}
function currentGameKey(){
  if(watchSession)return `watch:${watchSession.id}`;
  if(archiveSession)return `archive:${archiveSession.entry.id}`;
  if(puzzleSession)return `puzzle:${puzzleSession.id}`;
  if(liveGameOn())return lastGameStartKey||`game:${serverGameId||'computer'}`;
  if(serverGameId&&serverGame?.status==='waiting')return `waiting:${serverGameId}`;
  return null;
}
function gameFinished(){
  if(puzzleSession)return false;
  if(mode==='computer')return computerStarted&&(localGameOver||game.isGameOver());
  return !!serverGameId&&!!serverGame&&!['waiting','active','playing','in_progress'].includes(serverGame.status);
}
function setMView(view){if(view){mView=view;syncMobileShell();window.scrollTo(0,0)}}
function syncMoveStrip(records){
  const strip=$('#mMoves');if(!strip||!isMobileApp())return;
  // Online, the server list lags a move that is still on its way: add what's only on the board.
  const sans=records.map(record=>record.san||record.lan||'');
  if(serverGameId&&Array.isArray(serverGame?.move_history))sans.push(...game.history());
  // Waiting for an opponent: the strip shows the room code and a copy button instead.
  const waiting=serverGameId&&serverGame?.status==='waiting'&&mode!=='computer';
  const html=waiting?`<span class="m-room">Room <b>${escapeHtml(serverGame.invite_code||'')}</b></span><button type="button" data-m-copy>Copy invite link</button>`:moveStripHtml(sans,browse?.ply??null);
  if(strip.innerHTML!==html){strip.innerHTML=html;const viewed=browse?strip.querySelector('b.last'):null;strip.scrollLeft=waiting?0:viewed?viewed.offsetLeft-strip.clientWidth/2:strip.scrollWidth;strip.querySelector('[data-m-copy]')?.addEventListener('click',()=>$('#copy').click())}
}
function syncMobileShell(){
  const shell=$('.shell');if(!shell)return;
  const mobile=isMobileApp();document.body.classList.toggle('m-app',mobile);
  if(!mobile){delete shell.dataset.mview;return}
  const key=currentGameKey();
  if(key&&key!==mLastGameKey){mLastGameKey=key;mView='game'} // a new game, room or puzzle opens the board
  const reviewing=reviewState.running||reviewState.viewing;
  if(reviewing&&!mReviewShown){mReviewShown=true;mView='review'}
  if(!reviewing){mReviewShown=false;if(mView==='review')mView='game'}
  if(shell.dataset.mview!==mView)shell.dataset.mview=mView;
  if(key?.startsWith('waiting:'))syncMoveStrip([]);
  const tab=mView==='game'||mView==='review'?'play':mTab;
  $$('[data-m-tab]').forEach(button=>button.classList.toggle('on',button.dataset.mTab===tab));
  const over=gameFinished(),live=liveGameOn(),online=!!serverGameId&&mode!=='computer',human=online&&!serverGame?.bot_player_id&&!currentBot;
  shell.classList.toggle('m-over',over);
  const show=(action,visible)=>$(`[data-m-action="${action}"]`)?.classList.toggle('hidden',!visible);
  const watching=!!watchSession;
  show('options',true);show('draw',human&&live);show('resign',live);show('takeback',takebackAvailable());show('leave',watching);show('chat',human);show('hint',mode==='computer'&&live);show('undo',mode==='computer'&&live);
  show('review',over);show('rematch',over&&human);show('new',over);
  const title=$('#mGameTitle'),sub=$('#mGameSub');
  if(title){
    const t=archiveSession?'Game story':watchSession?'Watching':puzzleSession?'Puzzle':mode==='computer'?`vs ${currentBot?.display_name||currentBot?.name||'Computer'}`:serverGame?.status==='waiting'?'Waiting for opponent':serverGame?.rated?'Rated game':'Casual game';
    if(title.textContent!==t)title.textContent=t;
  }
  if(sub){
    const tc=serverGame?formatTimeControl(serverGame.time_control_seconds||600,serverGame.increment_seconds||0):'';
    const t=archiveSession?`${archiveSession.entry.white} vs ${archiveSession.entry.black}`:watchSession?`${watchSession.state?.white_name||'White'} vs ${watchSession.state?.black_name||'Black'}`:over?'Game over':puzzleSession?'Find the best move':serverGame?.status==='waiting'?`Room ${serverGame.invite_code||''}`:tc;
    if(sub.textContent!==t)sub.textContent=t;
  }
  $('#mReturnGame')?.classList.toggle('hidden',!(live&&mView!=='game'&&mView!=='review'));
}
function openSheet(title,items){
  const sheet=$('#mSheet'),list=$('#mSheetItems');if(!sheet||!list)return;
  $('#mSheetTitle').textContent=title;
  list.replaceChildren(...items.filter(Boolean).map(item=>{
    const button=document.createElement('button');button.type='button';button.textContent=item.label;
    button.onclick=()=>{closeSheet();item.run()};return button;
  }));
  sheet.hidden=false;requestAnimationFrame(()=>sheet.classList.add('open'));list.querySelector('button')?.focus({preventScroll:true});
}
function closeSheet(){const sheet=$('#mSheet');if(!sheet||sheet.hidden)return false;sheet.classList.remove('open');sheet.hidden=true;return true}
function openSection(kind){mTab=['puzzles','learn','watch'].includes(kind)?kind:'more';activateNav(kind);setMView('panel')}
function openMoreSheet(){
  openSheet('More',[
    {label:'Arena & tournaments',run:()=>openSection('arena')},
    {label:'Openings',run:()=>openSection('openings')},
    {label:'Famous games',run:()=>openSection('famous')},
    {label:'My games & Game Story',run:()=>openSection('review')},
    {label:'Board & pieces',run:()=>$('#theme').click()},
    {label:'Portrait & flag',run:()=>void openProfileEditor()},
    {label:authSession?.access_token?'Account':'Sign in',run:()=>openAccount()},
    {label:'Notifications',run:()=>$('#notifyBtn').click()},
    {label:'Install the app',run:()=>$('#installBtn').click()},
  ]);
}
function openGameOptions(){
  const soundOff=!!$('#sound')?.dataset.off;
  openSheet('Game options',[
    {label:'Flip board',run:()=>$('#flip').click()},
    {label:soundOff?'Sound: off (turn on)':'Sound: on (turn off)',run:()=>$('#sound').click()},
    {label:'Board & pieces',run:()=>$('#theme').click()},
    mode!=='computer'&&serverGameId?{label:'Share room link',run:()=>$('#copy').click()}:null,
  ]);
}
const M_ACTIONS={
  options:openGameOptions,
  draw:()=>$('#draw').click(),
  resign:()=>$('#resign').click(),
  chat:()=>$('#openChat').click(),
  hint:()=>void showHint(),
  undo:undoComputerMove,
  takeback:()=>void requestTakeback(),
  leave:()=>{stopWatching();mTab='watch';openSection('watch')},
  review:()=>void startGameReview(),
  rematch:()=>void startOnlineRematch(),
  new:async()=>{await resetFinishedGame();mLastGameKey=null;setMView('home')},
};
$$('[data-m-action]').forEach(button=>button.onclick=()=>M_ACTIONS[button.dataset.mAction]?.());
$$('[data-m-tab]').forEach(button=>button.onclick=()=>{
  const tab=button.dataset.mTab;
  if($('.shell')?.classList.contains('intro-active'))setPrimaryScreen('game',{remember:true});
  if(tab==='more'){openMoreSheet();return}
  if(tab==='play'){mTab='play';activateNav('play');setMView(viewForTab('play',{gameLive:liveGameOn()}));return}
  openSection(tab);
});
$('#mBack').onclick=()=>{if(watchSession){stopWatching();openSection('watch');return}if(archiveSession&&mView!=='review'){leaveArchive();openSection('review');return}if(mView==='review'){reviewState.viewing=false;renderReviewDashboard();render();setMView('game')}else{mTab='play';setMView('home')}};
$('#mReturnGame').onclick=()=>setMView('game');
$$('#mSheet [data-m-close]').forEach(el=>el.onclick=closeSheet);
document.addEventListener('keydown',event=>{if(event.key==='Escape')closeSheet()});
isMobileApp();mobileMedia.addEventListener?.('change',syncMobileShell);syncMobileShell();
async function claimAbandoned(outcome){
  if(!serverGameId)return;
  try{const out=await api.claimWin(serverGameId,outcome);applyServerState(out);broadcastAux('draw_hint',{from:realtimeClientId});toast(out.claimed==='draw'?'Game drawn':'You win · your opponent left')}
  catch(error){toast(error.message);void refreshServerState()}
}
// Hint (computer games only): the engine's best move as a green arrow.
async function showHint(){
  if(mode!=='computer'||!computerStarted||localGameOver||game.isGameOver())return toast('Hints are for games against the computer');
  if(game.turn()!==computerSide)return toast('Wait for your turn');
  const fen=game.fen();
  if(analysisBest?.fen!==fen){
    scheduleAnalysis({force:true});toast('Thinking…',{duration:1200});
    for(let i=0;i<30&&analysisBest?.fen!==fen;i++)await new Promise(resolve=>setTimeout(resolve,100));
  }
  if(game.fen()!==fen||analysisBest?.fen!==fen)return toast('No hint yet, try again');
  boardShapes=[...boardShapes.filter(shape=>shape.brush!=='green'),{from:analysisBest.from,to:analysisBest.to,brush:'green'}];renderBoard();
}
function startPolling(){
  if(!isOnlineGame()){stopPolling();return}
  if(pollTimer)return;
  pollCount=0;let inFlight=false;
  pollTimer=setInterval(async()=>{
    // Keeps beating in a background tab: a player who glances at another app isn't "gone".
    if(!isOnlineGame()||inFlight)return;inFlight=true;
    try{
      const payload=await api.heartbeat(serverGameId);
      applyServerState(payload);
      if(++pollCount%3===0)await loadChat(); // chat_hint broadcasts load new messages at once
    }catch{}
    finally{inFlight=false}
  },5000);
}
function syncOnlineTransport(){
  if(!isOnlineGame()){stopOnlineSync();return}
  startRealtime();startPolling();
}
function addMessage(text,mine=true){const e=document.createElement('p');e.className=mine?'mine':'';e.textContent=String(text).slice(0,160);$('#messages').append(e);e.scrollIntoView()}
function chatIsOpen(){return $('#chatDrawer')?.classList.contains('open')===true}
function updateChatUnread(){const badge=$('#chatUnread');if(!badge)return;badge.textContent=String(chatUnread);badge.classList.toggle('hidden',chatUnread<=0)}
function openChatDrawer(){chatUnread=0;updateChatUnread();$('#chatDrawer').classList.add('open');$('#chatDrawer').setAttribute('aria-hidden','false');void loadChat()}
function closeChatDrawer(){$('#chatDrawer').classList.remove('open');$('#chatDrawer').setAttribute('aria-hidden','true')}
function previewChatMessage(item){
  const name=String(item?.display_name||'Opponent'),body=String(item?.body||'').slice(0,60);
  toast(`${name}: ${body}`,{duration:4200,onClick:openChatDrawer});
}
async function loadChat(){
  if(!serverGameId)return;const data=await api.chatList(serverGameId),messages=data.messages||[],previousId=lastChatMessageId;
  let fresh=[];
  if(previousId){const index=messages.findIndex(item=>item.id===previousId);if(index>=0)fresh=messages.slice(index+1).filter(item=>item.player_id!==data.playerId)}
  else fresh=messages.filter(item=>item.player_id!==data.playerId&&Date.parse(item.created_at)>=chatSessionStartedAt-1000);
  $('#messages').replaceChildren();for(const item of messages)addMessage(item.body,item.player_id===data.playerId);
  lastChatMessageId=messages.at(-1)?.id||lastChatMessageId;
  if(fresh.length&&!chatIsOpen()){chatUnread+=fresh.length;updateChatUnread();previewChatMessage(fresh.at(-1))}
  if(chatIsOpen()){chatUnread=0;updateChatUnread()}
}
$('#chat').onsubmit=async e=>{e.preventDefault();const v=$('#message').value.trim();if(!v||v.length>160)return;if(!serverGameId)return toast('Start or join a game to chat');try{await api.chatSend(serverGameId,v);broadcastAux('chat_hint',{from:realtimeClientId});$('#message').value='';await loadChat()}catch(error){toast(error.message)}};
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
$('#flip').onclick=()=>{flipped=!flipped;render()};$('#sound').onclick=e=>{e.currentTarget.dataset.off=e.currentTarget.dataset.off?'':'1';e.currentTarget.textContent=e.currentTarget.dataset.off?'♫ Sound off':'♫ Sound on'};$('#theme').onclick=()=>menus.open('theme');$('#resign').onclick=async()=>{if(mode==='computer'&&computerStarted&&!localGameOver){const resign=await vchDialog({title:'Resign game?',body:'Your computer game will end immediately.',actions:[{label:'Cancel',value:false},{label:'Resign',value:true,primary:true}]});if(resign){settleLocalClock();localGameOver=true;localGameOverInfo={result:computerSide==='w'?'0-1':'1-0',reason:'by resignation'};render()}}else if(serverGameId){const resign=await vchDialog({title:'Resign game?',body:'This game will end immediately and the result will be final.',actions:[{label:'Cancel',value:false},{label:'Resign',value:true,primary:true}]});if(resign)try{applyServerState(await api.resign(serverGameId))}catch(error){toast(error.message)}}else toast('Start a game first')};$('#draw').onclick=async()=>{if(mode==='computer')return toast('Draw offers are available in multiplayer games');if(!serverGameId)return toast('Start a game first');if(serverGame?.draw_offer_by===currentPlayerId)return cancelOwnDrawOffer();if(serverGame?.draw_offer_by&&serverGame.draw_offer_by!==currentPlayerId)return toast('Answer the draw offer above your player bar');try{applyServerState(await api.drawOffer(serverGameId));broadcastAux('draw_hint',{from:realtimeClientId});toast('Draw offer sent')}catch(error){toast(error.message)}};$('#copy').onclick=async()=>{await navigator.clipboard.writeText($('#share').value);toast('Room link copied')};$('#create').onclick=async()=>{const rated=$('#level').value==='rated';if(rated&&!authSession?.access_token){openAccount();return toast('Sign in is required for rated games')}try{const state=await api.create({name:(currentProfile?.username||guestName),seconds:Number($('#time').value),increment:0,rated});applyServerState(state);room=(state.game||state).invite_code;roomCreated=true;history.replaceState(null,'',`?game=${encodeURIComponent(room)}`);syncRoomUi();await loadChat();toast('Private room is ready')}catch(error){toast(error.message)}};$('#join').onclick=()=>{const v=$('#roomInput').value.trim();if(v)location.search='?game='+encodeURIComponent(v)};
$('#time').onchange=e=>{if(game.history().length)return toast('Time control cannot change after the first move');clocks=initialClocks(Number(e.target.value));syncClockBars(clocks,null)};
const boardEl=$('#board');
function boardPlayArea(){
  const r=boardEl.getBoundingClientRect();
  return {left:r.left+boardEl.clientLeft,top:r.top+boardEl.clientTop,width:boardEl.clientWidth,height:boardEl.clientHeight};
}
function boardSquareAt(x,y){return squareFromPoint(boardPlayArea(),x,y,flipped)}
let hintTargetsKey='',hintTargets=null;
function currentHintTargets(){
  const from=reviewState.viewing?null:selected;if(!from){hintTargetsKey='';hintTargets=null;return null}
  const key=`${game.fen()}|${from}`;
  if(key!==hintTargetsKey){
    hintTargetsKey=key;
    try{hintTargets=new Set(game.moves({square:from,verbose:true}).map(m=>m.to))}catch{hintTargets=null}
  }
  return hintTargets;
}
boardEl.addEventListener('pointermove',event=>{
  if(pointerDrag||event.pointerType==='touch'||event.buttons)return;
  reactions.hover(boardSquareAt(event.clientX,event.clientY),event.clientX,event.clientY,{hintTargets:currentHintTargets()});
});
boardEl.addEventListener('pointerleave',()=>{if(!pointerDrag){reactions.clearHover();reactions.hint(null)}});
// Which kind of drag a press on this square may start: a move, a premove, or none.
function dragKindFor(square){
  const p=game.get(square);if(!p)return null;
  if(canQueuePremove())return p.color===premovePlayerColor()?'premove':null;
  if(reviewState.viewing||localGameOver||game.isGameOver()||(serverGameId&&myColor&&myColor!==game.turn())||(mode==='computer'&&(!computerStarted||game.turn()!==computerSide))||p.color!==game.turn())return null;
  return 'move';
}
// Squares and pieces answer clicks through the board: a piece sits above its square, so the
// square is found from the pointer position (keyboard clicks land on the square button).
boardEl.addEventListener('click',event=>{
  if(suppressBoardClick)return;
  const sq=event.target.closest?.('.square')?.dataset.sq||boardSquareAt(event.clientX,event.clientY);
  if(sq)clickSquare(sq,game.get(sq));
});
// ---- Dragging (left button, touch, pen) ----
// The dragged piece is a copy in the drag layer that follows the pointer with a plain
// transform (no transition) on every pointer event, i.e. every frame; its own piece in the
// piece layer is hidden meanwhile and the square under the pointer is outlined.
// The dragged piece stays inside the board: past an edge it slides along it. Whole pixels
// keep the artwork crisp.
function positionDragFloat(drag,x,y){
  const area=boardPlayArea(),half=drag.size/2;
  const cx=Math.min(Math.max(x,area.left+half),area.left+area.width-half),cy=Math.min(Math.max(y,area.top+half),area.top+area.height-half);
  drag.float.style.transform=`translate(${Math.round(cx-half)}px,${Math.round(cy-half)}px)`;
  // Sway: the piece hangs from the hand and swings against the motion, settling when it stops.
  const now=performance.now();
  if(drag.lastX!==undefined){const dt=Math.max(8,now-drag.lastT);drag.vx=.7*(drag.vx||0)+.3*((cx-drag.lastX)/dt)}
  drag.lastX=cx;drag.lastT=now;
  if(!drag.swayLoop&&expressionsEnabled())startSway(drag);
}
function startSway(drag){
  drag.swayLoop=true;drag.angle=0;
  const art=()=>drag.float?.firstElementChild;
  const step=now=>{
    if(!drag.float||!drag.float.isConnected){drag.swayLoop=false;return}
    if(now-drag.lastT>40)drag.vx*=.85; // pointer stopped: the swing dies down
    const target=Math.max(-20,Math.min(20,(drag.vx||0)*18));
    drag.angle+=(target-drag.angle)*.22;
    const bob=Math.sin(now/180)*1.6;
    const a=art();if(a){a.style.rotate=`${drag.angle.toFixed(2)}deg`;a.style.translate=`0 ${(bob-4).toFixed(2)}%`}
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
function markDragOver(drag,square){
  if(drag.over===square)return;
  boardDom?.squares.get(drag.over)?.classList.remove('drag-over');
  drag.over=square;
  boardDom?.squares.get(square)?.classList.add('drag-over');
}
function startPointerDrag(drag,x,y){
  drag.started=true;reactions.reset();
  if(drag.kind==='premove'){premoves.select(drag.from);selected=null}
  else{premoves.cancel();selected=drag.from}
  const dom=ensureBoardDom(),key=pieceKey(game.get(drag.from));
  drag.size=boardPlayArea().width/8;
  const float=document.createElement('div');
  float.className=`board-piece drag-float ${key[0]}`;float.dataset.piece=key;
  float.innerHTML=`<span class="piece ${key[0]} piece-${key[1]}"></span>`;
  Object.assign(float.style,{width:drag.size+'px',height:drag.size+'px'});
  drag.float=float;positionDragFloat(drag,x,y);dom.dragLayer.append(float);
  document.body.classList.add('board-dragging');
  render();
}
function endPointerDragListeners(){
  reactions.release();
  window.removeEventListener('pointermove',onDragPointerMove);
  window.removeEventListener('pointerup',onDragPointerUp);
  window.removeEventListener('pointercancel',cancelPointerDrag);
  window.removeEventListener('keydown',onDragKeydown);
  window.removeEventListener('blur',cancelPointerDrag);
  document.body.classList.remove('board-dragging');
}
function suppressClickAfterDrag(){suppressBoardClick=true;setTimeout(()=>{suppressBoardClick=false},0)}
function finishPointerDrag(to,{cancelled=false}={}){
  const drag=pointerDrag;pointerDrag=null;endPointerDragListeners();
  document.body.classList.remove('board-dragging');suppressClickAfterDrag();
  // The float is removed only after the board has re-rendered, so the piece never blinks.
  const settle=()=>{render();drag.float?.remove()};
  // Escape, right-click, blur or pointercancel put the selection back the way the press found it.
  if(cancelled){
    if(!drag.wasSelected){if(drag.kind==='premove')premoves.cancel();else selected=null}
    settle();return
  }
  // Judge the drop by what the piece may do NOW: if the opponent replied while a premove
  // was in the air, the piece is ours to move and a legal drop plays at once.
  const kind=dragKindFor(drag.from);
  if(kind==='premove'){
    if(premoves.selected!==drag.from){premoves.select(drag.from);selected=null}
    if(to&&to!==drag.from)premoves.queue(to,'q');
    settle();return
  }
  if(kind==='move'){
    if(premoves.selected||premoves.move)premoves.cancel();
    const legalTargets=game.moves({square:drag.from,verbose:true}).map(m=>m.to);
    const outcome=dropOutcome({from:drag.from,to,legalTargets,wasSelected:drag.kind==='move'&&drag.wasSelected});
    if(outcome==='move'){
      selected=drag.from;void clickSquare(to,game.get(to),{instant:true});drag.float?.remove();
      // A promotion waits for the piece choice before the move is played: show the pawn
      // on its square meanwhile instead of leaving it hidden as the drag origin.
      if(boardDom?.pieces.element(drag.from)?.classList.contains('drag-origin'))renderBoard();
      return
    }
    if(outcome==='return'&&to&&to!==drag.from)rejectMove(drag.from,to);
    selected=outcome==='deselect'?null:drag.from;
    settle();return
  }
  selected=null;premoves.cancel();settle();
}
function cancelPointerDrag(){
  const drag=pointerDrag;if(!drag)return;
  if(!drag.started){pointerDrag=null;endPointerDragListeners();return}
  finishPointerDrag(null,{cancelled:true});
}
function onDragPointerMove(event){
  const drag=pointerDrag;if(!drag||event.pointerId!==drag.id)return;
  if(!drag.started){
    if(!dragDistanceExceeded(drag.startX,drag.startY,event.clientX,event.clientY))return;
    if(!dragKindFor(drag.from)){cancelPointerDrag();return}
    startPointerDrag(drag,event.clientX,event.clientY);
  }
  event.preventDefault();
  positionDragFloat(drag,event.clientX,event.clientY);
  markDragOver(drag,boardSquareAt(event.clientX,event.clientY));
}
function onDragPointerUp(event){
  const drag=pointerDrag;if(!drag||event.pointerId!==drag.id)return;
  if(!drag.started){pointerDrag=null;endPointerDragListeners();return}
  // Releasing outside the board cancels the move: the piece goes home as it was before.
  const to=boardSquareAt(event.clientX,event.clientY);
  if(!to){finishPointerDrag(null,{cancelled:true});return}
  finishPointerDrag(to);
}
function onDragKeydown(event){if(event.key==='Escape'&&pointerDrag?.started){event.preventDefault();cancelPointerDrag()}}
// ---- Arrows and square marks (V1b, right button) ----
// Right-drag draws an arrow (L-shaped for knight jumps), a right-click on one square toggles
// a mark. Orange arrows and red marks by default; Shift green, Ctrl/Cmd blue, Alt yellow.
// A left-click on the board or any move clears them.
function clearBoardShapes(){if(!boardShapes.length&&!shapeDraft)return false;boardShapes=[];shapeDraft=null;renderBoard();return true}
function endShapeListeners(){
  window.removeEventListener('pointermove',onShapePointerMove);
  window.removeEventListener('pointerup',onShapePointerUp);
  window.removeEventListener('pointercancel',cancelShapeDraft);
  window.removeEventListener('blur',cancelShapeDraft);
}
function cancelShapeDraft(){if(!shapeDraft)return;shapeDraft=null;endShapeListeners();renderArrows()}
function startShapeDraft(event){
  const square=boardSquareAt(event.clientX,event.clientY);if(!square)return;
  shapeDraft={id:event.pointerId,from:square,to:square,brush:brushFor('arrow',event)};
  window.addEventListener('pointermove',onShapePointerMove);
  window.addEventListener('pointerup',onShapePointerUp);
  window.addEventListener('pointercancel',cancelShapeDraft);
  window.addEventListener('blur',cancelShapeDraft);
}
function onShapePointerMove(event){
  if(!shapeDraft||event.pointerId!==shapeDraft.id)return;
  const to=boardSquareAt(event.clientX,event.clientY),brush=brushFor('arrow',event);
  if(to===shapeDraft.to&&brush===shapeDraft.brush)return;
  shapeDraft={...shapeDraft,to,brush};renderArrows();
}
function onShapePointerUp(event){
  const draft=shapeDraft;if(!draft||event.pointerId!==draft.id)return;
  shapeDraft=null;endShapeListeners();
  const to=boardSquareAt(event.clientX,event.clientY);
  if(!to){renderArrows();return}
  const shape=to===draft.from?{from:draft.from,brush:brushFor('square',event)}:{from:draft.from,to,brush:brushFor('arrow',event)};
  boardShapes=toggleShape(boardShapes,shape);renderBoard();
}
boardEl.addEventListener('pointerdown',event=>{
  if(event.button===2){
    // Right button: cancels a drag in flight, then queued premoves, otherwise starts a shape.
    if(pointerDrag){cancelPointerDrag();return}
    if(cancelPremove())return;
    if(event.isPrimary)startShapeDraft(event);
    return;
  }
  if(pointerDrag){cancelPointerDrag();return}
  lastPointerType=event.pointerType||'mouse';
  if(!event.isPrimary||event.button!==0)return;
  cancelShapeDraft();clearBoardShapes();
  const square=boardSquareAt(event.clientX,event.clientY);
  if(!square)return;
  const kind=dragKindFor(square);if(!kind)return;
  reactions.press(square,event.clientX,event.clientY); // the piece meets the hand
  document.body.classList.add('board-dragging'); // "grabbing" for the whole press and drag
  pointerDrag={id:event.pointerId,from:square,kind,startX:event.clientX,startY:event.clientY,started:false,float:null,over:null,size:0,wasSelected:kind==='premove'?premoves.selected===square:selected===square};
  window.addEventListener('pointermove',onDragPointerMove,{passive:false});
  window.addEventListener('pointerup',onDragPointerUp);
  window.addEventListener('pointercancel',cancelPointerDrag);
  window.addEventListener('keydown',onDragKeydown);
  window.addEventListener('blur',cancelPointerDrag);
});
// The board has no context menu: the right button draws, and a right-click (or a long press
// on touch) during a drag or with premoves queued cancels them.
boardEl.addEventListener('contextmenu',event=>{event.preventDefault();if(pointerDrag?.started){event.stopImmediatePropagation();cancelPointerDrag();return}cancelPremove()});
render();startClock();void completeAuthCallback().then(connect);
// Email-link landing (/auth/callback). supabase-js reads the session from the URL with
// detectSessionInUrl; a throwaway in-memory client is used so the app's own session store
// stays the single source of truth. Tokens are never logged or shown.
async function detectCallbackSession(){
  const callbackClient=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:true,flowType:'implicit',storageKey:'vch-auth-callback'}});
  const {error}=await callbackClient.auth.initialize();
  if(error)return {session:null,error};
  const {data}=await callbackClient.auth.getSession();
  return {session:data?.session||null,error:null};
}
async function completeAuthCallback(){
  try{
    await handleAuthCallback({
      location,history,detectSession:detectCallbackSession,
      onSignedIn:async session=>{
        saveAuthSession(session);
        await loadProfile().catch(()=>{});syncIdentityUI();
        toast("Email confirmed, you're signed in",{duration:3200});
      },
      onError:error=>{void showAuthLinkError(error)}
    });
  }catch{history.replaceState(null,'','/')}
}
async function showAuthLinkError(error){
  const message=friendlyAuthError(error),body=document.createElement('div'),text=document.createElement('p'),label=document.createElement('label'),input=document.createElement('input');
  text.textContent=message.body;
  label.className='auth-resend-field';label.textContent='Email';
  input.type='email';input.autocomplete='email';input.placeholder='you@example.com';input.maxLength=254;
  label.append(input);body.append(text,label);
  for(;;){
    const choice=await vchDialog({title:message.title,body,actions:[{label:'Close',value:'close'},{label:'Resend confirmation email',value:'resend',primary:true}]});
    if(choice!=='resend')return;
    const email=input.value.trim();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){toast('Enter the email you signed up with');continue}
    try{await authFetch(withAuthRedirect('/auth/v1/resend'),{type:'signup',email});toast('Confirmation email sent. Check your inbox.',{duration:3200});return}
    catch(resendError){toast(resendError.message||'Could not resend the email. Try again in a minute.')}
  }
}

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
  if(mode==='archive')return true;
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
    reviewWorker.postMessage({mode:'analysis',fen,depth:REVIEW_DEPTH,requestId:id});
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
  if(!lastMove||!reviewState.results.length)return null;
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
  $('.analysis')?.classList.toggle('reviewing',reviewState.viewing&&reviewState.results.length>0);
  dashboard.classList.toggle('hidden',!reviewState.viewing||!reviewState.results.length);
  if(!reviewState.viewing||!reviewState.results.length)return;
  $('#whiteAccuracy').textContent=`${reviewAccuracyFor('w').toFixed(1)}%`;
  $('#blackAccuracy').textContent=`${reviewAccuracyFor('b').toFixed(1)}%`;
  const label=$('#reviewPlyLabel');if(label)label.textContent=reviewState.currentPly?`Move ${Math.ceil(reviewState.currentPly/2)} · ${reviewState.moves[reviewState.currentPly-1]?.san||''}`:'Start';
  const explanation=$('#reviewExplanation');if(explanation)explanation.textContent=reviewState.currentPly?reviewExplanation(reviewState.currentPly-1):'Start position — use Next to step through the review.';
  renderReviewCounts();renderReviewGraph();renderStoryCard();
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
  cancelPremove(false);
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
    const archiveId=archiveSession?.entry.id||serverGameId||lastLocalArchiveId;
    if(archiveId)saveReviewSummary(archiveId,{accuracy:{w:reviewAccuracyFor('w'),b:reviewAccuracyFor('b')}});
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
function currentHistory(){if(watchSession)return (watchSession.state?.move_history||[]).map(x=>x.san||x.lan||'');return serverGameId&&Array.isArray(serverGame?.move_history)?serverGame.move_history.map(x=>x.san||x.lan||''):game.history()}
function updateOpeningLabel(){
  if(isGameFinishedForReview())return;
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
// Fair play: no engine help during a live online game (rated or casual, against a person or
// a matched bot). The evaluation, the best line and per-move evals are hidden and the engine
// doesn't run; all of it returns when the game ends. Computer games keep it (no one to wrong).
function engineLocked(){
  if(reviewState.running||reviewState.viewing)return false;
  if(mode==='watch')return ['active','playing','in_progress'].includes(watchSession?.state?.status); // no engine help for anyone in a live game
  return isOnlineGame()&&!!myColor&&['active','playing','in_progress'].includes(serverGame?.status);
}
let engineWasLocked=false,analysisBest=null;
function syncEngineLock(){
  const locked=engineLocked();
  $('.analysis')?.classList.toggle('engine-locked',locked);
  $('#engineLockedNote')?.classList.toggle('hidden',!locked);
  if(locked&&!engineWasLocked){
    clearTimeout(analysisTimer);analysisRequest=null;
    try{analysisWorker.postMessage({action:'stop'})}catch{}
    const depthEl=$('#depth');if(depthEl)depthEl.textContent='—';
    updateMoves();
  }
  if(!locked&&engineWasLocked)updateMoves();
  engineWasLocked=locked;
  return locked;
}
function updateAnalysisFromUci(text,request){
  if(engineLocked())return;
  if(reviewState.running||reviewState.viewing){const depthEl=$('#depth');if(depthEl)depthEl.textContent=String(REVIEW_DEPTH);return}
  if(!request||request.fen!==game.fen())return;
  const depth=Number(text.match(/\bdepth (\d+)/)?.[1]||0);
  const scoreMatch=text.match(/\bscore (cp|mate) (-?\d+)/);
  const pv=text.match(/\bpv (.+)$/)?.[1]||'';
  if(!depth||!scoreMatch||text.includes(' lowerbound')||text.includes(' upperbound'))return;
  if(depth<request.depth)return;
  request.depth=depth;
  {
    let score=scoreMatch[1]==='mate'?(Number(scoreMatch[2])>0?99:-99):Number(scoreMatch[2])/100;
    if(request.fen.split(' ')[1]==='b')score=-score;
    analysisScore=Math.max(-99,Math.min(99,score));
    if(request.ply)moveEvalByPly[request.ply-1]=analysisScore;
    const scoreEl=$('#score');if(scoreEl)scoreEl.textContent=(analysisScore>=0?'+':'')+(Math.abs(analysisScore)>=90?'M'+Math.abs(Number(scoreMatch[2])||1):analysisScore.toFixed(1));
    const fill=$('#meterFill');if(fill)fill.style.width=(50+Math.max(-45,Math.min(45,analysisScore*8)))+'%';
    const advantage=$('#advantage');if(advantage)advantage.textContent=Math.abs(analysisScore)<.2?'Equal position':analysisScore>0?'Advantage for White':'Advantage for Black';
    updateMoves();
  }
  const depthEl=$('#depth');if(depthEl)depthEl.textContent=String(depth);
  const line=$('#line');if(line&&pv)line.textContent=formatPv(pv);
  const best=firstMoveOfLine(pv);if(best&&depth>=6)analysisBest={fen:request.fen,depth,...best};
}
function scheduleAnalysis({force=false}={}){
  clearTimeout(analysisTimer);
  if(syncEngineLock())return;
  if(reviewState.running||reviewState.viewing||mode==='puzzle')return;
  analysisTimer=setTimeout(()=>{
    if(botThinking)return;
    const fen=game.fen();
    if(!force&&analysisRequest?.fen===fen)return;
    analysisRequest={id:`analysis-${++engineRequestSeq}`,fen,ply:currentHistory().length,depth:0};
    analysisWorker.postMessage({mode:'analysis',fen,depth:ANALYSIS_MAX_DEPTH,requestId:analysisRequest.id});
  },220);
}
function showMovesView(){
  currentRightView='moves';$('#movesView')?.classList.remove('hidden');$('#dynamicView')?.classList.add('hidden');
  if(reviewState.viewing){reviewState.viewing=false;renderReviewDashboard();render()}
  $$('.tabs button').forEach(b=>b.classList.toggle('on',b.dataset.tab==='moves'));
  updateMoves();scheduleAnalysis({force:true});
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
  cancelPremove(false);
  const records=serverGame?.move_history||[],sans=records.map(x=>x.san||x.lan||'').filter(Boolean),captures=records.filter(x=>x.captured).length,checks=records.filter(x=>String(x.san||'').includes('+')).length;
  const opening=detectOpening(sans);
  setDynamicView('review','Post-Game Review',`<div class="review-summary"><div><b>${records.length}</b><small>plies played</small></div><div><b>${captures}</b><small>captures</small></div><div><b>${checks}</b><small>checks</small></div><div><b>${analysisScore>=0?'+':''}${analysisScore.toFixed(1)}</b><small>current eval</small></div></div><article class="review-note"><h4>${opening?escapeHtml(opening.name):'Unclassified opening'}</h4><p>${opening?escapeHtml(opening.idea):'Play a few moves to identify the opening family.'}</p></article><button class="primary-action analyze-now">Analyze current position</button>${sans.length?'<button class="secondary-action replay-review">Replay every move</button>':''}`);
  $('#dynamicView .analyze-now').onclick=()=>{showMovesView();scheduleAnalysis({force:true})};
  const replay=$('#dynamicView .replay-review');if(replay)replay.onclick=()=>renderStudy('review','Game Replay',sans,opening?opening.name:'Current game');
}
function brandLoading(label){
  return `<div class="loading-card brand-loading"><img src="/assets/vch/brand/vch-metal.svg" alt="VCH"><span>${escapeHtml(label)}</span></div>`;
}
async function showBackendView(kind){
  if(kind==='puzzle'){
    cancelPremove(false);if(watchSession)stopWatching();
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
      const data=await api.tournaments(),events=sortArenas(data.tournaments||data.events||[]),mine=new Map((data.memberships||[]).map(m=>[m.tournament_id,m]));
      const target=$('#dynamicView .view-content');if(!target)return;
      const card=(t,i)=>{
        const phase=arenaPhase(t),joined=mine.get(t.id),weekly=isWeeklyArena(t);
        const action=phase.phase==='finished'?'':phase.phase==='upcoming'?(joined?'<button class="arena-join" disabled>Registered</button>':'<button class="arena-join">Register</button>'):'<button class="arena-join">Play now</button>';
        return `<article data-arena="${i}" class="arena-card${weekly?' weekly':''} phase-${phase.phase}"><div>${weekly?'<span class="arena-badge">Weekly</span>':''}<small>${t.rated?'RATED':'CASUAL'} · ${escapeHtml(t.pool||'arena')} · ${formatTimeControl(Number(t.base_seconds||600),Number(t.increment_seconds||0))}</small><h4>${escapeHtml(t.name||t.title||'Arena')}</h4>${t.description?`<p>${escapeHtml(t.description)}</p>`:''}<p class="arena-when" data-arena-when="${i}">${escapeHtml(phase.label)}</p>${joined?`<p class="arena-mine">You: ${Number(joined.points||0)} pts · ${joined.wins||0}W ${joined.draws||0}D ${joined.losses||0}L</p>`:''}</div><div>${action}<button class="arena-standings">${phase.phase==='finished'?'Results':'Standings'}</button></div><section class="standings-slot"></section></article>`;
      };
      target.innerHTML=`<div class="arena-list">${events.map(card).join('')||'<p>No arenas right now.</p>'}</div>`;
      [...target.querySelectorAll('[data-arena]')].forEach((row,i)=>{
        const t=events[i],phase=arenaPhase(t).phase,join=row.querySelector('.arena-join');
        if(join&&!join.disabled)join.onclick=async()=>{
          try{
            await api.tournamentJoin(t.id);
            if(phase==='upcoming'){join.textContent='Registered';join.disabled=true;return toast(`Registered · ${arenaPhase(t).label.toLowerCase()}`)}
            await api.queueJoin({seconds:Number(t.base_seconds||600),increment:Number(t.increment_seconds||0),rated:!!t.rated,tournamentId:t.id});mode='match';toast('Arena queue joined');
            const timer=setInterval(async()=>{try{const state=await api.queueStatus(!!t.rated);if(state.game||state.matched){clearInterval(timer);applyServerState(state);showMovesView();toast('Arena match found')}}catch(error){clearInterval(timer);toast(error.message)}},1000);
          }catch(error){toast(error.message)}
        };
        row.querySelector('.arena-standings').onclick=async()=>{try{const result=await api.tournamentStandings(t.id),slot=row.querySelector('.standings-slot');slot.innerHTML=standingsRows(result.standings||[]).slice(0,10).map(p=>`<p><span>${p.rank}.</span> ${escapeHtml(p.name)} <b>${p.points} pts</b> <small>${p.record}</small></p>`).join('')||'<p>No scores yet.</p>'}catch(error){toast(error.message)}};
      });
      const tick=setInterval(()=>{if(currentRightView!=='arena'||!document.body.contains(target))return clearInterval(tick);events.forEach((t,i)=>{const el=target.querySelector(`[data-arena-when="${i}"]`);if(el)el.textContent=arenaPhase(t).label})},30000);
    }catch(error){toast(error.message);showMovesView()}
  }
}
function activateNav(kind){
  $$('.main-nav button').forEach(b=>b.classList.toggle('active',b.dataset.nav===kind));
  if(kind==='play')showMovesView();
  if(kind==='arena')showBackendView('arena');
  if(kind==='watch')void renderWatch();
  if(kind==='puzzles')showBackendView('puzzle');
  if(kind==='learn')renderLearn();
  if(kind==='openings')renderOpenings();
  if(kind==='famous')renderFamous();
  if(kind==='review')void renderArchive();
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
function registerPopover(name,panel,trigger){
  menus.register(name,{
    open:()=>{panel.hidden=false;trigger.setAttribute('aria-expanded','true');(panel.querySelector('.profile-menu-items button')||panel.querySelector('button'))?.focus({preventScroll:true})},
    close:()=>{const hadFocus=panel.contains(document.activeElement);panel.hidden=true;trigger.setAttribute('aria-expanded','false');if(hadFocus)trigger.focus({preventScroll:true})},
    contains:target=>panel.contains(target)||trigger.contains(target)
  });
}
function registerModal(name,dialog){
  menus.register(name,{open:()=>{if(!dialog.open)dialog.showModal()},close:()=>{if(dialog.open)dialog.close()},contains:()=>true});
  dialog.addEventListener('close',()=>menus.closed(name));
  dialog.addEventListener('click',event=>{if(backdropHit(event,dialog))menus.close(name)});
}
registerPopover('profile',$('#profileMenu'),$('#accountBtn'));
registerPopover('notifications',$('#notifyMenu'),$('#notifyBtn'));
const gameMore=$('.game-more');
menus.register('game-more',{open:()=>{gameMore.open=true},close:()=>{gameMore.open=false},contains:target=>gameMore.contains(target)});
gameMore.addEventListener('toggle',()=>{if(gameMore.open){if(!menus.isOpen('game-more'))menus.open('game-more')}else menus.closed('game-more')});
gameMore.querySelectorAll('.game-more-menu button').forEach(button=>button.addEventListener('click',()=>menus.close('game-more')));
registerModal('theme',$('#themeStudio'));
registerModal('account',$('#accountDialog'));
registerModal('search',$('#searchDialog'));
registerModal('promotion',$('#promotion'));
document.addEventListener('pointerdown',event=>{menus.handleOutside(event.target)},true);
$('#closeProfileMenu').onclick=()=>menus.close('profile');
$('#closeNotifyMenu').onclick=()=>menus.close('notifications');
$('#profileMenuProfile').onclick=openAccount;
$('#profileMenuEdit').onclick=()=>{menus.close('profile');void openProfileEditor()};
$('#profileMenuSettings').onclick=()=>menus.open('theme');
$('#profileMenuAuth').onclick=()=>{if(authSession?.access_token&&currentProfile?.account){menus.close('profile');void signOut()}else openAccount()};
$$('.main-nav button').forEach(button=>button.onclick=()=>{if($('.shell')?.classList.contains('intro-active'))setPrimaryScreen('game',{remember:true});activateNav(button.dataset.nav)});
$('#joinNow').onclick=()=>{setPrimaryScreen('game',{remember:true});activateNav('play')};
$$('.feature-card').forEach(button=>button.onclick=()=>activateNav(button.dataset.action));
$$('.tabs button').forEach(button=>button.onclick=()=>{const kind=button.dataset.tab;if(kind==='moves')showMovesView();if(kind==='analysis'){startGameReview();document.querySelector('.analysis')?.scrollIntoView({block:'nearest'})}if(kind==='openings')renderOpenings();if(kind==='famous')renderFamous()});
$('#reviewGame').onclick=startGameReview;
$('#reviewFirst').onclick=()=>setReviewPly(0);
$('#reviewPrev').onclick=()=>setReviewPly(reviewState.currentPly-1);
$('#reviewNext').onclick=()=>{stopStory();setReviewPly(reviewState.currentPly+1)};
$('#reviewLast').onclick=()=>setReviewPly(reviewState.moves.length);
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&menus.handleEscape()){event.preventDefault();return}
  if(event.key==='Escape'&&cancelPremove()){event.preventDefault();return}
  if(event.metaKey||event.ctrlKey||event.altKey||/INPUT|TEXTAREA|SELECT/.test(event.target?.tagName||''))return;
  if(!reviewState.viewing){
    // Not reviewing: the arrows look back through the game without taking anything back.
    const keys={ArrowLeft:'prev',ArrowRight:'next',Home:'first',End:'live'};
    if(keys[event.key]&&currentHistory().length){event.preventDefault();browseAction(keys[event.key])}
    return;
  }
  if(event.key==='ArrowLeft'){event.preventDefault();setReviewPly(reviewState.currentPly-1)}
  if(event.key==='ArrowRight'){event.preventDefault();setReviewPly(reviewState.currentPly+1)}
  if(event.key==='Home'){event.preventDefault();setReviewPly(0)}
  if(event.key==='End'){event.preventDefault();setReviewPly(reviewState.moves.length)}
});
$('#acceptDrawOffer').onclick=()=>respondToDrawOffer(true,'accepted');
$('#abandonClaim').onclick=()=>claimAbandoned('win');$('#abandonDraw').onclick=()=>claimAbandoned('draw');
$('#hint').onclick=()=>{$('.game-more')?.removeAttribute('open');void showHint()};
$('#declineDrawOffer').onclick=()=>respondToDrawOffer(false,'declined');
$('#openChat').onclick=openChatDrawer;
$('#closeChat').onclick=closeChatDrawer;
$('#accountBtn').onclick=()=>{syncIdentityUI();menus.toggle('profile')};
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
      const made=await authFetch(withAuthRedirect('/auth/v1/signup'),{email,password,data:{username}});
      session=made.access_token?made:null;
      if(!session){message.textContent='Account created. Confirm your email, then sign in.';return}
    }else session=await authFetch('/auth/v1/token?grant_type=password',{email,password});
    saveAuthSession(session);await loadProfile();syncIdentityUI();message.textContent='Signed in.';setTimeout(()=>$('#accountDialog').close(),450);
  }catch(error){message.textContent=error.message}
};
async function signOut(){try{if(authSession?.access_token)await authFetch('/auth/v1/logout',null,authSession.access_token)}catch{}saveAuthSession(null);currentProfile=null;await loadProfile().catch(()=>{});syncIdentityUI();menus.close('account');toast('Signed out')}
$('#signOutBtn').onclick=signOut;
$('#searchBtn').onclick=()=>{menus.open('search');$('#searchInput').focus()};
$('#searchInput').oninput=e=>{
  const q=e.target.value.trim().toLowerCase(),target=$('#searchResults');if(!q){target.innerHTML='';return}
  const results=[
    ...OPENINGS.filter(x=>(x.name+' '+x.eco+' '+x.idea).toLowerCase().includes(q)).map(x=>({type:'Opening',title:x.name,sub:x.idea,action:'openings'})),
    ...FAMOUS_GAMES.filter(x=>(x.title+' '+x.players+' '+x.opening).toLowerCase().includes(q)).map(x=>({type:'Famous game',title:x.title,sub:x.players,action:'famous'})),
    ...LESSONS.filter(x=>(x.title+' '+x.body).toLowerCase().includes(q)).map(x=>({type:'Lesson',title:x.title,sub:x.level,action:'learn'}))
  ].slice(0,8);
  target.innerHTML=results.map((r,i)=>`<button data-result="${i}"><small>${r.type}</small><b>${escapeHtml(r.title)}</b><span>${escapeHtml(r.sub)}</span></button>`).join('')||'<p>No results yet.</p>';
  [...target.querySelectorAll('[data-result]')].forEach((b,i)=>b.onclick=()=>{menus.close('search');activateNav(results[i].action)});
};
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;$('#installBtn').classList.add('ready')});
$('#installBtn').onclick=async()=>{if(installPrompt){installPrompt['prompt']();await installPrompt.userChoice;installPrompt=null}else toast('Use your browser menu to install this app')};
$('#notifyBtn').onclick=()=>menus.toggle('notifications');
const savedTheme=JSON.parse(localStorage.getItem('vanta.theme')||'{}');
const clamp=(value,min,max,fallback)=>{const number=Number(value);return Number.isFinite(number)?Math.max(min,Math.min(max,number)):fallback};
const motionCssValue=value=>`${Math.round(clamp(value,0,100,100)*4)}ms`;
const normalizeMotionCss=value=>{
  const raw=String(value||'').trim(),amount=parseFloat(raw);
  if(!Number.isFinite(amount))return '400ms';
  const milliseconds=raw.endsWith('s')&&!raw.endsWith('ms')?amount*1000:amount;
  return `${Math.round(clamp(milliseconds,0,400,400))}ms`;
};
savedTheme.pieceTint=0;
savedTheme['--glass']=String(clamp(savedTheme['--glass'],.35,1,.94));
savedTheme['--motion']=normalizeMotionCss(savedTheme['--motion']);
// Backdrop blur only where the glass is see-through. At the near-opaque default the blurred
// wallpaper contributes almost nothing to the image, but the compositor redoes every panel's
// blur for every frame that changes anything, which halves the frame rate of board moves on
// software-rendered and low-end devices (backlog V1-fix).
const GLASS_BLUR_BELOW=.9;
function syncGlassBlur(value){document.documentElement.dataset.glass=Number(value)<GLASS_BLUR_BELOW?'clear':'solid'}
syncGlassBlur(savedTheme['--glass']);
document.documentElement.style.setProperty('--white-piece',savedTheme.whitePiece||'#f0d9a4');
document.documentElement.style.setProperty('--black-piece',savedTheme.blackPiece||'#342019');
document.documentElement.style.setProperty('--piece-tint','0');
for(const [key,value] of Object.entries(savedTheme)){if(key==='wallpaper')document.body.dataset.wallpaper=value;else if(key!=='pieceStyle'&&key!=='pieceTint')document.documentElement.style.setProperty(key,value)}
motionScaleCache=null; // the saved Motion setting is applied now
const glassControl=$('[data-theme="--glass"]'),motionControl=$('[data-theme="--motion"]');
if(glassControl)glassControl.value=String(Math.round(Number(savedTheme['--glass'])*100));
if(motionControl)motionControl.value=String(Math.round(parseFloat(savedTheme['--motion'])/4));
$$('[data-theme]').forEach(input=>input.oninput=()=>{
  const value=input.type!=='range'?input.value:input.dataset.theme==='--glass'?String(clamp(Number(input.value)/100,.35,1,.94)):motionCssValue(input.value);
  document.documentElement.style.setProperty(input.dataset.theme,value);savedTheme[input.dataset.theme]=value;if(input.dataset.theme==='--motion')motionScaleCache=null;if(input.dataset.theme==='--glass')syncGlassBlur(value);localStorage.setItem('vanta.theme',JSON.stringify(savedTheme));
});
savedTheme.pieceStyle=applyPieceStyle(migratePieceStyle(savedTheme));
localStorage.setItem('vanta.theme',JSON.stringify(savedTheme));
$('#expressionsSetting').value=expressionSetting;
$('#expressionsSetting').onchange=e=>{expressionSetting=e.target.value;savedTheme.expressions=expressionSetting;localStorage.setItem('vanta.theme',JSON.stringify(savedTheme));if(boardDom)boardDom.moodKey='';render()};
$('#pieceStyle').onchange=e=>{savedTheme.pieceStyle=applyPieceStyle(e.target.value);localStorage.setItem('vanta.theme',JSON.stringify(savedTheme))};
$('#whitePiece').value=savedTheme.whitePiece||'#f0d9a4';$('#blackPiece').value=savedTheme.blackPiece||'#342019';$('#pieceTint').value=0;$('#whitePiece').oninput=e=>{savedTheme.whitePiece=e.target.value;document.documentElement.style.setProperty('--white-piece',e.target.value);localStorage.setItem('vanta.theme',JSON.stringify(savedTheme))};$('#blackPiece').oninput=e=>{savedTheme.blackPiece=e.target.value;document.documentElement.style.setProperty('--black-piece',e.target.value);localStorage.setItem('vanta.theme',JSON.stringify(savedTheme))};$('#pieceTint').oninput=e=>{savedTheme.pieceTint=Number(e.target.value)/100;document.documentElement.style.setProperty('--piece-tint',String(savedTheme.pieceTint));localStorage.setItem('vanta.theme',JSON.stringify(savedTheme))};$('#wallpaper').onchange=e=>{document.body.dataset.wallpaper=e.target.value;savedTheme.wallpaper=e.target.value;localStorage.setItem('vanta.theme',JSON.stringify(savedTheme))};
$('#closeTheme').onclick=()=>menus.close('theme');
