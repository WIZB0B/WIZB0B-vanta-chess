export const REVIEW_DEPTH=16;

export const CLASSIFICATION_META=Object.freeze({
  brilliant:{label:'Brilliant',icon:'brilliant.svg'},
  great:{label:'Great',icon:'great.svg'},
  best:{label:'Best',icon:'best.svg'},
  excellent:{label:'Excellent',icon:'excellent.svg'},
  good:{label:'Good',icon:'good.svg'},
  book:{label:'Book',icon:'book.svg'},
  inaccuracy:{label:'Inaccuracy',icon:'inaccuracy.svg'},
  mistake:{label:'Mistake',icon:'mistake.svg'},
  miss:{label:'Miss',icon:'miss.svg'},
  blunder:{label:'Blunder',icon:'blunder.svg'},
  // Vanta Dark / Blackout Blitz: costly on the real board, sound on the board you could know
  // (src/fog-review.js).
  ambushed:{label:'Ambushed',icon:null}
});
// The Ambushed mark is drawn here (same shape as the other review marks) rather than shipped as
// a file.
const AMBUSHED_MARK='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect x="2" y="2" width="28" height="28" rx="8" fill="#1d2b3b" stroke="#7fb2e0" stroke-width="2" stroke-dasharray="4 2.5"/><circle cx="16" cy="16" r="10.5" fill="none" stroke="#7fb2e0" stroke-opacity=".25"/><text x="16" y="19.25" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="9" font-weight="700" fill="#7fb2e0">Am</text></svg>');

const finite=value=>Number.isFinite(Number(value))?Number(value):0;
const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));

export function lichessWinPercent(centipawns=0){
  const cp=clamp(finite(centipawns),-1000,1000);
  const chances=2/(1+Math.exp(-0.00368208*cp))-1;
  return 50+50*chances;
}

export function moverWinPercent(centipawns,color='w'){
  const white=lichessWinPercent(centipawns);
  return color==='b'?100-white:white;
}

export function winPercentageLoss(beforeCp,afterCp,color='w'){
  return Math.max(0,moverWinPercent(beforeCp,color)-moverWinPercent(afterCp,color));
}

export function classifyMove({beforeCp=0,afterCp=0,color='w',isBook=false,isBest=false,isSacrifice=false}={}){
  if(isBook)return 'book';
  const before=moverWinPercent(beforeCp,color),after=moverWinPercent(afterCp,color);
  const loss=Math.max(0,before-after);
  if(loss>=25)return 'blunder';
  if(before>=65&&after<=45&&loss>=15)return 'miss';
  if(loss>=15)return 'mistake';
  if(loss>=8)return 'inaccuracy';
  if(isBest&&isSacrifice&&loss<=0.35)return 'brilliant';
  if(isBest&&loss<=1)return 'best';
  if(loss<=0.5)return 'great';
  if(loss<=2)return 'excellent';
  return 'good';
}

// Accuracy, as Lichess publishes it (https://lichess.org/page/accuracy). A move's accuracy
// falls exponentially with the winning chances it gives away (a curve fitted so a 20-point drop
// scores about 42 and a 60-point drop about 5; one point is added for engine uncertainty). A
// game's accuracy is the average of two means of its moves' accuracies: one weighted by how
// volatile the position was around each move (calm moves count less), and the harmonic mean,
// which a few bad moves pull down hard. The earlier VCH formula (100*e^(-0.04*mean loss)) was
// our own and read far too high.
export function moveAccuracy(loss=0){
  const drop=Math.max(0,finite(loss));
  if(drop<=0)return 100;
  return clamp(103.1668100711649*Math.exp(-0.04354415386753951*drop)-3.166924740191411+1,0,100);
}
const mean=values=>values.reduce((sum,value)=>sum+value,0)/values.length;
const harmonicMean=values=>values.length/values.reduce((sum,value)=>sum+1/Math.max(1,value),0);
function standardDeviation(values){
  if(values.length<2)return 0;
  const m=mean(values);
  return Math.sqrt(values.reduce((sum,value)=>sum+(value-m)**2,0)/values.length);
}
// Without the positions' win chances (only each move's loss): the plain mean stands in for the
// weighted one.
export function accuracyFromLosses(losses=[]){
  const values=losses.map(finite).filter(value=>value>=0);
  if(!values.length)return 100;
  const accuracies=values.map(moveAccuracy);
  return clamp((mean(accuracies)+harmonicMean(accuracies))/2,0,100);
}
// Both sides' accuracy from White-view evaluations: `cps` holds the centipawns before the first
// move and after every move (length = moves + 1; mates as large numbers). `start` is the side
// that made the first move. Returns {w, b}; a side with no moves gets null.
// `losses` (optional, one per move): a winning-chance loss to use instead of the evaluations'
// for that move (fog-aware review: an Ambushed move counts as its player could judge it).
export function gameAccuracy(cps=[],start='w',{losses=null}={}){
  const wins=cps.map(cp=>lichessWinPercent(cp)),moves=wins.length-1;
  if(moves<1)return {w:null,b:null};
  const size=clamp(Math.floor(moves/10),2,8);
  // One window per move: the first few repeat the opening stretch, then the window slides.
  const windows=[];
  for(let i=0;i<Math.min(size,wins.length)-2;i++)windows.push(wins.slice(0,size));
  for(let i=0;i+size<=wins.length;i++)windows.push(wins.slice(i,i+size));
  if(!windows.length)windows.push(wins);
  const by={w:[],b:[]};
  for(let i=0;i<moves;i++){
    const color=(i%2===0)===(start==='w')?'w':'b';
    const before=color==='w'?wins[i]:100-wins[i],after=color==='w'?wins[i+1]:100-wins[i+1];
    const weight=clamp(standardDeviation(windows[Math.min(i,windows.length-1)]),0.5,12);
    const override=losses?.[i],loss=override!=null&&Number.isFinite(Number(override))?Math.max(0,Number(override)):before-after;
    by[color].push({accuracy:moveAccuracy(loss),weight});
  }
  const side=list=>{
    if(!list.length)return null;
    const total=list.reduce((sum,x)=>sum+x.weight,0);
    const weighted=list.reduce((sum,x)=>sum+x.accuracy*x.weight,0)/total;
    return clamp((weighted+harmonicMean(list.map(x=>x.accuracy)))/2,0,100);
  };
  return {w:side(by.w),b:side(by.b)};
}

export function classificationAsset(key){
  const meta=CLASSIFICATION_META[key]||CLASSIFICATION_META.good;
  if(key==='book')return '/assets/vch/icons/book.svg';
  if(key==='ambushed')return AMBUSHED_MARK;
  return `/assets/vch/icons/review/${meta.icon}`;
}

export function formatMoveDuration(milliseconds){
  const ms=Number(milliseconds);
  if(!Number.isFinite(ms)||ms<0)return null;
  return `${Math.max(1,Math.round(ms/1000))}s`;
}
