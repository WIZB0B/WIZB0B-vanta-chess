// The board's piece layer (backlog V1-fix). One absolutely positioned layer above the
// squares holds every piece; each piece is placed with transform: translate(x,y). Elements
// are kept across renders and only their transform changes, so a move is a compositor-only
// transform transition: no layout, no filter, and the moving piece is always painted above
// the squares and the other pieces.
import { diffPosition, isMoveLike, pieceTransform } from './board-view.js';

export const MOVE_EASING='cubic-bezier(.215,.61,.355,1)'; // ease-out

export class PieceLayer{
  constructor(root){
    this.root=root;
    this.elements=new Map(); // square -> element
    this.flipped=null;
    this.timers=new WeakMap();
  }

  element(square){return this.elements.get(square)||null}

  // `position`: Map<square, pieceKey>. Returns the diff that was applied.
  sync(position,{flipped=false,animate=true,durationMs=120,hint=null}={}){
    const flipChanged=this.flipped!==null&&flipped!==this.flipped;
    this.flipped=flipped;
    const prev=new Map();
    for(const [square,el] of this.elements)prev.set(square,el.dataset.piece);
    const diff=diffPosition(prev,position,{hint});
    const slide=animate&&!flipChanged&&durationMs>0&&isMoveLike(diff);
    const next=new Map();
    for(const square of diff.kept){
      const el=this.elements.get(square);next.set(square,el);
      if(flipChanged)this.place(el,square,0);
    }
    for(const square of diff.removed)this.discard(this.elements.get(square),slide?durationMs:0);
    for(const {from,to} of diff.moved){
      const el=this.elements.get(from);
      this.setPiece(el,position.get(to));el.dataset.square=to;next.set(to,el);
      this.place(el,to,slide?durationMs:0);
    }
    for(const square of diff.added){
      const el=this.create(position.get(square));el.dataset.square=square;
      this.place(el,square,0);this.root.append(el);next.set(square,el);
    }
    this.elements=next;
    return {...diff,animated:slide};
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

  // Moves an element to a square. With a duration the browser runs a transform transition
  // on the compositor; without one the piece jumps (drops, flips, big position changes).
  place(el,square,durationMs){
    clearTimeout(this.timers.get(el));
    if(durationMs>0){
      el.style.transition=`transform ${durationMs}ms ${MOVE_EASING}`;
      el.classList.add('moving');
      this.timers.set(el,setTimeout(()=>{el.classList.remove('moving');el.style.removeProperty('transition')},durationMs+40));
    }else{
      el.style.transition='none';el.classList.remove('moving');
    }
    el.style.transform=pieceTransform(square,this.flipped);
  }

  // A captured piece fades out under the arriving piece (opacity only), then is removed.
  discard(el,durationMs){
    if(!el)return;
    clearTimeout(this.timers.get(el));el.removeAttribute('data-square');
    if(durationMs<=0){el.remove();return}
    el.classList.add('captured');el.classList.remove('moving');
    el.style.transition=`opacity ${durationMs}ms linear`;el.style.opacity='0';
    setTimeout(()=>el.remove(),durationMs+40);
  }
}
