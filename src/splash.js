// Splash screen policy (backlog task 6; owner, 2026-10-06: a splash is for an installed app):
// only installed-app launches get the splash. In a browser, index.html's veil covers the page
// while it loads and fades once it is ready (src/boot-reveal.js; owner, 2026-10-17: the menu
// "does not land naturally" — a first visit used to show the wallpaper, then a short splash,
// then the page).
export const STANDALONE_SPLASH={holdMs:2050,fadeMs:450};

export function isStandaloneDisplay(win=globalThis){
  try{
    if(win.matchMedia?.('(display-mode: standalone)').matches)return true;
  }catch{}
  return win.navigator?.standalone===true;
}

// Returns null when the app should render immediately, otherwise the splash timing.
export function splashPlan({standalone}){
  return standalone?STANDALONE_SPLASH:null;
}

export function splashMarkup(plan){
  if(!plan)return '';
  return `<div id="brandSplash" class="brand-splash" aria-hidden="true" style="--splash-fade:${plan.fadeMs}ms">
  <div class="brand-splash-lockup"><span class="vch-v vch-v-chrome vch-v-shine vch-v-splash"></span><div class="brand-splash-wordmark"><img src="/assets/vch/brand/vch-metal.svg" alt=""></div></div>
</div>`;
}

export function dismissSplash(element,plan,schedule=setTimeout){
  if(!element||!plan)return;
  schedule(()=>element.classList.add('done'),plan.holdMs);
  schedule(()=>element.remove(),plan.holdMs+plan.fadeMs);
}
