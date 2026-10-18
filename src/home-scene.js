// The home screen's living pavilion (owner, 2026-10-18: "the home screen needs to be alive with the
// lights glowing and flickering and the background fog alive"). The photograph is a plain <img>
// behind the home screen: the first paint, and all there is with reduced motion, Motion at 0 or no
// WebGL. Over it, src/living-scene.js brings the photograph to life while the home screen shows,
// pauses when it leaves, and lets the GPU memory go after a minute away. The scene's code loads
// only when the home screen first shows (a return visit opens on the game and never needs it).

export const HOME_PHOTO = Object.freeze({
  src: '/assets/vch/home/pavilion-2560.webp',
  srcset: '/assets/vch/home/pavilion-1920.webp 1920w, /assets/vch/home/pavilion-2560.webp 2560w, /assets/vch/home/pavilion-3840.webp 3840w',
  // the photograph covers the screen: on screens narrower than 16:9 it is as tall as the screen
  sizes: '(max-aspect-ratio: 16/9) 177.78vh, 100vw',
  alt: 'A stone pavilion on a hilltop at dusk, lit by two candle lanterns, with a giant marble king, queen and knight on a checkered floor and mist in the valley below',
});
export const HOME_RELEASE_MS = 60000;

// Where the photograph is anchored as the screen changes shape: wide screens see the whole valley;
// the narrower the screen, the further it looks into the pavilion, to the lantern and the pieces.
export function homeFocus(width, height){
  const aspect = width/Math.max(1, height), k = Math.min(1, Math.max(0, (1.78 - aspect)/(1.78 - 0.46)));
  return [0.5 + k*0.24, 0.5];
}

const attr = value => String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
// The scene's markup. On a first visit (the home screen shows at once) the photograph loads with
// the page; otherwise it waits in data- attributes until the home screen is first opened.
export function homeSceneMarkup({ eager = true } = {}){
  const load = eager
    ? `src="${HOME_PHOTO.src}" srcset="${HOME_PHOTO.srcset}" fetchpriority="high"`
    : `data-src="${HOME_PHOTO.src}" data-srcset="${HOME_PHOTO.srcset}"`;
  return `<div id="homeScene" class="home-scene" aria-hidden="true"><img class="home-photo" alt="${attr(HOME_PHOTO.alt)}" decoding="async" sizes="${HOME_PHOTO.sizes}" ${load}></div>`;
}

// motionOff(): true when the scene should stay a still photograph (reduced motion, Motion at 0).
const loadLivingScene = async options => (await import('./living-scene.js')).createLivingScene(options);
export function createHomeScene({ host, events = host, motionOff = () => false, create = loadLivingScene, win = globalThis } = {}){
  const img = host?.querySelector('img');
  let scene = null, starting = null, wanted = false, releaseTimer = 0;
  function frame(){
    const [fx, fy] = homeFocus(win.innerWidth || 1, win.innerHeight || 1);
    host.style.setProperty('--home-fx', `${(fx*100).toFixed(2)}%`);
    host.style.setProperty('--home-fy', `${(fy*100).toFixed(2)}%`);
  }
  function load(){
    if(!img || img.getAttribute('src')) return;
    if(img.dataset.srcset) img.setAttribute('srcset', img.dataset.srcset);
    if(img.dataset.src) img.setAttribute('src', img.dataset.src);
  }
  async function ensure(){
    if(scene) return scene;
    if(!starting) starting = (async () => {
      try { await img.decode(); } catch { if(!img.complete) await new Promise(done => { img.addEventListener('load', done, { once: true }); img.addEventListener('error', done, { once: true }); }); }
      if(!wanted || !img.naturalWidth) return null;
      // checks on machines without a GPU can let it draw in software (localStorage vch.scene-software=1)
      let allowSoftware = false; try { allowSoftware = win.localStorage?.getItem('vch.scene-software') === '1'; } catch {}
      const made = await create({ host, img, events, focus: homeFocus, quality: { allowSoftware }, onFirstFrame(){ win.requestAnimationFrame?.(() => made?.canvas?.classList.add('on')); } });
      if(!wanted){ made?.destroy(); return null; }
      scene = made || null;
      return scene;
    })().finally(() => { starting = null; });
    return starting;
  }
  if(host){ frame(); win.addEventListener?.('resize', frame, { passive: true }); }
  return {
    get scene(){ return scene; },
    show(){
      if(!host) return;
      wanted = true; win.clearTimeout(releaseTimer); load(); frame();
      if(motionOff()){ scene?.pause(); return; }
      void ensure().then(s => { if(s && wanted && !motionOff()) s.play(); });
    },
    hide(){
      wanted = false; scene?.pause(); win.clearTimeout(releaseTimer);
      // a minute away and the scene lets its GPU memory go; it is made again on the way back
      releaseTimer = win.setTimeout(() => { if(!wanted && scene){ scene.destroy(); scene = null; } }, HOME_RELEASE_MS);
    },
  };
}
