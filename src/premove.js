export class PremoveQueue{
  constructor(){this._move=null;this._selected=null}
  get move(){return this._move}
  get selected(){return this._selected}
  select(square){this._move=null;this._selected=square||null;return this._selected}
  queue(to,promotion='q'){
    if(!this._selected||!to||to===this._selected){this.cancel();return null}
    this._move={from:this._selected,to,promotion:promotion||'q'};this._selected=null;return this._move
  }
  cancel(){this._move=null;this._selected=null}
  take(){const move=this._move;this.cancel();return move}
}
export function legalPremove(game,premove){
  if(!premove?.from||!premove?.to)return null;
  const promotion=premove.promotion||'q';let legal;
  try{legal=game.moves({square:premove.from,verbose:true}).find(candidate=>candidate.to===premove.to&&(!candidate.promotion||candidate.promotion===promotion))}catch{return null}
  if(!legal)return null;
  return {from:premove.from,to:premove.to,...(legal.promotion?{promotion}:{})};
}
export function consumeLegalPremove(queue,game){const queued=queue.take();return queued?legalPremove(game,queued):null}
