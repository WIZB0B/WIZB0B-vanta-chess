// Game feel: captured-pieces trays, the game-end moment, review reactions and haptics.
// Pure helpers here; src/main.js wires them to the board.
import { VALUES } from './piece-expressions.js';

const START={p:8,n:2,b:2,r:2,q:1};
export const TRAY_ORDER=['q','r','b','n','p'];

// Pieces each side has captured, worked out from what is missing on the board.
// {w:[...black pieces White took], b:[...white pieces Black took], lead:{w,b}}
// Promotions can make a type "over-complete"; it then counts as zero missing.
export function capturedPieces(board){
  const count={w:{p:0,n:0,b:0,r:0,q:0},b:{p:0,n:0,b:0,r:0,q:0}};
  for(const row of board)for(const cell of row)if(cell&&cell.type!=='k')count[cell.color][cell.type]++;
  const taken=color=>TRAY_ORDER.flatMap(type=>Array(Math.max(0,START[type]-count[color][type])).fill(type));
  const material=color=>Object.entries(count[color]).reduce((sum,[type,n])=>sum+VALUES[type]*n,0);
  const diff=material('w')-material('b');
  return {w:taken('b'),b:taken('w'),lead:{w:Math.max(0,diff),b:Math.max(0,-diff)}};
}

// Who cheers and which king falls when the game ends. result: '1-0' | '0-1' | '1/2-1/2'.
export function endingCast(result){
  if(result==='1-0')return {winner:'w',loser:'b'};
  if(result==='0-1')return {winner:'b',loser:'w'};
  if(result==='1/2-1/2')return {draw:true};
  return null;
}

// Review: how the moved piece reacts to its move's grade.
export const REVIEW_REACTION={
  brilliant:'triumph',great:'triumph',best:'proud',excellent:'proud',good:null,book:null,
  inaccuracy:'unsure',mistake:'slump',miss:'slump',blunder:'despair',
};

// Phone haptics (vibration patterns in ms). Only on touch input, never with reduced motion.
export const HAPTICS={pick:8,move:12,capture:28,check:[22,40,22]};
export function hapticFor(made,inCheck){
  if(inCheck)return HAPTICS.check;
  if(made?.captured)return HAPTICS.capture;
  return HAPTICS.move;
}
