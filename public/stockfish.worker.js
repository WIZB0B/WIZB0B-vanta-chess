/* Stockfish 19 UCI bridge. Deploy the official multi-threaded Stockfish 19
   stockfish.js and stockfish.wasm artifacts beside this file. Keeping the engine
   isolated here prevents search from ever blocking board input or animation. */
let engine;
self.onmessage=async({data})=>{
  if(!engine){
    try{importScripts('/engines/stockfish-19.js');engine=self.Stockfish?.()||self.STOCKFISH?.()}
    catch{self.postMessage({type:'unavailable',message:'Stockfish 19 assets are not installed'});return}
    engine.addMessageListener(line=>self.postMessage({type:'uci',line}));
  }
  const elo=Math.max(1320,Math.min(3190,Number(data.elo)||1500));
  engine.postMessage('setoption name UCI_LimitStrength value true');
  engine.postMessage(`setoption name UCI_Elo value ${elo}`);
  engine.postMessage(`position fen ${data.fen}`);
  engine.postMessage(`go movetime ${data.movetime||350}`);
};
