// Piece expressions (prototype): pieces show how their position feels, and a landing can
// send a shockwave through the board.
//
// Moods come only from what is plainly on the board (who attacks and defends what, and the
// material balance), never from the engine, so they can't hint at moves a player hasn't
// seen during a live game. See docs/VCH-BACKLOG.md "Expressions" for the fair-play rules.
//
//   fear     the piece is attacked and not safely defended (or its king is in check):
//            it trembles and leans away from the attacker.
//   attack   it attacks an enemy piece that is worth more or is undefended: it leans
//            toward that piece and lunges now and then.
//   courage  it is attacked but properly defended: it stands tall and breathes.
//   shock    one-off jolt when a shockwave reaches it.
//
// Landing: every drop sends a small ring through its square. If the moving side is ahead in
// material (SHOCK_LEAD or more) and lands within SHOCK_RADIUS squares of enemy pieces, the
// ring becomes a shockwave across the board and those enemy pieces flinch, nearest first.

export const VALUES={p:1,n:3,b:3,r:5,q:9,k:100};
export const SHOCK_LEAD=2;
export const SHOCK_RADIUS=2;

const FILES='abcdefgh';
export function coords(square){return {f:FILES.indexOf(square[0]),r:Number(square[1])-1}}
export function distance(a,b){const A=coords(a),B=coords(b);return Math.max(Math.abs(A.f-B.f),Math.abs(A.r-B.r))}

// Material balance from White's point of view (kings excluded).
export function materialBalance(board){
  let sum=0;
  for(const row of board)for(const cell of row)if(cell&&cell.type!=='k')sum+=(cell.color==='w'?1:-1)*VALUES[cell.type];
  return sum;
}

// Screen angle (degrees, 0 = up, clockwise) from one square toward another, for leaning.
export function bearing(from,to,flipped=false){
  const A=coords(from),B=coords(to);
  let dx=B.f-A.f,dy=B.r-A.r;if(flipped){dx=-dx;dy=-dy}
  return Math.round(Math.atan2(dx,dy)*180/Math.PI);
}

// Map<square,{mood,toward?}> for every piece that has something to express.
export function analyzeMoods(chess){
  const moods=new Map(),board=chess.board();
  const cheapest=squares=>Math.min(...squares.map(s=>VALUES[chess.get(s).type]));
  for(const row of board)for(const cell of row){
    if(!cell)continue;
    const {square,type,color}=cell,enemy=color==='w'?'b':'w';
    const attackers=chess.attackers(square,enemy),defenders=chess.attackers(square,color);
    if(type==='k'){
      if(attackers.length)moods.set(square,{mood:'fear',toward:attackers[0]});
      continue;
    }
    if(attackers.length&&(!defenders.length||cheapest(attackers)<VALUES[type])){
      moods.set(square,{mood:'fear',toward:attackers[0]});continue;
    }
    // Targets this piece attacks: worth more than it, or left undefended.
    let target=null,best=-1;
    for(const row2 of board)for(const other of row2){
      if(!other||other.color!==enemy||other.type==='k')continue;
      if(!chess.attackers(other.square,color).includes(square))continue;
      const undefended=!chess.attackers(other.square,enemy).length;
      if(VALUES[other.type]>VALUES[type]||undefended){
        const score=VALUES[other.type]+(undefended?.5:0);
        if(score>best){best=score;target=other.square}
      }
    }
    if(target){moods.set(square,{mood:'attack',toward:target});continue}
    if(attackers.length){
      const nearest=attackers.reduce((a,b)=>distance(square,b)<distance(square,a)?b:a);
      moods.set(square,{mood:'courage',toward:nearest});
    }
  }
  return moods;
}

// Rated games: expressions stay on but never give a plan away. A mood is kept only when
// the threat behind it is in plain contact (the two pieces are next to each other), or a
// king is in check (already announced). Long-range bishop, rook and queen threats stay
// hidden, so those captures can still come as a surprise, and no hanging piece is flagged.
export function fairMoods(moods,chess){
  const fair=new Map();
  for(const [square,m] of moods){
    const piece=chess.get(square);
    if(piece?.type==='k'&&m.mood==='fear'){fair.set(square,m);continue}
    if(m.mood==='fear')continue;
    if(m.toward&&distance(square,m.toward)<=1)fair.set(square,m);
  }
  return fair;
}

// What a landing on `to` by `color` sets off, given the position after the move.
// {ring:true, shock:false} for an ordinary landing; with shock, `hit` lists the enemy
// squares within SHOCK_RADIUS, nearest first, each with its distance.
export function landingImpact(chess,to,color){
  const lead=materialBalance(chess.board())*(color==='w'?1:-1);
  const hit=[];
  if(lead>=SHOCK_LEAD){
    for(const row of chess.board())for(const cell of row){
      if(!cell||cell.color===color)continue;
      const d=distance(to,cell.square);
      if(d<=SHOCK_RADIUS)hit.push({square:cell.square,distance:d});
    }
    hit.sort((a,b)=>a.distance-b.distance);
  }
  return {ring:true,shock:hit.length>0,lead,hit};
}
