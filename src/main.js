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
const game=new Chess(); let selected=null, flipped=false, mode='room', myColor=null, ticking, enginePending, serverGameId=null, serverVersion=0, pollTimer, clockSnapshot=null, serverGame=null, botThinking=false, puzzleSession=null, currentPlayerId=null, orientationSet=false, lastAnimatedVersion=0, lastDrawOffer=null, pollCount=0;
const stockfish=new Worker('/stockfish.worker.js');
stockfish.onmessage=({data})=>{if(data.type==='uci'&&data.line.startsWith('bestmove ')){const u=data.line.split(' ')[1];enginePending?.(u);enginePending=null}else if(data.type==='unavailable'&&enginePending){enginePending(null);enginePending=null}};
const pieceNames={k:'king',q:'queen',r:'rook',b:'bishop',n:'knight',p:'pawn'};
const app=$('#app');
app.innerHTML=`
<div class="shell"><header><a class="brand"><span class="mark">V</span><b>VANTA<br>CHESS</b></a><nav><button class="active">♞ <span>Play</span></button><button>♛ <span>Arena</span></button><button>♟ <span>Puzzles</span></button><button>▤ <span>Learn</span></button><button>♜ <span>Openings</span></button></nav><div class="user"><i></i><span>Guest-${room.slice(-4)}</span><small>1200 rating</small></div></header>
<main><aside class="lpanel panel"><div class="hero"><label>● &nbsp; LIVE CHESS</label><h1>Play your<br>next game.</h1><p>Guest play is instant. Rated games save your Elo and tournament record.</p></div><div class="modes"><button data-mode="match">⚡<span>Match</span></button><button data-mode="room" class="on">♟<span>Room</span></button><button data-mode="computer">▣<span>Computer</span></button></div><section><h3>Create a private room</h3><p>Generate a shareable game link instantly.</p></section><label class="tiny">GAME SETTINGS</label><div class="settings"><select id="time"><option value="600">◷ 10+0 Rapid</option><option value="300">◷ 5+0 Blitz</option><option value="180">◷ 3+0 Blitz</option></select><select id="level"><option value="1200">Casual · 1200</option><option value="1600">Club · 1600</option><option value="2000">Expert · 2000</option></select></div><button class="gold" id="create">Create room & get link <b>＋</b></button><div class="divider">or join an existing room</div><div class="join"><input id="roomInput" placeholder="Enter room code"><button id="join">Join room</button></div><div class="room"><small>ROOM CODE</small><strong>${room}</strong><em>● Ready</em><p>Share this link</p><div><input id="share" readonly value="${location.origin+location.pathname}?game=${room}"><button id="copy">▣</button></div></div></aside>
<section class="game"><div class="player top"><span class="avatar">GU</span><div><b>Guest-Opponent</b><small>☆ 1200</small></div><i class="signal">▥ 42 ms</i><time id="blackClock">10:00</time></div><div id="board" class="board" aria-label="Chess board"></div><div class="player bottom"><span class="avatar light">GU</span><div><b>You · Guest-${room.slice(-4)}</b><small>☆ 1200</small></div><i class="signal">▥ connected</i><time id="whiteClock">10:00</time></div><div class="tools"><button id="flip">⇄ Flip board</button><button id="sound">♫ Sound on</button><button id="theme">▦ Board theme</button><button id="resign" class="danger">⚑ Resign</button></div></section>
<aside class="rpanel panel"><div class="tabs"><button class="on">Moves</button><button>Analysis</button><button>Openings</button></div><div class="status"><small>● &nbsp; LIVE GAME</small><h2 id="turn">White to move</h2><p id="state">Real time &nbsp;•&nbsp; Casual game</p></div><div class="quick-actions"><button id="draw">½ Offer draw</button></div><div id="moves" class="moves"><span>Game ready — make a move.</span></div><section class="analysis"><header><b>▣ Engine Analysis</b><small>Stockfish 19 · Elo <span id="elo">1200</span></small></header><h2 id="score">+0.0</h2><div class="meter"><i></i></div><p id="line">Analysis begins after your move.</p></section><section class="chat"><h3>Player chat</h3><div id="messages"></div><form id="chat"><input id="message" maxlength="160" placeholder="Send a friendly message…"><button>Send</button></form></section><div class="cards"><article><b>♛ Arena</b><p>Live tournaments and events from Vanta.</p></article><article><b>◎ Daily Puzzle</b><p>Sharpen tactics with a new position.</p></article></div></aside></main></div><div id="toast"></div><dialog id="promotion"><h2>Promote pawn</h2><div><button data-piece="q">♕</button><button data-piece="r">♖</button><button data-piece="b">♗</button><button data-piece="n">♘</button></div></dialog><dialog id="themeStudio"><h2>Theme Studio</h2><label>Light squares <input data-theme="--light" type="color" value="#d9cfb2"></label><label>Dark squares <input data-theme="--dark" type="color" value="#29463b"></label><label>Accent <input data-theme="--mint" type="color" value="#82edba"></label><label>Gold <input data-theme="--gold" type="color" value="#e5c17c"></label><label>Glass opacity <input data-theme="--glass" type="range" min="35" max="100" value="94"></label><label>Motion <input data-theme="--motion" type="range" min="0" max="100" value="100"></label><label>Ivory piece tint <input id="whitePiece" type="color" value="#f0d9a4"></label><label>Black piece tint <input id="blackPiece" type="color" value="#342019"></label><label>Piece tint strength <input id="pieceTint" type="range" min="0" max="70" value="18"></label><label>Wallpaper <select id="wallpaper"><option value="classic">Midnight Emerald</option><option value="cobalt">Midnight Cobalt</option><option value="burgundy">Burgundy Brass</option><option value="ivory">Ivory Noir</option></select></label><button id="closeTheme">Done</button></dialog>`;

