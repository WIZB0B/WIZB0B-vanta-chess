// Premoves: up to PREMOVE_LIMIT moves queued while the opponent thinks (bullet-style).
// They play one per turn, in order; the first one that isn't legal when its turn comes
// clears the rest.
export const PREMOVE_LIMIT = 3;
export class PremoveQueue{
  constructor(){this._moves=[];this._selected=null}
  get move(){return this._moves[0]||null}
  get moves(){return this._moves.slice()}
  get selected(){return this._selected}
  select(square){this._selected=square||null;return this._selected}
  queue(to,promotion='q'){
    if(!this._selected||!to||to===this._selected){this._selected=null;if(!this._moves.length)this.cancel();return null}
    if(this._moves.length>=PREMOVE_LIMIT){this._selected=null;return null}
    const move={from:this._selected,to,promotion:promotion||'q'};this._moves.push(move);this._selected=null;return move
  }
  cancel(){this._moves=[];this._selected=null}
  take(){const move=this._moves.shift()||null;this._selected=null;return move}
}
export function legalPremove(game,premove){
  if(!premove?.from||!premove?.to)return null;
  const promotion=premove.promotion||'q';let legal;
  try{legal=game.moves({square:premove.from,verbose:true}).find(candidate=>candidate.to===premove.to&&(!candidate.promotion||candidate.promotion===promotion))}catch{return null}
  if(!legal)return null;
  return {from:premove.from,to:premove.to,...(legal.promotion?{promotion}:{})};
}
export function consumeLegalPremove(queue,game){
  const queued=queue.take();if(!queued)return null;
  const legal=legalPremove(game,queued);
  if(!legal)queue.cancel(); // an illegal premove clears the rest of the chain
  return legal;
}
// Where pieces would stand after the queued premoves (no legality check): used to pick up a
// piece for the next premove, e.g. the knight already premoved to f3.
export function premovedPieceAt(game,moves,square){
  const board=new Map();
  for(const row of game.board())for(const cell of row)if(cell)board.set(cell.square,{type:cell.type,color:cell.color});
  for(const m of moves){const piece=board.get(m.from);if(!piece)continue;board.delete(m.from);board.set(m.to,piece)}
  return board.get(square)||null;
}
