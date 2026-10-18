import './style.css';
import './rtl.css';
import './shadows.css';
import { Chess } from 'chess.js';
import { createClient } from '@supabase/supabase-js';
import { VchApi, stableGuestToken } from './vch-api.js';
import { initialClocks, normalizeRoomId } from './game-config.js';
import { createClockSnapshot, projectedClocks, seatFromEnvelope } from './server-state.js';
import { OPENINGS, FAMOUS_GAMES, detectOpening } from './content.js';
import { COURSES, COURSE_LEVELS, courseById, lessonById } from './courses.js';
import { FAMOUS_ERAS, FAMOUS_LESSONS, checkAnswer, famousLessonById, lessonScore, momentPosition, momentSide } from './famous-lessons.js';
import { answerQuiz, courseProgress, courseStars, currentStep, loadProgress as loadLessonProgress, newFamousRun, nextLesson, nextMoment, nextStep, playCourseMove, recordFamousAnswer, saveLessonResult, startRun } from './lesson-player.js';
import { REVIEW_DEPTH, CLASSIFICATION_META, accuracyFromLosses, classificationAsset, classifyMove, formatMoveDuration, gameAccuracy, winPercentageLoss } from './review.js';
import { migratePieceStyle, normalizePieceStyle, pieceAssetFor, pieceStyleOptions } from './piece-styles.js';
import { PremoveQueue, consumeLegalPremove, premovedPieceAt } from './premove.js';
import { dragDistanceExceeded, dropOutcome, squareFromPoint } from './board-drag.js';
import { arrowsSvg, brushFor, moveDurationMs, pieceKey, pieceTransform, positionMap, toggleShape } from './board-view.js';
import { PieceLayer } from './piece-layer.js';
import { PieceReactions } from './piece-reactions.js';
import { analyzeMoods, bearing, fairMoods, landingImpact } from './piece-expressions.js';
import { REVIEW_REACTION, HAPTICS, capturedPieces, endingCast, hapticFor } from './game-feel.js';
import { TRAY_KINDS, bump, captureSquare, countKinds, flightKeyframes, flightMs, isCapture, leave, popIn, settle, trayChange } from './capture-tray.js';
import { FLAG_URL, countryList, countryName } from './flags.js';
import { BIO_MAX, PORTRAIT_PRESETS, avatarFromFile, cleanBio, cleanDisplayName, isDisplayName, isPortraitPreset, presetLabel, presetMarkup, setPortrait } from './portrait.js';
import { moderateText } from './moderation.js';
import { EMOJI_SET, REACTIONS as CHAT_REACTIONS, REACTION_CSS, parseReaction, reactionMarkup, reactionMessage } from './reactions.js';
import { flashSquareFor, illegalReason } from './illegal-move.js';
import { abandonState, firstMoveOfLine, tabTitle, tickSecond } from './game-moments.js';
import { endedFor, liveFrom, loadLive, saveLive, sideToMove } from './live-game.js';
import { MOBILE_QUERY, moveStripHtml, viewForTab } from './mobile-shell.js';
import { browseLine, browseStep, browseTo, undoPlies } from './move-browse.js';
import { arenaPhase, isWeeklyArena, sortArenas, standingsRows } from './arena.js';
import { loadBestStreak, saveBestStreak, streakDifficulty } from './puzzle-streak.js';
import { archiveEntryFromServer, chapterAccuracy, formInsights, keyMoments, loadLocalArchive, loadReviewCache, outcomeFor, sansFromPgn, saveLocalGame, saveReviewSummary, storyChapters, storyDelayMs, worstMoment } from './game-story.js';
import { CONFIRM_WAIT_MS, confirms, isExpired, isStale, provisionalMove, waiter } from './online-sync.js';
import { vchDialog } from './vch-dialog.js';
import { MenuController, backdropHit } from './menus.js';
import { ANALYSIS_MAX_DEPTH, BOT_MOVE_TIMEOUT_MS, botSearchNodes } from './engine-config.js';
import { friendlyAuthError, handleAuthCallback, withAuthRedirect } from './auth-callback.js';
import { dismissSplash, isStandaloneDisplay, splashMarkup, splashPlan } from './splash.js';
import { openingName, trainerReport } from './opening-trainer.js';
import { opponentUsername, poolsPlayed, profileUrl, ratingChartModel, recordText } from './profile-view.js';
import { FREESTYLE_LABEL, freestyleFen } from './freestyle.js';
import { playablePuzzleFen } from './puzzle-start.js';
import { VARIANT_WORKER_URL, zhRecordsFromSans, zhReviewPositions } from './variant-engine.js';
import { FOG_REVIEW_VARIANTS, beliefAfter, fogBeliefs, isAmbush } from './fog-review.js';
import { ENGINES, engineFor, lozzaBudget } from './engine-roster.js';
import { COMPUTER_LEVELS, DEFAULT_LEVEL, LEVEL_TIERS, OLD_BOT_NAMES, beginnerMove, levelBot } from './computer-levels.js';
import { guideFor } from './hover-guide.js';
import { MODES, ResonancePlate, SandBackdrop, modeForChord, modeForMoment, spectrumEnergy } from './resonance.js';
import { RUN_MODES, SKIP_MAX, SKIP_TOKEN_SVG, clockLabel as runClock, earnMilestone, loadBestSurvival, loadSkips, saveBestSurvival, spendSkip, survivalLeft, survivalSeconds } from './puzzle-modes.js';
import { beliefFen, blackoutBelief, capturedBy, engineBlind, lookAround, sharedMoves, startMemory } from './blind-engine.js';
import { ZH_PIECES, zhDrops, zhPlay, zhState, zhStatus } from './crazyhouse.js';
import { lazyWorker } from './lazy-worker.js';
import { resolveTypedMove } from './typed-move.js';
import { REP_KEY, addLine, lineText, removeLine, repContinue, repDeviation, repDrill, repMovesAt, repStats } from './repertoire.js';
import { buildPlan, currentStreak, loadProgress as loadPlanProgress, loadStreak, planComplete, tick as planTick } from './training-plan.js';
import { cleanShapes, isNewer } from './analysis-sync.js';
import { prepReply, prepStats, prepSummary, prepTree } from './prep.js';
import { checkers as darkCheckers, darkSan, fogPosition, visibleSquares } from './vanta-dark.js';
import { BLACKOUT_SECONDS, blindMovesLeft, inBlackout, movesUntilBlackout, myMoveCount } from './blackout.js';
import { SHADOW_PLIES, shadowBook, shadowElo, shadowLines } from './shadow.js';
import { GAUNTLET_LIVES, GAUNTLET_STAGES, loadGauntlet, newRun as newGauntletRun, recordStage, saveGauntlet, stageColor } from './gauntlet.js';
import { rivalLine, rivalsFrom } from './rivals.js';
import { RELICS, equipRelic, loadRelics, relicById, saveRelics, unlockRelic } from './relics.js';
import { addGames, armyList, identitiesAfter, loadVeterans, rankOf, saveVeterans, totalsMap } from './veterans.js';
import { dailyOaths, loadOaths, oathById, oathStatus, oathSummary, recordOath, saveOaths } from './oaths.js';
import { atmosphereFor, materialFromFen, tensionFor } from './atmosphere.js';
import { WallLights, lightReaction, placeLights, wallpaperKey } from './wallpaper-lights.js';
import { BUGHOUSE_SEATS, bughouseStatus, other, otherBoard, partnerSeat, teamOfSeat } from './bughouse.js';
import { CHARGE_NAMES, CREST_CHARGES, CREST_DIVISIONS, CREST_SHIELDS, CREST_TINCTURES, DEFAULT_CREST, DIVISION_NAMES, SHIELD_NAMES, TINCTURE_NAMES, cleanCrest, crestSvg, crestText } from './heraldry.js';
import { FATES, points as twinPoints } from './twin-fates.js';
import { KEY_FOR_THEME, VantaScore, WORLDS, chordFor, hideTrack, likeTrack, loadMusic, loadMusicLikes, moodFor, saveMusic, saveMusicLikes } from './music.js';
import { DIVISIONS, STATIONS, STINGS, isSting, loadLibrary } from './music-library.js';
import { ACCEPT as MY_MUSIC_ACCEPT, MAX_SONG_MB, MAX_SONGS, addSongs, listSongs, myMusicServed, putSong, removeSong, renameSong, songTrack } from './my-music.js';
import { playMoveSound, soundPlace } from './move-sound.js';
import { backgroundUrls, revealApp } from './boot-reveal.js';
import { ARRIVAL, arrivalMs, startArrival } from './board-arrival.js';
import { PIECE_SETS, PIECE_SOUNDS, SET_FOR_RELIC, SoundBank, UI_SOUNDS, moveSoundName, uiGate } from './sfx.js';
import { MAX_STARS, REALMS, battleKey, battleOpen, loadCampaign, realmById, realmFreed, realmOpen, realmsFreed, recordBattle, saveCampaign, totalStars } from './campaign.js';
import { DRILLS, drillById, drillStatus, loadProgress, saveStars, starsFor, yourColor } from './endgames.js';
import { insightSummary, poolsPlayed as insightPools, ratingChartSvg, ratingSeries } from './insights.js';
import { SPEECH_LANG, clockAnnouncement, spokenMove } from './a11y.js';
import { applyCastle, castleForMove, castleOptions, replay960 } from './castle960.js';
import { moveLabels, studyPositions, studyUrl } from './study.js';
import { coachNote } from './coach.js';
import { KIND_LABEL, badgeCount, safeNotificationUrl, timeAgo } from './notifications.js';
import { explorerRows, formatScore, parseMultiPv, scoreValue } from './explorer-view.js';
import { LANGUAGES, LANG_KEY, RTL, detectLanguage, loadLanguage, translateText, translateTree } from './i18n.js';
import { BOARD_SETS, unlockedSets } from './season-themes.js';
import { planReady, planText } from './plan-moves.js';
import { collectMistakes, dueMistakes, gradeMistake, loadMistakes, mergeMistakes, mistakeStats, saveMistakes } from './mistakes.js';
import { CARD_H, CARD_W, canvasToBlob, clipSchedule, drawStoryFrame, loadPieceImages, recordClip, shareOrDownload, storyFileName } from './story-share.js';
import { difficultyForRating, ratingDeltaText, sparklinePoints, themeLabel, weakestThemes } from './puzzle-rating.js';
import { CHALLENGE_TIMES, VAPID_PUBLIC_KEY, achievementBoard, berserkProgress, canBerserk, challengePayload, clockLabel, dailyDeadlineLabel, pushSupported, sortFriends, timeChoice, timeControlLabel, urlBase64ToBytes } from './social.js';

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
const defaultGuestName=`Guest-${playerToken.slice(-4).toUpperCase()}`;
// A guest may choose a display name (Portrait & profile); it is kept on this device and sent
// with every request that carries the guest's name.
let guestName=(()=>{try{const v=cleanDisplayName(localStorage.getItem('vch.guestName')||'');return isDisplayName(v)?v:defaultGuestName}catch{return defaultGuestName}})();
const game=new Chess(); const premoves=new PremoveQueue(); const menus=new MenuController(); const realtimeClientId=crypto.randomUUID(); let selected=null, flipped=false, mode='room', myColor=null, ticking, enginePending, serverGameId=null, serverVersion=0, pollTimer, clockSnapshot=null, serverGame=null, botThinking=false, puzzleSession=null, currentPlayerId=null, orientationSet=false, lastAnimatedVersion=0, lastDrawOffer=null, drawOfferTimer=null, drawOfferCountdownTimer=null, drawOfferKey=null, pollCount=0, currentBot=null, latencyMs=null, realtimeChannel=null, realtimeGameId=null, realtimeReady=false, realtimePingTimer=null, pingProbe=null, realtimeRefreshPromise=null, onlineMovePending=false, lastLocalRealtimeMove=null, provisional=null, relayConfirm=null, installPrompt=null, lastGameStartKey=null, lastGameOverKey=null, gameStartBannerTimer=null, localGameOverInfo=null, currentRightView='moves', analysisTimer=null, analysisScore=0, matchTimer=null, searching=false, localClockState=null, localGameOver=false, roomCreated=false, computerStarted=false, computerSideChoice='w', computerSide='w', botsLoaded=false, selectedComputerBotSlug=DEFAULT_LEVEL, toastTimer=null, chatUnread=0, lastChatMessageId=null, chatSessionStartedAt=Date.now(), lowTimeWarned=false, opponentWasConnected=null, rematchOfferPending=false;
// Phone layout state (see the Phone layout section).
let mobileMedia=null,mView='home',mTab='play',mLastGameKey=null,mReviewShown=false;
let navLast='play',navCurrent=null,navRestoring=false,navPending=false; // Back button history (see recordNav)
// Round 12 state (the functions are in the round 12 section below)
let studySession=null,exploreSession=null; // sessions read by boardContext() during the first render
let uiLang='en'; // the interface language; set from the saved choice in the language section below
let lessonSession=null; // a course lesson or a famous-game lesson on the board (src/lesson-player.js)
let resonance=null,resonanceLevel='off',resonanceRoom=null; // Resonance (src/resonance.js): the page background and the room
let soundBank=null,sfxPrefsCache=null,uiVoiceFn=null,musicResult=null,musicMood='even',r12PrefsCache=null,r12ToastQueue=[],r12ToastTimer=null,veteranState=null,vetCache=null,vetHoverTimer=null,veteranRefreshAt=0,veteranRefreshing=null,currentOath=null,oathLineKey='',atmoEl=null,atmoQueued=false,atmoEnd=null,atmosphereRealm=null,musicKeyOverride=null,musicPrefs=null,vantaScore=null,realmThemeSaved=null,bhSession=null,twinSession=null,ownClubInfo=null,engineSight=null;
let streakSession=null; // a puzzle run: {mode:'streak'|'survival',count,best,startedAt} (src/puzzle-modes.js)
let runTimer=0; // ticks the run clock while a run puzzle is on the board
let archiveSession=null,retrySession=null,storyTimer=null,lastLocalArchiveId=null; // Game Story (src/game-story.js)
let watchSession=null; // spectating a live game: {id,state,timer,channel,prevMode}
let liveGame=loadLive(),liveState=null,liveSeenAt=0,liveBeating=false,liveReturning=null; // your online game, wherever you are (src/live-game.js)
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
let matchSelection={seconds:600,increment:0,rated:false,variant:'standard'};
// The computer ladder: twelve levels from Beginner to Maximum (src/computer-levels.js).
const DEFAULT_COMPUTER_BOTS=COMPUTER_LEVELS.map(levelBot);
let computerBots=DEFAULT_COMPUTER_BOTS.map(bot=>({...bot}));
let moveEvalByPly=[],moveTimeByPly=[];
let reviewState={running:false,viewing:false,currentPly:0,signature:'',token:0,positions:[],moves:[],evaluations:[],results:[]};
let reviewPending=null;
// Engine workers start on first real use, so the first page load only downloads what the
// screen shows (the 1.8 MB engine waits until a bot move, analysis or review needs it).
const stockfish=lazyWorker('/stockfish.worker.js');
const analysisWorker=lazyWorker('/stockfish.worker.js');
const reviewWorker=lazyWorker('/stockfish.worker.js');
// Crazyhouse games are reviewed by the multi-variant engine (public/variant.worker.js).
const variantReviewWorker=lazyWorker(VARIANT_WORKER_URL);
// Lozza 2.5 plays the opponents src/engine-roster.js gives it (public/lozza.worker.js).
const lozzaEngine=lazyWorker(ENGINES.lozza.worker);
// Bot moves, live analysis and game review each own a separate Stockfish worker, so the
// bot and analysis never share one engine.
let engineRequestSeq=0,analysisRequest=null;
stockfish.onmessage=lozzaEngine.onmessage=({data})=>{
  if(!enginePending||data.requestId!==enginePending.id)return;
  if(data.type==='uci'&&String(data.line||'').startsWith('bestmove ')){const u=String(data.line).split(' ')[1];enginePending.resolve(u);enginePending=null}
  if(data.type==='unavailable'){enginePending.resolve(null);enginePending=null}
};
analysisWorker.onmessage=({data})=>{
  if(data.type==='unavailable'){const line=$('#line');if(line)line.textContent='Stockfish 19 unavailable in this browser.';return}
  if(!analysisRequest||data.requestId!==analysisRequest.id)return;
  if(data.type==='uci'&&String(data.line||'').startsWith('info '))updateAnalysisFromUci(String(data.line),analysisRequest);
};
reviewWorker.onmessage=variantReviewWorker.onmessage=({data})=>{
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
// The old worlds (Theme Studio's World: the music's key in a game, the world's theme in the menus).
// Each world is named for a game of strategy its people played (chess's ancestors and cousins), or for the land
// in its own people's words (owner, 2026-10-13: "be creative with the names... live with the lore"); the land it
// stands for comes after it. The stories behind the names: docs/music-check.md (Names).
const WORLD_KEY='vch.world',WORLD_NAMES={egypt:'Mehen',greece:'Petteia',rome:'Latrunculi',china:'Liubo',japan:'Heian',persia:'Chatrang',babylon:'Etemenanki',benin:'Igodomigodo'},
  WORLD_LANDS={egypt:'Ancient Egypt',greece:'Ancient Greece',rome:'Ancient Rome',china:'Ancient China',japan:'Old Japan',persia:'Ancient Persia',babylon:'Babylon',benin:'Kingdom of Benin'};
document.documentElement.dataset.pieceStyle='vanta';
function pieceAsset(name){return pieceAssetFor(normalizePieceStyle(document.documentElement.dataset.pieceStyle),name)}
// The images a piece set draws with (src/style.css): the 1x or 2x sheet, as the browser would
// pick, or the twelve drawings of an ink set.
function pieceStyleImages(style){
  const sharp=(window.devicePixelRatio||1)>=1.5,sheet=name=>`/assets/vch/pieces/${name}${sharp?'':'-1x'}.png`;
  if(style==='vanta')return [sheet('vanta-3d')];
  if(style==='regal')return [sheet('vanta-regal')];
  return ['w','b'].flatMap(c=>['k','q','r','b','n','p'].map(p=>`/assets/vch/pieces/vanta-2d/${c}${p}.svg`));
}
function preloadImages(urls){
  return Promise.all(urls.map(src=>new Promise(done=>{const img=new Image();img.onload=img.onerror=()=>done();img.src=src})));
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
const splash=splashPlan({standalone:isStandaloneDisplay(window),storage:window.localStorage});
app.innerHTML=`
${splashMarkup(splash)}
<div class="shell ${startsInGame?'game-active':'intro-active'}">
  <header class="topbar">
    <a class="brand vch-brand" href="#" aria-label="VCH home">
      <span class="vch-v vch-v-top" aria-hidden="true"></span>
      <img class="vch-wordmark vch-wordmark-top" src="/assets/vch/brand/vch-metal.svg" alt="VCH">
    </a>
    <nav class="main-nav" aria-label="Primary">
      <button class="active" data-nav="play"><span class="nav-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 18 17 6M8 5l2.4 2.4M5 8l2.4 2.4M14.5 14.5 19 19M16.5 16.5 19 14"/></svg></span>Play</button>
      <button data-nav="arena"><span class="nav-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8v5a4 4 0 0 1-8 0V4Z"/><path d="M8 6H5v2a4 4 0 0 0 4 4M16 6h3v2a4 4 0 0 1-4 4M12 13v5M8 21h8M9 18h6"/></svg></span>Arena</button>
      <button data-nav="watch"><span class="nav-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg></span>Watch</button>
      <button data-nav="friends"><span class="nav-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.2"/><path d="M3 19c.6-3.4 3-5.2 6-5.2s5.4 1.8 6 5.2"/><path d="M15.5 5.2a3 3 0 0 1 0 5.6M17.5 13.9c1.9.6 3.1 2.4 3.5 5.1"/></svg></span>Community</button>
      <button data-nav="puzzles"><span class="nav-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h6v4.2a2.8 2.8 0 1 0 4 0V4h6v6h-4.2a2.8 2.8 0 1 0 0 4H20v6h-6v-4.2a2.8 2.8 0 1 0-4 0V20H4v-6h4.2a2.8 2.8 0 1 0 0-4H4V4Z"/></svg></span>Puzzles</button>
      <button data-nav="learn"><span class="nav-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 5.5A3.5 3.5 0 0 1 7 2h4v18H7a3.5 3.5 0 0 0-3.5 3V5.5ZM20.5 5.5A3.5 3.5 0 0 0 17 2h-4v18h4a3.5 3.5 0 0 1 3.5 3V5.5Z"/></svg></span>Learn</button>
      <button data-nav="openings"><span class="nav-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3h3v3h2V3h3v3h2v4l-2 2v5H8v-5l-2-2V6h2V3ZM6 20h12M8 17h8"/></svg></span>Openings</button>
      <button data-nav="famous"><span class="nav-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3v18M12 8h4M12 12h4M12 16h3"/></svg></span>Famous Games</button>
      <button data-nav="review"><span class="nav-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="m8 12 2.8 2.8L16.8 9"/></svg></span>Review</button>
    </nav>
    <div class="header-actions">
      <button id="searchBtn" class="icon-btn search-btn" aria-label="Search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.7" cy="10.7" r="6.3"/><path d="m16 16 4.2 4.2"/></svg></button>
      <button id="settingsBtn" class="icon-btn settings-btn" type="button" aria-label="Settings"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.07 2.9 13.93 2.9 14.19 5.25 15.22 5.67 17.07 4.2 19.8 6.93 18.33 8.78 18.75 9.81 21.1 10.07 21.1 13.93 18.75 14.19 18.33 15.22 19.8 17.07 17.07 19.8 15.22 18.33 14.19 18.75 13.93 21.1 10.07 21.1 9.81 18.75 8.78 18.33 6.93 19.8 4.2 17.07 5.67 15.22 5.25 14.19 2.9 13.93 2.9 10.07 5.25 9.81 5.67 8.78 4.2 6.93 6.93 4.2 8.78 5.67 9.81 5.25Z"/><circle cx="12" cy="12" r="3.1"/></svg></button>
      <button id="installBtn" class="install-btn"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v11M8 10l4 4 4-4M5 18v2h14v-2"/></svg><span>Install App</span></button>
      <button id="notifyBtn" class="icon-btn bell-btn" type="button" aria-label="Notifications" aria-haspopup="true" aria-expanded="false" aria-controls="notifyMenu"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 5-2 6.5-3 8h18c-1-1.5-3-3-3-8M10 21h4"/></svg><i id="notifyCount" class="notify-count hidden" aria-hidden="true"></i></button>
      <button id="accountBtn" class="user" type="button" aria-label="Account" aria-haspopup="menu" aria-expanded="false" aria-controls="profileMenu">
        <i aria-hidden="true"></i><span>${guestName}</span><small>1200 rating</small>
        <svg class="account-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m8 10 4 4 4-4"/></svg>
      </button>
      <section id="notifyMenu" class="header-menu notify-menu" aria-label="Notifications" hidden>
        <header><b>Notifications</b><button id="closeNotifyMenu" class="menu-close" type="button" aria-label="Close notifications"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></header>
        <div id="notifyList"><p class="menu-empty">No notifications yet. Challenges and your-move alerts in daily games appear here.</p></div>
      </section>
      <section id="profileMenu" class="header-menu profile-menu" aria-label="Account menu" hidden>
        <header><span id="profileMenuAvatar" class="avatar light" aria-hidden="true">GU</span><div><b id="profileMenuName">${guestName}</b><small id="profileMenuRating">1200 rating</small></div><button id="closeProfileMenu" class="menu-close" type="button" aria-label="Close account menu"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></header>
        <nav class="profile-menu-items" aria-label="Account">
          <button id="profileMenuProfile" type="button">Profile</button>
          <button id="profileMenuInsights" type="button">Insights</button>
          <button id="profileMenuEdit" type="button">Edit profile</button>
          <button id="profileMenuSettings" type="button">Settings</button>
          <button id="profileMenuModeration" type="button" class="hidden">Moderation</button>
          <button id="profileMenuAuth" type="button">Sign in</button>
        </nav>
      </section>
    </div>
  </header>

  <section id="mainMenu" class="main-menu" aria-labelledby="mainMenuTitle" aria-hidden="${startsInGame?'true':'false'}">
    <div class="main-menu-tagline">Play <span>/</span> Improve <span>/</span> Belong</div>
    <div class="main-menu-hero">
      <div class="main-menu-copy">
        <span class="vch-v vch-v-chrome vch-v-menu" aria-hidden="true"></span>
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
    <button type="button" id="menuMoment" class="menu-moment hidden" aria-label="Vanta Moment of the Week"></button>
  </section>

  <main id="gameWorkspace" aria-hidden="${startsInGame?'false':'true'}">
    <aside class="lpanel panel">\n      <div class="hero">\n        <div class="hero-art" aria-hidden="true"><img src="/assets/vch/ui/hero-knight.webp" alt=""></div>\n        <label>LIVE CHESS</label>\n        <h1>Play your<br>next game.</h1>\n        <p>Guest play is instant. Rated games save your Elo and tournament record.</p>\n      </div>\n\n      <div class="modes" aria-label="Play mode">\n        <button data-mode="match"><span>Match</span></button>\n        <button data-mode="room" class="on"><span>Room</span></button>\n        <button data-mode="computer"><span>Computer</span></button>\n      </div>\n      <div class="oath-row" id="oathRow"><label><span>Swear an oath</span><select id="oathPick" aria-describedby="oathVow"><option value="">No oath</option></select></label><small id="oathVow" class="oath-vow">Optional. Keep it to earn honor and relics.</small></div>\n\n      <div class="mode-stage">\n        <section class="mode-view match-view" data-mode-view="match" aria-hidden="true">\n          <div class="mode-heading"><small class="mode-kicker">QUICK MATCH</small><h3>Find your next opponent.</h3><p>Choose a clock and queue for the closest available player.</p></div>\n          <div class="time-chips" aria-label="Match time control">\n            <button data-match-time="60-0">1+0</button><button data-match-time="180-0">3+0</button><button data-match-time="300-0">5+0</button><button class="on" data-match-time="600-0">10+0</button><button data-match-time="900-10">15+10</button>\n          </div>\n          <div class="match-variants" aria-label="Variant"><button class="on" data-match-variant="standard" title="Classic chess">Standard</button><button data-match-variant="dark" title="Fog of war: you only see what your pieces see. Own rating.">Vanta Dark</button><button data-match-variant="blackout" title="Every four of your moves, the lights go out for two. Own rating.">Blackout Blitz</button></div>
          <div class="rated-switch" aria-label="Match type"><button class="on" data-match-rated="false">Casual</button><button data-match-rated="true">Rated</button></div>\n          <button class="gold match-action" id="findOpponent"><span id="findOpponentLabel">Find opponent</span></button>\n          <div id="matchSearch" class="match-search hidden" aria-live="polite"><span class="search-pulse" aria-hidden="true"></span><div><b>Searching the pool</b><small>Expanding the Elo window while you wait.</small></div></div>\n          <div class="online-count"><b id="playersOnline">—</b> players online</div>\n        </section>\n\n        <section class="mode-view room-view active" data-mode-view="room" aria-hidden="false">\n          <div class="private-card"><div><h3>Create a private room</h3><p>Generate a shareable game link instantly.</p><small>Guests can join casual rooms without an account.</small></div></div>\n          <label class="tiny">GAME SETTINGS</label>\n          <div class="settings">\n            <label><span>Time control</span><select id="time"><option value="600">10+0 Rapid</option><option value="300">5+0 Blitz</option><option value="180">3+0 Blitz</option><option value="daily-1">Daily · 1 day per move</option><option value="daily-3">Daily · 3 days per move</option><option value="daily-7">Daily · 7 days per move</option></select></label>\n            <label><span>Room type</span><select id="level"><option value="casual">Casual — Guest OK</option><option value="rated">Rated — Account required</option></select></label>\n            <label class="variant-field"><span>Variant</span><select id="variant"><option value="standard">Standard</option><option value="freestyle">Freestyle · Chess960 (own rating)</option><option value="crazyhouse">Crazyhouse · drop what you capture (own rating)</option><option value="dark">Vanta Dark · fog of war (own rating)</option><option value="blackout">Blackout Blitz · the lights go out (own rating)</option><option value="bughouse">Bughouse · two against two on two boards</option><option value="twin">Twin Fates · a famous position, played twice</option></select></label>\n          </div>\n          <button class="gold" id="create"><span>Create room & get link</span></button>\n          <div class="divider">or join an existing room</div>\n          <div class="join"><input id="roomInput" placeholder="Enter room code" maxlength="12"><button id="join">Join room</button></div>\n          <div class="room room-created hidden"><small>ROOM CODE</small><strong>${room}</strong><em>Ready</em><p>Share this link</p><div><input id="share" readonly value="${location.origin+location.pathname}?game=${room}"><button id="copy" aria-label="Copy room link">Copy</button></div><small class="room-note">Keep this tab open. Your opponent can enter from any modern browser.</small></div>\n        </section>\n\n        <section class="mode-view computer-view" data-mode-view="computer" aria-hidden="true">\n          <div class="mode-heading"><small class="mode-kicker">PLAY THE COMPUTER</small><h3>Choose your opponent.</h3><p>Twelve levels, from Beginner to Maximum. Each one plays the way players at that level do.</p></div>\n          <p class="special-opponent hidden" id="specialOpponent" role="status"></p>\n          <div id="botGrid" class="bot-grid" aria-label="Computer opponents"></div>\n          <div class="computer-side" aria-label="Play as"><button class="on" data-computer-side="w">White</button><button data-computer-side="b">Black</button><button data-computer-side="random">Random</button></div>\n          <div class="computer-side computer-coach" aria-label="Coach"><button data-coach="off" class="on">Coach off</button><button data-coach="on">Coach on</button></div>\n          <div class="computer-side computer-variant" aria-label="Variant"><button class="on" data-computer-variant="standard">Standard</button><button data-computer-variant="freestyle">Freestyle 960</button><button data-computer-variant="dark">Vanta Dark</button><button data-computer-variant="blackout">Blackout Blitz</button></div>\n          <p class="computer-variant-note hidden" id="computerVariantNote"></p>\n          <button class="gold computer-start" id="computerStart"><span>Start game</span></button>\n          <div class="computer-extras"><button type="button" class="computer-shadow"><b>Your Shadow</b><small>A bot built from your own games</small></button><button type="button" class="computer-gauntlet"><b>The Vanta Gauntlet</b><small>Seven bots, three lives</small></button><button type="button" class="computer-campaign"><b>The Vanta Campaign</b><small>Five realms, five bosses</small></button></div>\n          <p class="computer-note">The board resets when you start. Choose Black and the engine moves first.</p>\n        </section>\n      </div>\n    </aside>\n    <section class="game">
      <div class="m-gamebar"><button id="mBack" type="button" aria-label="Back"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 8 12l7 7"/></svg></button><div><b id="mGameTitle">Game</b><small id="mGameSub"></small></div></div>
      <div class="player top" data-player-bar="opponent">
        <span class="avatar" id="topAvatar">OP</span>
        <div class="player-info">
          <div class="player-name-row"><b id="topPlayerName">Waiting for opponent</b><span class="player-flag hidden" id="topFlag" aria-hidden="true"></span><span class="player-crest hidden" id="topCrest"></span></div>
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
      <div id="firstMoveCard" class="draw-offer-card first-move-card hidden" role="status" aria-live="polite"><div><b id="firstMoveTitle">Your first move</b><small id="firstMoveText">The clocks start after both first moves.</small></div><strong id="firstMoveCount">30</strong></div>
      <div id="abandonCard" class="draw-offer-card abandon-card hidden" role="status" aria-live="polite">
        <div><b>Your opponent left</b><small id="abandonText">You can claim the win in 30s if they don't come back</small></div>
        <div><button id="abandonDraw" type="button" class="hidden">Call it a draw</button><button id="abandonClaim" type="button" class="hidden">Claim win</button></div>
      </div>
      <div id="takebackCard" class="draw-offer-card takeback-card hidden" role="status" aria-live="polite">
        <div><b>Takeback request</b><small>Your opponent wants to take back their last move</small></div>
        <div><button id="declineTakeback" type="button">Decline</button><button id="acceptTakeback" type="button">Accept</button></div>
      </div>
      <div id="coachCard" class="draw-offer-card coach-card hidden" role="status" aria-live="polite"></div>
      <div id="planCard" class="draw-offer-card plan-card hidden" role="region" aria-label="Conditional moves"></div>
      <div id="berserkCard" class="draw-offer-card berserk-card hidden" role="status" aria-live="polite">
        <div><b>Berserk ready</b><small>Half your clock. Rating change ×1.25, win or lose. Before your first move only.</small></div>
        <div><button id="goBerserk" type="button">Go Berserk</button></div>
      </div>
      <div class="player bottom" data-player-bar="local">
        <span class="avatar light" id="bottomAvatar">GU</span>
        <div class="player-info">
          <div class="player-name-row"><b id="bottomPlayerName">You · ${guestName}</b><span class="player-flag hidden" id="bottomFlag" aria-hidden="true"></span><span class="player-crest hidden" id="bottomCrest"></span></div>
          <div class="player-meta"><span class="player-rating" id="bottomRating">1200</span><span class="player-presence" id="bottomPresence"><i class="live-dot" aria-hidden="true"></i><span>LOCAL</span></span><span class="captured-tray" id="bottomCaptured" aria-label="Pieces captured"></span></div>
          <div class="oath-line hidden" id="oathLine" aria-live="polite"></div>
        </div>
        <div class="player-connection hidden" id="bottomConnection" aria-label="Network latency">
          <span class="ping-bars" id="bottomPingBars" aria-hidden="true"><i></i><i></i><i></i></span><span id="bottomPing">-- ms</span>
        </div>
        <time id="bottomClock" data-color="w">10:00</time>
      </div>
      <div class="twin-line hidden" id="twinLine" aria-live="polite"></div>\n      <div class="bh-partner hidden" id="bhPartner" aria-label="Your partner's board"></div>\n      <div class="tools"><button id="flip"><svg class="tool-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h13l-3.5-3.5M20 16H7l3.5 3.5"/></svg><span>Flip board</span></button><button id="sound"><svg class="tool-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path class="sound-wave" d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg><span>Sound on</span></button><button id="theme"><svg class="tool-ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="1.5"/><path d="M4 12h16M12 4v16"/><path class="fill" d="M4 4h8v8H4zM12 12h8v8h-8z"/></svg><span>Board theme</span></button><button id="resign" class="danger"><svg class="tool-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 21V4M6 4.5h11l-2.5 4 2.5 4H6"/></svg><span>Resign</span></button><details class="game-more"><summary aria-label="More game actions"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg></summary><div class="game-more-menu"><button id="hint" type="button" class="hidden">Hint</button><button id="takeback" type="button" class="hidden">Ask to take back</button><button id="draw" type="button">Offer draw</button><button id="openChat" type="button">Chat <span id="chatUnread" class="chat-unread hidden" aria-label="Unread messages">0</span></button><button id="musicToggle" type="button" aria-pressed="false">Music: off</button></div></details></div>
      <div class="m-movebar"><button type="button" data-browse="prev" aria-label="Previous move"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg></button><div id="mMoves" class="m-moves" aria-label="Moves"></div><button type="button" data-browse="next" aria-label="Next move"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></button></div>
      <div class="m-actions" aria-label="Game actions"><button type="button" data-m-action="options"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg><span>Options</span></button><button type="button" data-m-action="draw"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M12 5v14" transform="rotate(45 12 12)"/></svg><span>Draw</span></button><button type="button" data-m-action="takeback" class="hidden"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7 4 12l5 5M4 12h11a5 5 0 0 1 0 10h-3"/></svg><span>Takeback</span></button><button type="button" data-m-action="leave" class="hidden"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg><span>Stop watching</span></button><button type="button" data-m-action="puzzle-next" class="hidden"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h12M13 6l6 6-6 6"/></svg><span>Next</span></button><button type="button" data-m-action="puzzle-menu" class="hidden"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h10"/></svg><span>Puzzles</span></button><button type="button" data-m-action="puzzle-streak" class="hidden"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-4 2.5-5 .3 2 1.5 3 2.5 3 0-3-1-5 0-8Z"/></svg><span>Streak</span></button><button type="button" data-m-action="puzzle-skip" class="hidden"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h12M13 6l6 6-6 6"/></svg><span>Skip once</span></button><button type="button" data-m-action="puzzle-end" class="hidden"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg><span>End streak</span></button><button type="button" data-m-action="resign"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 21V4M6 4h11l-2.5 4L17 12H6"/></svg><span>Resign</span></button><button type="button" data-m-action="chat"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4V5Z"/></svg><span>Chat</span></button><button type="button" data-m-action="undo" class="hidden"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7 4 12l5 5"/><path d="M4 12h10a6 6 0 0 1 0 12h-2" transform="translate(0 -6)"/></svg><span>Undo</span></button><button type="button" data-m-action="hint" class="hidden"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3Z"/></svg><span>Hint</span></button><button type="button" data-m-action="review" class="hidden"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="m8 12 2.8 2.8L16.8 9"/></svg><span>Review</span></button><button type="button" data-m-action="rematch" class="hidden"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18 3v4h-4M6 21v-4h4"/></svg><span>Rematch</span></button><button type="button" data-m-action="new" class="hidden"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg><span>New game</span></button></div>
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
          <form id="typeMoveForm" class="type-move" autocomplete="off"><label for="typeMove">Type a move</label><input id="typeMove" maxlength="12" spellcheck="false" autocapitalize="off" autocorrect="off" enterkeyhint="go" placeholder="Nf3, e4, O-O…" aria-describedby="typeMoveHelp"><button>Move</button><small id="typeMoveHelp">Press / to type a move. Moves are read out to screen readers.</small></form>
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
  <button id="returnGame" class="return-game hidden" type="button"><b class="rg-turn hidden">Your move</b><span>Back to your game</span></button>
  <nav class="m-tabs" aria-label="Sections"><button type="button" data-m-tab="play"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 18 17 6M8 5l2.4 2.4M5 8l2.4 2.4M14.5 14.5 19 19M16.5 16.5 19 14"/></svg><span>Play</span></button><button type="button" data-m-tab="puzzles"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h6v4.2a2.8 2.8 0 1 0 4 0V4h6v6h-4.2a2.8 2.8 0 1 0 0 4H20v6h-6v-4.2a2.8 2.8 0 1 0-4 0V20H4v-6h4.2a2.8 2.8 0 1 0 0-4H4V4Z"/></svg><span>Puzzles</span></button><button type="button" data-m-tab="learn"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 5.5A3.5 3.5 0 0 1 7 2h4v18H7a3.5 3.5 0 0 0-3.5 3V5.5ZM20.5 5.5A3.5 3.5 0 0 0 17 2h-4v18h4a3.5 3.5 0 0 1 3.5 3V5.5Z"/></svg><span>Learn</span></button><button type="button" data-m-tab="watch"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg><span>Watch</span></button><button type="button" data-m-tab="more"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg><span>More</span></button></nav>
  <div id="mSheet" class="m-sheet" hidden><div class="m-sheet-backdrop" data-m-close></div><section class="m-sheet-card" role="dialog" aria-modal="true" aria-labelledby="mSheetTitle"><header><b id="mSheetTitle">More</b><button type="button" data-m-close aria-label="Close"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></header><div id="mSheetItems" class="m-sheet-items"></div></section></div>
</div>

<div id="toast"></div>
<div id="simulBar" class="simul-bar hidden" role="status"><span id="simulBarText">Simul</span><button id="simulNext" type="button">Next board</button><button id="simulAll" type="button">All boards</button></div>
<div id="a11yLive" class="sr-only" aria-live="polite" aria-atomic="true" data-no-i18n></div>

<aside id="chatDrawer" class="chat-drawer" aria-hidden="true">
  <header><div><small>PLAYER CHAT</small><h3>Game conversation</h3></div><button id="closeChat" aria-label="Close chat">×</button></header>
  <div id="messages"></div>
  <div id="chatTray" class="chat-tray hidden" role="dialog" aria-label="Emoji and reactions"><div class="chat-tray-tabs" role="tablist"><button type="button" data-tray="reactions" class="on" role="tab">Reactions</button><button type="button" data-tray="emoji" role="tab">Emoji</button></div><div class="chat-tray-body"></div></div>
  <form id="chat"><button type="button" id="chatTrayBtn" class="chat-tray-btn" aria-label="Emoji and reactions" aria-expanded="false"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8.5 14.5c1 1.4 2.2 2 3.5 2s2.5-.6 3.5-2"/><circle cx="9" cy="10" r="1.1"/><circle cx="15" cy="10" r="1.1"/></svg></button><input id="message" maxlength="160" placeholder="Send a friendly message…"><button class="chat-send">Send</button></form>
</aside>

<dialog id="promotion"><h2>Promote pawn</h2><div><button data-piece="q">♕</button><button data-piece="r">♖</button><button data-piece="b">♗</button><button data-piece="n">♘</button></div></dialog>
<dialog id="themeStudio" class="settings-dialog" aria-labelledby="settingsTitle"><header class="settings-head"><h2 id="settingsTitle" tabindex="-1" autofocus>Settings</h2><button id="closeThemeTop" type="button" class="settings-top-done">Done</button></header><div class="settings-body"><section class="settings-group" aria-labelledby="setBoardTitle"><h3 id="setBoardTitle">Board &amp; pieces</h3><label>Piece style <select id="pieceStyle">${pieceStyleOptions()}</select></label><label>Board set <select id="boardSet"></select></label><small id="boardSetNote" class="board-set-note"></small><label>Piece expressions <select id="expressionsSetting"><option value="full">Full</option><option value="subtle">Subtle</option><option value="off">Off</option></select></label><label>Veteran marks <select id="veteranSetting"><option value="on">On</option><option value="off">Off</option></select></label><details id="ownColours" class="settings-colours"><summary>Your own colours</summary><label>Light squares <input data-theme="--light" type="color" value="#d9cfb2"></label><label>Dark squares <input data-theme="--dark" type="color" value="#29463b"></label><label>Accent <input data-theme="--mint" type="color" value="#82edba"></label><label>Gold <input data-theme="--gold" type="color" value="#e5c17c"></label><label>Ivory piece tint <input id="whitePiece" type="color" value="#f0d9a4"></label><label>Black piece tint <input id="blackPiece" type="color" value="#342019"></label><label>Piece tint strength <input id="pieceTint" type="range" min="0" max="70" value="18"></label></details><button id="openRelics" type="button" class="theme-relics">Relic sets</button></section><section class="settings-group" aria-labelledby="setSoundTitle"><h3 id="setSoundTitle">Sound &amp; music</h3><label>Music <select id="musicSetting"><option value="off">Off</option>${STATIONS.map(x=>`<option value="${x.id}">${x.name}</option>`).join('')}</select></label><small id="musicNow" class="music-now" aria-live="polite"></small><label>Music volume <input id="musicVolume" type="range" min="0" max="100" value="50"></label><label>World <select id="worldSetting"><option value="">Vanta Chess</option>${WORLDS.map(w=>`<option value="${w}">${WORLD_NAMES[w]} · ${WORLD_LANDS[w]}</option>`).join('')}</select></label><label>Now playing <select id="nowPlayingSetting"><option value="bl">Bottom left</option><option value="br">Bottom right</option><option value="tr">Top right</option><option value="off">Off</option></select></label><label class="check-row">Read moves aloud <input id="speakMoves" type="checkbox"></label><label>Piece sounds <select id="pieceSoundSetting">${pieceSoundOptions()}</select></label><label class="check-row">Interface sounds <input id="uiSoundSetting" type="checkbox" checked></label><div class="settings-links"><button id="openMusicList" type="button" class="theme-relics">Music list</button><button id="openSoundTest" type="button" class="theme-relics">Sound test</button></div></section><section class="settings-group" aria-labelledby="setLookTitle"><h3 id="setLookTitle">Look &amp; motion</h3><label>Wallpaper <select id="wallpaper"><option value="classic">Midnight Emerald</option><option value="cobalt">Midnight Cobalt</option><option value="burgundy">Burgundy Brass</option><option value="ivory">Ivory Noir</option></select></label><label>Living atmosphere <select id="atmosphereSetting"><option value="full">Full</option><option value="subtle">Subtle</option><option value="off">Off</option></select></label><label>Resonance background <select id="resonanceSetting"><option value="off">Off</option><option value="on">On</option></select></label><label>Glass opacity <input data-theme="--glass" type="range" min="15" max="100" value="94"></label><label>Motion <input data-theme="--motion" type="range" min="0" max="100" value="100"></label><button id="openResonance" type="button" class="theme-relics">Resonance room</button></section><section class="settings-group" aria-labelledby="setLanguageTitle"><h3 id="setLanguageTitle">Language</h3><label>Language <select id="languageSelect">${Object.entries(LANGUAGES).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label></section></div><button id="closeTheme" class="gold theme-done">Done</button></dialog>


<dialog id="accountDialog" class="account-dialog">
  <form method="dialog"><button class="account-close" aria-label="Close">×</button></form>
  <div class="account-head"><span class="vch-lockup"><span class="vch-v" aria-hidden="true"></span><img class="account-wordmark" src="/assets/vch/brand/vch-metal.svg" alt="VCH"></span><h2>Save your rating and record</h2><p>Guest games stay instant. Sign in only when you want rated play, tournaments, and a persistent profile.</p></div>
  <div id="accountGuest">
    <div class="auth-tabs"><button type="button" class="on" data-auth="signin">Sign in</button><button type="button" data-auth="signup">Create account</button></div>
    <label id="usernameField" class="hidden">Username<input id="authUsername" autocomplete="username" maxlength="20" placeholder="3–20 letters, numbers or _"></label>
    <label>Email<input id="authEmail" type="email" autocomplete="email" placeholder="you@example.com"></label>
    <label>Password<input id="authPassword" type="password" autocomplete="current-password" minlength="6" placeholder="••••••••"></label>
    <button id="authSubmit" class="primary-action" type="button">Sign in</button>
    <button id="forgotPassword" class="link-action" type="button">Forgot password?</button>
    <p id="authMessage" class="auth-message"></p>
  </div>
  <div id="accountSigned" class="hidden">
    <div class="profile-card"><span class="avatar light">VC</span><div><b id="profileName">Player</b><small id="profileRating">1200 rapid</small></div></div>
    <div class="rating-grid"><div><small>Bullet</small><b id="ratingBullet">1200</b></div><div><small>Blitz</small><b id="ratingBlitz">1200</b></div><div><small>Rapid</small><b id="ratingRapid">1200</b></div><div><small>Classical</small><b id="ratingClassical">1200</b></div><div><small>Daily</small><b id="ratingDaily">1200</b></div><div><small>Puzzles</small><b id="ratingPuzzle">1200</b></div></div>
    <p id="accountNotice" class="account-notice hidden" role="status"></p>
    <p id="berserkStatus" class="berserk-status"></p>
    <h4 class="achievement-title">Achievements <small id="achievementCount"></small></h4>
    <div id="achievementGrid" class="achievement-grid"></div>
    <button id="viewMyProfile" class="secondary-action" type="button">View my public profile</button>
    <details class="account-settings"><summary>Account settings</summary><div><button id="changePassword" type="button">Change password</button><button id="exportData" type="button">Download my data</button><button id="deleteAccount" type="button" class="danger">Delete account</button></div></details>
    <button id="signOutBtn" class="secondary-action" type="button">Sign out</button>
  </div>
</dialog>

<dialog id="searchDialog" class="search-dialog"><form method="dialog"><button class="close-search">×</button></form><div class="search-title"><span class="vch-v" aria-hidden="true"></span><img class="search-wordmark" src="/assets/vch/brand/vch-metal.svg" alt="VCH"><h2>Search</h2></div><input id="searchInput" autocomplete="off" placeholder="Search openings, lessons, famous games…"><div id="searchResults"></div></dialog>
`

dismissSplash($('#brandSplash'),splash);

let clocks=initialClocks(timeChoice($('#time').value).seconds);
// Board rendering (backlog V1-fix), chessground-style: the squares grid is built once (again
// only when the board flips) and updated in place; pieces live in ONE absolutely positioned
// layer above it (src/piece-layer.js), arrows in an SVG layer above that, and a dragged piece
// in a fixed drag layer on top. renderBoard() is cheap and synchronous, so a move's highlight
// and its slide (a Web Animations API transform animation) start in the same frame as the
// move. Everything else (status text, move list, clocks, sound, analysis, engine, game-over
// check) waits until the slide has landed and at least two frames have been painted
// (afterBoardPaint); the online move request waits two frames (nextFrames).
let boardDom=null,boardShapes=[],shapeDraft=null,lastBoardPlacement='',lastMoveCache={fen:'',move:null},statusScheduled=false,zhDropSelected=null,analysis=null,egSession=null,prepSession=null,todayPlan=null,repertoire=null,repEdit=null,repColor='w',announceScheduled=false,announceState={key:"",count:0},lastAnnouncedSeconds=null;
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
    // Coordinates sit inside the edge squares, each in the other square colour so it reads.
    // The bottom-left square is dark and the top-left light whichever way the board faces.
    if(rankCoords)[...rankCoords.children].forEach((el,i)=>el.className=i%2?'on-dark':'on-light');
    if(fileCoords)fileCoords.innerHTML=(flipped?['h','g','f','e','d','c','b','a']:['a','b','c','d','e','f','g','h']).map((value,i)=>`<span class="${i%2?'on-light':'on-dark'}">${value}</span>`).join('');
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
  if(lessonSession&&mode==='lesson')return lessonAwaitsMove()?game.turn():'';
  if(retrySession||freeBoard())return game.turn();
  if(studySession)return ''; // reading a study
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
  if(typeof darkActive==='function'&&(darkActive()||computerRules==='blackout'&&computerLive()||fogOnline()))return 'off'; // moods would give hidden pieces away
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
// Captured-pieces trays: each player bar keeps the pieces that player has taken, biggest first,
// each kind in its own place, with the material lead (+N) for the side ahead. Alive (owner,
// 2026-10-13, src/capture-tray.js): a captured piece is knocked off its square as the capturing
// piece lands and flies to its place, where it settles; the lead counts up; pieces taken back
// leave. A jump (a loaded game, many plies at once) pops pieces in without flights. In Vanta Dark
// and Blackout the hidden opponent's captures (and any you step back to) arrive without a flight,
// so no square is given away.
const trayMemory={frame:'',counts:{},lead:{},pockets:{}};
function trayFlightsHidden(){
  const color=premovePlayerColor(),mine=!color||game.turn()!==color;
  return (darkActive()||fogOnline()||blackoutActive())&&(!mine||!!browse||reviewState.viewing);
}
// A piece flies between two boxes of the window (measured when it sets off, after `delay` ms):
// a picture of it is tossed in an arc and lands at the size of the box it flies to.
function pieceFlight(fromBox,toBox,key,style,{delay=0,spin=null}={}){
  return new Promise(resolve=>setTimeout(()=>{
    const from=fromBox(),to=toBox();
    if(!from?.width||!to?.width||!document.body.animate)return resolve(false);
    const fly=document.createElement('img');fly.className='capture-flight';fly.src=pieceAssetFor(style,key);fly.alt='';fly.setAttribute('aria-hidden','true');
    fly.style.width=`${from.width}px`;fly.style.height=`${from.height}px`;document.body.append(fly);
    const dx=to.left+to.width/2-from.left-from.width/2,dy=to.top+to.height/2-from.top-from.height/2;
    const flight=fly.animate(flightKeyframes(from,to,{spin:spin??(dx<0?-1:1)}),{duration:flightMs(Math.hypot(dx,dy),motionScale()),easing:'cubic-bezier(.3,.62,.34,1)',fill:'forwards'});
    flight.finished.then(()=>{fly.remove();resolve(true)},()=>{fly.remove();resolve(false)});
  },delay));
}
// The capture in a tray: hidden in its place until the piece, knocked off `sq`, lands there
// (then `landed()` runs: the lead counts up as it lands).
function flyIntoPlace(target,sq,key,style,landed=null){
  target.classList.add('arriving');
  const reveal=ok=>{target.classList.remove('arriving');if(ok&&target.isConnected)settle(target);landed?.()};
  pieceFlight(()=>document.querySelector(`#board .square[data-sq="${sq}"]`)?.getBoundingClientRect(),()=>target.isConnected?target.getBoundingClientRect():null,key,style,{delay:Math.max(0,boardMotionUntil-performance.now())}).then(reveal);
}
// The material lead on a tray (+N): it counts up with a pop.
function drawLead(tray,lead,animate){
  let badge=tray.querySelector('.tray-lead');
  if(!lead){badge?.remove();return}
  if(!badge){badge=document.createElement('b');badge.className='tray-lead';tray.append(badge)}
  const text=`+${lead}`;if(badge.textContent!==text){badge.textContent=text;if(animate)bump(badge)}
  badge.classList.toggle('big',lead>=3);
}
// Puts a tray's pieces right: adds and removes only what changed. Returns the pictures added.
function drawTray(tray,color,counts,style,animate){
  const enemy=color==='w'?'b':'w',added=[];
  for(const type of TRAY_KINDS){
    const n=counts[type]||0;let group=tray.querySelector(`.tray-group[data-type="${type}"]`);
    if(!n&&!group)continue;
    if(!group){
      group=document.createElement('span');group.className='tray-group';group.dataset.type=type;
      const later=[...tray.children].find(el=>el.classList.contains('tray-lead')||TRAY_KINDS.indexOf(el.dataset.type)>TRAY_KINDS.indexOf(type));
      tray.insertBefore(group,later||null);
    }
    const imgs=[...group.querySelectorAll('img:not(.leaving)')];
    for(let i=imgs.length;i<n;i++){const img=document.createElement('img');img.src=pieceAssetFor(style,enemy+type);img.alt='';group.append(img);added.push({type,img})}
    for(let i=n;i<imgs.length;i++){if(animate){imgs[i].classList.add('leaving');leave(imgs[i])}else imgs[i].remove()}
    if(!n){if(animate)setTimeout(()=>{if(!group.querySelector('img:not(.leaving)'))group.remove()},260);else group.remove()}
  }
  return added;
}
function syncCapturedTrays(boardGame,placement){
  const style=document.documentElement.dataset.pieceStyle||'vanta',bars=playerBarClockColors();
  if(isZhGame()&&!reviewState.viewing&&!browse)return drawPockets(style,bars);
  const frame=`${style}|${bars.top}`,key=`${placement}|${frame}`;if(syncCapturedTrays.key===key)return;syncCapturedTrays.key=key;
  // A new piece style, the board turned round, or the trays were pockets: drawn afresh, still.
  const trays=[['#topCaptured',bars.top],['#bottomCaptured',bars.bottom]].map(([id,color])=>[$(id),color]).filter(([tray])=>tray);
  const fresh=trayMemory.frame!==frame||trays.some(([tray])=>tray.classList.contains('zh-pocket'));trayMemory.frame=frame;
  const caps=capturedPieces(boardGame.board()),animate=!fresh&&motionScale()>0,move=boardLastMove();
  const plans=trays.map(([tray,color])=>{const counts=countKinds(caps[color]);return {tray,color,counts,change:trayChange(fresh?{}:trayMemory.counts[color]||{},counts)}});
  // One new piece, taken by the last move: it flies there from its square. Anything else pops in.
  const sq=animate&&plans.reduce((n,p)=>n+p.change.added.length,0)===1&&isCapture(move)&&!trayFlightsHidden()?captureSquare(move):null;
  const flyer=sq?plans.find(p=>p.change.added.length===1&&(!move.color||move.color===p.color)&&(!move.captured||move.captured===p.change.added[0])):null;
  for(const p of plans){
    const {tray,color,counts}=p;
    if(fresh){tray.classList.remove('zh-pocket');tray.replaceChildren()}
    const added=drawTray(tray,color,counts,style,animate);
    trayMemory.counts[color]=counts;trayMemory.lead[color]=caps.lead[color];
    if(p===flyer)flyIntoPlace(added[0].img,sq,(color==='w'?'b':'w')+added[0].type,style,()=>drawLead(tray,trayMemory.lead[color],true));
    else{drawLead(tray,caps.lead[color],animate);if(animate)added.forEach((a,i)=>popIn(a.img,i*60))}
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
  document.body.classList.toggle('puzzle-mode',mode==='puzzle'&&!!puzzleSession);
  document.body.classList.toggle('puzzle-board',mode==='puzzle'); // no Resign or clocks, solved or not
  dom.board.classList.toggle('blackout',!reviewFen&&!browseFen&&(blackoutActive()||onlineBlind()));
  if(placement!==lastBoardPlacement){if(lastBoardPlacement)boardShapes=[];lastBoardPlacement=placement} // a move clears arrows and marks
  const legal=new Set(reviewState.viewing||browse?[]:zhDropSelected?zhDropTargets(zhDropSelected):!selected?[]:fogOnline()?(Array.isArray(serverGame.legal)?serverGame.legal.filter(m=>m.startsWith(selected)).map(m=>m.slice(2,4)):[]):game.moves({square:selected,verbose:true}).map(m=>m.to));
  const lastMove=boardLastMove(),fullPosition=positionMap(boardGame.board());
  const darkOnline=boardGame===game&&onlineDark();
  const checkerSquares=darkOnline?new Set(serverGame.fog?.checkers||[]):boardGame===game&&darkActive()?new Set(darkCheckers(game,computerSide)):null; // revealed and marked in the dark
  const sight=darkOnline?new Set(serverGame.fog?.seen||[]):checkerSquares?visibleSquares(game.fen(),computerSide,{reveal:[...checkerSquares]}):null;
  const position=sight&&!darkOnline?fogPosition(fullPosition,sight,computerSide):fullPosition; // online, the server already left the hidden pieces out
  dom.board.classList.toggle('vanta-dark',!!sight);
  let checked=null;
  if(boardGame.inCheck())for(const [sq,key] of position)if(key===boardGame.turn()+'k')checked=sq;
  const mated=!reviewState.viewing&&checked&&(isZhGame()&&boardGame===game?zhGameStatus().over:boardGame.isCheckmate());
  const marks=new Map(boardShapes.filter(shape=>!shape.to||shape.to===shape.from).map(shape=>[shape.from,shape.brush]));
  const dragOver=pointerDrag?.started?pointerDrag.over:null;
  for(const [sq,el] of dom.squares){
    const key=position.get(sq),mark=marks.get(sq),fogged=sight&&!sight.has(sq);
    const cls=`square ${el.dataset.shade}${key?' occupied':''}${fogged?' fog':''}${lastMove&&!fogged&&(lastMove.from===sq||lastMove.to===sq)?' last-move':''}${selected===sq?' selected':''}${premoves.selected===sq?' premove-selecting':''}${premoves.moves.some(m=>m.from===sq||m.to===sq)?' premove':''}${legal.has(sq)?' legal':''}${checked===sq?' check':''}${checkerSquares?.has(sq)?' checker':''}${mated&&checked===sq?' mated-king':''}${dragOver===sq?' drag-over':''}${reactions.hoverSquare===sq?' hover-piece':''}${reactions.hintSquare===sq&&legal.has(sq)?' hint-hover':''}${mark?` shape-mark shape-mark-${mark}`:''}`;
    if(el.className!==cls)el.className=cls;
    const label=sq+(key?` ${key[0]==='w'?'white':'black'} ${pieceNames[key[1]]}`:' empty');
    const spoken=uiLang==='en'?label:(translateText(label,uiLang)||label); // re-set every render, so translate here
    if(el.getAttribute('aria-label')!==spoken)el.setAttribute('aria-label',spoken);
  }
  const motion=dom.pieces.sync(position,{flipped,animate:!instant,duration:(from,to)=>moveDurationMs(from,to,scale),hint});
  syncVeteranMarks(dom,boardGame);queueAtmosphere();
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
    if(badgeKey&&boardReview.classification==='brilliant'&&reviewState.viewing)cue('brilliant','success'); // stepping onto a brilliant move
  }
  renderArrows(dom);
  dom.board.classList.toggle('mate',game.isCheckmate());
}
// What the board is showing when it isn't a live game, for the card beside it (sweep fix: a
// puzzle used to read "Live Game · Real time · Casual game"). null means a live game.
function boardContext(){
  if(lessonSession&&mode==='lesson')return lessonSession.kind==='famous'?{kicker:'Famous game',line:lessonSession.lesson.title}:{kicker:'Lesson',line:lessonSession.lesson.title};
  if(watchSession)return {kicker:'Watching',line:'Live game · Spectating'};
  if(archiveSession)return {kicker:'Game review',line:'A finished game'};
  if(mode==='puzzle'){
    const kind=puzzleSession?.kind==='battle'?'Puzzle Battle':streakSession?(streakSession.mode==='survival'?'Puzzle Survival':'Puzzle Streak'):puzzleSession?.daily?'Daily puzzle':'Puzzle';
    return {kicker:kind,line:puzzleSession?'Find the best move':'Puzzle complete'};
  }
  if(egSession||mode==='endgame')return {kicker:'Endgame drill',line:'Practice position'};
  if(studySession)return {kicker:'Study',line:'Analysis board'};
  if(exploreSession)return {kicker:'Explorer',line:'Opening explorer'};
  if(mode==='computer'&&currentBot)return {kicker:'Computer game',line:`vs ${currentBot.display_name||currentBot.name||'Computer'}`};
  return null;
}
function renderStatus(){
  if(localGameOver){
    $('#turn').textContent=localGameOverInfo?.reason==='on time'?'Game over · Time expired':'Game over · Resignation';
    $('#state').textContent='Computer game finished';
  }else if(serverGameId&&serverGame&&!['active','playing','in_progress','waiting'].includes(serverGame.status)){
    $('#turn').textContent=`Game over · ${normalizedEndReason(serverGame.end_reason)||serverGame.result||serverGame.status}`;
    $('#state').textContent='Authoritative server result';
  }else{
    $('#turn').textContent=boardOver()?endText():`${game.turn()==='w'?'White':'Black'} to move`;
    const ctx=boardContext();
    $('#state').textContent=ctx?(game.inCheck()?`Check · ${ctx.line}`:ctx.line):game.inCheck()?'Check · Real time':'Real time  •  Casual game';
  }
  const kicker=$('.live-card-copy small'),kick=localGameOver||!boardContext()?'●   Live Game':`●   ${boardContext().kicker}`;
  if(kicker&&kicker.textContent!==kick)kicker.textContent=kick;
  document.body.dataset.seat=myColor||'';
  document.body.dataset.botGame=serverGame?.bot_player_id?'true':'false';
  const reviewButton=$('#reviewGame');if(reviewButton)reviewButton.classList.toggle('hidden',!isGameFinishedForReview()||!currentHistory().length);
  renderReviewBoardDecorations();syncClockBars();
  updateOpeningLabel();scheduleAnalysis();syncGameEndPanel();void maybeShowGameOver();syncMobileShell();
}
// The board updates now; status text, review decorations, opening name, analysis and the
// game-over check follow once the frame with the board change has been painted.
function render(options){
  renderBoard(options);
  if(!statusScheduled){statusScheduled=true;afterBoardPaint(()=>{statusScheduled=false;renderStatus()})}
  if(!announceScheduled){announceScheduled=true;afterBoardPaint(()=>{announceScheduled=false;announceLatestMove();if(analysis){const key=JSON.stringify([analysis.sans,boardShapes]);if(key!==analysis.sentKey){analysis.seq++;analysisSend()}}})}
}
function endText(){if(isZhGame()){const st=zhGameStatus();if(st.over)return st.result==='1/2-1/2'?'Draw · Stalemate':`Checkmate · ${st.result==='1-0'?'White':'Black'} wins`}if(game.isCheckmate())return `Checkmate · ${game.turn()==='w'?'Black':'White'} wins`;if(game.isStalemate())return 'Draw · Stalemate';if(game.isThreefoldRepetition())return 'Draw · Repetition';return 'Draw';}
function formatTimeControl(seconds,increment=0){
  const base=Math.max(0,Number(seconds)||0),label=base%60===0?String(base/60):`${base}s`;
  return `${label}+${Math.max(0,Number(increment)||0)}`;
}
// ---- Sound effects (src/sfx.js; owner, 2026-10-13: "When you go to a next menu page, a sound
// must play. When you do anything, sound must play") ----
// Recorded sounds: the interface (a tap, a page turning forward and back, a dialog opening and
// closing, a switch, a message, a game's start and end) and each piece's own sound in the set you
// choose in Theme Studio. One sound per action: a tap that opens a page is heard as the page.
// Until a sound has loaded (or where it cannot be decoded) the game's own synthesized sounds play.
// Interface sounds can be turned off on their own; the board's Sound button silences everything.
function menuSound(kind){return ['tap','page','back','open','close','toggle-on','toggle-off','notify'].includes(kind)}
function sfxPrefs(){
  if(!sfxPrefsCache){let v=null;try{v=JSON.parse(localStorage.getItem('vch.sfx')||'')}catch{}
    sfxPrefsCache={pieces:[...PIECE_SETS,'relic','classic'].includes(v?.pieces)?v.pieces:'wood',ui:v?.ui!==false}}
  return sfxPrefsCache;
}
function setSfxPref(key,value){sfxPrefsCache={...sfxPrefs(),[key]:value};try{localStorage.setItem('vch.sfx',JSON.stringify(sfxPrefsCache))}catch{}}
function soundBankNow(){if(!soundBank){soundBank=new SoundBank({context:audioContext});void soundBank.load()}return soundBank}
// The set your pieces sound like: your choice, or (Match my relic set) the equipped relic's.
function pieceSoundSet(){const p=sfxPrefs().pieces;return p==='relic'?SET_FOR_RELIC[loadRelics().equipped]||'wood':p}
function playUiSound(kind){
  if($('#sound')?.dataset.off||(menuSound(kind)&&!sfxPrefs().ui))return;
  uiVoiceFn??=uiGate(k=>{
    if($('#sound')?.dataset.off)return;
    try{if(soundBankNow().play('ui',k,{volume:.5}))return}catch{}
    synthUiSound(k);
  });
  uiVoiceFn(kind);
}
// The game's own sounds, for the moments that had one before the recordings.
function synthUiSound(kind){
  const patterns={start:[520,720],win:[523,659,784],lose:[392,330,262],draw:[440,494,440],warning:[760,620],success:[659,784],error:[330,262]},notes=patterns[kind];if(!notes)return;
  try{
    const audio=audioContext(),gain=audio.createGain(),t=audio.currentTime;
    gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(.055,t+.015);gain.connect(audio.destination);
    notes.forEach((frequency,index)=>{const oscillator=audio.createOscillator(),at=t+index*.12;oscillator.frequency.value=frequency;oscillator.connect(gain);oscillator.start(at);oscillator.stop(at+.11)});
    gain.gain.exponentialRampToValueAtTime(.0001,t+notes.length*.12+.04);
  }catch{}
}
function pieceSoundNames(){return {wood:'Wood',crystal:'Crystal',tidal:'Tidal',gilded:'Gilded',ember:'Ember',relic:'Match my relic set',classic:'Classic'}}
function pieceSoundOptions(){const names=pieceSoundNames();return [...PIECE_SETS,'relic','classic'].map(id=>`<option value="${id}">${names[id]}</option>`).join('')}
// A moment with its own sting (src/music-library.js STINGS) when the music is playing, over it;
// otherwise the interface's sound for it.
function cue(sting,sound){if(vantaScore?.playing&&vantaScore.sting(sting))return true;if(sound)playUiSound(sound);return false}
// The game-start card (owner, 2026-10-14: not a tune; "just make a sound ... the trumpet sound
// that blows when the game starts ... brief with a notification panel telling you that game has
// started ... something that is very obvious"): a short trumpet call (the start sting with the
// music on, the interface's start sound without) and, over the board, who plays whom, your
// colour and the clock. Since 2026-10-18 (owner: the pieces "don't load naturally", "the game
// start screen") it is the opening of the game's arrival (src/board-arrival.js): the card shows
// over the board's empty squares, and as it leaves the pieces settle onto their squares, so
// nothing covers a piece while you play. It never takes a click: a touch on the board ends the
// arrival at once and you can move.
let boardArrival=null;
function arrivalWanted(){return motionScale()>0&&!document.hidden}
function finishBoardArrival(){const arrival=boardArrival;boardArrival=null;arrival?.finish()}
// How long until the pieces are down: the computer's first move waits for it.
function startCeremonyMs(){return boardArrival?arrivalMs():0}
function showGameStartBanner(color,seconds,increment,key){
  if(!color||!key||lastGameStartKey===key)return;
  lastGameStartKey=key;hideGameEndPanel();
  let card=$('#gameStartCard');
  if(!card){
    card=document.createElement('div');card.id='gameStartCard';card.className='game-start-card';card.setAttribute('role','status');card.setAttribute('aria-live','polite');
    const row=side=>`<div class="gs-player" data-gs="${side}"><span class="avatar gs-avatar"></span><span class="gs-who"><b></b><small></small></span><span class="player-flag hidden" aria-hidden="true"></span></div>`;
    card.innerHTML=`<div class="gs-panel"><p class="gs-title">Game started</p>${row('top')}<p class="gs-vs"><span>vs</span></p>${row('bottom')}<p class="gs-meta"><span class="gs-side"></span><span class="gs-clock"></span></p></div>`;
  }
  const shell=$('.game .board-shell');(shell||document.body).append(card);card.classList.toggle('floating',!shell); // over the board
  card.dataset.side=color;
  card.querySelector('.gs-side').textContent=color==='w'?'You play White':'You play Black';
  card.querySelector('.gs-clock').textContent=formatTimeControl(seconds,increment);
  card.classList.remove('show');cue('start','start');queueAtmosphere(); // the music turns to the game on its next bar line, after the start sting
  queueMicrotask(()=>{fillGameStartPlayers(card);void card.offsetWidth;card.classList.add('show')}); // once the player bars show this game
  finishBoardArrival();
  const dom=ensureBoardDom(),arrival=arrivalWanted()?startArrival(dom.board,dom.pieces.elements,{onScreen:dom.board.getClientRects().length>0}):null;
  boardArrival=arrival;arrival?.done.then(()=>{if(boardArrival===arrival)boardArrival=null});
  // With the arrival, the card leaves as the pieces begin to settle; without it, it stays a moment.
  clearTimeout(gameStartBannerTimer);gameStartBannerTimer=setTimeout(()=>card.classList.remove('show'),arrival?ARRIVAL.holdMs:1900);
}
// The two players as their bars show them: portrait, name, rating and flag.
function fillGameStartPlayers(card){
  for(const side of ['top','bottom']){
    const row=card.querySelector(`[data-gs="${side}"]`),avatar=$(`#${side}Avatar`),flag=$(`#${side}Flag`),pic=row.querySelector('.gs-avatar'),mark=row.querySelector('.player-flag');
    row.querySelector('b').textContent=side==='bottom'?ownPlayerName():$('#topPlayerName')?.textContent||'';
    row.querySelector('small').textContent=$(`#${side}Rating`)?.textContent||'';
    pic.replaceChildren(...[...(avatar?.childNodes||[])].map(n=>n.cloneNode(true)));
    for(const c of ['has-picture','is-empty'])pic.classList.toggle(c,!!avatar?.classList.contains(c));
    const shown=!!flag&&!flag.classList.contains('hidden');mark.classList.toggle('hidden',!shown);mark.replaceChildren(...(shown?[...flag.childNodes].map(n=>n.cloneNode(true)):[]));
  }
}
// A touch on the board during the arrival ends it at once (the card too): it never holds up a move.
document.addEventListener('pointerdown',event=>{if(boardArrival&&event.target?.closest?.('#board')){finishBoardArrival();$('#gameStartCard')?.classList.remove('show')}},{capture:true,passive:true});

// The end of a game (owner, 2026-10-17: "the game end screen"), in place of the Game over
// dialog: a result card over the board that leaves the rest of the page free (no layer to
// dismiss before anything else works). The result and how it ended, the two players as their
// bars show them with the game's score and their rating change counting to its new value, and
// Game Review, Rematch (online) and New game. Close it (or Escape) to look at the final
// position; it goes by itself when a new game starts or the board shows something else.
const GE_CLOSE_ICON='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg>';
function gameEndKeys(event){
  if(event.key!=='Escape'||!$('#gameEndPanel')||document.querySelector('dialog[open],.vch-dialog-layer'))return;
  event.preventDefault();hideGameEndPanel();
}
function hideGameEndPanel(){
  const panel=$('#gameEndPanel');if(!panel)return;
  panel.removeAttribute('id');document.removeEventListener('keydown',gameEndKeys,true);
  cancelAnimationFrame(Number(panel.dataset.countFrame)||0);
  panel.classList.remove('show');setTimeout(()=>panel.remove(),motionScale()>0?280:0);
}
// The panel belongs to one finished game: anything else on the board takes it away.
function syncGameEndPanel(){const panel=$('#gameEndPanel');if(panel&&gameOverInfo()?.key!==panel.dataset.key)hideGameEndPanel()}
function endScore(result,color){
  if(result==='1/2-1/2')return '½';
  if(result==='1-0')return color==='w'?'1':'0';
  if(result==='0-1')return color==='b'?'1':'0';
  return '';
}
// A rated online game's rating change for one colour: {before, delta}, or null.
function endRatingChange(info,color){
  if(!info.online||!serverGame?.rated)return null;
  const prefix=color==='w'?'white':'black',before=Number(serverGame[`${prefix}_rating_before`]),delta=Number(serverGame[`${prefix}_rating_delta`]);
  return serverGame[`${prefix}_rating_before`]!=null&&serverGame[`${prefix}_rating_delta`]!=null&&Number.isFinite(before)&&Number.isFinite(delta)?{before,delta}:null;
}
function showGameEndPanel(info,title){
  hideGameEndPanel();
  const mine=info.myColor==='b'?'b':'w',theirs=mine==='w'?'b':'w';
  const outcome=title==='You won'?'won':title==='You lost'?'lost':title==='Draw'?'draw':'aborted';
  const plies=currentHistory().length,moves=Math.ceil(plies/2);
  const reason=[info.reason&&info.reason!=='aborted'?info.reason:'',moves?`${moves} ${moves===1?'move':'moves'}`:''].filter(Boolean).join(' · ');
  const row=(side,color)=>{
    const change=endRatingChange(info,color);
    const rating=change?`<span class="ge-rating" data-from="${change.before}" data-to="${change.before+change.delta}">${change.before}</span><span class="ge-delta ${change.delta>0?'up':change.delta<0?'down':'even'}">${change.delta>0?'+':change.delta<0?'−':'±'}${Math.abs(change.delta)}</span>`:`<span class="ge-rating">${escapeHtml($(`#${side}Rating`)?.textContent||'')}</span>`;
    return `<div class="ge-player" data-side="${side}" data-color="${color}"><span class="avatar ge-avatar"></span><span class="ge-who"><span class="ge-name"><b></b><span class="player-flag hidden" aria-hidden="true"></span></span><span class="ge-meta">${rating}</span></span><span class="ge-score">${endScore(info.result,color)}</span></div>`;
  };
  const panel=document.createElement('section');
  panel.id='gameEndPanel';panel.className='game-end';panel.dataset.key=info.key;panel.dataset.outcome=outcome;
  panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','false');panel.setAttribute('aria-labelledby','gameEndTitle');
  panel.innerHTML=`<div class="ge-card">
    <button type="button" class="ge-close" aria-label="Close">${GE_CLOSE_ICON}</button>
    <p class="ge-kicker">Game over</p>
    <h2 class="ge-title" id="gameEndTitle" tabindex="-1">${escapeHtml(title)}</h2>
    ${reason?`<p class="ge-reason">${escapeHtml(reason)}</p>`:''}
    <div class="ge-players">${row('top',theirs)}${row('bottom',mine)}</div>
    <div class="ge-actions"><button type="button" class="gold ge-review" data-ge="review">Game Review</button>${info.online?'<button type="button" class="ge-secondary" data-ge="rematch">Rematch</button>':''}<button type="button" class="ge-secondary" data-ge="new">New game</button></div>
  </div>`;
  // The players as their bars show them: portrait, name and flag.
  for(const side of ['top','bottom']){
    const el=panel.querySelector(`.ge-player[data-side="${side}"]`),avatar=$(`#${side}Avatar`),flag=$(`#${side}Flag`),pic=el.querySelector('.ge-avatar'),mark=el.querySelector('.player-flag');
    el.querySelector('b').textContent=side==='bottom'?ownPlayerName():$('#topPlayerName')?.textContent||'';
    pic.replaceChildren(...[...(avatar?.childNodes||[])].map(n=>n.cloneNode(true)));
    for(const c of ['has-picture','is-empty','light'])pic.classList.toggle(c,!!avatar?.classList.contains(c));
    const shown=!!flag&&!flag.classList.contains('hidden');mark.classList.toggle('hidden',!shown);mark.replaceChildren(...(shown?[...flag.childNodes].map(n=>n.cloneNode(true)):[]));
  }
  panel.querySelector('.ge-close').addEventListener('click',hideGameEndPanel);
  panel.querySelector('.ge-actions').addEventListener('click',async event=>{
    const action=event.target.closest('[data-ge]')?.dataset.ge;if(!action)return;
    hideGameEndPanel();
    if(action==='review')await startGameReview();
    if(action==='rematch')await startOnlineRematch();
    if(action==='new'){await resetFinishedGame();if(isMobileApp()){mTab='play';setMView('home')}} // a phone goes back to where a game is chosen
  });
  const shell=$('.game .board-shell');(shell||document.body).append(panel);panel.classList.toggle('floating',!shell);
  document.addEventListener('keydown',gameEndKeys,true);
  requestAnimationFrame(()=>{panel.classList.add('show');panel.querySelector('.ge-title')?.focus({preventScroll:true})});
  // A rating change counts up (or down) to its new value as the card settles.
  const counters=[...panel.querySelectorAll('.ge-rating[data-to]')];
  if(counters.length&&motionScale()>0){
    const start=performance.now()+260,span=900;
    const step=now=>{
      const t=Math.min(1,Math.max(0,(now-start)/span)),ease=1-(1-t)**3;
      for(const el of counters){const from=Number(el.dataset.from),to=Number(el.dataset.to);el.textContent=String(Math.round(from+(to-from)*ease))}
      if(t<1)panel.dataset.countFrame=String(requestAnimationFrame(step));
    };
    panel.dataset.countFrame=String(requestAnimationFrame(step));
  }else for(const el of counters)el.textContent=el.dataset.to;
}
function normalizedEndReason(value=''){
  const reason=String(value||'').trim().toLowerCase().replace(/[_-]+/g,' ');
  if(!reason)return '';
  if(reason.includes('checkmate'))return 'by checkmate';
  if(reason==='partner')return 'on the partner board';
  if(reason.includes('timeout')||reason.includes('time'))return 'on time';
  if(reason.includes('resign'))return 'by resignation';
  if(reason.includes('abort'))return 'aborted';
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
  if(info.reason==='aborted'||info.result==='*')return 'Game aborted';
  if(info.result==='1/2-1/2')return 'Draw';
  const won=(info.result==='1-0'&&info.myColor==='w')||(info.result==='0-1'&&info.myColor==='b');
  return won?'You won':'You lost';
}
async function resetFinishedGame(nextMode=['match','room','computer'].includes(mode)?mode:'room'){
  restoreRealmTheme();
  stopOnlineSync();serverGameId=null;serverGame=null;clockSnapshot=null;serverVersion=0;currentBot=null;myColor=null;orientationSet=false;selected=null;premoves.cancel();roomCreated=false;lastDrawOffer=null;clearDrawOfferTimer();drawOfferKey=null;localGameOver=false;localGameOverInfo=null;computerStarted=false;localClockState=null;lowTimeWarned=false;opponentWasConnected=null;lastChatMessageId=null;chatSessionStartedAt=Date.now();chatUnread=0;updateChatUnread();rematchOfferPending=false;moveEvalByPly=[];moveTimeByPly=[];resetReviewState();game.reset();history.replaceState(null,'',location.pathname);mode=nextMode;render();updateMoves();await activateLeftMode(nextMode);showMovesView();
}
function rematchSettings(){
  const ended=serverGame||{};
  return {seconds:Number(ended.time_control_seconds||ended.base_seconds||600),increment:Number(ended.increment_seconds||0),rated:!!ended.rated};
}
// Rematches are made by the server (security review C1): an offer and the new game are kept on
// the finished game, and each client opens the new game by id once the server says it exists.
async function startOnlineRematch(){
  if(!serverGameId)return toast('Rematch is unavailable');
  try{const out=await api.request('rematch',{gameId:serverGameId});if(out?.rematchGameId)return void openRematchGame(out.rematchGameId);if(out?.game)serverGame={...serverGame,...out.game};rematchOfferPending=true;toast('Rematch offered')}catch(error){toast(error.message)}
}
async function acceptRematchOffer(){
  if(!serverGameId)return;
  try{const out=await api.request('rematch',{gameId:serverGameId});if(out?.rematchGameId)void openRematchGame(out.rematchGameId)}catch(error){toast(error.message)}
}
let rematchOpening=null,rematchOfferSeen=null;
async function openRematchGame(id){
  if(rematchOpening===id||serverGameId===id)return;rematchOpening=id;
  hideGameEndPanel();
  try{
    const state=await api.state(id);applyServerState(state);room=(state.game||state).invite_code||room;roomCreated=false;rematchOfferPending=false;
    history.replaceState(null,'',`?game=${encodeURIComponent(room)}`);syncRoomUi();await loadChat();toast('Rematch started');
  }catch(error){toast(error.message)}finally{rematchOpening=null}
}
// Called with each server state of a finished game: a rematch offer from the opponent, or
// the new game the server made.
function syncRematch(g){
  if(!g||!serverGameId||g.id!==serverGameId||['active','waiting'].includes(g.status))return;
  if(g.rematch_game_id)return void openRematchGame(g.rematch_game_id);
  const offer=g.rematch_offer_by&&g.rematch_offer_by!==currentPlayerId?`${g.id}:${g.rematch_offer_by}`:null;
  if(offer&&offer!==rematchOfferSeen){rematchOfferSeen=offer;toast('Rematch offered',{duration:10000,actionLabel:'Accept',onAction:()=>acceptRematchOffer(),sound:'match'})}
}
async function maybeShowGameOver(){
  const info=gameOverInfo();if(!info||info.key===lastGameOverKey)return;
  lastGameOverKey=info.key;const title=gameOverTitle(info),won=title==='You won';if(info.result!=='*')markPlan('game');roundElevenGameOver(info);const stung=roundTwelveGameOver(info);
  if(!info.online&&mode==='computer'){
    lastLocalArchiveId=`local-${Date.now()}`;
    saveLocalGame({id:lastLocalArchiveId,source:'computer',pgn:game.pgn(),result:info.result,white:info.whiteName,black:info.blackName,myColor:info.myColor,whiteRating:currentBot&&info.myColor==='b'?currentBot.elo:null,blackRating:currentBot&&info.myColor==='w'?currentBot.elo:null,rated:false,base:600,inc:0,date:new Date().toISOString(),moves:game.history().length,reason:info.reason,variant:computerRules||'standard'});
  }if(!stung)playUiSound(title==='Draw'?'draw':won?'win':'lose'); // with the music on, its sting instead
  if(info.result!=='*')countFinishedGame();
  // The ending plays on the board first (the winners cheer, the losing king topples); without
  // it, a moment to see the last move land. Then the result card, if this game is still the one
  // on the board (a new game, a puzzle or a review may have begun meanwhile).
  const ending=performance.now();await playEnding(info);
  if(performance.now()-ending<400)await new Promise(resolve=>setTimeout(resolve,650));
  if(gameOverInfo()?.key!==info.key)return;
  showGameEndPanel(info,title);
  scheduleFlagPrompt(); // a first finished game is when the flag question is first asked
}
function premovePlayerColor(){if(serverGameId&&myColor)return myColor;if(mode==='computer'&&computerStarted)return computerSide;return null}
function premoveBlocked(){return !!puzzleSession||mode==='puzzle'||reviewState.running||reviewState.viewing||currentRightView==='review'}
function canQueuePremove(){if(freeBoard()||fogOnline())return false;
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
  if(studySession&&!studySession.editing)return;
  if(browse){exitBrowse();return} // a tap on the board while looking back returns to the game
  if(mode==='watch')return; // spectators can't move
  if(mode==='archive'&&!retrySession)return;
  if(fogOnline())return fogClick(sq,p);
  if(premoves.move?.from===sq){cancelPremove();return}
  if(canQueuePremove()){
    const color=premovePlayerColor();
    if(!premoves.selected){
      const piece=premoves.moves.length?premovedPieceAt(game,premoves.moves,sq):p; // a premove chain: the piece may already be premoved here
      if(piece?.color===color){premoves.select(sq);selected=null;render()}
      return
    }
    if(sq===premoves.selected){cancelPremove();return}
    premoves.queue(sq,'q');selected=null;render();return
  }
  if(!retrySession&&!freeBoard()&&(reviewState.viewing||localGameOver||boardOver()||(serverGameId&&myColor&&myColor!==game.turn())||(mode==='computer'&&(!computerStarted||game.turn()!==computerSide))))return;
  if(zhDropSelected){const type=zhDropSelected;zhDropSelected=null;if(zhDropTargets(type).includes(sq)){void zhDropOnline(type,sq);return}if(p?.color===game.turn()){selected=sq}render();return}
  premoves.cancel();
  if(!selected){if(p?.color===game.turn()){selected=sq;render()}return}
  if(sq===selected){selected=null;render();return}
  // Chess960 castling in Freestyle: drop the king on its own rook (or on c/g when unambiguous).
  if(!freeBoard()&&isOnlineGame()&&serverGame?.variant==='freestyle'&&game.get(selected)?.type==='k'){
    const opt=castleForMove(castleOptions(game,serverGame.castling960||'-',Chess),selected,sq);
    if(opt){selected=null;void castleOnline(opt);return}
  }
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
  const seconds=mode==='computer'?(computerRules==='blackout'?BLACKOUT_SECONDS:600):timeChoice($('#time').value).seconds;
  clocks=initialClocks(seconds);
  localClockState={w:clocks.w,b:clocks.b,active:game.turn(),startedAt:performance.now(),running:false}; // runs after both first moves
  syncClockBars(clocks,localClockState.active);
}
function settleLocalClock(){
  if(!localClockState)return;
  const now=performance.now(),elapsed=(now-localClockState.startedAt)/1000;
  if(localClockState.running)localClockState[localClockState.active]=Math.max(0,localClockState[localClockState.active]-elapsed);
  localClockState.startedAt=now;
}
function switchLocalClock(){
  if(!localClockState)return;
  settleLocalClock();localClockState.active=game.turn();localClockState.startedAt=performance.now();localClockState.running=game.history().length>=2;
}
function switchOnlineClockOptimistically(){
  if(!clockSnapshot)return;
  const clientNow=Date.now(),value=projectedClocks(clockSnapshot,clientNow);
  const plies=Math.max(Number(serverGame?.move_count||0)+1,currentHistory().length);
  clockSnapshot={...clockSnapshot,whiteMs:value.w,blackMs:value.b,active:game.turn(),lastMoveAt:clientNow+Number(clockSnapshot.serverOffset||0),running:clockSnapshot.running||!!serverGame?.daily_days||plies>=2};
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
  if(onlineGameBusy())return;
  if(matchSelection.rated&&!authSession?.access_token){openAccount();return toast('Sign in to start rated matchmaking')}
  stopOnlineSync();
  serverGameId=null;serverGame=null;clockSnapshot=null;serverVersion=0;currentBot=null;myColor=null;orientationSet=false;selected=null;premoves.cancel();flipped=false;roomCreated=false;moveEvalByPly=[];moveTimeByPly=[];resetReviewState();
  game.reset();render();updateMoves();setMatchSearching(true);
  const started=Date.now();
  try{
    const first=await api.queueJoin({seconds:matchSelection.seconds,increment:matchSelection.increment,rated:matchSelection.rated,...(matchSelection.variant!=='standard'?{variant:matchSelection.variant}:{})});
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
// A Campaign boss, a Gauntlet rung or Your Shadow is not one of the cards below: while one is
// on the board the panel says so, and the usual opponent and variant choices stop looking picked.
function syncSpecialOpponent(bot){
  const view=$('.computer-view'),note=$('#specialOpponent');
  view?.classList.toggle('special-game',!!bot);
  if(!note)return;
  note.classList.toggle('hidden',!bot);
  const rules=bot&&computerRules!=='standard'?` · ${{freestyle:'Freestyle 960',dark:'Vanta Dark',blackout:'Blackout Blitz'}[computerRules]||''}`:'';
  note.textContent=bot?`Now playing ${bot.display_name||bot.name||'a special opponent'}${rules}. Choose an opponent below for a regular game.`:'';
}
function renderComputerBots(){
  const grid=$('#botGrid');if(!grid)return;
  if(!computerBots.some(bot=>bot.slug===selectedComputerBotSlug))selectedComputerBotSlug=DEFAULT_LEVEL;
  // Strength the way chess sites show it: tiers by rating, a level number on a strength gauge,
  // the rating, and the FIDE title a player that strong would hold. No chess pieces.
  const card=bot=>{const level=Number(bot.level)||0,share=Math.max(0,Math.min(1,level/12)),tier=String(bot.tier||'').toLowerCase().replace(/[^a-z]+/g,'-');return `<button class="bot-card${tier?` tier-${tier}`:''}${bot.slug===selectedComputerBotSlug?' on':''}" data-bot-slug="${escapeHtml(bot.slug)}" data-about="${escapeHtml(bot.about||'')}" type="button"><span class="bot-level" aria-hidden="true"><svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15" pathLength="100"/><circle class="bot-level-fill" cx="18" cy="18" r="15" pathLength="100" stroke-dasharray="${(share*100).toFixed(1)} 100"/></svg><span>${level||''}</span></span><span class="bot-text"><b>${escapeHtml(bot.display_name||bot.name||'Computer')}</b><span class="bot-meta"><small>${Number(bot.elo)||1200} Elo</small>${bot.title?`<i class="bot-title">${escapeHtml(bot.title)}</i>`:''}</span></span></button>`};
  grid.innerHTML=LEVEL_TIERS.map(tier=>{const bots=computerBots.filter(bot=>bot.tier===tier.name);return bots.length?`<p class="bot-tier"><span>${escapeHtml(tier.name)}</span><small>${escapeHtml(tier.range)}</small></p>${bots.map(card).join('')}`:''}).join('')+computerBots.filter(bot=>!LEVEL_TIERS.some(tier=>tier.name===bot.tier)).map(card).join('');
  $$('#botGrid .bot-card').forEach(button=>button.onclick=()=>{selectedComputerBotSlug=button.dataset.botSlug;syncSpecialOpponent(null);renderComputerBots()});
}
// The ladder lives in the app (src/computer-levels.js); the server's bots only stand in for an
// opponent when the match queue is empty.
function loadComputerBots(){
  if(botsLoaded)return;botsLoaded=true;
  renderComputerBots();
}
function selectedComputerSide(){
  if(computerSideChoice==='random')return crypto.getRandomValues(new Uint8Array(1))[0]%2?'b':'w';
  return computerSideChoice;
}
let computerVariant='standard',computerRules='standard';
// opts (round 11): {bot, side, variant} for Your Shadow and the Vanta Gauntlet.
function startComputerGame(opts={}){
  if(!opts||opts instanceof Event)opts={};
  if(onlineGameBusy())return; // your online game stays yours: back to it, or resign it there
  if(typeof hideCoach==='function')hideCoach();
  if(watchSession)stopWatching();if(archiveSession)leaveArchive({reset:false});
  const selectedBot=opts.bot||computerBots.find(bot=>bot.slug===selectedComputerBotSlug)||computerBots[0]||DEFAULT_COMPUTER_BOTS[2];
  stopOnlineSync();serverGameId=null;serverGame=null;clockSnapshot=null;serverVersion=0;roomCreated=false;moveEvalByPly=[];moveTimeByPly=[];resetReviewState();
  computerRules=opts.variant||computerVariant;engineSight=null;
  if(searching)void cancelMatchSearch({announce:false}); // a computer game ends any search for an online one
  if(opts.bot?.campaign)applyRealmTheme(realmById(opts.bot.campaign.realm));else restoreRealmTheme();
  syncSpecialOpponent(opts.bot?selectedBot:null);
  currentBot={...selectedBot};localGameOver=false;localGameOverInfo=null;lowTimeWarned=false;computerStarted=true;computerSide=opts.side||selectedComputerSide();premoves.cancel();
  myColor=computerSide;orientationSet=true;flipped=computerSide==='b';selected=null;game.reset();boardShapes=[];
  if(computerRules==='freestyle'){game.load(freestyleFen());toast(FREESTYLE_LABEL)}
  if(computerRules==='dark')toast('Vanta Dark: you only see what your pieces see');
  if(computerRules==='blackout')toast('Blackout Blitz: every few moves the lights go out');
  resetLocalClock();syncRoomUi();syncPlayerBars();render();updateMoves();
  const label=$('#computerStart span');if(label)label.textContent='Restart game';
  showGameStartBanner(computerSide,computerRules==='blackout'?BLACKOUT_SECONDS:600,0,`computer:${Date.now()}`);
  swearOath(`computer:${Date.now()}`,{startFen:computerRules==='freestyle'?game.fen():null});
  if(game.turn()!==computerSide)setTimeout(engineMove,Math.max(280,startCeremonyMs())); // once its pieces are down
}
// ---- Round 11: Vanta Dark (fog of war) and Blackout Blitz, games against the computer ----
function computerLive(){return mode==='computer'&&computerStarted&&!localGameOver&&!game.isGameOver()&&!reviewState.viewing&&!browse}
function darkActive(){return computerRules==='dark'&&computerLive()}
// Online Vanta Dark / Blackout Blitz (round 13): the server sends each player only what they may
// see (supabase/functions/chess/fog.js). The board shows that view, moves go straight to the
// server (no relay, no optimistic move, no premoves), and the whole game shows at the end.
function fogOnline(){return isOnlineGame()&&['dark','blackout'].includes(serverGame?.variant)&&serverGame?.status==='active'&&!!myColor}
const onlineDark=()=>fogOnline()&&serverGame.variant==='dark';
const onlineBlind=()=>fogOnline()&&serverGame.variant==='blackout'&&!!serverGame.fog?.blind;
// The position to put in chess.js for a fog view: the fogged FEN (an enemy king may be out of
// sight, so validation is skipped) or an empty board while the lights are out.
function loadFogView(state){
  const turn=Number(state.move_count||0)%2?'b':'w';
  const fen=state.fen||`8/8/8/8/8/8/8/8 ${turn} - - 0 1`;
  try{game.load(fen,{skipValidation:true})}catch{}
}
async function fogClick(sq,p){
  const g=serverGame;if(!myColor||onlineMovePending||game.turn()!==myColor)return;
  const blind=onlineBlind();
  if(!selected){if(blind||p?.color===myColor){selected=sq;render()}return}
  if(sq===selected){selected=null;render();return}
  if(!blind&&p?.color===myColor){selected=sq;render();return}
  const from=selected;selected=null;
  const options=Array.isArray(g.legal)?g.legal.filter(m=>m.startsWith(from+sq)):null;
  if(options&&!options.length){rejectMove(from,sq,{quietRule:true});render();return}
  let promotion='q';if(options?.some(m=>m.length===5)){promotion=await choosePromotion();if(!promotion){render();return}}
  render();await fogSend({from,to:sq,promotion});
}
async function fogSend(move){
  onlineMovePending=true;
  try{const out=await api.move(serverGameId,serverVersion,{from:move.from,to:move.to,promotion:move.promotion,clientMoveAt:serverAlignedNowIso()});applyServerState(out);afterBoardPaint(playTone)}
  catch(error){
    if(error?.status===409)await refreshServerState();
    else{playIllegalTone();buzz(HAPTICS.illegal);toast(/illegal/i.test(error?.message||'')?'That move is not legal here':error.message)}
  }finally{onlineMovePending=false}
}
function blackoutActive(){return computerRules==='blackout'&&computerLive()&&inBlackout(myMoveCount(game.history(),computerSide))}
let blackoutWas=false;
function syncBlackout(){
  const on=blackoutActive();if(on===blackoutWas)return;blackoutWas=on;
  if(on)toast(`Lights out · ${blindMovesLeft(myMoveCount(game.history(),computerSide))} blind moves`,{duration:1600});
  else if(computerRules==='blackout'&&computerLive())toast('Lights on',{duration:900});
}
function maskedRecords(records){
  if(darkActive())return records.map((r,i)=>({...r,san:darkSan(r,i,computerSide)}));
  if(fogOnline())return records.map(r=>r?.hidden?{...r,san:serverGame.variant==='blackout'?'•':'?'}:r);
  if(blackoutActive())return records.map(r=>({...r,san:'•'}));
  return records;
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
async function makeMove(move,remote=false,retry=true){if(lessonSession&&mode==='lesson'&&!remote)return lessonMove(move);if(fogOnline()&&!remote){if(Array.isArray(serverGame.legal)&&!serverGame.legal.some(m=>m.startsWith(move.from+move.to)))return rejectMove(move.from,move.to,{quietRule:true});return fogSend(move)}if(planSession&&!remote)return planMove(move);if(studySession?.editing&&!remote)return studyMove(move);if(exploreSession&&!remote)return exploreMove(move);if(repEdit&&!remote)return repEditMove(move);if(egSession&&!remote)return egMove(move);if(prepSession&&!remote)return prepMove(move);if(analysis&&!remote)return analysisMove(move);if(retrySession&&!remote)return retryAttempt(move);if(puzzleSession&&!remote){const uci=move.from+move.to+(move.promotion||'');if(puzzleSession.kind==='repertoire'&&uci!==puzzleSession.solution[puzzleSession.index]){const full=repContinue(puzzleSession.lines,game.fen(),puzzleSession.full.slice(0,puzzleSession.offset+puzzleSession.index),uci);if(full){puzzleSession.full=full;puzzleSession.solution=full.slice(puzzleSession.offset)}}const expected=puzzleSession.solution[puzzleSession.index];if(uci!==expected&&!(expected?.length===4&&uci===expected+'q')){if(puzzleSession.kind==='battle')return battleMiss(move);if(streakSession)return endStreak(move);if(puzzleSession.trainer)return drillMiss();puzzleMiss(move);return}
  const made=rememberLastMove(game.move(move));puzzleSession.played.push(uci);puzzleSession.index++;render({hint:made,instant:instantMoveAnimation});afterBoardPaint(playTone);
  if(puzzleSession.index>=puzzleSession.solution.length){if(puzzleSession.kind==='battle')return battleSolved();if(puzzleSession.trainer)return drillSolved();await recordPuzzle(true);puzzleSolved();return}
  const reply=puzzleSession.solution[puzzleSession.index];
  if(reply){setTimeout(async()=>{if(!puzzleSession)return;try{const made=rememberLastMove(game.move({from:reply.slice(0,2),to:reply.slice(2,4),promotion:reply[4]}));puzzleSession.played.push(reply);puzzleSession.index++;render({hint:made});afterBoardPaint(playTone);if(puzzleSession.index>=puzzleSession.solution.length){if(puzzleSession.kind==='battle')return battleSolved();if(puzzleSession.trainer)return drillSolved();await recordPuzzle(true);puzzleSolved()}}catch{toast('Puzzle line could not continue')}},260)}
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
    // Replying to a move the server hasn't confirmed yet: send now; the server waits briefly
    // for that move to land (round 7), so both requests travel at the same time.
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
  return}let made,localElapsedMs=null;try{if(mode==='computer'&&localClockState){localElapsedMs=Math.max(0,performance.now()-localClockState.startedAt);settleLocalClock()}made=rememberLastMove(game.move(move))}catch{return}if(localElapsedMs!==null)moveTimeByPly[Math.max(0,(game.moveNumber()-1)*2+(game.turn()==='b'?1:0)-1)]=localElapsedMs;if(mode==='computer'){localClockState.active=game.turn();localClockState.startedAt=performance.now();localClockState.running=game.history().length>=2}selected=null;render({hint:made,instant:instantMoveAnimation});afterBoardPaint(()=>{updateMoves();playTone()});if(mode==='computer'&&remote)playQueuedPremove();if(mode==='computer'&&!remote&&made)void coachAfterMove(made);if(mode==='computer'&&!remote&&!game.isGameOver())afterBoardPaint(()=>setTimeout(engineMove,60));}
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
function moveRecords(){return archiveSession?.records?archiveSession.records:watchSession?(watchSession.state?.move_history||[]):serverGameId&&Array.isArray(serverGame?.move_history)?serverGame.move_history:game.history({verbose:true})}
// The engine reports each new depth many times a second, and the move list is rebuilt whole each
// time; on a phone or tablet that alone made a move stutter (owner, 2026-10-17: "laggy"). Its
// evaluations reach the list at most four times a second.
let movesUpdateTimer=0;
function queueMovesUpdate(){if(!movesUpdateTimer)movesUpdateTimer=setTimeout(()=>{movesUpdateTimer=0;updateMoves()},250)}
function updateMoves(){
  const records=maskedRecords(moveRecords());syncBlackout();
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
// Vanta Dark and Blackout Blitz: the computer plays blind too (src/blind-engine.js). It searches
// the board it believes in, choosing only among moves legal there and on the real board.
function blindSearch(){
  if(mode!=='computer'||!['dark','blackout'].includes(computerRules))return null;
  const color=game.turn(),realFen=game.fen(),history=game.history({verbose:true});
  try{
    if(computerRules==='dark'){
      if(engineSight?.rules!=='dark')engineSight={rules:'dark',memory:startMemory(Chess,new Chess().fen(),color)};
      const look=lookAround(Chess,realFen,color,engineSight.memory,{turn:history.length,captured:capturedBy(history,color)});
      engineSight.memory=look.memory;
      const fen=beliefFen(Chess,realFen,color,new Map([...look.memory].map(([sq,p])=>[sq,{type:p.type}])),{seen:look.seen});
      return fen?{fen,searchmoves:sharedMoves(Chess,realFen,fen)}:null;
    }
    // Blackout: while its lights are on it sees the board (and remembers it); then it plays blind.
    if(!engineBlind(history.map(m=>m.san),color)){engineSight={rules:'blackout',snapshot:realFen,at:history.length};return null}
    const snap=engineSight?.rules==='blackout'?engineSight:{snapshot:realFen,at:history.length};
    const fen=blackoutBelief(Chess,snap.snapshot,history.slice(snap.at).filter(m=>m.color===color),realFen,color);
    return fen?{fen,searchmoves:sharedMoves(Chess,realFen,fen)}:null;
  }catch{return null}
}
async function findEngineMove(){
  const moves=game.moves({verbose:true});if(!moves.length)return null;
  const requestedElo=Number(currentBot?.elo||currentBot?.rating||1500),fen=game.fen(),id=`bot-${++engineRequestSeq}`,blind=blindSearch();
  // The lowest levels play some moves the way a beginner would (src/computer-levels.js), after a
  // human-looking pause. (In the blind modes the move is still one legal on the real board.)
  if(Number(currentBot?.slip)>0&&Math.random()<Number(currentBot.slip)){
    await new Promise(resolve=>setTimeout(resolve,350+Math.random()*650));
    if(game.fen()!==fen)return undefined;
    // Blind, it can't know which moves capture: any move it believes it can make.
    if(blind){const pool=moves.filter(m=>blind.searchmoves.includes(m.from+m.to+(m.promotion||'')));return (pool.length?pool:moves)[Math.floor(Math.random()*(pool.length||moves.length))]}
    return beginnerMove(moves);
  }
  // Lozza or Stockfish 19 (src/engine-roster.js); the blind computer is always Stockfish.
  const lozza=!blind&&engineFor(currentBot,computerRules)==='lozza',worker=lozza?lozzaEngine:stockfish;
  if(enginePending)enginePending.resolve(null);
  const uci=await new Promise(resolve=>{
    enginePending={id,resolve};
    if(lozza)worker.postMessage({mode:'bot',fen,nodes:lozzaBudget(requestedElo),requestId:id});
    else worker.postMessage({mode:'bot',fen:blind?.fen||fen,elo:requestedElo,nodes:botSearchNodes(requestedElo),requestId:id,...(blind?{searchmoves:blind.searchmoves}:{})});
    setTimeout(()=>{if(enginePending?.id===id){enginePending=null;worker.postMessage({action:'stop'});resolve(null)}},BOT_MOVE_TIMEOUT_MS);
  });
  if(game.fen()!==fen)return undefined; // position changed while searching (new game, takeback): drop the result
  const chosen=uci&&moves.find(x=>x.from+x.to+(x.promotion||'')===uci);
  if(!chosen&&blind&&uci){const pool=moves.filter(x=>blind.searchmoves.includes(x.from+x.to+(x.promotion||'')));return pool[Math.floor(Math.random()*pool.length)]||moves[0]}
  return chosen;
}
// A reply that comes after the game has ended (you resigned, or a clock ran out, while it was
// thinking) is dropped: the final position stays as the game ended, under its result card.
async function engineMove(){if(mode==='computer'&&(!computerStarted||game.turn()===computerSide))return;const book=shadowMove();if(book){await new Promise(resolve=>setTimeout(resolve,320));if(game.fen()===book.fen&&!localGameOver)makeMove(book.move,true);return}const move=await findEngineMove();if(move===undefined||localGameOver)return;if(!move)return toast('Stockfish 19 is unavailable — no substitute move was played');makeMove(move,true)}
// One AudioContext for the whole session: creating one per move is slow and browsers cap them.
function audioContext(){toneContext??=new AudioContext();if(toneContext.state==='suspended')void toneContext.resume();return toneContext}
// A move is heard where it lands: placed around you by its square (HRTF, src/move-sound.js
// soundPlace), in your piece set's sound for that piece (src/sfx.js): each piece its own, a
// capture, castling, a promotion, a check, a mate. Classic (or before the sounds load): the
// synthesized wooden knock, a heavier double knock for a capture, a ring for a check. In the dark
// the hidden opponent's moves (and any you step back to) are heard straight ahead, as plain knocks.
function moveHiddenInDark(){
  const color=premovePlayerColor(),mine=!color||game.turn()!==color;
  return (darkActive()||fogOnline()||blackoutActive())&&(!mine||!!browse||reviewState.viewing);
}
function moveSoundPlace(sq){
  const board=document.getElementById('board')?.getBoundingClientRect(),el=sq?document.querySelector(`#board .square[data-sq="${sq}"]`)?.getBoundingClientRect():null;
  if(!board?.width||!el?.width)return null;
  return soundPlace((el.left+el.width/2-board.left)/board.width*2-1,1-(el.top+el.height/2-board.top)/board.height*2);
}
function playTone(){
  if($('#sound').dataset.off)return;
  try{
    const move=boardLastMove(),hidden=moveHiddenInDark(),san=String(move?.san||''),place=hidden?null:moveSoundPlace(move?.to),set=pieceSoundSet();
    if(set!=='classic'&&soundBankNow().play(set,hidden?'pawn':moveSoundName(move),{place,volume:.6,vary:.02}))return;
    playMoveSound(audioContext(),{place,capture:!hidden&&(!!move?.captured||san.includes('x')),check:!hidden&&/[+#]/.test(san)});
  }catch{}
}
// An illegal try: a low double knock (and a short buzz on phones). When the king is the
// reason (check, a pin, an attacked square) its square flashes red, like a warning light.
function playIllegalTone(){
  if($('#sound').dataset.off)return;
  const set=pieceSoundSet();
  if(set!=='classic')try{if(soundBankNow().play(set,'illegal',{volume:.5}))return}catch{}
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
function clockText(n){return clockLabel(n)}
function playerBarClockColors(){
  const bottom=myColor==='b'?'b':'w';
  return {top:bottom==='w'?'b':'w',bottom};
}
function activeClockColor(){
  if(mode==='watch')return watchSession&&['active','playing','in_progress'].includes(watchSession.state?.status)&&!browse?game.turn():null;
  if(reviewState.viewing||localGameOver||boardOver())return null;
  if(mode==='computer')return computerStarted&&localClockState?.running?game.turn():null;
  return serverGameId&&['active','playing','in_progress'].includes(serverGame?.status)&&clockSnapshot?.running!==false?game.turn():null;
}
function currentClockSeconds(){
  if(clockSnapshot){
    const value=projectedClocks(clockSnapshot);
    return {w:Math.max(0,value.w/1000),b:Math.max(0,value.b/1000)};
  }
  if(mode==='computer'&&localClockState){
    const elapsed=(performance.now()-localClockState.startedAt)/1000;
    return {
      w:Math.max(0,localClockState.w-(localClockState.running&&localClockState.active==='w'?elapsed:0)),
      b:Math.max(0,localClockState.b-(localClockState.running&&localClockState.active==='b'?elapsed:0))
    };
  }
  return {w:Math.max(0,clocks.w),b:Math.max(0,clocks.b)};
}
function syncClockBars(values=currentClockSeconds(),active=activeClockColor()){
  if(mode==='puzzle'&&runTimer)return; // the run clock owns your clock during a puzzle run
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
  if(live&&active===own){const line=clockAnnouncement(lastAnnouncedSeconds,seconds);lastAnnouncedSeconds=seconds;if(line)announce(translateText(line,uiLang)||line)}else lastAnnouncedSeconds=null;
  // Under 10 seconds on your own running clock: a soft tick every second.
  const tick=tickSecond(seconds,live&&active===own);
  if(tick!==null&&tick!==lastTickSecond){if(lastTickSecond!==null)playTick();lastTickSecond=tick}else if(tick===null)lastTickSecond=null;
}
let lastTickSecond=null;
function playTick(){
  if($('#sound')?.dataset.off)return;
  try{if(soundBankNow().play('ui','tick',{volume:.4}))return}catch{}
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
// A message: a soft chime with it (sound: another interface sound, or false for none).
function toast(s,{duration=1800,onClick=null,actionLabel='',onAction=null,sound='notify'}={}){
  const el=$('#toast');if(!el)return;clearTimeout(toastTimer);el.replaceChildren();el.className='show';if(sound)playUiSound(sound);
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
    element.setAttribute('aria-label',`${countryName(normalized,uiLang)} flag`);element.title=countryName(normalized,uiLang);
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
  {const link=!currentBot&&!serverGame?.bot_player_id&&opponent?.account?opponentUsername(serverGame,myColor):null,tn=$('#topPlayerName');tn.dataset.profile=link||'';tn.classList.toggle('pp-link',!!link);tn.title=link?'View profile':''}
  setPortrait($('#topAvatar'),currentBot?{initials:playerInitials(topName,'OP'),label:topName}:{avatar:opponent?.avatar_data,preset:opponent?.avatar_preset,label:topName});
  setPortrait($('#bottomAvatar'),ownPortrait(ownName));
  if(serverGameId&&opponentId&&!currentBot)void loadOpponentInfo(serverGameId,opponentId);
  const opponentColor=myColor==='w'?'black':'white',ownColor=myColor==='w'?'white':myColor==='b'?'black':null;
  setPlayerFlag($('#topFlag'),opponent?.country_code||(opponentColor?serverGame?.[`${opponentColor}_country_code`]:null));
  setPlayerFlag($('#bottomFlag'),currentProfile?.country_code||(ownColor?serverGame?.[`${ownColor}_country_code`]:null));
  drawPartnerStrip();drawTwinLine();
  setCrest($('#topCrest'),currentBot?null:opponent?.club);setCrest($('#bottomCrest'),ownClubInfo&&ownClubInfo.gameId===serverGameId?ownClubInfo.club:null);
  const online=isOnlineGame();
  setPresence($('#topPresence'),currentBot?'ENGINE':opponentId&&online?'LIVE':'WAITING',!!opponentId&&online&&!currentBot);
  setPresence($('#bottomPresence'),online?'LIVE':'LOCAL',online);
  // Puzzles have no opponent or clock: say so instead of "Waiting for opponent · 10:00".
  const puzzling=mode==='puzzle'&&!!puzzleSession;document.body.classList.toggle('puzzle-mode',puzzling);
  if(puzzling){$('#topPlayerName').textContent=puzzleSession.kind==='battle'?'Puzzle Battle':'Puzzle';$('#topRating').textContent=puzzleSession.rating?`${puzzleSession.rating} rating`:'Find the best move';setPresence($('#topPresence'),'PUZZLE',false);$('#bottomRating').textContent=`${puzzleRatingNow()} puzzle rating`;setPresence($('#bottomPresence'),'SOLVING',false)}
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
  syncTakebackUi();syncBerserkUi();syncPlanUi();
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
  if(studySession)endStudy({restore:false});if(exploreSession)endExplore({restore:false});
  if(planSession){
    if(state.id===planSession.gameId&&Number(state.version)===Number(planSession.version)){serverGame={...serverGame,...state};return}
    planSession=null;toast('Your opponent moved; planning closed');
  }
  if(provisional&&(confirms(provisional,state)||isExpired(provisional,performance.now())))clearProvisional();
  const previousVersion=serverVersion,previousGameId=serverGameId,previousState=serverGame;
  if(browse&&(state.id!==previousGameId||Number(state.version)>previousVersion)){browse=null;syncBrowseUi()} // a new move returns to the live position
  syncTwinFromState(payload,state);if(state.variant==='bughouse'&&state.bughouse_id&&bhSession?.id!==state.bughouse_id)void resumeBughouse(state.id);else drawPartnerStrip();
  if(state.id&&state.id!==previousGameId){restoreRealmTheme();if(['waiting','active'].includes(state.status))setTimeout(()=>{if(serverGameId===state.id&&myColor)swearOath(`online:${state.id}`,{startFen:state.start_fen||null,ok:(state.variant||'standard')==='standard'&&!state.start_fen,midGame:(state.move_history?.length||0)>1})},0);moveEvalByPly=[];moveTimeByPly=[];premoves.cancel();lowTimeWarned=false;opponentWasConnected=null;lastChatMessageId=null;chatSessionStartedAt=Date.now();chatUnread=0;updateChatUnread();clearDrawOfferTimer();drawOfferKey=null;rematchOfferPending=false;resetReviewState()}
  syncServerMoveTimes(previousState,state);
  serverGame=state;serverGameId=state.id||serverGameId;serverVersion=Number(state.version??serverVersion);
  currentPlayerId=payload.player?.id||currentPlayerId;currentBot=payload.bot||currentBot;
  myColor=seatFromEnvelope(payload,myColor);
  if(myColor&&!orientationSet){flipped=myColor==='b';orientationSet=true}
  if(myColor&&['active','playing','in_progress'].includes(state.status)&&(previousState?.status==='waiting'||Number(state.move_count||0)===0))showGameStartBanner(myColor,state.time_control_seconds||state.base_seconds||600,state.increment_seconds||0,`online:${state.id}:${state.started_at||'active'}`);
  clockSnapshot=createClockSnapshot(payload);
  if(['dark','blackout'].includes(state.variant)&&state.status==='active')loadFogView(state);
  else if(state.fen){try{game.load(state.fen)}catch{}}
  if(state.id&&state.id!==previousGameId)void loadChat();
  syncRematch(state);
  const lastServerMove=previousGameId===state.id&&Number(state.version)>previousVersion?state.move_history?.at?.(-1):null;
  syncRoomUi();render({hint:lastServerMove,instant:!animateMove});afterBoardPaint(updateMoves);syncOpponentConnectionToast(state);
  if(isOnlineGame())syncOnlineTransport();else if(serverGameId&&mode!=='computer')stopPolling();else stopOnlineSync();
  playQueuedPremove();afterBoardPaint(()=>void maybePlayBot());
  keepLiveGame(state);
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
  const user=$('#accountBtn');if(user){user.querySelector(':scope>span').textContent=name;user.querySelector(':scope>small').textContent=rating+' rating'}
  const bottom=$('#bottomPlayerName');if(bottom)bottom.textContent='You · '+name;
  const bottomRating=$('#bottomRating');if(bottomRating)bottomRating.textContent=rating+' rating';
  setPortrait($('#bottomAvatar'),ownPortrait(name));
  const headerAvatar=$('#accountBtn>i');if(headerAvatar){headerAvatar.classList.add('avatar');setPortrait(headerAvatar,ownPortrait(name))}
  setPlayerFlag($('#bottomFlag'),currentProfile?.country_code);
  syncPlayerBars();
  $('#profileMenuName').textContent=name;$('#profileMenuRating').textContent=rating+' rating';setPortrait($('#profileMenuAvatar'),ownPortrait(name));$('#profileMenuAuth').textContent=signed?'Sign out':'Sign in';
  $('#accountGuest')?.classList.toggle('hidden',signed);$('#accountSigned')?.classList.toggle('hidden',!signed);
  if(signed){
    $('#profileName').textContent=name;$('#profileRating').textContent=rating+' rapid';
    for(const pool of ['bullet','blitz','rapid','classical','daily']){const el=$('#rating'+pool[0].toUpperCase()+pool.slice(1));if(el)el.textContent=ratingFor(pool)}
    const pr=$('#ratingPuzzle');if(pr)pr.textContent=Number(currentProfile?.puzzle_rating||1200);
    const bs=$('#berserkStatus');if(bs){const prog=berserkProgress(currentProfile?.rated_win_streak,currentProfile?.berserk_ready);bs.textContent=prog.label;bs.classList.toggle('ready',prog.ready)}
    renderAchievements();if(typeof syncAdminUi==='function')syncAdminUi();if(typeof syncBoardSets==='function')syncBoardSets();
    const notice=$('#accountNotice'),muted=currentProfile?.muted_until&&Date.parse(currentProfile.muted_until)>Date.now();
    if(notice){notice.textContent=currentProfile?.banned?'Your account is suspended: you can review your games but not play rated games, join events or chat.':muted?`You're muted until ${new Date(currentProfile.muted_until).toLocaleString()}.`:'';notice.classList.toggle('hidden',!notice.textContent)}
  }
}
// ---- Portrait and country flag ----
// The opponent's flag and portrait come from game_players once per game and seat.
let opponentInfo=null,opponentInfoKey='';
async function loadOpponentInfo(gameId,opponentId){
  const key=`${gameId}:${opponentId}`;if(opponentInfoKey===key)return;opponentInfoKey=key;
  try{
    const out=await api.gamePlayers(gameId),them=(out.players||[]).find(p=>p.id===opponentId);
    opponentInfo=them?{gameId,...them}:null;const me=(out.players||[]).find(p=>p.id!==opponentId);ownClubInfo={gameId,club:me?.club||null};syncPlayerBars();
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
// Your VCH portrait: the server's copy once the round 13 server is live, else this device's.
function ownPreset(){
  const server=currentProfile?.avatar_preset;if(isPortraitPreset(server))return server;
  try{const v=localStorage.getItem('vch.portraitPreset');return isPortraitPreset(v)?v:null}catch{return null}
}
function ownPortrait(label){return {avatar:currentProfile?.avatar_data,preset:ownPreset(),label}}
async function saveProfileChanges(changes){
  const out=await api.profileUpdate(changes);currentProfile={...currentProfile,...(out.player||{})};syncIdentityUI();syncPlayerBars();return out;
}
function flagPromptDone(){try{return !!localStorage.getItem('vanta.flagPrompt')}catch{return true}}
// Games finished on this device: no question before the first one (owner, 2026-10-17: a first
// visit should land calmly, with nothing popping up over it).
const GAMES_FINISHED_KEY='vch.games-finished';
function gamesFinished(){try{return Number(localStorage.getItem(GAMES_FINISHED_KEY))||0}catch{return 0}}
function countFinishedGame(){try{localStorage.setItem(GAMES_FINISHED_KEY,String(gamesFinished()+1))}catch{}}
function scheduleFlagPrompt(){
  if(flagPromptDone()||currentProfile?.country_code||scheduleFlagPrompt.pending||!gamesFinished())return;
  scheduleFlagPrompt.pending=true;setTimeout(showFlagPrompt,2500);
}
// The flag prompt never interrupts a game or a conversation: it waits for a quiet moment, and
// steps aside (to come back later) if a game starts or the chat opens while it is showing.
// On a phone it sits just above the tab bar, where the Play tab keeps its Start game and Create
// room buttons, so it also waits while that tab's setup is on screen and asks on another tab or
// after a game instead (on a 360 px Galaxy it covered Start game, 2026-10-18).
function phonePlaySetupShowing(){
  return document.body.classList.contains('m-app')&&!['game','review'].includes(document.querySelector('.shell')?.dataset.mview)&&!!document.querySelector('[data-m-tab="play"].on');
}
function flagPromptCalm(){return !liveGameOn()&&!chatIsOpen()&&!document.querySelector('.vch-dialog-layer')&&!$('#gameEndPanel')&&!phonePlaySetupShowing()}
function showFlagPrompt(){
  if(flagPromptDone()||currentProfile?.country_code||document.querySelector('.flag-prompt'))return;
  if(!flagPromptCalm()){setTimeout(showFlagPrompt,6000);return}
  const card=document.createElement('section');card.className='flag-prompt';card.setAttribute('role','dialog');card.setAttribute('aria-label','Show your country flag');
  card.innerHTML=`<b>Show your country flag?</b><p>Opponents see it beside your name. "Detect" looks up only your country from your connection; we keep the 2-letter code, never your IP address.</p><div><button type="button" data-flag="detect" class="primary">Detect my country</button><button type="button" data-flag="choose">Choose myself</button><button type="button" data-flag="no">No thanks</button></div>`;
  const done=()=>{try{localStorage.setItem('vanta.flagPrompt','1')}catch{}card.remove()};
  card.addEventListener('click',async event=>{
    const choice=event.target.closest('[data-flag]')?.dataset.flag;if(!choice)return;
    if(choice==='no'){done();return}
    if(choice==='choose'){done();void openProfileEditor();return}
    try{const code=await detectCountry();await saveProfileChanges({country_code:code});done();toast(`Flag set: ${countryName(code,uiLang)}`)}
    catch(error){done();toast(error.message);void openProfileEditor()}
  });
  document.body.append(card);
  const watch=setInterval(()=>{
    if(!card.isConnected){clearInterval(watch);return}
    if(!flagPromptCalm()){clearInterval(watch);card.remove();setTimeout(showFlagPrompt,6000)}
  },700);
}
// Portrait & profile: name, VCH portrait or picture, About line and flag. Guests can change
// their display name (kept on this device), wear a VCH portrait and set a flag; pictures and
// usernames belong to signed-in accounts.
async function openProfileEditor(){
  const account=!!authSession?.access_token&&!!currentProfile?.account;
  let avatar=currentProfile?.avatar_data||null,preset=ownPreset(),country=currentProfile?.country_code||'';
  const startName=account?(currentProfile.username||''):guestName,startBio=currentProfile?.bio||'';
  const body=document.createElement('div');body.className='profile-editor';
  const options=['<option value="">No flag</option>',...countryList(uiLang).map(([code,name])=>`<option value="${code}" data-no-i18n>${escapeHtml(name)}</option>`)].join('');
  body.innerHTML=`<div class="pe-portrait"><span class="avatar pe-avatar" aria-hidden="true"></span><div class="pe-who">
    <label class="pe-field"><span>${account?'Username':'Display name'}</span><input class="pe-name" maxlength="20" autocomplete="${account?'username':'nickname'}" value="${escapeHtml(startName)}" placeholder="${account?'3–20 letters, numbers or _':'3–20 characters'}"></label>
    <small class="pe-name-note">${account?'Your username is unique and shown everywhere.':'Guests: your name is kept on this device. Sign in to keep it everywhere and add a picture.'}</small></div></div>
<div class="pe-section"><span class="pe-title">VCH portrait</span><div class="pe-presets" role="listbox" aria-label="VCH portraits">${PORTRAIT_PRESETS.map(id=>`<button type="button" class="pe-preset avatar" role="option" data-preset="${id}" aria-label="${escapeHtml(presetLabel(id))}" title="${escapeHtml(presetLabel(id))}">${presetMarkup(id)}</button>`).join('')}</div>
${account?`<div class="pe-upload-row"><label class="pe-upload"><input type="file" accept="image/*" hidden><span>Upload picture</span></label><button type="button" class="pe-remove">No picture</button><small>Square crop, 128px. JPEG, PNG or WebP. A picture shows instead of your portrait.</small></div>`:''}</div>
<label class="pe-field pe-bio"><span>About you <em class="pe-count"></em></span><textarea maxlength="${BIO_MAX}" rows="2" placeholder="Favourite opening, club, a line about you">${escapeHtml(startBio)}</textarea></label>
<label class="pe-country"><span>Country flag</span><select>${options}</select></label>
<button type="button" class="pe-detect">Detect from my connection</button>
<p class="pe-note">Your flag is shown to opponents. Detect looks up only your country from your connection; we keep the 2-letter code, never your IP address. Choose "No flag" to hide it.</p>`;
  const previewEl=body.querySelector('.pe-avatar'),select=body.querySelector('select'),nameInput=body.querySelector('.pe-name'),bio=body.querySelector('textarea'),count=body.querySelector('.pe-count');
  const draw=()=>{setPortrait(previewEl,{avatar,preset});body.querySelectorAll('.pe-preset').forEach(b=>{const on=!avatar&&b.dataset.preset===preset;b.classList.toggle('on',on);b.setAttribute('aria-selected',on?'true':'false')})};
  const counter=()=>{count.textContent=`${bio.value.length}/${BIO_MAX}`};draw();counter();select.value=country;
  bio.oninput=counter;select.onchange=()=>{country=select.value};
  body.querySelectorAll('.pe-preset').forEach(b=>b.onclick=()=>{preset=b.dataset.preset===preset&&!avatar?null:b.dataset.preset;if(preset)avatar=null;draw()});
  body.querySelector('.pe-detect').onclick=async()=>{try{country=await detectCountry();select.value=country}catch(error){toast(error.message)}};
  body.querySelector('input[type=file]')?.addEventListener('change',async event=>{try{avatar=await avatarFromFile(event.target.files?.[0]);draw()}catch(error){toast(error.message)}});
  const remove=body.querySelector('.pe-remove');if(remove)remove.onclick=()=>{avatar=null;draw()};
  const action=await vchDialog({title:'Portrait & profile',body,actions:[{label:'Cancel',value:false},{label:'Save',value:true,primary:true}]});
  if(!action)return;
  const name=cleanDisplayName(nameInput.value),about=cleanBio(bio.value);
  // Names and the About line follow the chat rules (src/moderation.js); the server checks again.
  for(const text of [name,about]){if(text&&!moderateText(text).ok)return toast('Please keep your name and About line friendly')}
  const changes={country_code:country||null,avatar_preset:preset||null,bio:about||null};
  if(account&&avatar!==(currentProfile?.avatar_data||null))changes.avatar_data=avatar;
  try{
    if(account&&name&&name!==startName){
      if(!/^[A-Za-z0-9_]{3,20}$/.test(name))return toast('Usernames are 3–20 letters, numbers or _');
      const out=await api.request('profile',{name,username:name});currentProfile={...currentProfile,...(out.player||out.profile||{})};
    }
    if(!account&&name!==guestName){
      if(!isDisplayName(name))return toast('Names are 3–20 letters or numbers (spaces, _ . - inside)');
      guestName=name;try{localStorage.setItem('vch.guestName',name)}catch{}
      await api.profile(guestName).then(out=>{currentProfile={...currentProfile,...(out.player||out.profile||{})}}).catch(()=>{});
    }
    try{if(preset)localStorage.setItem('vch.portraitPreset',preset);else localStorage.removeItem('vch.portraitPreset')}catch{}
    await saveProfileChanges(changes);try{localStorage.setItem('vanta.flagPrompt','1')}catch{}toast('Profile saved')
  }catch(error){syncIdentityUI();toast(error.message)}
}
async function loadProfile(){
  try{const out=await api.profile(guestName);currentProfile=out.player||out.profile||null;syncIdentityUI();scheduleFlagPrompt();if(signedIn())startSocial();return out}
  catch(error){
    if(error.status===401&&authSession&&await refreshAuthSession()){const out=await api.profile(guestName);currentProfile=out.player||out.profile||null;syncIdentityUI();return out}
    if(error.status===401&&authSession){saveAuthSession(null);currentProfile=null;syncIdentityUI()}
    throw error
  }
}
function openAccount(){syncIdentityUI();menus.open('account')}
async function connect(){try{await loadProfile();if(params.get('game')){let state;try{state=await api.join(room,guestName)}catch(error){if(error.status===404&&await openBughouse(room,{quiet:true}))return;throw error}applyServerState(state);await loadChat();toast(`Joined room ${room}`)}else if(params.get('bughouse'))await openBughouse(String(params.get('bughouse')).slice(0,12));else if(liveGame&&!location.search)await resumeLiveGame()}catch(error){toast(error.message)}}
// VCH opened again (a reload, a tab closed by mistake) while your game is still on: straight back
// into it. A game that ended meanwhile is let go.
async function resumeLiveGame(){
  const live=liveGame;if(!live)return;
  try{const payload=await api.state(live.id),state=payload?.game||payload;if(liveGame?.id!==live.id)return;if(state?.status!=='active'){forgetLiveGame();return}liveState=state;liveSeenAt=Date.now();await returnToLiveGame(live)}
  catch(error){if(error?.status===403||error?.status===404)forgetLiveGame()}
}
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
  if(!realtimeChannel||!realtimeReady||realtimeGameId!==gameId||fogOnline())return; // hidden-information games never relay moves
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
  // A relayed move is only ever the opponent's: a message that would move your own pieces is
  // ignored (security review C1). The server's state settles everything either way.
  if(!myColor||legalMove.color===myColor||fogOnline())return false;
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
  mergeBughousePockets(message);
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
// The game's realtime topic is private to its two players: the server names it from a secret
// (game_channel; per seat for hidden-information games). Before the round 13 server is live
// the action is unknown and the old public topic is used.
let realtimeTopicFor=null,realtimeTopicPending=null;
async function gameTopic(gameId){
  if(realtimeTopicFor?.gameId===gameId)return realtimeTopicFor.topic;
  try{const out=await api.request('game_channel',{gameId});if(out?.topic){realtimeTopicFor={gameId,topic:out.topic};return out.topic}}catch(error){if(error?.status===403||error?.status===404)return null}
  return `game:${gameId}`;
}
function startRealtime(){
  if(!isOnlineGame()){stopRealtime();return}
  if(realtimeChannel&&realtimeGameId===serverGameId)return;
  if(realtimeTopicPending===serverGameId)return;
  const gameId=serverGameId;realtimeTopicPending=gameId;
  void gameTopic(gameId).then(topic=>{realtimeTopicPending=null;if(topic&&serverGameId===gameId&&!(realtimeChannel&&realtimeGameId===gameId))openRealtime(gameId,topic)});
}
function openRealtime(gameId,topic){
  stopRealtime();
  realtimeGameId=gameId;latencyMs=null;syncConnectionUi();
  realtimeChannel=realtimeClient
    .channel(topic,{config:{broadcast:{self:true}}})
    .on('broadcast',{event:'state'},message=>{handleRealtimeMessage(message)})
    .on('broadcast',{event:'moved'},message=>{handleRealtimeMessage(message)})
    .on('broadcast',{event:'move_void'},message=>{handleMoveVoid(message)})
    .on('broadcast',{event:'draw_hint'},message=>{const payload=message?.payload||{};if(payload.gameId===serverGameId&&payload.from!==realtimeClientId)void refreshServerState()})
    .on('broadcast',{event:'draw_response'},message=>{handleDrawResponse(message)})
    .on('broadcast',{event:'chat_hint'},message=>{const payload=message?.payload||{};if(payload.gameId===serverGameId&&payload.from!==realtimeClientId)void loadChat()})
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
  const online=isOnlineGame()&&!!myColor&&serverGame?.status==='active'&&!serverGame?.bot_player_id&&!serverGame?.daily_days&&!serverGame?.simul_id&&!currentBot;
  const opponentSeen=online?(myColor==='w'?serverGame.black_last_seen_at:serverGame.white_last_seen_at):null;
  const opponentId=online?(myColor==='w'?serverGame.black_player_id:serverGame.white_player_id):null;
  const info=online&&opponentId?abandonState(opponentSeen,Date.now()+(Number(clockSnapshot?.serverOffset)||0)):{state:'here'};
  card.classList.toggle('hidden',info.state==='here');
  $('#abandonClaim')?.classList.toggle('hidden',info.state!=='claimable');
  $('#abandonDraw')?.classList.toggle('hidden',info.state!=='claimable');
  const text=$('#abandonText');
  if(text&&info.state!=='here')text.textContent=info.state==='claimable'?'Claim the win, or call it a draw':`You can claim the win in ${info.secondsLeft}s if they don't come back`;
}
function syncWakeLock(){
  const want=liveGameOn()&&!document.hidden;
  if(want&&!wakeLock&&!wakeLockPending&&navigator.wakeLock?.request){
    wakeLockPending=true;
    navigator.wakeLock.request('screen').then(lock=>{wakeLock=lock;lock.addEventListener('release',()=>{if(wakeLock===lock)wakeLock=null})}).catch(()=>{}).finally(()=>{wakeLockPending=false});
  }else if(!want&&wakeLock){const lock=wakeLock;wakeLock=null;lock.release().catch(()=>{})}
}
// First moves: untimed, but the game is aborted if the side to move doesn't start in 30s.
function syncFirstMoveCard(){
  const card=$('#firstMoveCard');if(!card)return;
  const show=isOnlineGame()&&!!myColor&&serverGame?.status==='active'&&!serverGame?.daily_days&&!serverGame?.simul_id&&Number(serverGame?.move_count||0)<2&&currentHistory().length<2;
  card.classList.toggle('hidden',!show);if(!show)return;
  const since=Date.parse(serverGame.last_move_at||''),now=Date.now()+(Number(clockSnapshot?.serverOffset)||0),left=Math.max(0,Math.ceil((30000-(now-since))/1000));
  const mine=game.turn()===myColor;
  $('#firstMoveTitle').textContent=mine?'Your first move':'Waiting for the first move';
  $('#firstMoveText').textContent=mine?'The clocks start after both first moves. No move, no game.':'If your opponent doesn\'t move in time, the game is aborted.';
  $('#firstMoveCount').textContent=Number.isFinite(left)?String(left):'';
  card.classList.toggle('urgent',mine&&left<=10);
}
function syncGameMoments(){
  syncAbandonCard();syncWakeLock();syncFirstMoveCard();
  const yourTurn=liveGameOn()&&myColor===game.turn()&&mode!=='computer';
  const title=tabTitle(baseTitle,{hidden:document.hidden,yourTurn});if(document.title!==title)document.title=title;
}
setInterval(syncGameMoments,1000);
document.addEventListener('visibilitychange',syncGameMoments);
// ---- Puzzle Streak (src/puzzle-streak.js) ----
// ---- Puzzle rating, daily puzzle and theme stats (src/puzzle-rating.js) ----
let puzzleAngle=null;
function puzzleRatingNow(){return Number(currentProfile?.puzzle_rating||1200)}
function bestStreakShown(){return Math.max(loadBestStreak(),Number(currentProfile?.puzzle_best_streak||0))}
// Only the first try at a puzzle moves your rating (the server enforces it): a miss counts
// once, and solving it afterwards just finishes the puzzle.
async function recordPuzzle(success,move=null){
  const session=puzzleSession;if(!session||session.trainer||(success&&session.failed&&session.recorded))return;
  const played=move?[...session.played,`${move.from}${move.to}`]:session.played;
  try{
    const out=await api.puzzleAttempt({puzzleId:session.id,success,durationMs:Date.now()-session.started,playedMoves:played});
    session.recorded=true;
    if(out?.rating?.counted&&currentProfile){
      currentProfile={...currentProfile,puzzle_rating:out.rating.after,puzzle_games:Number(currentProfile.puzzle_games||0)+1};
      const now=$('#puzzleRatingNow'),delta=$('#puzzleRatingDelta');
      if(now)now.textContent=out.rating.after;
      if(delta){delta.textContent=ratingDeltaText(out.rating.before,out.rating.after);delta.className=out.rating.after>=out.rating.before?'up':'down'}
      const pr=$('#ratingPuzzle');if(pr)pr.textContent=out.rating.after;
    }
  }catch{}
}
function puzzleMiss(move){
  playIllegalTone();buzz(HAPTICS.illegal);
  if(!puzzleSession.failed){puzzleSession.failed=true;void recordPuzzle(false,move);if(vantaScore?.playing)vantaScore.sting('failed');toast('Not the move · this one counts as missed. Keep trying.',{sound:false})}
  else toast('Try another move');
}
async function renderPuzzleStats(){
  setDynamicView('puzzles','Puzzle stats',brandLoading('Loading your puzzle stats…'));
  try{
    const st=await api.puzzleStats(),target=$('#dynamicView .view-content');if(!target)return;
    const points=sparklinePoints(st.history||[],280,64),weak=weakestThemes(st.themes||[]);
    target.innerHTML=`<article class="puzzle-stats"><div class="puzzle-stat-row"><div><small>RATING</small><b>${st.rating}</b></div><div><small>RATED</small><b>${st.games}</b></div><div><small>BEST STREAK</small><b>${Math.max(st.best_streak||0,loadBestStreak())}</b></div></div>
      ${points?`<svg class="puzzle-spark" viewBox="0 0 280 64" preserveAspectRatio="none" aria-label="Puzzle rating over your last puzzles"><polyline points="${points}"/></svg>`:'<p class="menu-empty">Solve a few puzzles to see your rating line.</p>'}
      ${weak.length?`<h4>Practise next</h4><div class="theme-chips">${weak.map(t=>`<button data-theme="${escapeHtml(t.theme)}">${escapeHtml(themeLabel(t.theme))} · ${t.rate}%</button>`).join('')}</div>`:''}
      <h4>By theme</h4>${(st.themes||[]).length?`<div class="theme-table">${st.themes.map(t=>`<button class="theme-row" data-theme="${escapeHtml(t.theme)}"><span>${escapeHtml(themeLabel(t.theme))}</span><i style="--rate:${t.rate}%"></i><b>${t.rate}%</b><small>${t.solved}/${t.tries}</small></button>`).join('')}</div>`:'<p class="menu-empty">Themes appear after a couple of tries each.</p>'}
      <button class="primary-action next-puzzle">Back to puzzles</button></article>`;
    target.querySelectorAll('[data-theme]').forEach(b=>b.onclick=()=>{puzzleAngle=b.dataset.theme;showBackendView('puzzle')});
    target.querySelector('.next-puzzle').onclick=()=>showBackendView('puzzle');
  }catch(error){toast(error.message);showBackendView('puzzle')}
}
function startStreak(runMode=RUN_MODES.streak){
  if(runMode instanceof Event||typeof runMode!=='string')runMode=RUN_MODES.streak;
  const survival=runMode===RUN_MODES.survival;
  streakSession={mode:survival?'survival':'streak',count:0,best:survival?loadBestSurvival():loadBestStreak(),startedAt:Date.now()};
  puzzleSession=null;showBackendView('streak');
}
const startSurvival=()=>startStreak(RUN_MODES.survival);
// The run clock: Streak counts up (this puzzle and the whole run); Survival counts down and
// ends the run at zero. It shows in the card and in your clock under the board.
function stopRunTimer(){if(runTimer){clearInterval(runTimer);runTimer=0}document.body.classList.remove('puzzle-timed','puzzle-hurry')}
function tickRunTimer(){
  const run=streakSession,p=puzzleSession;
  if(!run||!p||mode!=='puzzle'){stopRunTimer();return}
  const survival=run.mode==='survival',now=Date.now();
  const left=survival?survivalLeft(run.count,p.started,now):0;
  const main=survival?runClock(left+999):runClock(now-p.started);
  const clock=$('#bottomClock');if(clock){clock.textContent=main;clock.classList.toggle('low-time',survival&&left<10000)}
  document.body.classList.toggle('puzzle-hurry',survival&&left<10000);
  const card=$('#dynamicView .run-clock b');if(card)card.textContent=main;
  const total=$('#dynamicView .run-total');if(total)total.textContent=`Run ${runClock(now-run.startedAt)}`;
  if(survival&&left<=0){stopRunTimer();endStreak(null,{timeout:true})}
}
function startRunTimer(){stopRunTimer();document.body.classList.add('puzzle-timed');tickRunTimer();runTimer=setInterval(tickRunTimer,250)}
function skipRunPuzzle(){
  if(!streakSession||!puzzleSession)return;
  const purse=spendSkip();if(!purse)return toast('No skip tokens left · one more tomorrow');
  puzzleSession=null;stopRunTimer();toast(`Skipped · ${purse.tokens} ${purse.tokens===1?'token':'tokens'} left`,{duration:1200});showBackendView('streak');
}
function puzzleSolved(){
  const session=puzzleSession;puzzleSession=null;markPlan('puzzles');
  renderStatus();syncPlayerBars(); // "Puzzle complete", not the solving labels
  if(!streakSession){const stung=cue('solved','success');toast('Puzzle solved',{sound:stung?false:'success'});return}
  playUiSound('success'); // a run: the short chime (a sting for every puzzle would be too much)
  stopRunTimer();
  streakSession.count++;streakSession.best=streakSession.mode==='survival'?saveBestSurvival(streakSession.count):saveBestStreak(streakSession.count);
  if(earnMilestone(streakSession.count))setTimeout(()=>toast(`${streakSession?.count||''} solved · a skip token earned`,{duration:1600}),700);
  toast(`Streak ${streakSession.count}${streakSession.count===streakSession.best&&streakSession.count>1?' · new best':''}`,{duration:1200});
  setTimeout(()=>{if(streakSession)showBackendView('streak')},900);
}
function endStreak(move,{timeout=false}={}){
  const session=streakSession;if(!session)return;streakSession=null;stopRunTimer();
  const survival=session.mode==='survival',runName=survival?'Survival':'Streak';
  if(move){playIllegalTone();buzz(HAPTICS.illegal)}
  if(vantaScore?.playing)vantaScore.sting('failed');
  const solution=puzzleSession?.solution?.[puzzleSession.index];
  if(puzzleSession&&move)void recordPuzzle(false,move);
  if(session.count>0&&!survival)void api.puzzleStreakRecord(session.count).then(out=>{if(currentProfile&&out?.best)currentProfile={...currentProfile,puzzle_best_streak:out.best}}).catch(()=>{});
  if(solution){boardShapes=[{from:solution.slice(0,2),to:solution.slice(2,4),brush:'green'}];render()}
  puzzleSession=null;
  const best=survival?saveBestSurvival(session.count):Math.max(saveBestStreak(session.count),Number(currentProfile?.puzzle_best_streak||0)),target=$('#dynamicView .view-content');
  if(target)target.innerHTML=`<article class="puzzle-info streak-info streak-over run-${session.mode}"><div class="streak-count"><small>${runName.toUpperCase()}</small><b>${session.count}</b><span>Best ${best}</span></div><h4>${timeout?"Time's up":move?`${runName} over`:`${runName} ended`}</h4><p class="run-total-final">Run time ${runClock(Date.now()-session.startedAt)}</p><p>${move&&solution?'The green arrow shows the move that kept it going.':session.count?'Well played.':'Have another go.'}</p><div class="streak-actions"><button class="primary-action start-streak">Start again</button><button class="next-puzzle">Back to training</button></div></article>`;
  $('#dynamicView .start-streak')?.addEventListener('click',()=>startStreak(session.mode));
  $('#dynamicView .next-puzzle')?.addEventListener('click',()=>showBackendView('puzzle'));
  if(isMobileApp())setTimeout(()=>{mTab='puzzles';setMView('panel')},move?1600:0); // phones: the result card lives in the panel
}

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
    <div class="archive-tools"><button type="button" class="archive-trainer">Opening trainer · drill your own deviations</button><button type="button" class="archive-together">Analyse together · a shared board with a friend</button><button type="button" class="archive-mistakes">Learn from your mistakes${mistakeStats(loadMistakes()).due?` · ${mistakeStats(loadMistakes()).due} due`:''}</button><button type="button" class="archive-army">Your army · veteran pieces and their deeds</button></div>
    <div class="archive-filters" role="tablist">${['all','win','loss','draw','computer'].map(f=>`<button type="button" data-archive-filter="${f}" class="${archiveFilter===f?'on':''}">${{all:'All',win:'Wins',loss:'Losses',draw:'Draws',computer:'vs Computer'}[f]}</button>`).join('')}</div>
    <div class="archive-list">${rows.map(({e,i})=>{
      const o=outcomeFor(e.result,e.myColor),opp=e.myColor==='w'?e.black:e.white,oppRating=e.myColor==='w'?e.blackRating:e.whiteRating,acc=reviews[e.id]?.accuracy?.[e.myColor],opening=detectOpening(sansFromPgn(e.pgn))?.name;
      return `<button type="button" class="archive-row outcome-${o}" data-archive="${i}"><span class="archive-result">${{win:'W',loss:'L',draw:'D'}[o]||'·'}</span><span class="archive-main"><b>vs ${escapeHtml(opp)}${oppRating?` <em>${escapeHtml(String(oppRating))}</em>`:''}</b><small>${e.source==='computer'?'Computer':e.source==='arena'?'Arena':e.rated?'Rated':'Casual'} · ${formatTimeControl(e.base,e.inc)} · ${Math.ceil((e.moves||0)/2)} moves${opening?` · ${escapeHtml(opening)}`:''}</small></span><span class="archive-side">${e.ratingDelta!=null?`<em class="${e.ratingDelta>=0?'up':'down'}">${e.ratingDelta>=0?'+':''}${e.ratingDelta}</em>`:''}${Number.isFinite(acc)?`<i>${acc.toFixed(1)}%</i>`:'<i class="todo">Not reviewed</i>'}<small>${archiveAgo(e.date)}</small></span></button>`;
    }).join('')||'<p class="archive-empty">Your finished games appear here, online and against the computer. Play one, then open it to see its story.</p>'}</div>
  </div>`;
  target.querySelectorAll('[data-archive-filter]').forEach(b=>b.onclick=()=>{archiveFilter=b.dataset.archiveFilter;drawArchive()});
  target.querySelectorAll('[data-archive]').forEach(b=>b.onclick=()=>void openArchivedGame(archiveEntries[Number(b.dataset.archive)]));
  target.querySelector('.archive-current')?.addEventListener('click',()=>void startGameReview());
  target.querySelector('.archive-together')?.addEventListener('click',()=>{const h=archiveSession?game.history():[];startAnalysis(h.length?{sans:h}:archiveSession?{startFen:game.fen()}:{})});
  target.querySelector('.archive-trainer')?.addEventListener('click',()=>void renderTrainer());
  target.querySelector('.archive-army')?.addEventListener('click',renderArmy);
  target.querySelector('.archive-mistakes')?.addEventListener('click',renderMistakes);
}
async function openArchivedGame(entry){
  if(onlineGameBusy())return;
  if(!entry)return;
  if(entry.variant==='bughouse')return toast("Bughouse games can't be replayed here yet");
  if(entry.variant==='crazyhouse'&&!Array.isArray(entry.sans))return toast("This Crazyhouse game can't be replayed here");
  // Crazyhouse: the moves are replayed with the pieces in hand, so drops land where they did.
  const zh=entry.variant==='crazyhouse'?zhRecordsFromSans(Chess,entry.sans,entry.startFen):null;
  if(zh&&!zh.records.length)return toast('This game has no moves to review');
  const freestyle=!zh&&entry.variant==='freestyle'&&entry.startFen&&Array.isArray(entry.sans);
  const replayed=freestyle?replay960(Chess,entry.startFen,entry.sans):null;
  const loaded=new Chess();if(!freestyle&&!zh){try{loaded.loadPgn(entry.pgn)}catch{return toast('This game could not be opened')}}
  if(!zh&&(freestyle?!replayed.moves.length:!loaded.history().length))return toast('This game has no moves to review');
  if(searching)await cancelMatchSearch({announce:false});
  if(watchSession)stopWatching({reset:false});
  stopOnlineSync();stopStory();retrySession=null;
  const prevMode=archiveSession?.prevMode||(['match','room','computer'].includes(mode)?mode:'room');
  serverGameId=null;serverGame=null;currentBot=null;puzzleSession=null;computerStarted=false;localGameOver=false;localClockState=null;clockSnapshot=null;premoves.cancel();selected=null;browse=null;
  resetReviewState();
  game.reset();if(zh)game.load(zh.fen,{skipValidation:true});else if(freestyle)game.load(replayed.positions.at(-1));else game.loadPgn(entry.pgn);lastMoveCache={fen:'',move:null};
  mode='archive';myColor=entry.myColor;flipped=entry.myColor==='b';orientationSet=true;
  archiveSession={entry,prevMode,records:zh?zh.records:freestyle?replayed.moves:null};document.body.dataset.archive='1';
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
    <div class="story-share"><button type="button" data-story="share-card">Share image</button><button type="button" data-story="share-clip">Share clip</button></div>
    ${worst&&!reviewState.variant?`<button type="button" class="story-retry" data-story="retry">${retrySession?'Replaying your moment…':`Replay your toughest moment (move ${Math.ceil(worst.ply/2)})`}</button>`:''}`;
  card.querySelectorAll('[data-story-ply]').forEach(b=>b.onclick=()=>{stopStory();setReviewPly(Number(b.dataset.storyPly))});
  card.querySelector('[data-story="play"]')?.addEventListener('click',playStory);
  card.querySelector('[data-story="stop"]')?.addEventListener('click',()=>{stopStory();renderReviewDashboard()});
  card.querySelector('[data-story="retry"]')?.addEventListener('click',()=>{if(!retrySession)startRetry(worst)});
  card.querySelector('[data-story="share-card"]')?.addEventListener('click',()=>void shareStory('card'));
  card.querySelector('[data-story="share-clip"]')?.addEventListener('click',()=>void shareStory('clip'));
}
// ---- Share a Game Story (src/story-share.js): an image card or a short clip ----
let sharePieces=null,sharing=false;
function storyShareInfo(){
  const entry=archiveSession?.entry,{moments,mine}=storyData(),moves=reviewState.moves,them=mine==='w'?'b':'w';
  const whole={from:1,to:moves.length},bot=currentBot?.display_name||currentBot?.name||'Computer',own=ownPlayerName();
  const white=entry?entry.white:mode==='computer'?(computerSide==='w'?own:bot):serverGame?.white_name||'White';
  const black=entry?entry.black:mode==='computer'?(computerSide==='b'?own:bot):serverGame?.black_name||'Black';
  const result=entry?.result||(serverGameId&&serverGame?resultFromState(serverGame):localGameOverInfo?.result||resultFromBoard());
  const outcome=outcomeFor(result,mine),sans=moves.map(m=>m.san);
  return {white,black,whiteRating:entry?.whiteRating||null,blackRating:entry?.blackRating||null,mine,moments,
    result:result==='1/2-1/2'?'½–½':result.replace('-','–'),resultText:outcome==='win'?`${mine==='w'?white:black} won`:outcome==='loss'?`${mine==='w'?black:white} won`:outcome==='draw'?'Drawn game':'Game in progress',
    opening:openingName(sans)||detectOpening(sans)?.name||'Game Story',accuracy:{mine:chapterAccuracy(reviewState.results,moves,whole,mine),theirs:chapterAccuracy(reviewState.results,moves,whole,them)}};
}
async function shareStory(kind){
  if(sharing||!reviewState.moves.length)return;sharing=true;stopStory();
  const button=$(`#storyCard [data-story="share-${kind}"]`),label=button?.textContent;
  try{
    if(button){button.disabled=true;button.textContent=kind==='clip'?'Recording…':'Drawing…'}
    sharePieces=sharePieces||await loadPieceImages();
    const info=storyShareInfo(),canvas=document.createElement('canvas');canvas.width=CARD_W;canvas.height=CARD_H;
    const ctx=canvas.getContext('2d'),orientation=info.mine,moves=reviewState.moves,positions=reviewState.positions;
    const momentAt=ply=>{const m=info.moments.find(x=>x.ply===ply);return m?{label:m.label,san:m.san,moveNo:`${Math.ceil(ply/2)}${m.color==='w'?'.':'…'}`}:null};
    const moveText=ply=>ply?`${Math.ceil(ply/2)}${moves[ply-1].color==='w'?'.':'…'} ${moves[ply-1].san}`:'Starting position';
    const drawAt=ply=>drawStoryFrame(ctx,{fen:positions[ply]||positions.at(-1),lastMove:moves[ply-1]||null,orientation,pieces:sharePieces,info:{...info,moment:ply===moves.length?null:momentAt(ply),resultText:ply===moves.length?info.resultText:moveText(ply)}});
    const name=storyFileName(info.white,info.black,kind==='clip'?'webm':'png');
    if(kind==='card'){
      const top=info.moments[0];drawStoryFrame(ctx,{fen:positions.at(-1),lastMove:moves.at(-1),orientation,pieces:sharePieces,info:{...info,moment:null,resultText:top?`${info.resultText} · turning point ${Math.ceil(top.ply/2)}${top.color==='w'?'.':'…'} ${top.san}`:info.resultText}});
      const out=await shareOrDownload(await canvasToBlob(canvas),name,{text:`${info.white} vs ${info.black} · ${info.result}`});
      if(out!=='cancelled')toast(out==='shared'?'Story card shared':'Story card saved');
    }else{
      const frames=clipSchedule(moves.length,info.moments);
      const blob=await recordClip(canvas,frames,drawAt,{onProgress:p=>{if(button)button.textContent=`Recording ${Math.round(p*100)}%`}});
      const out=await shareOrDownload(blob,name.replace(/\.webm$/,blob.type.includes('mp4')?'.mp4':'.webm'),{text:`${info.white} vs ${info.black} · ${info.result}`});
      if(out!=='cancelled')toast(out==='shared'?'Story clip shared':'Story clip saved');
    }
  }catch(error){toast(error.message||'Could not share the story')}
  finally{sharing=false;if(button){button.disabled=false;button.textContent=label}}
}

// ---- Opening trainer (src/opening-trainer.js): your own deviations from theory ----
let trainerDrills=[],trainerIndex=0;
async function renderTrainer(){
  setDynamicView('review','Opening trainer',brandLoading('Reading your games…'));
  if(!archiveEntries.length){try{const out=await api.archive(60),me=currentProfile?.id||currentPlayerId;archiveEntries=[...(out.games||[]).filter(g=>g.move_count>0&&!['waiting','active'].includes(g.status)).map(g=>archiveEntryFromServer(g,me)),...loadLocalArchive()]}catch{archiveEntries=loadLocalArchive()}}
  const report=trainerReport(archiveEntries,e=>sansFromPgn(e.pgn)),target=$('#dynamicView .view-content');if(!target)return;
  trainerDrills=report.drills;
  const pct=s=>`${s}%`,colorName=c=>c==='w'?'White':'Black';
  target.innerHTML=`<div class="trainer">
    <p class="trainer-intro">Built from your own games: where <b>you</b> left known opening theory, and what the main line plays instead.</p>
    ${trainerDrills.length?`<button class="primary-action trainer-start">Drill ${trainerDrills.length} ${trainerDrills.length===1?'position':'positions'}</button>`:''}
    <h4>Where you left the book</h4>
    ${trainerDrills.length?`<div class="trainer-list">${trainerDrills.slice(0,20).map((d,i)=>`<button class="trainer-row" data-drill="${i}"><span><b>${escapeHtml(d.name)}</b><small>as ${colorName(d.color)} · move ${d.moveNo}${d.times>1?` · ${d.times} games`:''}</small></span><span class="trainer-moves"><em>You: ${escapeHtml(d.played)}</em><em>Book: ${escapeHtml(d.book.join(' / '))}</em></span></button>`).join('')}</div>`:'<p class="menu-empty">No deviations yet. Your finished games will show up here when you leave a main line before it ends.</p>'}
    <h4>Your openings</h4>
    ${report.openings.length?`<div class="trainer-openings">${report.openings.slice(0,12).map(o=>`<div><span>${escapeHtml(o.name)}<small>as ${colorName(o.color)}</small></span><b>${o.games}</b><em>${pct(o.score)}</em></div>`).join('')}</div>`:'<p class="menu-empty">Play a few games to see your openings.</p>'}
    <button class="secondary-action trainer-back">Back to my games</button></div>`;
  target.querySelector('.trainer-start')?.addEventListener('click',()=>startDrill(0));
  target.querySelectorAll('[data-drill]').forEach(b=>b.onclick=()=>startDrill(Number(b.dataset.drill)));
  target.querySelector('.trainer-back').onclick=()=>void renderArchive();
}
function startDrill(i){
  if(onlineGameBusy())return;
  const d=trainerDrills[i];if(!d)return void renderTrainer();
  trainerIndex=i;cancelPremove(false);if(watchSession)stopWatching();if(archiveSession)leaveArchive({reset:false});
  streakSession=null;game.load(d.fen);mode='puzzle';serverGameId=null;clockSnapshot=null;browse=null;boardShapes=[];
  flipped=game.turn()==='b';orientationSet=true;
  puzzleSession={id:`drill-${i}`,solution:d.solution,index:0,played:[],started:Date.now(),failed:false,trainer:true,kind:'opening',misses:0};
  render();
  setDynamicView('review','Opening trainer',`<article class="puzzle-info trainer-drill"><small>DRILL ${i+1} OF ${trainerDrills.length} · ${escapeHtml(d.name.toUpperCase())}</small><h4>${game.turn()==='w'?'White':'Black'} to move · play the main line</h4><p>In your game you played <b>${escapeHtml(d.played)}</b> here. Find the book move${d.solution.length>1?', then keep going':''}.</p><div class="streak-actions"><button class="trainer-skip">Skip</button><button class="trainer-stop">Stop</button></div></article>`);
  $('#dynamicView .trainer-skip').onclick=()=>startDrill(i+1);
  $('#dynamicView .trainer-stop').onclick=()=>{puzzleSession=null;void renderTrainer()};
}
function drillMiss(){
  const s=puzzleSession;s.misses++;playIllegalTone();buzz(HAPTICS.illegal);
  if(s.kind==='mistake'&&!s.graded){s.graded=true;gradeCurrentMistake(false)}
  const next=s.solution[s.index],what=s.kind==='mistake'?'the better move':s.kind==='repertoire'?'your prepared move':'the book move';
  if(s.misses>=2&&next){boardShapes=[{from:next.slice(0,2),to:next.slice(2,4),brush:'green'}];render();toast(`The arrow shows ${what}`)}
  else toast(s.kind==='mistake'?'Not that one either. Look again':s.kind==='repertoire'?'Not your prepared move. Try again':'Not the main line. Try again');
}
function drillSolved(){
  const s=puzzleSession;boardShapes=[];puzzleSession=null;
  if(s?.kind==='mistake'){
    if(!s.graded){gradeCurrentMistake(true);markPlan('mistakes')}
    toast(s.graded?'Found it · this one comes back soon':'Fixed · it comes back later to make sure');
    setTimeout(()=>{if(mode==='puzzle'&&!puzzleSession)startMistakeDrill()},1000);return;
  }
  if(s?.kind==='repertoire'){markPlan('repertoire');toast(s.misses?'Line complete':'Line complete · no mistakes');setTimeout(()=>{if(mode==='puzzle'&&!puzzleSession)startRepDrill(s.color,s.count+1)},900);return}
  toast('Main line found');
  setTimeout(()=>{if(mode==='puzzle'&&!puzzleSession)startDrill(trainerIndex+1)},900);
}
// ---- Learn from your mistakes (src/mistakes.js) ----
let currentMistakeId=null;
function gradeCurrentMistake(correct){
  const bank=loadMistakes(),i=bank.findIndex(m=>m.id===currentMistakeId);if(i<0)return;
  const wasFixed=bank[i].fixed;bank[i]=gradeMistake(bank[i],correct);saveMistakes(bank);
  if(correct&&!wasFixed){const fixed=mistakeStats(bank).fixed;if(fixed>=10&&fixed%10===0)void api.mistakesFixed(fixed).catch(()=>{})}
}
function rememberMistakes(){
  // Your costly moves from the review just finished; and, for a rated game against a person,
  // the opponent's accuracy as a fair-play signal (only ever reviewed by a human).
  const entry=archiveSession?.entry,mine=entry?.myColor||myColor||computerSide||'w',them=mine==='w'?'b':'w';
  const gameId=entry?.id||serverGameId||lastLocalArchiveId||`game-${Date.now()}`;
  const opponent=entry?(mine==='w'?entry.black:entry.white):mode==='computer'?(currentBot?.display_name||'Computer'):(mine==='w'?serverGame?.black_name:serverGame?.white_name)||'';
  const fresh=collectMistakes({results:reviewState.results,moves:reviewState.moves,positions:reviewState.positions,mine,gameId,date:entry?.date||null,opponent});
  if(fresh.length){
    const before=loadMistakes(),merged=mergeMistakes(before,fresh),added=merged.length-before.length;saveMistakes(merged);
    if(added>0)setTimeout(()=>toast(`${added} ${added===1?'position':'positions'} added to Learn from your mistakes`,{duration:2600}),1400);
  }
  const rated=entry?entry.rated&&entry.source!=='computer':!!serverGame?.rated&&!!serverGameId&&!serverGame?.bot_player_id;
  const theirs=reviewState.results.filter((r,i)=>reviewState.moves[i]?.color===them);
  if(rated&&theirs.length>=10){
    const acc=reviewAccuracyFor(them),avgLoss=theirs.reduce((s,r)=>s+Number(r.loss||0),0)/theirs.length;
    if(Number.isFinite(acc))void api.fairplaySignal({gameId,accuracy:Math.round(acc*100)/100,avgLoss:Math.round(avgLoss*100)/100,moves:theirs.length}).catch(()=>{});
  }
}
function renderMistakes(){
  const bank=loadMistakes(),st=mistakeStats(bank),due=dueMistakes(bank);
  setDynamicView('puzzles','Learn from your mistakes',`<article class="mistakes">
    <p class="trainer-intro">Positions from your reviewed games where you went wrong. Find the better move; each one comes back tomorrow, in 3 days and in a week until it sticks.</p>
    <div class="puzzle-stat-row"><div><small>DUE NOW</small><b>${st.due}</b></div><div><small>FIXED</small><b>${st.fixed}</b></div><div><small>MASTERED</small><b>${st.mastered}</b></div></div>
    ${st.due?`<button class="primary-action mistakes-start">Start · ${st.due} due</button>`:`<p class="menu-empty">${st.total?'Nothing due right now. Come back tomorrow.':'Review a finished game (My games, then open a game) and your mistakes appear here.'}</p>`}
    ${bank.length?`<h4>Recent</h4><div class="trainer-list">${bank.slice(0,15).map(m=>`<div class="trainer-row mistake-row"><span><b>Move ${m.moveNo} · you played ${escapeHtml(m.played)}</b><small>${escapeHtml(m.classification)} · vs ${escapeHtml(m.opponent||'opponent')}</small></span><span class="trainer-moves"><em>${m.box>=4?'Mastered':m.fixed?'Fixed':'To learn'}</em></span></div>`).join('')}</div>`:''}
  </article>`);
  $('#dynamicView .mistakes-start')?.addEventListener('click',startMistakeDrill);
}
function startMistakeDrill(){
  if(onlineGameBusy())return;
  const m=dueMistakes(loadMistakes())[0];if(!m){toast('All caught up');return void renderMistakes()}
  currentMistakeId=m.id;cancelPremove(false);if(watchSession)stopWatching();if(archiveSession)leaveArchive({reset:false});
  streakSession=null;try{game.load(m.fen)}catch{const bank=loadMistakes().filter(x=>x.id!==m.id);saveMistakes(bank);return startMistakeDrill()}
  mode='puzzle';serverGameId=null;clockSnapshot=null;browse=null;boardShapes=[];flipped=game.turn()==='b';orientationSet=true;
  puzzleSession={id:`mistake-${m.id}`,solution:[m.best],index:0,played:[],started:Date.now(),failed:false,trainer:true,kind:'mistake',misses:0,graded:false};
  render();
  const left=dueMistakes(loadMistakes()).length;
  setDynamicView('puzzles','Learn from your mistakes',`<article class="puzzle-info trainer-drill"><small>${left} DUE · ${escapeHtml(m.classification.toUpperCase())} · MOVE ${m.moveNo}</small><h4>${game.turn()==='w'?'White':'Black'} to move · find a better move</h4><p>In your game against ${escapeHtml(m.opponent||'your opponent')} you played <b>${escapeHtml(m.played)}</b> here.</p><div class="streak-actions"><button class="trainer-skip">Skip</button><button class="trainer-stop">Stop</button></div></article>`);
  $('#dynamicView .trainer-skip').onclick=()=>{const bank=loadMistakes(),i=bank.findIndex(x=>x.id===m.id);if(i>=0){bank[i]={...bank[i],due:Date.now()+3600000};saveMistakes(bank)}puzzleSession=null;startMistakeDrill()};
  $('#dynamicView .trainer-stop').onclick=()=>{puzzleSession=null;renderMistakes()};
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
  if(reviewState.variant)return toast('Replaying a moment works in standard chess games for now');
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
// ---- Berserk (earned every 3 straight rated wins; the server checks every rule) ----
function syncBerserkUi(){
  const seat=isOnlineGame()?myColor:null,ok=canBerserk({game:serverGame,seat,ready:!!currentProfile?.berserk_ready});
  $('#berserkCard')?.classList.toggle('hidden',!ok);
  const colors=playerBarClockColors();
  for(const [bar,color] of [['.player.top',colors.top],['.player.bottom',colors.bottom]]){
    const el=$(bar);if(!el)continue;
    const on=isOnlineGame()&&!!serverGame&&!!(color==='w'?serverGame.white_berserk:serverGame.black_berserk);
    el.classList.toggle('berserk',on);el.title=on?'Berserk: half clock, rating change ×1.25':'';
  }
}
$('#goBerserk').onclick=async()=>{
  const button=$('#goBerserk');button.disabled=true;
  try{const out=await api.berserk(serverGameId);if(currentProfile)currentProfile={...currentProfile,berserk_ready:false};applyServerState(out);broadcastAux('draw_hint',{from:realtimeClientId});toast('Berserk! Half the clock, 1.25× the stakes');syncIdentityUI()}
  catch(error){toast(error.message);void refreshServerState()}
  finally{button.disabled=false;syncBerserkUi()}
};

// ---- Achievements on the profile ----
function renderAchievements(){
  const grid=$('#achievementGrid');if(!grid)return;
  const board=achievementBoard(currentProfile?.achievements||[]),earned=board.filter(a=>a.earned).length;
  const count=$('#achievementCount');if(count)count.textContent=`${earned} / ${board.length}`;
  grid.innerHTML=board.map(a=>`<div class="achievement${a.earned?' earned':''}" title="${escapeHtml(a.text)}"><span class="achievement-mark" aria-hidden="true">${escapeHtml(a.mark)}</span><b>${escapeHtml(a.title)}</b><small>${a.earned?(a.at?`Earned ${new Date(a.at).toLocaleDateString()}`:'Earned'):escapeHtml(a.text)}</small></div>`).join('');
}

// ---- Friends, challenges and daily games ----
function signedIn(){return !!authSession?.access_token&&!!currentProfile?.account}
let socialState={incoming:[],outgoing:[],daily:[],seenAccepted:new Set(),timer:null,channel:null,channelFor:null};
function friendRow(f,{search=false}={}){
  return `<article class="friend-row" data-friend="${escapeHtml(f.id)}"><span class="presence-dot${f.online?' on':''}" aria-label="${f.online?'Online':'Offline'}"></span><div><button class="friend-name" type="button">${escapeHtml(f.name)}</button><small>${f.rating} rapid${f.online?' · online':''}</small></div><div>${search?`<button class="friend-follow" data-following="${f.following?'1':''}">${f.following?'Following':'Follow'}</button>`:'<button class="friend-unfollow" aria-label="Unfollow">Unfollow</button>'}<button class="friend-challenge">Challenge</button><button class="friend-battle">Battle</button></div></article>`;
}
async function openChallengeDialog(player){
  const body=document.createElement('div');body.className='challenge-form';
  body.innerHTML=`<p>Challenge <b>${escapeHtml(player.name)}</b></p><div class="time-chips">${CHALLENGE_TIMES.map((t,i)=>`<button type="button" data-ct="${t.value}"${i===2?' class="on"':''}>${escapeHtml(t.label)}</button>`).join('')}</div><div class="rated-switch"><button type="button" class="on" data-cr="">Casual</button><button type="button" data-cr="1">Rated</button></div><div class="rated-switch"><button type="button" class="on" data-cc="random">Random</button><button type="button" data-cc="w">White</button><button type="button" data-cc="b">Black</button></div><div class="rated-switch"><button type="button" class="on" data-cv="standard">Standard</button><button type="button" data-cv="freestyle">Freestyle 960</button><button type="button" data-cv="crazyhouse">Crazyhouse</button></div>`;
  let time=CHALLENGE_TIMES[2].value,rated=false,color='random',variant='standard';
  body.addEventListener('click',event=>{
    const b=event.target.closest('button');if(!b)return;
    if(b.dataset.ct!==undefined){time=b.dataset.ct;body.querySelectorAll('[data-ct]').forEach(x=>x.classList.toggle('on',x===b))}
    if(b.dataset.cr!==undefined){rated=!!b.dataset.cr;body.querySelectorAll('[data-cr]').forEach(x=>x.classList.toggle('on',x===b))}
    if(b.dataset.cc!==undefined){color=b.dataset.cc;body.querySelectorAll('[data-cc]').forEach(x=>x.classList.toggle('on',x===b))}
    if(b.dataset.cv!==undefined){variant=b.dataset.cv;body.querySelectorAll('[data-cv]').forEach(x=>x.classList.toggle('on',x===b))}
  });
  const send=await vchDialog({title:'Send a challenge',body,actions:[{label:'Cancel',value:false},{label:'Send challenge',value:true,primary:true}]});
  if(!send)return;
  try{await api.challengeSend({...challengePayload(player.id,time,{rated,color}),variant});toast(`Challenge sent to ${player.name}`);void refreshSocial()}catch(error){toast(error.message)}
}
function challengeHtml(c,incoming){
  const who=incoming?c.from:c.to,label=timeControlLabel(c);
  return `<article class="challenge-row" data-challenge="${escapeHtml(c.id)}"><div><b>${escapeHtml(who?.name||'Player')}</b><small>${escapeHtml(label)}${c.rated?' · rated':' · casual'}${incoming?'':' · waiting'}</small></div><div>${incoming?'<button class="challenge-decline">Decline</button><button class="challenge-accept primary">Accept</button>':'<button class="challenge-cancel">Cancel</button>'}</div></article>`;
}
function dailyHtml(g){
  return `<article class="daily-row${g.yourTurn?' your-turn':''}" data-daily="${escapeHtml(g.code)}"><div><b>${escapeHtml(g.opponent||'Waiting for opponent')}</b><small>${g.yourTurn?'Your move':g.status==='waiting'?'Waiting to start':'Their move'} · ${escapeHtml(dailyDeadlineLabel(g.deadline)||timeControlLabel({daily_days:g.daily_days}))}${g.opponentAwayUntil?` · <span class="away-tag">On vacation until ${escapeHtml(new Date(g.opponentAwayUntil).toLocaleDateString())}</span>`:''}</small></div><button class="daily-open${g.yourTurn?' primary':''}">${g.yourTurn?'Play':'Open'}</button></article>`;
}
function openGameCode(code){if(code)location.search='?game='+encodeURIComponent(code)}
async function answerChallenge(id,accept){
  try{
    const out=await api.challengeRespond(id,accept);
    if(!accept){toast('Challenge declined');return void refreshSocial()}
    openGameCode((out.game||out).invite_code);
  }catch(error){toast(error.message);void refreshSocial()}
}
function wireSocialActions(root){
  root.querySelectorAll('[data-challenge]').forEach(row=>{
    const id=row.dataset.challenge;
    row.querySelector('.challenge-accept')?.addEventListener('click',()=>answerChallenge(id,true));
    row.querySelector('.challenge-decline')?.addEventListener('click',()=>answerChallenge(id,false));
    row.querySelector('.challenge-cancel')?.addEventListener('click',async()=>{try{await api.challengeCancel(id);toast('Challenge cancelled');void refreshSocial()}catch(error){toast(error.message)}});
  });
  root.querySelectorAll('[data-daily]').forEach(row=>row.querySelector('.daily-open')?.addEventListener('click',()=>openGameCode(row.dataset.daily)));
}
function renderNotifyList(){
  const list=$('#notifyList');if(!list)return;
  const yourTurn=socialState.daily.filter(g=>g.yourTurn),items=[...socialState.incoming.map(c=>challengeHtml(c,true)),...yourTurn.map(dailyHtml)];
  const recent=inboxState.items.slice(0,6).map(inboxHtml).join('');
  list.innerHTML=(items.join('')+(recent?`<h5 class="inbox-sub">Recent</h5>${recent}`:''))||'<p class="menu-empty">No notifications yet. Challenges, your move in daily games, tournament rounds, club messages and achievements appear here.</p>';
  if(signedIn())list.insertAdjacentHTML('beforeend','<button class="inbox-all" type="button">See all notifications</button>');
  wireSocialActions(list);wireInbox(list);list.querySelector('.inbox-all')?.addEventListener('click',()=>void openNotifications());
  const n=badgeCount({unread:inboxState.unread,incoming:socialState.incoming.length,yourTurn:yourTurn.length,inboxAvailable:inboxState.available&&inboxState.items.length>0}),badge=$('#notifyCount');
  if(badge){badge.textContent=n>9?'9+':String(n);badge.classList.toggle('hidden',!n)}
}
async function refreshSocial(){
  if(!currentProfile?.id)return;
  try{
    const [ch,daily]=await Promise.all([api.challenges(),api.dailyGames().catch(()=>({games:[]}))]);
    socialState.incoming=ch.incoming||[];socialState.outgoing=ch.outgoing||[];socialState.daily=daily.games||[];socialState.vacation=daily.vacation||null;
    for(const a of ch.accepted||[]){
      if(socialState.seenAccepted.has(a.id))continue;socialState.seenAccepted.add(a.id);
      if(!a.daily_days&&!isOnlineGame()&&mode!=='computer'){toast('Challenge accepted · opening the game');openGameCode(a.code);return}
    }
    renderNotifyList();void refreshInbox();
    if(currentRightView==='friends')drawFriendsLists();
  }catch{}
}
function startSocial(){
  if(!currentProfile?.id)return;
  if(!socialState.timer){void refreshSocial();socialState.timer=setInterval(()=>{if(!document.hidden)void refreshSocial()},45000)}
  if(socialState.channelFor!==currentProfile.id){
    if(socialState.channel)realtimeClient.removeChannel(socialState.channel).catch(()=>{});
    socialState.channelFor=currentProfile.id;
    // Your player topic is private (named by the server, security review H2). Events are only
    // hints: games are opened from what the server lists for you, never from a code in a message.
    socialState.channel=realtimeClient.channel(`player:${currentProfile.notify_topic||currentProfile.id}`)
      .on('broadcast',{event:'notify'},()=>void refreshInbox())
      .on('broadcast',{event:'tournament_game'},message=>{toast(`Round ${Number(message?.payload?.round)||''} is ready`.trim());void openTournamentRound()})
      .on('broadcast',{event:'challenge'},()=>{toast('New challenge');void refreshSocial()})
      .on('broadcast',{event:'battle'},message=>{const code=String(message?.payload?.code||'');if(battleQueueTimer&&/^[A-Za-z0-9]{4,12}$/.test(code)&&(!battle||battle.status!=='live')){clearInterval(battleQueueTimer);battleQueueTimer=null;void joinBattle(code)}})
      .on('broadcast',{event:'challenge_answer'},message=>{
        const p=message?.payload||{};
        if(!p.accepted){toast('Your challenge was declined');return void refreshSocial()}
        toast('Challenge accepted');void refreshSocial(); // refreshSocial opens the game the server lists
      })
      .subscribe();
  }
}
// A Swiss round is ready: open your game from the server's list of your tournament games.
async function openTournamentRound(){
  if(isOnlineGame()||mode==='computer')return;
  try{const data=await api.tournaments(),game=(data.myGames||[]).find(g=>g?.code);if(game)setTimeout(()=>{location.search='?game='+encodeURIComponent(game.code)},1200)}catch{}
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&socialState.timer)void refreshSocial()});
function drawFriendsLists(){
  const view=$('#dynamicView .friends-view');if(!view)return;
  const ch=view.querySelector('#challengeList');
  if(ch){ch.innerHTML=[...socialState.incoming.map(c=>challengeHtml(c,true)),...socialState.outgoing.map(c=>challengeHtml(c,false))].join('')||'<p class="menu-empty">No open challenges.</p>';wireSocialActions(ch)}
  const daily=view.querySelector('#dailyList');
  if(daily){daily.innerHTML=socialState.daily.map(dailyHtml).join('')||'<p class="menu-empty">No daily games. Challenge a friend to one, or pick "Daily" in Room.</p>';wireSocialActions(daily);drawVacation(daily)}
}
function wireFriendRows(root,list){
  root.querySelectorAll('[data-friend]').forEach(row=>{
    const f=list.find(x=>x.id===row.dataset.friend);if(!f)return;
    row.querySelector('.friend-challenge')?.addEventListener('click',()=>openChallengeDialog(f));
    row.querySelector('.friend-battle')?.addEventListener('click',()=>void createBattle(f.id));
    row.querySelector('.friend-name')?.addEventListener('click',()=>void openProfile(f.name));
    const follow=row.querySelector('.friend-follow');
    if(follow)follow.onclick=async()=>{const on=!follow.dataset.following;try{await api.follow(f.id,on);follow.dataset.following=on?'1':'';follow.textContent=on?'Following':'Follow';f.following=on;void loadFriendList()}catch(error){toast(error.message)}};
    row.querySelector('.friend-unfollow')?.addEventListener('click',async()=>{try{await api.follow(f.id,false);toast(`Unfollowed ${f.name}`);void loadFriendList()}catch(error){toast(error.message)}});
  });
}
async function loadFriendList(){
  const slot=$('#dynamicView #friendList');if(!slot)return;
  try{
    const out=await api.friends(),list=sortFriends(out.friends||[]);
    const count=$('#dynamicView #followerCount');if(count)count.textContent=`${list.length} following · ${out.followers||0} followers`;
    slot.innerHTML=list.map(f=>friendRow(f)).join('')||'<p class="menu-empty">Follow players to see when they are online and challenge them.</p>';
    wireFriendRows(slot,list);
  }catch(error){slot.innerHTML=`<p class="menu-empty">${escapeHtml(error.message)}</p>`}
}
async function renderFriends(){
  if(watchSession)stopWatching();
  if(!signedIn()){
    setDynamicView('friends','Community',communityTabs('friends')+`<article class="friends-signin"><h4>Play your friends</h4><p>Sign in to follow players, see who is online, send challenges and play daily games.</p><button class="primary-action friends-signin-btn">Sign in</button></article>`);
    $('#dynamicView .friends-signin-btn').onclick=()=>openAccount();wireCommunityTabs();return;
  }
  closeClubChannel();
  setDynamicView('friends','Community',communityTabs('friends')+`<div class="friends-view">
    <section class="friends-block"><h4>Challenges</h4><div id="challengeList"><p class="menu-empty">Loading…</p></div></section>
    <section class="friends-block"><h4>Daily games</h4><div id="dailyList"><p class="menu-empty">Loading…</p></div></section>
    <section class="friends-block"><h4>Find players</h4><input id="friendSearch" type="search" autocomplete="off" maxlength="20" placeholder="Search by username"><div id="friendResults"></div></section>
    <section class="friends-block"><h4>Following <small id="followerCount"></small></h4><div id="friendList"><p class="menu-empty">Loading…</p></div></section>
    <section class="friends-block push-block"><h4>Notifications</h4><p>Get a notification when it's your move in a daily game, or when someone challenges you.</p><button id="pushToggle" type="button">Turn on notifications</button></section>
  </div>`);
  wireCommunityTabs();drawFriendsLists();void refreshSocial();void loadFriendList();void syncPushButton();
  let searchTimer=null;
  $('#friendSearch').addEventListener('input',event=>{
    clearTimeout(searchTimer);const q=event.target.value.trim(),slot=$('#friendResults');
    if(q.length<2){slot.innerHTML='';return}
    searchTimer=setTimeout(async()=>{try{const out=await api.playerSearch(q),list=out.players||[];slot.innerHTML=list.map(f=>friendRow(f,{search:true})).join('')||'<p class="menu-empty">No players found.</p>';wireFriendRows(slot,list)}catch(error){slot.innerHTML=`<p class="menu-empty">${escapeHtml(error.message)}</p>`}},300);
  });
  $('#pushToggle').onclick=togglePush;
}
// ---- Web push (daily "your move" and challenges) ----
async function pushRegistration(){return navigator.serviceWorker.ready}
async function syncPushButton(){
  const button=$('#pushToggle');if(!button)return;
  if(!pushSupported(window)){button.disabled=true;button.textContent='Notifications are not supported in this browser';return}
  if(Notification.permission==='denied'){button.disabled=true;button.textContent='Notifications are blocked in browser settings';return}
  try{const sub=await (await pushRegistration()).pushManager.getSubscription();button.textContent=sub?'Turn off notifications':'Turn on notifications';button.dataset.on=sub?'1':''}catch{}
}
async function togglePush(){
  const button=$('#pushToggle');if(!button||!pushSupported(window))return;
  button.disabled=true;
  try{
    const reg=await pushRegistration(),existing=await reg.pushManager.getSubscription();
    if(existing){await api.pushUnsubscribe(existing.endpoint).catch(()=>{});await existing.unsubscribe();toast('Notifications off')}
    else{
      if(await Notification.requestPermission()!=='granted')throw new Error('Notifications were not allowed');
      const sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlBase64ToBytes(VAPID_PUBLIC_KEY)});
      const json=sub.toJSON();await api.pushSubscribe({endpoint:json.endpoint,keys:{p256dh:json.keys?.p256dh,auth:json.keys?.auth}});
      toast('Notifications on');
    }
  }catch(error){toast(error.message)}
  finally{button.disabled=false;void syncPushButton()}
}
// ---- Public profiles (src/profile-view.js): rating line, best wins, head-to-head ----
let profileData=null,profilePool=null;
async function openProfile(username){
  if(!username)return;
  if(watchSession)stopWatching();
  setPrimaryScreen('game');if(isMobileApp()){mTab='more';setMView('panel')}
  setDynamicView('profile',username,brandLoading('Opening the profile…'));
  try{profileData=await api.publicProfile(username);profilePool=poolsPlayed(profileData.history)[0]||null;drawProfile()}
  catch(error){const t=$('#dynamicView .view-content');if(t)t.innerHTML=`<p class="menu-empty">${escapeHtml(error.message)}</p>`}
}
function profileChartHtml(){
  const d=profileData,model=profilePool?ratingChartModel(d.history,profilePool):null;
  if(!model)return '<p class="menu-empty">The rating line appears after two rated games in a pool.</p>';
  const pts=model.points.map(p=>`${p.x},${p.y}`).join(' '),last=model.points.at(-1),grid=[model.max,model.mid,model.min];
  return `<svg class="pp-chart-svg" viewBox="0 0 ${model.width} ${model.height}" role="img" aria-label="${escapeHtml(profilePool)} rating over the last ${model.points.length} rated games, from ${model.first} to ${model.last}">
    ${grid.map(v=>`<line class="pp-grid" x1="${model.padX}" x2="${model.width-8}" y1="${model.yOf(v)}" y2="${model.yOf(v)}"/><text class="pp-axis" x="${model.padX-8}" y="${model.yOf(v)+4}" text-anchor="end">${v}</text>`).join('')}
    <polyline class="pp-line" points="${pts}"/>
    <circle class="pp-last" cx="${last.x}" cy="${last.y}" r="4"/>
    <line class="pp-cross hidden" y1="8" y2="${model.height-8}"/><circle class="pp-dot hidden" r="4"/>
    <rect class="pp-hit" x="0" y="0" width="${model.width}" height="${model.height}"/>
  </svg><div class="pp-tip" hidden></div>
  <details class="pp-table"><summary>Show as a table</summary><table><thead><tr><th>Date</th><th>Rating</th></tr></thead><tbody>${model.points.slice(-20).reverse().map(p=>`<tr><td>${escapeHtml(new Date(p.at).toLocaleDateString())}</td><td>${p.rating}</td></tr>`).join('')}</tbody></table></details>`;
}
function wireProfileChart(){
  const box=$('#dynamicView .pp-chart'),svg=box?.querySelector('svg');if(!svg)return;
  const model=ratingChartModel(profileData.history,profilePool),tip=box.querySelector('.pp-tip'),cross=svg.querySelector('.pp-cross'),dot=svg.querySelector('.pp-dot');
  const show=event=>{
    const r=svg.getBoundingClientRect(),x=(event.clientX-r.left)*model.width/r.width;
    const p=model.points.reduce((a,b)=>Math.abs(b.x-x)<Math.abs(a.x-x)?b:a);
    cross.setAttribute('x1',p.x);cross.setAttribute('x2',p.x);dot.setAttribute('cx',p.x);dot.setAttribute('cy',p.y);cross.classList.remove('hidden');dot.classList.remove('hidden');
    tip.hidden=false;tip.innerHTML=`<b>${p.rating}</b><span>${escapeHtml(new Date(p.at).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}))}</span>`;
    const left=Math.min(Math.max(p.x*r.width/model.width,40),r.width-40);tip.style.left=`${left}px`;tip.style.top=`${p.y*r.height/model.height-8}px`;
  };
  const hide=()=>{tip.hidden=true;cross.classList.add('hidden');dot.classList.add('hidden')};
  svg.addEventListener('pointermove',show);svg.addEventListener('pointerdown',show);svg.addEventListener('pointerleave',hide);
}
function drawProfile(){
  const target=$('#dynamicView .view-content'),d=profileData;if(!target||!d)return;
  const p=d.player,h=d.headToHead,pools=poolsPlayed(d.history),earned=achievementBoard(p.achievements).filter(a=>a.earned);
  const seasons=(p.achievements||[]).filter(a=>String(a?.id||'').startsWith('season-')).map(a=>a.id.replace(/^season-/,'').split('-')).map(([y,m,div])=>({label:`${div[0].toUpperCase()+div.slice(1)} · ${y}-${m}`,div}));
  target.innerHTML=`<article class="pp">
    <header class="pp-head"><span class="avatar pp-avatar" aria-hidden="true"></span><div><h4>${escapeHtml(p.username)} <span class="player-flag pp-flag hidden" aria-hidden="true"></span></h4><small><i class="presence-dot${p.online?' on':''}"></i>${p.online?'Online':'Offline'} · ${escapeHtml(d.division)} league${d.club?` · ${d.club.crest?`<span class="pp-crest">${crestSvg(d.club.crest,{size:16,label:`${d.club.name} crest`})}</span>`:''}<button class="pp-club" data-club="${escapeHtml(d.club.slug)}">${escapeHtml(d.club.name)}</button>`:''}${p.member_since?` · since ${escapeHtml(p.member_since)}`:''}</small>${p.bio?`<p class="pp-bio">${escapeHtml(p.bio)}</p>`:''}</div></header>
    <div class="pp-actions">${d.self?'':`<button class="pp-follow">${d.following?'Following':'Follow'}</button><button class="pp-challenge primary">Challenge</button><button class="pp-prep">Prep against ${escapeHtml(p.username)}</button>`}<button class="pp-copy">Copy link</button>${d.self?'':'<button class="pp-report">Report</button>'}</div>
    ${h?`<div class="pp-h2h"><small>YOU VS ${escapeHtml(p.username.toUpperCase())}</small><b>${recordText(h)}</b><span>${h.wins+h.draws+h.losses?`${Math.round(100*(h.wins+h.draws/2)/(h.wins+h.draws+h.losses))}% score`:'No games yet'}</span></div>`:''}
    <div class="rating-grid">${['bullet','blitz','rapid','classical','daily'].map(pool=>`<div><small>${pool}</small><b>${Number(p.ratings?.[pool]??1200)}</b><em>${Number(p.provisional_games?.[pool]||0)} games</em></div>`).join('')}<div><small>Puzzles</small><b>${p.puzzle_rating}</b><em>${recordText(p)}</em></div></div>
    <section class="pp-chart"><div class="pp-pools">${pools.map(pool=>`<button data-pp-pool="${pool}" class="${pool===profilePool?'on':''}">${pool}</button>`).join('')}</div>${profileChartHtml()}</section>
    ${d.bestWins.length?`<h4>Best wins</h4><div class="pp-list">${d.bestWins.map(w=>`<div><b>${escapeHtml(w.opponent||'Player')}</b><span>${w.opponent_rating} · ${escapeHtml(w.pool)}</span><small>${escapeHtml(new Date(w.at).toLocaleDateString())}</small></div>`).join('')}</div>`:''}
    ${d.recent.length?`<h4>Recent rated games</h4><div class="pp-list">${d.recent.map(g=>`<div class="r-${g.result}"><b>${escapeHtml(g.opponent||'Player')}</b><span>${g.result} · ${g.opponent_rating} · ${escapeHtml(g.pool)}</span><small>${escapeHtml(new Date(g.at).toLocaleDateString())}</small></div>`).join('')}</div>`:''}
    <h4>Achievements <small>${earned.length}</small></h4><div class="pp-badges">${earned.map(a=>`<span class="achievement earned" title="${escapeHtml(a.text)}"><span class="achievement-mark">${escapeHtml(a.mark)}</span><b>${escapeHtml(a.title)}</b></span>`).join('')}${seasons.map(s=>`<span class="achievement earned season-${escapeHtml(s.div)}"><span class="achievement-mark">S</span><b>${escapeHtml(s.label)}</b></span>`).join('')||(earned.length?'':'<p class="menu-empty">None yet.</p>')}</div>
    ${hallOfRelicsHtml(d)}
  </article>`;
  setPortrait(target.querySelector('.pp-avatar'),{avatar:p.avatar_data,preset:p.avatar_preset,label:p.username});setPlayerFlag(target.querySelector('.pp-flag'),p.country_code);
  target.querySelectorAll('[data-pp-pool]').forEach(b=>b.onclick=()=>{profilePool=b.dataset.ppPool;drawProfile()});
  wireProfileChart();
  target.querySelector('.pp-copy').onclick=async()=>{try{await navigator.clipboard.writeText(profileUrl(p.username));toast('Profile link copied')}catch{toast(profileUrl(p.username))}};
  target.querySelector('.pp-follow')?.addEventListener('click',async()=>{if(!signedIn())return openAccount();try{await api.follow(p.id,!d.following);d.following=!d.following;drawProfile()}catch(error){toast(error.message)}});
  target.querySelector('.pp-challenge')?.addEventListener('click',()=>{if(!signedIn())return openAccount();void openChallengeDialog({id:p.id,name:p.username})});
  target.querySelector('.pp-prep')?.addEventListener('click',()=>void renderPrep(p.username));
  target.querySelector('.pp-report')?.addEventListener('click',()=>void openReportDialog(p));
  target.querySelector('.pp-club')?.addEventListener('click',e=>typeof openClub==='function'&&openClub(e.currentTarget.dataset.club));
}
async function openReportDialog(p,gameId=null){
  if(!signedIn())return openAccount();
  const body=document.createElement('div');body.className='report-form';
  body.innerHTML=`<p>Reports go to a person who reviews the games. Nothing happens automatically.</p><label><span>Reason</span><select><option value="engine">Using an engine or outside help</option><option value="abuse">Abusive chat or name</option><option value="sandbagging">Losing on purpose</option><option value="other">Something else</option></select></label><label><span>Details (optional)</span><textarea maxlength="500" rows="3"></textarea></label>`;
  const send=await vchDialog({title:`Report ${p.username}`,body,actions:[{label:'Cancel',value:false},{label:'Send report',value:true,primary:true}]});
  if(!send)return;
  try{await api.reportPlayer({playerId:p.id,gameId:gameId||serverGameId||undefined,reason:body.querySelector('select').value,note:body.querySelector('textarea').value});toast('Report sent. Thank you')}catch(error){toast(error.message)}
}
$('#topPlayerName').addEventListener('click',event=>{const u=event.currentTarget.dataset.profile;if(u)void openProfile(u)});
$('#viewMyProfile')?.addEventListener('click',()=>{menus.close('account');void openProfile(currentProfile?.username)});
if(params.get('player'))setTimeout(()=>void openProfile(String(params.get('player')).slice(0,20)),500);
// ---- Community: Friends | Clubs | League ----
function communityTabs(active){
  return `<div class="community-tabs" role="tablist">${[['friends','Friends'],['rivals','Rivals'],['clubs','Clubs'],['league','League']].map(([k,l])=>`<button type="button" role="tab" data-community="${k}" class="${k===active?'on':''}" aria-selected="${k===active}">${l}</button>`).join('')}</div>`;
}
function wireCommunityTabs(){
  $$('#dynamicView [data-community]').forEach(b=>b.onclick=()=>{const k=b.dataset.community;if(k==='friends')void renderFriends();if(k==='rivals')void renderRivals();if(k==='clubs')void renderClubs();if(k==='league')void renderLeague()});
}
let clubChannel=null,clubOpen=null;
function closeClubChannel(){if(clubChannel){realtimeClient.removeChannel(clubChannel).catch(()=>{});clubChannel=null}}
async function renderClubs(){
  closeClubChannel();clubOpen=null;
  setDynamicView('friends','Community',communityTabs('clubs')+brandLoading('Loading clubs…'));wireCommunityTabs();
  try{
    const out=await api.clubList(),target=$('#dynamicView .view-content');if(!target||currentRightView!=='friends')return;
    const list=c=>`<article class="club-row" data-club="${escapeHtml(c.slug)}">${c.crest?`<span class="club-crest">${crestSvg(c.crest,{size:26,label:`${c.name} crest`})}</span>`:''}<div><b>${escapeHtml(c.name)}</b><small>${c.member_count} ${c.member_count===1?'member':'members'}${c.description?` · ${escapeHtml(c.description)}`:''}</small></div><button class="club-open">Open</button></article>`;
    target.innerHTML=communityTabs('clubs')+`<div class="friends-view">
      ${out.mine?`<section class="friends-block my-club"><h4>Your club</h4>${list(out.mine)}</section>`:''}
      <section class="friends-block"><h4>Club battle</h4><p class="arena-rules">Every Sunday 18:00 UTC · 90 minutes · rated 5+0. Your club scores its best five players' arena points, and you never meet your own club. Register in Arena.</p></section>
      <section class="friends-block"><h4>Find a club</h4><input id="clubSearch" type="search" maxlength="40" placeholder="Search clubs"><div id="clubList">${out.clubs.map(list).join('')||'<p class="menu-empty">No clubs yet. Start the first one.</p>'}</div></section>
      ${!out.mine?`<section class="friends-block"><h4>Start a club</h4>${signedIn()?`<form id="clubCreate" class="club-form"><input name="name" maxlength="40" placeholder="Club name" required><input name="slug" maxlength="32" placeholder="Link (letters, numbers, dashes)"><textarea name="description" maxlength="280" rows="2" placeholder="What is the club about? (optional)"></textarea><button class="primary-action" type="submit">Create club</button></form>`:'<p class="menu-empty">Sign in to start or join a club.</p>'}</section>`:''}
    </div>`;
    wireCommunityTabs();
    const wireRows=root=>root.querySelectorAll('[data-club]').forEach(r=>r.querySelector('.club-open').onclick=()=>void openClub(r.dataset.club));
    wireRows(target);
    let timer=null;$('#clubSearch').addEventListener('input',e=>{clearTimeout(timer);timer=setTimeout(async()=>{try{const res=await api.clubList(e.target.value.trim()),slot=$('#clubList');slot.innerHTML=res.clubs.map(list).join('')||'<p class="menu-empty">No clubs found.</p>';wireRows(slot)}catch(error){toast(error.message)}},300)});
    $('#clubCreate')?.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.target);try{const res=await api.clubCreate({name:f.get('name'),slug:f.get('slug')||undefined,description:f.get('description')});toast('Club created');void openClub(res.club.slug)}catch(error){toast(error.message)}});
  }catch(error){toast(error.message)}
}
async function openClub(slug){
  if(!slug)return;closeClubChannel();
  setPrimaryScreen('game');if(isMobileApp()){mTab='more';setMView('panel')}
  setDynamicView('friends','Community',communityTabs('clubs')+brandLoading('Opening the club…'));wireCommunityTabs();
  try{
    const d=await api.clubView(slug),target=$('#dynamicView .view-content');if(!target)return;clubOpen=d.club.slug;
    target.innerHTML=communityTabs('clubs')+`<article class="club">
      <header>${d.club.crest?`<span class="club-crest big">${crestSvg(d.club.crest,{size:48,label:`${d.club.name} crest`})}</span>`:''}<h4>${escapeHtml(d.club.name)}</h4><small>${d.club.member_count} members${d.role==='owner'?' · you run this club':''}</small>${d.club.description?`<p>${escapeHtml(d.club.description)}</p>`:''}</header>
      <div class="pp-actions">${d.member?'<button class="club-leave">Leave club</button>':'<button class="club-join primary">Join club</button>'}<button class="club-copy">Copy invite link</button>${d.role==='owner'||currentProfile?.role==='admin'?`<button class="club-crest-edit">${d.club.crest?'Edit crest':'Design a crest'}</button>`:''}<button class="club-back">All clubs</button></div>
      ${d.member?`<section class="friends-block club-chat"><h4>Club chat</h4><div class="club-messages">${d.messages.map(m=>`<p class="${m.mine?'mine':''}"><b>${escapeHtml(m.name)}</b> ${escapeHtml(m.body)}</p>`).join('')||'<p class="menu-empty">Say hello to your club.</p>'}</div><form class="club-say"><input maxlength="280" placeholder="Message your club" required><button type="submit">Send</button></form></section>`:''}
      <section class="friends-block"><h4>Members</h4>${d.members.map(m=>`<article class="friend-row"><span class="presence-dot${m.online?' on':''}"></span><div><button class="friend-name" data-name="${escapeHtml(m.name)}">${escapeHtml(m.name)}</button><small>${m.rating} rapid${m.role==='owner'?' · owner':''}</small></div></article>`).join('')}</section>
    </article>`;
    wireCommunityTabs();
    const box=target.querySelector('.club-messages');if(box)box.scrollTop=box.scrollHeight;
    target.querySelectorAll('.friend-name').forEach(b=>b.onclick=()=>void openProfile(b.dataset.name));
    target.querySelector('.club-back').onclick=()=>void renderClubs();
    target.querySelector('.club-crest-edit')?.addEventListener('click',()=>void editCrest(d.club));
    target.querySelector('.club-copy').onclick=async()=>{const url=`${location.origin}/?club=${encodeURIComponent(d.club.slug)}`;try{await navigator.clipboard.writeText(url);toast('Invite link copied')}catch{toast(url)}};
    target.querySelector('.club-join')?.addEventListener('click',async()=>{if(!signedIn())return openAccount();try{await api.clubJoin(d.club.slug);toast(`Welcome to ${d.club.name}`);void openClub(d.club.slug)}catch(error){toast(error.message)}});
    target.querySelector('.club-leave')?.addEventListener('click',async()=>{const ok=await vchDialog({title:'Leave the club?',body:d.role==='owner'?'The longest-standing member takes over. If you are the last member, the club closes.':'You can join again later.',actions:[{label:'Stay',value:false},{label:'Leave',value:true,primary:true}]});if(!ok)return;try{await api.clubLeave();toast('You left the club');void renderClubs()}catch(error){toast(error.message)}});
    target.querySelector('.club-say')?.addEventListener('submit',async e=>{e.preventDefault();const input=e.target.querySelector('input'),body=input.value.trim();if(!body)return;input.value='';try{await api.clubChat(d.club.slug,body);void refreshClubChat()}catch(error){toast(error.message);input.value=body}});
    if(d.member)clubChannel=realtimeClient.channel(`club:${d.club.id}`).on('broadcast',{event:'message'},()=>void refreshClubChat()).subscribe();
  }catch(error){toast(error.message);void renderClubs()}
}
async function refreshClubChat(){
  if(!clubOpen||currentRightView!=='friends')return closeClubChannel();
  try{const d=await api.clubView(clubOpen),box=$('#dynamicView .club-messages');if(!box)return;box.innerHTML=d.messages.map(m=>`<p class="${m.mine?'mine':''}"><b>${escapeHtml(m.name)}</b> ${escapeHtml(m.body)}</p>`).join('');box.scrollTop=box.scrollHeight}catch{}
}
// ---- Monthly league (server rules.js) ----
let leagueDivision=null;
async function renderLeague(division=leagueDivision){
  closeClubChannel();
  setDynamicView('friends','Community',communityTabs('league')+brandLoading('Loading the league…'));wireCommunityTabs();
  try{
    const d=await api.league(division),target=$('#dynamicView .view-content');if(!target||currentRightView!=='friends')return;
    leagueDivision=d.division;
    const days=Math.max(0,Math.ceil((Date.parse(d.ends)-Date.now())/86400000)),up=d.division<d.divisions.length-1?d.zones.promote:0,down=d.division>0?d.zones.relegate:0;
    const zone=r=>r.rank<=up?'up':down&&r.rank>d.total-down?'down':'';
    const mine=d.standings.find(r=>r.me);
    target.innerHTML=communityTabs('league')+`<article class="league">
      <div class="league-head"><div><small>SEASON ${escapeHtml(d.season)}</small><b>${escapeHtml(d.divisions[d.division])} division</b><span>${days} ${days===1?'day':'days'} left · ${d.total} players</span></div><div class="league-me">${mine?`<small>YOU</small><b>#${mine.rank}</b><span>${mine.points} pts · ${mine.games} games</span>`:signedIn()?`<small>YOU</small><b>${escapeHtml(d.divisions[d.myDivision])}</b><span>Play a rated game to join</span>`:'<small>LEAGUE</small><b>Sign in</b><span>to compete</span>'}</div></div>
      <div class="league-divisions">${d.divisions.map((n,i)=>`<button data-division="${i}" class="div-${i}${i===d.division?' on':''}">${escapeHtml(n)}</button>`).join('')}</div>
      <p class="arena-rules">Rated games score 3 for a win and 1 for a draw. At the end of the month the top fifth of each division (with at least ${d.minGames} games) moves up and the bottom fifth moves down. Everyone with ${d.minGames}+ games earns a season badge.</p>
      <div class="league-table">${d.standings.map(r=>`<div class="${zone(r)}${r.me?' me':''}"><span>${r.rank}</span><b>${escapeHtml(r.name)}</b><em>${r.games} g</em><strong>${r.points}</strong></div>`).join('')||'<p class="menu-empty">No games in this division yet this season.</p>'}</div>
      <h4>Club league</h4><p class="arena-rules">Clubs play as teams: the league points of each club's best ${Number(d.clubTop||10)} members this season.</p>
      <div class="league-table club-league">${(d.clubs||[]).map(c=>`<div class="${d.myClub&&d.myClub.slug===c.slug?'me':''}"><span>${c.rank}</span><b data-club="${escapeHtml(c.slug)}">${escapeHtml(c.name)}</b><em>${c.players} p</em><strong>${c.points}</strong></div>`).join('')||'<p class="menu-empty">No club has league points yet this season.</p>'}</div>
      ${signedIn()&&!d.myClub&&(d.clubs||[]).length?'<p class="menu-empty">Join a club to play for it in the league.</p>':''}
      ${d.badges.length?`<h4>Your season badges</h4><div class="pp-badges">${d.badges.map(b=>{const [y,m,div]=b.id.replace(/^season-/,'').split('-');return `<span class="achievement earned"><span class="achievement-mark">S</span><b>${escapeHtml(div[0].toUpperCase()+div.slice(1))} · ${y}-${m}</b></span>`}).join('')}</div>`:''}
    </article>`;
    wireCommunityTabs();
    target.querySelectorAll('[data-division]').forEach(b=>b.onclick=()=>void renderLeague(Number(b.dataset.division)));
    target.querySelectorAll('.league-table:not(.club-league) b').forEach(b=>{b.classList.add('pp-link');b.onclick=()=>void openProfile(b.textContent)});
    target.querySelectorAll('.club-league b[data-club]').forEach(b=>{b.classList.add('pp-link');b.onclick=()=>void openClub(b.dataset.club)});
  }catch(error){toast(error.message)}
}
if(params.get('club'))setTimeout(()=>void openClub(String(params.get('club')).slice(0,32)),500);
if(params.get('battle'))setTimeout(()=>void joinBattle(String(params.get('battle')).slice(0,6)),600);
if(params.get('ladder'))setTimeout(()=>void renderLadder(),600);
if(params.get('analysis'))setTimeout(()=>void joinAnalysis(String(params.get('analysis')).slice(0,12)),600);
if(params.get('simul'))setTimeout(()=>void renderSimul(String(params.get('simul')).slice(0,40)),600);
// ---- Conditional moves in daily games (src/plan-moves.js; the server plays the reply) ----
let planSession=null,planLines={gameId:null,lines:[]};
function planAvailable(){return isOnlineGame()&&!!myColor&&!!serverGame?.daily_days&&serverGame.status==='active'&&game.turn()!==myColor}
async function loadPlans(){
  if(!serverGameId||!serverGame?.daily_days)return;
  try{const out=await api.conditionalList(serverGameId);planLines={gameId:serverGameId,lines:out.lines||[]};syncPlanUi()}catch{}
}
function syncPlanUi(){
  const card=$('#planCard');if(!card)return;
  const show=!!planSession||planAvailable();card.classList.toggle('hidden',!show);if(!show)return;
  if(serverGameId&&planLines.gameId!==serverGameId){planLines={gameId:serverGameId,lines:[]};void loadPlans()}
  const fen=serverGame?.fen||game.fen(),saved=planLines.gameId===serverGameId?planLines.lines:[];
  const key=JSON.stringify([!!planSession,planSession?.moves,saved,fen]);if(card.dataset.key===key)return;card.dataset.key=key;
  card.innerHTML=planSession
    ?`<div><b>Planning</b><small>${planSession.moves.length?escapeHtml(planText(planSession.fen,planSession.moves)):'Play the move you expect, then your reply. Add more pairs if you like.'}</small></div><div><button type="button" data-plan="undo"${planSession.moves.length?'':' disabled'}>Undo</button><button type="button" data-plan="cancel">Cancel</button><button type="button" data-plan="save" class="primary"${planReady(planSession.moves)?'':' disabled'}>Save plan</button></div>`
    :`<div><b>Plan your replies</b><small>${saved.length?`${saved.length} saved · played for you if the move matches`:'If they play the move you expect, your reply goes in at once.'}</small>${saved.length?`<ul class="plan-list">${saved.map((l,i)=>`<li><span>${escapeHtml(planText(fen,l))}</span><button type="button" data-plan-remove="${i}" aria-label="Remove plan">Remove</button></li>`).join('')}</ul>`:''}</div><div><button type="button" data-plan="start" class="primary">Plan moves</button></div>`;
  card.querySelector('[data-plan="start"]')?.addEventListener('click',startPlan);
  card.querySelector('[data-plan="undo"]')?.addEventListener('click',()=>{planSession.moves.pop();game.undo();render();syncPlanUi()});
  card.querySelector('[data-plan="cancel"]')?.addEventListener('click',()=>exitPlan());
  card.querySelector('[data-plan="save"]')?.addEventListener('click',savePlan);
  card.querySelectorAll('[data-plan-remove]').forEach(b=>b.onclick=async()=>{const lines=saved.filter((_,i)=>i!==Number(b.dataset.planRemove));try{const out=await api.conditionalSet(serverGameId,lines);planLines={gameId:serverGameId,lines:out.lines};syncPlanUi()}catch(error){toast(error.message)}});
}
function startPlan(){
  if(!planAvailable())return;
  cancelPremove(false);browse=null;selected=null;
  planSession={gameId:serverGameId,version:serverVersion,fen:serverGame.fen,moves:[]};
  try{game.load(serverGame.fen)}catch{}
  render();syncPlanUi();toast('Planning: the board is yours for both sides');
}
function planMove(move){
  let made=null;try{made=game.move({from:move.from,to:move.to,promotion:move.promotion||'q'})}catch{}
  if(!made)return rejectMove(move.from,move.to);
  if(planSession.moves.length>=12){game.undo();return toast('Plans are up to 12 moves')}
  planSession.moves.push(made.from+made.to+(made.promotion||''));rememberLastMove(made);render({hint:made});afterBoardPaint(playTone);syncPlanUi();
}
function exitPlan({silent=false}={}){
  if(!planSession)return;planSession=null;
  try{if(serverGame?.fen)game.load(serverGame.fen)}catch{}
  render();syncPlanUi();if(!silent)toast('Back to the game');
}
async function savePlan(){
  if(!planSession||!planReady(planSession.moves))return;
  const lines=[...(planLines.gameId===serverGameId?planLines.lines:[]),planSession.moves];
  try{const out=await api.conditionalSet(serverGameId,lines);planLines={gameId:serverGameId,lines:out.lines};exitPlan({silent:true});toast('Plan saved')}catch(error){toast(error.message)}
}
const VARIANT_NOTES={dark:'Normal rules, but you only see your own pieces and the squares they can reach. The computer plays in the dark too: it sees only what its pieces see and remembers where it last saw yours.',blackout:'Three minutes. After every four of your moves, your next two are played blind: the pieces disappear until the lights come back. The computer goes blind on the same rhythm and plays from the board it remembers.'};
$$('[data-computer-variant]').forEach(b=>b.addEventListener('click',()=>{computerVariant=b.dataset.computerVariant;syncSpecialOpponent(null);$$('[data-computer-variant]').forEach(x=>x.classList.toggle('on',x===b));const note=$('#computerVariantNote');if(note){note.textContent=VARIANT_NOTES[computerVariant]||'';note.classList.toggle('hidden',!VARIANT_NOTES[computerVariant])}}));
// ---- Account: password, your data, delete ----
async function authPut(path,body,token){
  const response=await fetch(SUPABASE_URL+path,{method:'PUT',headers:{'content-type':'application/json',apikey:SUPABASE_PUBLISHABLE_KEY,authorization:'Bearer '+token},body:JSON.stringify(body)});
  const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.msg||data.message||data.error_description||'Could not update the password');return data;
}
async function openSetPassword({title='Set a new password',intro='Choose a new password for your account.'}={}){
  if(!authSession?.access_token)return openAccount();
  menus.close('account'); // the account dialog sits in the top layer; close it so this one is in front
  const body=document.createElement('div');body.className='report-form';
  body.innerHTML=`<p>${escapeHtml(intro)}</p><label><span>New password</span><input type="password" autocomplete="new-password" minlength="8" maxlength="72"></label><label><span>Repeat it</span><input type="password" autocomplete="new-password" minlength="8" maxlength="72"></label>`;
  for(;;){
    const ok=await vchDialog({title,body,actions:[{label:'Cancel',value:false},{label:'Save password',value:true,primary:true}]});if(!ok)return;
    const [a,b]=[...body.querySelectorAll('input')].map(i=>i.value);
    if(a.length<8){toast('Use at least 8 characters');continue}
    if(a!==b){toast('The passwords are different');continue}
    try{await authPut('/auth/v1/user',{password:a},authSession.access_token);toast('Password saved');return}catch(error){toast(error.message)}
  }
}
async function sendPasswordReset(){
  const email=$('#authEmail').value.trim();
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){$('#authMessage').textContent='Enter your email above, then tap "Forgot password?" again.';return}
  try{await authFetch(withAuthRedirect('/auth/v1/recover'),{email});$('#authMessage').textContent='If that email has an account, a reset link is on its way.'}
  catch(error){$('#authMessage').textContent=error.message}
}
async function downloadMyData(){
  try{
    const out=await api.accountExport(),blob=new Blob([JSON.stringify(out,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`vch-data-${(currentProfile?.username||'me').replace(/[^A-Za-z0-9_-]/g,'')}-${new Date().toISOString().slice(0,10)}.json`;
    document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000);toast('Your data is downloading');
  }catch(error){toast(error.message)}
}
async function deleteMyAccount(){
  const name=currentProfile?.username||'';menus.close('account');
  const body=document.createElement('div');body.className='report-form';
  body.innerHTML=`<p>This deletes your account, profile, portrait, friends, club membership, studies and push devices, and signs you out. Your past games stay in your opponents' histories as "Deleted player". It can't be undone.</p><label><span>Type your username (${escapeHtml(name)}) to confirm</span><input autocomplete="off" maxlength="20"></label>`;
  const ok=await vchDialog({title:'Delete your account?',body,actions:[{label:'Keep my account',value:false},{label:'Delete for good',value:true,primary:true}]});
  if(!ok)return;
  try{await api.accountDelete(body.querySelector('input').value);saveAuthSession(null);currentProfile=null;menus.close('account');await loadProfile().catch(()=>{});syncIdentityUI();toast('Your account was deleted',{duration:3200})}
  catch(error){toast(error.message)}
}
$('#forgotPassword')?.addEventListener('click',sendPasswordReset);
$('#changePassword')?.addEventListener('click',()=>void openSetPassword({title:'Change password'}));
$('#exportData')?.addEventListener('click',downloadMyData);
$('#deleteAccount')?.addEventListener('click',deleteMyAccount);

// ---- Moderation (admins only; the server refuses everyone else) ----
function isAdmin(){return signedIn()&&currentProfile?.role==='admin'}
function syncAdminUi(){$('#profileMenuModeration')?.classList.toggle('hidden',!isAdmin())}
async function renderModeration(){
  if(!isAdmin())return toast('Moderation is for admins');
  setPrimaryScreen('game');if(isMobileApp()){mTab='more';setMView('panel')}
  setDynamicView('moderation','Moderation',brandLoading('Loading cases…'));
  try{
    const d=await api.modQueue(),target=$('#dynamicView .view-content');if(!target)return;
    const reasons=r=>Object.entries(r).map(([k,v])=>`${v} ${k}`).join(' · ');
    target.innerHTML=`<article class="mod">
      <p class="trainer-intro">Reports and accuracy signals are leads for a person to check, not proof. Open a file, look at the games, then decide.</p>
      <h4>Open cases <small>${d.cases.length}</small></h4>
      ${d.cases.map(c=>`<button class="mod-case" data-mod="${escapeHtml(c.player.id)}"><span><b>${escapeHtml(c.player.username)}</b><small>${c.reports.length?`${c.reports.length} reports · ${escapeHtml(reasons(c.reasons))}`:'No reports'}${c.fairplay?` · ${c.fairplay.games_95_plus}/${c.fairplay.reviewed_games} games 95%+ · avg ${c.fairplay.avg_accuracy??'—'}%`:''}${c.sandbag?` · <span class="mod-sandbag" title="Quick rated losses: resigning, flagging or leaving within a few moves.">Possible sandbagging · ${Number(c.sandbag).toFixed(1)}</span>`:''}</small></span><em>${c.player.banned_at?'Suspended':c.player.muted_until&&Date.parse(c.player.muted_until)>Date.now()?'Muted':'Open'}</em></button>`).join('')||'<p class="menu-empty">Nothing to review.</p>'}
      <h4>Recent actions</h4><div class="pp-list">${d.log.map(l=>`<div><b>${escapeHtml(l.action)} · ${escapeHtml(l.player)}</b><span>${escapeHtml(l.note||'')}</span><small>${escapeHtml(new Date(l.created_at).toLocaleString())} · ${escapeHtml(l.moderator)}</small></div>`).join('')||'<p class="menu-empty">No actions yet.</p>'}</div>
    </article>`;
    target.querySelectorAll('[data-mod]').forEach(b=>b.onclick=()=>void openModFile(b.dataset.mod));
  }catch(error){toast(error.message)}
}
async function openModFile(playerId){
  setDynamicView('moderation','Moderation',brandLoading('Opening the file…'));
  try{
    const d=await api.modPlayer(playerId),p=d.player,target=$('#dynamicView .view-content');if(!target)return;
    const muted=p.muted_until&&Date.parse(p.muted_until)>Date.now();
    target.innerHTML=`<article class="mod">
      <header class="mod-head"><h4>${escapeHtml(p.username)}</h4><small>${p.account?'Account':'Guest'} · ${p.rating} blitz · ${p.rated_games} rated games${p.banned_at?` · <b class="mod-flag">Suspended</b> (${escapeHtml(p.ban_reason||'')})`:''}${muted?` · <b class="mod-flag">Muted until ${escapeHtml(new Date(p.muted_until).toLocaleString())}</b>`:''}</small></header>
      <div class="pp-actions">${muted?'<button data-act="unmute">Unmute</button>':'<button data-act="mute" data-hours="24">Mute 24h</button><button data-act="mute" data-hours="168">Mute 7 days</button>'}${p.banned_at?'<button data-act="unban">Lift suspension</button>':'<button data-act="ban" class="danger">Suspend</button>'}<button data-act="resolve">Mark reviewed</button><button data-act="dismiss">Dismiss reports</button><button class="mod-back">All cases</button></div>
      <h4>Reports <small>${d.reports.length}</small></h4><div class="pp-list">${d.reports.map(r=>`<div><b>${escapeHtml(r.reason)}</b><span>${escapeHtml(r.note||'—')}</span><small>${escapeHtml(r.status)} · ${escapeHtml(new Date(r.created_at).toLocaleDateString())}</small></div>`).join('')||'<p class="menu-empty">None.</p>'}</div>
      <h4>Accuracy measured by opponents <small>${d.signals.length}</small></h4><div class="pp-list">${d.signals.map(s=>`<div><b>${Number(s.accuracy).toFixed(1)}%</b><span>avg loss ${Number(s.avg_loss).toFixed(1)} · ${s.moves} moves</span><small>${escapeHtml(new Date(s.created_at).toLocaleDateString())}</small></div>`).join('')||'<p class="menu-empty">None.</p>'}</div>
      <h4>Recent games</h4><div class="pp-list mod-games">${d.games.map(g=>`<div><b>${escapeHtml(g.opponent||'Player')} · ${escapeHtml(g.result)}</b><span>${g.rated?'rated':'casual'} ${escapeHtml(g.pool)} · ${g.moves} plies · ${g.avg_move_s===null?'—':`${g.avg_move_s}s ± ${g.move_time_sd}s per move`}</span><small>${escapeHtml(new Date(g.ended_at).toLocaleDateString())}</small></div>`).join('')||'<p class="menu-empty">No finished games.</p>'}</div>
      <h4>History</h4><div class="pp-list">${d.log.map(l=>`<div><b>${escapeHtml(l.action)}</b><span>${escapeHtml(l.note||'')}</span><small>${escapeHtml(new Date(l.created_at).toLocaleString())}</small></div>`).join('')||'<p class="menu-empty">No actions yet.</p>'}</div>
    </article>`;
    target.querySelector('.mod-back').onclick=()=>void renderModeration();
    target.querySelectorAll('[data-act]').forEach(b=>b.onclick=async()=>{
      const action=b.dataset.act;let note='';
      if(action==='ban'||action==='mute'){
        const box=document.createElement('div');box.className='report-form';box.innerHTML=`<label><span>${action==='ban'?'Reason (the player sees it)':'Note (for the log)'}</span><textarea maxlength="300" rows="3"></textarea></label>`;
        const ok=await vchDialog({title:action==='ban'?`Suspend ${p.username}?`:`Mute ${p.username}?`,body:box,actions:[{label:'Cancel',value:false},{label:action==='ban'?'Suspend':'Mute',value:true,primary:true}]});if(!ok)return;
        note=box.querySelector('textarea').value;
      }
      try{await api.modAction({playerId:p.id,action,hours:Number(b.dataset.hours)||undefined,note});toast('Done');void openModFile(p.id)}catch(error){toast(error.message)}
    });
  }catch(error){toast(error.message);void renderModeration()}
}
$('#profileMenuModeration')?.addEventListener('click',()=>{menus.close('profile');void renderModeration()});
if(params.get('mod'))setTimeout(()=>{if(isAdmin())void renderModeration()},1200);
// ---- Chess960 castling online (server castle960.js decides; this only shows it early) ----
async function castleOnline(opt){
  if(onlineMovePending||!serverGameId)return;
  onlineMovePending=true;const before=game.fen(),version=serverVersion;
  try{
    game.load(applyCastle(before,opt));render();afterBoardPaint(playTone);
    const state=await api.move(serverGameId,version,{castle:opt.san,from:opt.kingFrom,to:opt.kingTo,clientMoveAt:Date.now()});
    onlineMovePending=false;applyServerState(state);broadcastAux('draw_hint',{from:realtimeClientId});
  }catch(error){onlineMovePending=false;try{game.load(before)}catch{}render();toast(error.message);void refreshServerState()}
}
// ---- Crazyhouse (src/crazyhouse.js): captured pieces go to your pocket; drop them instead of moving ----
function isZhGame(){const g=watchSession?.state||serverGame;return ['crazyhouse','bughouse'].includes(g?.variant)&&(isOnlineGame()||mode==='watch')}
// Bughouse mate is different: a check a dropped piece could block is not mate, and nobody is stalemated.
function zhGameStatus(){const st=zhClientState();return (watchSession?.state||serverGame)?.variant==='bughouse'?bughouseStatus(Chess,game,st):zhStatus(Chess,game,st)}
function zhClientState(){const g=watchSession?.state||serverGame||{};return zhState(g.zh_pockets,g.zh_promoted)}
function boardOver(){return isZhGame()?zhGameStatus().over:game.isGameOver()}
function zhDropTargets(type){if(!isZhGame())return [];return zhDrops(Chess,game,zhClientState()).filter(d=>d.drop===type).map(d=>d.to)}
// The pockets (Crazyhouse, Bughouse): the pieces waiting to be dropped. Yours glow while you can
// drop them; a capture flies into the pocket and its number counts up; a dropped piece flies
// from the pocket to its square (src/capture-tray.js).
function drawPockets(style,bars){
  const st=zhClientState(),mine=myColor&&isOnlineGame()&&serverGame?.status==='active'&&game.turn()===myColor;
  const key=`zh|${style}|${bars.top}|${JSON.stringify(st.pockets)}|${zhDropSelected}|${mine}`;if(syncCapturedTrays.key===key)return;syncCapturedTrays.key=key;
  const frame=`zh|${style}|${bars.top}`,fresh=trayMemory.frame!==frame;trayMemory.frame=frame;
  // In Bughouse a capture goes to the partner's pocket on the other board, so captures never fly here.
  // Your own drop is on the board before the server has it: the move just made comes first.
  const animate=!fresh&&motionScale()>0,move=(lastMoveCache.fen===game.fen()&&lastMoveCache.move)||boardLastMove(),bughouse=(watchSession?.state||serverGame)?.variant==='bughouse',dropped=animate&&move?.to&&(move.drop||/@/.test(String(move.san||'')))?String(move.drop||move.san.split('@')[0]).toLowerCase().slice(-1):null;
  const flights=[];
  for(const [id,color] of [['#topCaptured',bars.top],['#bottomCaptured',bars.bottom]]){
    const tray=$(id);if(!tray)continue;const pocket=st.pockets[color]||{},own=color===myColor,before=fresh?{}:trayMemory.pockets[color]||{};
    if(fresh||!tray.classList.contains('zh-pocket')){tray.classList.add('zh-pocket');tray.replaceChildren()}
    tray.querySelector('.zh-empty')?.remove();
    for(const t of ZH_PIECES){
      const n=pocket[t]||0,had=before[t]||0,caught=animate&&!bughouse&&n>had&&isCapture(move)&&!!move.to;let el=tray.querySelector(`.zh-piece[data-kind="${t}"]:not(.leaving)`);
      // The dropped piece sets off from where it waited.
      if(dropped===t&&n<had&&color===(move.color||color)&&el)flights.push({drop:true,from:el.getBoundingClientRect(),sq:move.to,key:color+t});
      if(!n){if(el){if(animate){el.classList.add('leaving');leave(el)}else el.remove()}continue}
      if(!el){
        el=document.createElement(own?'button':'span');el.className='zh-piece';el.dataset.kind=t;
        if(own){el.type='button';el.dataset.drop=t}
        el.innerHTML=`<img src="${pieceAssetFor(style,color+t)}" alt=""><b></b>`;
        const later=[...tray.children].find(x=>ZH_PIECES.indexOf(x.dataset.kind)>ZH_PIECES.indexOf(t));
        tray.insertBefore(el,later||null);
        if(animate&&!caught)popIn(el);
      }
      const badge=el.querySelector('b');if(badge.textContent!==String(n)){if(animate&&had&&n!==had)bump(badge);badge.textContent=String(n)}
      if(own){el.disabled=!mine;el.classList.toggle('on',zhDropSelected===t);el.setAttribute('aria-label',`Drop ${pieceNames[t]} (${n} in pocket)`)}
      // A capture lands in the pocket.
      if(caught)flights.push({into:el,sq:captureSquare(move),key:color+t});
    }
    if(!ZH_PIECES.some(t=>pocket[t]>0))tray.insertAdjacentHTML('beforeend','<small class="zh-empty">Pocket empty</small>');
    tray.setAttribute('aria-label',`Pocket: ${ZH_PIECES.filter(t=>pocket[t]>0).map(t=>`${pocket[t]} ${pieceNames[t]}`).join(', ')||'empty'}`);
    trayMemory.pockets[color]={...pocket};
  }
  for(const f of flights){
    if(f.into){flyIntoPlace(f.into.querySelector('img')||f.into,f.sq,f.key,style);continue}
    // A drop: the piece on its square waits, hidden, until its flight from the pocket lands.
    const piece=boardDom?.pieces.element(f.sq);if(!piece)continue;
    piece.classList.add('dropping');
    pieceFlight(()=>f.from,()=>document.querySelector(`#board .square[data-sq="${f.sq}"]`)?.getBoundingClientRect(),f.key,style).then(landed=>{piece.classList.remove('dropping');if(landed&&piece.isConnected)piece.firstChild?.animate?.([{transform:'scale(1.14)'},{transform:'scale(.95)',offset:.5},{transform:'scale(1)'}],{duration:300,easing:'ease-out'})});
  }
}
document.addEventListener('click',e=>{
  const b=e.target.closest?.('.zh-pocket [data-drop]');if(!b||b.disabled)return;
  const t=b.dataset.drop;zhDropSelected=zhDropSelected===t?null:t;selected=null;syncCapturedTrays.key='';render();
});
async function zhDropOnline(type,to){
  if(onlineMovePending||!serverGameId)return;
  const before=game.fen(),version=serverVersion,prev=serverGame,r=zhPlay(Chess,before,zhClientState(),{drop:type,to});
  if(!r)return rejectMove(to,to);
  onlineMovePending=true;
  try{
    game.load(r.fen);serverGame={...serverGame,zh_pockets:r.state.pockets};rememberLastMove({...r.move,from:null});syncCapturedTrays.key='';render();afterBoardPaint(playTone);
    const state=await api.move(serverGameId,version,{drop:type,to,clientMoveAt:Date.now()});
    onlineMovePending=false;applyServerState(state);
  }catch(error){onlineMovePending=false;serverGame=prev;try{game.load(before)}catch{}syncCapturedTrays.key='';render();toast(error.message);void refreshServerState()}
}
// ---- Studies (src/study.js): annotate a line, share it by link ----
// studySession is declared with the early state near the top (boardContext reads it on first render).
function freeBoard(){return !!planSession||!!studySession?.editing||!!exploreSession||!!repEdit||!!analysis}
function endStudy({restore=true}={}){
  if(!studySession)return;studySession=null;
  if(mode==='study'){mode='room';if(restore){game.reset();boardShapes=[];render();updateMoves()}}
}
function studyLine(){return studyPositions(studySession.startFen,studySession.moves)}
function showStudyPly(i){
  const line=studyLine();studySession.index=Math.max(0,Math.min(line.positions.length-1,i));
  try{game.load(line.positions[studySession.index])}catch{}
  selected=null;render();drawStudyPanel();
}
function studyMove(move){
  const s=studySession;let made=null;try{made=game.move({from:move.from,to:move.to,promotion:move.promotion||'q'})}catch{}
  if(!made)return rejectMove(move.from,move.to);
  if(s.index<s.moves.length){s.moves=s.moves.slice(0,s.index);toast('The line continues from here')}
  if(s.moves.length>=300){game.undo();return toast('Studies are up to 300 moves')}
  s.moves.push({san:made.san,comment:''});s.index=s.moves.length;s.dirty=true;
  rememberLastMove(made);render({hint:made});afterBoardPaint(playTone);drawStudyPanel();
}
function startStudy({startFen=null,code=null,title='',intro='',moves=[],mine=true,owner=''}={}){
  if(onlineGameBusy())return;
  cancelPremove(false);if(watchSession)stopWatching();if(archiveSession)leaveArchive({reset:false});
  puzzleSession=null;streakSession=null;planSession=null;
  if(isOnlineGame()||(mode==='computer'&&computerStarted)){stopOnlineSync();serverGameId=null;serverGame=null;computerStarted=false;currentBot=null;myColor=null}
  const fen=startFen||new Chess().fen();
  studySession={code,title,intro,startFen:fen,moves:moves.map(m=>({san:m.san,comment:m.comment||''})),index:0,editing:mine&&!code,mine,owner,dirty:false};
  mode='study';orientationSet=true;flipped=false;
  setPrimaryScreen('game');showStudyPly(code?0:studySession.moves.length);
}
function drawStudyPanel(){
  const s=studySession;if(!s)return;
  const line=studyLine(),labels=moveLabels(s.startFen,line.sans),current=s.index>0?s.moves[s.index-1]:null;
  const html=`<article class="study-panel">
    ${s.editing?`<input class="study-title" maxlength="80" placeholder="Study title" value="${escapeHtml(s.title)}"><textarea class="study-intro" maxlength="500" rows="2" placeholder="What is this study about? (optional)">${escapeHtml(s.intro)}</textarea>`
      :`<h4>${escapeHtml(s.title||'Study')}</h4><small class="study-by">by ${escapeHtml(s.owner||'you')}</small>${s.intro?`<p class="study-intro-text">${escapeHtml(s.intro)}</p>`:''}`}
    <div class="study-moves">${labels.map((l,i)=>`<button data-sply="${i+1}" class="${i+1===s.index?'current':''}${s.moves[i]?.comment?' has-note':''}">${escapeHtml(l)}</button>`).join('')||`<span class="menu-empty">${s.editing?'Play moves on the board for both sides.':'No moves.'}</span>`}</div>
    <div class="study-controls"><button data-snav="first" aria-label="Start">|‹</button><button data-snav="prev" aria-label="Previous">‹</button><button data-snav="next" aria-label="Next">›</button><button data-snav="last" aria-label="End">›|</button></div>
    ${current?(s.editing?`<label class="study-comment"><span>Note on ${escapeHtml(labels[s.index-1])}</span><textarea maxlength="500" rows="3" placeholder="Why this move? What's the idea?">${escapeHtml(current.comment)}</textarea></label>`:(current.comment?`<p class="study-note"><b>${escapeHtml(labels[s.index-1])}</b> ${escapeHtml(current.comment)}</p>`:'')):''}
    <div class="pp-actions">${s.editing?`<button class="study-undo"${s.moves.length?'':' disabled'}>Undo last move</button><button class="study-save primary">Save${s.code?'':' & get link'}</button>`:s.mine?'<button class="study-edit">Edit</button>':''}${s.code?'<button class="study-copy">Copy link</button>':''}<button class="study-close">Close</button></div>
  </article>`;
  if(currentRightView!=='study')setDynamicView('study','Study',html);else{const t=$('#dynamicView .view-content');if(t)t.innerHTML=html}
  const t=$('#dynamicView .view-content');if(!t)return;
  t.querySelectorAll('[data-sply]').forEach(b=>b.onclick=()=>showStudyPly(Number(b.dataset.sply)));
  t.querySelectorAll('[data-snav]').forEach(b=>b.onclick=()=>{const k=b.dataset.snav;showStudyPly(k==='first'?0:k==='prev'?s.index-1:k==='next'?s.index+1:s.moves.length)});
  t.querySelector('.study-title')?.addEventListener('input',e=>{s.title=e.target.value;s.dirty=true});
  t.querySelector('.study-intro')?.addEventListener('input',e=>{s.intro=e.target.value;s.dirty=true});
  t.querySelector('.study-comment textarea')?.addEventListener('input',e=>{if(s.index>0){s.moves[s.index-1].comment=e.target.value;s.dirty=true}});
  t.querySelector('.study-undo')?.addEventListener('click',()=>{s.moves.pop();s.dirty=true;showStudyPly(s.moves.length)});
  t.querySelector('.study-edit')?.addEventListener('click',()=>{s.editing=true;drawStudyPanel()});
  t.querySelector('.study-close')?.addEventListener('click',()=>{endStudy();showMovesView()});
  t.querySelector('.study-copy')?.addEventListener('click',async()=>{const url=studyUrl(s.code);try{await navigator.clipboard.writeText(url);toast('Study link copied')}catch{toast(url)}});
  t.querySelector('.study-save')?.addEventListener('click',async()=>{
    if(!signedIn())return openAccount();
    try{const out=await api.studySave({code:s.code||undefined,title:s.title||'Untitled study',intro:s.intro,startFen:s.startFen,moves:s.moves});s.code=out.study.code;s.dirty=false;toast('Study saved');drawStudyPanel()}catch(error){toast(error.message)}
  });
}
async function renderStudies(){
  setDynamicView('learn','Studies',brandLoading('Loading your studies…'));
  let mine=[];if(signedIn()){try{mine=(await api.studyList()).studies||[]}catch{}}
  const t=$('#dynamicView .view-content');if(!t)return;
  t.innerHTML=`<article class="studies">
    <p class="trainer-intro">Write up a line: play the moves, add a note to any move, and share the link with a friend or your club.</p>
    <div class="pp-actions"><button class="study-new primary">New study from the start</button><button class="study-here">From the board position</button></div>
    <form class="study-open club-say"><input maxlength="8" placeholder="Open a study code" required><button type="submit">Open</button></form>
    <h4>My studies <small>${mine.length}</small></h4>
    ${signedIn()?(mine.map(x=>`<div class="club-row" data-study="${escapeHtml(x.code)}"><div><b>${escapeHtml(x.title)}</b><small>${x.views} views · ${escapeHtml(new Date(x.updated_at).toLocaleDateString())}</small></div><button class="club-open">Open</button><button class="study-del" aria-label="Delete study">Delete</button></div>`).join('')||'<p class="menu-empty">No studies yet.</p>'):'<p class="menu-empty">Sign in to save studies. You can still open one by its code.</p>'}
  </article>`;
  t.querySelector('.study-new').onclick=()=>startStudy({});
  t.querySelector('.study-here').onclick=()=>startStudy({startFen:game.fen()});
  t.querySelector('.study-open').onsubmit=e=>{e.preventDefault();void openStudy(e.target.querySelector('input').value.trim())};
  t.querySelectorAll('[data-study]').forEach(r=>{r.querySelector('.club-open').onclick=()=>void openStudy(r.dataset.study);r.querySelector('.study-del').onclick=async()=>{try{await api.studyDelete(r.dataset.study);toast('Study deleted');void renderStudies()}catch(error){toast(error.message)}}});
}
async function openStudy(code){
  if(!code)return;
  try{const {study}=await api.studyGet(code);startStudy({startFen:study.start_fen,code:study.code,title:study.title,intro:study.intro,moves:study.moves,mine:study.mine,owner:study.owner});if(isMobileApp()){mTab='learn';setMView('panel')}}
  catch(error){toast(error.message)}
}
if(params.get('study'))setTimeout(()=>void openStudy(String(params.get('study')).slice(0,8)),500);
// ---- Coach mode vs the computer (src/coach.js). Never in games against people. ----
const coachWorker=lazyWorker('/stockfish.worker.js');let coachPending=null,coachSeq=0,coachShown=null;
coachWorker.onmessage=({data})=>{
  if(!coachPending||data.requestId!==coachPending.id)return;
  const line=String(data.line||'');
  if(data.type==='uci'&&line.startsWith('info ')){const parsed=parseReviewInfo(line,coachPending.fen);if(parsed)coachPending.latest=parsed}
  if((data.type==='uci'&&line.startsWith('bestmove '))||data.type==='unavailable'){const p=coachPending;coachPending=null;clearTimeout(p.timer);p.resolve({...p.latest,bestMove:line.split(/\s+/)[1]||p.latest.bestMove})}
};
function coachAnalyze(fen){
  return new Promise(resolve=>{
    const id=`coach-${++coachSeq}`;
    const timer=setTimeout(()=>{if(coachPending?.id===id){coachPending=null;coachWorker.postMessage({action:'stop'});resolve(null)}},12000);
    coachPending={id,fen,latest:{cp:0,depth:0,pv:'',bestMove:''},resolve,timer};
    coachWorker.postMessage({mode:'analysis',fen,depth:12,requestId:id});
  });
}
function coachOn(){try{return localStorage.getItem('vch.coach')==='1'}catch{return false}}
function syncCoachToggle(){$$('[data-coach]').forEach(b=>b.classList.toggle('on',(b.dataset.coach==='on')===coachOn()))}
$$('[data-coach]').forEach(b=>b.addEventListener('click',()=>{try{localStorage.setItem('vch.coach',b.dataset.coach==='on'?'1':'0')}catch{}syncCoachToggle();if(!coachOn())hideCoach()}));
syncCoachToggle();
function hideCoach(){coachShown=null;$('#coachCard')?.classList.add('hidden')}
async function coachAfterMove(made){
  if(!coachOn()||mode!=='computer'||!made?.before)return;
  if(computerRules==='dark'||computerRules==='blackout')return; // the coach would light up the dark
  const key=made.after;coachShown=key;
  const card=$('#coachCard');if(card){card.className='draw-offer-card coach-card thinking';card.innerHTML='<div><b>Coach</b><small>Looking at your move…</small></div>'}
  const before=await coachAnalyze(made.before);if(coachShown!==key||!before?.bestMove)return;
  const after=await coachAnalyze(made.after);if(coachShown!==key||!after)return;
  const uci=`${made.from}${made.to}${made.promotion||''}`;
  const classification=classifyMove({beforeCp:before.cp,afterCp:after.cp,color:made.color,isBook:isBookMove(game.history({verbose:true}),game.history().length-1),isBest:uci===before.bestMove,isSacrifice:false});
  const note=coachNote({fenBefore:made.before,playedUci:uci,playedSan:made.san,bestUci:before.bestMove,classification,fenAfter:made.after,replyUci:after.bestMove});
  if(!card||coachShown!==key)return;
  card.className=`draw-offer-card coach-card tone-${note.tone}`;
  card.innerHTML=`<div><b>${escapeHtml(note.title)}</b><small>${escapeHtml(note.text)}</small></div><div>${note.best?'<button type="button" data-coach-show>Show</button>':''}<button type="button" data-coach-close>OK</button></div>`;
  card.querySelector('[data-coach-show]')?.addEventListener('click',()=>{boardShapes=[{from:note.best.slice(0,2),to:note.best.slice(2,4),brush:'green'}];render()});
  card.querySelector('[data-coach-close]').addEventListener('click',()=>{boardShapes=[];render();hideCoach()});
}
// ---- Swiss and player-run tournaments ----
const EVENT_TIMES=[['180-2','3+2'],['300-0','5+0'],['600-0','10+0'],['900-10','15+10']];
async function openCreateTournament(){
  if(!signedIn())return openAccount();
  let club=null;try{const out=await api.clubList();if(out.mine?.role==='owner')club=out.mine}catch{}
  const start=new Date(Date.now()+30*60000);start.setSeconds(0,0);
  const local=new Date(start.getTime()-start.getTimezoneOffset()*60000).toISOString().slice(0,16);
  const body=document.createElement('div');body.className='report-form event-form';
  body.innerHTML=`<label><span>Name</span><input name="name" maxlength="40" placeholder="Friday blitz"></label>
    <div class="rated-switch"><button type="button" class="on" data-ef="arena">Arena</button><button type="button" data-ef="swiss">Swiss</button></div>
    <div class="time-chips">${EVENT_TIMES.map(([v,l],i)=>`<button type="button" data-et="${v}"${i===1?' class="on"':''}>${l}</button>`).join('')}</div>
    <label><span>Starts</span><input name="start" type="datetime-local" value="${local}"></label>
    <label class="ef-arena"><span>Length (minutes)</span><input name="minutes" type="number" min="20" max="180" value="60"></label>
    <label class="ef-swiss hidden"><span>Rounds</span><input name="rounds" type="number" min="3" max="11" value="5"></label>
    <label class="check"><input name="rated" type="checkbox"> Rated</label>
    ${club?`<label class="check"><input name="club" type="checkbox"> Only for ${escapeHtml(club.name)} members</label>`:''}`;
  let format='arena',time='300-0';
  body.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
    if(b.dataset.ef){format=b.dataset.ef;body.querySelectorAll('[data-ef]').forEach(x=>x.classList.toggle('on',x===b));body.querySelector('.ef-arena').classList.toggle('hidden',format!=='arena');body.querySelector('.ef-swiss').classList.toggle('hidden',format!=='swiss')}
    if(b.dataset.et){time=b.dataset.et;body.querySelectorAll('[data-et]').forEach(x=>x.classList.toggle('on',x===b))}});
  const ok=await vchDialog({title:'Create a tournament',body,actions:[{label:'Cancel',value:false},{label:'Create',value:true,primary:true}]});if(!ok)return;
  const f=n=>body.querySelector(`[name="${n}"]`),[seconds,increment]=time.split('-').map(Number);
  try{
    await api.tournamentCreate({name:f('name').value,format,seconds,increment,rated:f('rated').checked,startsAt:new Date(f('start').value).toISOString(),minutes:Number(f('minutes').value),rounds:Number(f('rounds').value),clubSlug:f('club')?.checked?club.slug:undefined});
    toast('Tournament created');showBackendView('arena');
  }catch(error){toast(error.message)}
}
// ---- Spectator reactions (Watch only; text chips, never shown to the players) ----
const REACTIONS=[['wow','Wow'],['brilliant','!!'],['blunder','??'],['gg','GG'],['tense','Tense']];
let lastReactionAt=0;
function syncReactionBar(){
  let bar=$('#reactionBar');
  if(mode!=='watch'||!watchSession){bar?.classList.add('hidden');return}
  if(!bar){bar=document.createElement('div');bar.id='reactionBar';bar.className='reaction-bar';bar.setAttribute('aria-label','React');bar.innerHTML=REACTIONS.map(([id,l])=>`<button type="button" data-react="${id}">${l}</button>`).join('');$('.board-shell')?.after(bar);
    bar.addEventListener('click',e=>{const id=e.target.closest('[data-react]')?.dataset.react;if(!id||!watchSession?.channel)return;if(Date.now()-lastReactionAt<2000)return toast('One reaction every two seconds');lastReactionAt=Date.now();watchSession.channel.send({type:'broadcast',event:'reaction',payload:{r:id}}).catch(()=>{});showReaction(id)})}
  bar.classList.remove('hidden');
}
function showReaction(id){
  const label=REACTIONS.find(([r])=>r===id)?.[1];if(!label)return; // only the known set is ever shown
  const shell=$('.board-shell');if(!shell)return;
  const chip=document.createElement('span');chip.className='reaction-float';chip.textContent=label;chip.style.left=`${15+Math.random()*70}%`;
  chip.addEventListener('animationend',()=>chip.remove(),{once:true});setTimeout(()=>chip.remove(),3000);shell.append(chip);
}
// ---- Opening explorer from VCH games (server: opening_explorer) ----
// exploreSession is declared with the early state near the top (boardContext reads it on first render).
function endExplore({restore=true}={}){
  if(!exploreSession)return;exploreSession=null;
  if(explorerEval){explorerWorker.postMessage({action:'stop'});explorerEval=null}
  if(mode==='explore'){mode='room';if(restore){game.reset();boardShapes=[];render();updateMoves()}}
}
function startExplorer(){
  if(liveGameOn()&&mode!=='computer')return toast('The explorer opens after your game');
  cancelPremove(false);if(watchSession)stopWatching();if(archiveSession)leaveArchive({reset:false});
  puzzleSession=null;streakSession=null;planSession=null;if(studySession)endStudy({restore:false});
  if(mode==='computer'&&computerStarted){computerStarted=false;currentBot=null;myColor=null}
  exploreSession={start:game.fen(),line:[]};mode='explore';orientationSet=true;
  setPrimaryScreen('game');render();void drawExplorer();
}
function exploreMove(move){
  let made=null;try{made=game.move({from:move.from,to:move.to,promotion:move.promotion||'q'})}catch{}
  if(!made)return rejectMove(move.from,move.to);
  exploreSession.line.push(made.san);rememberLastMove(made);render({hint:made});afterBoardPaint(playTone);void drawExplorer();
}
// Engine scores for the explorer rows (a separate worker: never the live-game engine).
const explorerWorker=lazyWorker('/stockfish.worker.js');let explorerEval=null,explorerEvalSeq=0;
explorerWorker.onmessage=({data})=>{
  const job=explorerEval;if(!job||data.requestId!==job.id)return;
  const line=String(data.line||'');
  if(data.type==='uci'){const s=parseMultiPv(line,job.fen);if(s&&(!job.scores.get(s.uci)||s.depth>=job.scores.get(s.uci).depth)){job.scores.set(s.uci,s);paintExplorerEval(job)}}
  if((data.type==='uci'&&line.startsWith('bestmove '))||data.type==='unavailable'){job.done=true;paintExplorerEval(job);explorerEval=null}
};
function startExplorerEval(fen,ucis){
  if(explorerEval)explorerWorker.postMessage({action:'stop'});
  const id=`explore-${++explorerEvalSeq}`;
  explorerEval={id,fen,ucis,scores:new Map(),done:false};
  explorerWorker.postMessage({mode:'analysis',fen,depth:10,requestId:id,multipv:ucis.length?Math.min(10,ucis.length):3,...(ucis.length?{searchmoves:ucis}:{})});
}
function paintExplorerEval(job){
  const slot=$('#dynamicView .explorer-table');if(!slot||!exploreSession||game.fen()!==job.fen)return;
  for(const cell of slot.querySelectorAll('.ex-eval[data-uci]')){const s=job.scores.get(cell.dataset.uci);if(!s){if(job.done)cell.textContent='—';continue}cell.textContent=formatScore(s);const v=scoreValue(s);cell.classList.toggle('good',v>=50);cell.classList.toggle('bad',v<=-50)}
  const top=slot.querySelector('.ex-engine-top');
  if(top){
    const best=[...job.scores.values()].sort((a,b)=>a.multipv-b.multipv).slice(0,3);
    top.innerHTML=best.length?best.map(s=>{let san=s.uci;try{san=new Chess(job.fen).move({from:s.uci.slice(0,2),to:s.uci.slice(2,4),promotion:s.uci[4]||undefined}).san}catch{}return `<button class="ex-row ex-engine" data-san="${escapeHtml(san)}"><b>${escapeHtml(san)}</b><span class="ex-eval">${formatScore(s)}</span><span></span><span></span></button>`}).join(''):`<p class="menu-empty">${job.done?'—':brandLoading('Thinking…')}</p>`;
    top.querySelectorAll('[data-san]').forEach(b=>b.onclick=()=>exploreSan(b.dataset.san));
  }
}
function exploreSan(san){let made=null;try{made=game.move(san)}catch{}if(!made)return;exploreSession.line.push(made.san);rememberLastMove(made);render({hint:made});afterBoardPaint(playTone);void drawExplorer()}
async function drawExplorer(){
  if(!exploreSession)return;
  const src=exploreSession.source||'all',mine=src==='mine';
  const fen=game.fen(),html=`<article class="explorer"><p class="trainer-intro">${mine?'What you chose in this position, and how it went.':'What VCH players chose in this position, and how it went. Play moves on the board or tap a row.'}</p><div class="ex-source" role="group" aria-label="Games"><button type="button" class="ex-src${mine?'':' on'}" data-src="all" aria-pressed="${!mine}">All players</button><button type="button" class="ex-src${mine?' on':''}" data-src="mine" aria-pressed="${mine}">Your games</button></div><div class="explorer-line">${exploreSession.line.length?escapeHtml(exploreSession.line.join(' ')):'Start position'}</div><div class="pp-actions"><button class="ex-back"${exploreSession.line.length?'':' disabled'}>Back one move</button><button class="ex-reset">Start position</button><button class="ex-close">Close</button></div>${exploreSession.line.length?'<div class="pp-actions ex-rep"><button class="ex-addrep" data-color="w">Save line as White</button><button class="ex-addrep" data-color="b">Save line as Black</button></div>':''}<div class="explorer-table">${brandLoading('Looking up games…')}</div><small class="ex-note">Engine score for each move · Stockfish 19</small></article>`;
  if(currentRightView!=='explorer')setDynamicView('explorer','VCH explorer',html);else{const t=$('#dynamicView .view-content');if(t)t.innerHTML=html}
  const t=$('#dynamicView .view-content');if(!t)return;
  t.querySelector('.ex-back').onclick=()=>{if(!exploreSession.line.length)return;game.undo();exploreSession.line.pop();boardShapes=[];render();void drawExplorer()};
  t.querySelector('.ex-reset').onclick=()=>{game.reset();exploreSession.line=[];render();void drawExplorer()};
  t.querySelector('.ex-close').onclick=()=>{if(explorerEval){explorerWorker.postMessage({action:'stop'});explorerEval=null}endExplore();showMovesView()};
  t.querySelectorAll('.ex-addrep').forEach(b=>b.onclick=()=>void addRepLine(b.dataset.color,[...exploreSession.line]));
  if(!repertoire)void loadRepertoire().then(()=>{if(exploreSession&&game.fen()===fen)markRepRows(fen)});
  t.querySelectorAll('.ex-src').forEach(b=>b.onclick=()=>{if(exploreSession.source===b.dataset.src)return;exploreSession.source=b.dataset.src;void drawExplorer()});
  const slot=t.querySelector('.explorer-table');
  if(mine&&!signedIn()){slot.innerHTML='<p class="menu-empty">Sign in to see your own games</p>';return}
  try{
    const out=await api.openingExplorer(fen,{mine});if(!exploreSession||game.fen()!==fen||(exploreSession.source||'all')!==src)return;
    const rows=explorerRows(out.moves||[]),uci=san=>{try{const m=new Chess(fen).move(san);return m.from+m.to+(m.promotion||'')}catch{return ''}};
    const withUci=rows.map(r=>({...r,uci:uci(r.san)}));
    slot.innerHTML=rows.length?`<div class="ex-head"><span>Move</span><span>Games</span><span>White · Draw · Black</span><span>Engine</span></div>${withUci.map(r=>`<button class="ex-row" data-san="${escapeHtml(r.san)}"><b>${escapeHtml(r.san)}</b><span>${r.games} <small>${r.share}%</small></span><span class="ex-bar" aria-label="White ${r.white}%, draws ${r.draws}%, Black ${r.black}%"><i class="w" style="width:${r.white}%">${r.white>=14?r.white+'%':''}</i><i class="d" style="width:${r.draws}%">${r.draws>=14?r.draws+'%':''}</i><i class="b" style="width:${r.black}%">${r.black>=14?r.black+'%':''}</i></span><span class="ex-eval"${withUci.indexOf(r)<10&&r.uci?` data-uci="${r.uci}"`:''}>${withUci.indexOf(r)<10&&r.uci?'…':'—'}</span></button>`).join('')}<p class="ex-total">${out.total} games from this position</p>`
      :`<p class="menu-empty">${mine?"You haven't reached this position in a finished game yet.":'No VCH games reached this position yet.'}</p><div class="ex-head ex-engine-head"><span>Engine's top moves</span></div><div class="ex-engine-top"><p class="menu-empty">${brandLoading('Thinking…')}</p></div>`;
    slot.querySelectorAll('.ex-row[data-san]').forEach(b=>b.onclick=()=>exploreSan(b.dataset.san));
    markRepRows(fen);
    if(!game.isGameOver())startExplorerEval(fen,withUci.slice(0,10).map(r=>r.uci).filter(Boolean));
  }catch(error){slot.innerHTML=`<p class="menu-empty">${escapeHtml(error.message)}</p>`}
}
// ---- Notifications inbox (bell + full page) ----
let inboxState={items:[],unread:0,available:true};
async function refreshInbox(){
  if(!signedIn())return;
  try{const out=await api.notifications();inboxState={items:out.notifications||[],unread:Number(out.unread||0),available:true}}catch{inboxState.available=false}
  renderNotifyList();if(currentRightView==='notifications')drawNotificationsPage();
}
function inboxHtml(n){
  return `<button class="inbox-row${n.read_at?'':' unread'}" data-inbox="${escapeHtml(n.id)}" data-url="${escapeHtml(safeNotificationUrl(n.url))}"><i class="inbox-kind k-${escapeHtml(n.kind)}">${escapeHtml(KIND_LABEL[n.kind]||'VCH')}</i><span><b>${escapeHtml(n.title)}</b>${n.body?`<small>${escapeHtml(n.body)}</small>`:''}</span><em>${escapeHtml(timeAgo(n.created_at))}</em></button>`;
}
function wireInbox(root){
  root.querySelectorAll('[data-inbox]').forEach(b=>b.onclick=async()=>{
    const url=safeNotificationUrl(b.dataset.url);
    void api.notificationsRead([b.dataset.inbox]).catch(()=>{});
    if(url==='/'){b.classList.remove('unread');return void refreshInbox()}
    location.assign(url);
  });
}
async function drawNotificationsPage(){
  const html=`<article class="inbox-page"><div class="pp-actions"><button class="inbox-readall"${inboxState.unread?'':' disabled'}>Mark all as read</button></div><div class="inbox-list">${inboxState.items.map(inboxHtml).join('')||'<p class="menu-empty">Nothing yet. Challenges, your-move alerts, tournament rounds, club messages and achievements land here.</p>'}</div></article>`;
  if(currentRightView!=='notifications')setDynamicView('notifications','Notifications',html);else{const t=$('#dynamicView .view-content');if(t)t.innerHTML=html}
  const t=$('#dynamicView .view-content');if(!t)return;wireInbox(t);
  t.querySelector('.inbox-readall').onclick=async()=>{try{await api.notificationsRead();await refreshInbox()}catch(error){toast(error.message)}};
}
async function openNotifications(){
  if(!signedIn())return openAccount();
  menus.close('notifications');setPrimaryScreen('game');if(isMobileApp()){mTab='more';setMView('panel')}
  setDynamicView('notifications','Notifications',brandLoading('Loading…'));await refreshInbox();drawNotificationsPage();
}
if(params.get('profile'))setTimeout(()=>{if(signedIn())openAccount()},900);
if(params.get('league'))setTimeout(()=>{openSection('friends');void renderLeague()},900);
if(params.get('challenges'))setTimeout(()=>{setPrimaryScreen('game');openSection('friends')},400);

// ---- Watch: public live games, read-only (server watch_state + Realtime) ----
// Watch has two tabs: VCH games being played now, and chess streamers live on Twitch or
// YouTube (from Lichess's public list, through the chess function). Streams open in a new tab.
let watchTab='games';
const watchTabs=()=>`<div class="watch-tabs" role="tablist"><button type="button" role="tab" data-watch-tab="games" class="${watchTab==='games'?'on':''}">VCH games</button><button type="button" role="tab" data-watch-tab="streams" class="${watchTab==='streams'?'on':''}"><i class="live-dot" aria-hidden="true"></i>Streamers live</button></div>`;
function wireWatchTabs(){$$('#dynamicView [data-watch-tab]').forEach(b=>b.onclick=()=>{watchTab=b.dataset.watchTab;void renderWatch()})}
async function renderStreams(){
  setDynamicView('watch','Watch',watchTabs()+brandLoading('Finding streamers…'));wireWatchTabs();
  try{
    const {streams=[]}=await api.request('live_streams'),target=$('#dynamicView .view-content');if(!target||currentRightView!=='watch'||watchTab!=='streams')return;
    const card=x=>`<article class="stream-card service-${x.service}"><div class="stream-head"><span class="stream-badge">${x.service==='youtube'?'YouTube':'Twitch'}</span>${x.lang?`<em>${escapeHtml(x.lang.toUpperCase())}</em>`:''}<i class="live-dot" aria-hidden="true"></i></div><b>${x.title?`<span class="stream-title">${escapeHtml(x.title)}</span> `:''}${escapeHtml(x.name)}</b><p>${escapeHtml(x.status||x.headline||'')}</p><div class="stream-actions"><a class="library-action" href="${escapeHtml(x.url)}" target="_blank" rel="noopener noreferrer">Watch on ${x.service==='youtube'?'YouTube':'Twitch'}</a><a class="library-action ghost" href="${escapeHtml(x.profile)}" target="_blank" rel="noopener noreferrer">Profile</a></div></article>`;
    target.innerHTML=watchTabs()+(streams.length?`<p class="watch-intro">Chess streamers live now. Streams open on Twitch or YouTube in a new tab.</p><div class="stream-grid">${streams.map(card).join('')}</div><p class="stream-source">Live list from Lichess's streamer directory. <button type="button" class="watch-refresh">Refresh</button></p>`:`<div class="watch-empty"><h4>No streamers live right now</h4><p>Check back soon: the list refreshes every minute.</p><button type="button" class="watch-refresh">Refresh</button></div>`);
    wireWatchTabs();target.querySelector('.watch-refresh')?.addEventListener('click',()=>void renderStreams());
  }catch(error){toast(error.message)}
}
async function renderWatch(){
  if(watchTab==='streams')return renderStreams();
  setDynamicView('watch','Watch',watchTabs()+brandLoading('Finding live games…'));wireWatchTabs();
  try{
    const [{games=[]},moment]=await Promise.all([api.liveGames(),loadMoment()]),target=$('#dynamicView .view-content');if(!target||currentRightView!=='watch')return;
    target.innerHTML=watchTabs()+momentHtml(moment)+(games.length?`<p class="watch-intro">Live games from matchmaking and arenas. Private rooms are never listed, and no engine help is shown while a game is on.</p><div class="watch-grid">${games.map((g,i)=>`<button type="button" class="watch-card" data-watch="${i}">${studyBoardHtml(g.fen)}<span class="watch-meta"><span><b>${escapeHtml(g.white_name||'White')}</b><em>${escapeHtml(String(g.white_rating_before||''))}</em></span><span><b>${escapeHtml(g.black_name||'Black')}</b><em>${escapeHtml(String(g.black_rating_before||''))}</em></span><small>${formatTimeControl(g.time_control_seconds||600,g.increment_seconds||0)} · ${g.rated?'Rated':'Casual'} · move ${Math.max(1,Math.ceil(Number(g.move_count||0)/2))}</small></span></button>`).join('')}</div><button type="button" class="watch-refresh">Refresh</button>`
      :`<div class="watch-empty"><h4>No live games right now</h4><p>Games from matchmaking and arenas appear here while they're played. Private rooms are never listed.</p><button type="button" class="watch-refresh">Refresh</button></div>`);
    wireMoment(target,moment);wireWatchTabs();
    target.querySelectorAll('[data-watch]').forEach(el=>el.onclick=()=>startWatching(games[Number(el.dataset.watch)].id));
    target.querySelector('.watch-refresh')?.addEventListener('click',()=>void renderWatch());
  }catch(error){toast(error.message)}
}
// An online game in progress keeps its board: views that would replace it wait until it ends.
function onlineGameBusy(){
  const here=isOnlineGame()&&liveGameOn(),away=liveAway();if(!here&&!away)return false;
  toast('Finish your game first',away?{duration:3600,actionLabel:'Back to your game',onAction:()=>void returnToLiveGame()}:{});return true;
}
async function startWatching(id){
  if(onlineGameBusy())return;
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
    // Spectators listen on the public watch topic: the server sends the trimmed watch fields
    // there; the players' own topic is private (security review C1).
    watchSession.channel=realtimeClient.channel(`watch:${id}`)
      .on('broadcast',{event:'state'},message=>{const state=message?.payload?.game;if(watchSession?.id===id&&state?.id===id)applyWatchState({game:state,serverNow:message.payload.serverNow})})
      .on('broadcast',{event:'reaction'},message=>showReaction(String(message?.payload?.r||'')))
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
  if(over&&!watchSession.over){watchSession.over=true;toast(`Game over · ${state.result||''}${state.end_reason?` · ${normalizedEndReason(state.end_reason)}`:''}`)}
}
// The mover's instant relay reaches spectators too: show it at once if it fits the board.
function stopWatching({reset=true}={}){$('#reactionBar')?.classList.add('hidden');
  const session=watchSession;if(!session)return;
  watchSession=null;clearInterval(session.timer);if(session.channel)realtimeClient.removeChannel(session.channel).catch(()=>{});
  if(mode==='watch')mode=session.prevMode||'room';
  if(reset){clockSnapshot=null;browse=null;game.reset();lastMoveCache={fen:'',move:null};render({instant:true});updateMoves();syncPlayerBars()}
}
function syncWatchBars(){
  syncReactionBar();
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
  return browseLine(records,game.fen(),reviewStartFen());
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
  // Board tools (endgames, studies, explorer, repertoire, prep, analyse together) open the board on phones too.
  if(egSession)return `endgame:${egSession.drill?.id||egSession.drill?.name||''}`;
  if(lessonSession&&mode==='lesson')return `lesson:${lessonSession.lesson.id}`;
  if(studySession)return `study:${studySession.code||'new'}`;
  if(exploreSession)return 'explore';
  if(repEdit)return `repertoire:${repEdit.color}`;
  if(prepSession)return `prep:${prepSession.color}`;
  if(analysis)return `analysis:${analysis.code}`;
  if(liveGameOn())return lastGameStartKey||`game:${serverGameId||'computer'}`;
  if(serverGameId&&serverGame?.status==='waiting')return `waiting:${serverGameId}`;
  return null;
}
function gameFinished(){
  if(puzzleSession)return false;
  if(mode==='computer')return computerStarted&&(localGameOver||game.isGameOver());
  return !!serverGameId&&!!serverGame&&!['waiting','active','playing','in_progress'].includes(serverGame.status);
}
function setMView(view){if(view){mView=view;syncMobileShell();window.scrollTo(0,0);recordNav()}}
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
  if(shell.dataset.mview!==mView){const first=!shell.dataset.mview;shell.dataset.mview=mView;if(!first)markEntering(mView)}
  if(key?.startsWith('waiting:'))syncMoveStrip([]);
  const tab=mView==='game'||mView==='review'?'play':mTab;
  $$('[data-m-tab]').forEach(button=>button.classList.toggle('on',button.dataset.mTab===tab));
  const over=gameFinished(),live=liveGameOn(),online=!!serverGameId&&mode!=='computer',human=online&&!serverGame?.bot_player_id&&!currentBot;
  shell.classList.toggle('m-over',over);
  const show=(action,visible)=>$(`[data-m-action="${action}"]`)?.classList.toggle('hidden',!visible);
  const watching=!!watchSession;
  const puzzling=!!puzzleSession,puzzleMode=mode==='puzzle'; // after a solve the session ends but you're still in puzzles
  show('puzzle-next',puzzleMode&&!streakSession);show('puzzle-streak',puzzleMode&&!streakSession);show('puzzle-menu',puzzleMode&&!streakSession);show('puzzle-skip',puzzling&&!!streakSession&&loadSkips().tokens>0);show('puzzle-end',puzzling&&!!streakSession);
  show('options',true);show('draw',human&&live);show('resign',live);show('takeback',takebackAvailable());show('leave',watching);show('chat',human);show('hint',mode==='computer'&&live);show('undo',mode==='computer'&&live);
  show('review',over);show('rematch',over&&human);show('new',over);
  const title=$('#mGameTitle'),sub=$('#mGameSub');
  if(title){
    const t=puzzleSession&&streakSession?`${streakSession.mode==='survival'?'Puzzle Survival':'Puzzle Streak'} · ${streakSession.count}`:archiveSession?'Game story':watchSession?'Watching':puzzleSession||mode==='puzzle'?'Puzzle':mode==='computer'?`vs ${currentBot?.display_name||currentBot?.name||'Computer'}`:serverGame?.status==='waiting'?'Waiting for opponent':serverGame?.rated?'Rated game':'Casual game';
    if(title.textContent!==t)title.textContent=t;
  }
  if(sub){
    const tc=serverGame?formatTimeControl(serverGame.time_control_seconds||600,serverGame.increment_seconds||0):'';
    const t=puzzleSession&&streakSession?`Best ${streakSession.best} · ${streakDifficulty(streakSession.count)}`:archiveSession?`${archiveSession.entry.white} vs ${archiveSession.entry.black}`:watchSession?`${watchSession.state?.white_name||'White'} vs ${watchSession.state?.black_name||'Black'}`:over?'Game over':puzzleSession?'Find the best move':serverGame?.status==='waiting'?`Room ${serverGame.invite_code||''}`:tc;
    if(sub.textContent!==t)sub.textContent=t;
  }
  $('#mReturnGame')?.classList.toggle('hidden',!((live&&mView!=='game'&&mView!=='review')||liveAway()));
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
    {label:'Settings',run:()=>openSettings()},
    {label:'Friends & challenges',run:()=>openSection('friends')},
    {label:'Clubs',run:()=>{openSection('friends');void renderClubs()}},
    {label:'League',run:()=>{openSection('friends');void renderLeague()}},
    {label:'Arena & tournaments',run:()=>openSection('arena')},
    {label:'Openings',run:()=>openSection('openings')},
    {label:'Studies',run:()=>{openSection('learn');void renderStudies()}},
    {label:'Famous games',run:()=>openSection('famous')},
    {label:'My games & Game Story',run:()=>openSection('review')},
    {label:'Edit profile',run:()=>void openProfileEditor()},
    {label:authSession?.access_token?'Account':'Sign in',run:()=>openAccount()},
    {label:'Notifications',run:()=>void openNotifications()},
    {label:'Install the app',run:()=>$('#installBtn').click()},
  ]);
}
function openGameOptions(){
  const soundOff=!!$('#sound')?.dataset.off;
  openSheet('Game options',[
    {label:'Flip board',run:()=>$('#flip').click()},
    {label:soundOff?'Sound: off (turn on)':'Sound: on (turn off)',run:()=>$('#sound').click()},
    {label:'Settings',run:()=>openSettings()},
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
  'puzzle-next':()=>void showBackendView('puzzle'),
  'puzzle-streak':startStreak,
  'puzzle-menu':()=>{mTab='puzzles';setMView('panel')}, // daily puzzle, stats, battle, themes
  'puzzle-skip':()=>skipRunPuzzle(),
  'puzzle-end':()=>endStreak(null),
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
$('#mBack').onclick=()=>{playUiSound('back');if(watchSession){stopWatching();openSection('watch');return}if(archiveSession&&mView!=='review'){leaveArchive();openSection('review');return}if(mView==='review'){reviewState.viewing=false;renderReviewDashboard();render();setMView('game')}else{mTab='play';setMView('home')}};
$('#mReturnGame').onclick=()=>liveAway()?void returnToLiveGame():setMView('game');
$('#returnGame').onclick=()=>void returnToLiveGame();
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
  if(computerRules==='dark'||computerRules==='blackout')return toast('No hints in this mode');
  const fen=game.fen();
  if(analysisBest?.fen!==fen){
    scheduleAnalysis({force:true,need:true});toast('Thinking…',{duration:1200});
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
// ---- Your game, wherever you are (owner, 2026-10-13: "if a person leave the play section, the
// person is unable to return to the game ... the win was handed to my opponent, which is not
// fair"). See src/live-game.js. While the board shows something else (the Computer tab, a
// puzzle, a lesson, analysis...) your online game keeps beating here, so your opponent sees you
// are still with us and cannot claim it (your clock still runs); "Back to your game" brings it
// back, and VCH opened again (a closed tab, a reload) takes you straight back to it.
function liveOnBoard(){return !!liveGame&&isOnlineGame()&&serverGameId===liveGame.id}
// Your game is on and the board shows something else (its last news under a minute old: one
// the server stopped answering about does not hold you back).
function liveAway(){return !!liveGame&&!liveOnBoard()&&liveState?.status==='active'&&Date.now()-liveSeenAt<60000}
function keepLiveGame(state){
  if(!state?.id||state.id!==serverGameId||watchSession)return;
  if(liveGame?.id===state.id&&state.status!=='active'&&state.status!=='waiting'){forgetLiveGame();return}
  const live=isOnlineGame()&&myColor?liveFrom(state,{seat:myColor,mode}):null;
  if(live){if(liveGame?.id!==live.id||liveGame.room!==live.room||liveGame.mode!==live.mode)liveGame=saveLive(live);liveState=state;liveSeenAt=Date.now()}
  syncLiveReturn();
}
function forgetLiveGame(){liveGame=saveLive(null);liveState=null;liveSeenAt=0;syncLiveReturn()}
// Every five seconds while the board shows something else: your game's heartbeat (the board's
// own polling beats while it shows the game), its news (your opponent moved, it ended).
async function liveBeat(){
  if(!liveGame||liveOnBoard()||liveBeating||liveReturning)return syncLiveReturn();
  const live=liveGame;liveBeating=true;
  try{
    const payload=await api.heartbeat(live.id),state=payload?.game||payload;
    if(liveGame?.id!==live.id||!state)return;
    const before=liveState;liveState=state;liveSeenAt=Date.now();
    const ended=endedFor(live,state);
    if(ended){forgetLiveGame();toast(ended==='won'?'Your game ended · you won':ended==='lost'?'Your game ended · you lost':ended==='draw'?'Your game ended · drawn':'Your game ended',{duration:5200,actionLabel:'Back to your game',onAction:()=>void returnToLiveGame(live)});return}
    if(before?.status==='active'&&sideToMove(before)!==live.seat&&sideToMove(state)===live.seat)toast('Your move',{duration:3600,actionLabel:'Back to your game',onAction:()=>void returnToLiveGame()});
  }catch(error){if(error?.status===403||error?.status===404)forgetLiveGame()}
  finally{liveBeating=false;syncLiveReturn()}
}
setInterval(()=>void liveBeat(),5000);
// Whatever the board shows (a puzzle, a lesson, analysis, a review...) steps aside for your game.
function leaveBoardActivity(){
  if(watchSession)stopWatching({reset:false});
  if(archiveSession)leaveArchive({reset:false});
  if(retrySession)endRetry();
  endStudy({restore:false});endExplore({restore:false});leaveAnalysis({restore:false});leaveLesson({restore:false});
  endEndgame({restore:false});endPrep({restore:false});endRepEdit({restore:false});
  if(puzzleSession?.kind==='battle')stopBattle();
  if(streakSession){streakSession=null;stopRunTimer()}
  puzzleSession=null;planSession=null;browse=null;boardShapes=[];selected=null;
}
// Back to your game (target: a game that just ended while you were away, to see how).
async function returnToLiveGame(target=liveGame){
  if(!target)return;
  if(serverGameId===target.id&&isOnlineGame()){showLiveBoard();return}
  if(liveReturning)return;liveReturning=target.id;
  try{
    const payload=await api.state(target.id);
    leaveBoardActivity();
    if(searching)await cancelMatchSearch({announce:false});
    await activateLeftMode(target.mode); // a computer game on the board ends here
    orientationSet=false;
    applyServerState(payload,{animateMove:false});
    if(target.room){room=target.room;roomCreated=false;history.replaceState(null,'',`?game=${encodeURIComponent(room)}`)}
    syncRoomUi();showLiveBoard();await loadChat();
  }catch(error){if(error?.status===403||error?.status===404){if(liveGame?.id===target.id)forgetLiveGame()}toast(error.message)}
  finally{liveReturning=null;syncLiveReturn()}
}
function showLiveBoard(){setPrimaryScreen('game');activateNav('play');if(isMobileApp())setMView('game');syncLiveReturn()}
// The button that brings it back: on a computer at the top of the page, on a phone above the tabs.
function syncLiveReturn(){
  const away=liveAway(),pill=$('#returnGame');
  if(pill){
    pill.classList.toggle('hidden',!away||isMobileApp());
    const mine=away&&sideToMove(liveState)===liveGame.seat;pill.classList.toggle('your-move',mine);pill.querySelector('.rg-turn')?.classList.toggle('hidden',!mine);
  }
  if(isMobileApp())syncMobileShell();
}
// A chat line: text, or one of VCH's animated reactions (":r:<id>", src/reactions.js).
function addMessage(text,mine=true){
  const e=document.createElement('p'),reaction=parseReaction(text);
  e.className=(mine?'mine':'')+(reaction?' reaction-line':'');
  if(reaction){e.innerHTML=reactionMarkup(reaction.id,{size:72});e.setAttribute('aria-label',reaction.label)}else e.textContent=String(text).slice(0,160);
  $('#messages').append(e);e.scrollIntoView({block:'nearest'});
}
// Emoji and reactions tray under the chat. Reactions send at once; emoji go into the message.
let chatTrayTab='reactions';
function ensureReactionCss(){if(document.getElementById('vchReactionCss'))return;const st=document.createElement('style');st.id='vchReactionCss';st.textContent=REACTION_CSS;document.head.append(st)}
function renderChatTray(){
  const body=$('#chatTray .chat-tray-body');if(!body)return;ensureReactionCss();
  $$('#chatTray [data-tray]').forEach(b=>b.classList.toggle('on',b.dataset.tray===chatTrayTab));
  body.innerHTML=chatTrayTab==='reactions'
    ?`<div class="reaction-grid">${CHAT_REACTIONS.map(r=>`<button type="button" class="reaction-pick" data-reaction="${r.id}" title="${escapeHtml(r.label)}" aria-label="${escapeHtml(r.label)}">${reactionMarkup(r.id,{size:52})}<span>${escapeHtml(r.label)}</span></button>`).join('')}</div>`
    :EMOJI_SET.map(g=>`<div class="emoji-group"><small>${escapeHtml(g.group)}</small><div>${g.items.map(x=>`<button type="button" class="emoji-pick" data-emoji="${escapeHtml(x.char)}" aria-label="${escapeHtml(x.name)}" title="${escapeHtml(x.name)}" data-no-i18n>${x.char}</button>`).join('')}</div></div>`).join('');
}
function toggleChatTray(force){
  const tray=$('#chatTray'),open=force??tray.classList.contains('hidden');
  tray.classList.toggle('hidden',!open);$('#chatTrayBtn')?.setAttribute('aria-expanded',open?'true':'false');if(open)renderChatTray();
}
async function sendChatBody(body){
  if(!serverGameId)return toast('Start or join a game to chat');
  // Friendly first: blocked words never leave the device (the server checks again and keeps
  // the strikes, src/moderation.js).
  const verdict=moderateText(body);if(!verdict.ok&&!parseReaction(body))return toast("That message wasn't sent: keep chat friendly",{duration:3200});
  try{await api.chatSend(serverGameId,body);broadcastAux('chat_hint',{from:realtimeClientId});await loadChat();return true}catch(error){toast(error.message,{duration:4200});return false}
}
function chatIsOpen(){return $('#chatDrawer')?.classList.contains('open')===true}
function updateChatUnread(){const badge=$('#chatUnread');if(!badge)return;badge.textContent=String(chatUnread);badge.classList.toggle('hidden',chatUnread<=0)}
function openChatDrawer(){chatUnread=0;updateChatUnread();$('#chatDrawer').classList.add('open');$('#chatDrawer').setAttribute('aria-hidden','false');void loadChat()}
function closeChatDrawer(){$('#chatDrawer').classList.remove('open');$('#chatDrawer').setAttribute('aria-hidden','true')}
function previewChatMessage(item){
  const name=String(item?.display_name||'Opponent'),reaction=parseReaction(item?.body),body=reaction?reaction.label:String(item?.body||'').slice(0,60);
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
$('#chat').onsubmit=async e=>{e.preventDefault();const v=$('#message').value.trim();if(!v||v.length>160)return;if(await sendChatBody(v))$('#message').value=''};
$('#chatTrayBtn').onclick=()=>toggleChatTray();
$('#chatTray').addEventListener('click',event=>{
  const tab=event.target.closest('[data-tray]');if(tab){chatTrayTab=tab.dataset.tray;renderChatTray();return}
  const r=event.target.closest('[data-reaction]');if(r){toggleChatTray(false);void sendChatBody(reactionMessage(r.dataset.reaction));return}
  const em=event.target.closest('[data-emoji]');if(em){const input=$('#message'),at=input.selectionStart??input.value.length;input.value=(input.value.slice(0,at)+em.dataset.emoji+input.value.slice(input.selectionEnd??at)).slice(0,160);input.focus();const pos=Math.min(160,at+em.dataset.emoji.length);input.setSelectionRange(pos,pos)}
});
$$('.modes button').forEach(button=>button.onclick=()=>activateLeftMode(button.dataset.mode));
$$('[data-match-variant]').forEach(button=>button.onclick=()=>{matchSelection={...matchSelection,variant:button.dataset.matchVariant};$$('[data-match-variant]').forEach(item=>item.classList.toggle('on',item===button))});
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
// Phones show these views on the panel screen, not beside the board (fix: they opened off-screen).
function showSidePanel(){if(isMobileApp()){mTab='more';setMView('panel')}}
$('.computer-shadow')?.addEventListener('click',()=>{void renderShadow();showSidePanel()});
$('.computer-gauntlet')?.addEventListener('click',()=>{renderGauntlet();showSidePanel()});
renderComputerBots();
$('#flip').onclick=()=>{flipped=!flipped;render()};$('#sound').onclick=e=>{e.currentTarget.dataset.off=e.currentTarget.dataset.off?'':'1';e.currentTarget.querySelector('span').textContent=e.currentTarget.dataset.off?'Sound off':'Sound on'};$('#theme').onclick=()=>openSettings({colours:true});$('#resign').onclick=async()=>{if(mode==='computer'&&computerStarted&&!localGameOver){const resign=await vchDialog({title:'Resign game?',body:'Your computer game will end immediately.',actions:[{label:'Cancel',value:false},{label:'Resign',value:true,primary:true}]});if(resign){settleLocalClock();localGameOver=true;localGameOverInfo={result:computerSide==='w'?'0-1':'1-0',reason:'by resignation'};render()}}else if(serverGameId){const resign=await vchDialog({title:'Resign game?',body:'This game will end immediately and the result will be final.',actions:[{label:'Cancel',value:false},{label:'Resign',value:true,primary:true}]});if(resign)try{applyServerState(await api.resign(serverGameId))}catch(error){toast(error.message)}}else toast('Start a game first')};$('#draw').onclick=async()=>{if(mode==='computer')return toast('Draw offers are available in multiplayer games');if(!serverGameId)return toast('Start a game first');if(serverGame?.draw_offer_by===currentPlayerId)return cancelOwnDrawOffer();if(serverGame?.draw_offer_by&&serverGame.draw_offer_by!==currentPlayerId)return toast('Answer the draw offer above your player bar');try{applyServerState(await api.drawOffer(serverGameId));broadcastAux('draw_hint',{from:realtimeClientId});toast('Draw offer sent')}catch(error){toast(error.message)}};$('#copy').onclick=async()=>{await navigator.clipboard.writeText($('#share').value);toast('Room link copied')};$('#create').onclick=async()=>{if(onlineGameBusy())return;if($('#variant').value==='bughouse')return void createBughouse();if($('#variant').value==='twin')return renderFates();if(['crazyhouse','dark','blackout'].includes($('#variant').value)&&String($('#time').value).startsWith('daily'))return toast('This variant is played live, not as a daily game');const rated=$('#level').value==='rated';if(rated&&!authSession?.access_token){openAccount();return toast('Sign in is required for rated games')}try{const state=await api.create({name:(currentProfile?.username||guestName),...(({dailyDays,seconds,increment})=>({seconds,increment,...(dailyDays?{dailyDays}:{})}))(timeChoice($('#time').value)),rated,variant:$('#variant').value});applyServerState(state);room=(state.game||state).invite_code;roomCreated=true;history.replaceState(null,'',`?game=${encodeURIComponent(room)}`);syncRoomUi();await loadChat();toast('Private room is ready')}catch(error){toast(error.message)}};$('#join').onclick=()=>{const input=$('#roomInput'),v=input.value.trim();if(!v){toast('Enter a room code first');input.focus();return}location.search='?game='+encodeURIComponent(v)};$('#roomInput').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();$('#join').click()}};
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
  if(freeBoard())return p.color===game.turn()?'move':null;
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
render();startClock();
recordNav(); // the starting screen is the first entry Back returns to
// ---- Interface language (src/i18n.js) ----
uiLang=(()=>{try{return detectLanguage(localStorage.getItem(LANG_KEY),navigator.languages||[navigator.language])}catch{return 'en'}})();
const i18nPending=new Set();let i18nFrame=0;
function applyLanguage(lang,{save=false}={}){
  uiLang=LANGUAGES[lang]?lang:'en';
  document.documentElement.lang=uiLang;document.documentElement.dir=RTL.has(uiLang)?'rtl':'ltr';
  translateTree(document.body,uiLang);
  // Each language's dictionary (src/locales/<code>.js) downloads the first time it is chosen;
  // until it arrives the page shows English, never the previous language.
  if(uiLang!=='en'){const wanted=uiLang;loadLanguage(wanted).then(()=>{if(uiLang===wanted)translateTree(document.body,uiLang)}).catch(()=>{})}
  if(save)try{localStorage.setItem(LANG_KEY,uiLang)}catch{}
  const select=$('#languageSelect');if(select)select.value=uiLang;
}
new MutationObserver(records=>{
  if(uiLang==='en')return;
  for(const r of records){const node=r.type==='characterData'?r.target.parentElement:r.target;if(node)i18nPending.add(node)}
  if(!i18nFrame)i18nFrame=requestAnimationFrame(()=>{i18nFrame=0;const roots=[...i18nPending];i18nPending.clear();for(const root of roots)if(root.isConnected)translateTree(root,uiLang)});
}).observe(document.body,{childList:true,subtree:true,characterData:true});
$('#languageSelect').onchange=e=>applyLanguage(e.target.value,{save:true});
applyLanguage(uiLang);
// ---- Accessibility: moves read out, moves typed (src/a11y.js, src/typed-move.js) ----
function speakOn(){try{return localStorage.getItem('vch.speak')==='1'}catch{return false}}
function announce(text,{speak=true}={}){
  const live=$('#a11yLive');if(live){live.textContent='';requestAnimationFrame(()=>{live.textContent=text})}
  if(speak&&speakOn()&&'speechSynthesis' in window){try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang=SPEECH_LANG[uiLang]||'en-US';speechSynthesis.speak(u)}catch{}}
}
function announceLatestMove(){
  let records;try{records=moveRecords()}catch{return}
  const key=`${mode}:${serverGameId||watchSession?.id||''}`,count=records.length;
  const before=announceState;announceState={key,count};
  if(before.key!==key||count!==before.count+1||browse)return; // a new game, a reload or a takeback: nothing to read
  const last=records.at(-1);if(!last?.san)return;
  if(blackoutActive()||darkActive()&&(last.color||(count%2?'w':'b'))!==computerSide||last?.hidden||onlineBlind())return; // the dark stays dark for screen readers too
  announce(spokenMove({...last,color:last.color||(count%2?'w':'b')},uiLang));
}
$('#speakMoves').checked=speakOn();
$('#speakMoves').onchange=e=>{try{localStorage.setItem('vch.speak',e.target.checked?'1':'0')}catch{}if(e.target.checked)announce(translateText('Moves will be read aloud',uiLang)||'Moves will be read aloud');else try{speechSynthesis.cancel()}catch{}};
function typedMoveError(code){return {illegal:'That move is not legal here',ambiguous:'More than one piece can go there. Add its file or rank, like Nbd2',unreadable:'Type a move like Nf3, e4 or O-O',empty:'Type a move like Nf3, e4 or O-O'}[code]||'That move is not legal here'}
async function submitTypedMove(event){
  event.preventDefault();
  const input=$('#typeMove'),text=input.value.trim();if(!text)return;
  const say=msg=>{toast(msg);announce(translateText(msg,uiLang)||msg,{speak:false})};
  if((studySession&&!studySession.editing)||mode==='watch'||(mode==='archive'&&!retrySession))return say('No moves to play here');
  if(!retrySession&&!freeBoard()&&(reviewState.viewing||localGameOver||game.isGameOver()||(serverGameId&&myColor&&myColor!==game.turn())||(mode==='computer'&&(!computerStarted||game.turn()!==computerSide))))return say('Wait for your turn');
  if(browse)exitBrowse();
  if(!freeBoard()&&isOnlineGame()&&serverGame?.variant==='freestyle'&&/^[oO0]-?[oO0]/.test(text)){
    const side=/^[oO0]-?[oO0]-?[oO0]/.test(text)?'O-O-O':'O-O',opt=castleOptions(game,serverGame.castling960||'-',Chess).find(o=>o.san===side);
    if(!opt)return say(typedMoveError('illegal'));
    input.value='';selected=null;return void castleOnline(opt);
  }
  const drop=/^([PNBRQpnbrq])?@([a-h][1-8])$/.exec(text.replace(/\s/g,''));
  if(drop&&isZhGame()){const type=(drop[1]||'p').toLowerCase();if(!zhDropTargets(type).includes(drop[2]))return say(typedMoveError('illegal'));input.value='';return void zhDropOnline(type,drop[2])}
  const r=resolveTypedMove(game,text);
  if(!r.move)return say(typedMoveError(r.error));
  input.value='';selected=null;premoves.cancel();
  makeMove({from:r.move.from,to:r.move.to,promotion:r.move.promotion||'q'});
}
$('#typeMoveForm').addEventListener('submit',submitTypedMove);
document.addEventListener('keydown',e=>{
  if(e.key!=='/'||e.ctrlKey||e.metaKey||e.altKey)return;
  const t=e.target;if(t?.closest?.('input,textarea,select,[contenteditable="true"]'))return;
  const input=$('#typeMove');if(!input||!input.offsetParent)return;
  e.preventDefault();input.focus();
});
// ---- Board sets earned in the league (src/season-themes.js) ----
function setThemeVar(name,value){const input=$(`#themeStudio [data-theme="${name}"]`);if(input){input.value=value;input.oninput?.()}}
function syncBoardSets(){
  const select=$('#boardSet');if(!select)return;
  const sets=unlockedSets(currentProfile),current=(()=>{try{return JSON.parse(localStorage.getItem('vanta.theme')||'{}').boardSet||'classic'}catch{return 'classic'}})();
  select.innerHTML=sets.map(s=>`<option value="${s.id}"${s.unlocked?'':' disabled'}${s.id===current?' selected':''}>${s.name}${s.unlocked?'':' · locked'}</option>`).join('');
  const locked=sets.filter(s=>!s.unlocked).length,note=$('#boardSetNote');
  if(note)note.textContent=locked?(signedIn()?'Reach a league division (or finish a season in it) to unlock its board set.':'Sign in and play rated games in the monthly league to unlock board sets.'):'Every board set is yours.';
}
$('#boardSet').onchange=e=>{
  const set=BOARD_SETS.find(s=>s.id===e.target.value),open=unlockedSets(currentProfile).find(s=>s.id===e.target.value)?.unlocked;
  if(!set||!open){syncBoardSets();return toast('That board set is still locked')}
  setThemeVar('--light',set.light);setThemeVar('--dark',set.dark);
  savedTheme.boardSet=set.id;try{localStorage.setItem('vanta.theme',JSON.stringify(savedTheme))}catch{}
  toast(`${set.name} board set`);
};
// ---- Offline: the computer opponent works without a connection (public/sw.js caches it) ----
function syncOffline(){
  const off=navigator.onLine===false;document.body.classList.toggle('offline',off);
  let bar=$('#offlineBar');
  if(off&&!bar){bar=document.createElement('div');bar.id='offlineBar';bar.className='offline-bar';bar.setAttribute('role','status');bar.innerHTML='<b>You are offline</b><span>Play the computer, review saved games and drill your mistakes. Online play returns with your connection.</span><button type="button">Play the computer</button>';bar.querySelector('button').onclick=()=>{setPrimaryScreen('game');void activateLeftMode('computer');showMovesView();if(isMobileApp())setMView('home')};document.body.append(bar)}
  if(!off)bar?.remove();
}
window.addEventListener('offline',syncOffline);
window.addEventListener('online',()=>{syncOffline();if(!currentProfile)void connect();toast('Back online')});
syncOffline();
if(navigator.onLine===false)void completeAuthCallback().catch(()=>{});else void completeAuthCallback().then(connect);
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
      onSignedIn:async(session,info)=>{
        saveAuthSession(session);
        await loadProfile().catch(()=>{});syncIdentityUI();
        if(info?.type==='recovery'){void openSetPassword({intro:'You opened a password reset link. Choose a new password.'});return}
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

// The service worker (offline play, push) installs once the page is idle, so its downloads
// never compete with the first screen.
if('serviceWorker' in navigator){
  const registerSw=()=>navigator.serviceWorker.register('/sw.js').catch(()=>{});
  const whenIdle=()=>(window.requestIdleCallback?requestIdleCallback(registerSw,{timeout:8000}):setTimeout(registerSw,3000));
  if(document.readyState==='complete')setTimeout(whenIdle,1500);else window.addEventListener('load',()=>setTimeout(whenIdle,1500),{once:true});
}

function escapeHtml(value=''){return String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
function moveRecordSignature(records=[]){return records.map(record=>`${record.from||''}${record.to||''}${record.promotion||''}:${normalizedSan(record.san||record.lan||'')}`).join('|')}
function currentReviewRecords(){if(archiveSession?.records)return archiveSession.records;return serverGameId&&Array.isArray(serverGame?.move_history)?serverGame.move_history:game.history({verbose:true})}
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
function analyzeReviewFen(fen,index,token,{engineFen=null,variant=null,searchmoves=null}={}){
  const worker=variant?variantReviewWorker:reviewWorker;
  return new Promise((resolve,reject)=>{
    const id=`review-${token}-${index}`;
    const timer=setTimeout(()=>{if(reviewPending?.id===id){reviewPending=null;worker.postMessage({action:'stop'});reject(new Error('Game review timed out'))}},30000);
    reviewPending={id,fen,latest:{cp:0,depth:0,pv:'',bestMove:''},resolve,reject,timer};
    worker.postMessage({mode:'analysis',fen:engineFen||fen,depth:variant?Math.min(REVIEW_DEPTH,14):REVIEW_DEPTH,requestId:id,...(variant?{variant}:{}),...(searchmoves?.length?{searchmoves}:{})});
  });
}
// Where the game began: Freestyle games (and archived ones) start from their own position.
function reviewStartFen(){
  // (A replayed archive's board was loaded at its last position, so its FEN header is the end, not the start.)
  if(archiveSession)return archiveSession.entry?.startFen||(archiveSession.records?null:game.getHeaders?.().FEN)||null;
  if(watchSession)return watchSession.state?.start_fen||null;
  if(serverGameId)return serverGame?.start_fen||null;
  return game.getHeaders?.().FEN||null;
}
function buildReviewGame(records=currentReviewRecords(),startFen=reviewStartFen()){
  if(startFen&&records.some(r=>r?.castle||/^O-O/.test(r?.san||''))){
    const out=replay960(Chess,startFen,records),moves=out.moves.map((m,i)=>({...records[i],from:m.from,to:m.to,san:m.san,color:m.color,piece:m.piece,captured:m.captured||null,promotion:m.promotion||null,lan:m.lan||m.san}));
    return {records:moves,positions:out.positions,signature:moveRecordSignature(moves)};
  }
  const position=startFen?new Chess(startFen):new Chess(),positions=[position.fen()],moves=[];
  for(const record of records){
    let made=null;
    try{made=record?.from&&record?.to?position.move({from:record.from,to:record.to,promotion:record.promotion||undefined}):position.move(record.san||record.lan||'')}catch{}
    if(!made)break;
    moves.push({...record,from:made.from,to:made.to,san:made.san,lan:made.lan,color:made.color,piece:made.piece,captured:made.captured||record.captured||null,promotion:made.promotion||record.promotion||null,flags:made.flags});
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
  if(result.classification==='ambushed')return `Ambushed: ${move.san} cost ${Math.round(result.realLoss||0)} points of winning chances, but on the board you could see it was ${result.beliefBest&&String(result.beliefBest).toLowerCase()===`${move.from}${move.to}${move.promotion||''}`.toLowerCase()?'the best move':'a sound move'}. Your accuracy counts it as you could judge it.${best&&normalizedSan(best)!==normalizedSan(move.san)?` With the whole board in view, ${best} was best.`:''}`;
  if(result.classification==='brilliant')return `Brilliant ${move.san} — a strong sacrifice that keeps the engine's best continuation.`;
  if(result.classification==='best')return `Best move ${move.san} — matches Stockfish's first choice.`;
  if(result.classification==='great')return `Great move ${move.san} — keeps nearly all of the position's winning chances.`;
  if(best&&normalizedSan(best)!==normalizedSan(move.san))return `${label}: ${move.san}. Best was ${best} — it preserves more winning chances.`;
  return `${label}: ${move.san} — the engine line confirms the position remains close to best play.`;
}
// The Lichess game-accuracy formula (src/review.js) over the review's evaluations.
function reviewAccuracyFor(color){
  const results=reviewState.results;
  if(!results.length)return 100;
  if(results.every(r=>Number.isFinite(r?.beforeCp)&&Number.isFinite(r?.afterCp))){
    const acc=gameAccuracy([results[0].beforeCp,...results.map(r=>r.afterCp)],reviewState.moves[0]?.color==='b'?'b':'w',{losses:results.map(r=>r.fogLoss??null)})[color];
    return acc??100;
  }
  return accuracyFromLosses(results.filter((result,index)=>reviewState.moves[index]?.color===color).map(result=>result.loss));
}
function renderReviewCounts(){
  const target=$('#reviewCounts');if(!target)return;
  const order=['brilliant','great','best','excellent','good','book','inaccuracy','mistake','miss','blunder',...(reviewState.fog?['ambushed']:[])];
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
// Which rules the reviewed game was played under.
function reviewVariant(){
  if(archiveSession)return archiveSession.entry?.variant||'standard';
  if(watchSession)return watchSession.state?.variant||'standard';
  if(serverGameId)return serverGame?.variant||'standard';
  return mode==='computer'?computerRules||'standard':'standard';
}
// A Crazyhouse game: positions with pockets (src/variant-engine.js) and its moves, drops included.
function buildZhReviewGame(records=currentReviewRecords(),startFen=reviewStartFen()){
  const list=zhReviewPositions(Chess,records,startFen);
  const moves=list.slice(1).map(p=>({...p.move,lan:p.move.uci,piece:p.move.drop||null,captured:null,promotion:null}));
  return {records:moves,positions:list.map(p=>p.fen),engineFens:list.map(p=>p.engineFen),signature:moveRecordSignature(moves),variant:'crazyhouse'};
}
// Vanta Dark / Blackout Blitz (src/fog-review.js): every costly move gets a second look on the
// board its player could know. Sound there → Ambushed, and it counts as they could judge it.
async function fogReviewPass(built,token){
  const beliefs=fogBeliefs(Chess,built.positions,built.records,reviewState.fog);
  for(let i=0;i<reviewState.results.length;i++){
    const result=reviewState.results[i],move=built.records[i],belief=beliefs[i];
    if(!belief||!move||!(result.loss>=15))continue;
    const before=await analyzeReviewFen(belief.fen,`fog-${i}`,token,{searchmoves:belief.searchmoves});
    if(reviewState.token!==token)return;
    const played=`${move.from}${move.to}${move.promotion||''}`.toLowerCase(),beliefBest=String(before.bestMove||'').toLowerCase();
    let beliefLoss=null;
    if(played===beliefBest)beliefLoss=0;
    else{
      const afterFen=beliefAfter(Chess,belief.fen,move);
      if(!afterFen)continue; // it only worked because of something they couldn't see: no excuse
      const after=await analyzeReviewFen(afterFen,`fog-${i}-after`,token);
      if(reviewState.token!==token)return;
      beliefLoss=winPercentageLoss(before.cp,after.cp,move.color);
    }
    if(!isAmbush({realLoss:result.loss,beliefLoss,played,beliefBest}))continue;
    reviewState.results[i]={...result,classification:'ambushed',realLoss:result.loss,loss:beliefLoss,fogLoss:beliefLoss,beliefBest};
  }
}
// Crazyhouse evaluations run several times larger than chess ones (material in hand counts
// double), so they are scaled before winning chances are worked out; otherwise every move
// would look like a blunder. VCH's own approximation.
const ZH_CP_SCALE=0.35;
async function startGameReview(){
  cancelPremove(false);
  const variant=reviewVariant();
  if(variant==='bughouse')return toast("Bughouse boards can't be reviewed move by move: pieces arrive from the other board");
  const built=variant==='crazyhouse'?buildZhReviewGame():buildReviewGame();
  if(!built.records.length)return toast('Play at least one move before starting review');
  showMovesView();
  $$('.tabs button').forEach(button=>button.classList.toggle('on',button.dataset.tab==='analysis'));
  const depthEl=$('#depth');if(depthEl)depthEl.textContent=String(REVIEW_DEPTH);
  if(reviewState.signature===built.signature&&!reviewState.running&&reviewState.results.length===built.records.length){
    setReviewProgress(built.positions.length,built.positions.length,'Review complete');setReviewPly(reviewState.moves.length);return;
  }
  const token=reviewState.token+1;
  reviewState={running:true,viewing:false,currentPly:0,signature:built.signature,token,positions:built.positions,moves:built.records,evaluations:[],results:[],variant:built.variant||null,fog:FOG_REVIEW_VARIANTS.has(variant)?variant:null};
  setReviewProgress(0,built.positions.length,'Analyzing every position');
  try{
    for(let index=0;index<built.positions.length;index++){
      const raw=await analyzeReviewFen(built.positions[index],index,token,built.variant?{engineFen:built.engineFens[index],variant:built.variant}:{});
      const evaluation=built.variant?{...raw,cp:Math.round(Number(raw.cp||0)*ZH_CP_SCALE)}:raw;
      if(reviewState.token!==token){reviewState.running=false;return}
      reviewState.evaluations[index]=evaluation;
      setReviewProgress(index+1,built.positions.length,'Analyzing every position');
    }
    reviewState.results=built.records.map((move,index)=>{
      const before=reviewState.evaluations[index]||{cp:0,bestMove:''},after=reviewState.evaluations[index+1]||before;
      const actual=(move.drop?`${String(move.drop).toUpperCase()}@${move.to}`:`${move.from}${move.to}${move.promotion||''}`).toLowerCase(),best=String(before.bestMove||'').toLowerCase();
      const isBest=!!best&&actual===best,isBook=!built.variant&&isBookMove(built.records,index),isSacrifice=!built.variant&&isReviewSacrifice(move,built.positions[index]);
      const classification=classifyMove({beforeCp:before.cp,afterCp:after.cp,color:move.color,isBook,isBest,isSacrifice});
      return {classification,from:move.from,to:move.to,beforeCp:before.cp,afterCp:after.cp,loss:winPercentageLoss(before.cp,after.cp,move.color),bestMove:before.bestMove||''};
    });
    if(reviewState.fog){
      setReviewProgress(built.positions.length,built.positions.length,'Checking what each side could see');
      await fogReviewPass(built,token);
      if(reviewState.token!==token){reviewState.running=false;return}
    }
    reviewState.running=false;
    moveEvalByPly=reviewState.results.map(result=>result.afterCp/100);
    const archiveId=archiveSession?.entry.id||serverGameId||lastLocalArchiveId;
    if(archiveId)saveReviewSummary(archiveId,{accuracy:{w:reviewAccuracyFor('w'),b:reviewAccuracyFor('b')}});
    if(!built.variant&&!reviewState.fog)try{rememberMistakes()}catch(error){console.warn('mistakes',error)}
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
  const opening=darkActive()||fogOnline()?null:detectOpening(currentHistory());
  const state=$('#state');if(!state)return;
  const ctx=boardContext(),line=ctx?ctx.line:serverGame?.rated?'Real time · Rated game':'Real time · Casual game';
  const base=game.inCheck()?(ctx?`Check · ${ctx.line}`:'Check · Real time'):line;
  // The 50-move rule: 50 moves each with no capture and no pawn move is a draw. Shown from 30 on
  // (not in the blind modes, where the count would tell you about moves you can't see).
  const half=Number(game.fen().split(' ')[4])||0,fifty=half>=60&&!darkActive()&&computerRules!=='blackout'&&!fogOnline()?` · 50-move rule: ${Math.max(0,Math.ceil((100-half)/2))} ${Math.ceil((100-half)/2)===1?'move':'moves'} left`:'';
  state.textContent=(opening?`${base} · ${opening.name}`:base)+fifty;
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
  if(computerRules!=='standard'&&computerRules!=='freestyle'&&computerLive())return true; // no evaluation in the dark or a blackout
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
    queueMovesUpdate();
  }
  const depthEl=$('#depth');if(depthEl)depthEl.textContent=String(depth);
  const line=$('#line');if(line&&pv)line.textContent=formatPv(pv);
  const best=firstMoveOfLine(pv);if(best&&depth>=6)analysisBest={fen:request.fen,depth,...best};
}
function scheduleAnalysis({force=false,need=false}={}){
  clearTimeout(analysisTimer);
  if(syncEngineLock())return;
  if(reviewState.running||reviewState.viewing||mode==='puzzle')return;
  analysisTimer=setTimeout(()=>{
    if(botThinking)return;
    const fen=game.fen();
    if(!need&&!currentHistory().length)return; // "Analysis begins after your move": no engine download before then (a Hint asks for it)
    if(!force&&analysisRequest?.fen===fen)return;
    analysisRequest={id:`analysis-${++engineRequestSeq}`,fen,ply:currentHistory().length,depth:0};
    analysisWorker.postMessage({mode:'analysis',fen,depth:ANALYSIS_MAX_DEPTH,requestId:analysisRequest.id});
  },220);
}
function showMovesView(){
  if(studySession)endStudy();if(exploreSession)endExplore();
  currentRightView='moves';$('#movesView')?.classList.remove('hidden');$('#dynamicView')?.classList.add('hidden');
  if(reviewState.viewing){reviewState.viewing=false;renderReviewDashboard();render()}
  $$('.tabs button').forEach(b=>b.classList.toggle('on',b.dataset.tab==='moves'));
  updateMoves();scheduleAnalysis({force:true});queueAtmosphere();
}
function setDynamicView(kind,title,html){
  if(kind!=='study'&&studySession)endStudy();
  if(kind!=='explorer'&&exploreSession)endExplore();
  if(kind!=='repertoire'&&repEdit)endRepEdit();
  if(kind!=='endgames'&&egSession)endEndgame();
  if(kind!=='prep'&&prepSession)endPrep();
  if(kind!=='analysis'&&analysis)leaveAnalysis();
  if(kind!=='lesson'&&lessonSession)leaveLesson({restore:false});
  const arriving=currentRightView!==kind;currentRightView=kind;
  $('#movesView')?.classList.add('hidden');
  const target=$('#dynamicView');target.classList.remove('hidden');target.innerHTML=`<div class="view-title"><button class="back-view" aria-label="Back"><svg class="tool-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button><div><img class="view-wordmark" src="/assets/vch/brand/vch-metal.svg" alt="VCH"><h3>${escapeHtml(title)}</h3></div></div><div class="view-content">${html}</div>`;
  target.querySelector('.back-view').onclick=()=>{playUiSound('back');showMovesView()};
  if(arriving)enterView(target); // a section fades in when you open it (not when it fills in)
  $$('.tabs button').forEach(b=>b.classList.toggle('on',b.dataset.tab===kind));
  queueAtmosphere(); // the music follows you here (src/music.js waits a moment, in case you are only passing through)
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
    <button class="explorer-open">VCH explorer · what players here choose in any position</button>
    <button class="rep-open">My repertoire · build your lines and drill them</button>
    ${current?`<article class="current-opening"><small>CURRENT POSITION</small><h4>${escapeHtml(current.name)} <span>${current.eco}</span></h4><p>${escapeHtml(current.idea)}</p></article>`:''}
    <div class="library-list">${OPENINGS.map((o,i)=>`<article><div><b>${escapeHtml(o.name)}</b><small>${o.eco} · ${o.line.join(' ')}</small></div><p>${escapeHtml(o.idea)}</p><button class="library-action" data-opening="${i}">Study this line</button></article>`).join('')}</div>`);
  $('#dynamicView .explorer-open')?.addEventListener('click',startExplorer);
  $('#dynamicView .rep-open')?.addEventListener('click',()=>void renderRepertoire());
  $$('#dynamicView [data-opening]').forEach(b=>b.onclick=()=>{const o=OPENINGS[Number(b.dataset.opening)];renderStudy('openings',o.name,o.line,`${o.eco} · ${o.idea}`)});
}
// ---- Learn library (round 13): courses (src/courses.js) and famous-game lessons
// (src/famous-lessons.js), played on the board by the lesson player (src/lesson-player.js). ----
const stars=n=>`<span class="lesson-stars" aria-label="${n} of 3 stars">${[0,1,2].map(i=>`<i class="${i<n?'on':''}"></i>`).join('')}</span>`;
function lessonAwaitsMove(){
  const s=lessonSession;if(!s)return false;
  if(s.kind==='famous')return !s.run.answered&&!s.busy;
  const step=currentStep(s.lesson,s.run);return step?.type==='move'&&!s.run.stepDone&&!s.busy;
}
function leaveLesson({restore=true}={}){
  if(!lessonSession)return;lessonSession=null;
  if(mode==='lesson'){mode='room';if(restore){game.reset();boardShapes=[];render();updateMoves()}}
}
function lessonGuard(){
  if(onlineGameBusy())return false;
  if(liveGameOn()&&mode==='computer'&&computerStarted&&!localGameOver){toast('Finish your game first');return false}
  cancelPremove(false);if(watchSession)stopWatching();if(archiveSession)leaveArchive({reset:false});
  puzzleSession=null;streakSession=null;stopRunTimer();if(egSession)endEndgame({restore:false});if(exploreSession)endExplore({restore:false});if(repEdit)endRepEdit({restore:false});
  return true;
}
// Puts a position on the board for the lesson, facing `side`.
function lessonBoard(fen,shapes=[],side=null){
  try{game.load(fen)}catch{toast('This position could not be shown');return false}
  boardShapes=shapes;selected=null;mode='lesson';serverGameId=null;clockSnapshot=null;browse=null;
  flipped=(side||game.turn())==='b';orientationSet=true;setPrimaryScreen('game');render();updateMoves();
  return true;
}
const stepShapes=step=>[...(step?.arrows||[]).map(([from,to])=>({from,to,brush:'green'})),...(step?.marks||[]).map(sq=>({from:sq,brush:'yellow'}))];
function courseOfLesson(id){return COURSES.find(c=>c.lessons.some(l=>l.id===id))||null}
function startCourseLesson(id){
  const lesson=lessonById(id),course=courseOfLesson(id);if(!lesson||!course||!lessonGuard())return;
  const first=lesson.steps.find(st=>st.type==='move'),side=first?new Chess(first.fen).turn():'w';
  lessonSession={kind:'course',lesson,course,run:startRun(lesson),side,feedback:null,busy:false,showHint:false};
  showCourseStep();
}
function showCourseStep(){
  const s=lessonSession;if(!s)return;const step=currentStep(s.lesson,s.run);
  s.feedback=null;s.showHint=false;
  if(step.fen)lessonBoard(step.fen,stepShapes(step),s.side);
  drawLesson();
}
function drawLesson(){
  const s=lessonSession;if(!s)return;
  if(s.kind==='famous')return drawFamous();
  const {lesson,course,run}=s,step=currentStep(lesson,run),index=course.lessons.findIndex(l=>l.id===lesson.id);
  const dots=lesson.steps.map((st,i)=>`<i class="${i<run.step||(i===run.step&&run.stepDone)?'done':''}${i===run.step?' now':''} kind-${st.type}"></i>`).join('');
  const last=run.step===lesson.steps.length-1;
  let body='';
  if(step.type==='read')body=`<p class="lesson-text" dir="auto">${escapeHtml(step.text)}</p>`;
  if(step.type==='move')body=`<p class="lesson-prompt" dir="auto">${escapeHtml(step.prompt)}</p>${s.showHint&&!run.stepDone?`<p class="lesson-hint" dir="auto">${escapeHtml(step.hint||'')}</p>`:''}${s.feedback?`<p class="lesson-feedback ${s.feedback.ok?'ok':'no'}">${escapeHtml(s.feedback.text)}</p>`:''}${run.stepDone?`<p class="lesson-explain" dir="auto">${escapeHtml(step.explain||'')}</p>`:''}`;
  if(step.type==='quiz')body=`<p class="lesson-prompt" dir="auto">${escapeHtml(step.question)}</p><div class="lesson-options">${step.options.map((o,i)=>`<button type="button" data-quiz="${i}" class="${run.stepDone&&i===step.answer?'right':s.wrong?.includes(i)?'wrong':''}"${run.stepDone?' disabled':''}>${escapeHtml(o)}</button>`).join('')}</div>${run.stepDone?`<p class="lesson-explain" dir="auto">${escapeHtml(step.explain||'')}</p>`:s.feedback&&!s.feedback.ok?`<p class="lesson-feedback no">${escapeHtml(s.feedback.text)}</p>`:''}`;
  const html=`<article class="lesson-player"><small>${escapeHtml(course.title.toUpperCase())} · LESSON ${index+1} OF ${course.lessons.length}</small><h4>${escapeHtml(lesson.title)}</h4>${run.step===0?`<p class="lesson-goal" dir="auto">${escapeHtml(lesson.goal)}</p>`:''}<div class="lesson-dots" aria-label="Step ${run.step+1} of ${lesson.steps.length}">${dots}</div>
<div class="lesson-step kind-${step.type}">${body}</div>
<div class="lesson-actions">${step.type==='move'&&!run.stepDone?'<button type="button" class="lesson-hint-btn">Hint</button>':''}${run.step>0?'<button type="button" class="lesson-back">Back</button>':''}<button type="button" class="primary-action lesson-next"${run.stepDone?'':' disabled'}>${last?'Finish lesson':'Next'}</button></div>
<button type="button" class="lesson-course-link">${escapeHtml(course.title)} · all lessons</button></article>`;
  if(currentRightView!=='lesson')setDynamicView('lesson',course.title,html);else{const t=$('#dynamicView .view-content');if(t)t.innerHTML=html}
  const root=$('#dynamicView');
  root.querySelector('.lesson-next')?.addEventListener('click',()=>{if(!s.run.stepDone)return;if(last)return finishCourseLesson();s.wrong=null;nextStep(lesson,run);showCourseStep()});
  root.querySelector('.lesson-back')?.addEventListener('click',()=>{run.step=Math.max(0,run.step-1);run.ply=0;run.stepDone=true;s.wrong=null;showCourseStep()});
  root.querySelector('.lesson-hint-btn')?.addEventListener('click',()=>{if(!s.showHint){run.hints++;s.showHint=true}const want=step.solution?.[run.ply];if(want)boardShapes=[...stepShapes(step),{from:want.slice(0,2),brush:'green'}];render();drawLesson()});
  root.querySelectorAll('[data-quiz]').forEach(b=>b.onclick=()=>{const out=answerQuiz(lesson,run,Number(b.dataset.quiz));if(out.ok){playTone();s.feedback=null}else{playIllegalTone();s.wrong=[...(s.wrong||[]),Number(b.dataset.quiz)];s.feedback={ok:false,text:'Not that one. Try again.'}}drawLesson()});
  root.querySelector('.lesson-course-link')?.addEventListener('click',()=>renderCourse(course.id));
}
function lessonMove(move){
  const s=lessonSession;if(!s)return;
  if(s.kind==='famous')return famousMove(move);
  const step=currentStep(s.lesson,s.run);if(step?.type!=='move'||s.run.stepDone||s.busy)return;
  let made=null;try{made=game.move({from:move.from,to:move.to,promotion:move.promotion||undefined})}catch{}
  if(!made)return;
  const uci=made.from+made.to+(made.promotion||''),out=playCourseMove(s.lesson,s.run,uci);
  if(!out.ok){game.undo();selected=null;render();playIllegalTone();buzz(HAPTICS.illegal);s.feedback={ok:false,text:'Not quite. Look again: that is not the move this position asks for.'};drawLesson();return}
  rememberLastMove(made);boardShapes=[];render({hint:made,instant:instantMoveAnimation});afterBoardPaint(playTone);
  s.feedback=out.stepDone?{ok:true,text:out.alternative?'Also good! Here is the idea:':'Correct!'}:{ok:true,text:'Good. Keep going.'};
  if(out.reply){s.busy=true;drawLesson();setTimeout(()=>{if(lessonSession!==s)return;try{const r=game.move({from:out.reply.slice(0,2),to:out.reply.slice(2,4),promotion:out.reply[4]});rememberLastMove(r);render({hint:r});afterBoardPaint(playTone)}catch{}s.busy=false;drawLesson()},420);return}
  drawLesson();
}
function finishCourseLesson(){
  const s=lessonSession;if(!s)return;const {lesson,course,run}=s,earned=courseStars(run);
  const progress=saveLessonResult(lesson.id,earned),next=nextLesson(course,progress),done=courseProgress(course,progress);
  const html=`<article class="lesson-player lesson-done"><small>${escapeHtml(course.title.toUpperCase())}</small><h4>${escapeHtml(lesson.title)} · complete</h4>${stars(earned)}<p>${run.mistakes+run.hints===0?'Flawless: no mistakes, no hints.':`${run.mistakes} ${run.mistakes===1?'mistake':'mistakes'} · ${run.hints} ${run.hints===1?'hint':'hints'}`}</p><div class="course-meter"><i style="width:${Math.round(100*done.done/done.total)}%"></i></div><p class="course-meter-text">${done.done} of ${done.total} lessons in ${escapeHtml(course.title)}</p><div class="lesson-actions">${next&&next.id!==lesson.id?`<button type="button" class="primary-action lesson-go" data-lesson="${escapeHtml(next.id)}">Next: ${escapeHtml(next.title)}</button>`:''}<button type="button" class="lesson-again">Again</button><button type="button" class="lesson-course-link">All lessons</button></div></article>`;
  const t=$('#dynamicView .view-content');if(t)t.innerHTML=html;
  const root=$('#dynamicView');
  root.querySelector('.lesson-go')?.addEventListener('click',e=>startCourseLesson(e.currentTarget.dataset.lesson));
  root.querySelector('.lesson-again')?.addEventListener('click',()=>startCourseLesson(lesson.id));
  root.querySelector('.lesson-course-link')?.addEventListener('click',()=>renderCourse(course.id));
}
function renderCourse(id){
  const course=courseById(id);if(!course)return;const progress=loadLessonProgress(),done=courseProgress(course,progress);
  const html=`<article class="course-head"><small>${escapeHtml(course.level.toUpperCase())} · ${course.minutes} MIN · ${course.lessons.length} LESSONS</small><h4>${escapeHtml(course.title)}</h4><p>${escapeHtml(course.summary)}</p><div class="course-meter"><i style="width:${Math.round(100*done.done/done.total)}%"></i></div><p class="course-meter-text">${done.done} of ${done.total} done</p></article>
<ol class="course-lessons">${course.lessons.map((l,i)=>`<li><button type="button" data-lesson="${escapeHtml(l.id)}" class="${progress[l.id]?'done':''}"><span class="course-num">${i+1}</span><span><b>${escapeHtml(l.title)}</b><small>${escapeHtml(l.goal)}</small></span>${progress[l.id]?stars(progress[l.id].stars):'<em>Start</em>'}</button></li>`).join('')}</ol>
<details class="course-sources"><summary>Sources</summary><ul>${course.sources.map(src=>`<li>${escapeHtml(src.author?`${src.author}, `:'')}<i>${escapeHtml(src.title)}</i>${src.year?` (${escapeHtml(String(src.year))})`:''}${src.note?` · ${escapeHtml(src.note)}`:''} · <a href="${escapeHtml(src.url)}" target="_blank" rel="noopener noreferrer">link</a></li>`).join('')}</ul><p>Lessons are written by VCH in our own words, based on these works.</p></details>
<button type="button" class="secondary-action course-back">Course library</button>`;
  if(lessonSession)leaveLesson({restore:false});
  setDynamicView('learn',course.title,html);
  $$('#dynamicView [data-lesson]').forEach(b=>b.onclick=()=>startCourseLesson(b.dataset.lesson));
  $('#dynamicView .course-back').onclick=renderLearn;
}
// Famous games as lessons: at each moment you find the master's move (on the board or from
// the choices), then see what was played and why.
function startFamousLesson(id){
  const lesson=famousLessonById(id);if(!lesson||!lessonGuard())return;
  lessonSession={kind:'famous',lesson,run:newFamousRun(lesson),busy:false,showChoices:false,verdict:null,fenCache:new Map()};
  showMoment();
}
function momentFen(s,m){if(!s.fenCache.has(m.ply))s.fenCache.set(m.ply,momentPosition(Chess,s.lesson,m));return s.fenCache.get(m.ply)}
function showMoment(){
  const s=lessonSession;if(!s)return;const m=s.lesson.moments[s.run.moment];
  s.showChoices=false;s.verdict=null;s.busy=false;
  lessonBoard(momentFen(s,m),[],momentSide(m));drawFamous();
}
function drawFamous(){
  const s=lessonSession;if(!s||s.kind!=='famous')return;const {lesson,run}=s,m=lesson.moments[run.moment],n=lesson.moments.length;
  const side=momentSide(m)==='w'?lesson.white:lesson.black,v=s.verdict;
  const dots=lesson.moments.map((_,i)=>{const r=run.results[i];return `<i class="${r?(r.correct?'done':'miss'):''}${i===run.moment?' now':''}"></i>`}).join('');
  const html=`<article class="lesson-player famous-player"><small>${escapeHtml(lesson.white)} vs ${escapeHtml(lesson.black)} · ${escapeHtml(String(lesson.year))} · MOMENT ${run.moment+1} OF ${n}</small><h4>${escapeHtml(lesson.title)}</h4>${run.moment===0&&!run.answered?`<p class="lesson-goal" dir="auto">${escapeHtml(lesson.intro)}</p>`:''}<div class="lesson-dots">${dots}</div>
<div class="lesson-step"><p class="lesson-prompt" dir="auto">${escapeHtml(m.prompt)}</p><p class="famous-side">${escapeHtml(side)} to move · play it on the board${s.showChoices?' or pick one':''}</p>
${s.showChoices&&!run.answered?`<div class="lesson-options famous-choices">${m.choices.map(c=>`<button type="button" data-choice="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join('')}</div>`:''}
${run.hinted&&!run.answered?`<p class="lesson-hint" dir="auto">${escapeHtml(m.hint||'')}</p>`:''}
${v?`<p class="lesson-feedback ${v.correct?'ok':'no'}">${v.correct?(v.accepted?`Good move! The engine likes it too. ${escapeHtml(side)} played ${escapeHtml(v.best)}.`:`Yes! ${escapeHtml(v.best)} is what ${escapeHtml(side)} played.`):`${escapeHtml(side)} played ${escapeHtml(v.best)}.`}</p><p class="lesson-explain" dir="auto">${escapeHtml(m.explain||'')}</p>`:''}</div>
<div class="lesson-actions">${run.answered?`<button type="button" class="primary-action famous-next">${run.moment+1<n?'Next moment':'See your score'}</button>`:`${s.showChoices?'':'<button type="button" class="famous-choices-btn">Show choices</button>'}<button type="button" class="lesson-hint-btn">Hint</button><button type="button" class="famous-reveal">Show me</button>`}</div>
<button type="button" class="lesson-course-link">Famous games</button></article>`;
  if(currentRightView!=='lesson')setDynamicView('lesson','Famous Games',html);else{const t=$('#dynamicView .view-content');if(t)t.innerHTML=html}
  const root=$('#dynamicView');
  root.querySelector('.famous-choices-btn')?.addEventListener('click',()=>{s.showChoices=true;drawFamous()});
  root.querySelector('.lesson-hint-btn')?.addEventListener('click',()=>{run.hinted=true;drawFamous()});
  root.querySelector('.famous-reveal')?.addEventListener('click',()=>answerMoment(null));
  root.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>answerMoment(b.dataset.choice));
  root.querySelector('.famous-next')?.addEventListener('click',()=>{if(nextMoment(lesson,run))showMoment();else finishFamous()});
  root.querySelector('.lesson-course-link')?.addEventListener('click',renderFamous);
}
// The learner answers with a SAN (board move or choice), or null to just be shown.
function answerMoment(san){
  const s=lessonSession;if(!s||s.kind!=='famous'||s.run.answered)return;const m=s.lesson.moments[s.run.moment];
  const v=san?checkAnswer(s.lesson,m,san):{correct:false,accepted:false,best:m.answer};
  recordFamousAnswer(s.run,v.correct);s.verdict=v;
  if(v.correct)playTone();else if(san){playIllegalTone();buzz(HAPTICS.illegal)}
  // Show the master's move on the board.
  try{game.load(momentFen(s,m));const made=game.move(m.answer);rememberLastMove(made);boardShapes=[];render({hint:made})}catch{}
  drawFamous();
}
function famousMove(move){
  const s=lessonSession;if(!s||s.run.answered||s.busy)return;
  let made=null;try{made=game.move({from:move.from,to:move.to,promotion:move.promotion||undefined})}catch{}
  if(!made)return;
  render({hint:made,instant:instantMoveAnimation});
  s.busy=true;setTimeout(()=>{if(lessonSession!==s)return;s.busy=false;answerMoment(made.san)},350);
}
function finishFamous(){
  const s=lessonSession;if(!s)return;const {lesson,run}=s,score=lessonScore(run.results);
  if(score.stars)saveLessonResult(`famous/${lesson.id}`,score.stars);
  const right=run.results.filter(r=>r.correct).length;
  const html=`<article class="lesson-player lesson-done"><small>${escapeHtml(lesson.white)} vs ${escapeHtml(lesson.black)} · ${escapeHtml(String(lesson.year))}</small><h4>${escapeHtml(lesson.title)}</h4>${stars(score.stars)}<p>You found ${right} of ${run.results.length} moves · ${score.score} of ${score.max} points.</p><p class="lesson-explain" dir="auto">${escapeHtml(lesson.ending||lesson.theme||'')}</p><div class="lesson-actions"><button type="button" class="primary-action famous-replay">Replay the whole game</button><button type="button" class="lesson-again">Try again</button><button type="button" class="lesson-course-link">Famous games</button></div></article>`;
  const t=$('#dynamicView .view-content');if(t)t.innerHTML=html;
  const root=$('#dynamicView');
  root.querySelector('.famous-replay')?.addEventListener('click',()=>{leaveLesson({restore:false});renderStudy('famous',lesson.title,lesson.moves,`${lesson.white} vs ${lesson.black} · ${lesson.year} · ${lesson.result}`)});
  root.querySelector('.lesson-again')?.addEventListener('click',()=>startFamousLesson(lesson.id));
  root.querySelector('.lesson-course-link')?.addEventListener('click',renderFamous);
}
function renderFamous(){
  if(lessonSession)leaveLesson({restore:false});
  const progress=loadLessonProgress();
  const card=g=>{const done=progress[`famous/${g.id}`];return `<article class="famous-card"><div><b>${escapeHtml(g.title)}</b><small>${escapeHtml(g.white)} vs ${escapeHtml(g.black)} · ${escapeHtml(g.event||'')} ${escapeHtml(String(g.year))} · ${escapeHtml(g.result)}</small></div><p>${escapeHtml(g.theme)}</p><div class="famous-card-foot">${done?stars(done.stars):`<em>${g.moments.length} moments</em>`}<button class="library-action" data-famous-lesson="${escapeHtml(g.id)}">${done?'Play again':'What would you play?'}</button><button class="library-action ghost" data-famous-replay="${escapeHtml(g.id)}">Replay</button></div></article>`};
  setDynamicView('famous','Famous Games',`<p class="famous-intro">Step into the great games. At each turning point, find the move the master played; then see why it worked.</p>${FAMOUS_ERAS.map(era=>{const games=FAMOUS_LESSONS.filter(g=>g.era===era.id);return games.length?`<section class="famous-era"><h4>${escapeHtml(era.label)} <small>${escapeHtml(era.years)}</small></h4><p>${escapeHtml(era.blurb)}</p><div class="library-list famous-list">${games.map(card).join('')}</div></section>`:''}).join('')}`);
  $$('#dynamicView [data-famous-lesson]').forEach(b=>b.onclick=()=>startFamousLesson(b.dataset.famousLesson));
  $$('#dynamicView [data-famous-replay]').forEach(b=>b.onclick=()=>{const g=famousLessonById(b.dataset.famousReplay);renderStudy('famous',g.title,g.moves,`${g.white} vs ${g.black} · ${g.year} · ${g.result}`)});
}
function renderLearn(){
  if(lessonSession)leaveLesson({restore:false});
  const progress=loadLessonProgress(),famousDone=FAMOUS_LESSONS.filter(g=>progress[`famous/${g.id}`]).length;
  const courseCard=c=>{const d=courseProgress(c,progress);return `<button type="button" class="course-card level-${escapeHtml(c.level.toLowerCase())}" data-course="${escapeHtml(c.id)}"><small>${escapeHtml(c.level)} · ${c.minutes} min</small><b>${escapeHtml(c.title)}</b><span>${escapeHtml(c.summary)}</span><div class="course-meter"><i style="width:${Math.round(100*d.done/d.total)}%"></i></div><em>${d.done?`${d.done} of ${d.total} lessons`:`${d.total} lessons`}</em></button>`};
  setDynamicView('learn','Practice & Learn',`<button class="plan-open"><span><small>TODAY'S TRAINING</small><b>${escapeHtml(planHeadline())}</b></span><em class="plan-streak" aria-label="Streak">${currentStreak(loadStreak())}</em></button>
<h4 class="learn-head">Course library</h4><p class="learn-sub">Interactive lessons: read, then play the move on the board. Built from classic chess books and the FIDE Laws.</p>
${COURSE_LEVELS.map(level=>{const list=COURSES.filter(c=>c.level===level);return list.length?`<div class="course-level"><small>${escapeHtml(level.toUpperCase())}</small><div class="course-grid">${list.map(courseCard).join('')}</div></div>`:''}).join('')}
<button type="button" class="famous-entry"><span><small>FAMOUS GAMES</small><b>What would you play?</b><em>${FAMOUS_LESSONS.length} classic games · ${famousDone} done</em></span></button>
<button class="primary-action start-puzzle">Start a live puzzle</button><button class="secondary-action open-studies">Studies · annotate and share a line</button><button class="secondary-action open-endgames">Endgame drills · win textbook endgames against the computer</button><button class="secondary-action open-together">Analyse together · a shared board with a friend</button>`);
  $$('#dynamicView [data-course]').forEach(b=>b.onclick=()=>renderCourse(b.dataset.course));
  $('#dynamicView .famous-entry').onclick=renderFamous;
  $('#dynamicView .start-puzzle').onclick=()=>showBackendView('puzzle');
  $('#dynamicView .open-studies')?.addEventListener('click',()=>void renderStudies());
  $('#dynamicView .open-endgames')?.addEventListener('click',renderEndgames);
  $('#dynamicView .open-together')?.addEventListener('click',()=>startAnalysis());
  $('#dynamicView .plan-open')?.addEventListener('click',()=>void renderPlan());
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
  return `<div class="loading-card brand-loading"><span class="vch-lockup"><span class="vch-v vch-v-chrome vch-v-shine" aria-hidden="true"></span><img src="/assets/vch/brand/vch-metal.svg" alt="VCH"></span><span>${escapeHtml(label)}</span></div>`;
}
let puzzleRetries=0;
// The card beside a run puzzle: mode, count and best, the clock, the token purse, Skip, End.
function runCard(side){
  const run=streakSession,survival=run.mode==='survival',purse=loadSkips();
  if(purse.daily)setTimeout(()=>toast('Daily skip token added',{duration:1400}),400);
  const tokens=Array.from({length:SKIP_MAX},(_,i)=>`<i class="${i<purse.tokens?'on':''}">${SKIP_TOKEN_SVG}</i>`).join('');
  return `<article class="puzzle-info streak-info run-${run.mode}"><div class="run-head"><div class="streak-count"><small>${survival?'SURVIVAL':'STREAK'}</small><b>${run.count}</b><span>Best ${run.best}</span></div><div class="run-clock${survival?' countdown':''}"><small>${survival?`${survivalSeconds(run.count)}s per puzzle`:'This puzzle'}</small><b>${survival?runClock(survivalSeconds(run.count)*1000):'0:00'}</b><span class="run-total">Run 0:00</span></div></div>
<h4>${side} to move · find the best move</h4><p>${escapeHtml(streakDifficulty(run.count))} · ${survival?'a wrong move or the clock running out ends the run':'one wrong move ends the run'}</p>
<div class="skip-purse" title="Skip tokens: one more each day you visit, one for every 10 solved in a run, up to ${SKIP_MAX}."><span class="skip-tokens" aria-label="${purse.tokens} skip tokens">${tokens}</span><button class="skip-puzzle"${purse.tokens?'':' disabled'}>${SKIP_TOKEN_SVG}<span>Skip puzzle</span></button></div>
<div class="streak-actions"><button class="end-streak">End run</button></div></article>`;
}
async function showBackendView(kind){
  if(kind==='puzzle-stats')return void renderPuzzleStats();
  if(kind==='puzzle'||kind==='streak'||kind==='daily'){
    if(onlineGameBusy())return;
    cancelPremove(false);if(watchSession)stopWatching();if(archiveSession)leaveArchive({reset:false});
    const streak=kind==='streak',daily=kind==='daily';if(!streak)streakSession=null;if(streak||daily)puzzleAngle=null;
    setDynamicView('puzzles',streak?(streakSession.mode==='survival'?'Puzzle Survival':'Puzzle Streak'):daily?'Daily Puzzle':'Puzzle Training',brandLoading(streak?`Puzzle ${streakSession.count+1} · ${streakDifficulty(streakSession.count)}`:daily?"Loading today's puzzle…":'Loading a real tactical position…'));
    try{
      const data=daily?await api.puzzleDaily():await api.puzzleNext(streak?streakDifficulty(streakSession.count):difficultyForRating(puzzleRatingNow()),puzzleRatingNow(),streak?null:puzzleAngle),puzzle=data.puzzle||data;
      if(streak&&!streakSession)return;
      // Start where the solution's first move fits (older cached puzzles began one move early).
      const startFen=playablePuzzleFen(Chess,{fen:puzzle.fen,solution:puzzle.solution||puzzle.moves||[],gamePgn:puzzle.gamePgn,initialPly:puzzle.initialPly});
      if(!startFen){if(!daily&&puzzleRetries++<3)return void showBackendView(kind);puzzleRetries=0;throw new Error(daily?"Today's puzzle can't be played. Try the regular puzzles.":"Puzzles can't be loaded right now. Try again in a moment.")}
      puzzleRetries=0;game.load(startFen);mode='puzzle';serverGameId=null;clockSnapshot=null;browse=null;
      flipped=game.turn()==='b';orientationSet=true; // you play the side to move
      puzzleSession={id:puzzle.id||puzzle.puzzleId,solution:puzzle.solution||puzzle.moves||[],index:0,played:[],started:Date.now(),failed:false,daily,rating:Number(puzzle.rating)||null};
      syncPlayerBars();render();
      const side=game.turn()==='w'?'White':'Black';
      $('#dynamicView .view-content').innerHTML=streak
        ?runCard(side)
        :`<article class="puzzle-info"><small>${daily?`DAILY PUZZLE · ${escapeHtml(data.date||'')}`:'LIVE PUZZLE'} · ${puzzle.rating||'—'} RATING</small><h4>${side} to move · find the best continuation</h4><p>${escapeHtml((puzzle.themes||[]).map(themeLabel).join(' · ')||'Tactical training')}</p>${daily&&data.solved?'<p class="puzzle-daily-done">You solved today\'s puzzle already. Play it again for fun; your rating won\'t change.</p>':''}${puzzleAngle?`<p class="puzzle-theme-pick">Theme: <b>${escapeHtml(themeLabel(puzzleAngle))}</b> <button class="clear-theme">Mixed themes</button></p>`:''}<div class="puzzle-rating">Your puzzle rating <b id="puzzleRatingNow">${puzzleRatingNow()}</b> <span id="puzzleRatingDelta"></span></div><div class="puzzle-progress">Move <b>1</b> of ${Math.max(1,Math.ceil((puzzleSession.solution.length||1)/2))}</div><button class="primary-action next-puzzle">Next puzzle</button><div class="puzzle-more"><button class="daily-puzzle">Daily puzzle</button><button class="puzzle-stats">My puzzle stats</button></div><button class="learn-mistakes">Learn from your mistakes${mistakeStats(loadMistakes()).due?` · ${mistakeStats(loadMistakes()).due} due`:''}</button><div class="run-modes"><button class="start-streak run-mode" title="No time limit. One wrong move ends the run; the clock shows how long each puzzle takes."><b>Puzzle Streak</b><small>No time limit · best ${bestStreakShown()}</small></button><button class="start-survival run-mode" title="Every puzzle has a countdown that shortens as they get harder. A wrong move or running out of time ends the run."><b>Puzzle Survival</b><small>Beat the countdown · best ${loadBestSurvival()}</small></button></div><button class="start-battle">Puzzle Battle · race a friend</button></article>`;
      $('#dynamicView .next-puzzle')?.addEventListener('click',()=>showBackendView('puzzle'));
      $('#dynamicView .start-streak')?.addEventListener('click',startStreak);
      $('#dynamicView .start-battle')?.addEventListener('click',()=>void renderBattle());
      $('#dynamicView .daily-puzzle')?.addEventListener('click',()=>showBackendView('daily'));
      $('#dynamicView .puzzle-stats')?.addEventListener('click',()=>showBackendView('puzzle-stats'));
      $('#dynamicView .learn-mistakes')?.addEventListener('click',renderMistakes);
      $('#dynamicView .clear-theme')?.addEventListener('click',()=>{puzzleAngle=null;showBackendView('puzzle')});
      $('#dynamicView .skip-puzzle')?.addEventListener('click',skipRunPuzzle);
      $('#dynamicView .start-survival')?.addEventListener('click',startSurvival);
      if(streak)startRunTimer();
      $('#dynamicView .end-streak')?.addEventListener('click',()=>endStreak(null));
    }catch(error){toast(error.message);showMovesView()}
    return;
  }
  if(kind==='arena'){
    setDynamicView('arena','Arena',brandLoading('Loading live tournaments…'));
    try{
      const data=await api.tournaments(),events=sortArenas(data.tournaments||data.events||[]),mine=new Map((data.memberships||[]).map(m=>[m.tournament_id,m])),myGames=new Map((data.myGames||[]).map(g=>[g.tournament_id,g]));
      const target=$('#dynamicView .view-content');if(!target)return;
      const card=(t,i)=>{
        const phase=arenaPhase(t),joined=mine.get(t.id),weekly=isWeeklyArena(t);
        const swiss=t.format==='swiss',myGame=myGames.get(t.id);
        const action=phase.phase==='finished'||(swiss&&t.status==='finished')?'':swiss?(myGame?`<button class="arena-play" data-code="${escapeHtml(myGame.code)}">Play round ${myGame.round}</button>`:joined?'<button class="arena-join" disabled>Joined</button>':'<button class="arena-join">Join</button>'):phase.phase==='upcoming'?(joined?'<button class="arena-join" disabled>Registered</button>':'<button class="arena-join">Register</button>'):'<button class="arena-join">Play now</button>';
        const battle=t.kind==='club_battle';
        return `<article data-arena="${i}" class="arena-card${weekly||battle?' weekly':''}${battle?' club-battle':''} phase-${phase.phase}"><div>${battle?'<span class="arena-badge">Club battle</span>':weekly?'<span class="arena-badge">Weekly</span>':t.format==='swiss'?`<span class="arena-badge swiss">Swiss · ${Number(t.current_round)?`round ${t.current_round} of ${t.rounds}`:`${t.rounds} rounds`}</span>`:''}<small>${t.rated?'RATED':'CASUAL'} · ${escapeHtml(t.pool||'arena')} · ${formatTimeControl(Number(t.base_seconds||600),Number(t.increment_seconds||0))}</small><h4>${escapeHtml(t.name||t.title||'Arena')}</h4>${t.description?`<p>${escapeHtml(t.description)}</p>`:''}<p class="arena-when" data-arena-when="${i}">${escapeHtml(phase.label)}</p>${joined?`<p class="arena-mine">You: ${Number(joined.points||0)} pts · ${joined.wins||0}W ${joined.draws||0}D ${joined.losses||0}L${Number(joined.streak||0)>=3?' <span class="fire-tag">On fire · wins score double</span>':''}</p>`:''}<p class="arena-rules">Win 2 · draw 1. Three wins in a row put you on fire: wins score 4. A Berserk win adds 1.</p></div><div>${action}<button class="arena-lobby">Lobby</button><button class="arena-standings">${phase.phase==='finished'?'Results':'Standings'}</button></div><section class="standings-slot"></section></article>`;
      };
      target.innerHTML=`<button class="arena-create">Create a tournament · arena or Swiss</button><button class="simul-open">Simuls · one host plays everyone</button><div class="arena-list">${events.map(card).join('')||'<p>No arenas right now.</p>'}</div>`;
      target.querySelector('.arena-create').onclick=()=>void openCreateTournament();
      target.querySelector('.simul-open').onclick=()=>void renderSimuls();
      target.querySelectorAll('.arena-play').forEach(b=>b.onclick=()=>{location.search='?game='+encodeURIComponent(b.dataset.code)});
      [...target.querySelectorAll('[data-arena]')].forEach((row,i)=>{
        const t=events[i],phase=arenaPhase(t).phase,join=row.querySelector('.arena-join');
        if(join&&!join.disabled)join.onclick=async()=>{
          try{
            await api.tournamentJoin(t.id);
            if(t.format==='swiss'){join.textContent='Joined';join.disabled=true;return toast('Joined · your games are paired for you each round')}
            if(phase==='upcoming'){join.textContent='Registered';join.disabled=true;return toast(`Registered · ${arenaPhase(t).label.toLowerCase()}`)}
            if(searching)await cancelMatchSearch({announce:false}); // one search at a time
            await api.queueJoin({seconds:Number(t.base_seconds||600),increment:Number(t.increment_seconds||0),rated:!!t.rated,tournamentId:t.id});
            // The same search as Quick match: shown in the Match panel with a Cancel button, and
            // stopped when you start something else.
            await activateLeftMode('match');setMatchSearching(true);toast('Arena queue joined · searching');
            matchTimer=setInterval(async()=>{if(!searching){clearInterval(matchTimer);matchTimer=null;return}try{const state=await api.queueStatus(!!t.rated);if(state.game||state.matched){clearInterval(matchTimer);matchTimer=null;setMatchSearching(false);applyServerState(state);showMovesView();toast('Arena match found')}}catch(error){void cancelMatchSearch({announce:false});toast(error.message)}},1000);
          }catch(error){toast(error.message)}
        };
        row.querySelector('.arena-lobby').onclick=()=>void openTournamentLobby(t);
        row.querySelector('.arena-standings').onclick=async()=>{try{const result=await api.tournamentStandings(t.id),slot=row.querySelector('.standings-slot');slot.innerHTML=((result.clubs||[]).length?`<div class="club-table"><small>CLUBS · best five count</small>${result.clubs.slice(0,8).map((c,i)=>`<p><span>${i+1}.</span> ${escapeHtml(c.name)} <b>${c.points} pts</b> <small>${c.players} players</small></p>`).join('')}</div>`:'')+standingsRows(result.standings||[]).slice(0,10).map(p=>`<p><span>${p.rank}.</span> ${escapeHtml(p.name)}${p.fire?' <span class="fire-tag">On fire</span>':''} <b>${p.points} pts</b> <small>${p.record}</small></p>`).join('')||'<p>No scores yet.</p>'}catch(error){toast(error.message)}};
      });
      const tick=setInterval(()=>{if(currentRightView!=='arena'||!document.body.contains(target))return clearInterval(tick);events.forEach((t,i)=>{const el=target.querySelector(`[data-arena-when="${i}"]`);if(el)el.textContent=arenaPhase(t).label})},30000);
    }catch(error){toast(error.message);showMovesView()}
  }
}
// ---- Opening repertoire (src/repertoire.js): your lines, drilled; synced when signed in ----
function localRepertoire(){try{const r=JSON.parse(localStorage.getItem(REP_KEY)||'null');return {w:Array.isArray(r?.w)?r.w:[],b:Array.isArray(r?.b)?r.b:[]}}catch{return {w:[],b:[]}}}
function storeLocalRepertoire(){try{localStorage.setItem(REP_KEY,JSON.stringify(repertoire))}catch{}}
async function loadRepertoire(){
  const local=localRepertoire();
  if(!signedIn()){repertoire=local;return repertoire}
  try{
    const out=await api.repertoireGet();repertoire={w:out.w||[],b:out.b||[]};
    // First time signed in: bring the lines you made as a guest.
    for(const c of ['w','b'])if(!repertoire[c].length&&local[c].length){repertoire[c]=local[c];void api.repertoireSave(c,local[c]).catch(()=>{})}
  }catch{repertoire=local}
  storeLocalRepertoire();return repertoire
}
async function saveRepertoire(color){storeLocalRepertoire();if(signedIn())try{const out=await api.repertoireSave(color,repertoire[color]);repertoire[color]=out.lines||repertoire[color];storeLocalRepertoire()}catch(error){toast(error.message)}}
async function addRepLine(color,sans){
  if(!repertoire)await loadRepertoire();
  const next=addLine(repertoire[color],sans);if(!next)return toast('That line could not be saved');
  if(next===repertoire[color])return toast('Already in your repertoire');
  repertoire[color]=next;await saveRepertoire(color);toast(color==='w'?'Saved to your White repertoire':'Saved to your Black repertoire');
  if(exploreSession)markRepRows(game.fen());
}
function markRepRows(fen){
  if(!repertoire)return;const here=new Set([...repMovesAt(repertoire.w,fen),...repMovesAt(repertoire.b,fen)]);
  $$('#dynamicView .explorer-table .ex-row[data-san]').forEach(r=>{const on=here.has(r.dataset.san);r.classList.toggle('in-rep',on);if(on&&!r.querySelector('.rep-tag')){const tag=document.createElement('small');tag.className='rep-tag';tag.textContent='Repertoire';r.querySelector('b')?.after(tag)}});
}
async function renderRepertoire(color=repColor){
  repColor=color;
  setDynamicView('repertoire','My repertoire',brandLoading('Loading your lines…'));
  await loadRepertoire();if(currentRightView!=='repertoire')return;
  const target=$('#dynamicView .view-content');if(!target)return;
  const lines=repertoire[color],st=repStats(repertoire);
  target.innerHTML=`<article class="repertoire">
    <p class="trainer-intro">Your prepared lines. Add them from the board or the explorer, then drill them: the computer plays the replies you prepared for, you play your moves.${signedIn()?'':' Saved on this device; sign in to keep them with your account.'}</p>
    <div class="ex-source" role="group" aria-label="Colour"><button type="button" class="ex-src${color==='w'?' on':''}" data-rep="w" aria-pressed="${color==='w'}">As White · ${st.w}</button><button type="button" class="ex-src${color==='b'?' on':''}" data-rep="b" aria-pressed="${color==='b'}">As Black · ${st.b}</button></div>
    <div class="pp-actions"><button class="gold rep-add">Add a line</button><button class="rep-drill"${lines.length?'':' disabled'}>Drill these lines</button></div>
    <div class="rep-lines">${lines.map((l,i)=>`<div class="rep-line"><button class="rep-view" data-line="${i}">${escapeHtml(lineText(l))}</button><button class="rep-del" data-del="${i}" aria-label="Remove line">Remove</button></div>`).join('')||'<p class="menu-empty">No lines yet. Tap Add a line and play the moves on the board.</p>'}</div>
  </article>`;
  target.querySelectorAll('[data-rep]').forEach(b=>b.onclick=()=>void renderRepertoire(b.dataset.rep));
  target.querySelector('.rep-add').onclick=()=>startRepEdit(color);
  target.querySelector('.rep-drill').onclick=()=>startRepDrill(color,0);
  target.querySelectorAll('[data-line]').forEach(b=>b.onclick=()=>renderStudy('openings',color==='w'?'Your line as White':'Your line as Black',lines[Number(b.dataset.line)],lineText(lines[Number(b.dataset.line)])));
  target.querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{repertoire[color]=removeLine(repertoire[color],Number(b.dataset.del));await saveRepertoire(color);void renderRepertoire(color)});
}
function startRepEdit(color){
  if(liveGameOn()&&mode!=='computer')return toast('The repertoire opens after your game');
  cancelPremove(false);if(watchSession)stopWatching();if(archiveSession)leaveArchive({reset:false});
  puzzleSession=null;streakSession=null;if(exploreSession)endExplore({restore:false});
  if(mode==='computer'&&computerStarted){computerStarted=false;currentBot=null;myColor=null}
  game.reset();boardShapes=[];repEdit={color,line:[]};mode='repertoire';flipped=color==='b';orientationSet=true;
  setPrimaryScreen('game');render();drawRepEdit();
}
function endRepEdit({restore=true}={}){if(!repEdit)return;repEdit=null;if(mode==='repertoire'){mode='room';if(restore){game.reset();boardShapes=[];render();updateMoves()}}}
function repEditMove(move){
  let made=null;try{made=game.move({from:move.from,to:move.to,promotion:move.promotion||'q'})}catch{}
  if(!made)return rejectMove(move.from,move.to);
  repEdit.line.push(made.san);rememberLastMove(made);render({hint:made});afterBoardPaint(playTone);drawRepEdit();
}
function drawRepEdit(){
  if(!repEdit)return;const known=repMovesAt(repertoire?.[repEdit.color]||[],game.fen());
  const html=`<article class="explorer rep-edit"><p class="trainer-intro">Play the line on the board, both sides. Save it when it's as deep as you want.</p><div class="explorer-line">${repEdit.line.length?escapeHtml(lineText(repEdit.line)):'Start position'}</div>${known.length?`<p class="rep-known">Your lines continue with <b>${known.map(escapeHtml).join(', ')}</b></p>`:''}<div class="pp-actions"><button class="gold rep-save"${repEdit.line.length?'':' disabled'}>Save line</button><button class="rep-back"${repEdit.line.length?'':' disabled'}>Back one move</button><button class="rep-cancel">Cancel</button></div></article>`;
  if(currentRightView!=='repertoire')setDynamicView('repertoire','Add a line',html);else{const t=$('#dynamicView .view-content');if(t)t.innerHTML=html}
  const t=$('#dynamicView .view-content');if(!t)return;
  t.querySelector('.rep-save').onclick=async()=>{const {color,line}=repEdit;await addRepLine(color,line);endRepEdit();void renderRepertoire(color)};
  t.querySelector('.rep-back').onclick=()=>{if(!repEdit.line.length)return;game.undo();repEdit.line.pop();boardShapes=[];render();drawRepEdit()};
  t.querySelector('.rep-cancel').onclick=()=>{const c=repEdit.color;endRepEdit();void renderRepertoire(c)};
}
async function startRepDrill(color,count=0){
  if(liveGameOn()&&mode!=='computer')return toast('Drills open after your game');
  if(!repertoire)await loadRepertoire();
  const d=repDrill(repertoire[color],color);if(!d)return toast(color==='w'?'Add a line as White first':'Add a line as Black first');
  cancelPremove(false);if(watchSession)stopWatching();if(archiveSession)leaveArchive({reset:false});if(repEdit)endRepEdit({restore:false});
  streakSession=null;game.reset();mode='puzzle';serverGameId=null;clockSnapshot=null;browse=null;boardShapes=[];
  const offset=color==='b'?1:0;
  if(offset){const u=d.ucis[0];rememberLastMove(game.move({from:u.slice(0,2),to:u.slice(2,4),promotion:u[4]||undefined}))}
  flipped=color==='b';orientationSet=true;
  puzzleSession={id:`rep-${color}-${count}`,solution:d.ucis.slice(offset),full:d.ucis,offset,index:0,played:[],started:Date.now(),failed:false,trainer:true,kind:'repertoire',misses:0,color,count,lines:repertoire[color]};
  setPrimaryScreen('game');render();
  setDynamicView('repertoire','Repertoire drill',`<article class="puzzle-info trainer-drill"><small>REPERTOIRE · ${color==='w'?'AS WHITE':'AS BLACK'} · LINE ${count+1}</small><h4>Play your prepared moves</h4><p>The computer answers with one of the replies you prepared for. Any move from your lines counts.</p><div class="streak-actions"><button class="trainer-skip">Next line</button><button class="trainer-stop">Stop</button></div></article>`);
  $('#dynamicView .trainer-skip').onclick=()=>startRepDrill(color,count+1);
  $('#dynamicView .trainer-stop').onclick=()=>{puzzleSession=null;mode='room';game.reset();boardShapes=[];render();void renderRepertoire(color)};
}
// ---- Insights (src/insights.js): where your points go ----
const leakActions={endgames:()=>renderEndgames(),repertoire:l=>void renderRepertoire(l.color||'w'),mistakes:()=>renderMistakes(),play:()=>activateNav('play')};
async function renderInsights(pool=null){
  setDynamicView('insights','Insights',brandLoading('Reading your games…'));
  if(!signedIn()){const t=$('#dynamicView .view-content');if(t)t.innerHTML='<p class="menu-empty">Sign in to see insights from your rated and casual games.</p>';return}
  let data;try{data=await api.insights()}catch(error){toast(error.message);return}
  if(currentRightView!=='insights')return;const target=$('#dynamicView .view-content');if(!target)return;
  const rows=data.games||[],s=insightSummary(rows),pools=insightPools(rows),active=pool&&pools.includes(pool)?pool:pools[0],series=active?ratingSeries(rows,active):[];
  if(!repertoire)await loadRepertoire().catch(()=>null);
  const dev=repertoire?rows.map(r=>({r,d:repDeviation(repertoire[r.color]||[],r.color,r.sans||[])})).filter(x=>x.d):[];
  const bar=o=>`<span class="ex-bar" aria-label="${o.wins} wins, ${o.draws} draws, ${o.losses} losses"><i class="w" style="width:${Math.round(100*o.wins/o.games)}%"></i><i class="d" style="width:${Math.round(100*o.draws/o.games)}%"></i><i class="b" style="width:${Math.round(100*o.losses/o.games)}%"></i></span>`;
  const reasonName={time:'On time',resigned:'Resigned',left:'Left the game',checkmate:'Checkmated',other:'Other'},phaseName={opening:'In the opening',middlegame:'In the middlegame',endgame:'In the endgame'},strengthName={stronger:'Against stronger players',similar:'Against similar players',weaker:'Against weaker players'};
  target.innerHTML=s.games?`<article class="insights">
    <div class="ins-head"><div><small>GAMES</small><b>${s.games}</b></div><div><small>SCORE</small><b>${s.score}%</b></div>${s.colors.map(c=>`<div><small>${c.key==='w'?'AS WHITE':'AS BLACK'}</small><b>${c.score}%</b></div>`).join('')}</div>
    ${s.leaks.length?`<h4>Worth working on</h4><div class="ins-leaks">${s.leaks.map((l,i)=>`<div class="ins-leak"><p>${escapeHtml(l.text)}</p>${leakActions[l.action]?`<button data-leak="${i}">${l.action==='repertoire'?'Open repertoire':l.action==='mistakes'?'Learn from your mistakes':l.action==='endgames'?'Endgame drills':'Play'}</button>`:''}</div>`).join('')}</div>`:''}
    ${pools.length?`<h4>Rating</h4><div class="ex-source ins-pools">${pools.map(p=>`<button type="button" class="ex-src${p===active?' on':''}" data-pool="${p}">${escapeHtml(p[0].toUpperCase()+p.slice(1))}</button>`).join('')}</div>${series.length>=2?ratingChartSvg(series):'<p class="menu-empty">The rating line appears after two rated games in a pool.</p>'}`:''}
    <h4>Openings</h4><div class="ins-table">${s.openings.slice(0,8).map(o=>`<div><span><b>${escapeHtml(o.name)}</b><small>${o.color==='w'?'as White':'as Black'} · ${o.games} games</small></span>${bar(o)}<em>${o.score}%</em></div>`).join('')}</div>
    ${dev.length?`<p class="ins-note">You left your repertoire in ${dev.length} ${dev.length===1?'game':'games'}. Most recent: ${escapeHtml(dev[0].d.played)} instead of ${escapeHtml(dev[0].d.expected.join(' / '))}.</p>`:''}
    ${s.losses?`<h4>How you lose</h4><div class="ins-table">${s.lossReasons.map(r=>`<div><span><b>${escapeHtml(reasonName[r.reason]||r.reason)}</b></span><span class="ins-meter"><i style="width:${r.share}%"></i></span><em>${r.share}%</em></div>`).join('')}${s.lossPhases.filter(p=>p.n).map(p=>`<div><span><b>${escapeHtml(phaseName[p.phase])}</b></span><span class="ins-meter"><i style="width:${p.share}%"></i></span><em>${p.share}%</em></div>`).join('')}</div>`:''}
    ${s.strength.length?`<h4>By opponent</h4><div class="ins-table">${['stronger','similar','weaker'].map(k=>s.strength.find(x=>x.key===k)).filter(Boolean).map(o=>`<div><span><b>${escapeHtml(strengthName[o.key])}</b><small>${o.games} games</small></span>${bar(o)}<em>${o.score}%</em></div>`).join('')}</div>`:''}
    ${s.pools.length?`<h4>By time control</h4><div class="ins-table">${s.pools.map(o=>`<div><span><b>${escapeHtml(o.key[0].toUpperCase()+o.key.slice(1))}</b><small>${o.games} games</small></span>${bar(o)}<em>${o.score}%</em></div>`).join('')}</div>`:''}
  </article>`:'<p class="menu-empty">Play a few games to see your insights.</p>';
  target.querySelectorAll('[data-pool]').forEach(b=>b.onclick=()=>void renderInsights(b.dataset.pool));
  target.querySelectorAll('[data-leak]').forEach(b=>b.onclick=()=>{const l=s.leaks[Number(b.dataset.leak)];leakActions[l.action]?.(l)});
}
// ---- Vacation for daily games: your clocks don't run out while you're away ----
function drawVacation(list){
  const v=socialState.vacation;if(!v||!signedIn())return;
  let box=list.parentElement?.querySelector('.vacation-box');
  if(!box){box=document.createElement('div');box.className='vacation-box';list.after(box)}
  box.innerHTML=v.on?`<p><b>On vacation until ${escapeHtml(new Date(v.until).toLocaleString())}</b><small>Your daily-game clocks won't run out. ${v.left} of ${v.perYear} days left this year.</small></p><button class="vacation-end">End vacation</button>`
    :`<p><b>Vacation</b><small>Going away? Your daily-game clocks won't run out. ${v.left} of ${v.perYear} days left this year.</small></p>${v.left?`<form class="vacation-form"><select name="days" aria-label="Vacation days">${[...Array(v.left)].map((_,i)=>`<option value="${i+1}">${i+1} ${i?'days':'day'}</option>`).join('')}</select><button>Start vacation</button></form>`:''}`;
  box.querySelector('.vacation-end')?.addEventListener('click',async()=>{try{const out=await api.vacation({end:true});socialState.vacation=out.vacation;toast('Welcome back');drawVacation(list)}catch(error){toast(error.message)}});
  box.querySelector('.vacation-form')?.addEventListener('submit',async e=>{e.preventDefault();const days=Number(new FormData(e.currentTarget).get('days'));try{const out=await api.vacation({days});socialState.vacation=out.vacation;toast('Vacation started');drawVacation(list)}catch(error){toast(error.message)}});
}
// ---- Endgame drills (src/endgames.js): textbook positions against Stockfish ----
const egWorker=lazyWorker('/stockfish.worker.js');let egPending=null,egSeq=0;
egWorker.onmessage=({data})=>{
  if(!egPending||data.requestId!==egPending.id)return;
  const line=String(data.line||'');
  if((data.type==='uci'&&line.startsWith('bestmove '))||data.type==='unavailable'){const p=egPending;egPending=null;p.resolve(line.split(/\s+/)[1]||null)}
};
function egBest(fen,depth=14){return new Promise(resolve=>{const id=`eg-${++egSeq}`;if(egPending){egPending.resolve(null)}egPending={id,resolve};egWorker.postMessage({mode:'analysis',fen,depth,requestId:id})})}
function renderEndgames(){
  if(egSession)endEndgame({restore:false});
  const progress=loadProgress();
  setDynamicView('endgames','Endgame drills',`<article class="endgames"><p class="trainer-intro">Win (or hold) textbook endgames against the computer at full strength. Beat the par for three stars.</p><div class="eg-list">${DRILLS.map(d=>`<button class="eg-card" data-eg="${d.id}"><span><small>${escapeHtml(d.level)}</small><b>${escapeHtml(d.title)}</b><em>${d.goal==='hold'?`Hold for ${d.limit} moves`:`Par ${d.par} moves`}</em></span><span class="eg-stars" aria-label="${progress[d.id]||0} of 3 stars">${[1,2,3].map(n=>`<i class="${n<=(progress[d.id]||0)?'on':''}"></i>`).join('')}</span></button>`).join('')}</div></article>`);
  $$('#dynamicView [data-eg]').forEach(b=>b.onclick=()=>startEndgame(b.dataset.eg));
}
function startEndgame(id){
  const drill=drillById(id);if(!drill)return;
  if(liveGameOn()&&mode!=='computer')return toast('Drills open after your game');
  cancelPremove(false);if(watchSession)stopWatching();if(archiveSession)leaveArchive({reset:false});
  puzzleSession=null;streakSession=null;if(exploreSession)endExplore({restore:false});if(repEdit)endRepEdit({restore:false});
  if(mode==='computer'&&computerStarted){computerStarted=false;currentBot=null;myColor=null}
  game.load(drill.fen);boardShapes=[];selected=null;mode='endgame';serverGameId=null;clockSnapshot=null;browse=null;
  const color=yourColor(drill);egSession={drill,color,moves:0,over:false,thinking:false};flipped=color==='b';orientationSet=true;
  setPrimaryScreen('game');render();updateMoves();drawEndgame();
  if(game.turn()!==color)void egReply();
}
function endEndgame({restore=true}={}){if(!egSession)return;egSession=null;if(egPending){egPending.resolve(null);egWorker.postMessage({action:'stop'})}if(mode==='endgame'){mode='room';if(restore){game.reset();boardShapes=[];render();updateMoves()}}}
function drawEndgame(result=null){
  const s=egSession;if(!s)return;const d=s.drill,goal={mate:'Checkmate the king',promote:'Promote the pawn and keep the queen',hold:`Hold the draw for ${d.limit} moves`}[d.goal];
  const html=`<article class="puzzle-info eg-drill"><small>${escapeHtml(d.level.toUpperCase())} · ${s.color==='w'?'YOU PLAY WHITE':'YOU PLAY BLACK'}</small><h4>${escapeHtml(d.title)}</h4><p><b>${escapeHtml(goal)}</b>${d.goal==='hold'?'':` · par ${d.par}`}</p><div class="puzzle-progress">Moves <b>${s.moves}</b>${d.goal==='hold'?` of ${d.limit}`:` · limit ${d.limit}`}</div>${result?`<div class="eg-result ${result.success?'win':'fail'}"><b>${result.success?'Done':'Not this time'}</b><span>${escapeHtml(result.text)}</span>${result.success?`<span class="eg-stars">${[1,2,3].map(n=>`<i class="${n<=result.stars?'on':''}"></i>`).join('')}</span>`:''}</div>`:`<p class="eg-tip">${escapeHtml(d.tip)}</p>`}<div class="streak-actions"><button class="eg-hint"${result||s.thinking?' disabled':''}>Hint</button><button class="eg-restart">Restart</button><button class="eg-back">All drills</button></div></article>`;
  if(currentRightView!=='endgames')setDynamicView('endgames','Endgame drills',html);else{const t=$('#dynamicView .view-content');if(t)t.innerHTML=html}
  $('#dynamicView .eg-restart').onclick=()=>startEndgame(d.id);
  $('#dynamicView .eg-back').onclick=()=>{endEndgame();renderEndgames()};
  $('#dynamicView .eg-hint').onclick=async()=>{if(!egSession||egSession.over||game.turn()!==egSession.color)return;const fen=game.fen(),best=await egBest(fen,16);if(!best||!egSession||game.fen()!==fen)return;boardShapes=[{from:best.slice(0,2),to:best.slice(2,4),brush:'green'}];render()};
}
function egCheck(made){
  const s=egSession,st=drillStatus(s.drill,game,s.moves,made);if(!st.done)return false;
  s.over=true;const stars=starsFor(s.drill,s.moves,st.success);if(st.success){saveStars(s.drill.id,stars);markPlan('endgame')}
  const text={mate:`Checkmate in ${s.moves} moves.`,promoted:`Promoted in ${s.moves} moves.`,held:`You held for ${s.moves} moves.`,draw:'A draw: you held it.',mated:'You were checkmated.',queened:'Their pawn became a queen.',stalemate:'Stalemate: the king had no moves.','lost material':'Your last piece was taken.','out of moves':`Not done within ${s.drill.limit} moves.`}[st.reason]||'';
  playUiSound(st.success?'win':'lose');drawEndgame({success:st.success,stars,text});return true;
}
function egMove(move){
  const s=egSession;if(!s||s.over||s.thinking||game.turn()!==s.color)return;
  let made=null;try{made=game.move({from:move.from,to:move.to,promotion:move.promotion||'q'})}catch{}
  if(!made)return rejectMove(move.from,move.to);
  s.moves++;boardShapes=[];rememberLastMove(made);render({hint:made});afterBoardPaint(playTone);updateMoves();
  if(egCheck(made))return;drawEndgame();void egReply();
}
async function egReply(){
  const s=egSession;if(!s||s.over)return;s.thinking=true;
  const fen=game.fen(),best=await egBest(fen);
  if(egSession!==s||game.fen()!==fen){return}
  s.thinking=false;if(!best)return toast('The computer is unavailable in this browser.');
  let made=null;try{made=game.move({from:best.slice(0,2),to:best.slice(2,4),promotion:best[4]||undefined})}catch{}
  if(!made)return;rememberLastMove(made);render({hint:made});afterBoardPaint(playTone);updateMoves();
  if(!egCheck(made))drawEndgame();
}
// ---- Today's training (src/training-plan.js): a short plan from your own data, with a streak ----
function planInputs(){
  const eg=loadProgress();return {repertoireLines:(repertoire?.w?.length||0)+(repertoire?.b?.length||0)||(localRepertoire().w.length+localRepertoire().b.length),mistakesDue:mistakeStats(loadMistakes()).due||0,endgames:DRILLS.map(d=>({id:d.id,title:d.title,stars:eg[d.id]||0})),weakTheme:todayPlan?.weakTheme||null,weakThemeLabel:todayPlan?.weakTheme?themeLabel(todayPlan.weakTheme):''};
}
function currentPlan(){return buildPlan(planInputs())}
function planHeadline(){const tasks=currentPlan(),pr=loadPlanProgress(),done=tasks.filter(t=>(pr.done[t.id]||0)>=t.target).length;return planComplete(tasks,pr)?'Done for today':`${done} of ${tasks.length} done`}
function markPlan(id){
  try{const out=planTick(currentPlan(),id);if(out.completedNow){toast(`Today's training done · ${out.streak.days} ${out.streak.days===1?'day':'days'} in a row`);playUiSound('win')}if(currentRightView==='plan')drawPlan()}catch{}
}
async function renderPlan(){
  if(!todayPlan){todayPlan={weakTheme:null};if(signedIn())try{const st=await api.puzzleStats();const w=weakestThemes(st.themes||[])[0];if(w)todayPlan.weakTheme=w.theme}catch{}}
  drawPlan();
}
function drawPlan(){
  const tasks=currentPlan(),pr=loadPlanProgress(),streak=loadStreak(),days=currentStreak(streak),done=planComplete(tasks,pr);
  setDynamicView('plan',"Today's training",`<article class="plan"><div class="plan-head"><div><small>STREAK</small><b>${days}</b><span>${days===1?'day':'days'} · best ${Math.max(streak.best||0,days)}</span></div><p>${done?'All done for today. Come back tomorrow to keep the streak.':'Finish every task today to keep your streak going.'}</p></div>
    <div class="plan-list">${tasks.map(t=>{const n=Math.min(t.target,pr.done[t.id]||0),ok=n>=t.target;return `<div class="plan-task${ok?' done':''}"><span><b>${escapeHtml(t.label)}</b><small>${n} / ${t.target}</small></span><span class="ins-meter"><i style="width:${Math.round(100*n/t.target)}%"></i></span>${ok?'<em>Done</em>':`<button data-plan="${t.id}">Go</button>`}</div>`}).join('')}</div></article>`);
  $$('#dynamicView [data-plan]').forEach(b=>b.onclick=()=>{const t=tasks.find(x=>x.id===b.dataset.plan);if(!t)return;
    if(t.id==='puzzles'){if(t.theme)puzzleAngle=t.theme;showBackendView('puzzle')}
    else if(t.id==='endgame')startEndgame(t.drill);
    else if(t.id==='repertoire')void startRepDrill((repertoire?.w?.length||localRepertoire().w.length)?'w':'b',0);
    else if(t.id==='mistakes')renderMistakes();
    else activateNav('play')});
}
// ---- Prep against a player (src/prep.js): their openings, as often as they play them ----
async function renderPrep(username){
  setDynamicView('prep',`Prep against ${username}`,brandLoading('Reading their games…'));
  let d;try{d=await api.playerOpenings(username)}catch(error){toast(error.message);return}
  if(currentRightView!=='prep')return;const target=$('#dynamicView .view-content');if(!target)return;
  const asW=prepSummary(d.lines.w),asB=prepSummary(d.lines.b);
  target.innerHTML=`<article class="prep"><p class="trainer-intro">Practise against the openings ${escapeHtml(d.player.name)} plays in rated games. They reply with their usual moves, as often as they choose them, until their book runs out.</p>
    <div class="prep-cols"><div><h4>They play as White <small>${d.lines.w.length} games</small></h4>${asW.map(x=>`<p><b>${escapeHtml(x.line)}</b><em>${x.n}</em></p>`).join('')||'<p class="menu-empty">No games yet.</p>'}<button class="gold" data-prep="b"${d.lines.w.length?'':' disabled'}>Practise as Black</button></div>
    <div><h4>They play as Black <small>${d.lines.b.length} games</small></h4>${asB.map(x=>`<p><b>${escapeHtml(x.line)}</b><em>${x.n}</em></p>`).join('')||'<p class="menu-empty">No games yet.</p>'}<button class="gold" data-prep="w"${d.lines.b.length?'':' disabled'}>Practise as White</button></div></div></article>`;
  target.querySelectorAll('[data-prep]').forEach(b=>b.onclick=()=>startPrep(d,b.dataset.prep));
}
function startPrep(d,color){
  if(liveGameOn()&&mode!=='computer')return toast('Prep opens after your game');
  cancelPremove(false);if(watchSession)stopWatching();if(archiveSession)leaveArchive({reset:false});
  puzzleSession=null;streakSession=null;if(exploreSession)endExplore({restore:false});if(repEdit)endRepEdit({restore:false});if(egSession)endEndgame({restore:false});
  if(mode==='computer'&&computerStarted){computerStarted=false;currentBot=null;myColor=null}
  const theirs=color==='w'?d.lines.b:d.lines.w;
  game.reset();boardShapes=[];selected=null;mode='prep';serverGameId=null;clockSnapshot=null;browse=null;
  prepSession={data:d,color,tree:prepTree(theirs),out:false};flipped=color==='b';orientationSet=true;
  setPrimaryScreen('game');render();updateMoves();drawPrep();
  if(game.turn()!==color)setTimeout(prepTheirMove,350);
}
function endPrep({restore=true}={}){if(!prepSession)return;prepSession=null;if(mode==='prep'){mode='room';if(restore){game.reset();boardShapes=[];render();updateMoves()}}}
function prepTheirMove(){
  const s=prepSession;if(!s||game.turn()===s.color)return;
  const san=prepReply(s.tree,game.fen());
  if(!san){s.out=true;drawPrep();return}
  let made=null;try{made=game.move(san)}catch{}if(!made){s.out=true;drawPrep();return}
  rememberLastMove(made);render({hint:made});afterBoardPaint(playTone);updateMoves();drawPrep();
}
function prepMove(move){
  const s=prepSession;if(!s||game.turn()!==s.color)return;
  let made=null;try{made=game.move({from:move.from,to:move.to,promotion:move.promotion||'q'})}catch{}
  if(!made)return rejectMove(move.from,move.to);
  rememberLastMove(made);render({hint:made});afterBoardPaint(playTone);updateMoves();drawPrep();
  setTimeout(prepTheirMove,450);
}
function drawPrep(){
  const s=prepSession;if(!s)return;const name=s.data.player.name,mine=game.turn()===s.color;
  const stats=prepStats(s.tree,game.fen()),plies=game.history().length;
  const html=`<article class="puzzle-info prep-live"><small>PREP · YOU PLAY ${s.color==='w'?'WHITE':'BLACK'}</small><h4>${s.out?`Out of their book after ${plies} moves`:mine?'Your move':`${escapeHtml(name)} is choosing…`}</h4>
    ${s.out?`<p>${escapeHtml(name)} has never reached this position in a rated game. You know where their preparation ends.</p>`:mine&&stats.length===0&&plies?'<p>Play your move; their reply comes from their games.</p>':''}
    ${!mine&&stats.length?`<div class="prep-stats">${stats.slice(0,5).map(r=>`<p><b>${escapeHtml(r.san)}</b><span class="ins-meter"><i style="width:${r.share}%"></i></span><em>${r.share}% · scores ${r.score}%</em></p>`).join('')}</div>`:''}
    <div class="streak-actions"><button class="prep-restart">Restart</button><button class="prep-switch">Switch colour</button><button class="prep-back">Back</button></div></article>`;
  if(currentRightView!=='prep')setDynamicView('prep',`Prep against ${name}`,html);else{const t=$('#dynamicView .view-content');if(t)t.innerHTML=html}
  $('#dynamicView .prep-restart').onclick=()=>startPrep(s.data,s.color);
  $('#dynamicView .prep-switch').onclick=()=>startPrep(s.data,s.color==='w'?'b':'w');
  $('#dynamicView .prep-back').onclick=()=>{const d=s.data;endPrep();void renderPrep(d.player.name)};
}
// ---- Round 11: Your Shadow, the Vanta Gauntlet and Relic sets (src/shadow.js, gauntlet.js, relics.js) ----
async function playComputer(opts){
  if(liveGameOn()&&mode!=='computer')return toast('Finish your game first');
  if(mode!=='computer')await activateLeftMode('computer');
  setPrimaryScreen('game');startComputerGame(opts);
}
function shadowMove(){
  if(mode!=='computer'||!currentBot?.shadowTree||game.history().length>=SHADOW_PLIES)return null;
  const san=prepReply(currentBot.shadowTree,game.fen());if(!san)return null;
  const move=game.moves({verbose:true}).find(m=>m.san===san);return move?{move,fen:game.fen()}:null;
}
const scoreOf=(result,color)=>result==='1/2-1/2'?.5:!['1-0','0-1'].includes(result)?null:(result==='1-0')===(color==='w')?1:0;
function earnRelic(id){
  const out=unlockRelic(loadRelics(),id);if(!out.unlocked)return;
  saveRelics(out.state);setTimeout(()=>{const stung=cue('relic','win');toast(`Relic earned: ${out.unlocked.name}`,{duration:2600,sound:stung?false:'notify'})},900);
}
function roundElevenGameOver(info){
  if(info.online){void rivalRelicCheck(info);return}
  if(mode!=='computer')return;
  const score=scoreOf(info.result,info.myColor);if(score===null)return;
  if(computerRules==='dark'||computerRules==='blackout'){if(boardDom)boardDom.moodKey='';render();updateMoves()} // the lights come back on
  if(computerRules==='dark'&&score===1)earnRelic('umbra');
  if(computerRules==='blackout'&&score===1)earnRelic('ember');
  if(currentBot?.shadowTree&&score===1)earnRelic('mirror');
  if(Number.isInteger(currentBot?.gauntletStage)){
    const g=loadGauntlet();if(!g.run||g.run.pending!==currentBot.gauntletStage)return;
    const out=recordStage({...g,run:{...g.run,pending:null}},score);saveGauntlet(out.state);
    if(out.state.best>=3)earnRelic('obsidian');if(out.event==='cleared')earnRelic('gilded');
    const next=out.state.run?GAUNTLET_STAGES[out.state.run.stage]:null;
    toast(out.event==='advanced'?`Stage cleared · next: ${next.name}`:out.event==='life'?`${out.state.run.lives} ${out.state.run.lives===1?'life':'lives'} left`:out.event==='cleared'?'You cleared the Vanta Gauntlet':'The Gauntlet ends here',{duration:2400});
    if(currentRightView==='gauntlet')drawGauntlet();
  }
}
async function rivalRelicCheck(info){
  if(scoreOf(info.result,info.myColor)!==1||!signedIn()||!serverGame)return;
  const opp=info.myColor==='w'?serverGame.black_player_id:serverGame.white_player_id;
  try{if((await loadRivals(true)).some(r=>r.id===opp))earnRelic('rivalry')}catch{}
}
// Your Shadow: your openings (as often as you play them), then Stockfish at your rating.
async function renderShadow(){
  setDynamicView('shadow','Your Shadow',brandLoading('Reading your games…'));
  let server=[];if(signedIn())try{server=(await api.archive(100)).games||[]}catch{}
  if(currentRightView!=='shadow')return;
  const lines=shadowLines(server,currentProfile?.id||currentPlayerId,loadLocalArchive()),elo=shadowElo(ratingFor('rapid'));
  const col=(color,label)=>{const list=prepSummary(lines[color]);return `<div><h4>${label} <small>${lines[color].length} games</small></h4>${list.map(x=>`<p><b>${escapeHtml(x.line)}</b><em>${x.n}</em></p>`).join('')||'<p class="menu-empty">No games yet: it plays at your rating from the first move.</p>'}</div>`};
  const target=$('#dynamicView .view-content');if(!target)return;
  target.innerHTML=`<article class="prep shadow"><p class="trainer-intro">Your Shadow plays the way you do: your openings, as often as you choose them, then your strength once your book runs out (about ${elo}). Beat it to earn the Mirror relic.</p>
    <div class="prep-cols">${col('w','You as White')}${col('b','You as Black')}</div>
    <div class="streak-actions"><button class="gold" data-shadow="w">Play as White</button><button class="gold" data-shadow="b">Play as Black</button></div></article>`;
  target.querySelectorAll('[data-shadow]').forEach(b=>b.onclick=()=>{const side=b.dataset.shadow,shadowColor=side==='w'?'b':'w';
    void playComputer({bot:{slug:'shadow',display_name:'Your Shadow',elo,portrait:'bk',shadowTree:shadowBook(lines,shadowColor)},side,variant:'standard'})});
}
// The Vanta Gauntlet: seven bots in a row, three lives. Leaving a stage unfinished costs a life.
function gauntletSettle(){
  const g=loadGauntlet();if(!g.run||g.run.pending==null)return g;
  if(computerStarted&&currentBot?.gauntletStage===g.run.pending&&computerLive())return g;
  const out=recordStage({...g,run:{...g.run,pending:null}},0);saveGauntlet(out.state);toast('An unfinished stage counts as a loss');return out.state;
}
function renderGauntlet(){setDynamicView('gauntlet','The Vanta Gauntlet','');drawGauntlet()}
function drawGauntlet(){
  const target=$('#dynamicView .view-content');if(!target||currentRightView!=='gauntlet')return;
  const g=gauntletSettle(),run=g.run,playing=run&&run.pending!=null;
  target.innerHTML=`<article class="gauntlet"><p class="trainer-intro">Seven computer opponents, each stronger than the last. A win moves you on; a draw or a loss costs one of your three lives. Colours alternate, starting with White.</p>
    <div class="gauntlet-head"><div><small>LIVES</small><b>${run?run.lives:GAUNTLET_LIVES} / ${GAUNTLET_LIVES}</b></div><div><small>BEST</small><b>${g.best} / ${GAUNTLET_STAGES.length}</b></div><div><small>CLEARED</small><b>${g.clears}</b></div></div>
    <ol class="gauntlet-stages">${GAUNTLET_STAGES.map((st,i)=>{const state=!run?'':i<run.stage?'done':i===run.stage?'current':'locked';return `<li class="${state}"><span><b>${escapeHtml(st.name)}</b><small>${st.elo} Elo · you play ${stageColor(i)==='w'?'White':'Black'}</small></span><em>${state==='done'?'Cleared':state==='current'?(playing?'Playing':'Next'):''}</em></li>`}).join('')}</ol>
    <div class="streak-actions">${run?`<button class="gold gauntlet-play"${playing?' disabled':''}>Play stage ${run.stage+1}</button><button class="gauntlet-quit">End this run</button>`:'<button class="gold gauntlet-start">Start a run</button>'}</div></article>`;
  const play=()=>{const st=loadGauntlet();if(!st.run)return;const i=st.run.stage,stage=GAUNTLET_STAGES[i];saveGauntlet({...st,run:{...st.run,pending:i}});
    void playComputer({bot:{slug:`gauntlet-${i}`,display_name:stage.name,elo:stage.elo,portrait:['bp','bn','bb','br','bq','bk','bk'][i],gauntletStage:i},side:stageColor(i),variant:'standard'})};
  target.querySelector('.gauntlet-start')?.addEventListener('click',()=>{saveGauntlet(newGauntletRun(loadGauntlet()));play()});
  target.querySelector('.gauntlet-play')?.addEventListener('click',play);
  target.querySelector('.gauntlet-quit')?.addEventListener('click',()=>{const st=loadGauntlet();saveGauntlet({...st,run:null});drawGauntlet()});
}
// Relic sets: earned board themes. Equipping keeps your own theme to put back later.
const RELIC_VARS=['--light','--dark','--mint','--gold'];
function currentThemeSnapshot(){const css=getComputedStyle(document.documentElement);return {...Object.fromEntries(RELIC_VARS.map(k=>[k,savedTheme[k]||css.getPropertyValue(k).trim()])),wallpaper:savedTheme.wallpaper||document.body.dataset.wallpaper||'classic'}}
function applyThemeSnapshot(t){
  for(const k of RELIC_VARS)if(t?.[k])setThemeVar(k,t[k]);
  const w=$('#wallpaper');if(t?.wallpaper&&w){w.value=t.wallpaper;w.onchange?.({target:w})}
}
function wearRelic(id){
  const st=loadRelics();
  if(id===null){if(st.prev)applyThemeSnapshot(st.prev);saveRelics(equipRelic(st,null));return}
  const relic=relicById(id),next=equipRelic(st,id,currentThemeSnapshot());if(next.equipped!==id||!relic)return;
  saveRelics(next);applyThemeSnapshot({...relic.theme,wallpaper:relic.wallpaper});
}
function renderRelics(){setDynamicView('relics','Relic sets','');drawRelics()}
function drawRelics(){
  const target=$('#dynamicView .view-content');if(!target||currentRightView!=='relics')return;
  const st=loadRelics();
  target.innerHTML=`<p class="trainer-intro">Board themes you earn by playing. Each set changes the squares, accent and wallpaper; your pieces stay your choice. Kept on this device.</p><div class="relic-grid">${RELICS.map(r=>{const have=!!st.unlocked[r.id],on=st.equipped===r.id;
    return `<article class="relic${have?' earned':' locked'}${on?' on':''}"><span class="relic-swatch" aria-hidden="true">${RELIC_VARS.map(k=>`<i style="background:${r.theme[k]}"></i>`).join('')}</span><div><h4>${escapeHtml(r.name)}</h4><small>${escapeHtml(r.how)}</small></div>${on?'<button data-relic-off>Take off</button>':have?`<button class="gold" data-relic="${r.id}">Equip</button>`:'<em>Locked</em>'}</article>`}).join('')}</div>`;
  target.querySelectorAll('[data-relic]').forEach(b=>b.onclick=()=>{wearRelic(b.dataset.relic);drawRelics()});
  target.querySelector('[data-relic-off]')?.addEventListener('click',()=>{wearRelic(null);drawRelics()});
}
// ---- Round 12: Veteran pieces, Oaths, Living atmosphere, Adaptive music and the Vanta Campaign ----
// (src/veterans.js, oaths.js, atmosphere.js, music.js, campaign.js). All of it lives on this device.
// The state variables are declared near the top of this file (round 12 block) so the board can
// call in here while the page is still starting.
// No module-level constants here: the first render reads these before this part of the file has run.
function r12Prefs(){
  if(!r12PrefsCache){let v=null;try{v=JSON.parse(localStorage.getItem('vch.r12')||'')}catch{}
    r12PrefsCache={veterans:v?.veterans==='off'?'off':'on',atmosphere:['full','subtle','off'].includes(v?.atmosphere)?v.atmosphere:'full'}}
  return r12PrefsCache;
}
function setR12Pref(key,value){r12PrefsCache={...r12Prefs(),[key]:value};try{localStorage.setItem('vch.r12',JSON.stringify(r12PrefsCache))}catch{}}
// Messages after a game come one after another instead of replacing each other.
function queueToast(text,{sound=null,sting=null,delay=1200}={}){
  r12ToastQueue.push({text,sound,sting});if(r12ToastTimer)return;
  const next=()=>{const item=r12ToastQueue.shift();if(!item){r12ToastTimer=null;return}const stung=item.sting&&cue(item.sting,null);toast(item.text,{duration:2500,sound:stung?false:item.sound||'notify'});r12ToastTimer=setTimeout(next,2700)};
  r12ToastTimer=setTimeout(next,delay);
}
function earnRelicQueued(id){const out=unlockRelic(loadRelics(),id);if(!out.unlocked)return;saveRelics(out.state);queueToast(`Relic earned: ${out.unlocked.name}`,{sound:'win',sting:'relic'})}

// Veteran pieces: your own pieces wear the ranks their careers have earned.
function veteranTotals(){if(!veteranState)veteranState=loadVeterans();return veteranState.totals}
// Which colours have any ranked piece at all (most boards have none: nothing to work out then).
function rankedColors(){if(!veteranState?.ranked){const t=veteranTotals();veteranState.ranked=new Set(Object.keys(t).filter(id=>rankOf(t[id])).map(id=>id[0]))}return veteranState.ranked}
function veteranColor(){if(watchSession)return null;if(serverGameId&&myColor)return myColor;if(mode==='computer'&&computerStarted)return computerSide;return null}
function veteranGameOk(){
  if(mode==='computer')return computerStarted&&['standard','dark','blackout'].includes(computerRules)&&!blackoutActive();
  return !!serverGameId&&(serverGame?.variant||'standard')==='standard'&&!serverGame?.start_fen;
}
function veteranIds(){
  const color=veteranColor();if(!color||!veteranGameOk()||!rankedColors().has(color))return null;
  const sans=currentHistory(),game_=`${serverGameId||'computer'}:${color}`;
  // Follow the game move by move; start again only for a new game or a takeback.
  let cache=vetCache;
  if(!cache||cache.game!==game_||cache.sans.length>sans.length||cache.sans.some((x,i)=>x!==sans[i]))cache=vetCache={game:game_,sans:[],chess:new Chess(),verbose:[],ids:null};
  if(cache.ids&&cache.sans.length===sans.length)return cache.ids;
  for(const san of sans.slice(cache.sans.length)){try{const m=cache.chess.move(san);if(!m)break;cache.verbose.push(m);cache.sans.push(san)}catch{break}}
  if(cache.sans.length<sans.length)cache.sans=[...sans]; // an unreadable move: keep what we know
  cache.ids=identitiesAfter(cache.verbose,color);return cache.ids;
}
function syncVeteranMarks(dom,boardGame){
  const ids=r12Prefs().veterans==='on'&&boardGame===game&&!reviewState.viewing&&!browse?veteranIds():null,totals=ids?veteranTotals():null;
  for(const [sq,el] of dom.pieces.elements){
    const id=ids?.get(sq),stats=id?totals[id]:null,rank=stats?rankOf(stats)?.id||'':'';
    if(rank){
      el.dataset.vetId=id;if(el.dataset.veteran===rank)continue;el.dataset.veteran=rank;
      if(!el.querySelector('.vet-mark')){const mark=document.createElement('i');mark.className='vet-mark';mark.setAttribute('aria-hidden','true');mark.append(document.createElement('b'),document.createElement('b'),document.createElement('b'));el.append(mark)}
    }else if(el.dataset.veteran){delete el.dataset.veteran;delete el.dataset.vetId;el.querySelector('.vet-mark')?.remove()}
  }
}
function veteranCardHtml(x){
  const deeds=[[x.captures,'capture'],[x.forks,'fork'],[x.checks,'check'],[x.mates,'mate'],[x.promotions,'promotion']].filter(([n])=>n>0).map(([n,w])=>`${n} ${w}${n===1?'':'s'}`).join(' · ')||'No deeds yet';
  return `<b>${escapeHtml(x.name)}</b>${x.epithet?`<em>${escapeHtml(x.epithet)}</em>`:''}<small>${escapeHtml(x.rankName)} · ${x.games} ${x.games===1?'game':'games'}${x.fell?` · fell ${x.fell}`:''}</small><span>${deeds}</span>`;
}
function showVeteranCard(el){
  const id=el?.dataset.vetId,stats=id?veteranTotals()[id]:null;if(!stats||!el.isConnected)return;
  const [x]=armyList(new Map([[id,stats]]));let card=$('#veteranCard');
  if(!card){card=document.createElement('div');card.id='veteranCard';card.className='veteran-card';card.setAttribute('role','tooltip');document.body.append(card)}
  card.innerHTML=veteranCardHtml(x);card.dataset.rank=x.rank||'';
  const r=el.getBoundingClientRect(),w=Math.min(250,window.innerWidth-16);card.style.width=`${w}px`;
  card.style.left=`${Math.max(8,Math.min(window.innerWidth-w-8,r.left+r.width/2-w/2))}px`;card.style.top=`${Math.max(8,r.top-8)}px`;
  card.classList.add('show');
}
function hideVeteranCard(){clearTimeout(vetHoverTimer);$('#veteranCard')?.classList.remove('show')}
// Careers grow one finished game at a time (this device's games and, signed in, your history).
async function refreshVeterans(force=false){
  if(veteranRefreshing)return veteranRefreshing;
  if(!force&&Date.now()-veteranRefreshAt<120000)return;
  veteranRefreshAt=Date.now();
  veteranRefreshing=(async()=>{
    const done=r=>['1-0','0-1','1/2-1/2'].includes(r),me=currentProfile?.id||currentPlayerId,entries=[];
    for(const e of loadLocalArchive()){if(done(e.result)&&['w','b'].includes(e.myColor)&&!String(e.pgn||'').includes('[FEN '))entries.push({id:e.id,pgn:e.pgn,myColor:e.myColor,variant:e.variant||'standard'})}
    if(signedIn())try{for(const g of (await api.archive(100)).games||[]){const color=g.white_player_id===me?'w':g.black_player_id===me?'b':null;if(color&&done(g.result))entries.push({id:g.id,sans:Array.isArray(g.sans)?g.sans:[],myColor:color,startFen:g.start_fen||null,variant:g.variant||'standard'})}}catch{}
    let state=loadVeterans(),t=performance.now(),added=0;const known=new Set(state.ids),fresh=entries.filter(e=>e.id&&!known.has(e.id));
    for(const e of fresh){
      if(!e.sans)e.sans=sansFromPgn(e.pgn);state=addGames(state,[e]);if(state.ids.at(-1)===e.id)added++;
      if(performance.now()-t>20){await new Promise(resolve=>setTimeout(resolve,0));t=performance.now()} // keep the page responsive
    }
    if(added){saveVeterans(state);veteranState=state;vetCache=null;if(boardDom)render();if(currentRightView==='army')drawArmy()}
  })().finally(()=>{veteranRefreshing=null});
  return veteranRefreshing;
}
function renderArmy(){setDynamicView('army','Your army',brandLoading('Counting your veterans…'));void refreshVeterans(true).then(drawArmy,drawArmy)}
function drawArmy(){
  const target=$('#dynamicView .view-content');if(!target||currentRightView!=='army')return;
  const map=totalsMap(veteranTotals()),style=normalizePieceStyle(document.documentElement.dataset.pieceStyle);
  const col=(color,label)=>{const list=armyList(map,color);
    return `<div class="army-col"><h4>${label}</h4>${list.length?list.map(x=>`<article class="army-piece${x.rank?` rank-${x.rank}`:''}"><img src="${pieceAssetFor(style,x.color+x.type)}" alt=""><div>${veteranCardHtml(x)}</div>${x.rank?`<i class="vet-mark" data-rank="${x.rank}" aria-hidden="true"><b></b><b></b><b></b></i>`:''}</article>`).join(''):'<p class="menu-empty">No games yet.</p>'}</div>`};
  target.innerHTML=`<article class="army"><p class="trainer-intro">Every piece is known by the square it starts on, and every standard game you finish adds to its record. Deeds earn ranks: Veteran at 5, Champion at 15, Legend at 40. Ranked pieces wear their marks on the board.</p><div class="army-cols">${col('w','As White')}${col('b','As Black')}</div></article>`;
}

// Oaths: three a day, sworn before a game, judged when it ends.
function todayKey(){return new Date().toISOString().slice(0,10)}
function oathPickId(){let v=null;try{v=JSON.parse(localStorage.getItem('vch.oathPick')||'')}catch{}return v?.day===todayKey()&&dailyOaths().includes(v.id)?v.id:''}
function readSessionOath(){try{const v=JSON.parse(sessionStorage.getItem('vch.oathNow')||'');return v&&oathById(v.id)?v:null}catch{return null}}
function writeSessionOath(v){try{if(v)sessionStorage.setItem('vch.oathNow',JSON.stringify(v));else sessionStorage.removeItem('vch.oathNow')}catch{}}
function syncOathPicker(){
  const sel=$('#oathPick');if(!sel)return;
  const ids=dailyOaths(),pick=oathPickId(),st=loadOaths();
  sel.innerHTML='<option value="">No oath</option>'+ids.map(id=>{const o=oathById(id);return `<option value="${id}">${escapeHtml(o.name)} · ${o.honor} honor</option>`}).join('');sel.value=pick;
  const vow=$('#oathVow'),o=oathById(pick);if(!vow)return;
  vow.innerHTML=o?`<b>${escapeHtml(o.vow)}</b> <span>${o.kind==='keep'?'Keep it and do not lose.':'Do it and win.'}</span> <em>Honor ${st.honor}</em>`:`<span>Optional. Keep it to earn honor and relics.</span>${st.honor?` <em>Honor ${st.honor}</em>`:''}`;
}
function swearOath(key,{startFen=null,ok=true,midGame=false}={}){
  const saved=readSessionOath();
  if(saved?.key===key)currentOath=saved;
  else{const id=oathPickId(),color=premovePlayerColor();currentOath=id&&ok&&!midGame&&color?{key,id,color,startFen:startFen||null,lastStatus:null}:null;writeSessionOath(currentOath)}
  oathLineKey='';syncOathLine();
}
function syncOathLine(){
  const line=$('#oathLine');if(!line)return;
  const o=currentOath;if(!o){if(!line.classList.contains('hidden')){line.classList.add('hidden');line.textContent=''}oathLineKey='';return}
  if(blackoutActive())return; // the lights are out: no news about your blind moves
  const sans=currentHistory(),key=`${o.key}:${sans.length}`;if(key===oathLineKey)return;oathLineKey=key;
  const oath=oathById(o.id),status=oathStatus(o.id,oathSummary(sans,o.color,o.startFen),{over:false});
  line.classList.remove('hidden');line.dataset.status=status;
  line.innerHTML=`<b>${escapeHtml(oath.name)}</b><span>${escapeHtml(oath.vow)}</span><em>${{holding:'Holding',broken:'Broken',pending:'Sworn',done:'Done'}[status]||''}</em>`;
  if(o.lastStatus&&o.lastStatus!==status){if(status==='broken')toast(`Oath broken · ${oath.name}`,{duration:1800});else if(status==='done')toast('Deed done · now win the game',{duration:1800})}
  o.lastStatus=status;writeSessionOath(o);
}
function settleOath(info,score){
  const o=currentOath;if(!o)return null;
  const mine=info.online?o.key===`online:${serverGame?.id}`:o.key.startsWith('computer:');if(!mine)return null;
  currentOath=null;writeSessionOath(null);syncOathLine();
  const oath=oathById(o.id);if(score===null){queueToast(`Oath released · ${oath.name}`);return null}
  const status=oathStatus(o.id,oathSummary(currentHistory(),o.color,o.startFen),{over:true,score}),out=recordOath(loadOaths(),o.id,status);saveOaths(out.state);
  queueToast(status==='fulfilled'?`Oath fulfilled · ${oath.name} · +${out.gained} honor`:status==='broken'?`Oath broken · ${oath.name}`:`Oath failed · ${oath.name}`,{sound:status==='fulfilled'?'win':null});
  for(const relic of out.relics)earnRelicQueued(relic);
  syncOathPicker();return status;
}

// Living atmosphere and adaptive music: driven by the position and the clocks only.
function ensureAtmosphere(){
  if(atmoEl?.isConnected)return atmoEl;
  atmoEl=document.createElement('div');atmoEl.id='atmosphere';atmoEl.setAttribute('aria-hidden','true');
  atmoEl.innerHTML='<i class="atmo-glow"></i><i class="atmo-weather"></i><i class="atmo-flash"></i>';
  document.body.prepend(atmoEl);return atmoEl;
}
function queueAtmosphere(){if(atmoQueued)return;atmoQueued=true;requestAnimationFrame(()=>{atmoQueued=false;syncAtmosphere()})}
function currentAtmosphere(){
  const color=premovePlayerColor(),live=liveGameOn()&&!!color;
  if(!live&&atmoEnd&&Date.now()-atmoEnd.at<15000)return atmosphereFor({over:true,won:atmoEnd.won});
  if(!live)return atmosphereFor({});
  const clocks=currentClockSeconds(),daily=!!serverGame?.daily||Number(serverGame?.time_control_seconds)>=86400;
  const base=mode==='computer'?(computerRules==='blackout'?BLACKOUT_SECONDS:600):Number(serverGame?.time_control_seconds||serverGame?.base_seconds||600);
  return atmosphereFor({live:true,inCheck:game.inCheck()&&game.turn()===color,myColor:color,fen:blackoutActive()?'':game.fen(),myClockSec:daily?null:clocks?.[color],baseSec:base});
}
function syncAtmosphere(){
  const el=ensureAtmosphere(),level=r12Prefs().atmosphere,mood=currentAtmosphere();
  if(el.dataset.level!==level)el.dataset.level=level;
  if(el.dataset.mood!==mood.mood)el.dataset.mood=mood.mood;
  const realm=atmosphereRealm||'';if((el.dataset.realm||'')!==realm){if(realm)el.dataset.realm=realm;else delete el.dataset.realm}
  const strength=String(mood.strength);if(el.style.getPropertyValue('--atmo')!==strength)el.style.setProperty('--atmo',strength);
  syncWallLights(mood);syncResonanceGame(mood);syncMusic(mood);syncOathLine();noticeDivision();
}
// Living wallpaper (src/wallpaper-lights.js): a soft glow over every candle and lamp in the
// wallpaper, flickering on its own. With the living atmosphere on Full, the room answers the
// game: a breath on each move, the flames gutter on a capture and flare on a check, tremble in
// time trouble and rise or fall with the game; the pointer stirs the flames it passes.
let wallLights={el:null,glow:null,moveKey:null,stirAt:0};
function wallLightsLayer(){
  const level=r12Prefs().atmosphere,body=document.body;
  let el=document.getElementById('wallLights');
  const drop=()=>{wallLights.glow?.stop();wallLights.glow=null;el?.remove();wallLights.el=null;return null};
  if(level==='off')return drop();
  const cs=getComputedStyle(body),key=wallpaperKey(cs.backgroundImage);
  if(!key)return drop();
  const scroll=!/fixed/.test(cs.backgroundAttachment),w=scroll?body.clientWidth:innerWidth,h=scroll?Math.max(body.scrollHeight,innerHeight):innerHeight;
  if(!el){el=document.createElement('canvas');el.id='wallLights';el.setAttribute('aria-hidden','true');const atmo=document.getElementById('atmosphere');if(atmo)body.insertBefore(el,atmo);else body.prepend(el)}
  if(!wallLights.glow||wallLights.glow.canvas!==el)wallLights.glow=new WallLights(el);
  if(el.dataset.level!==level){el.dataset.level=level;wallLights.glow.fps=level==='full'?15:8}
  el.classList.toggle('scroll',scroll);
  const size=scroll?[`${w}px`,`${h}px`]:['',''];if(el.style.width!==size[0]){el.style.width=size[0];el.style.height=size[1]}
  const sig=`${key}:${w}x${h}`;
  if(el.dataset.sig!==sig){el.dataset.sig=sig;const lights=placeLights(key,w,h);wallLights.glow.setLights(lights,w,h);el.dataset.lights=String(lights.length)}
  const still=matchMedia('(prefers-reduced-motion: reduce)').matches||document.visibilityState!=='visible';
  if(still){if(wallLights.glow.running||!wallLights.glow.still)wallLights.glow.stop({still:true})}else wallLights.glow.start();
  wallLights.el=el;return el;
}
function syncWallLights(mood){
  const el=wallLightsLayer();if(!el)return;
  if(el.dataset.mood!==mood.mood){el.dataset.mood=mood.mood;wallLights.glow.speed={check:.45,storm:.6}[mood.mood]||1}
  const move=boardLastMove(),color=premovePlayerColor(),key=move?.to?`${move.from||''}${move.to}${move.san||''}:${moveRecords().length}`:'';
  if(key===wallLights.moveKey)return;
  const first=wallLights.moveKey===null;wallLights.moveKey=key;
  if(first||!key)return;
  // The flames hold still while a piece travels and any answer to the last move stops, so the
  // board gets every frame; in a live game the room answers as the piece lands.
  el.getAnimations?.().forEach(a=>a.cancel());
  wallLights.glow.hold(340);clearTimeout(wallLights.holdTimer);
  const react=el.dataset.level==='full'&&liveGameOn()&&color&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
  const san=String(move.san||''),kind=react?lightReaction({captured:!!move.captured||san.includes('x'),check:/[+#]/.test(san),mine:game.turn()!==color,fog:darkActive()||fogOnline()||blackoutActive()}):null;
  if(!kind)return;
  wallLights.holdTimer=setTimeout(()=>{
    const base=Number(getComputedStyle(el).opacity)||.9;
    // Opacity only: the compositor plays it on the one layer.
    const frames={breath:[{opacity:base},{opacity:Math.min(1,base*1.3),offset:.3},{opacity:base}],gutter:[{opacity:base},{opacity:base*.3,offset:.22},{opacity:base*.55,offset:.5},{opacity:base}],flare:[{opacity:base},{opacity:1,offset:.12},{opacity:base*.7,offset:.3},{opacity:1,offset:.5},{opacity:base}]}[kind];
    el.getAnimations?.().forEach(a=>a.cancel());el.animate?.(frames,{duration:kind==='breath'?700:kind==='gutter'?1700:1100,easing:'ease-out'});
    el.dataset.react=kind; // for tests and styles
  },340);
}
// The pointer stirs the flames it passes, like air moving through the room (only where the
// room shows, never during a move).
addEventListener('pointermove',e=>{
  const el=wallLights.el,glow=wallLights.glow;if(!el||!glow||el.dataset.level!=='full'||e.pointerType!=='mouse'||e.buttons||glow.held||!glow.running)return;
  if(e.target?.closest?.('.panel,.game,.topbar,.board,dialog,.main-menu'))return;
  const now=performance.now();if(now-wallLights.stirAt<90)return;wallLights.stirAt=now;
  const scroll=el.classList.contains('scroll'),n=glow.stir(scroll?e.pageX:e.clientX,scroll?e.pageY:e.clientY);
  if(n)el.dataset.stirred=String((Number(el.dataset.stirred)||0)+n);
},{passive:true});
document.addEventListener('visibilitychange',()=>{if(wallLights.el||musicPrefsGet().on)queueAtmosphere()}); // the candles and the music pause in a hidden tab and come back
addEventListener('resize',()=>{clearTimeout(wallLights.resizeTimer);wallLights.resizeTimer=setTimeout(queueAtmosphere,200)},{passive:true});
function musicPrefsGet(){if(!musicPrefs)musicPrefs=loadMusic();return musicPrefs}
// Your world (Theme Studio: World): one of the old worlds plays its own theme in the menus and its
// battle suite in your games, over your relic set's (a Campaign realm still plays its own).
function worldGet(){try{const v=localStorage.getItem(WORLD_KEY)||'';return WORLDS.includes(v)?v:''}catch{return ''}}
function musicKeyNow(){return musicKeyOverride||worldGet()||KEY_FOR_THEME[loadRelics().equipped]||'vanta'}
// The music (src/music.js, the tracks in src/music-library.js): with Music on it plays everywhere
// and follows you (or plays the station you chose), and every beat it plays reaches the room.
// The library loads the first time Music is on; until it has tracks the music waits.
let musicLibrary=null;
let scoreLibrary=null; // the music library on its way to the score (a promise of its tracks)
function ensureScore(){
  if(!vantaScore){
    vantaScore=new VantaScore();vantaScore.onNote(musicPulse);vantaScore.onNote(ev=>{if(ev.track)syncNowPlaying()});
    vantaScore.setLikes(musicLikesGet());vantaScore.setLanguage(uiLang);
    scoreLibrary=loadLibrary().then(tracks=>{musicLibrary=tracks;vantaScore.setTracks(musicTracks());queueAtmosphere();syncNowPlaying();return tracks});
    void loadMySongs();
  }
  return vantaScore.available?vantaScore:null;
}
// My music (src/my-music.js; owner, 2026-10-14: players "add their own songs"): song files you
// add from your device. They stay on it (the browser's own storage) and are never uploaded; the
// service worker plays them, on the My music station and in Everything, and they can be liked.
// Each is measured as it is added and brought to the library's loudness.
let mySongs=null,mySongsLoading=null,mySongsSettled=false,myMusicOn=false,myMusicNotes=[];
const MY_MUSIC_WORKS='serviceWorker' in navigator&&'indexedDB' in window;
function musicTracks(){return [...(musicLibrary||[]),...(myMusicOn?(mySongs||[]).map(songTrack):[])]}
// Your songs (once), and whether the service worker plays them.
function loadMySongs(fresh=false){
  if(!MY_MUSIC_WORKS)return Promise.resolve([]);
  if(fresh||!mySongsLoading)mySongsLoading=listSongs().catch(()=>[]).then(async songs=>{
    mySongs=songs;if(songs.length&&!myMusicOn)myMusicOn=await myMusicServed();
    if(vantaScore&&(musicLibrary||myMusicOn))vantaScore.setTracks(musicTracks());
    mySongsSettled=true;if(currentRightView==='music')drawMusicList();syncNowPlaying();return songs});
  return mySongsLoading;
}
// The score once its library has come (null if there is no music to play).
async function scoreReady(){const now=ensureScore();if(now)return now;await scoreLibrary;return ensureScore()}
// Where you are, for the music that follows the game: a Campaign boss, a fast game (three
// minutes or less, Blackout Blitz), any other game (yours, or one you watch), puzzles, lessons,
// study and analysis, the Relic sets (each set's own theme), the moments after a game (until you
// go somewhere else, or for two and a half minutes), or the menus.
const FOCUS_MODES=new Set(['puzzle','survival','lesson','study','analysis','endgame','explore','prep','repertoire','archive']);
function musicPlace(){
  if(liveGameOn()){
    const c=currentBot?.campaign;if(c&&REALMS.find(r=>r.id===c.realm)?.battles?.[c.i]?.boss)return 'boss';
    if(mode==='computer'?computerRules==='blackout':serverGame?.variant==='blackout')return 'blitz';
    const seconds=mode==='computer'?600:Number(serverGame?.time_control_seconds||serverGame?.base_seconds||600);
    return seconds<=180?'blitz':'game';
  }
  if(mode==='watch')return 'game';
  if(FOCUS_MODES.has(mode)||reviewState.viewing||!!analysis||currentRightView==='review')return 'focus';
  if(currentRightView==='relics')return 'skin';
  if(musicResult&&Date.now()-musicResult.at<150000)return 'result';
  return 'lobby';
}
// Your league division, for the menus' music (Bronze until you have one).
function musicDivision(){return currentProfile?.account?DIVISIONS[Math.max(0,Math.min(DIVISIONS.length-1,Number(currentProfile.league_division)||0))]:null}
// The relic set whose theme plays in the Relic sets (the one you wear).
const SKIN_FOR_RELIC={ember:'ember',ashen:'ember',rivalry:'ember',tidal:'tidal',umbra:'shadow',mirror:'crystal',court:'crystal',gilded:'gilded',crown:'gilded',paladin:'gilded',obsidian:'shadow',eclipse:'shadow',oathbound:'celestial'};
let musicPlaceWas=null;
function syncMusic(mood){
  if(resonanceRoom?.playing)return; // the Resonance room plays its own score
  const p=musicPrefsGet(),want=p.on&&!$('#sound')?.dataset.off&&document.visibilityState==='visible';
  if(!want){if(vantaScore?.playing)vantaScore.stop();return syncNowPlaying()}
  if(navigator.userActivation&&!navigator.userActivation.hasBeenActive)return; // browsers start sound only after a tap
  const score=ensureScore();if(!score)return syncNowPlaying();
  if(p.station==='mine'&&MY_MUSIC_WORKS&&!mySongsSettled){void loadMySongs();return syncNowPlaying()} // your songs first
  const place=musicPlace(),games=['game','boss','blitz','result'];
  // Into a game and out of it the music turns on its next bar line; anywhere else it waits a
  // moment first, in case you are only passing through.
  const urgent=musicPlaceWas!==null&&place!==musicPlaceWas&&(games.includes(place)||games.includes(musicPlaceWas));musicPlaceWas=place;
  score.setVolume(p.volume);score.setLanguage(uiLang);score.setStation(p.station);score.setKey(musicKeyNow());score.setDivision(musicDivision());
  score.setSkin(SKIN_FOR_RELIC[loadRelics().equipped]||null);if(musicResult)score.setResult(musicResult.result);
  score.setPlace(place,urgent);
  if(liveGameOn()){
    const storm=mood.mood==='storm'?mood.strength:0,records=moveRecords(),recent=blackoutActive()?0:records.slice(-6).filter(r=>r.captured).length;
    // How the game is going: ahead or behind on material (hidden in the dark, where you cannot see it).
    const color=premovePlayerColor(),hidden=blackoutActive()||darkActive()||fogOnline(),m=hidden||!color?null:materialFromFen(game.fen());
    musicMood=m?moodFor(color==='b'?m.b-m.w:m.w-m.b,musicMood):'even';
    score.setStorm(storm);score.setMood(musicMood);score.setTension(tensionFor({plies:records.length,inCheck:mood.mood==='check',recentCaptures:recent,storm}));
  }else{musicMood='even';score.setStorm(0);score.setMood('even');score.setTension(0)}
  if(!score.playing)score.start();
  syncNowPlaying();
}
// A new league division (signed-in players): a sting up or down, and a message.
function noticeDivision(){
  const div=musicDivision(),id=currentProfile?.id;if(!div||!id)return;
  const key=`vch.division.${id}`;let was=null;try{was=localStorage.getItem(key)}catch{}
  if(was===div)return;try{localStorage.setItem(key,div)}catch{}
  if(!was||!DIVISIONS.includes(was))return; // the first time: nothing to compare with
  const up=DIVISIONS.indexOf(div)>DIVISIONS.indexOf(was),name=div[0].toUpperCase()+div.slice(1);
  const stung=cue(up?'rank-up':'rank-down',null);
  toast(`${up?'Up a division':'Down a division'} · ${name}`,{duration:3200,sound:stung?false:up?'success':'notify'});
}
// The track playing now: under the Music setting, and on the now-playing panel.
function syncNowPlaying(){
  const el=$('#musicNow'),on=musicPrefsGet().on;if(on&&!vantaScore)ensureScore();
  const track=vantaScore?.nowPlaying,text=track?`Now playing · ${track.title}`:on&&musicLibrary&&!vantaScore?.available?'The music library is on its way':'';
  if(el&&el.textContent!==text)el.textContent=text;
  syncNowPanel(track);
}
// ---- Likes and the now-playing panel (owner, 2026-10-13: "always put a section that is grayed
// out... where players can see current music playing... or like next... only mouse hover brings
// the section back active"; "depending on the likes of the person, the music prioritizes their
// liked music") ----
// A small panel in a corner you choose (Theme Studio: Now playing), dim until you hover it: what
// plays, what comes next, and Like, Next and Not for me. Its bars move with the music's beats.
// Likes stay on this device (src/music.js loadMusicLikes): liked tracks come round about three
// times as often, the Liked station plays them, and a Not for me track never plays for you.
let musicLikes=null,nowPanel=null;
function musicLikesGet(){if(!musicLikes)musicLikes=loadMusicLikes();return musicLikes}
function setMusicLikes(next){musicLikes=saveMusicLikes(next);vantaScore?.setLikes(musicLikes);syncNowPlaying();if(currentRightView==='music')drawMusicList()}
const NOW_KEY='vch.nowPlaying',NOW_CORNERS=['bl','br','tr','off'];
function nowCorner(){try{const v=localStorage.getItem(NOW_KEY);return NOW_CORNERS.includes(v)?v:'bl'}catch{return 'bl'}}
function ensureNowPanel(){
  if(nowPanel?.isConnected)return nowPanel;
  nowPanel=document.createElement('aside');nowPanel.id='nowPlaying';nowPanel.className='now-playing';nowPanel.hidden=true;nowPanel.dataset.quiet='';nowPanel.setAttribute('aria-label','Music');
  nowPanel.innerHTML='<span class="np-bars" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span class="np-text"><b class="np-title"></b><small class="np-next"></small></span><span class="np-actions"><button type="button" data-np="like" aria-pressed="false">Like</button><button type="button" data-np="next">Next</button><button type="button" data-np="hide">Not for me</button></span>';
  nowPanel.addEventListener('click',e=>{
    const b=e.target.closest('[data-np]'),t=vantaScore?.nowPlaying;if(!b||!t)return;
    if(b.dataset.np==='next'){playUiSound('tap');vantaScore.skip();return}
    const id=t.of||t.id; // a battle suite's part: the like is for the whole suite
    if(b.dataset.np==='like'){const on=!musicLikesGet().liked.includes(id);setMusicLikes(likeTrack(musicLikesGet(),id,on));playUiSound(on?'toggle-on':'toggle-off');if(on)toast('Added to Liked',{sound:false,duration:1800});return}
    setMusicLikes(hideTrack(musicLikesGet(),id,true));playUiSound('toggle-off');toast("It won't play again for you",{sound:false,duration:2400});
  });
  document.body.append(nowPanel);
  return nowPanel;
}
function syncNowPanel(track){
  const corner=nowCorner(),show=!!track&&corner!=='off';
  if(!show){if(nowPanel)nowPanel.hidden=true;return}
  const panel=ensureNowPanel();panel.hidden=false;if(panel.dataset.corner!==corner)panel.dataset.corner=corner;
  const next=vantaScore?.upcoming,liked=musicLikesGet().liked.includes(track.of||track.id);
  const title=panel.querySelector('.np-title'),nx=panel.querySelector('.np-next'),like=panel.querySelector('[data-np="like"]');
  if(title.textContent!==track.title)title.textContent=track.title;
  const nt=next&&next.id!==track.id?`Next · ${next.title}`:'';if(nx.textContent!==nt)nx.textContent=nt;
  if(like.getAttribute('aria-pressed')!==String(liked)){like.setAttribute('aria-pressed',String(liked));like.textContent=liked?'Liked':'Like'}
}
// The panel's bars and the hero piece move with the beats.
function nowPanelBeat(k,s){
  if(!nowPanel||nowPanel.hidden)return;
  nowPanel.querySelectorAll('.np-bars i').forEach((bar,i)=>bar.animate?.([{transform:'scaleY(.35)'},{transform:`scaleY(${(.55+s*.45*(k==='drum'||k==='heartbeat'?1:.75)*(1-((i*37)%5)/9)).toFixed(2)})`,offset:.18},{transform:'scaleY(.35)'}],{duration:k==='chord'?900:360,delay:i*28,easing:'ease-out'}));
}
// The hero piece on the home screen (owner, 2026-10-13: "reacting to mouse movement, also reacting
// to the music, see if it's dancing to the music"): it turns a little towards the pointer and
// sways and lifts with each beat. Still with reduced motion or Motion at zero.
let heroKick=()=>{};
(function heroPiece(){
  let tx=0,ty=0,x=0,y=0,kick=0,sway=1,raf=0;
  const art=()=>document.querySelector('.hero-art img'),still=()=>prefersReducedMotion()||motionScale()<=0;
  const step=()=>{
    raf=0;const img=art();if(!img||img.offsetParent===null)return;
    x+=(tx-x)*.08;y+=(ty-y)*.08;kick*=.88;
    img.style.transform=`perspective(800px) rotateY(${(x*9).toFixed(2)}deg) rotateX(${(-y*6).toFixed(2)}deg) translate3d(${(x*7).toFixed(1)}px,${(y*4-kick*7).toFixed(1)}px,0) rotate(${(sway*kick*2.4).toFixed(2)}deg) scale(${(1+kick*.03).toFixed(3)})`;
    if(Math.abs(tx-x)>.002||Math.abs(ty-y)>.002||kick>.01)raf=requestAnimationFrame(step);
  };
  const go=()=>{if(!raf)raf=requestAnimationFrame(step)};
  addEventListener('pointermove',e=>{
    // A mouse only: a finger dragging a piece on a phone or tablet must not turn it (and measure
    // the page on every move of the finger).
    if(e.pointerType!=='mouse'||still())return;const img=art();if(!img||img.offsetParent===null)return;
    const r=img.getBoundingClientRect();tx=Math.max(-1,Math.min(1,(e.clientX-(r.left+r.width/2))/(innerWidth/2)));ty=Math.max(-1,Math.min(1,(e.clientY-(r.top+r.height/2))/(innerHeight/2)));go();
  },{passive:true});
  heroKick=s=>{if(still())return;const img=art();if(!img||img.offsetParent===null)return;sway=-sway;kick=Math.min(1,kick+.55*s);go()};
})();
// ---- The room follows the music (owner, 2026-10-13: "each wallpaper and everything is supposed
// to react to music") ----
// The player hears every beat of the music (src/music.js listen()); as it sounds the candles in
// the wallpaper leap, a glow breathes round the board, the running clock keeps the beat and the
// captured pieces nod with each new phrase. A win flares the room, a loss makes it gutter.
// Nothing moves with reduced motion or in a hidden tab, and only the candles while a piece
// travels (the board gets every frame).
let boardAura=null;
function musicPulse(ev){
  const ctx=vantaScore?.ctx;if(!ctx||prefersReducedMotion()||document.visibilityState!=='visible')return;
  const wait=(ev.at-ctx.currentTime+(ctx.outputLatency||ctx.baseLatency||0))*1000;
  if(wait<-150)return; // too late to be in time: let it go
  setTimeout(()=>roomPulse(ev),Math.max(0,wait));
}
function ensureBoardAura(){
  if(boardAura?.isConnected)return boardAura;
  const shell=document.querySelector('.board-shell');if(!shell)return null;
  boardAura=document.createElement('div');boardAura.className='board-aura';boardAura.setAttribute('aria-hidden','true');shell.prepend(boardAura);shell.classList.add('with-aura');
  return boardAura;
}
function roomPulse(ev){
  const k=ev.kind,s=Math.max(0,Math.min(1,Number(ev.strength??.6))),glow=wallLights.glow;
  if(k==='beat'||k==='drum'||k==='heartbeat'||k==='chord'){nowPanelBeat(k,s);if(k!=='chord')heroKick(s)}
  if(glow&&glow.running&&!glow.held){
    if(k==='chord')glow.pulse(.22+.2*s,1500);
    else if(k==='beat')glow.pulse(.1+.12*s,260,.3);
    else if(k==='drum')glow.pulse(.18+.24*s,380);
    else if(k==='heartbeat')glow.pulse(.28+.25*s,320);
    else if(k==='motif')glow.pulse(.25,1200,.6);
    else if(k==='sting')glow.pulse(['win','checkmate','rank-up','relic','realm','solved','brilliant'].includes(ev.result)?.7:['loss','rank-down','failed'].includes(ev.result)?-.45:.3,2400);
  }
  if(boardIsMoving())return;
  const aura=ensureBoardAura(),tone=k==='heartbeat'?'heartbeat':k==='sting'?String(ev.result||''):'';
  const frames=k==='chord'?[{opacity:0},{opacity:.3+.35*s,offset:.3},{opacity:0}]:k==='drum'||k==='heartbeat'?[{opacity:0},{opacity:.25+.4*s,offset:.12},{opacity:0}]:k==='sting'?[{opacity:0},{opacity:.9,offset:.2},{opacity:0}]:null;
  if(aura&&frames){if(aura.dataset.tone!==tone)aura.dataset.tone=tone;aura.getAnimations?.().forEach(a=>a.cancel());aura.animate?.(frames,{duration:k==='chord'?1800:k==='sting'?2600:420,easing:'ease-out'})}
  if(k==='beat'||k==='heartbeat'){
    const clock=document.querySelector('.player time.running:not(.low-time)');
    if(clock&&'pseudoElement' in (globalThis.KeyframeEffect?.prototype||{})){clock.dataset.pulse=k;clock.animate([{opacity:0},{opacity:.35+.5*s,offset:.15},{opacity:0}],{duration:k==='heartbeat'?380:300,easing:'ease-out',pseudoElement:'::after'})} // browsers that cannot animate a ::after would dim the whole clock
  }
  if(k==='chord')document.querySelectorAll('.captured-tray img:not(.arriving),.captured-tray .zh-piece').forEach((el,i)=>el.animate?.([{translate:'0 0'},{translate:'0 -3px',offset:.35},{translate:'0 0'}],{duration:520,delay:i*45,easing:'ease-out'}));
}
function syncMusicUi(){
  const p=musicPrefsGet(),t=$('#musicToggle'),s=$('#musicSetting');
  if(t){t.textContent=p.on?'Music: on':'Music: off';t.setAttribute('aria-pressed',String(p.on))}
  if(s)s.value=p.on?(STATIONS.some(x=>x.id===p.station)?p.station:'on'):'off';
  syncNowPlaying();
}
// Off, or on: following the game ('on') or playing one station (kept while the music is off).
function setMusicOn(on,station=musicPrefsGet().station){
  musicPrefs=saveMusic({...musicPrefsGet(),on,station:station==='off'?musicPrefsGet().station:station});syncMusicUi();
  // My music with no songs yet follows the game; the Music list is where songs are added.
  if(on&&station==='mine')void loadMySongs().then(songs=>{if(!songs.length)toast('Add your songs in the Music list',{duration:4200,onClick:()=>{menus.close('theme');setPrimaryScreen('game');renderMusicList();showSidePanel()}})});
  if(!on)vantaScore?.stop();else syncAtmosphere();
}

// The Vanta Campaign: five realms, each with its own board, weather and music.
function applyRealmTheme(realm){
  const relic=realm&&relicById(realm.relic);if(!relic)return;
  const root=document.documentElement.style;
  if(!realmThemeSaved)realmThemeSaved={vars:Object.fromEntries(Object.keys(relic.theme).map(k=>[k,root.getPropertyValue(k)])),wallpaper:document.body.dataset.wallpaper||''};
  for(const [k,v] of Object.entries(relic.theme))root.setProperty(k,v); // not saved: the realm's board is lent for the battle
  document.body.dataset.wallpaper=relic.wallpaper;document.body.dataset.realm=realm.id;
  atmosphereRealm=realm.atmosphere;musicKeyOverride=realm.music;queueAtmosphere();
}
function restoreRealmTheme(){
  if(!realmThemeSaved)return;
  const root=document.documentElement.style,saved=realmThemeSaved;realmThemeSaved=null;
  for(const [k,v] of Object.entries(saved.vars)){const value=savedTheme[k]||v;if(value)root.setProperty(k,value);else root.removeProperty(k)}
  const w=savedTheme.wallpaper||saved.wallpaper;if(w)document.body.dataset.wallpaper=w;else delete document.body.dataset.wallpaper;
  delete document.body.dataset.realm;atmosphereRealm=null;musicKeyOverride=null;queueAtmosphere();
}
const campaignStars=n=>`<span class="camp-stars" role="img" aria-label="${n} of 3 stars">${[0,1,2].map(i=>`<i class="${i<n?'on':''}"></i>`).join('')}</span>`;
function renderCampaign(){setDynamicView('campaign','The Vanta Campaign','');drawCampaign()}
function drawCampaign(){
  const target=$('#dynamicView .view-content');if(!target||currentRightView!=='campaign')return;
  const st=loadCampaign();
  target.innerHTML=`<article class="campaign"><p class="trainer-intro">Five realms, each with its own board, weather and music. Win two battles to reach the realm's boss, whose battle bends the rules. Beat the boss to free the realm, earn its relic and open the next. Each battle has three stars: the win, a win in 40 moves or fewer, and a kept oath.</p>
    <div class="gauntlet-head"><div><small>STARS</small><b>${totalStars(st)} / ${MAX_STARS}</b></div><div><small>REALMS FREED</small><b>${realmsFreed(st)} / ${REALMS.length}</b></div></div>
    <ol class="camp-map">${REALMS.map((r,ri)=>{const open=realmOpen(st,ri),freed=realmFreed(st,r.id),relic=relicById(r.relic),t=relic.theme;
      return `<li class="camp-realm${open?'':' locked'}${freed?' freed':''}" data-realm="${r.id}" style="--realm-light:${t['--light']};--realm-dark:${t['--dark']};--realm-accent:${t['--mint']}">
        <header><span class="camp-sigil" aria-hidden="true"></span><div><h4>${escapeHtml(r.name)}</h4><small>${freed?'Freed':open?'Unlocked':'Locked'} · Relic: ${escapeHtml(relic.name)}</small></div></header>
        <p>${escapeHtml(r.story)}</p>
        <ol class="camp-battles">${r.battles.map((b,i)=>{const won=st.won[battleKey(r.id,i)],can=battleOpen(st,ri,i);
          return `<li class="${b.boss?'boss ':''}${won?'won':can?'next':'locked'}"><span><b>${escapeHtml(b.name)}</b><small>${b.rules==='shadow'?'Your strength':`${b.elo} Elo`} · ${b.side==='w'?'you play White':'you play Black'}</small>${b.twist?`<em>${escapeHtml(b.twist)}</em>`:''}</span>${campaignStars(won?.stars||0)}${can?`<button type="button" class="${won?'':'gold '}camp-fight" data-realm-index="${ri}" data-battle="${i}">${won?'Replay':'Fight'}</button>`:''}</li>`}).join('')}</ol></li>`}).join('')}</ol></article>`;
  target.querySelectorAll('.camp-fight').forEach(b=>b.onclick=()=>void startCampaignBattle(Number(b.dataset.realmIndex),Number(b.dataset.battle)));
}
async function startCampaignBattle(ri,i){
  const realm=REALMS[ri],b=realm?.battles[i],st=loadCampaign();if(!b||!battleOpen(st,ri,i))return;
  if(liveGameOn())return toast('Finish your game first');
  let elo=b.elo,shadowTree=null;
  if(b.rules==='shadow'){
    let server=[];if(signedIn())try{server=(await api.archive(100)).games||[]}catch{}
    elo=shadowElo(ratingFor('rapid'));shadowTree=shadowBook(shadowLines(server,currentProfile?.id||currentPlayerId,loadLocalArchive()),b.side==='w'?'b':'w');
  }
  saveCampaign({...st,pending:{realm:realm.id,i}});
  const variant={blackout:'blackout',dark:'dark',freestyle:'freestyle'}[b.rules]||'standard';
  await playComputer({bot:{slug:`campaign-${realm.id}-${i}`,display_name:b.name,elo,portrait:b.boss?'bk':i?'br':'bn',campaign:{realm:realm.id,i},engine:b.engine||'stockfish19',...(shadowTree?{shadowTree}:{})},side:b.side,variant});
  if(currentBot?.campaign?.realm===realm.id&&currentBot.campaign.i===i)toast(b.twist?`${b.name} · ${b.twist}`:`${realm.name} · ${b.name}`,{duration:2600});
}
function campaignGameOver(info,score,oath){
  const c=currentBot?.campaign;if(!c||info.online||mode!=='computer')return;
  const st=loadCampaign();if(score===null){saveCampaign({...st,pending:null});return}
  const out=recordBattle(st,c.realm,c.i,{score,plies:game.history().length,oath});saveCampaign(out.state);
  if(out.stars)queueToast(`Victory · ${out.stars} of 3 stars`,{delay:600});else queueToast('Defeat · try the battle again',{delay:600});
  if(out.freed){queueToast(`${out.freed.name} is free`,{sound:'win',sting:'realm'});earnRelicQueued(out.freed.relic)}
  if(currentRightView==='campaign')drawCampaign();
}

// A game ended: with the music on, its sting plays over it (a checkmate you gave has its own),
// the music steps back for it, then turns to the win or loss music while you stay at the board.
// Returns whether a sting played (the interface's own end sound plays otherwise).
function roundTwelveGameOver(info){
  const score=scoreOf(info.result,info.myColor),result=score===1?'win':score===0?'loss':'draw';
  atmoEnd={at:Date.now(),won:score===1?true:score===0?false:null};
  musicResult=score===null?null:{at:Date.now(),result};queueAtmosphere();
  const stung=!!vantaScore?.playing&&score!==null&&vantaScore.sting(result==='win'&&/checkmate/.test(String(info.reason||''))?'checkmate':result);
  const oath=settleOath(info,score);
  campaignGameOver(info,score,oath);
  void twinGameOver(info);
  setTimeout(()=>void refreshVeterans(true),info.online?2500:400);
  return stung;
}
function initRoundTwelve(){
  const prefs=r12Prefs(),vs=$('#veteranSetting'),as=$('#atmosphereSetting'),ms=$('#musicSetting'),mv=$('#musicVolume');
  if(vs){vs.value=prefs.veterans;vs.onchange=e=>{setR12Pref('veterans',e.target.value);hideVeteranCard();render()}}
  if(as){as.value=prefs.atmosphere;as.onchange=e=>{setR12Pref('atmosphere',e.target.value);syncAtmosphere()}}
  if(ms)ms.onchange=e=>setMusicOn(e.target.value!=='off',e.target.value);
  if(mv){mv.value=String(Math.round(musicPrefsGet().volume*100));mv.oninput=e=>{musicPrefs=saveMusic({...musicPrefsGet(),volume:Number(e.target.value)/100});vantaScore?.setVolume(musicPrefs.volume)}}
  $('#musicToggle')?.addEventListener('click',()=>setMusicOn(!musicPrefsGet().on));
  syncMusicUi();
  $('#oathPick')?.addEventListener('change',e=>{
    try{localStorage.setItem('vch.oathPick',JSON.stringify({day:todayKey(),id:e.target.value}))}catch{}
    syncOathPicker();
    // Still before your first move: the new choice counts for this game.
    const color=premovePlayerColor(),n=currentHistory().length,myMoves=color==='w'?Math.ceil(n/2):Math.floor(n/2);
    if(liveGameOn()&&color&&myMoves===0){
      const key=serverGameId?`online:${serverGameId}`:currentOath?.key||`computer:${Date.now()}`;writeSessionOath(null);
      swearOath(key,serverGameId?{startFen:serverGame?.start_fen||null,ok:(serverGame?.variant||'standard')==='standard'&&!serverGame?.start_fen}:{startFen:game.getHeaders?.().FEN||null});
    }
  });
  syncOathPicker();
  $('.computer-campaign')?.addEventListener('click',()=>{renderCampaign();showSidePanel()});
  ensureAtmosphere();setInterval(syncAtmosphere,1000);
  document.addEventListener('visibilitychange',syncAtmosphere);
  document.addEventListener('pointerdown',e=>{if(vantaScore?.ctx?.state==='suspended')vantaScore.ctx.resume?.();if(musicPrefsGet().on&&!vantaScore?.playing)queueAtmosphere();if(!e.target.closest?.('#veteranCard'))hideVeteranCard()},{capture:true,passive:true});
  // iPhone and iPad (owner, 2026-10-17: "the music do not play"): sound may start only inside a
  // tap (a touch's end, a click or a key; a touch's start is too early), and an audio element plays
  // on its own later only once a tap has readied it. So each tap readies the music, and starts a
  // track Safari refused to start (src/music.js unlock).
  const unlockMusic=()=>{if(!musicPrefsGet().on||$('#sound')?.dataset.off)return;ensureScore();if(!vantaScore?.unlock())return;if(!vantaScore.playing)queueAtmosphere()};
  for(const type of ['touchend','pointerup','click','keydown'])document.addEventListener(type,unlockMusic,{capture:true,passive:true});
  // The tap that turns the music on (Music on, a station, a World) readies it in that same tap:
  // these run after the control's own handler, when the music is already on (the listeners above
  // run before it and still find it off, so the first track waited for another tap).
  for(const type of ['click','change'])document.addEventListener(type,unlockMusic,{passive:true});
  document.addEventListener('pointerover',e=>{
    if(e.pointerType!=='mouse')return;const el=e.target.closest?.('.board-piece[data-veteran]');if(!el)return;
    clearTimeout(vetHoverTimer);vetHoverTimer=setTimeout(()=>showVeteranCard(el),420);
  });
  document.addEventListener('pointerout',e=>{const el=e.target.closest?.('.board-piece[data-veteran]');if(el&&!el.contains(e.relatedTarget))hideVeteranCard()});
  const later=window.requestIdleCallback||(fn=>setTimeout(fn,1500));setTimeout(()=>later(()=>void refreshVeterans()),4000);
}
// ---- Round 12: Vanta Bughouse (src/bughouse.js): two against two on two boards ----
// Your own board is an ordinary online game (Crazyhouse drops, server pockets). The table view
// shows the four seats; the partner strip under your board shows your partner's game live.
const BH_SEAT_NAMES={aw:'Board A · White',ab:'Board A · Black',bw:'Board B · White',bb:'Board B · Black'};
const BH_CALLS=[['n','Need a knight'],['b','Need a bishop'],['r','Need a rook'],['q','Need a queen'],['p','Need a pawn'],['sit','Sit: wait for pieces'],['go','Go: play fast'],['trade','Trade pieces'],['hold',"Don't trade"]];
const BH_PUBLIC=['id','invite_code','fen','version','status','result','end_reason','white_name','black_name','white_time_ms','black_time_ms','last_move_at','zh_pockets','move_count'];
function bhPartnerGame(){const d=bhSession?.data,seat=d?.seat;return seat?d.games?.[otherBoard(seat[0])]||null:null}
async function createBughouse(){
  const tc=timeChoice($('#time').value);if(tc.dailyDays)return toast('Bughouse is played live, not as a daily game');
  try{openBughouseView(await api.bughouseCreate({seconds:Math.min(900,tc.seconds),increment:tc.increment||0,name:currentProfile?.username||guestName}))}catch(error){toast(error.message)}
}
async function openBughouse(code,{quiet=false}={}){
  try{openBughouseView(await api.bughouseState(code));return true}catch(error){if(!quiet)toast(error.message);return false}
}
function openBughouseView(out,{keepUrl=false,show=true}={}){
  if(!out?.bughouse)return;
  if(bhSession&&bhSession.id!==out.bughouse.id)stopBughouse();
  if(!bhSession)bhSession={id:out.bughouse.id,code:out.bughouse.code,data:null,timer:null,clock:null,channel:null,partnerChannel:null,partnerId:null,teamChannel:null,entered:serverGameId,call:null,stripKey:''};
  applyBughouse(out);
  if(!bhSession.timer&&!['finished','aborted'].includes(out.bughouse.status))bhSession.timer=setInterval(()=>{if(!document.hidden)void refreshBughouse()},5000);
  if(!bhSession.clock)bhSession.clock=setInterval(tickPartnerClocks,1000);
  if(!bhSession.channel)bhSession.channel=realtimeClient.channel(`bughouse:${bhSession.id}`).on('broadcast',{event:'bughouse'},()=>void refreshBughouse()).subscribe();
  if(!keepUrl)history.replaceState(null,'',`?bughouse=${encodeURIComponent(bhSession.code)}`);
  if(show){setPrimaryScreen('game');showBughouseTable()}
}
function showBughouseTable(){setDynamicView('bughouse','Vanta Bughouse','');drawBughouse();showSidePanel()}
function stopBughouse(){
  if(!bhSession)return;
  clearInterval(bhSession.timer);clearInterval(bhSession.clock);
  for(const ch of [bhSession.channel,bhSession.partnerChannel,bhSession.teamChannel])if(ch)realtimeClient.removeChannel(ch).catch(()=>{});
  bhSession=null;drawPartnerStrip();
}
async function refreshBughouse(){if(!bhSession)return;try{applyBughouse(await api.bughouseState(bhSession.code))}catch{}}
async function resumeBughouse(gameId){try{openBughouseView(await api.bughouseForGame(gameId),{keepUrl:true,show:false})}catch{}}
function applyBughouse(out){
  if(!bhSession||out?.bughouse?.id!==bhSession.id)return;
  const prev=bhSession.data,b=out.bughouse,seat=out.seat;bhSession.data=out;bhSession.code=b.code;
  const partner=bhPartnerGame();
  if(partner?.id&&bhSession.partnerId!==partner.id){
    if(bhSession.partnerChannel)realtimeClient.removeChannel(bhSession.partnerChannel).catch(()=>{});
    const id=partner.id;bhSession.partnerId=id;
    bhSession.partnerChannel=realtimeClient.channel(`watch:${id}`).on('broadcast',{event:'state'},message=>{
      const g=message?.payload?.game,d=bhSession?.data;if(!d?.seat||g?.id!==id)return;
      const key=otherBoard(d.seat[0]),cur=d.games[key];if(cur&&Number(g.version)<Number(cur.version))return;
      d.games[key]={...cur,...Object.fromEntries(BH_PUBLIC.map(k=>[k,g[k]??null]))};drawPartnerStrip();if(currentRightView==='bughouse')drawBughouse();
    }).subscribe();
  }
  // Team calls: the channel's name comes from the server, only to that team's two players.
  if(seat&&b.status==='active'&&out.team_key&&!bhSession.teamChannel)
    bhSession.teamChannel=realtimeClient.channel(`bughouse-team:${out.team_key}`,{config:{broadcast:{self:false}}}).on('broadcast',{event:'call'},message=>receiveCall(message?.payload)).subscribe();
  if(seat&&b.status==='active'){
    const mine=out.games?.[seat[0]];
    if(mine?.invite_code&&serverGameId!==mine.id&&bhSession.entered!==mine.id){bhSession.entered=mine.id;toast('The match starts · your board is ready');void enterBughouseBoard(mine.invite_code)}
  }
  if(prev&&prev.bughouse.status!==b.status&&['finished','aborted'].includes(b.status))bughouseEnded(b,seat);
  if(['finished','aborted'].includes(b.status)&&bhSession.timer){clearInterval(bhSession.timer);bhSession.timer=null}
  drawPartnerStrip();if(currentRightView==='bughouse')drawBughouse();
}
async function enterBughouseBoard(code){await openGameByCode(code);if(bhSession)showBughouseTable()}
function bughouseEnded(b,seat){
  if(b.status==='aborted')return queueToast('The Bughouse match was aborted',{delay:300});
  if(b.winner==='draw')return queueToast('The Bughouse match is drawn',{delay:300});
  if(!seat)return queueToast(`Team ${b.winner==='team1'?1:2} won the match`,{delay:300});
  const won=b.winner===(teamOfSeat(seat)===1?'team1':'team2');queueToast(won?'Your team won the match':'Your team lost the match',{delay:300,sound:won?'win':null});
}
function sendCall(call){
  const ch=bhSession?.teamChannel;if(!ch)return;
  ch.send({type:'broadcast',event:'call',payload:{from:realtimeClientId,call}}).catch(()=>{});
  const label=BH_CALLS.find(c=>c[0]===call)?.[1];if(label)toast(`Sent · ${label}`,{duration:1200});
}
function receiveCall(payload){
  const label=BH_CALLS.find(c=>c[0]===payload?.call)?.[1];if(!label||payload.from===realtimeClientId||!bhSession)return;
  bhSession.call={label,at:Date.now()};toast(`Partner · ${label}`,{duration:2200});playUiSound('warning');drawPartnerStrip();
  setTimeout(()=>{if(bhSession?.call&&Date.now()-bhSession.call.at>=6000){bhSession.call=null;drawPartnerStrip()}},6100);
}
function bhPocketHtml(pocket,color,style){return ZH_PIECES.filter(t=>pocket?.[t]>0).map(t=>`<span class="zh-piece"><img src="${pieceAssetFor(style,color+t)}" alt=""><b>${pocket[t]}</b></span>`).join('')||'<em>empty</em>'}
function bhBoardHtml(fen,flip){
  let rows;try{rows=new Chess(fen).board()}catch{return ''}
  const cells=rows.flat().map((p,i)=>({p,i}));if(flip)cells.reverse();
  return `<div class="study-board bh-board">${cells.map(({p,i})=>{const r=Math.floor(i/8),f=i%8;return `<div class="study-square ${(r+f)%2?'dark':'light'}">${p?`<span class="piece ${p.color} piece-${p.type}" aria-hidden="true"></span>`:''}</div>`}).join('')}</div>`;
}
function bhClockMs(g,color){
  let t=Number(g?.[color==='w'?'white_time_ms':'black_time_ms']||0);
  if(g?.status==='active'&&g.last_move_at&&String(g.fen||'').split(' ')[1]===color)t-=Date.now()-Date.parse(g.last_move_at);
  return Math.max(0,t);
}
function drawPartnerStrip(){
  const el=$('#bhPartner');if(!el)return;
  const d=bhSession?.data,seat=d?.seat,g=bhPartnerGame();
  const show=!!(g&&seat&&d.bughouse.status!=='waiting'&&serverGame?.variant==='bughouse'&&serverGame?.bughouse_id===d.bughouse.id);
  el.classList.toggle('hidden',!show);if(!show){if(el.innerHTML)el.innerHTML='';if(bhSession)bhSession.stripKey='';return}
  const pc=partnerSeat(seat)[1],oc=other(pc),style=normalizePieceStyle(document.documentElement.dataset.pieceStyle);
  const key=JSON.stringify([g.fen,g.zh_pockets,g.status,g.result,bhSession.call?.label,style,d.bughouse.status]);if(key===bhSession.stripKey)return tickPartnerClocks();bhSession.stripKey=key;
  const name=c=>escapeHtml((c==='w'?g.white_name:g.black_name)||(c==='w'?'White':'Black'));
  el.innerHTML=`<div class="bh-mini" aria-hidden="true">${bhBoardHtml(g.fen,pc==='b')}</div>
    <div class="bh-info"><small>PARTNER BOARD</small>
      <div class="bh-row mine"><b>${name(pc)}</b><time data-bh-clock="${pc}"></time><span class="bh-pocket" aria-label="Partner pocket">${bhPocketHtml(g.zh_pockets?.[pc],pc,style)}</span></div>
      <div class="bh-row"><b>${name(oc)}</b><time data-bh-clock="${oc}"></time><span class="bh-pocket">${bhPocketHtml(g.zh_pockets?.[oc],oc,style)}</span></div>
      ${bhSession.call?`<em class="bh-call">Partner · ${escapeHtml(bhSession.call.label)}</em>`:''}
      ${d.bughouse.status==='active'&&bhSession.teamChannel?`<div class="bh-calls" aria-label="Call to your partner">${BH_CALLS.map(([k,l])=>`<button type="button" data-bh-call="${k}" title="${escapeHtml(l)}" aria-label="${escapeHtml(l)}">${'nbrqp'.includes(k)?`<img src="${pieceAssetFor(style,pc+k)}" alt="">`:escapeHtml({sit:'Wait',go:'Fast',trade:'Trade',hold:'Hold'}[k])}</button>`).join('')}<button type="button" class="bh-table">Table</button></div>`:'<div class="bh-calls"><button type="button" class="bh-table">Table</button></div>'}
    </div>`;
  el.querySelectorAll('[data-bh-call]').forEach(b=>b.onclick=()=>sendCall(b.dataset.bhCall));
  el.querySelector('.bh-table')?.addEventListener('click',showBughouseTable);
  tickPartnerClocks();
}
function tickPartnerClocks(){const g=bhPartnerGame();for(const t of document.querySelectorAll('#bhPartner [data-bh-clock]'))t.textContent=clockLabel(bhClockMs(g,t.dataset.bhClock)/1000)}
function drawBughouse(){
  const target=$('#dynamicView .view-content');if(!target||currentRightView!=='bughouse'||!bhSession?.data)return;
  const {bughouse:b,seat}=bhSession.data,waiting=b.status==='waiting',count=BUGHOUSE_SEATS.filter(s=>b.seats?.[s]).length,link=`${location.origin}/?bughouse=${encodeURIComponent(b.code)}`;
  const status=waiting?`${count} / 4 seated`:b.status==='active'?'Playing':b.status==='aborted'?'Aborted':b.winner==='draw'?'Draw':`Team ${b.winner==='team1'?1:2} won`;
  const seatHtml=s=>{const x=b.seats?.[s];return `<div class="bh-seat${x?.me?' me':''}"><small>${BH_SEAT_NAMES[s]}</small>${x?`<b>${escapeHtml(x.name)}</b>${x.me?'<em>You</em>':''}`:waiting?`<button type="button" data-bh-seat="${s}">Sit here</button>`:'<em>Empty</em>'}</div>`};
  target.innerHTML=`<article class="bughouse"><p class="trainer-intro">Two against two on two boards. Your partner plays the other colour on the other board: every piece you capture goes to them, ready to drop, and theirs come to you. A check that a dropped piece could block is not mate. The first board to finish decides the match.</p>
    <div class="gauntlet-head"><div><small>TABLE</small><b>${escapeHtml(b.code)}</b></div><div><small>CLOCK</small><b>${formatTimeControl(b.time_control_seconds,b.increment_seconds)}</b></div><div><small>STATUS</small><b>${status}</b></div></div>
    <div class="bh-teams"><section class="bh-team team1"><h4>Team 1</h4>${seatHtml('aw')}${seatHtml('bb')}</section><section class="bh-team team2"><h4>Team 2</h4>${seatHtml('ab')}${seatHtml('bw')}</section></div>
    ${waiting?`<div class="bh-share"><input readonly value="${escapeHtml(link)}" aria-label="Table link"><button type="button" class="bh-copy">Copy link</button></div><p class="computer-note">The match starts the moment the fourth seat is taken. Casual: Bughouse has no rating.</p>`:''}
    ${b.status==='active'&&seat&&bhSession.teamChannel?`<h4>Calls to your partner</h4><div class="bh-calls wide">${BH_CALLS.map(([k,l])=>`<button type="button" data-bh-call="${k}">${l}</button>`).join('')}</div>`:''}
    <div class="streak-actions">${waiting&&seat?'<button type="button" class="bh-leave">Leave table</button>':''}${!waiting&&seat&&serverGame?.bughouse_id!==b.id&&b.status==='active'?'<button type="button" class="gold bh-board-go">Go to your board</button>':''}${['finished','aborted'].includes(b.status)?'<button type="button" class="gold bh-new">New table</button>':''}</div></article>`;
  target.querySelectorAll('[data-bh-seat]').forEach(btn=>btn.onclick=async()=>{try{applyBughouse(await api.bughouseJoin(b.code,btn.dataset.bhSeat,currentProfile?.username||guestName))}catch(error){toast(error.message)}});
  target.querySelector('.bh-copy')?.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(link);toast('Table link copied')}catch{toast(link)}});
  target.querySelector('.bh-leave')?.addEventListener('click',async()=>{try{await api.bughouseLeave(b.code);stopBughouse();history.replaceState(null,'',location.pathname);showMovesView();toast('You left the table')}catch(error){toast(error.message)}});
  target.querySelector('.bh-board-go')?.addEventListener('click',()=>{const g=bhSession?.data?.games?.[seat[0]];if(g?.invite_code)void enterBughouseBoard(g.invite_code)});
  target.querySelector('.bh-new')?.addEventListener('click',()=>{stopBughouse();void createBughouse()});
  target.querySelectorAll('[data-bh-call]').forEach(btn=>btn.onclick=()=>sendCall(btn.dataset.bhCall));
}
// Pockets on your board change when your partner captures: the server sends your game again
// with the same version, so only the pockets are taken from it.
function mergeBughousePockets(message){
  const st=message?.payload?.game;
  if(serverGame?.variant!=='bughouse'||st?.id!==serverGameId||Number(st.version)!==Number(serverVersion)||!st.zh_pockets)return;
  if(JSON.stringify(st.zh_pockets)===JSON.stringify(serverGame.zh_pockets))return;
  serverGame={...serverGame,zh_pockets:st.zh_pockets};syncCapturedTrays.key='';render();
}

// ---- Round 12: Twin Fates (src/twin-fates.js): one famous position, played twice ----
function renderFates(){
  setPrimaryScreen('game');setDynamicView('twin','Twin Fates','');showSidePanel();
  const target=$('#dynamicView .view-content');if(!target)return;
  target.innerHTML=`<article class="fates"><p class="trainer-intro">One famous position, played twice: once from each side. Send the link to your opponent; when the first game ends, the second starts at once with the colours swapped. The match is the total of both games. Casual.</p>
    <button type="button" class="gold fate-random">Surprise me</button>
    <div class="fate-grid">${FATES.map(f=>`<article class="fate">${studyBoardHtml(f.fen)}<div><b>${escapeHtml(f.title)}</b><small>${escapeHtml(f.note)}</small><button type="button" class="gold" data-fate="${f.id}">Play this fate</button></div></article>`).join('')}</div></article>`;
  target.querySelectorAll('[data-fate]').forEach(b=>b.onclick=()=>void createTwin(b.dataset.fate));
  target.querySelector('.fate-random').onclick=()=>void createTwin('');
}
async function createTwin(fate){
  const tc=timeChoice($('#time').value);if(tc.dailyDays)return toast('Twin Fates is played live, not as a daily game');
  try{
    const out=await api.twinCreate({fate,seconds:tc.seconds,increment:tc.increment||0,name:currentProfile?.username||guestName});
    applyServerState(out);room=(out.game||out).invite_code;roomCreated=true;history.replaceState(null,'',`?game=${encodeURIComponent(room)}`);syncRoomUi();await loadChat();
    if(out.twin)setTwin(out.twin);toast('Twin Fates room is ready · share the link');
    setDynamicView('twin','Twin Fates','');drawTwin();
  }catch(error){toast(error.message)}
}
function setTwin(info){if(!info?.id)return;twinSession={id:info.id,info};drawTwinLine();if(currentRightView==='twin')drawTwin()}
async function loadTwin(id){try{const out=await api.twinState(id);setTwin(out.twin)}catch{}}
function syncTwinFromState(payload,state){
  if(payload?.twin)return setTwin(payload.twin);
  if(state?.twin_id){if(twinSession?.id!==state.twin_id)void loadTwin(state.twin_id);else drawTwinLine();return}
  if(twinSession&&state?.id){twinSession=null;drawTwinLine()}
}
function twinScoreText(info){const s=info?.score;return s?`${s.first.name} ${twinPoints(s.first.points)} – ${twinPoints(s.second.points)} ${s.second.name}`:''}
function drawTwinLine(){
  const el=$('#twinLine');if(!el)return;
  const info=twinSession?.info,on=!!(info&&serverGame?.twin_id===info.id);
  el.classList.toggle('hidden',!on);if(!on){if(el.textContent)el.textContent='';el.dataset.key='';return}
  const key=JSON.stringify([info,serverGame?.twin_leg]);if(el.dataset.key===key)return;el.dataset.key=key;
  el.innerHTML=`<b>Twin Fates</b><span>${escapeHtml(info.title)}</span><em>${Number(serverGame?.twin_leg)===2?'Game 2 of 2':'Game 1 of 2'}</em>${info.score?`<strong>${escapeHtml(twinScoreText(info))}</strong>`:''}`;
}
function drawTwin(){
  const target=$('#dynamicView .view-content');if(!target||currentRightView!=='twin')return;
  const info=twinSession?.info;if(!info){renderFates();return}
  const fate=FATES.find(f=>f.id===info.fate);
  target.innerHTML=`<article class="fates twin">${fate?studyBoardHtml(fate.fen):''}<div><h4>${escapeHtml(info.title)}</h4><p class="trainer-intro">${escapeHtml(info.note)}</p>
    <ol class="gauntlet-stages">${[1,2].map(n=>{const leg=info.legs.find(l=>l.leg===n);return `<li class="${leg&&leg.result!=='*'?'done':leg?'current':'locked'}"><span><b>${n===1?'Game 1':'Game 2'}</b><small>${leg?`${escapeHtml(leg.white||'White')} vs ${escapeHtml(leg.black||'Black')}`:'Colours swapped'}</small></span><em>${leg?leg.result!=='*'?leg.result:'Playing':'Next'}</em></li>`}).join('')}</ol>
    ${info.score?`<div class="gauntlet-head twin-score"><div><small>${escapeHtml(info.score.first.name)}</small><b>${twinPoints(info.score.first.points)}</b></div><div><small>${escapeHtml(info.score.second.name)}</small><b>${twinPoints(info.score.second.points)}</b></div></div>`:''}
    <button type="button" class="fate-more">Other fates</button></div></article>`;
  target.querySelector('.fate-more').onclick=renderFates;
}
async function twinGameOver(info){
  if(!info.online||!serverGame?.twin_id)return;
  const twinId=serverGame.twin_id,leg=Number(serverGame.twin_leg),gameId=serverGame.id;
  if(scoreOf(info.result,info.myColor)===null)return;
  if(leg===2){await loadTwin(twinId);if(twinSession?.info?.score)queueToast(`Twin Fates · ${twinScoreText(twinSession.info)}`,{delay:900});return}
  let code=serverGame.twin_next?.code||null;
  for(let i=0;i<10&&!code;i++){await new Promise(r=>setTimeout(r,1500));try{const out=await api.twinState(twinId);setTwin(out.twin);code=out.twin.legs.find(l=>l.leg===2)?.code||null}catch{}}
  if(!code)return toast('The second game could not start');
  queueToast('Game 2 · the same position, colours swapped',{delay:600});
  setTimeout(()=>{if(serverGameId!==gameId)return;document.querySelector('.vch-dialog-layer .vch-dialog-close')?.click();void openGameByCode(code)},3600);
}

// ---- Round 12: Orders and heraldry (src/heraldry.js) and the Hall of Relics ----
function setCrest(el,club){
  if(!el)return;const key=club?.crest?JSON.stringify([club.slug,club.crest]):'';if(el.dataset.key===key)return;el.dataset.key=key;
  el.classList.toggle('hidden',!key);el.innerHTML=key?crestSvg(club.crest,{size:14,label:`${club.name} crest`}):'';el.title=key?club.name:'';
}
async function editCrest(club){
  let crest={...(cleanCrest(club.crest)||DEFAULT_CREST)};
  const body=document.createElement('div');body.className='crest-builder';
  const opts=(list,names,value)=>list.map(k=>`<option value="${k}"${k===value?' selected':''}>${names[k]}</option>`).join('');
  const field=(key,label,list,names)=>`<label><span>${label}</span><select data-crest="${key}">${opts(list,names,crest[key])}</select></label>`;
  body.innerHTML=`<div class="crest-preview"></div><div class="crest-fields">${field('shield','Shield',CREST_SHIELDS,SHIELD_NAMES)}${field('division','Division',CREST_DIVISIONS,DIVISION_NAMES)}${field('field','Field',CREST_TINCTURES,TINCTURE_NAMES)}${field('field2','Second colour',CREST_TINCTURES,TINCTURE_NAMES)}${field('charge','Charge',CREST_CHARGES,CHARGE_NAMES)}${field('ink','Charge colour',CREST_TINCTURES,TINCTURE_NAMES)}</div>`;
  const preview=()=>{body.querySelector('.crest-preview').innerHTML=crestSvg(crest,{size:110,label:crestText(crest)})};preview();
  body.querySelectorAll('[data-crest]').forEach(s=>s.onchange=()=>{crest={...crest,[s.dataset.crest]:s.value};preview()});
  const action=await vchDialog({title:'Club crest',body,actions:[...(club.crest?[{label:'Remove crest',value:'remove'}]:[]),{label:'Cancel',value:false},{label:'Save crest',value:'save',primary:true}]});
  if(!action)return;
  try{await api.clubCrest(club.slug,action==='remove'?null:crest);toast(action==='remove'?'Crest removed':'Crest saved');void openClub(club.slug)}catch(error){toast(error.message)}
}
// The profile's showroom: what the server knows (Moments of the Week won, the club's crest) for
// everyone, and on your own profile what this device keeps (relics, campaign, oaths, veterans).
function hallOfRelicsHtml(d){
  const parts=[],moments=Array.isArray(d.moments)?d.moments:[];
  if(d.club?.crest)parts.push(`<div class="hall-crest">${crestSvg(d.club.crest,{size:54,label:`${d.club.name} crest`})}<span><b>${escapeHtml(d.club.name)}</b><small>${escapeHtml(crestText(d.club.crest))}</small></span></div>`);
  if(moments.length)parts.push(`<div class="hall-moments">${moments.map(m=>`<figure class="hall-moment">${studyBoardHtml(m.fen)}<figcaption><b>Moment of the Week</b><small>${escapeHtml(m.week)} · vs ${escapeHtml(m.opponent||'Player')}</small>${m.caption?`<em>${escapeHtml(m.caption)}</em>`:''}</figcaption></figure>`).join('')}</div>`);
  if(d.self){
    const relics=loadRelics(),earned=RELICS.filter(r=>relics.unlocked[r.id]),camp=loadCampaign(),oaths=loadOaths(),vets=armyList(totalsMap(veteranTotals())).filter(x=>x.rank).slice(0,3),style=normalizePieceStyle(document.documentElement.dataset.pieceStyle);
    parts.push(`<div class="hall-stats"><div><small>RELICS</small><b>${earned.length} / ${RELICS.length}</b></div><div><small>CAMPAIGN STARS</small><b>${totalStars(camp)} / ${MAX_STARS}</b></div><div><small>HONOR</small><b>${oaths.honor}</b></div><div><small>OATHS KEPT</small><b>${oaths.kept} / ${oaths.sworn}</b></div></div>`);
    if(earned.length)parts.push(`<div class="hall-relics">${earned.map(r=>`<span class="hall-relic" title="${escapeHtml(r.how)}"><span class="relic-swatch" aria-hidden="true">${RELIC_VARS.map(k=>`<i style="background:${r.theme[k]}"></i>`).join('')}</span><b>${escapeHtml(r.name)}</b></span>`).join('')}</div>`);
    if(realmsFreed(camp))parts.push(`<div class="hall-realms">${REALMS.filter(r=>realmFreed(camp,r.id)).map(r=>`<span><i class="camp-sigil" style="--realm-accent:${relicById(r.relic).theme['--mint']};--realm-dark:${relicById(r.relic).theme['--dark']}"></i>${escapeHtml(r.name)}</span>`).join('')}</div>`);
    if(vets.length)parts.push(`<div class="hall-veterans">${vets.map(x=>`<article class="army-piece rank-${x.rank}"><img src="${pieceAssetFor(style,x.color+x.type)}" alt=""><div>${veteranCardHtml(x)}</div><i class="vet-mark" data-rank="${x.rank}" aria-hidden="true"><b></b><b></b><b></b></i></article>`).join('')}</div>`);
    parts.push('<p class="computer-note">Relics, the campaign, oaths and veterans are kept on this device.</p>');
  }
  if(!parts.length)return '';
  return `<section class="hall"><h4>Hall of Relics</h4>${parts.join('')}</section>`;
}
// ---- Round 11: Rivals (src/rivals.js) — from your own game history ----
let rivalsCache=null;
async function loadRivals(force=false){
  if(!signedIn())return [];
  if(!force&&rivalsCache&&Date.now()-rivalsCache.at<300000)return rivalsCache.list;
  const out=await api.archive(100),botNames=new Set([...DEFAULT_COMPUTER_BOTS.map(b=>String(b.display_name).toLowerCase()),...OLD_BOT_NAMES,...OLD_BOT_NAMES.map(n=>`vanta_${n}`)]);
  const me=currentProfile?.id||currentPlayerId;
  // Games against the computer are not rivalries (older rows lack bot_player_id: their names tell).
  const games=(out.games||[]).filter(g=>!g.bot_player_id&&!botNames.has(String((g.white_player_id===me?g.black_name:g.white_name)||'').toLowerCase()));
  const list=rivalsFrom(games,me);rivalsCache={at:Date.now(),list};return list;
}
async function renderRivals(){
  if(watchSession)stopWatching();closeClubChannel();
  if(!signedIn()){setDynamicView('friends','Community',communityTabs('rivals')+`<article class="friends-signin"><h4>Find your rivals</h4><p>Sign in and play rated or casual games: the players you keep meeting with close results show up here.</p><button class="primary-action friends-signin-btn">Sign in</button></article>`);$('#dynamicView .friends-signin-btn').onclick=()=>openAccount();wireCommunityTabs();return}
  setDynamicView('friends','Community',communityTabs('rivals')+brandLoading('Looking through your games…'));wireCommunityTabs();
  let list=[];try{list=await loadRivals(true)}catch(error){toast(error.message)}
  const target=$('#dynamicView .view-content');if(!target||currentRightView!=='friends'||!target.querySelector('[data-community="rivals"].on'))return;
  target.innerHTML=communityTabs('rivals')+`<p class="trainer-intro">The players you keep meeting with results that stay close: at least three games against real players, closest records first. Beat one to earn the Rivalry relic.</p>`+
    (list.length?`<div class="rival-list">${list.map((r,i)=>`<article class="rival"><span class="rival-rank">${i+1}</span><div><button class="rival-name" data-rival-profile="${escapeHtml(r.name)}">${escapeHtml(r.name)}</button><b>${escapeHtml(rivalLine(r))}</b><small>${r.games} games · draws ${r.draws} · you score ${r.score}%</small><span class="rival-form" aria-label="Last games">${r.form.map(x=>`<i class="form-dot ${x===1?'win':x===.5?'draw':'loss'}"></i>`).join('')}</span></div><button class="gold" data-rival-challenge="${i}">Challenge</button></article>`).join('')}</div>`
      :'<div class="watch-empty"><h4>No rivals yet</h4><p>Play three or more games against the same player and they show up here.</p></div>');
  wireCommunityTabs();
  target.querySelectorAll('[data-rival-profile]').forEach(b=>b.onclick=()=>void openProfile(b.dataset.rivalProfile));
  target.querySelectorAll('[data-rival-challenge]').forEach(b=>b.onclick=()=>{const r=list[Number(b.dataset.rivalChallenge)];if(r)void openChallengeDialog({id:r.id,name:r.name})});
}
// ---- Round 11: Vanta Moment of the Week (server picks it; admins can pin one) ----
let momentStore=null;
async function loadMoment(force=false){
  if(!force&&momentStore&&Date.now()-momentStore.at<600000)return momentStore.moment;
  try{const out=await api.momentOfWeek();momentStore={at:Date.now(),moment:out?.moment?{...out.moment,week:out.week}:null}}catch{momentStore={at:Date.now(),moment:null}}
  return momentStore.moment;
}
function momentHtml(m){
  const admin=isAdmin();if(!m&&!admin)return '';
  const pick=admin?`<form class="moment-pick"><input name="game" maxlength="40" placeholder="Game ID" autocomplete="off"><input name="caption" maxlength="120" placeholder="Caption (optional)" autocomplete="off"><button type="submit">Pick this week's moment</button>${m?.picked?'<button type="button" class="moment-clear">Clear the pick</button>':''}</form>`:'';
  if(!m)return `<article class="vmoment empty"><div><small>VANTA MOMENT OF THE WEEK</small><h4>No moment yet this week</h4></div>${pick}</article>`;
  const side=(name,rating)=>`<b>${escapeHtml(name||'?')}</b>${rating?` <em>${escapeHtml(String(rating))}</em>`:''}`;
  return `<article class="vmoment">${studyBoardHtml(m.fen)}<div><small>VANTA MOMENT OF THE WEEK</small><h4>${escapeHtml(m.caption||'')}</h4><p>${side(m.white,m.whiteRating)} vs ${side(m.black,m.blackRating)} · ${escapeHtml(m.result)}</p><button class="gold moment-replay">Replay the game</button>${pick}</div></article>`;
}
function momentEntry(m){return archiveEntryFromServer({id:m.gameId,sans:m.sans,white_name:m.white,black_name:m.black,result:m.result,rated:true,white_rating_before:m.whiteRating,black_rating_before:m.blackRating,ended_at:m.endedAt,move_count:m.sans?.length||0,variant:'standard',pool:m.pool},null)}
function wireMoment(root,m){
  root.querySelector('.moment-replay')?.addEventListener('click',()=>{if(m)void openArchivedGame(momentEntry(m))});
  const form=root.querySelector('.moment-pick');
  form?.addEventListener('submit',async e=>{e.preventDefault();const id=form.game.value.trim();if(!id)return;try{await api.momentPick(id,form.caption.value.trim());momentStore=null;toast('Moment of the Week picked');void renderWatch();void syncMenuMoment()}catch(error){toast(error.message)}});
  root.querySelector('.moment-clear')?.addEventListener('click',async()=>{try{await api.momentPick(null);momentStore=null;toast('Pick cleared');void renderWatch();void syncMenuMoment()}catch(error){toast(error.message)}});
}
async function syncMenuMoment(){
  const el=$('#menuMoment');if(!el)return;const m=await loadMoment();
  el.classList.toggle('hidden',!m);if(!m){el.innerHTML='';return}
  el.innerHTML=`${studyBoardHtml(m.fen)}<span><small>VANTA MOMENT OF THE WEEK</small><b>${escapeHtml(m.caption||'')}</b><em>${escapeHtml(m.white||'')} vs ${escapeHtml(m.black||'')}</em></span>`;
}
$('#menuMoment')?.addEventListener('click',()=>{setPrimaryScreen('game',{remember:true});activateNav('watch')});
setTimeout(()=>void syncMenuMoment(),1200);
// ---- Puzzle Battle: the same puzzles, three minutes, three misses and you're out ----
let battle=null,battleTimer=null;
const battleSeat=()=>battle?.seat==='guest'?'guest':'host',battleOther=()=>battleSeat()==='host'?'guest':'host';
async function createBattle(to=null){
  try{const out=await api.battleCreate(to);battle={...out.battle,local:{score:0,misses:0,index:0}};if(to)toast('Battle sent');startBattlePolling();drawBattle()}catch(error){toast(error.message)}
}
async function joinBattle(code){
  if(!code)return;
  try{const out=await api.battleJoin(code.toUpperCase());battle={...out.battle,local:{score:0,misses:0,index:0}};history.replaceState(null,'',location.pathname);startBattlePolling();drawBattle()}catch(error){toast(error.message)}
}
function stopBattle(){clearInterval(battleTimer);battleTimer=null;if(puzzleSession?.kind==='battle')puzzleSession=null;battle=null}
function startBattlePolling(){
  clearInterval(battleTimer);
  battleTimer=setInterval(async()=>{
    if(!battle)return clearInterval(battleTimer);
    if(currentRightView!=='battle'&&battle.status!=='live'){stopBattle();return}
    try{const out=await api.battleState(battle.id);const was=battle.status;battle={...out.battle,local:battle.local};if(was!=='live'&&battle.status==='live')beginBattle();if(battle.status==='finished'&&was!=='finished')finishBattle();drawBattleScore()}catch{}
    if(battle?.status==='live'&&Date.now()>Date.parse(battle.ends_at)+1500)finishBattle();
  },1200);
}
function drawBattle(){
  if(!battle)return renderBattle();
  const link=`${location.origin}/?battle=${battle.code}`;
  if(battle.status==='waiting'){
    setDynamicView('battle','Puzzle Battle',`<article class="battle"><p class="trainer-intro">Same puzzles for both of you, easy to hard. Three minutes; three misses and you're out. Most solved wins.</p><div class="battle-code"><small>BATTLE CODE</small><b>${escapeHtml(battle.code)}</b></div><div class="pp-actions"><button class="gold battle-copy">Copy invite link</button><button class="battle-cancel">Cancel</button></div><p class="menu-empty">${brandLoading('Waiting for your opponent…')}</p></article>`);
    $('#dynamicView .battle-copy').onclick=async()=>{try{await navigator.clipboard.writeText(link);toast('Invite link copied')}catch{toast(link)}};
    $('#dynamicView .battle-cancel').onclick=async()=>{try{await api.battleCancel(battle.id)}catch{}stopBattle();void renderBattle()};
    return;
  }
  if(battle.status==='live')return beginBattle();
  if(battle.status==='finished')return finishBattle();
  stopBattle();void renderBattle();
}
function renderBattle(){
  setDynamicView('battle','Puzzle Battle',`<article class="battle"><p class="trainer-intro">Race a friend through the same puzzles: three minutes, three misses and you're out. Unrated, just for fun.</p><button class="gold battle-new">Create a battle</button><form class="battle-join"><input name="code" maxlength="6" placeholder="Battle code" autocomplete="off" autocapitalize="characters"><button>Join</button></form><p class="menu-empty">Or tap Battle next to a friend in Community.</p><h4>Weekly ladder</h4><p class="trainer-intro">Get matched with anyone looking for a battle. A win is 2 points, a tie 1. The top three each week get a badge.</p><div class="pp-actions"><button class="gold battle-queue">Find an opponent</button><button class="battle-ladder">This week's ladder</button></div></article>`);
  $('#dynamicView .battle-queue').onclick=()=>void queueBattle();
  $('#dynamicView .battle-ladder').onclick=()=>void renderLadder();
  $('#dynamicView .battle-new').onclick=()=>void createBattle();
  $('#dynamicView .battle-join').onsubmit=e=>{e.preventDefault();void joinBattle(String(new FormData(e.currentTarget).get('code')||'').trim())};
}
function beginBattle(){
  if(!battle||battle.status!=='live')return;
  if(puzzleSession?.kind==='battle')return drawBattleScore();
  const wait=Date.parse(battle.starts_at)-Date.now();
  setDynamicView('battle','Puzzle Battle',`<article class="battle live"><div class="battle-score"></div><h4 class="battle-status">${wait>0?`Starting in ${Math.ceil(wait/1000)}`:'Go!'}</h4><button class="battle-quit">Leave battle</button></article>`);
  $('#dynamicView .battle-quit').onclick=()=>{stopBattle();showMovesView()};
  drawBattleScore();
  setTimeout(()=>{if(battle?.status==='live')nextBattlePuzzle()},Math.max(0,wait));
}
function nextBattlePuzzle(){
  if(!battle)return;const l=battle.local,p=battle.puzzles[l.index];
  if(!p||l.misses>=battle.maxMisses||Date.now()>Date.parse(battle.ends_at)){puzzleSession=null;const st=$('#dynamicView .battle-status');if(st)st.textContent=l.misses>=battle.maxMisses?'Out of lives · waiting for the end':'Done · waiting for the end';return}
  cancelPremove(false);if(watchSession)stopWatching();if(archiveSession)leaveArchive({reset:false});streakSession=null;
  const startFen=playablePuzzleFen(Chess,{fen:p.fen,solution:p.solution});if(!startFen){l.index++;return nextBattlePuzzle()} // unplayable: skip it
  game.load(startFen);mode='puzzle';serverGameId=null;clockSnapshot=null;browse=null;boardShapes=[];flipped=game.turn()==='b';orientationSet=true;
  puzzleSession={id:`battle-${p.id}`,solution:p.solution,index:0,played:[],started:Date.now(),failed:false,kind:'battle'};
  setPrimaryScreen('game');render();
  const st=$('#dynamicView .battle-status');if(st)st.textContent=`Puzzle ${l.index+1} · ${game.turn()==='w'?'White':'Black'} to move`;
}
function battleSolved(){if(!battle)return;battle.local.score++;battle.local.index++;playUiSound('success');reportBattle();nextBattlePuzzle()}
function battleMiss(move){if(!battle)return;battle.local.misses++;battle.local.index++;rejectMove(move.from,move.to,{quietRule:true});reportBattle();setTimeout(nextBattlePuzzle,350)}
function reportBattle(){if(!battle)return;drawBattleScore();void api.battleProgress(battle.id,battle.local.score,battle.local.misses).then(out=>{if(battle){battle={...out.battle,local:battle.local};drawBattleScore()}}).catch(()=>{})}
function drawBattleScore(){
  const slot=$('#dynamicView .battle-score');if(!slot||!battle)return;
  const me=battle[battleSeat()]||{},them=battle[battleOther()]||{},left=Math.max(0,Math.ceil((Date.parse(battle.ends_at)-Date.now())/1000));
  const mine={score:Math.max(battle.local.score,Number(me.score||0)),misses:Math.max(battle.local.misses,Number(me.misses||0))};
  const lives=n=>`<span class="battle-lives" aria-label="${battle.maxMisses-n} lives left">${[...Array(battle.maxMisses)].map((_,i)=>`<i class="${i<battle.maxMisses-n?'on':''}"></i>`).join('')}</span>`;
  slot.innerHTML=`<div class="battle-side me"><small>YOU</small><b>${mine.score}</b>${lives(mine.misses)}</div><div class="battle-clock">${Math.floor(left/60)}:${String(left%60).padStart(2,'0')}</div><div class="battle-side"><small>${escapeHtml(them.name||'Opponent')}</small><b>${Number(them.score||0)}</b>${lives(Number(them.misses||0))}</div>`;
}
function finishBattle(){
  if(!battle)return;clearInterval(battleTimer);battleTimer=null;if(puzzleSession?.kind==='battle')puzzleSession=null;
  const b=battle,me=b[battleSeat()]||{},them=b[battleOther()]||{},mine=Math.max(b.local.score,Number(me.score||0)),theirs=Number(them.score||0);
  const title=mine>theirs?'You won the battle':mine<theirs?'You lost the battle':'A tie';
  setDynamicView('battle','Puzzle Battle',`<article class="battle done"><h4>${title}</h4><div class="battle-final"><b>${mine}</b><span>–</span><b>${theirs}</b></div><p>${escapeHtml(them.name||'Opponent')}</p><div class="pp-actions"><button class="gold battle-again">New battle</button><button class="battle-back">Back to puzzles</button></div></article>`);
  $('#dynamicView .battle-again').onclick=()=>{battle=null;void createBattle()};
  $('#dynamicView .battle-back').onclick=()=>{battle=null;showBackendView('puzzle')};
  battle=null;
}
setInterval(()=>{if(battle?.status==='live')drawBattleScore()},1000);
// ---- Simuls: one host, many boards ----
let simulSession=null,simulTimer=null;
async function renderSimuls(){
  setDynamicView('simuls','Simuls',brandLoading('Loading simuls…'));
  try{
    const {simuls=[]}=await api.simulList(),target=$('#dynamicView .view-content');if(!target||currentRightView!=='simuls')return;
    target.innerHTML=`<article class="simuls"><p class="trainer-intro">In a simul one player takes on everyone who joins, each on their own board. The host plays White on every board; games are casual.</p>
      ${signedIn()?`<details class="simul-host"><summary>Host a simul</summary><form class="simul-form"><label>Name <input name="name" maxlength="60" placeholder="Friday simul"></label><label>Time control <select name="tc"><option value="1800+30">30+30</option><option value="900+10">15+10</option><option value="600+5">10+5</option></select></label><label>Players <input name="max" type="number" min="2" max="20" value="10"></label><label class="check-row">Club members only <input name="club" type="checkbox"></label><button class="gold">Create simul</button></form></details>`:'<p class="menu-empty">Sign in to host or join a simul.</p>'}
      <div class="simul-list">${simuls.map(x=>`<article class="simul-card"><div><small>${escapeHtml(x.status==='live'?'PLAYING':'OPEN')} · ${formatTimeControl(x.base_seconds,x.increment_seconds)}</small><b>${escapeHtml(x.name)}</b><span>${escapeHtml(x.host)}${x.hostRating?` · ${x.hostRating}`:''} · ${x.players}/${x.max_players} players</span></div><div>${x.mine?`<button data-simul-open="${x.id}" class="gold">Manage</button>`:x.status==='open'?(x.joined?`<button data-simul-leave="${x.id}">Leave</button>`:`<button data-simul-join="${x.id}" class="gold">Join</button>`):''}<button data-simul-open="${x.id}">Open</button></div></article>`).join('')||'<p class="menu-empty">No simuls right now. Host the first one.</p>'}</div></article>`;
    target.querySelector('.simul-form')?.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.currentTarget),[sec,inc]=String(f.get('tc')).split('+').map(Number);try{const out=await api.simulCreate({name:f.get('name'),seconds:sec,increment:inc,maxPlayers:Number(f.get('max')||10),club:!!f.get('club')});toast('Simul created');void renderSimul(out.simul.id)}catch(error){toast(error.message)}});
    target.querySelectorAll('[data-simul-join]').forEach(b=>b.onclick=async()=>{try{await api.simulJoin(b.dataset.simulJoin);toast('Joined · the host starts the simul');void renderSimul(b.dataset.simulJoin)}catch(error){toast(error.message)}});
    target.querySelectorAll('[data-simul-leave]').forEach(b=>b.onclick=async()=>{try{await api.simulLeave(b.dataset.simulLeave);void renderSimuls()}catch(error){toast(error.message)}});
    target.querySelectorAll('[data-simul-open]').forEach(b=>b.onclick=()=>void renderSimul(b.dataset.simulOpen));
  }catch(error){toast(error.message)}
}
async function renderSimul(id){
  clearInterval(simulTimer);
  setDynamicView('simul','Simul',brandLoading('Loading the simul…'));
  const draw=async()=>{
    if(currentRightView!=='simul'){clearInterval(simulTimer);return}
    let d;try{d=await api.simulState(id)}catch(error){clearInterval(simulTimer);toast(error.message);return}
    if(currentRightView!=='simul')return;const target=$('#dynamicView .view-content');if(!target)return;
    if(d.isHost&&d.simul.status==='live')simulSession={id,boards:d.boards};
    const s=d.simul,waiting=d.boards.filter(b=>b.hostToMove).length,mine=d.boards.find(b=>b.mine&&b.code);
    target.innerHTML=`<article class="simul">
      <div class="lobby-head"><small>${escapeHtml(s.status.toUpperCase())} · ${formatTimeControl(s.base_seconds,s.increment_seconds)} · ${s.players}/${s.max_players} players</small><b>${escapeHtml(s.name)}</b><span>${escapeHtml(s.host)}${s.status==='live'||s.status==='finished'?` · host ${d.score.host} · players ${d.score.players} · draws ${d.score.draws}`:''}</span></div>
      ${d.isHost&&s.status==='open'?`<div class="pp-actions"><button class="gold simul-start"${d.entrants.length?'':' disabled'}>Start the simul</button><button class="simul-cancel">Cancel</button><button class="simul-copy">Copy invite link</button></div><h4>Players</h4><div class="pp-list">${d.entrants.map(n=>`<div><b>${escapeHtml(n)}</b></div>`).join('')||'<p class="menu-empty">Waiting for players to join.</p>'}</div>`:''}
      ${!d.isHost&&s.status==='open'?`<p class="menu-empty">${s.joined?'You are in. The host starts the simul soon; your board opens from here and from your notifications.':'Join from the simul list to play the host.'}</p>`:''}
      ${mine&&mine.status==='active'?`<button class="gold lobby-mine" data-code="${escapeHtml(mine.code)}">Go to your board</button>`:''}
      ${d.boards.length?`<h4>Boards${d.isHost&&waiting?` <small>${waiting} waiting for you</small>`:''}</h4><div class="watch-grid simul-boards">${d.boards.map((b,i)=>`<button type="button" class="watch-card simul-board${b.hostToMove&&d.isHost?' your-move':''}${b.mine?' mine':''}" data-board="${i}"${b.code?'':' disabled'}>${studyBoardHtml(b.fen)}<span class="watch-meta"><span><b>${escapeHtml(b.opponent||'Player')}</b><em>${b.status==='active'?(b.hostToMove?(d.isHost?'Your move':'Host to move'):(d.isHost?'Their move':'Your move')):escapeHtml(b.result)}</em></span></span></button>`).join('')}</div>`:''}
    </article>`;
    target.querySelector('.simul-start')?.addEventListener('click',async()=>{try{await api.simulStart(id);toast('Simul started');void draw()}catch(error){toast(error.message)}});
    target.querySelector('.simul-cancel')?.addEventListener('click',async()=>{try{await api.simulStart(id,true);void renderSimuls()}catch(error){toast(error.message)}});
    target.querySelector('.simul-copy')?.addEventListener('click',async()=>{const link=`${location.origin}/?simul=${id}`;try{await navigator.clipboard.writeText(link);toast('Invite link copied')}catch{toast(link)}});
    target.querySelector('.lobby-mine')?.addEventListener('click',e=>void openGameByCode(e.currentTarget.dataset.code));
    target.querySelectorAll('[data-board]').forEach(el=>el.onclick=()=>{const b=d.boards[Number(el.dataset.board)];if(b?.code)void openGameByCode(b.code)});
    syncSimulBar();
  };
  await draw();simulTimer=setInterval(()=>{if(!document.hidden)void draw()},5000);
}
async function openGameByCode(code){
  try{
    await resetFinishedGame('room');
    const state=await api.join(code,guestName);applyServerState(state);room=(state.game||state).invite_code||code;roomCreated=false;history.replaceState(null,'',`?game=${encodeURIComponent(room)}`);syncRoomUi();await loadChat();
    setPrimaryScreen('game');syncSimulBar();
  }catch(error){toast(error.message)}
}
// The host's bar on a simul board: how many boards wait, and a jump to the next one.
async function refreshSimulSession(){
  if(!simulSession)return;
  try{const d=await api.simulState(simulSession.id);if(d.simul.status!=='live'){simulSession=null;syncSimulBar();return}simulSession.boards=d.boards;syncSimulBar()}catch{}
}
function syncSimulBar(){
  const bar=$('#simulBar');if(!bar)return;
  const on=!!simulSession&&!!serverGame?.simul_id&&serverGame.simul_id===simulSession.id;
  bar.classList.toggle('hidden',!on);if(!on)return;
  const waiting=simulSession.boards.filter(b=>b.hostToMove&&b.id!==serverGameId).length;
  $('#simulBarText').textContent=waiting?`Simul · ${waiting} ${waiting===1?'board waits':'boards wait'} for you`:'Simul · no other board waits';
  $('#simulNext').disabled=!waiting;
}
$('#simulNext').onclick=()=>{const next=simulSession?.boards.find(b=>b.hostToMove&&b.id!==serverGameId&&b.code);if(next)void openGameByCode(next.code)};
$('#simulAll').onclick=()=>{if(simulSession)void renderSimul(simulSession.id)};
setInterval(()=>{if(simulSession&&!document.hidden)void refreshSimulSession()},5000);
// ---- Puzzle Battle ladder: get matched, a weekly table, a podium badge ----
let battleQueueTimer=null;
async function queueBattle(){
  if(!signedIn())return openAccount();
  try{
    const out=await api.battleQueue();
    if(out.battle){battle={...out.battle,local:{score:0,misses:0,index:0}};startBattlePolling();return drawBattle()}
    setDynamicView('battle','Puzzle Battle',`<article class="battle"><p class="trainer-intro">Looking for an opponent for the weekly ladder…</p><p class="menu-empty">${brandLoading('Searching')}</p><button class="battle-cancel">Stop searching</button></article>`);
    $('#dynamicView .battle-cancel').onclick=async()=>{clearInterval(battleQueueTimer);battleQueueTimer=null;try{await api.battleQueueStatus(true)}catch{}renderBattle()};
    clearInterval(battleQueueTimer);const started=Date.now();
    battleQueueTimer=setInterval(async()=>{
      if(currentRightView!=='battle'){clearInterval(battleQueueTimer);battleQueueTimer=null;void api.battleQueueStatus(true).catch(()=>{});return}
      if(Date.now()-started>120000){clearInterval(battleQueueTimer);battleQueueTimer=null;void api.battleQueueStatus(true).catch(()=>{});toast('Nobody else is looking right now. Try again later or invite a friend.');return renderBattle()}
      try{const st=await api.battleQueueStatus();if(st.battle){clearInterval(battleQueueTimer);battleQueueTimer=null;battle={...st.battle,local:{score:0,misses:0,index:0}};startBattlePolling();drawBattle()}else if(!(Date.now()-started<15000)){const again=await api.battleQueue();if(again.battle){clearInterval(battleQueueTimer);battleQueueTimer=null;battle={...again.battle,local:{score:0,misses:0,index:0}};startBattlePolling();drawBattle()}}}catch{}
    },2000);
  }catch(error){toast(error.message)}
}
async function renderLadder(){
  setDynamicView('battle','Puzzle Battle ladder',brandLoading('Loading the ladder…'));
  let d;try{d=await api.battleLadder()}catch(error){toast(error.message);return}
  const target=$('#dynamicView .view-content');if(!target||currentRightView!=='battle')return;
  target.innerHTML=`<article class="battle ladder"><div class="lobby-head"><small>WEEK ${escapeHtml(d.week)}</small><b>Puzzle Battle ladder</b><span>${d.waiting?`${d.waiting} looking for a battle now`:'Win 2 · tie 1 · top three get a badge'}</span></div>
    <div class="pp-actions"><button class="gold battle-queue">Find an opponent</button><button class="battle-back">Back</button></div>
    ${d.lastWeek.podium.length?`<h4>Last week <small>${escapeHtml(d.lastWeek.week)}</small></h4><div class="ladder-podium">${d.lastWeek.podium.map((p,i)=>`<div class="place-${i+1}"><b>${i+1}</b><span>${escapeHtml(p.name)}</span><em>${p.points}</em></div>`).join('')}</div>`:''}
    <h4>This week</h4><div class="league-table">${d.standings.map(r=>`<div class="${r.me?'me':''}"><span>${r.rank}</span><b>${escapeHtml(r.name)}</b><em>${r.wins}/${r.battles} won</em><strong>${r.points}</strong></div>`).join('')||'<p class="menu-empty">No battles yet this week. Be the first.</p>'}</div></article>`;
  target.querySelector('.battle-queue').onclick=()=>void queueBattle();
  target.querySelector('.battle-back').onclick=()=>renderBattle();
}
// ---- Analyse together: one shared board over a realtime channel (no server state) ----
function analysisCode(){return crypto.getRandomValues(new Uint32Array(2)).reduce((s,n)=>s+n.toString(36),'').replace(/[^a-z0-9]/g,'').slice(0,10).toUpperCase()}
function startAnalysis({startFen=new Chess().fen(),sans=[]}={}){joinAnalysis(analysisCode(),{startFen,sans,host:true})}
function joinAnalysis(code,{startFen=null,sans=[],host=false}={}){
  if(!/^[A-Z0-9]{6,12}$/.test(code))return toast('That analysis link is not valid');
  if(liveGameOn()&&mode!=='computer')return toast('Analysis opens after your game');
  leaveAnalysis({restore:false});
  cancelPremove(false);if(watchSession)stopWatching();if(archiveSession)leaveArchive({reset:false});
  puzzleSession=null;streakSession=null;if(exploreSession)endExplore({restore:false});if(repEdit)endRepEdit({restore:false});if(egSession)endEndgame({restore:false});if(prepSession)endPrep({restore:false});
  if(mode==='computer'&&computerStarted){computerStarted=false;currentBot=null;myColor=null}
  const name=(currentProfile?.account&&currentProfile.username)||guestName;
  analysis={code,host,startFen:startFen||new Chess().fen(),sans:[...sans],seq:host?1:0,peers:new Map(),name,sentKey:'',channel:null};
  analysisLoad();mode='analysis';serverGameId=null;clockSnapshot=null;browse=null;orientationSet=true;
  analysis.channel=realtimeClient.channel(`analysis:${code}`,{config:{broadcast:{self:false}}})
    .on('broadcast',{event:'state'},m=>analysisReceive(m?.payload))
    .on('broadcast',{event:'hello'},m=>{const p=m?.payload||{};if(!p.id||!analysis)return;analysis.peers.set(p.id,{name:String(p.name||'Guest').slice(0,24),at:Date.now()});drawAnalysis();analysisSend(true)})
    .on('broadcast',{event:'bye'},m=>{if(analysis){analysis.peers.delete(m?.payload?.id);drawAnalysis()}})
    .subscribe(status=>{if(status==='SUBSCRIBED'&&analysis){analysis.channel.send({type:'broadcast',event:'hello',payload:{id:realtimeClientId,name:analysis.name}}).catch(()=>{});if(host)analysisSend(true)}});
  history.replaceState(null,'',`?analysis=${code}`);
  setPrimaryScreen('game');render();updateMoves();drawAnalysis();
}
function analysisLoad(){const c=new Chess(analysis.startFen);for(const s of analysis.sans){try{c.move(s)}catch{break}}game.load(c.fen());lastMoveCache={fen:'',move:null};}
function analysisPayload(){return {id:realtimeClientId,name:analysis.name,seq:analysis.seq,startFen:analysis.startFen,sans:analysis.sans,shapes:boardShapes.slice(0,24)}}
function analysisSend(force=false){
  if(!analysis?.channel)return;const key=JSON.stringify([analysis.sans,boardShapes]);if(!force&&key===analysis.sentKey)return;analysis.sentKey=key;
  analysis.channel.send({type:'broadcast',event:'state',payload:analysisPayload()}).catch(()=>{});
}
function analysisReceive(p){
  if(!analysis||!p||!Array.isArray(p.sans))return;
  if(p.id&&p.name)analysis.peers.set(p.id,{name:String(p.name).slice(0,24),at:Date.now()});
  if(!isNewer(p,analysis,realtimeClientId)){drawAnalysis();return}
  try{new Chess(String(p.startFen))}catch{return}
  analysis.seq=Number(p.seq);analysis.startFen=String(p.startFen);analysis.sans=p.sans.slice(0,400).map(String);
  boardShapes=cleanShapes(p.shapes);
  analysis.sentKey=JSON.stringify([analysis.sans,boardShapes]);
  analysisLoad();render();updateMoves();drawAnalysis();
}
function analysisChanged(){if(!analysis)return;analysis.seq++;analysisSend();drawAnalysis()}
function leaveAnalysis({restore=true}={}){
  if(!analysis)return;const ch=analysis.channel;analysis=null;
  if(ch){ch.send({type:'broadcast',event:'bye',payload:{id:realtimeClientId}}).catch(()=>{});realtimeClient.removeChannel(ch).catch(()=>{})}
  if(new URLSearchParams(location.search).get('analysis'))history.replaceState(null,'',location.pathname);
  if(mode==='analysis'){mode='room';if(restore){game.reset();boardShapes=[];render();updateMoves()}}
}
function analysisMove(move){
  let made=null;try{made=game.move({from:move.from,to:move.to,promotion:move.promotion||'q'})}catch{}
  if(!made)return rejectMove(move.from,move.to);
  analysis.sans=[...analysis.sans,made.san];
  boardShapes=[];rememberLastMove(made);render({hint:made});afterBoardPaint(playTone);updateMoves();analysisChanged();
}
function drawAnalysis(){
  if(!analysis)return;const link=`${location.origin}/?analysis=${analysis.code}`,peers=[...analysis.peers.values()].filter(p=>Date.now()-p.at<120000);
  const html=`<article class="explorer analysis-together"><p class="trainer-intro">Everyone with the link moves the same pieces and sees the same arrows. Right-click (or long-press) to draw.</p>
    <div class="battle-code"><small>ANALYSIS LINK</small><b>${escapeHtml(analysis.code)}</b></div>
    <div class="pp-actions"><button class="gold an-copy">Copy link</button><button class="an-back"${analysis.sans.length?'':' disabled'}>Back one move</button><button class="an-reset">Start position</button><button class="an-leave">Leave</button></div>
    <div class="explorer-line">${analysis.sans.length?escapeHtml(lineText(analysis.sans)):'Start position'}</div>
    <h4>Here now</h4><div class="an-peers"><span class="me">${escapeHtml(analysis.name)} (you)</span>${peers.map(p=>`<span>${escapeHtml(p.name)}</span>`).join('')||'<small>Share the link to invite someone.</small>'}</div></article>`;
  if(currentRightView!=='analysis')setDynamicView('analysis','Analyse together',html);else{const t=$('#dynamicView .view-content');if(t)t.innerHTML=html}
  $('#dynamicView .an-copy').onclick=async()=>{try{await navigator.clipboard.writeText(link);toast('Analysis link copied')}catch{toast(link)}};
  $('#dynamicView .an-back').onclick=()=>{if(!analysis.sans.length)return;analysis.sans=analysis.sans.slice(0,-1);boardShapes=[];analysisLoad();render();updateMoves();analysisChanged()};
  $('#dynamicView .an-reset').onclick=()=>{analysis.sans=[];boardShapes=[];analysisLoad();render();updateMoves();analysisChanged()};
  $('#dynamicView .an-leave').onclick=()=>{leaveAnalysis();showMovesView()};
}
// ---- Tournament lobby: standings, pairings and the top live games (refreshes every 10s) ----
let lobbyTimer=null;
async function openTournamentLobby(t){
  clearInterval(lobbyTimer);
  setDynamicView('lobby',t.name||'Tournament lobby',brandLoading('Loading the lobby…'));
  const draw=async()=>{
    if(currentRightView!=='lobby'){clearInterval(lobbyTimer);return}
    let d;try{d=await api.tournamentLobby(t.id)}catch(error){clearInterval(lobbyTimer);toast(error.message);return}
    const target=$('#dynamicView .view-content');if(!target||currentRightView!=='lobby')return;
    const typing=target.querySelector('.cm-input');if(typing&&(typing.value||document.activeElement===typing))return; // don't wipe a comment being written
    const tt=d.tournament||t,swiss=tt.format==='swiss',games=d.games||[],top=games.slice(0,4),rest=games.slice(4);
    const card=(g,i)=>`<button type="button" class="watch-card lobby-game${g.mine?' mine':''}" data-lobby-watch="${i}">${studyBoardHtml(g.fen)}<span class="watch-meta"><span><b>${escapeHtml(g.white||'White')}</b><em>${escapeHtml(String(g.whiteRating||''))}</em></span><span><b>${escapeHtml(g.black||'Black')}</b><em>${escapeHtml(String(g.blackRating||''))}</em></span><small>${g.mine?'Your game':`move ${Math.max(1,Math.ceil(Number(g.moves||0)/2))}`}</small></span></button>`;
    const myPairing=(d.pairings||[]).find(p=>p.mine&&p.code&&p.result==='playing');
    target.innerHTML=`<article class="lobby">
      <div class="lobby-head"><small>${tt.rated?'RATED':'CASUAL'} · ${escapeHtml(tt.pool||'')} · ${formatTimeControl(Number(tt.base_seconds||600),Number(tt.increment_seconds||0))}${swiss&&Number(tt.current_round)?` · Round ${tt.current_round} of ${tt.rounds}`:''}</small><b>${escapeHtml(tt.name||'Tournament')}</b><span>${escapeHtml(swiss?(tt.status==='finished'?'Finished':'Swiss'):arenaPhase(tt).label)}</span></div>
      ${myPairing?`<button class="gold lobby-mine" data-code="${escapeHtml(myPairing.code)}">Go to your game</button>`:''}
      ${(d.commentary||[]).length||d.canComment?`<h4>Commentary</h4>${d.canComment?`<form class="cm-form"><select name="game" aria-label="Game"><option value="">The whole event</option>${games.map(g=>`<option value="${escapeHtml(g.id)}">${escapeHtml(g.white)} vs ${escapeHtml(g.black)}</option>`).join('')}</select><input name="body" class="cm-input" maxlength="280" placeholder="What's happening on the boards?" autocomplete="off"><button>Post</button></form>`:''}<div class="cm-feed">${(d.commentary||[]).map(c=>`<div class="cm-item"><small>${escapeHtml(c.author)}${c.game?` · ${escapeHtml(c.game)}${c.ply?` · move ${Math.ceil(c.ply/2)}`:''}`:''} · ${escapeHtml(new Date(c.at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}))}</small><p>${escapeHtml(c.body)}</p></div>`).join('')||'<p class="menu-empty">No commentary yet.</p>'}</div>`:''}
      <h4>Live games <small>Top games first</small></h4>
      ${games.length?`<div class="watch-grid lobby-top">${top.map(card).join('')}</div>${rest.length?`<div class="lobby-list">${rest.map((g,i)=>`<button type="button" data-lobby-watch="${i+4}"${g.mine?' class="mine"':''}><b>${escapeHtml(g.white)}</b> <em>${escapeHtml(String(g.whiteRating||''))}</em> vs <b>${escapeHtml(g.black)}</b> <em>${escapeHtml(String(g.blackRating||''))}</em></button>`).join('')}</div>`:''}`:'<p class="menu-empty">No live games in this tournament right now.</p>'}
      ${swiss?`<h4>Pairings${Number(tt.current_round)?` <small>Round ${tt.current_round}</small>`:''}</h4>${(d.pairings||[]).length?`<div class="lobby-pairings">${d.pairings.map(p=>`<div class="${p.mine?'me':''}"><b>${escapeHtml(p.white)}</b><span>${p.result==='playing'?'Playing':escapeHtml(p.result||'')}</span><b>${escapeHtml(p.black)}</b></div>`).join('')}</div>`:'<p class="menu-empty">Pairings appear when the round starts.</p>'}`:''}
      <h4>Standings</h4>
      ${(d.clubs||[]).length?`<div class="club-table"><small>CLUBS · best five count</small>${d.clubs.slice(0,8).map((c,i)=>`<p><span>${i+1}.</span> ${escapeHtml(c.name)} <b>${c.points} pts</b> <small>${c.players} players</small></p>`).join('')}</div>`:''}
      <div class="league-table lobby-standings">${standingsRows(d.standings||[]).slice(0,30).map(p=>`<div><span>${p.rank}</span><b>${escapeHtml(p.name)}${p.fire?' <i class="fire-tag">On fire</i>':''}</b><em>${escapeHtml(p.record)}</em><strong>${p.points}</strong></div>`).join('')||'<p class="menu-empty">No scores yet.</p>'}</div>
      <small class="ex-note">Updates every 10 seconds</small>
    </article>`;
    target.querySelectorAll('[data-lobby-watch]').forEach(el=>el.onclick=()=>{const g=games[Number(el.dataset.lobbyWatch)];if(!g)return;clearInterval(lobbyTimer);if(g.mine){if(myPairing)location.search='?game='+encodeURIComponent(myPairing.code);else showMovesView();return}void startWatching(g.id)});
    target.querySelector('.lobby-mine')?.addEventListener('click',e=>{location.search='?game='+encodeURIComponent(e.currentTarget.dataset.code)});
    target.querySelector('.cm-form')?.addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget,f=new FormData(form),body=String(f.get('body')||'').trim();if(!body)return;try{await api.commentaryPost(t.id,body,String(f.get('game')||'')||null);form.querySelector('.cm-input').value='';form.querySelector('.cm-input').blur();toast('Posted');void draw()}catch(error){toast(error.message)}});
  };
  await draw();
  lobbyTimer=setInterval(()=>{if(document.hidden)return;void draw()},10000);
}
function activateNav(kind){
  $$('.main-nav button').forEach(b=>b.classList.toggle('active',b.dataset.nav===kind));
  if(kind==='play')showMovesView();
  if(kind==='arena')showBackendView('arena');
  if(kind==='watch')void renderWatch();
  if(kind==='friends')void renderFriends();
  if(kind==='puzzles')showBackendView('puzzle');
  if(kind==='learn')renderLearn();
  if(kind==='openings')renderOpenings();
  if(kind==='famous')renderFamous();
  if(kind==='review')void renderArchive();
  recordNav(kind);
}
// ---- Back button (backlog 7): every screen change is a history entry, and Back returns to the
// previous screen (top navigation on desktop; tab and view on phones) instead of leaving VCH.
// Entries keep the page's own URL, so ?game= and ?analysis= links are untouched.
function navSnapshot(){const phone=isMobileApp();return {nav:navLast,mView:phone?mView:null,mTab:phone?mTab:null}}
const sameNav=(a,b)=>!!a&&!!b&&a.nav===b.nav&&a.mView===b.mView&&a.mTab===b.mTab;
function recordNav(nav){
  if(nav)navLast=nav;
  if(navRestoring||navPending)return;
  navPending=true;
  queueMicrotask(()=>{ // one entry per user action, even when it changes both the screen and the view
    navPending=false;const snap=navSnapshot();if(sameNav(snap,navCurrent))return;
    const first=!navCurrent;navCurrent=snap;
    try{if(first)history.replaceState({...(history.state||{}),vchNav:snap},'',location.href);else history.pushState({vchNav:snap},'',location.href)}catch{}
    if(!first){playUiSound('page');musicResult=null;queueAtmosphere()} // a new screen: a page turns, and the music follows you there
  });
}
window.addEventListener('popstate',event=>{
  const snap=event.state?.vchNav;if(!snap)return;
  navRestoring=true;playUiSound('back');musicResult=null;queueAtmosphere();
  try{if(snap.mTab)mTab=snap.mTab;activateNav(snap.nav);if(snap.mView&&isMobileApp())setMView(snap.mView)}
  finally{navRestoring=false;navCurrent=navSnapshot()}
});
// Moving between screens and sections (owner, 2026-10-17: "it does not land naturally"): the
// screen you go to fades in, briefly, instead of swapping in a single frame (style.css
// .shell[data-entering], .view-entering). Not before the page's first appearance, which has
// its own (src/boot-reveal.js), and never with Motion off or reduced motion.
let enteringTimer=0;
function markEntering(view){
  const shell=$('.shell');if(!shell||!document.documentElement.classList.contains('app-revealed')||motionScale()===0)return;
  shell.dataset.entering=view;clearTimeout(enteringTimer);enteringTimer=setTimeout(()=>{delete shell.dataset.entering},360);
}
function enterView(el){
  if(!el||!document.documentElement.classList.contains('app-revealed')||motionScale()===0)return;
  el.classList.remove('view-entering');void el.offsetWidth;el.classList.add('view-entering');
  clearTimeout(el.enteringTimer);el.enteringTimer=setTimeout(()=>el.classList.remove('view-entering'),360);
}
function setPrimaryScreen(screen,{remember=false}={}){
  const shell=$('.shell'),menu=$('#mainMenu'),workspace=$('#gameWorkspace'),showGame=screen==='game';
  if(shell&&shell.classList.contains('game-active')!==showGame)markEntering(showGame?'game':'intro');
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
// Settings (owner, 2026-10-17: "when one enters the settings it pops up a color panel"): grouped
// as Board & pieces, Sound & music, Look & motion and Language, with the colour pickers folded
// away under "Your own colours". The board's own Board theme button opens it with them unfolded.
function openSettings({colours=false}={}){
  const fold=$('#ownColours');if(fold)fold.open=colours;
  syncBoardSets();menus.open('theme');
  if(colours)fold?.scrollIntoView?.({block:'nearest'});
}
$('#closeThemeTop').onclick=()=>menus.close('theme');
registerModal('account',$('#accountDialog'));
registerModal('search',$('#searchDialog'));
registerModal('promotion',$('#promotion'));
// The interface is heard (src/sfx.js): a press is a tap, a switch clicks, a dialog or menu opens
// and closes; behind a settings dialog the music is muffled, as if behind a door. The board has
// its own sounds (moves), and a [data-quiet] area (the Sound test) plays only what it plays.
menus.onChange((name,open)=>{if(name!=='promotion')playUiSound(open?'open':'close');if(['theme','account','search'].includes(name))vantaScore?.muffle(open?1:0)});
document.addEventListener('vch-dialog',e=>playUiSound(e.detail?.open?'open':'close'));
document.addEventListener('click',e=>{const el=e.target.closest?.('button,[role="button"],a[href],summary,.feature-card');if(el&&!el.disabled&&!el.closest('#board,[data-quiet]'))playUiSound('tap')},{capture:true,passive:true});
document.addEventListener('change',e=>{const t=e.target;if(!t||t.closest?.('[data-quiet]'))return;if(t.type==='checkbox')playUiSound(t.checked?'toggle-on':'toggle-off');else if(t.tagName==='SELECT')playUiSound('tap')},{capture:true,passive:true});
const warmSounds=()=>{const later=window.requestIdleCallback||(fn=>setTimeout(fn,300));later(()=>{const bank=soundBankNow();void bank.warm('ui').then(()=>{const set=pieceSoundSet();if(set!=='classic')return bank.warm(set)})})};
document.addEventListener('pointerdown',warmSounds,{once:true,capture:true,passive:true});
document.addEventListener('keydown',warmSounds,{once:true,capture:true,passive:true});
document.addEventListener('pointerdown',event=>{menus.handleOutside(event.target)},true);
$('#closeProfileMenu').onclick=()=>menus.close('profile');
$('#closeNotifyMenu').onclick=()=>menus.close('notifications');
$('#profileMenuProfile').onclick=openAccount;
$('#profileMenuEdit').onclick=()=>{menus.close('profile');void openProfileEditor()};
$('#profileMenuInsights').onclick=()=>{menus.close('profile');void renderInsights()};
$('#profileMenuSettings').onclick=()=>openSettings();
$('#settingsBtn').onclick=()=>openSettings();
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
    ...COURSES.flatMap(c=>c.lessons.map(l=>({c,l}))).filter(({c,l})=>(l.title+' '+l.goal+' '+c.title).toLowerCase().includes(q)).map(({c,l})=>({type:'Lesson',title:l.title,sub:c.title,action:'learn',lesson:l.id})),
    ...FAMOUS_LESSONS.filter(x=>(x.title+' '+x.white+' '+x.black+' '+x.opening).toLowerCase().includes(q)).map(x=>({type:'Famous lesson',title:x.title,sub:`${x.white} vs ${x.black} · ${x.year}`,action:'famous',famous:x.id}))
  ].slice(0,8);
  target.innerHTML=results.map((r,i)=>`<button data-result="${i}"><small>${r.type}</small><b>${escapeHtml(r.title)}</b><span>${escapeHtml(r.sub)}</span></button>`).join('')||'<p>No results yet.</p>';
  [...target.querySelectorAll('[data-result]')].forEach((b,i)=>b.onclick=()=>{menus.close('search');const r=results[i];activateNav(r.action);if(r.lesson)startCourseLesson(r.lesson);else if(r.famous)startFamousLesson(r.famous)});
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
savedTheme.pieceTint=0; // the pre-sprite tint (default .18) muddied the sprite sets; it no longer applies
// The tint chosen since the sprite sets (0 by default) is kept across visits.
savedTheme.spriteTint=clamp(savedTheme.spriteTint,0,.7,0);
savedTheme['--glass']=String(clamp(savedTheme['--glass'],.15,1,.94));
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
document.documentElement.style.setProperty('--piece-tint',String(savedTheme.spriteTint));
for(const [key,value] of Object.entries(savedTheme)){if(key==='wallpaper')document.body.dataset.wallpaper=value;else if(key!=='pieceStyle'&&key!=='pieceTint'&&key!=='spriteTint')document.documentElement.style.setProperty(key,value)}
motionScaleCache=null; // the saved Motion setting is applied now
const glassControl=$('[data-theme="--glass"]'),motionControl=$('[data-theme="--motion"]');
if(glassControl)glassControl.value=String(Math.round(Number(savedTheme['--glass'])*100));
if(motionControl)motionControl.value=String(Math.round(parseFloat(savedTheme['--motion'])/4));
$$('[data-theme]').forEach(input=>input.oninput=()=>{
  const value=input.type!=='range'?input.value:input.dataset.theme==='--glass'?String(clamp(Number(input.value)/100,.15,1,.94)):motionCssValue(input.value);
  document.documentElement.style.setProperty(input.dataset.theme,value);savedTheme[input.dataset.theme]=value;if(input.dataset.theme==='--motion')motionScaleCache=null;if(input.dataset.theme==='--glass')syncGlassBlur(value);localStorage.setItem('vanta.theme',JSON.stringify(savedTheme));
});
savedTheme.pieceStyle=applyPieceStyle(migratePieceStyle(savedTheme));
localStorage.setItem('vanta.theme',JSON.stringify(savedTheme));
$('#expressionsSetting').value=expressionSetting;
$('#expressionsSetting').onchange=e=>{expressionSetting=e.target.value;savedTheme.expressions=expressionSetting;localStorage.setItem('vanta.theme',JSON.stringify(savedTheme));if(boardDom)boardDom.moodKey='';render()};
// A new piece set shows once its images are in (two seconds at most): the board keeps its pieces
// meanwhile instead of standing empty while a phone or tablet downloads them (owner, 2026-10-17).
$('#pieceStyle').onchange=e=>{
  const want=e.target.value;
  void Promise.race([preloadImages(pieceStyleImages(normalizePieceStyle(want))),new Promise(done=>setTimeout(done,2000))]).then(()=>{
    if(e.target.value!==want)return; // chosen again meanwhile: that one wins
    savedTheme.pieceStyle=applyPieceStyle(e.target.value);localStorage.setItem('vanta.theme',JSON.stringify(savedTheme));
  });
};
$('#whitePiece').value=savedTheme.whitePiece||'#f0d9a4';$('#blackPiece').value=savedTheme.blackPiece||'#342019';$('#pieceTint').value=Math.round(savedTheme.spriteTint*100);$('#whitePiece').oninput=e=>{savedTheme.whitePiece=e.target.value;document.documentElement.style.setProperty('--white-piece',e.target.value);localStorage.setItem('vanta.theme',JSON.stringify(savedTheme))};$('#blackPiece').oninput=e=>{savedTheme.blackPiece=e.target.value;document.documentElement.style.setProperty('--black-piece',e.target.value);localStorage.setItem('vanta.theme',JSON.stringify(savedTheme))};$('#pieceTint').oninput=e=>{savedTheme.spriteTint=clamp(Number(e.target.value)/100,0,.7,0);document.documentElement.style.setProperty('--piece-tint',String(savedTheme.spriteTint));localStorage.setItem('vanta.theme',JSON.stringify(savedTheme))};$('#wallpaper').onchange=e=>{document.body.dataset.wallpaper=e.target.value;queueAtmosphere();savedTheme.wallpaper=e.target.value;localStorage.setItem('vanta.theme',JSON.stringify(savedTheme))};
$('#closeTheme').onclick=()=>menus.close('theme');
$('#openRelics').onclick=()=>{menus.close('theme');setPrimaryScreen('game');renderRelics();showSidePanel()};
// Theme Studio: the piece sounds (a set, your relic set's, or the classic synthesized ones), the
// interface sounds on or off, and the Sound test.
$('#pieceSoundSetting').value=sfxPrefs().pieces;
$('#pieceSoundSetting').onchange=e=>{setSfxPref('pieces',e.target.value);const set=pieceSoundSet();if(set!=='classic')void soundBankNow().warm(set,['knight']).then(()=>soundBankNow().play(set,'knight',{volume:.6}))};
$('#uiSoundSetting').checked=sfxPrefs().ui;
$('#uiSoundSetting').onchange=e=>setSfxPref('ui',e.target.checked);
$('#openSoundTest').onclick=()=>{menus.close('theme');setPrimaryScreen('game');renderSoundTest();showSidePanel()};
$('#openMusicList').onclick=()=>{menus.close('theme');setPrimaryScreen('game');renderMusicList();showSidePanel()};
$('#worldSetting').value=worldGet();
$('#worldSetting').onchange=e=>{const w=e.target.value;try{if(w)localStorage.setItem(WORLD_KEY,w);else localStorage.removeItem(WORLD_KEY)}catch{}
  // A world is its music: choosing one with the music off turns it on, following the game.
  if(w&&!musicPrefsGet().on)setMusicOn(true,'on');
  // Heard at once in the menus: the world's own theme (the music otherwise changes when a piece ends).
  const theme=w&&vantaScore?.playing&&musicPlace()==='lobby'&&musicPrefsGet().station==='on'&&(musicLibrary||[]).find(t=>t.theme===w&&t.place==='lobby');
  queueAtmosphere();if(theme){vantaScore.setKey(w);vantaScore.playNow(theme.id)}};
$('#nowPlayingSetting').value=nowCorner();
$('#nowPlayingSetting').onchange=e=>{try{localStorage.setItem(NOW_KEY,e.target.value)}catch{}syncNowPlaying()};
// The music list (owner, 2026-10-13): every track by station, to play now, like, or put away.
const MUSIC_GROUPS=['cinematic','worlds','focus','opera','electric','songs'];
function renderMusicList(){
  setDynamicView('music','Music list','');drawMusicList();
  if(!musicLibrary)void loadLibrary().then(tracks=>{musicLibrary=tracks;vantaScore?.setTracks(musicTracks());drawMusicList()});
  void loadMySongs();
}
// My music in the list: add songs (or drop them here), and each song to play, rename, like or remove.
function myMusicHtml(likes,now){
  if(!MY_MUSIC_WORKS)return `<section class="my-music"><h4>My music</h4><p class="trainer-intro">This browser can't play your own songs here</p></section>`;
  const songs=mySongs||[],mb=songs.reduce((sum,x)=>sum+(x.size||0),0)/1048576;
  const use=songs.length?`${songs.length} ${songs.length===1?'song':'songs'} · ${mb<10?mb.toFixed(1):Math.round(mb)} MB on this device`:'No songs yet';
  const row=t=>{const liked=likes.liked.includes(t.id);
    return `<li class="music-row mine${t.id===now?' playing':''}" data-track="${escapeHtml(t.id)}"><button type="button" data-music-play>${t.id===now?'On now':'Listen'}</button><span class="mr-title" data-no-i18n>${escapeHtml(t.title)}</span><button type="button" data-my-rename>Rename</button><button type="button" data-music-like aria-pressed="${liked}">${liked?'Liked':'Like'}</button><button type="button" data-my-remove>Remove</button></li>`};
  return `<section class="my-music" data-my-music><h4>My music</h4>
    <p class="trainer-intro">Songs you add stay on this device: nothing is uploaded. They play on the My music station and in Everything.</p>
    <p class="music-liked"><button type="button" data-my-add>Add songs</button><input type="file" data-my-file accept="${MY_MUSIC_ACCEPT}" multiple hidden><span class="my-music-use">${use}</span>${songs.length?'<button type="button" data-my-station>Play My music</button>':''}</p>
    ${myMusicNotes.length?`<ul class="my-music-notes">${myMusicNotes.map(n=>`<li>${escapeHtml(n)}</li>`).join('')}</ul>`:''}
    ${songs.length?`<ul>${songs.map(row).join('')}</ul>`:''}</section>`;
}
function drawMusicList(){
  const target=$('#dynamicView .view-content');if(!target||currentRightView!=='music')return;
  const likes=musicLikesGet(),np=vantaScore?.nowPlaying,now=np?.of||np?.id,mine=myMusicHtml(likes,now);
  if(!musicLibrary){target.innerHTML=`<article class="music-list" data-quiet>${mine}<p class="trainer-intro">The music library is on its way</p></article>`;wireMusicList(target);return}
  const music=musicLibrary.filter(t=>!isSting(t)&&!t.of);
  const row=t=>{const liked=likes.liked.includes(t.id),hidden=likes.hidden.includes(t.id),lang=t.lang&&t.lang!=='en'?`<small>${escapeHtml(LANGUAGES[t.lang]||t.lang.toUpperCase())}</small>`:'';
    return `<li class="music-row${t.id===now?' playing':''}${hidden?' put-away':''}" data-track="${escapeHtml(t.id)}"><button type="button" data-music-play>${t.id===now?'On now':'Listen'}</button><span class="mr-title">${escapeHtml(t.title)} ${lang}</span><button type="button" data-music-like aria-pressed="${liked}">${liked?'Liked':'Like'}</button><button type="button" data-music-hide aria-pressed="${hidden}">${hidden?'Hidden':'Not for me'}</button></li>`};
  const groups=MUSIC_GROUPS.map(id=>[id,music.filter(t=>t.station===id)]).filter(([,list])=>list.length);
  target.innerHTML=`<article class="music-list" data-quiet><p class="trainer-intro">Like the music you love: it comes round more often. Not for me: it won't play for you. Listen: hear it now.</p>
    <p class="music-liked">${likes.liked.length?`Liked · ${likes.liked.length} <button type="button" data-music-station>Play the Liked station</button>`:'Nothing liked yet'}</p>
    ${mine}
    ${groups.map(([id,list])=>`<h4>${escapeHtml(STATIONS.find(x=>x.id===id)?.name||id)}</h4><ul>${list.map(row).join('')}</ul>`).join('')}</article>`;
  wireMusicList(target);
}
function wireMusicList(target){
  target.querySelectorAll('[data-music-play]').forEach(b=>b.onclick=()=>playFromList(b.closest('[data-track]').dataset.track));
  target.querySelectorAll('[data-music-like]').forEach(b=>b.onclick=()=>{const id=b.closest('[data-track]').dataset.track,on=b.getAttribute('aria-pressed')!=='true';setMusicLikes(likeTrack(musicLikesGet(),id,on));playUiSound(on?'toggle-on':'toggle-off')});
  target.querySelectorAll('[data-music-hide]').forEach(b=>b.onclick=()=>{const id=b.closest('[data-track]').dataset.track,on=b.getAttribute('aria-pressed')!=='true';setMusicLikes(hideTrack(musicLikesGet(),id,on));playUiSound(on?'toggle-off':'toggle-on')});
  target.querySelector('[data-music-station]')?.addEventListener('click',()=>{setMusicOn(true,'liked');queueAtmosphere();setTimeout(drawMusicList,60)});
  // My music
  const box=target.querySelector('[data-my-music]'),file=target.querySelector('[data-my-file]');
  if(!box)return;
  target.querySelector('[data-my-add]')?.addEventListener('click',()=>file?.click());
  file?.addEventListener('change',()=>{const files=[...(file.files||[])];file.value='';void addMyMusic(files)});
  box.addEventListener('dragover',e=>{if([...(e.dataTransfer?.types||[])].includes('Files')){e.preventDefault();box.classList.add('dropping')}});
  box.addEventListener('dragleave',e=>{if(!box.contains(e.relatedTarget))box.classList.remove('dropping')});
  box.addEventListener('drop',e=>{e.preventDefault();box.classList.remove('dropping');void addMyMusic([...(e.dataTransfer?.files||[])])});
  target.querySelector('[data-my-station]')?.addEventListener('click',()=>{setMusicOn(true,'mine');queueAtmosphere();setTimeout(drawMusicList,60)});
  box.querySelectorAll('[data-my-rename]').forEach(b=>b.onclick=()=>renameMySong(b.closest('[data-track]')));
  box.querySelectorAll('[data-my-remove]').forEach(b=>b.onclick=()=>void removeMySong(b.closest('[data-track]').dataset.track));
}
// Adds song files from your device (measured first; anything that cannot be added is listed).
async function addMyMusic(files){
  if(!files.length||!MY_MUSIC_WORKS)return;
  toast(files.length===1?'Adding 1 song':`Adding ${files.length} songs`,{sound:false,duration:60000});
  let added=[],skipped=[];
  try{({added,skipped}=await addSongs(files,{have:(await loadMySongs()).length}))}
  catch{skipped=files.map(f=>({name:String(f?.name||''),why:'store'}))}
  if(added.length)try{await navigator.storage?.persist?.()}catch{} // so the browser keeps them when space runs low
  const why=({name,why})=>why==='type'?`${name}: not a song file`:why==='size'?`${name} is over ${MAX_SONG_MB} MB`:why==='full'?`My music is full (${MAX_SONGS} songs)`:why==='space'?'Not enough space on this device':why==='store'?`${name}: couldn't be saved on this device`:`${name}: this browser can't play it`;
  myMusicNotes=[...new Set(skipped.map(why))];
  await loadMySongs(true);
  const said=[added.length?(added.length===1?'Added 1 song':`Added ${added.length} songs`):'',...myMusicNotes.slice(0,1)].filter(Boolean).join(' · ');
  if(added.length&&!myMusicOn)toast('Saved. Reload the page to play your songs',{sound:false,duration:4000});
  else toast(said,{sound:added.length?'success':'error',duration:3200});
}
function renameMySong(li){
  const id=li?.dataset.track,span=li?.querySelector('.mr-title'),song=(mySongs||[]).find(x=>x.id===id);if(!span||!song)return;
  const input=document.createElement('input');input.type='text';input.className='mr-rename';input.maxLength=80;input.value=song.title;input.setAttribute('aria-label','Song title');
  span.replaceWith(input);input.focus();input.select();
  let done=false;
  const finish=async save=>{if(done)return;done=true;const title=input.value.trim();
    if(save&&title&&title!==song.title){await renameSong(id,title).catch(()=>null);await loadMySongs(true)}else drawMusicList()};
  input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();void finish(true)}else if(e.key==='Escape'){e.preventDefault();void finish(false)}};
  input.onblur=()=>void finish(true);
}
async function removeMySong(id){
  const song=await removeSong(id).catch(()=>null);if(!song)return;
  const likes=musicLikesGet();if(likes.liked.includes(id))setMusicLikes(likeTrack(likes,id,false));
  await loadMySongs(true);playUiSound('toggle-off');
  toast('Removed',{sound:false,duration:5000,actionLabel:'Undo',onAction:async()=>{await putSong(song).catch(()=>{});await loadMySongs(true)}});
}
// Plays a track from the list now (turning the music on if it was off).
function playFromList(id){
  if($('#sound')?.dataset.off)return toast('Sound off',{sound:false});
  const score=ensureScore();if(!score)return toast('The music library is on its way',{sound:false});
  if(!musicPrefsGet().on){musicPrefs=saveMusic({...musicPrefsGet(),on:true});syncMusicUi()}
  score.setVolume(musicPrefsGet().volume);score.playNow(id);syncNowPlaying();setTimeout(drawMusicList,50);
}
// The Sound test (owner, 2026-10-13): every sound in VCH, to hear and to judge. The interface,
// each piece set, and the stings over the music.
const SOUND_LABEL={tap:'Tap',page:'Page',back:'Back',open:'Open',close:'Close','toggle-on':'Switch on','toggle-off':'Switch off',notify:'Message',error:'Error',success:'Success',match:'Match found',warning:'Warning',start:'Game start',win:'Win',lose:'Loss',draw:'Draw',tick:'Clock tick',pawn:'Pawn',knight:'Knight',bishop:'Bishop',rook:'Rook',queen:'Queen',king:'King',capture:'Capture',castle:'Castle',promote:'Promotion',check:'Check',mate:'Checkmate',illegal:'Illegal move'};
const STING_LABEL={win:'Victory',loss:'Defeat',draw:'Draw',checkmate:'Checkmate',start:'Game start','rank-up':'Up a division','rank-down':'Down a division',relic:'Relic earned',realm:'Realm freed',solved:'Puzzle solved',failed:'Puzzle failed',brilliant:'Brilliant move'};
function renderSoundTest(){setDynamicView('sounds','Sound test','');drawSoundTest()}
function drawSoundTest(){
  const target=$('#dynamicView .view-content');if(!target||currentRightView!=='sounds')return;
  const mine=pieceSoundSet(),set=PIECE_SETS.includes(mine)?mine:'wood',names=pieceSoundNames();
  const grid=(items,attr)=>`<div class="sound-grid">${items.map(([k,l])=>`<button type="button" ${attr}="${k}">${escapeHtml(l)}</button>`).join('')}</div>`;
  target.innerHTML=`<article class="sound-test" data-quiet><p class="trainer-intro">Every sound in VCH. Tap one to hear it.</p>
    <h4>Interface</h4>${grid(UI_SOUNDS.map(k=>[k,SOUND_LABEL[k]||k]),'data-ui-sound')}
    <h4>Pieces</h4><label class="sound-set">Piece sounds <select data-sound-set>${PIECE_SETS.map(id=>`<option value="${id}"${id===set?' selected':''}>${names[id]}</option>`).join('')}</select></label>${grid(PIECE_SOUNDS.map(k=>[k,SOUND_LABEL[k]||k]),'data-piece-sound')}
    <h4>Stings</h4>${grid(STINGS.map(k=>[k,STING_LABEL[k]||k]),'data-sting')}</article>`;
  const pick=()=>target.querySelector('[data-sound-set]')?.value||'wood';
  target.querySelectorAll('[data-ui-sound]').forEach(b=>b.onclick=()=>void auditionSound('ui',b.dataset.uiSound));
  target.querySelectorAll('[data-piece-sound]').forEach(b=>b.onclick=()=>void auditionSound(pick(),b.dataset.pieceSound));
  target.querySelectorAll('[data-sting]').forEach(b=>b.onclick=()=>void auditionSting(b.dataset.sting));
}
async function auditionSound(set,name){
  if($('#sound')?.dataset.off)return toast('Sound off',{sound:false});
  const bank=soundBankNow();await bank.load();await bank.buffer(set,name);
  if(bank.play(set,name,{volume:set==='ui'?.5:.6}))return;
  if(set==='ui')synthUiSound(name);else playMoveSound(audioContext(),{capture:name==='capture',check:name==='check'||name==='mate'});
}
async function auditionSting(kind){
  if($('#sound')?.dataset.off)return toast('Sound off',{sound:false});
  ensureScore();if(!musicLibrary)musicLibrary=await loadLibrary();
  if(vantaScore&&!vantaScore.tracks.some(t=>!t.src))vantaScore.setTracks(musicTracks());
  if(!vantaScore?.sting(kind))toast('The music library is on its way',{sound:false});
}
initRoundTwelve();
// ---- Hover guide (src/hover-guide.js): what each section, tab and mode is, on hover or focus ----
(function hoverGuide(){
  const card=document.createElement('div');card.id='hoverGuide';card.className='hover-guide';card.setAttribute('role','tooltip');card.hidden=true;document.body.append(card);
  let timer=null,shown=null;
  const tr=text=>(uiLang!=='en'&&translateText(text,uiLang))||text;
  function place(el){
    const r=el.getBoundingClientRect(),c=card.getBoundingClientRect(),gap=8;
    let top=r.bottom+gap;if(top+c.height>innerHeight-8)top=r.top-gap-c.height;
    const left=Math.max(8,Math.min(innerWidth-c.width-8,r.left+r.width/2-c.width/2));
    card.style.top=`${Math.max(8,top)}px`;card.style.left=`${left}px`;
  }
  function show(info){
    shown=info.el;
    // The card replaces the browser's own tooltip while it shows.
    if(shown.hasAttribute('title')){shown.dataset.guideTitle=shown.getAttribute('title');shown.removeAttribute('title')}
    card.replaceChildren();const b=document.createElement('b'),span=document.createElement('span');b.textContent=tr(info.title);span.textContent=tr(info.text);card.append(b,span);
    card.hidden=false;place(shown);shown.setAttribute('aria-describedby','hoverGuide');
  }
  function hide(){
    clearTimeout(timer);timer=null;card.hidden=true;
    if(shown){shown.removeAttribute('aria-describedby');if(shown.dataset.guideTitle!=null){shown.setAttribute('title',shown.dataset.guideTitle);delete shown.dataset.guideTitle}}
    shown=null;
  }
  document.addEventListener('pointerover',event=>{
    if(event.pointerType!=='mouse')return;
    const info=guideFor(event.target);
    if(info&&info.el===shown)return;
    hide();if(info)timer=setTimeout(()=>{timer=null;if(info.el.isConnected)show(info)},350);
  });
  document.addEventListener('pointerout',event=>{if(event.pointerType==='mouse'&&!event.relatedTarget)hide()});
  // A pointer that comes to rest over an element without a fresh pointerover (the page scrolled
  // under it, say) still gets its card.
  document.addEventListener('pointermove',event=>{
    if(event.pointerType!=='mouse'||shown||timer)return;
    const info=guideFor(event.target);if(info)timer=setTimeout(()=>{timer=null;if(info.el.isConnected)show(info)},350);
  },{passive:true});
  document.addEventListener('focusin',event=>{let info=null;try{if(event.target.matches(':focus-visible'))info=guideFor(event.target)}catch{}hide();if(info)show(info)});
  document.addEventListener('focusout',hide);
  // A click hides it; scrolling or resizing hides a card that is showing (it would be out of
  // place) but lets one that is about to show come up where it belongs.
  window.addEventListener('pointerdown',hide,{capture:true,passive:true});
  for(const type of ['scroll','resize'])window.addEventListener(type,()=>{if(shown)hide()},{capture:true,passive:true});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')hide()});
})();
// ---- Resonance (src/resonance.js): Chladni figures in sand behind the page, drawn by the music ----
// A background (owner request 2026-10-13: never on the board, never in the way) that answers the
// game, the pointer and the music (owner, 2026-10-13: "make it come to life... more responsive and
// reactive"). It shows the figure of the theme you play under, gathering out of scattered sand.
// Every move sends a ring of light out from the square the piece lands on (a capture a stronger
// ring and its echo; a check makes the plate shiver and rings from the king; in Vanta Dark and
// Blackout the opponent's moves ring from the middle of the board and say nothing else). Captures
// re-tune the plate to a new figure; the end of a game brings an intricate figure and more light
// for a win, a simple one and less for a loss; time trouble shivers it. The pointer parts the sand
// where it shows, a tap rings it, and a slow swell crosses it now and then. While the music plays,
// the sand trembles with every note and swells with the bass, and drifts to a new figure every
// other chord (finer as the game gets tenser). With reduced motion it never moves.
const RESONANCE_KEY='vch.resonance';
const prefersStill=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const resonanceThemeMode=key=>modeForMoment(chordFor(key,0),0);
let resonanceBeat={step:-1,at:0,key:'',glow:''};
let resonanceGame={key:null,timer:0,echo:0,mood:'calm',strength:0,captures:0,retunedAt:0,endAt:0,glow:1,shiverAt:0,rings:0};
function syncResonance(){
  let layer=document.getElementById('resonanceBg');
  if(resonanceLevel==='off'){resonance?.stop();resonance=null;layer?.remove();return}
  if(!layer){layer=document.createElement('div');layer.id='resonanceBg';layer.setAttribute('aria-hidden','true');layer.innerHTML='<canvas class="resonance-glow"></canvas><canvas class="resonance-sand"></canvas>';document.body.prepend(layer)}
  const canvas=layer.querySelector('.resonance-sand'),still=prefersStill();
  if(resonance?.canvas!==canvas){
    resonance?.stop();
    // Phones and tablets (owner, 2026-10-17: "laggy"): half the grains, at one pixel per CSS px,
    // a little slower, and no glow layer (its blur was a fifth of the work on an iPad).
    const light=matchMedia('(pointer: coarse)').matches;
    resonance=new SandBackdrop(canvas,{glow:light?null:layer.querySelector('.resonance-glow'),density:light?120:60,fps:light?24:30,maxDpr:light?1:2,spread:matchMedia('(max-width: 800px)').matches?2.2:3,motion:!still,onReady:()=>{layer.dataset.ready='1'}});
    resonance.listen(()=>vantaScore?.playing?vantaScore.readSpectrum():null); // the room's score too
    resonanceBeat={step:-1,at:0,key:'',glow:''};
  }
  resonance.setMotion(!still);
  if(!resonance.mode){resonanceBeat.key=musicKeyNow();resonance.show(resonanceThemeMode(resonanceBeat.key),{flow:!still})}
}
// Where on the window a square of the board is (its middle), or the board's middle, and how far
// it is to the board's nearest edge (`under`: a ring that wide is still hidden by the board).
function resonancePoint(sq){
  const board=document.getElementById('board')?.getBoundingClientRect(),el=sq?document.querySelector(`#board .square[data-sq="${sq}"]`):null,r=el?.getBoundingClientRect()||board;
  if(!r?.width)return sq?null:{x:innerWidth/2,y:innerHeight/2,under:0}; // no board on screen: the middle of the window
  const x=r.left+r.width/2,y=r.top+r.height/2,under=board?.width?Math.max(0,Math.min(x-board.left,board.right-x,y-board.top,board.bottom-y)-30):0;
  return {x,y,under};
}
// The game's answers, from the living-atmosphere pass (syncAtmosphere): each new move, the mood.
function syncResonanceGame(mood){
  const g=resonanceGame;
  if(mood.mood!==g.mood){
    const was=g.mood;g.mood=mood.mood;
    if(resonance&&(mood.mood==='dawn'||mood.mood==='dusk'))resonanceEnding(mood.mood==='dawn');
    else if(was==='dawn'||was==='dusk')resonanceAfterEnding();
  }
  g.strength=mood.strength;
  const move=boardLastMove(),key=move?.to?`${move.from||''}${move.to}${move.san||''}:${moveRecords().length}`:'';
  if(key===g.key)return;
  const first=g.key===null;g.key=key;
  if(!key){if(g.captures){g.captures=0;resonanceBeat.key=''}return} // a new game: the theme's figure comes back
  if(first||!resonance)return;
  // Still while the piece travels; the ring goes out as it lands.
  const travel=Math.max(0,boardMotionUntil-performance.now());
  resonance.pause(travel+40);clearTimeout(g.timer);clearTimeout(g.echo);
  if(!resonance.motion)return;
  // In the dark the opponent's moves (and any move you step back to) ring from the middle of the board.
  const color=premovePlayerColor(),mine=!color||game.turn()!==color,hidden=(darkActive()||fogOnline()||blackoutActive())&&(!mine||!!browse||reviewState.viewing);
  const san=String(move.san||''),captured=!hidden&&(!!move.captured||san.includes('x')),check=!hidden&&/[+#]/.test(san),mate=!hidden&&san.includes('#');
  g.timer=setTimeout(()=>{
    const b=resonance,layer=b?.canvas.parentElement,at=resonancePoint(hidden?null:move.to);if(!b||!at)return;
    if(hidden)b.ripple(at.x,at.y,{amp:7,light:.8,speed:520,from:at.under});
    else if(captured){b.ripple(at.x,at.y,{amp:15,light:1.7,speed:620,width:30,from:at.under});g.echo=setTimeout(()=>{if(resonance===b)b.ripple(at.x,at.y,{amp:8,light:1,speed:480,from:at.under})},240)}
    else b.ripple(at.x,at.y,{amp:9,light:1.05,speed:560,from:at.under});
    if(check){const king=document.querySelector('#board .square.check'),k=king?resonancePoint(king.dataset.sq):null;b.tremble(mate?3.4:2.4,mate?1500:850);if(k)b.ripple(k.x,k.y,{amp:12,light:1.5,speed:760,width:22,from:k.under})}
    if(captured){g.captures++;resonanceRetune()}
    g.rings++;if(layer){layer.dataset.react=hidden?'hidden':mate?'mate':check?'check':captured?'capture':'move';layer.dataset.rings=String(g.rings)}
  },travel+20);
}
// A capture re-tunes the plate (at most once in six seconds, and only while the music is off;
// with music the chords choose the figures): finer as the game goes on.
function resonanceRetune(){
  if(!resonance||vantaScore?.playing||resonanceGame.endAt)return;
  const now=Date.now();if(now-resonanceGame.retunedAt<6000)return;resonanceGame.retunedAt=now;
  resonance.show(modeForMoment(chordFor(musicKeyNow(),resonanceGame.captures),tensionFor({plies:moveRecords().length})));
}
// The end of a game: a richer figure and more light for a win, a simpler one and less for a loss;
// after fifteen seconds (or the next game) the theme's own figure comes back.
function resonanceEnding(won){
  const g=resonanceGame,base=MODES.indexOf(resonanceThemeMode(musicKeyNow()));
  g.endAt=Date.now();g.glow=won?1.3:.72;
  if(!resonance?.motion)return;
  resonance.show(MODES[Math.max(0,Math.min(MODES.length-1,base+(won?14:-12)))]);
  const at=resonancePoint(null);if(at)resonance.ripple(at.x,at.y,{amp:won?14:8,light:won?1.8:.7,speed:won?460:340,width:won?40:60,life:3600,from:at.under});
}
function resonanceAfterEnding(){const g=resonanceGame;if(!g.endAt)return;g.endAt=0;g.glow=1;resonanceBeat.key=''} // the loop below brings back the theme's figure
// The music drives both: the room's big plate follows every chord live; the background takes
// every other chord (at most one figure per nine seconds), hears every note, and rests on the
// theme's figure when the music stops. The same beat keeps the game's slow answers going.
(function resonanceMusicLoop(){
  let ticks=0;
  setInterval(()=>{
    ticks++;
    const playing=!!vantaScore?.playing;
    if(resonanceRoom&&playing){const mode=modeForChord(vantaScore.chord),energy=spectrumEnergy(vantaScore.readSpectrum());resonanceRoom.plate.setMode(mode);resonanceRoom.plate.setTarget(0.25+energy*0.75);resonanceRoom.show?.(mode,energy)}
    if(!resonance)return;
    const still=prefersStill(),beat=resonanceBeat,g=resonanceGame,layer=resonance.canvas.parentElement,now=Date.now();
    const glow=v=>{if(v!==beat.glow){beat.glow=v;layer?.style.setProperty('--resonance-glow',v)}};
    resonance.setMotion(!still);
    if(g.endAt&&now-g.endAt>15000)resonanceAfterEnding();
    // Time trouble: the plate shivers every couple of seconds, harder as the clock runs out (with
    // the music, on its heartbeat instead: below).
    if(!still&&!playing&&g.mood==='storm'&&now-g.shiverAt>2400){g.shiverAt=now;resonance.tremble(.8+1.6*g.strength,520)}
    if(layer){const active=resonance.busy||resonance.lively()||resonance.dirty;if(active!==(layer.dataset.active==='1')){if(active)layer.dataset.active='1';else delete layer.dataset.active}}
    if(playing&&!still){
      resonance.wake();
      // Every chord rings the plate from the board, slow and wide; every other one (at most one
      // in nine seconds) moves the sand to a new figure. The storm's heartbeat shakes it.
      const step=Math.floor(Math.max(0,vantaScore.eighth-1)/16),e=vantaScore.eighth;
      if(step!==beat.step){
        beat.step=step;
        const at=resonancePoint(null);if(at)resonance.ripple(at.x,at.y,{amp:5,light:.75,speed:300,width:70,from:at.under,life:4200,slow:true});
        if(now-beat.at>=9000&&!g.endAt){beat.at=now;resonance.show(modeForMoment(vantaScore.chord,vantaScore.tension))}
      }
      if(vantaScore.storm>0&&e!==beat.eighth&&e%4===1){resonance.tremble(1+1.6*vantaScore.storm,320)}
      beat.eighth=e;
      glow((g.glow*(0.8+0.4*spectrumEnergy(vantaScore.readSpectrum()))).toFixed(2));
      return;
    }
    glow(String(g.glow));
    if(ticks%8||g.endAt)return;
    const key=musicKeyNow();
    if(key!==beat.key||beat.step!==-1){beat.key=key;beat.step=-1;beat.at=0;resonance.show(resonanceThemeMode(key),{flow:!still})}
  },120);
})();
function setResonanceLevel(level){
  resonanceLevel=level==='off'?'off':'on';
  try{localStorage.setItem(RESONANCE_KEY,resonanceLevel)}catch{}
  const select=$('#resonanceSetting');if(select)select.value=resonanceLevel;
  syncResonance();
}
// The Resonance room: the music library seen as sand. Pick a theme, play its score, push the
// tension and the storm, and watch the figures change.
const RESONANCE_THEMES=[['vanta','Vanta','D minor'],['ember','Ember','E phrygian'],['umbra','Umbra','C minor, low'],['gilded','Gilded','F lydian'],['mirror','Mirror','A dorian'],['obsidian','Obsidian','B minor'],['rivalry','Rivalry','G harmonic minor']];
function renderResonanceRoom(){
  setDynamicView('resonance','Resonance',`<article class="resonance-room">
    <p class="trainer-intro">Sand on a ringing plate gathers where the plate stays still and draws the figures Ernst Chladni found in 1787. A chessboard is a square plate: here every VCH theme draws its own, live, from its music. Nothing is a picture; each figure is computed as you listen.</p>
    <div class="resonance-stage"><canvas class="resonance-big" aria-label="Chladni figure drawn by the music" role="img"></canvas><div class="resonance-readout" aria-live="polite"><b>—</b><span>Press play</span></div></div>
    <div class="resonance-themes" role="group" aria-label="Themes">${RESONANCE_THEMES.map(([id,name,scale])=>`<button type="button" data-resonance-theme="${id}"><b>${name}</b><small>${scale}</small></button>`).join('')}</div>
    <div class="resonance-controls"><button type="button" class="gold resonance-play">Play</button><label>Tension <input type="range" class="resonance-tension" min="0" max="100" value="35"></label><label>Storm <input type="range" class="resonance-storm" min="0" max="100" value="0"></label></div>
    <p class="computer-note">Turn on the Resonance background in the Theme Studio to keep the music's figures behind your games, dim and slow.</p>
  </article>`);
  const root=$('#dynamicView .resonance-room');if(!root)return;
  const canvas=root.querySelector('.resonance-big'),plate=new ResonancePlate(canvas,{count:matchMedia('(max-width: 800px)').matches?7000:14000,color:'#f1e6c9',size:1.2});
  plate.ctx.globalCompositeOperation='lighter';plate.setMode(MODES[18]);
  let theme='vanta';
  const room={plate,playing:false,show(mode,energy){const r=root.querySelector('.resonance-readout');if(r){r.querySelector('b').textContent=`Mode ${mode.n}·${mode.m}`;r.querySelector('span').textContent=`${Math.round(energy*100)}% · ${RESONANCE_THEMES.find(t=>t[0]===theme)[1]}`}}};
  resonanceRoom=room;
  const pick=id=>{theme=id;root.querySelectorAll('[data-resonance-theme]').forEach(b=>b.classList.toggle('on',b.dataset.resonanceTheme===id));if(vantaScore)vantaScore.setKey(id)};
  root.querySelectorAll('[data-resonance-theme]').forEach(b=>b.onclick=()=>pick(b.dataset.resonanceTheme));pick(theme);
  const play=root.querySelector('.resonance-play');
  play.onclick=async()=>{
    if(room.playing){room.playing=false;vantaScore?.stop();play.textContent='Play';return}
    const score=await scoreReady();if(!canvas.isConnected||room.playing)return; // left the room, or a second tap, while the library came
    if(!score)return toast('The music library is on its way');
    // The library's game music for the theme: Tension and Storm choose its part, as in a game.
    score.setVolume(musicPrefsGet().volume||0.5);score.setKey(theme);score.setPlace('game',true);score.setTension(Number(root.querySelector('.resonance-tension').value)/100);score.setStorm(Number(root.querySelector('.resonance-storm').value)/100);
    room.playing=score.start();play.textContent=room.playing?'Stop':'Play';
  };
  root.querySelector('.resonance-tension').oninput=e=>vantaScore?.setTension(Number(e.target.value)/100);
  root.querySelector('.resonance-storm').oninput=e=>vantaScore?.setStorm(Number(e.target.value)/100);
  if(prefersStill()){plate.resize();plate.settle(200)}else plate.start();
  // Leaving the room stops its score and its sand.
  const watch=new MutationObserver(()=>{if(!canvas.isConnected){watch.disconnect();plate.stop();if(room.playing)vantaScore?.stop();if(resonanceRoom===room)resonanceRoom=null}});
  watch.observe($('#dynamicView'),{childList:true});
}
(function initResonance(){
  let saved=null;try{saved=localStorage.getItem(RESONANCE_KEY)}catch{}
  resonanceLevel=['on','subtle','vivid'].includes(saved)?'on':'off'; // subtle and vivid: the board layer of an earlier build
  const select=$('#resonanceSetting');if(select){select.value=resonanceLevel;select.onchange=e=>setResonanceLevel(e.target.value)}
  $('#openResonance')?.addEventListener('click',()=>{menus.close('theme');setPrimaryScreen('game');renderResonanceRoom();showSidePanel()});
  let resizeTimer=0;window.addEventListener('resize',()=>{if(!resonance)return;clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>resonance?.layout(),180)},{passive:true});
  // The pointer parts the sand and a tap rings it, wherever the sand shows: around the panels,
  // and through them when the glass is clear. Never over the board, a dialog or a menu.
  const hidesSand=t=>!!t?.closest?.('.board,#board,dialog,.main-menu')||(document.documentElement.dataset.glass!=='clear'&&!!t?.closest?.('.panel,.game,.topbar,.rpanel'));
  addEventListener('pointermove',e=>{
    if(!resonance?.motion||(e.pointerType==='mouse'&&e.buttons))return;
    if(hidesSand(e.target)){resonance.lift();return}
    resonance.touch(e.clientX,e.clientY,e.pointerType==='mouse'?34:44);
  },{passive:true});
  addEventListener('pointerdown',e=>{
    if(!resonance?.motion||hidesSand(e.target)||e.target?.closest?.('button,a,input,select,textarea,label,summary,[role="button"],[contenteditable]'))return;
    resonance.ripple(e.clientX,e.clientY,{amp:6,light:.85,speed:520,width:22});
  },{passive:true});
  for(const type of ['pointerup','pointercancel'])addEventListener(type,e=>{if(e.pointerType!=='mouse')resonance?.lift()},{passive:true});
  addEventListener('mouseout',e=>{if(!e.relatedTarget)resonance?.lift()},{passive:true});
  if(resonanceLevel==='on')syncResonance();
})();
// The first appearance (src/boot-reveal.js; owner, 2026-10-17: the menu "does not land
// naturally"): index.html's veil covers the page until it is built, the saved theme applied and
// the pictures on screen decoded (the wallpaper, the piece set, the hero art), then the page
// rises into place once. The installed app's splash is up already, so it reveals at once.
function firstPaintImages(){
  const onScreen=img=>{const r=img.getBoundingClientRect();return r.width>0&&r.height>0&&r.bottom>0&&r.right>0&&r.top<innerHeight&&r.left<innerWidth};
  return [...backgroundUrls(getComputedStyle(document.body).backgroundImage),...pieceStyleImages(document.documentElement.dataset.pieceStyle||'vanta'),...[...document.images].filter(onScreen).map(img=>img.currentSrc||img.src)];
}
void revealApp({urls:firstPaintImages(),immediate:!!splash});
