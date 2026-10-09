// Board view geometry (backlog V1-fix / V1b). Pure helpers, no DOM, so they can be unit tested.
// The board is drawn chessground-style: a grid of squares, then ONE absolutely positioned
// piece layer where every piece is placed with transform: translate(col*100%, row*100%),
// then an SVG arrow layer (viewBox 0 0 8 8, one unit per square), then a drag layer.

// Column/row of a square on screen; row 0 is the top edge.
export function squareCoords(square,flipped=false){
  if(!/^[a-h][1-8]$/.test(String(square||'')))return null;
  const file=square.charCodeAt(0)-97,rank=Number(square[1]);
  return {col:flipped?7-file:file,row:flipped?rank-1:8-rank};
}

// Percentages in translate() are relative to the piece's own size (one square), so this
// stays correct at any board size without measuring anything.
export function pieceTransform(square,flipped=false){
  const c=squareCoords(square,flipped);
  return c?`translate(${c.col*100}%,${c.row*100}%)`:'';
}

// 'wq', 'bp', ... for a chess.js board cell.
export function pieceKey(piece){return piece?`${piece.color}${piece.type}`:''}

// Map<square, pieceKey> from chess.js board() output (rank 8 first).
export function positionMap(board){
  const map=new Map();
  board.forEach((row,r)=>row.forEach((piece,f)=>{if(piece)map.set('abcdefgh'[f]+(8-r),pieceKey(piece))}));
  return map;
}

function squareDistance(a,b){
  return Math.hypot(a.charCodeAt(0)-b.charCodeAt(0),Number(a[1])-Number(b[1]));
}

// Works out how the piece layer turns `prev` into `next` (both Map<square, pieceKey>):
// - kept:    squares whose piece is unchanged (element untouched)
// - moved:   {from,to} pairs; the element at `from` slides to `to`
// - added:   squares that get a new element
// - removed: squares whose element goes away (captures)
// `hint` ({from,to}) is the move just played. It is paired first, even across piece types,
// so a promoting pawn slides to the last rank and becomes the new piece. Other changes are
// paired with the nearest vanished piece of the same colour and type (castling rook, a
// position loaded from the server).
export function diffPosition(prev,next,{hint=null}={}){
  const kept=[],moved=[],added=[],vanished=new Set();
  for(const [square,key] of prev){if(next.get(square)===key)kept.push(square);else vanished.add(square)}
  const appeared=[];
  for(const [square,key] of next)if(prev.get(square)!==key)appeared.push(square);
  const pending=[];
  for(const square of appeared){
    if(hint&&hint.to===square&&vanished.has(hint.from)&&prev.get(hint.from)?.[0]===next.get(square)[0]){
      moved.push({from:hint.from,to:square});vanished.delete(hint.from);
    }else pending.push(square);
  }
  for(const square of pending){
    const key=next.get(square);let best=null,bestDistance=Infinity;
    for(const from of vanished){
      if(prev.get(from)!==key)continue;
      const distance=squareDistance(from,square);
      if(distance<bestDistance){best=from;bestDistance=distance}
    }
    if(best){moved.push({from:best,to:square});vanished.delete(best)}else added.push(square);
  }
  return {kept,moved,added,removed:[...vanished]};
}

// Move slide duration (CSS 'ease'): ~150ms for one square up to ~250ms for the longest move
// (a1-h8), in between by distance. `scale` follows the Motion slider (0 = no animation).
export const MOVE_MS_MIN=150,MOVE_MS_MAX=250;
export function moveDurationMs(from,to,scale=1){
  const a=squareCoords(from),b=squareCoords(to);if(!a||!b||!(scale>0))return 0;
  const distance=Math.hypot(a.col-b.col,a.row-b.row),longest=Math.hypot(7,7);
  const t=Math.max(0,Math.min(1,(distance-1)/(longest-1)));
  return Math.round((MOVE_MS_MIN+t*(MOVE_MS_MAX-MOVE_MS_MIN))*scale);
}

// Only single moves are animated (a move, a capture, castling, en passant, promotion).
// Bigger jumps (new game, flipping through review) snap into place.
export function isMoveLike(diff){
  return diff.moved.length>=1&&diff.moved.length<=2&&diff.added.length===0&&diff.removed.length<=1;
}

// ---- Arrows and square marks (V1b) ----

