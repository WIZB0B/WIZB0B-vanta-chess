// Pointer-driven piece dragging (backlog V1). Pure helpers live here so they can be tested
// without a DOM; main.js wires them to the board's pointer events.

// A press only becomes a drag once the pointer travels this far, so a plain click still
// selects the piece instead of picking it up.
export const DRAG_THRESHOLD_PX=4;

export function dragDistanceExceeded(startX,startY,x,y,threshold=DRAG_THRESHOLD_PX){
  return Math.hypot(x-startX,y-startY)>=threshold;
}

// Maps a viewport point to a square name. `rect` is the board's playing area (inside its
// border); `flipped` means black is at the bottom. Returns null off the board.
export function squareFromPoint(rect,x,y,flipped=false){
  if(!rect||!(rect.width>0)||!(rect.height>0))return null;
  const col=Math.floor((x-rect.left)/rect.width*8),row=Math.floor((y-rect.top)/rect.height*8);
  if(col<0||col>7||row<0||row>7)return null;
  const file=flipped?7-col:col,rank=flipped?row+1:8-row;
  return 'abcdefgh'[file]+rank;
}

// What a drop does. `legalTargets` are the squares the dragged piece may move to.
// - 'move': a legal destination; the move is played without the slide animation.
// - 'deselect': the piece was already selected and was put back on its own square.
// - 'return': anywhere else (its own square, an illegal square, off the board); the piece
//   slides back and stays selected so the player can click a destination instead.
export function dropOutcome({from,to,legalTargets=[],wasSelected=false}){
  if(to&&to!==from&&legalTargets.includes(to))return 'move';
  if(to===from&&wasSelected)return 'deselect';
  return 'return';
}