let clocks=initialClocks(Number($('#time').value));
function render(){
  const board=$('#board'), order=flipped?[...Array(64).keys()].reverse():[...Array(64).keys()];
  board.innerHTML='';
  const pos=game.board().flat(), legal=selected?game.moves({square:selected,verbose:true}):[];
  let checked=-1;
  if(game.inCheck()){
    const checkedColor=game.turn();
    checked=pos.findIndex(p=>p?.type==='k'&&p.color===checkedColor);
  }
  order.forEach(i=>{
    const r=Math.floor(i/8),f=i%8,sq='abcdefgh'[f]+(8-r),p=pos[i],el=document.createElement('button');
    el.className=`square ${(r+f)%2?'dark':'light'} ${selected===sq?'selected':''} ${legal.some(m=>m.to===sq)?'legal':''} ${checked===i?'check':''}`;
    el.dataset.sq=sq;
    el.setAttribute('aria-label',sq+(p?` ${p.color==='w'?'white':'black'} ${pieceNames[p.type]}`:' empty'));
    if(p)el.innerHTML=`<span class="piece ${p.color} piece-${p.type}" aria-hidden="true"></span>`;
    if(f===(flipped?7:0))el.insertAdjacentHTML('beforeend',`<small class="rank">${8-r}</small>`);
    if(r===(flipped?0:7))el.insertAdjacentHTML('beforeend',`<small class="file">${'abcdefgh'[f]}</small>`);
    el.onclick=()=>clickSquare(sq,p); board.append(el);
  });
  board.classList.toggle('mate',game.isCheckmate());
  if(serverGameId&&serverGame&&!['active','playing','in_progress','waiting'].includes(serverGame.status)){
    $('#turn').textContent=`Game over · ${serverGame.end_reason||serverGame.result||serverGame.status}`;
    $('#state').textContent='Authoritative server result';
  }else{
    $('#turn').textContent=game.isGameOver()?endText():`${game.turn()==='w'?'White':'Black'} to move`;
    $('#state').textContent=game.inCheck()?'Check · Real time':'Real time  •  Casual game';
  }
  document.body.dataset.seat=myColor||'';
  document.body.dataset.botGame=serverGame?.bot_player_id?'true':'false';
}
function endText(){if(game.isCheckmate())return `Checkmate · ${game.turn()==='w'?'Black':'White'} wins`;if(game.isStalemate())return 'Draw · Stalemate';if(game.isThreefoldRepetition())return 'Draw · Repetition';return 'Draw';}
async function clickSquare(sq,p){if(game.isGameOver()||(serverGameId&&mode==='room'&&myColor!==game.turn()))return;if(!selected){if(p?.color===game.turn()){selected=sq;render()}return} if(p?.color===game.turn()){selected=sq;render();return} const candidates=game.moves({square:selected,verbose:true}).filter(m=>m.to===sq);if(!candidates.length){selected=null;render();return}let promotion;if(candidates.some(m=>m.promotion))promotion=await choosePromotion();makeMove({from:selected,to:sq,promotion:promotion||'q'});selected=null;}
function choosePromotion(){return new Promise(resolve=>{const d=$('#promotion');d.showModal();$$('#promotion button').forEach(b=>b.onclick=()=>{d.close();resolve(b.dataset.piece)})})}
async function makeMove(move,remote=false){if(puzzleSession&&!remote){const uci=move.from+move.to+(move.promotion||'');const expected=puzzleSession.solution[puzzleSession.index];if(uci!==expected){toast('Try another move');return}
  game.move(move);puzzleSession.played.push(uci);puzzleSession.index++;render();
  if(puzzleSession.index>=puzzleSession.solution.length){await api.puzzleAttempt({puzzleId:puzzleSession.id,success:true,durationMs:Date.now()-puzzleSession.started,playedMoves:puzzleSession.played});toast('Puzzle solved');puzzleSession=null;return}
  const reply=puzzleSession.solution[puzzleSession.index];
  if(reply){setTimeout(async()=>{if(!puzzleSession)return;try{game.move({from:reply.slice(0,2),to:reply.slice(2,4),promotion:reply[4]});puzzleSession.played.push(reply);puzzleSession.index++;render();if(puzzleSession.index>=puzzleSession.solution.length){await api.puzzleAttempt({puzzleId:puzzleSession.id,success:true,durationMs:Date.now()-puzzleSession.started,playedMoves:puzzleSession.played});toast('Puzzle solved');puzzleSession=null}}catch{toast('Puzzle line could not continue')}},260)}
  return}if(serverGameId&&!remote){try{const state=await api.move(serverGameId,serverVersion,{from:move.from,to:move.to,promotion:move.promotion});applyServerState(state);playTone()}catch(error){toast(error.message);await refreshServerState()}return}let made;try{made=game.move(move)}catch{return}render();updateMoves();playTone();if(mode==='computer'&&!game.isGameOver())setTimeout(engineMove,280);}
