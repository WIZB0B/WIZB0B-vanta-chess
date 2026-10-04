import './style.css';
import { Chess } from 'chess.js';
import { VchApi, stableGuestToken } from './vch-api.js';
import { initialClocks, normalizeRoomId } from './game-config.js';
import { createClockSnapshot, projectedClocks, seatFromEnvelope } from './server-state.js';

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const params=new URLSearchParams(location.search), generatedRoom=Math.random().toString(36).slice(2,10).toUpperCase();
let room=normalizeRoomId(params.get('game'),generatedRoom);
const playerToken=stableGuestToken();
const api=new VchApi({token:playerToken});
const guestName=`Guest-${playerToken.slice(-4).toUpperCase()}`;
const game=new Chess(); let selected=null, lastMove=null, flipped=false, mode='room', myColor=null, ticking, enginePending, serverGameId=null, serverVersion=0, pollTimer, clockSnapshot=null, serverGame=null, botThinking=false, puzzleSession=null;
const stockfish=new Worker('/stockfish.worker.js');
stockfish.onmessage=({data})=>{if(data.type==='uci'){const line=String(data.line||'');const cp=line.match(/score cp (-?\d+)/),mate=line.match(/score mate (-?\d+)/),pv=line.match(/\spv\s(.+)$/);if((cp||mate)&&$('#score')){const value=mate?`${Number(mate[1])>0?'+':''}M${mate[1]}`:`${Number(cp[1])>=0?'+':''}${(Number(cp[1])/100).toFixed(1)}`;$('#score').textContent=value;const pct=mate?(Number(mate[1])>0?92:8):Math.max(8,Math.min(92,50+Number(cp[1])/12));const bar=$('.analysis .meter i');if(bar)bar.style.width=`${pct}%`}if(pv&&$('#line'))$('#line').textContent=pv[1].split(' ').slice(0,10).join(' ');if(line.startsWith('bestmove ')){const u=line.split(' ')[1];enginePending?.(u);enginePending=null}}else if(data.type==='unavailable'){if($('#score'))$('#score').textContent='—';if($('#line'))$('#line').textContent='Engine unavailable.';if(enginePending){enginePending(null);enginePending=null}}};
const pieceFile={k:'K',q:'Q',r:'R',b:'B',n:'N',p:'P'};
const pieceBase='https://ubjldcfiwrwiouwgmduo.supabase.co/functions/v1/vanta-web/assets/pieces';
const pieceUrl=p=>`${pieceBase}/${p.color}${pieceFile[p.type]}.webp`;
const app=$('#app');
app.innerHTML=`
<div class="shell"><header><a class="brand"><span class="mark">V</span><b>VANTA<br>CHESS</b></a><nav><button class="active">♞ <span>Play</span></button><button>♛ <span>Arena</span></button><button>♟ <span>Puzzles</span></button><button>▤ <span>Learn</span></button><button>♜ <span>Openings</span></button></nav><div class="user"><i></i><span>Guest-${room.slice(-4)}</span><small>1200 rating</small></div></header>
<main><aside class="lpanel panel">
  <div class="hero">
    <div class="hero-knight" aria-hidden="true"></div>
    <div class="hero-shade" aria-hidden="true"></div>
    <div class="hero-copy">
      <label class="live-label"><i></i> LIVE CHESS</label>
      <h1>Play your<br>next game.</h1>
      <p>Guest play is instant. Rated games save your Elo and tournament record.</p>
    </div>
  </div>
  <div class="modes" role="tablist" aria-label="Play mode">
    <button type="button" data-mode="match" role="tab" aria-selected="false"><span class="mode-icon">⚡</span><b>Match</b></button>
    <button type="button" data-mode="room" class="on" role="tab" aria-selected="true"><span class="mode-icon">♟</span><b>Room</b></button>
    <button type="button" data-mode="computer" role="tab" aria-selected="false"><span class="mode-icon">▣</span><b>Computer</b></button>
  </div>
  <div class="private-card">
    <span class="private-card-icon">⌁</span>
    <span class="private-card-copy"><b>Create a private room</b><small>Generate a shareable game link instantly.</small></span>
    <span class="private-card-arrow">›</span>
  </div>
  <label class="tiny">GAME SETTINGS</label>
  <div class="settings">
    <label class="field"><span>Time control</span><select id="time"><option value="600">10+0 Rapid</option><option value="300">5+0 Blitz</option><option value="180">3+0 Blitz</option></select></label>
    <label class="field"><span>Room type</span><select id="roomType"><option value="false">Casual · Guest OK</option><option value="true">Rated · Account</option></select></label>
  </div>
  <select id="level" class="engine-level-hidden" tabindex="-1" aria-hidden="true"><option value="1200">1200</option><option value="1600">1600</option><option value="2000">2000</option></select>
  <button class="gold" id="create" type="button"><span>Create room &amp; get link</span><b>＋</b></button>
  <div class="divider"><span>or join an existing room</span></div>
  <div class="join"><input id="roomInput" maxlength="10" autocomplete="off" placeholder="Enter room code"><button id="join" type="button">Join room</button></div>
  <div class="room">
    <div class="room-head"><span><small>ROOM CODE</small><strong id="roomCode">${room}</strong></span><em id="roomBadge"><i></i>Ready</em></div>
    <label for="share">Share this link</label>
    <div class="share-row"><input id="share" readonly value="${location.origin+location.pathname}?game=${room}"><button id="copy" type="button" aria-label="Copy room link">⧉</button></div>
    <small class="room-note">Anyone with this link can join this casual room.</small>
  </div></aside>
<section class="game"><div class="player top"><span class="avatar" aria-hidden="true">GU</span><div class="player-info"><div class="player-name-row"><b>Guest-Opponent</b><span class="flag" role="img" aria-label="Player flag">🏳️</span></div><div class="player-meta"><span class="rating">★ 1200</span><span class="signal"><span class="ping-dot"></span>42 ms</span></div></div><time id="blackClock" class="player-clock" aria-label="Opponent clock">10:00</time></div><div class="board-shell"><div id="rankCoords" class="rank-coords" aria-hidden="true"></div><div id="board" class="board" aria-label="Chess board"></div><div id="fileCoords" class="file-coords" aria-hidden="true"></div></div><div class="player bottom"><span class="avatar light" aria-hidden="true">GU</span><div class="player-info"><div class="player-name-row"><b>You · Guest-${room.slice(-4)}</b><span class="flag" role="img" aria-label="Player flag">🏳️</span></div><div class="player-meta"><span class="rating">★ 1200</span><span class="signal"><span class="ping-dot"></span>Connected</span></div></div><time id="whiteClock" class="player-clock" aria-label="Your clock">10:00</time></div><div class="tools" aria-label="Board controls"><button id="flip" type="button"><span class="tool-icon" aria-hidden="true">⇄</span><span class="tool-label">Flip board</span></button><button id="sound" type="button" aria-pressed="true"><span class="tool-icon" aria-hidden="true">♫</span><span class="tool-label">Sound on</span></button><button id="theme" type="button"><span class="tool-icon" aria-hidden="true">▦</span><span class="tool-label">Board theme</span></button><button id="resign" type="button" class="danger"><span class="tool-icon" aria-hidden="true">⚑</span><span class="tool-label">Resign</span></button></div></section>
<aside class="rpanel panel"><div class="tabs" role="tablist" aria-label="Game intelligence"><button type="button" class="on" role="tab" aria-selected="true">Moves</button><button type="button" role="tab" aria-selected="false">Analysis</button><button type="button" role="tab" aria-selected="false">Openings</button><button type="button" role="tab" aria-selected="false">Famous Games</button></div><div class="status"><div class="status-copy"><small><i></i> LIVE GAME</small><h2 id="turn">White to move</h2><p id="state">Real time &nbsp;•&nbsp; Casual game</p></div><div class="status-art" aria-hidden="true"></div></div><div id="moves" class="moves"><div class="move-head"><span>#</span><span>White</span><span>Black</span></div><div class="move-empty">Game ready — make a move.</div></div><section class="analysis"><header><div><span class="analysis-icon">▣</span><b>Engine Analysis</b></div><small>Stockfish 19 · Elo <span id="elo">1200</span></small></header><div class="analysis-body"><h2 id="score">+0.0</h2><div class="analysis-track"><div class="meter"><i></i></div><span>POSITION</span></div></div><div class="pv"><small>PRINCIPAL VARIATION</small><p id="line">Waiting for an engine line.</p></div></section><section class="chat"><h3>Player chat</h3><div id="messages"></div><form id="chat"><input id="message" maxlength="160" placeholder="Send a friendly message…"><button>Send</button></form></section><div class="feature-cards" aria-label="Chess features">
  <button type="button" class="feature-card opening-card">
    <span class="feature-art" aria-hidden="true"></span>
    <span class="feature-shade" aria-hidden="true"></span>
    <span class="feature-content"><span class="feature-icon">♟</span><span class="feature-copy"><b>Opening Explorer</b><small>Study trusted opening lines.<br>Explore ideas from any position.</small></span><span class="feature-arrow">→</span></span>
  </button>
  <button type="button" class="feature-card famous-card">
    <span class="feature-art" aria-hidden="true"></span>
    <span class="feature-shade" aria-hidden="true"></span>
    <span class="feature-content"><span class="feature-icon">▣</span><span class="feature-copy"><b>Famous Games</b><small>Replay legendary battles.<br>Learn from great decisions.</small></span><span class="feature-arrow">→</span></span>
  </button>
  <button type="button" class="feature-card review-card">
    <span class="feature-art" aria-hidden="true"></span>
    <span class="feature-shade" aria-hidden="true"></span>
    <span class="feature-content"><span class="feature-icon">✓</span><span class="feature-copy"><b>Post-Game Review</b><small>Inspect critical moments.<br>Find improvements with analysis.</small></span><span class="feature-arrow">→</span></span>
  </button>
  <button type="button" class="feature-card learn-card">
    <span class="feature-art" aria-hidden="true"></span>
    <span class="feature-shade" aria-hidden="true"></span>
    <span class="feature-content"><span class="feature-icon">◇</span><span class="feature-copy"><b>Practice &amp; Learn</b><small>Build skill with guided drills.<br>Sharpen tactics and technique.</small></span><span class="feature-arrow">→</span></span>
  </button>
</div></aside></main></div><div id="toast"></div><dialog id="promotion"><h2>Promote pawn</h2><div><button data-piece="q">♕</button><button data-piece="r">♖</button><button data-piece="b">♗</button><button data-piece="n">♘</button></div></dialog><dialog id="themeStudio"><h2>Theme Studio</h2><label>Light squares <input data-theme="--light" type="color" value="#d9cfb2"></label><label>Dark squares <input data-theme="--dark" type="color" value="#29463b"></label><label>Accent <input data-theme="--mint" type="color" value="#82edba"></label><label>Gold <input data-theme="--gold" type="color" value="#e5c17c"></label><label>Glass opacity <input data-theme="--glass" type="range" min="35" max="100" value="94"></label><label>Motion <input data-theme="--motion" type="range" min="0" max="100" value="100"></label><label>Wallpaper <select id="wallpaper"><option value="classic">Classic hall</option><option value="forest">Forest</option><option value="midnight">Midnight</option></select></label><button id="closeTheme">Done</button></dialog>`;

