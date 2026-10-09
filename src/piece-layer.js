// The board's piece layer (backlog V1-fix). One absolutely positioned layer above the
// squares holds every piece; each piece is placed with transform: translate(x,y). Elements
// are kept across renders and only their transform changes. A move is a Web Animations API
// keyframe animation of transform alone (element.animate), started in the same frame as the
// move: the compositor runs it even while the main thread is busy, and the moving piece is
// always painted above the squares and the other pieces.
import { diffPosition, isMoveLike, pieceTransform } from './board-view.js';

export const MOVE_EASING='ease';

// A new animation waits ("pending") for the next frame commit before its clock starts; if that
// commit is late the whole slide shifts a frame. Pinning the start to the move itself makes the
// first painted frame already show the piece under way, however late that frame is.
function startNow(animation){
  const now=document.timeline?.currentTime;
  if(Number.isFinite(now))animation.startTime=now;
}

export class PieceLayer{
  constructor(root){
    this.root=root;
    this.elements=new Map(); // square -> element
    this.flipped=null;
    this.motion=new WeakMap(); // element -> running Animation
  }

  element(square){return this.elements.get(square)||null}

  // `position`: Map<square, pieceKey>. `duration(from,to)` gives each slide's length in ms
  // (0 = jump). Returns the diff that was applied plus `finished`, a promise that settles
  // when every slide and fade started here has ended.
  sync(position,{flipped=false,animate=true,duration=()=>0,hint=null}={}){
    const flipChanged=this.flipped!==null&&flipped!==this.flipped;
    this.flipped=flipped;
    const prev=new Map();
    for(const [square,el] of this.elements)prev.set(square,el.dataset.piece);
    const diff=diffPosition(prev,position,{hint});
    const slide=animate&&!flipChanged&&isMoveLike(diff);
    const next=new Map(),running=[];
    const longest=slide?Math.max(0,...diff.moved.map(({from,to})=>duration(from,to))):0;
    for(const square of diff.kept){
      const el=this.elements.get(square);next.set(square,el);
      if(flipChanged)this.place(el,square,0);
    }
    for(const square of diff.removed){const fade=this.discard(this.elements.get(square),longest);if(fade)running.push(fade)}
    for(const {from,to} of diff.moved){
      const el=this.elements.get(from);
      this.setPiece(el,position.get(to));el.dataset.square=to;next.set(to,el);
      const motion=this.place(el,to,slide?duration(from,to):0);if(motion)running.push(motion);
    }
    for(const square of diff.added){
      const el=this.create(position.get(square));el.dataset.square=square;
      this.place(el,square,0);this.root.append(el);next.set(square,el);
    }
    this.elements=next;
    const finished=Promise.all(running.map(animation=>animation.finished.catch(()=>{}))).then(()=>{});
    return {...diff,animated:running.length>0,durationMs:longest,finished};
  }

  create(key){
    const el=document.createElement('div');
    el.className='board-piece';el.setAttribute('aria-hidden','true');
    el.append(document.createElement('span'));
    this.setPiece(el,key);
    return el;
  }

  setPiece(el,key){
    if(el.dataset.piece===key)return;
    el.dataset.piece=key;
    el.firstChild.className=`piece ${key[0]} piece-${key[1]}`;
    el.classList.toggle('w',key[0]==='w');el.classList.toggle('b',key[0]==='b');
  }

  // Moves an element to a square: the final transform is set at once, and with a duration a
  // keyframe animation slides it there from where it is now. Returns that Animation, if any.
  place(el,square,durationMs){
    const target=pieceTransform(square,this.flipped);
    const running=this.motion.get(el);
    // A piece still sliding (a second move in quick succession) continues from where it is.
    const start=running?.playState==='running'?getComputedStyle(el).transform:el.style.transform;
    running?.cancel();this.motion.delete(el);
    el.style.transform=target;
    if(!(durationMs>0)||!start||start===target){el.classList.remove('moving');return null}
    el.classList.add('moving');
    const animation=el.animate([{transform:start},{transform:target}],{duration:durationMs,easing:MOVE_EASING});
    startNow(animation);
    this.motion.set(el,animation);
    animation.finished.then(()=>{if(this.motion.get(el)===animation){this.motion.delete(el);el.classList.remove('moving')}},()=>{});
    return animation;
  }

  // A captured piece fades out under the arriving piece (opacity only), then is removed.
  discard(el,durationMs){
    if(!el)return null;
    this.motion.get(el)?.cancel();el.removeAttribute('data-square');
    if(!(durationMs>0)){el.remove();return null}
    el.classList.add('captured');el.classList.remove('moving');
    const fade=el.animate([{opacity:1},{opacity:0}],{duration:durationMs,easing:'linear',fill:'forwards'});
    startNow(fade);
    fade.finished.then(()=>el.remove(),()=>el.remove());
    return fade;
  }
}
