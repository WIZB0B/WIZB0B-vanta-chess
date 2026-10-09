// Piece reactions: the board answers the mouse before anything is picked up.
//
// - Hover: a piece you may move lifts a little, plays a short gesture of its own (each piece
//   type has one), then leans toward the cursor while the cursor stays on its square.
// - Press: the piece grows slightly and is pulled toward the pointer, so it meets the hand.
// - Hints: legal-move dots grow in when a piece is picked, and the dot under the cursor
//   swells toward it (CSS, see "Piece reactions" in style.css).
//
// Everything here is visual only: no move logic, compositor-friendly properties
// (translate / rotate / scale / transform on the artwork span, never on .board-piece, whose
// transform places the piece on its square). Off for touch, reduced motion and Motion 0.

// Resting hover pose and press pose live in CSS; these are the per-piece gestures played once
// as the cursor arrives. They are deltas on `transform` (identity at both ends), so they
// compose with the resting pose instead of fighting it.
export const GESTURES={
  // Pawn: a small eager hop.
  p:[{transform:'none'},{transform:'translateY(-7%)',offset:.35},{transform:'translateY(1%)',offset:.7},{transform:'none'}],
  // Knight: rears up, head back, then settles.
  n:[{transform:'none'},{transform:'rotate(-9deg) translateY(-3%)',offset:.4},{transform:'rotate(2deg)',offset:.75},{transform:'none'}],
  // Bishop: a gentle sway.
  b:[{transform:'none'},{transform:'rotate(5deg)',offset:.3},{transform:'rotate(-4deg)',offset:.65},{transform:'rotate(1.5deg)',offset:.85},{transform:'none'}],
  // Rook: squats, then stands tall, solid and heavy.
  r:[{transform:'none'},{transform:'scale(1.05,.93)',offset:.3},{transform:'scale(.98,1.04) translateY(-3%)',offset:.65},{transform:'none'}],
  // Queen: a graceful rise and a quarter turn of poise.
  q:[{transform:'none'},{transform:'translateY(-6%) scale(1.04) rotate(-2deg)',offset:.45},{transform:'translateY(-1%) rotate(1deg)',offset:.8},{transform:'none'}],
  // King: a slow, dignified nod.
  k:[{transform:'none'},{transform:'rotate(4deg) translateY(-2%)',offset:.4},{transform:'rotate(-1.5deg)',offset:.75},{transform:'none'}],
};
export const GESTURE_MS={p:380,n:480,b:520,r:440,q:520,k:560};
export const GESTURE_EASING='cubic-bezier(.25,.8,.3,1)';

// How far a piece leans toward the cursor: -1..1 across its square maps to ±MAX_LEAN degrees.
export const MAX_LEAN=5;
export function leanFor(offsetX){
  const x=Math.max(-1,Math.min(1,Number(offsetX)||0));
  return Math.round(x*MAX_LEAN*10)/10;
}
// How far a pressed piece is pulled toward the pointer, as a percentage of its own size.
export const MAX_PULL=14;
export function pullFor(offsetX,offsetY){
  const c=v=>Math.max(-1,Math.min(1,Number(v)||0));
  return {x:Math.round(c(offsetX)*MAX_PULL*10)/10,y:Math.round(c(offsetY)*MAX_PULL*10)/10};
}
// Pointer position inside a square rectangle as -1..1 on each axis (0 = centre).
export function offsetInSquare(rect,x,y){
  if(!rect||!(rect.width>0)||!(rect.height>0))return {x:0,y:0};
  return {x:((x-rect.left)/rect.width)*2-1,y:((y-rect.top)/rect.height)*2-1};
}

export class PieceReactions{
  // `pieceAt(square)` -> the .board-piece element; `canPick(square)` -> may the user pick it;
  // `squareEl(square)` -> the square element; `enabled()` -> motion allowed.
  constructor({pieceAt,canPick,squareEl,enabled}){
    Object.assign(this,{pieceAt,canPick,squareEl,enabled});
    this.hovered=null;this.hoverSquare=null;this.pressed=null;this.hintSquare=null;
  }
  // Pointer moved over the board (not dragging). `square` may be null (off the board).
  hover(square,x,y,{hintTargets=null}={}){
    this.hint(hintTargets&&square&&hintTargets.has(square)?square:null);
    const el=square&&this.canPick(square)?this.pieceAt(square):null;
    if(el!==this.hovered){
      this.clearHover();
      if(el){
        this.hovered=el;this.hoverSquare=square;
        el.classList.add('hovered');this.squareEl(square)?.classList.add('hover-piece');
        if(this.enabled()){
          const type=el.dataset.piece?.[1],art=el.firstElementChild;
          if(art&&GESTURES[type]&&typeof art.animate==='function'){
            art.getAnimations?.().forEach(a=>a.id==='vch-gesture'&&a.cancel());
            const a=art.animate(GESTURES[type],{duration:GESTURE_MS[type],easing:GESTURE_EASING});a.id='vch-gesture';
          }
        }
      }
    }
    if(this.hovered&&this.enabled()){
      const rect=this.squareEl(square)?.getBoundingClientRect();
      this.hovered.style.setProperty('--lean',`${leanFor(offsetInSquare(rect,x,y).x)}deg`);
    }
  }
  clearHover(){
    if(this.hovered){this.hovered.classList.remove('hovered');this.hovered.style.removeProperty('--lean')}
    if(this.hoverSquare)this.squareEl(this.hoverSquare)?.classList.remove('hover-piece');
    this.hovered=null;this.hoverSquare=null;
  }
  // The legal-move dot under the cursor swells toward it.
  hint(square){
    if(square===this.hintSquare)return;
    if(this.hintSquare)this.squareEl(this.hintSquare)?.classList.remove('hint-hover');
    this.hintSquare=square;
    if(square)this.squareEl(square)?.classList.add('hint-hover');
  }
  // Press on a piece: it grows and is pulled toward the pointer until release or drag start.
  press(square,x,y){
    this.release();
    const el=this.pieceAt(square);if(!el)return;
    this.pressed=el;el.classList.add('pressed');
    if(this.enabled()){
      const rect=this.squareEl(square)?.getBoundingClientRect(),o=offsetInSquare(rect,x,y),pull=pullFor(o.x,o.y);
      el.style.setProperty('--pull-x',`${pull.x}%`);el.style.setProperty('--pull-y',`${pull.y}%`);
    }
  }
  release(){
    if(!this.pressed)return;
    this.pressed.classList.remove('pressed');
    this.pressed.style.removeProperty('--pull-x');this.pressed.style.removeProperty('--pull-y');
    this.pressed=null;
  }
  reset(){this.release();this.clearHover();this.hint(null)}
}