let clocks=initialClocks(Number($('#time').value));
function render(){const board=$('#board'), order=flipped?[...Array(64).keys()].reverse():[...Array(64).keys()]; board.innerHTML=''; const pos=game.board().flat(); const legal=selected?game.moves({square:selected,verbose:true}):[]; const files=flipped?[...'abcdefgh'].reverse():[...'abcdefgh']; const ranks=flipped?[1,2,3,4,5,6,7,8]:[8,7,6,5,4,3,2,1]; $('#fileCoords').innerHTML=files.map(x=>`<span>${x}</span>`).join(''); $('#rankCoords').innerHTML=ranks.map(x=>`<span>${x}</span>`).join(''); order.forEach(i=>{const r=Math.floor(i/8),f=i%8,sq='abcdefgh'[f]+(8-r),p=pos[i],el=document.createElement('button'),isLast=lastMove&&(sq===lastMove.from||sq===lastMove.to);el.className=`square ${(r+f)%2?'dark':'light'} ${isLast?'last-move':''} ${selected===sq?'selected':''} ${legal.some(m=>m.to===sq)?'legal':''}`;el.dataset.sq=sq;el.setAttribute('aria-label',sq+(p?' '+p.color+p.type:'')); if(p)el.innerHTML=`<img class="piece ${p.color}" src="${pieceUrl(p)}" alt="" draggable="false" decoding="async">`;el.onclick=()=>clickSquare(sq,p); board.append(el)}); $('#turn').textContent=game.isGameOver()?endText():`${game.turn()==='w'?'White':'Black'} to move`; $('#state').textContent=game.inCheck()?'Check · Real time':'Real time  •  Casual game';}
function endText(){if(game.isCheckmate())return `Checkmate · ${game.turn()==='w'?'Black':'White'} wins`;if(game.isStalemate())return 'Draw · Stalemate';if(game.isThreefoldRepetition())return 'Draw · Repetition';return 'Draw';}
async function clickSquare(sq,p){if(game.isGameOver()||(serverGameId&&mode==='room'&&myColor!==game.turn()))return;if(!selected){if(p?.color===game.turn()){selected=sq;render()}return} if(p?.color===game.turn()){selected=sq;render();return} const candidates=game.moves({square:selected,verbose:true}).filter(m=>m.to===sq);if(!candidates.length){selected=null;render();return}let promotion;if(candidates.some(m=>m.promotion))promotion=await choosePromotion();makeMove({from:selected,to:sq,promotion:promotion||'q'});selected=null;}
function choosePromotion(){return new Promise(resolve=>{const d=$('#promotion');d.showModal();$$('#promotion button').forEach(b=>b.onclick=()=>{d.close();resolve(b.dataset.piece)})})}
async function makeMove(move,remote=false){if(puzzleSession&&!remote){const uci=move.from+move.to+(move.promotion||'');const expected=puzzleSession.solution[puzzleSession.index];if(uci!==expected){toast('Try another move');return}const made=game.move(move);lastMove=made?{from:made.from,to:made.to}:lastMove;puzzleSession.played.push(uci);puzzleSession.index++;render();if(puzzleSession.index>=puzzleSession.solution.length){await api.puzzleAttempt({puzzleId:puzzleSession.id,success:true,durationMs:Date.now()-puzzleSession.started,playedMoves:puzzleSession.played});toast('Puzzle solved');puzzleSession=null}return}if(serverGameId&&!remote){try{const state=await api.move(serverGameId,serverVersion,{from:move.from,to:move.to,promotion:move.promotion});applyServerState(state);playTone()}catch(error){toast(error.message);await refreshServerState()}return}let made;try{made=game.move(move)}catch{return}lastMove={from:made.from,to:made.to};render();updateMoves();playTone();if(mode==='computer'&&!game.isGameOver())setTimeout(engineMove,280);}
function updateMoves(){const serverHistory=Array.isArray(serverGame?.move_history)?serverGame.move_history.map(m=>m?.san).filter(Boolean):[];const h=serverHistory.length?serverHistory:game.history();const head='<div class="move-head"><span>#</span><span>White</span><span>Black</span></div>';const rows=h.length?h.map((m,i)=>i%2===0?`<div class="move-row"><b>${i/2+1}.</b><span>${m}</span><span>${h[i+1]||''}</span></div>`:'').join(''):'<div class="move-empty">Game ready — make a move.</div>';$('#moves').innerHTML=head+rows;$('#moves').scrollTop=$('#moves').scrollHeight}
async function findEngineMove(){const moves=game.moves({verbose:true});if(!moves.length)return null;const uci=await new Promise(resolve=>{enginePending=resolve;stockfish.postMessage({fen:game.fen(),elo:Number($('#level').value),movetime:350});setTimeout(()=>{if(enginePending){enginePending(null);enginePending=null}},4000)});return uci&&moves.find(x=>x.from+x.to+(x.promotion||'')===uci)}
async function engineMove(){const move=await findEngineMove();if(!move)return toast('Stockfish 19 is unavailable — no substitute move was played');makeMove(move,true)}
function playTone(){if($('#sound').dataset.off)return;const a=new AudioContext(),o=a.createOscillator(),g=a.createGain();o.frequency.value=420;g.gain.setValueAtTime(.05,a.currentTime);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+.09);o.connect(g).connect(a.destination);o.start();o.stop(a.currentTime+.1)}
function clockText(n){return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`}
function startClock(){clearInterval(ticking);ticking=setInterval(()=>{if(!clockSnapshot)return;const value=projectedClocks(clockSnapshot);$('#whiteClock').textContent=clockText(Math.ceil(value.w/1000));$('#blackClock').textContent=clockText(Math.ceil(value.b/1000))},250)}
function toast(s){$('#toast').textContent=s;$('#toast').className='show';setTimeout(()=>$('#toast').className='',1800)}
function applyServerState(payload){const state=payload.game||payload;if(!state)return;serverGame=state;serverGameId=state.id||serverGameId;serverVersion=Number(state.version??serverVersion);myColor=seatFromEnvelope(payload,myColor);clockSnapshot=createClockSnapshot(payload);const serverMoves=Array.isArray(state.move_history)?state.move_history:[];const latest=serverMoves.at(-1);lastMove=latest?.from&&latest?.to?{from:String(latest.from),to:String(latest.to)}:null;if(state.fen){try{game.load(state.fen)}catch{}}render();updateMoves();maybePlayBot()}
async function refreshServerState(){if(!serverGameId)return;try{applyServerState(await api.state(serverGameId));await loadChat()}catch(error){toast(error.message)}}
async function maybePlayBot(){if(botThinking||!serverGame?.bot_player_id||game.isGameOver())return;const activePlayer=game.turn()==='w'?serverGame.white_player_id:serverGame.black_player_id;if(activePlayer!==serverGame.bot_player_id)return;botThinking=true;try{const move=await findEngineMove();if(!move)throw new Error('Stockfish 19 is required for the matched bot');applyServerState(await api.botMove(serverGameId,serverVersion,{from:move.from,to:move.to,promotion:move.promotion||undefined}))}catch(error){toast(error.message)}finally{botThinking=false}}
async function connect(){try{await api.profile(guestName);if(params.get('game')){const state=await api.join(room,guestName);applyServerState(state);toast(`Joined room ${room}`);startPolling()}}catch(error){toast(error.message)}}
function startPolling(){clearInterval(pollTimer);pollTimer=setInterval(async()=>{if(document.hidden||!serverGameId)return;try{applyServerState(await api.heartbeat(serverGameId))}catch{}},1000)}
function addMessage(text,mine=true){const e=document.createElement('p');e.className=mine?'mine':'';e.textContent=String(text).slice(0,160);$('#messages').append(e);e.scrollIntoView()}
async function loadChat(){if(!serverGameId)return;const data=await api.chatList(serverGameId);$('#messages').replaceChildren();for(const item of data.messages||[])addMessage(item.body,item.player_id===data.playerId)}
$('#chat').onsubmit=async e=>{e.preventDefault();const v=$('#message').value.trim();if(!v||v.length>160||!serverGameId)return;try{await api.chatSend(serverGameId,v);$('#message').value='';await loadChat()}catch(error){toast(error.message)}};
$('.rpanel .tabs button').forEach(button=>button.onclick=()=>{$('.rpanel .tabs button').forEach(x=>{x.classList.toggle('on',x===button);x.setAttribute('aria-selected',String(x===button))})});
$('.modes button').forEach(b=>b.onclick=async()=>{$('.modes button').forEach(x=>{x.classList.remove('on');x.setAttribute('aria-selected','false')});b.classList.add('on');b.setAttribute('aria-selected','true');mode=b.dataset.mode;if(mode==='computer')toast('Choose an engine level');if(mode==='match'){try{await api.queueJoin({seconds:Number($('#time').value),increment:0,rated:false});toast('Searching for a player…');const started=Date.now(),timer=setInterval(async()=>{try{const state=await api.queueStatus(false);if(state.game||state.matched){clearInterval(timer);applyServerState(state);startPolling();toast(Date.now()-started>=15000?'Closest Elo engine matched':'Player matched')}}catch(error){clearInterval(timer);toast(error.message)}},1000)}catch(error){toast(error.message)}}});
$('#flip').onclick=()=>{flipped=!flipped;render()};$('#sound').onclick=e=>{const button=e.currentTarget;button.dataset.off=button.dataset.off?'':'1';const enabled=!button.dataset.off;button.setAttribute('aria-pressed',String(enabled));button.querySelector('.tool-icon').textContent=enabled?'♫':'♪';button.querySelector('.tool-label').textContent=enabled?'Sound on':'Sound off'};$('#theme').onclick=()=>$('#themeStudio').showModal();$('#resign').onclick=async()=>{if(serverGameId&&confirm('Resign this game?')){try{applyServerState(await api.resign(serverGameId))}catch(error){toast(error.message)}}};$('#copy').onclick=async()=>{await navigator.clipboard.writeText($('#share').value);toast('Room link copied')};$('#create').onclick=async()=>{try{const rated=$('#roomType').value==='true';const state=await api.create({name:guestName,seconds:Number($('#time').value),increment:0,rated});applyServerState(state);room=(state.game||state).invite_code;history.replaceState(null,'',`?game=${encodeURIComponent(room)}`);$('#roomCode').textContent=room;$('#share').value=`${location.origin}${location.pathname}?game=${room}`;toast('Private room is ready');startPolling()}catch(error){toast(error.message)}};$('#join').onclick=()=>{const v=$('#roomInput').value.trim();if(v)location.search='?game='+encodeURIComponent(v)};$('#level').onchange=e=>$('#elo').textContent=e.target.value;
$('#time').onchange=e=>{if(game.history().length)return toast('Time control cannot change after the first move');clocks=initialClocks(Number(e.target.value));$('#whiteClock').textContent=clockText(clocks.w);$('#blackClock').textContent=clockText(clocks.b)};
render();startClock();connect();

if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js'));

async function showBackendView(kind){
  const target=$('#moves');target.replaceChildren();
  try{
    if(kind==='puzzle'){
      const data=await api.puzzleNext('normal',1400), puzzle=data.puzzle||data;
      game.load(puzzle.fen); lastMove=null; mode='puzzle'; puzzleSession={id:puzzle.id||puzzle.puzzleId,solution:puzzle.solution||puzzle.moves||[],index:0,played:[],started:Date.now()};
      render(); const note=document.createElement('p');note.textContent=`Puzzle ${puzzle.rating||'—'} · ${(puzzle.themes||[]).join(', ')}`;target.append(note);return;
    }
    const data=await api.tournaments();
    for(const tournament of data.tournaments||data.events||[]){
      const row=document.createElement('div'),title=document.createElement('strong'),join=document.createElement('button'),standings=document.createElement('button');
      title.textContent=`${tournament.name||tournament.title||'Arena'} · ${tournament.time_control||tournament.seconds||''}`;
      join.textContent='Join';standings.textContent='Standings';
      join.onclick=async()=>{const state=await api.tournamentJoin(tournament.id);if(state.game)applyServerState(state);toast('Arena joined')};
      standings.onclick=async()=>{const result=await api.tournamentStandings(tournament.id);row.querySelectorAll('p').forEach(x=>x.remove());for(const player of result.standings||[]){const line=document.createElement('p');line.textContent=`${player.rank||'–'}. ${player.display_name||player.name} · ${player.score||0}`;row.append(line)}};
      row.append(title,join,standings);target.append(row);
    }
  }catch(error){toast(error.message)}
}
$$('nav button').forEach(button=>button.addEventListener('click',()=>{const label=button.textContent;if(label.includes('Arena'))showBackendView('arena');if(label.includes('Puzzles'))showBackendView('puzzle')}));
const savedTheme=JSON.parse(localStorage.getItem('vanta.theme')||'{}');
for(const [key,value] of Object.entries(savedTheme)){if(key==='wallpaper')document.body.dataset.wallpaper=value;else document.documentElement.style.setProperty(key,value)}
$$('[data-theme]').forEach(input=>input.oninput=()=>{const value=input.type==='range'?(input.dataset.theme==='--glass'?`${input.value/100}`:`${input.value/100}s`):input.value;document.documentElement.style.setProperty(input.dataset.theme,value);savedTheme[input.dataset.theme]=value;localStorage.setItem('vanta.theme',JSON.stringify(savedTheme))});
$('#wallpaper').onchange=e=>{document.body.dataset.wallpaper=e.target.value;savedTheme.wallpaper=e.target.value;localStorage.setItem('vanta.theme',JSON.stringify(savedTheme))};
$('#closeTheme').onclick=()=>$('#themeStudio').close();
