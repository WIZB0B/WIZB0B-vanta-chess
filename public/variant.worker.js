/* Multi-variant Stockfish bridge (Crazyhouse). The engine is stockfish.js 10.0.2 (GPLv3), the
 * single-threaded WebAssembly build of the multi-variant Stockfish fork, vendored in /engines
 * with the complete GPL text; source details are in /engines/SOURCE.md. Search stays off the
 * application thread and needs no SharedArrayBuffer.
 *
 * Same protocol as /stockfish.worker.js, plus `variant` ('crazyhouse', the default; a Bughouse
 * board is searched as Crazyhouse, which is an approximation of its rules):
 *   {mode:'bot', variant, fen, elo, nodes, requestId}        fixed node budget, Skill Level from elo
 *     optional searchmoves: the bot chooses only among these
 *   {mode:'analysis', variant, fen, depth, requestId}        full strength, searches to depth
 *     optional multipv (1-10) and searchmoves ['e2e4', 'N@f3', …]
 *   {action:'stop'}                                          stops the current search
 * fen: a chess FEN with the holdings in brackets after the placement and "~" after each promoted
 * piece, e.g. "r1bqk2r/…/RNBQK2R[NPp] w KQkq - 0 7" (src/variant-engine.js zhFen builds it).
 * Moves out (and searchmoves in) are UCI; a drop is "N@f3", upper case for either colour.
 * Replies: {type:'uci', line, requestId} and {type:'unavailable', message, requestId}.
 * A request whose variant or position is not valid never reaches the engine: it is answered at
 * once with "info string invalid position" and "bestmove (none)". With no legal move or drop,
 * this engine prints only "info depth 0 score mate 0" (or "cp 0") and no bestmove, so the bridge
 * adds "bestmove (none)". One search runs at a time; a new request stops the running search and
 * starts once its bestmove arrives, so every line carries the requestId it belongs to. */
const ENGINE_URL='/engines/stockfish-mv-10.js';
const MIN_NODES=100, MAX_NODES=2000000, MAX_DEPTH=30;
const VARIANTS={crazyhouse:'crazyhouse',bughouse:'crazyhouse'};
// Crazyhouse bot levels [elo, Skill Level, nodes]: keep equal to ZH_BOT_LEVELS in
// src/variant-engine.js (test/variant-engine.test.js checks). This engine has no UCI_Elo.
const LEVELS=[[800,0,400],[1000,2,1000],[1200,4,3000],[1400,7,8000],[1600,10,20000],[1800,13,50000],[2000,16,100000],[2200,20,200000],[2500,20,500000],[2800,20,1000000]];
let engine=null, ready=false, broken=false, variant=null, searching=false, current=null, queued=null;

const clamp=(value,min,max,fallback)=>{const number=Number(value);return Number.isFinite(number)?Math.max(min,Math.min(max,Math.round(number))):fallback};
const level=elo=>{const value=clamp(elo,0,4000,1500);let out=LEVELS[0];for(const entry of LEVELS)if(value>=entry[0])out=entry;return out};

// Strict structural check, so a malformed position can never reach the engine.
const FEN=/^([1-8PNBRQKpnbrqk~/]{15,135})(?:\[([QRBNPqrbnp]{0,160})\])? ([wb]) (-|K?Q?k?q?) (-|[a-h][36]) (\d{1,3}) (\d{1,4})$/;
// Castling rights need the king and that rook on their starting squares (the engine walks the
// back rank looking for the rook).
const CASTLING={K:['e1','K','h1','R'],Q:['e1','K','a1','R'],k:['e8','k','h8','r'],q:['e8','k','a8','r']};
function validFen(text){
  const match=FEN.exec(text);
  if(!match||match[4]==='')return false;
  const [,placement,hand='',turn,castling,ep]=match;
  const ranks=placement.split('/');
  if(ranks.length!==8)return false;
  const board={},count={};
  for(let r=0;r<8;r++){
    let file=0;
    for(let i=0;i<ranks[r].length;i++){
      const ch=ranks[r][i];
      if(ch==='~')return false; // a marker is only valid straight after a piece (skipped below)
      if(/[1-8]/.test(ch)){file+=Number(ch);continue}
      if((ch==='p'||ch==='P')&&(r===0||r===7))return false;
      if(ranks[r][i+1]==='~'){if(!/[QRBNqrbn]/.test(ch))return false;i++}
      if(file>7)return false;
      board['abcdefgh'[file]+(8-r)]=ch;count[ch]=(count[ch]||0)+1;file++;
    }
    if(file!==8)return false;
  }
  if(count.K!==1||count.k!==1)return false;
  for(const ch of hand)if((count['hand'+ch]=(count['hand'+ch]||0)+1)>16)return false;
  if(castling!=='-')for(const right of castling){const [king,k,rook,r]=CASTLING[right];if(board[king]!==k||board[rook]!==r)return false}
  if(ep!=='-'&&ep[1]!==(turn==='w'?'6':'3'))return false;
  return true;
}
const MOVE=/^(?:[a-h][1-8][a-h][1-8][qrbn]?|[PNBRQpnbrq]@[a-h][1-8])$/;
const uciMove=move=>move.includes('@')?move[0].toUpperCase()+move.slice(1):move;

