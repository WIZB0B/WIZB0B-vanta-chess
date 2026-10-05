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
  blunder:{label:'Blunder',icon:'blunder.svg'}
});

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

export function accuracyFromLosses(losses=[]){
  const values=losses.map(finite).filter(value=>value>=0);
  if(!values.length)return 100;
  const average=values.reduce((sum,value)=>sum+value,0)/values.length;
  return clamp(100*Math.exp(-0.04*average),0,100);
}

export function classificationAsset(key){
  const meta=CLASSIFICATION_META[key]||CLASSIFICATION_META.good;
  if(key==='book')return '/assets/vch/icons/book.svg';
  return `/assets/vch/icons/review/${meta.icon}`;
}

export function formatMoveDuration(milliseconds){
  const ms=Number(milliseconds);
  if(!Number.isFinite(ms)||ms<0)return null;
  return `${Math.max(1,Math.round(ms/1000))}s`;
}
