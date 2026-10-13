/* Stockfish.js 19 GPLv3 bridge. The vendored single-threaded browser build and
 * complete GPL text live in /engines. Upstream/source details are documented in
 * /engines/README.md. Search remains isolated from the application thread.
 *
 * Requests:
 *   {mode:'bot', fen, elo, nodes, requestId}      fixed node budget, Elo/Skill limited
 *     optional searchmoves: the bot chooses only among these (Vanta Dark, Blackout Blitz)
 *   {mode:'analysis', fen, depth, requestId}      full strength, searches to depth
 *     optional multipv (1-10) and searchmoves ['e2e4', …] (score only those moves)
 *   {action:'stop'}                               stops the current search
 * One search runs at a time. A new request stops the running search and starts once
 * its bestmove arrives, so every output line carries the requestId it belongs to. */
const MIN_NODES=1000, MAX_NODES=2000000, MAX_DEPTH=30;
let engine, searching=false, current=null, queued=null;

const clamp=(value,min,max,fallback)=>{const number=Number(value);return Number.isFinite(number)?Math.max(min,Math.min(max,Math.round(number))):fallback};

function ensureEngine(){
  if(engine)return engine;
  engine=new Worker('/engines/stockfish-19-lite-single.js');
  engine.onmessage=event=>{
    const line=String(event.data);
    if(searching)self.postMessage({type:'uci',line,requestId:current?.requestId??null});
    if(line.startsWith('bestmove ')){
      searching=false;current=null;
      if(queued){const next=queued;queued=null;start(next)}
    }
  };
  engine.onerror=()=>self.postMessage({type:'unavailable',message:'Stockfish 19 failed to load',requestId:current?.requestId??null});
  engine.postMessage('uci');
  return engine;
}

function configureStrength(worker,request){
  worker.postMessage(`setoption name MultiPV value ${request.mode==='analysis'?request.multipv:1}`);
  if(request.mode==='analysis'){
    worker.postMessage('setoption name UCI_LimitStrength value false');
    worker.postMessage('setoption name Skill Level value 20');
    return;
  }
  const requested=clamp(request.elo,800,3190,1500);
  if(requested<1320){
    const skill=requested<1000?0:requested<1150?2:4;
    worker.postMessage('setoption name UCI_LimitStrength value false');
    worker.postMessage(`setoption name Skill Level value ${skill}`);
  }else{
    worker.postMessage('setoption name Skill Level value 20');
    worker.postMessage('setoption name UCI_LimitStrength value true');
    worker.postMessage(`setoption name UCI_Elo value ${requested}`);
  }
}

function goCommand(request){
  if(request.mode==='analysis')return `go depth ${clamp(request.depth,1,MAX_DEPTH,18)}${request.searchmoves.length?` searchmoves ${request.searchmoves.join(' ')}`:''}`;
  return `go nodes ${clamp(request.nodes,MIN_NODES,MAX_NODES,100000)}${request.searchmoves.length?` searchmoves ${request.searchmoves.join(' ')}`:''}`;
}

function start(request){
  const worker=ensureEngine();
  current=request;searching=true;
  configureStrength(worker,request);
  worker.postMessage(`position fen ${request.fen}`);
  worker.postMessage(goCommand(request));
}

self.onmessage=({data})=>{
  try{
    if(data?.action==='stop'){queued=null;if(engine&&searching)engine.postMessage('stop');return} // nothing to stop yet
    const worker=ensureEngine();
    if(!data?.fen)return;
    const searchmoves=(Array.isArray(data.searchmoves)?data.searchmoves:[]).map(String).filter(m=>/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(m)).slice(0,120);
    const request={mode:data.mode==='analysis'?'analysis':'bot',fen:String(data.fen).replace(/[^\w\/ -]/g,''),elo:data.elo,nodes:data.nodes,depth:data.depth,multipv:clamp(data.multipv,1,10,1),searchmoves,requestId:data.requestId??null};
    if(searching){queued=request;worker.postMessage('stop');return}
    start(request);
  }catch{
    self.postMessage({type:'unavailable',message:'Stockfish 19 failed to load',requestId:data?.requestId??null});
  }
};