function fail(message){
  const requestId=current?.requestId??null;
  self.postMessage({type:'unavailable',message,requestId});
}
function ensureEngine(){
  if(engine)return engine;
  engine=new Worker(ENGINE_URL);
  ready=false;variant=null;
  engine.onmessage=event=>{
    const line=String(event.data);
    if(!ready){if(line==='uciok')ready=true;return} // banner, id and option lines
    if(line.startsWith('info string variant '))return; // the engine confirming setoption UCI_Variant
    if(searching)self.postMessage({type:'uci',line,requestId:current?.requestId??null});
    const terminal=/^info depth 0 score (?:mate 0|cp 0)$/.test(line);
    if(terminal&&searching)self.postMessage({type:'uci',line:'bestmove (none)',requestId:current?.requestId??null});
    if(line.startsWith('bestmove ')||terminal){
      searching=false;current=null;
      if(queued){const next=queued;queued=null;start(next)}
    }
  };
  engine.onerror=event=>{
    event?.preventDefault?.();
    // Failing to load at all is permanent; a crash after loading gets a fresh engine next time.
    if(!ready)broken=true;
    fail('Multi-variant Stockfish failed to load');
    engine.terminate?.();engine=null;searching=false;current=null;queued=null;
  };
  engine.postMessage('uci');
  return engine;
}

function configure(worker,request){
  if(variant!==request.engineVariant){worker.postMessage(`setoption name UCI_Variant value ${request.engineVariant}`);variant=request.engineVariant}
  worker.postMessage(`setoption name MultiPV value ${request.mode==='analysis'?request.multipv:1}`);
  if(request.mode==='analysis'){
    // Neutral scores for analysis: no contempt for either side.
    worker.postMessage('setoption name UCI_AnalyseMode value true');
    worker.postMessage('setoption name Analysis Contempt value Off');
    worker.postMessage('setoption name Skill Level value 20');
    return;
  }
  worker.postMessage('setoption name UCI_AnalyseMode value false');
  worker.postMessage(`setoption name Skill Level value ${level(request.elo)[1]}`);
}

function goCommand(request){
  const only=request.searchmoves.length?` searchmoves ${request.searchmoves.join(' ')}`:'';
  if(request.mode==='analysis')return `go depth ${clamp(request.depth,1,MAX_DEPTH,18)}${only}`;
  return `go nodes ${clamp(request.nodes,MIN_NODES,MAX_NODES,level(request.elo)[2])}${only}`;
}

function start(request){
  const worker=ensureEngine();
  current=request;searching=true;
  configure(worker,request);
  worker.postMessage(`position fen ${request.fen}`);
  worker.postMessage(goCommand(request));
}

function reject(requestId){
  queued=null;
  if(engine&&searching)engine.postMessage('stop');
  self.postMessage({type:'uci',line:'info string invalid position',requestId});
  self.postMessage({type:'uci',line:'bestmove (none)',requestId});
}

self.onmessage=({data})=>{
  try{
    if(data?.action==='stop'){queued=null;if(engine&&searching)engine.postMessage('stop');return} // nothing to stop yet
    if(!data?.fen)return;
    const requestId=data.requestId??null;
    if(broken){self.postMessage({type:'unavailable',message:'Multi-variant Stockfish failed to load',requestId});return}
    const fen=String(data.fen).trim().replace(/\s+/g,' ');
    const engineVariant=VARIANTS[data.variant??'crazyhouse'];
    if(!engineVariant||fen.length>220||!validFen(fen)){reject(requestId);return}
    const searchmoves=(Array.isArray(data.searchmoves)?data.searchmoves:[]).map(String).filter(m=>MOVE.test(m)).map(uciMove).slice(0,320);
    const request={mode:data.mode==='analysis'?'analysis':'bot',engineVariant,fen,elo:data.elo,nodes:data.nodes,depth:data.depth,multipv:clamp(data.multipv,1,10,1),searchmoves,requestId};
    const worker=ensureEngine();
    if(searching){queued=request;worker.postMessage('stop');return}
    start(request);
  }catch{
    self.postMessage({type:'unavailable',message:'Multi-variant Stockfish failed to load',requestId:data?.requestId??null});
  }
};