// Right-drag draws arrows, right-click toggles square marks. Modifier keys pick the colour.
export const DEFAULT_ARROW_BRUSH='orange';
export const DEFAULT_SQUARE_BRUSH='red';
export const BRUSHES=['orange','red','green','blue','yellow'];
export function brushFor(kind,{shiftKey=false,ctrlKey=false,metaKey=false,altKey=false}={}){
  if(shiftKey)return 'green';
  if(ctrlKey||metaKey)return 'blue';
  if(altKey)return 'yellow';
  return kind==='arrow'?DEFAULT_ARROW_BRUSH:DEFAULT_SQUARE_BRUSH;
}

export function isKnightJump(from,to){
  const a=squareCoords(from),b=squareCoords(to);if(!a||!b)return false;
  const dc=Math.abs(a.col-b.col),dr=Math.abs(a.row-b.row);
  return (dc===1&&dr===2)||(dc===2&&dr===1);
}

// Shapes: {from, to, brush}; a square mark has to === from (or no `to`).
function sameShape(a,b){return a.from===b.from&&(a.to||a.from)===(b.to||b.from)}
// Drawing a shape that already exists removes it; drawing it in another colour recolours it.
export function toggleShape(shapes,shape){
  const index=shapes.findIndex(existing=>sameShape(existing,shape));
  if(index<0)return [...shapes,shape];
  if(shapes[index].brush===shape.brush)return shapes.filter((_,i)=>i!==index);
  return shapes.map((existing,i)=>i===index?{...existing,brush:shape.brush}:existing);
}

const ARROW_HEAD_LENGTH=.5,ARROW_HEAD_WIDTH=.64,ARROW_START_OFFSET=.18,ARROW_TIP_INSET=.06;
const round=value=>Math.round(value*1000)/1000;

// Geometry of an arrow in board units (one square = 1, origin top-left).
// Returns the shaft polyline and the head triangle. Knight arrows are L-shaped: they run the
// two-square leg first, then turn onto the target square.
export function arrowGeometry(from,to,flipped=false){
  const a=squareCoords(from,flipped),b=squareCoords(to,flipped);
  if(!a||!b||from===to)return null;
  const start={x:a.col+.5,y:a.row+.5},end={x:b.col+.5,y:b.row+.5};
  const points=[start];
  if(isKnightJump(from,to)){
    const longX=Math.abs(end.x-start.x)>Math.abs(end.y-start.y);
    points.push(longX?{x:end.x,y:start.y}:{x:start.x,y:end.y});
  }
  points.push(end);
  // Pull the start a little off the origin centre (straight arrows only; a knight's first
  // leg keeps its corner where it is) and stop the head just short of the target centre.
  const unit=(p,q)=>{const dx=q.x-p.x,dy=q.y-p.y,len=Math.hypot(dx,dy)||1;return {x:dx/len,y:dy/len}};
  const first=unit(points[0],points[1]);
  points[0]={x:points[0].x+first.x*ARROW_START_OFFSET,y:points[0].y+first.y*ARROW_START_OFFSET};
  const prev=points[points.length-2],last=unit(prev,end);
  const tip={x:end.x-last.x*ARROW_TIP_INSET,y:end.y-last.y*ARROW_TIP_INSET};
  const base={x:tip.x-last.x*ARROW_HEAD_LENGTH,y:tip.y-last.y*ARROW_HEAD_LENGTH};
  const normal={x:-last.y,y:last.x},half=ARROW_HEAD_WIDTH/2;
  points[points.length-1]=base;
  return {
    shaft:points.map(p=>({x:round(p.x),y:round(p.y)})),
    head:[tip,{x:base.x+normal.x*half,y:base.y+normal.y*half},{x:base.x-normal.x*half,y:base.y-normal.y*half}].map(p=>({x:round(p.x),y:round(p.y)})),
    knight:points.length===3
  };
}

// SVG markup for the arrow layer. Square marks are drawn on the squares themselves (under
// the pieces), so only arrows go here. `draft` is the arrow being dragged right now.
export function arrowsSvg(shapes,draft,flipped=false){
  const arrows=[...shapes.filter(shape=>shape.to&&shape.to!==shape.from)];
  if(draft?.to&&draft.to!==draft.from)arrows.push({...draft,draft:true});
  return arrows.map(shape=>{
    const g=arrowGeometry(shape.from,shape.to,flipped);if(!g)return '';
    const brush=BRUSHES.includes(shape.brush)?shape.brush:DEFAULT_ARROW_BRUSH;
    return `<g class="arrow arrow-${brush}${shape.draft?' arrow-draft':''}" data-from="${shape.from}" data-to="${shape.to}"${g.knight?' data-knight="true"':''}>`
      +`<polyline points="${g.shaft.map(p=>`${p.x},${p.y}`).join(' ')}"/>`
      +`<polygon points="${g.head.map(p=>`${p.x},${p.y}`).join(' ')}"/></g>`;
  }).join('');
}
