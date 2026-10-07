// Splash screen policy (backlog task 6): only installed-app launches get the full splash;
// a first web visit gets a short one (under 600ms in total); a normal refresh gets none.
export const SPLASH_SEEN_KEY='vch.splash-seen';
export const STANDALONE_SPLASH={holdMs:2050,fadeMs:450};
export const FIRST_VISIT_SPLASH={holdMs:380,fadeMs:200};

export function isStandaloneDisplay(win=globalThis){
  try{
    if(win.matchMedia?.('(display-mode: standalone)').matches)return true;
  }catch{}
  return win.navigator?.standalone===true;
}

function readSeen(storage){
  try{return storage?.getItem(SPLASH_SEEN_KEY)==='1';}
  catch{return true;}
}

function markSeen(storage){
  try{storage?.setItem(SPLASH_SEEN_KEY,'1');}catch{}
}

// Returns null when the app should render immediately, otherwise the splash timing.
export function splashPlan({standalone,storage}){
  if(standalone)return STANDALONE_SPLASH;
  if(readSeen(storage))return null;
  markSeen(storage);
  return FIRST_VISIT_SPLASH;
}

export function splashMarkup(plan){
  if(!plan)return '';
  return `<div id="brandSplash" class="brand-splash" aria-hidden="true" style="--splash-fade:${plan.fadeMs}ms">
  <div class="brand-splash-wordmark"><img src="/assets/vch/brand/vch-metal.svg" alt=""></div>
</div>`;
}

export function dismissSplash(element,plan,schedule=setTimeout){
  if(!element||!plan)return;
  schedule(()=>element.classList.add('done'),plan.holdMs);
  schedule(()=>element.remove(),plan.holdMs+plan.fadeMs);
}
