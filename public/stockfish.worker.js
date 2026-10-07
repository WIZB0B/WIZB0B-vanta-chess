/* Stockfish.js 19 GPLv3 bridge. The vendored single-threaded browser build and
 * complete GPL text live in /engines. Upstream/source details are documented in
 * /engines/README.md. Search remains isolated from the application thread.
 *
 * Requests:
 *   {mode:'bot', fen, elo, nodes, requestId}      fixed node budget, Elo/Skill limited
 *   {mode:'analysis', fen, depth, requestId}      full strength, searches to depth
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
  if(request.mode==='analysis')return `go depth ${clamp(request.depth,1,MAX_DEPTH,18)}`;
  return `go nodes ${clamp(request.nodes,MIN_NODES,MAX_NODES,100000)}`;
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
    const worker=ensureEngine();
    if(data?.action==='stop'){queued=null;if(searching)worker.postMessage('stop');return}
    if(!data?.fen)return;
    const request={mode:data.mode==='analysis'?'analysis':'bot',fen:String(data.fen),elo:data.elo,nodes:data.nodes,depth:data.depth,requestId:data.requestId??null};
    if(searching){queued=request;worker.postMessage('stop');return}
    start(request);
  }catch{
    self.postMessage({type:'unavailable',message:'Stockfish 19 failed to load',requestId:data?.requestId??null});
  }
};