function updateMoves(){
  const h=serverGameId&&Array.isArray(serverGame?.move_history)?serverGame.move_history.map(x=>x.san||x.lan||''):game.history();
  $('#moves').innerHTML=h.length?h.map((m,i)=>i%2===0?`<div><b>${i/2+1}.</b><span>${m}</span><span>${h[i+1]||''}</span></div>`:'').join(''):'<span>Game ready — make a move.</span>';
  $('#moves').scrollTop=9999;
}
async function findEngineMove(){const moves=game.moves({verbose:true});if(!moves.length)return null;const uci=await new Promise(resolve=>{enginePending=resolve;stockfish.postMessage({fen:game.fen(),elo:Number($('#level').value),movetime:350});setTimeout(()=>{if(enginePending){enginePending(null);enginePending=null}},4000)});return uci&&moves.find(x=>x.from+x.to+(x.promotion||'')===uci)}
async function engineMove(){const move=await findEngineMove();if(!move)return toast('Stockfish 19 is unavailable — no substitute move was played');makeMove(move,true)}
function playTone(){if($('#sound').dataset.off)return;const a=new AudioContext(),o=a.createOscillator(),g=a.createGain();o.frequency.value=420;g.gain.setValueAtTime(.05,a.currentTime);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+.09);o.connect(g).connect(a.destination);o.start();o.stop(a.currentTime+.1)}
function clockText(n){return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`}
function startClock(){clearInterval(ticking);ticking=setInterval(()=>{if(!clockSnapshot)return;const value=projectedClocks(clockSnapshot);$('#whiteClock').textContent=clockText(Math.ceil(value.w/1000));$('#blackClock').textContent=clockText(Math.ceil(value.b/1000))},250)}
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
  const topName=serverGame?.black_name||'Waiting for opponent',bottomName=serverGame?.white_name||guestName;
  $('.player.top b').textContent=topName;
  $('.player.bottom b').textContent=myColor==='b'?`You · ${topName}`:`You · ${bottomName}`;
}
function applyServerState(payload){
  const state=payload.game||payload;if(!state)return;
  const previousVersion=serverVersion,previousGameId=serverGameId;
  animateLastServerMove(state,previousGameId===state.id?previousVersion:0);
  serverGame=state;serverGameId=state.id||serverGameId;serverVersion=Number(state.version??serverVersion);
  currentPlayerId=payload.player?.id||currentPlayerId;
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
async function connect(){try{await api.profile(guestName);if(params.get('game')){const state=await api.join(room,guestName);applyServerState(state);await loadChat();toast(`Joined room ${room}`);startPolling()}}catch(error){toast(error.message)}}
function startPolling(){clearInterval(pollTimer);pollCount=0;pollTimer=setInterval(async()=>{if(document.hidden||!serverGameId)return;try{applyServerState(await api.heartbeat(serverGameId));if(++pollCount%2===0)await loadChat()}catch{}},1000)}
function addMessage(text,mine=true){const e=document.createElement('p');e.className=mine?'mine':'';e.textContent=String(text).slice(0,160);$('#messages').append(e);e.scrollIntoView()}
async function loadChat(){if(!serverGameId)return;const data=await api.chatList(serverGameId);$('#messages').replaceChildren();for(const item of data.messages||[])addMessage(item.body,item.player_id===data.playerId)}
$('#chat').onsubmit=async e=>{e.preventDefault();const v=$('#message').value.trim();if(!v||v.length>160||!serverGameId)return;try{await api.chatSend(serverGameId,v);$('#message').value='';await loadChat()}catch(error){toast(error.message)}};
$$('.modes button').forEach(b=>b.onclick=async()=>{$$('.modes button').forEach(x=>x.classList.remove('on'));b.classList.add('on');mode=b.dataset.mode;if(mode==='computer')toast('Choose an engine level');if(mode==='match'){try{await api.queueJoin({seconds:Number($('#time').value),increment:0,rated:false});toast('Searching for a player…');const started=Date.now(),timer=setInterval(async()=>{try{const state=await api.queueStatus(false);if(state.game||state.matched){clearInterval(timer);applyServerState(state);startPolling();toast(Date.now()-started>=15000?'Closest Elo engine matched':'Player matched')}}catch(error){clearInterval(timer);toast(error.message)}},1000)}catch(error){toast(error.message)}}});
$('#flip').onclick=()=>{flipped=!flipped;render()};$('#sound').onclick=e=>{e.currentTarget.dataset.off=e.currentTarget.dataset.off?'':'1';e.currentTarget.textContent=e.currentTarget.dataset.off?'♫ Sound off':'♫ Sound on'};$('#theme').onclick=()=>$('#themeStudio').showModal();$('#resign').onclick=async()=>{if(serverGameId&&confirm('Resign this game?')){try{applyServerState(await api.resign(serverGameId))}catch(error){toast(error.message)}}};$('#draw').onclick=async()=>{if(!serverGameId)return toast('Start a game first');try{applyServerState(await api.drawOffer(serverGameId));toast('Draw offer sent')}catch(error){toast(error.message)}};$('#copy').onclick=async()=>{await navigator.clipboard.writeText($('#share').value);toast('Room link copied')};$('#create').onclick=async()=>{try{const state=await api.create({name:guestName,seconds:Number($('#time').value),increment:0,rated:false});applyServerState(state);room=(state.game||state).invite_code;history.replaceState(null,'',`?game=${encodeURIComponent(room)}`);syncRoomUi();await loadChat();toast('Private room is ready');startPolling()}catch(error){toast(error.message)}};$('#join').onclick=()=>{const v=$('#roomInput').value.trim();if(v)location.search='?game='+encodeURIComponent(v)};$('#level').onchange=e=>$('#elo').textContent=e.target.value;
$('#time').onchange=e=>{if(game.history().length)return toast('Time control cannot change after the first move');clocks=initialClocks(Number(e.target.value));$('#whiteClock').textContent=clockText(clocks.w);$('#blackClock').textContent=clockText(clocks.b)};
render();startClock();connect();

if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js'));

async function showBackendView(kind){
  const target=$('#moves');target.replaceChildren();
  try{
    if(kind==='puzzle'){
      const data=await api.puzzleNext('normal',1400), puzzle=data.puzzle||data;
      game.load(puzzle.fen); mode='puzzle'; puzzleSession={id:puzzle.id||puzzle.puzzleId,solution:puzzle.solution||puzzle.moves||[],index:0,played:[],started:Date.now()};
      render(); const note=document.createElement('p');note.textContent=`Puzzle ${puzzle.rating||'—'} · ${(puzzle.themes||[]).join(', ')}`;target.append(note);return;
    }
    const data=await api.tournaments();
    for(const tournament of data.tournaments||data.events||[]){
      const row=document.createElement('div'),title=document.createElement('strong'),join=document.createElement('button'),standings=document.createElement('button');
      title.textContent=`${tournament.name||tournament.title||'Arena'} · ${tournament.time_control||tournament.seconds||''}`;
      join.textContent='Join';standings.textContent='Standings';
      join.onclick=async()=>{try{await api.tournamentJoin(tournament.id);await api.queueJoin({seconds:Number(tournament.base_seconds||600),increment:Number(tournament.increment_seconds||0),rated:!!tournament.rated,tournamentId:tournament.id});toast('Arena queue joined');const timer=setInterval(async()=>{try{const state=await api.queueStatus(!!tournament.rated);if(state.game||state.matched){clearInterval(timer);applyServerState(state);startPolling();toast('Arena match found')}}catch(error){clearInterval(timer);toast(error.message)}},1000)}catch(error){toast(error.message)}};
      standings.onclick=async()=>{const result=await api.tournamentStandings(tournament.id);row.querySelectorAll('p').forEach(x=>x.remove());for(const player of result.standings||[]){const line=document.createElement('p');line.textContent=`${player.rank||'–'}. ${player.display_name||player.name} · ${player.score||0}`;row.append(line)}};
      row.append(title,join,standings);target.append(row);
    }
  }catch(error){toast(error.message)}
}
$$('nav button').forEach(button=>button.addEventListener('click',()=>{const label=button.textContent;if(label.includes('Arena'))showBackendView('arena');if(label.includes('Puzzles'))showBackendView('puzzle')}));
const savedTheme=JSON.parse(localStorage.getItem('vanta.theme')||'{}');document.documentElement.style.setProperty('--white-piece',savedTheme.whitePiece||'#f0d9a4');document.documentElement.style.setProperty('--black-piece',savedTheme.blackPiece||'#342019');document.documentElement.style.setProperty('--piece-tint',String(savedTheme.pieceTint??.18));
for(const [key,value] of Object.entries(savedTheme)){if(key==='wallpaper')document.body.dataset.wallpaper=value;else document.documentElement.style.setProperty(key,value)}
$$('[data-theme]').forEach(input=>input.oninput=()=>{const value=input.type==='range'?(input.dataset.theme==='--glass'?`${input.value/100}`:`${input.value/100}s`):input.value;document.documentElement.style.setProperty(input.dataset.theme,value);savedTheme[input.dataset.theme]=value;localStorage.setItem('vanta.theme',JSON.stringify(savedTheme))});
$('#whitePiece').value=savedTheme.whitePiece||'#f0d9a4';$('#blackPiece').value=savedTheme.blackPiece||'#342019';$('#pieceTint').value=Math.round((savedTheme.pieceTint??.18)*100);$('#whitePiece').oninput=e=>{savedTheme.whitePiece=e.target.value;document.documentElement.style.setProperty('--white-piece',e.target.value);localStorage.setItem('vanta.theme',JSON.stringify(savedTheme))};$('#blackPiece').oninput=e=>{savedTheme.blackPiece=e.target.value;document.documentElement.style.setProperty('--black-piece',e.target.value);localStorage.setItem('vanta.theme',JSON.stringify(savedTheme))};$('#pieceTint').oninput=e=>{savedTheme.pieceTint=Number(e.target.value)/100;document.documentElement.style.setProperty('--piece-tint',String(savedTheme.pieceTint));localStorage.setItem('vanta.theme',JSON.stringify(savedTheme))};$('#wallpaper').onchange=e=>{document.body.dataset.wallpaper=e.target.value;savedTheme.wallpaper=e.target.value;localStorage.setItem('vanta.theme',JSON.stringify(savedTheme))};
$('#closeTheme').onclick=()=>$('#themeStudio').close();
