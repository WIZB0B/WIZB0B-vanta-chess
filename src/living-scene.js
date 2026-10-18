// The Vchess home scene: one still photograph of a stone pavilion at dusk, brought to life in
// WebGL. Nothing here is video. Each frame the candle flames flicker, lean and stretch; their light
// rises and falls on the stone, the floor and the pieces; the lanterns swing a little on their
// chains; mist drifts through the valley, creeps over the ground and hangs in the lamplight; the
// clouds creep; a few motes of dust turn in the light; and a touch or a moving pointer stirs the air.
//
// The photo stays on screen as a plain <img> (it is the first paint and the fallback); the canvas
// fades in over it once its first frame is drawn, so nothing jumps.

// Positions are in the reference frame of the 3840x2160 master, whatever size is loaded.
export const PAVILION = {
  ref: [3840, 2160],
  lamps: [
    // flame: centre of the bright core; pivot: where the chain meets the stone; bottom: base of the lantern
    { flame: [2294, 794], pivot: [2298, 560], bottom: [2297, 880], halfW: 56, feather: 9, reach: 700, seed: 11 },
    { flame: [3739, 684], pivot: [3727, 300], bottom: [3741, 784], halfW: 70, feather: 14, reach: 620, seed: 29 },
  ],
};

const VERT = `
attribute vec2 aPos;
uniform vec4 uView;
varying vec2 vUv;
varying vec2 vScr;
void main(){
  vScr = aPos*0.5 + 0.5;
  vUv = uView.xy + vec2(vScr.x, 1.0 - vScr.y)*uView.zw;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

// Low-resolution pass: mist densities in screen space. r valley, g ground, b rising wisps, a haze.
const FOG = `
precision highp float;
varying vec2 vUv;
varying vec2 vScr;
uniform sampler2D uNoise;
uniform float uAspect;
uniform vec4 uOffA;   // valley.xy, wisps.xy
uniform vec4 uOffB;   // ground.xy, haze.xy
uniform vec4 uWarp;   // slow warp clocks
uniform vec4 uPtr;    // pointer x, y (image uv), strength, radius (image heights)
uniform vec2 uPush;   // pointer push (image heights)

// fbm of tileable gradient noise; each octave is turned and shifted so no lattice lines up
float fbm(vec2 p){
  float s = 0.0, a = 0.5;
  for(int i = 0; i < 5; i++){ s += a*texture2D(uNoise, p).r; p = mat2(1.6, 1.2, -1.2, 1.6)*p + vec2(0.31, 0.17); a *= 0.5; }
  return s*1.032;
}
float fbmA(vec2 p){
  float s = 0.0, a = 0.5;
  for(int i = 0; i < 4; i++){ s += a*texture2D(uNoise, p).a; p = mat2(1.6, 1.2, -1.2, 1.6)*p + vec2(0.13, 0.29); a *= 0.5; }
  return s*1.067;
}
// A soft, slowly changing bend in the mist (two octaves, so no lattice shows): about a quarter of
// a mist bank, never a swirl.
vec2 bend(vec2 p, vec2 t){
  vec2 q = p*0.37 + t;
  float x = texture2D(uNoise, q).g*0.67 + texture2D(uNoise, mat2(1.6, 1.2, -1.2, 1.6)*q + 0.41).g*0.33;
  float y = texture2D(uNoise, q.yx + vec2(0.53, 0.19)).b*0.67 + texture2D(uNoise, mat2(1.6, -1.2, 1.2, 1.6)*q + 0.77).b*0.33;
  return vec2(x, y) - 0.5;
}
float valley(vec2 uv){
  float band = smoothstep(0.50, 0.585, uv.y)*(1.0 - smoothstep(0.75, 0.80, uv.y));
  if(band <= 0.0) return 0.0;
  // far mist (near the horizon) is finer and slower than near mist: two scales, blended by height
  vec2 P = vec2(uv.x*uAspect, uv.y*1.7)*0.30;
  P += bend(P, uWarp.xy)*0.03;
  float near = fbm(P + uOffA.xy);
  float far = fbm(P*1.7 + uOffA.xy*0.55 + vec2(0.37, 0.61));
  float f = mix(near, far, smoothstep(0.68, 0.54, uv.y));
  float hx = mix(1.0, 0.72, smoothstep(0.15, 0.6, uv.x));
  return smoothstep(0.44, 0.68, f)*band*hx;
}
float wisps(vec2 uv){
  float reg = smoothstep(0.48, 0.30, uv.x)*smoothstep(0.16, 0.34, uv.y)*(1.0 - smoothstep(0.60, 0.70, uv.y));
  if(reg <= 0.0) return 0.0;
  vec2 P = vec2(uv.x*uAspect, uv.y*0.85)*0.5;
  P += bend(P, uWarp.zw)*0.035;
  float f = fbm(P + uOffA.zw);
  return smoothstep(0.50, 0.70, f)*reg;
}
float ground(vec2 uv){
  float reg = smoothstep(0.685, 0.735, uv.y);
  if(reg <= 0.0) return 0.0;
  vec2 P = vec2(uv.x*uAspect, uv.y*2.0)*0.40;
  P += bend(P, uWarp.yx)*0.03;
  float near = fbm(P + uOffB.xy);
  float far = fbm(P*1.5 + uOffB.xy*0.65 + vec2(0.71, 0.23));
  float f = mix(near, far, smoothstep(0.86, 0.72, uv.y));
  return smoothstep(0.46, 0.68, f)*reg*mix(1.0, 0.5, smoothstep(0.74, 1.0, uv.y));
}
float haze(vec2 uv){
  vec2 P = vec2(uv.x*uAspect, uv.y*1.2)*0.45;
  P += bend(P, uWarp.wz)*0.03;
  return smoothstep(0.40, 0.66, fbmA(P + uOffB.zw));
}
void main(){
  vec2 uv = vUv;
  vec2 d = (uv - uPtr.xy)*vec2(uAspect, 1.0);
  float fall = exp(-dot(d, d)/(uPtr.w*uPtr.w));
  vec2 stir = (vec2(-d.y, d.x)*0.6*uPtr.z + uPush)*fall;
  uv -= stir/vec2(uAspect, 1.0);
  float part = 1.0 - 0.45*uPtr.z*fall;
  gl_FragColor = vec4(valley(uv), ground(uv), wisps(uv), haze(uv))*part;
}`;

const COMPOSITE = `
precision highp float;
varying vec2 vUv;
varying vec2 vScr;
uniform sampler2D uPhoto;
uniform sampler2D uMask;   // r background (sky and valley), g lamplight on surfaces, b ground, a sky drift
uniform sampler2D uFog;
uniform sampler2D uGrainTex;
uniform vec2 uRef;
uniform vec4 uLampA;   // lamp 1: flame x, y (at rest), pivot x, y
uniform vec4 uLampB;   // lamp 2: flame x, y (at rest), pivot x, y
uniform vec4 uLampC;   // lamp 1: bottom y, half width, feather, reach
uniform vec4 uLampD;   // lamp 2: bottom y, half width, feather, reach
uniform vec4 uSwing;   // angle 1, angle 2, flame lean 1, flame lean 2
uniform vec4 uFlame;   // stretch 1, stretch 2, flame gain 1, flame gain 2
uniform vec4 uLight;   // surface light 1, surface light 2, halo 1, halo 2
uniform vec4 uGlowAt;  // where the light comes from now: lamp 1 x, y, lamp 2 x, y
uniform vec2 uCloud;   // drift phase 0..1, drift length (reference px)
uniform vec4 uMist;    // strength: valley, ground, wisps, haze
uniform vec4 uGrain;   // offset x, y, amount, unused

vec2 rot(vec2 v, float a){ float c = cos(a), s = sin(a); return vec2(c*v.x - s*v.y, s*v.x + c*v.y); }
float capsule(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba)/dot(ba, ba), 0.0, 1.0); return length(pa - ba*h); }
float skyness(vec3 c){ return smoothstep(0.149, 0.243, c.b - c.r); }

// A lantern swings about the point where its chain meets the stone.
vec2 swing(vec2 p, vec2 pivot, float bottom, float halfW, float feather, float angle){
  float d = capsule(p, pivot + vec2(0.0, 24.0), vec2(pivot.x, bottom));
  float w = (1.0 - smoothstep(halfW, halfW + feather, d))*smoothstep(pivot.y + 50.0, pivot.y + 120.0, p.y);
  return pivot + rot(p - pivot, -angle*w);
}
// A flame leans and stretches from its wick; the wax below stays put.
vec2 flame(vec2 p, vec2 f, float lean, float stretch){
  vec2 base = f + vec2(0.0, 22.0);
  vec2 q = p - base;
  float zone = 1.0 - smoothstep(0.55, 1.0, length(vec2(q.x/30.0, (q.y + 30.0)/56.0)));
  if(zone <= 0.0) return p;
  float h = clamp(-q.y/58.0, 0.0, 1.0);
  vec2 s = vec2(q.x - lean*pow(h, 1.5)*7.0, q.y/mix(1.0, stretch, h));
  return mix(p, base + s, zone);
}
vec2 cloudDir(vec2 uv){
  vec2 rise = vec2(0.75, -0.55);
  float plume = smoothstep(0.46, 0.30, uv.x)*smoothstep(0.30, 0.42, uv.y);
  return normalize(mix(vec2(1.0, -0.08), rise, plume));
}

void main(){
  vec2 uv = vUv;
  vec2 p = uv*uRef;
  vec3 c0 = texture2D(uPhoto, uv).rgb;
  vec4 m = texture2D(uMask, uv);

  // lanterns and flames
  vec2 q = swing(p, uLampA.zw, uLampC.x, uLampC.y, uLampC.z, uSwing.x);
  q = swing(q, uLampB.zw, uLampD.x, uLampD.y, uLampD.z, uSwing.y);
  q = flame(q, uLampA.xy, uSwing.z, uFlame.x);
  q = flame(q, uLampB.xy, uSwing.w, uFlame.y);
  vec3 c = texture2D(uPhoto, q/uRef).rgb;

  // the clouds creep: two copies sliding along the wind, each faded out as it wraps
  if(m.a > 0.002){
    vec2 v = cloudDir(uv)*uCloud.y/uRef;
    float o1 = fract(uCloud.x) - 0.5, o2 = fract(uCloud.x + 0.5) - 0.5;
    float w1 = 1.0 - 2.0*abs(o1), w2 = 1.0 - w1;
    vec3 c1 = texture2D(uPhoto, uv - v*o1).rgb;
    vec3 c2 = texture2D(uPhoto, uv - v*o2).rgb;
    float k1 = w1*skyness(c1), k2 = w2*skyness(c2);
    vec3 cf = c1*k1 + c2*k2 + c*max(0.0, 1.0 - k1 - k2);
    c = mix(c, cf, m.a);
  }

  // lamplight rising and falling on the stone
  vec2 g1 = p - uGlowAt.xy, g2 = p - uGlowAt.zw;
  float d1 = dot(g1, g1), d2 = dot(g2, g2);
  float near1 = 1.0/(1.0 + d1/(uLampC.w*uLampC.w));
  float near2 = 1.0/(1.0 + d2/(uLampD.w*uLampD.w));
  float gain = 1.0 + m.g*((uLight.x - 1.0)*near1 + (uLight.y - 1.0)*near2);
  gain *= 1.0 + (uFlame.z - 1.0)*exp(-d1/2900.0) + (uFlame.w - 1.0)*exp(-d2/2400.0);
  c *= gain;
  vec3 warm = vec3(1.0, 0.63, 0.30);
  c += warm*(uLight.z*(0.6*exp(-d1/7200.0) + 0.4*exp(-d1/64800.0)) + uLight.w*(0.6*exp(-d2/6400.0) + 0.4*exp(-d2/57600.0)));

  // mist: the valley and the rising wisps stay behind the pavilion; the ground mist lies in front
  vec4 fog = texture2D(uFog, vScr);
  float behind = skyness(c0)*m.r;
  float dv = clamp(fog.r*uMist.x + fog.b*uMist.z, 0.0, 0.9)*behind;
  vec3 mistCol = vec3(0.39, 0.50, 0.64)*(0.92 + 0.22*(0.62 - uv.y));
  c = mix(c, mistCol, dv);
  float dg = fog.g*uMist.y*m.b;
  vec3 groundCol = vec3(0.27, 0.33, 0.42) + warm*0.35*near1*uLight.x;
  c = mix(c, groundCol, dg);
  float inside = smoothstep(0.43, 0.50, uv.x)*smoothstep(0.10, 0.20, uv.y)*(1.0 - smoothstep(0.84, 0.92, uv.y));
  float nearStone = (1.0 - skyness(c0))*(1.0 - m.g);
  float lit = near1*uLight.x + near2*uLight.y*0.8;
  float hz = fog.a*uMist.w*inside*(1.0 - 0.85*nearStone);
  c += warm*hz*lit*0.20 + vec3(0.16, 0.21, 0.29)*hz*0.07;

  // a little sensor grain ties it together and hides banding
  float n = texture2D(uGrainTex, gl_FragCoord.xy/64.0 + uGrain.xy).r - 0.5;
  c += n*uGrain.z*(1.2 - dot(c, vec3(0.3, 0.5, 0.2)));
  gl_FragColor = vec4(c, 1.0);
}`;

const MOTE_VERT = `
attribute vec4 aSeed;
uniform vec4 uView;
uniform vec2 uRef;
uniform float uT;
uniform vec4 uGlowAt;   // lamp 1 x, y, lamp 2 x, y
uniform vec2 uBright;   // lamp 1, lamp 2 light (around 1)
uniform vec2 uWind;     // accumulated wind drift (reference px)
uniform float uPx;      // device px per CSS px
uniform float uScale;   // device px per reference px
varying float vA;
void main(){
  bool second = aSeed.w > 0.5;
  vec2 c = second ? uGlowAt.zw : uGlowAt.xy;
  float b = second ? uBright.y : uBright.x;
  float ang = aSeed.x*6.2832, rad = sqrt(fract(aSeed.y*7.13));
  vec2 home = vec2(cos(ang)*210.0, sin(ang)*250.0 + 70.0)*rad;
  float life = fract(uT*(0.020 + aSeed.z*0.025) + aSeed.y);
  vec2 drift = vec2(sin(uT*0.17 + aSeed.z*20.0)*36.0 + sin(uT*0.41 + aSeed.x*13.0)*14.0,
                    (0.5 - life)*170.0 + sin(uT*0.23 + aSeed.y*9.0)*18.0);
  vec2 p = c + home + drift + uWind*(0.4 + aSeed.z*0.8);
  vec2 d = p - c;
  float near = 1.0/(1.0 + dot(d, d)/(105.0*105.0));
  float twinkle = 0.35 + 0.65*pow(0.5 + 0.5*sin(uT*(1.3 + aSeed.z*2.7) + aSeed.x*40.0), 3.0);
  vA = near*twinkle*sin(life*3.1416)*b*(0.55 + 0.45*aSeed.z);
  vec2 s = (p/uRef - uView.xy)/uView.zw;
  gl_Position = vec4(s.x*2.0 - 1.0, 1.0 - s.y*2.0, 0.0, 1.0);
  gl_PointSize = max(1.0, (1.0 + aSeed.z*1.4)*max(uPx, uScale*2.2));
}`;

const MOTE_FRAG = `
precision mediump float;
varying float vA;
void main(){
  vec2 d = gl_PointCoord - 0.5;
  float a = smoothstep(0.5, 0.05, length(d))*vA;
  gl_FragColor = vec4(vec3(1.0, 0.84, 0.62)*a*0.45, 0.0);
}`;

// ---- small helpers -------------------------------------------------------------------------

function mulberry32(seed){
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0)/4294967296; };
}
// Smooth 1D noise in about -1..1 (Catmull-Rom through random values), for flicker and wind.
function noise1(seed){
  const N = 512, v = new Float32Array(N), r = mulberry32(seed);
  for(let i = 0; i < N; i++) v[i] = r()*2 - 1;
  const at = i => v[((i % N) + N) % N];
  return t => {
    const i = Math.floor(t), f = t - i, p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    return 0.5*((2*p1) + (-p0 + p2)*f + (2*p0 - 5*p1 + 4*p2 - p3)*f*f + (-p0 + 3*p1 - 3*p2 + p3)*f*f*f);
  };
}
// Four channels of tileable gradient noise, 256 px with 16 cells, for the mist.
function noiseTexture(seed){
  const size = 256, cells = 16, out = new Uint8Array(size*size*4), r = mulberry32(seed);
  const fade = t => t*t*t*(t*(t*6 - 15) + 10);
  for(let ch = 0; ch < 4; ch++){
    const gx = new Float32Array(cells*cells), gy = new Float32Array(cells*cells);
    for(let i = 0; i < cells*cells; i++){ const a = r()*Math.PI*2; gx[i] = Math.cos(a); gy[i] = Math.sin(a); }
    const g = (ix, iy, dx, dy) => { const i = (iy % cells)*cells + (ix % cells); return gx[i]*dx + gy[i]*dy; };
    for(let y = 0; y < size; y++) for(let x = 0; x < size; x++){
      const fx = (x + 0.5)/size*cells, fy = (y + 0.5)/size*cells, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
      const u = fade(tx), w = fade(ty);
      const a0 = g(x0, y0, tx, ty), a1 = g(x0 + 1, y0, tx - 1, ty), b0 = g(x0, y0 + 1, tx, ty - 1), b1 = g(x0 + 1, y0 + 1, tx - 1, ty - 1);
      const n = (a0 + u*(a1 - a0)) + w*((b0 + u*(b1 - b0)) - (a0 + u*(a1 - a0)));
      out[(y*size + x)*4 + ch] = Math.max(0, Math.min(255, Math.round((n*0.72 + 0.5)*255)));
    }
  }
  return out;
}
const smooth = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0)/(e1 - e0))); return t*t*(3 - 2*t); };
function boxBlur(src, w, h, radius, passes = 2){
  let a = src, b = new Float32Array(w*h);
  for(let pass = 0; pass < passes; pass++){
    for(let y = 0; y < h; y++){ let acc = 0; const row = y*w;
      for(let x = -radius; x <= radius; x++) acc += a[row + Math.min(w - 1, Math.max(0, x))];
      for(let x = 0; x < w; x++){ b[row + x] = acc/(2*radius + 1); acc += a[row + Math.min(w - 1, x + radius + 1)] - a[row + Math.max(0, x - radius)]; } }
    for(let x = 0; x < w; x++){ let acc = 0;
      for(let y = -radius; y <= radius; y++) acc += b[Math.min(h - 1, Math.max(0, y))*w + x];
      for(let y = 0; y < h; y++){ a[y*w + x] = acc/(2*radius + 1); acc += b[Math.min(h - 1, y + radius + 1)*w + x] - b[Math.max(0, y - radius)*w + x]; } }
  }
  return a;
}
function erode(src, w, h, radius){
  const out = new Float32Array(w*h);
  for(let y = 0; y < h; y++) for(let x = 0; x < w; x++){ let m = 1;
    for(let dy = -radius; dy <= radius && m > 0; dy++){ const yy = Math.min(h - 1, Math.max(0, y + dy));
      for(let dx = -radius; dx <= radius; dx++){ const v = src[yy*w + Math.min(w - 1, Math.max(0, x + dx))]; if(v < m) m = v; } }
    out[y*w + x] = m; }
  return out;
}
// Which parts of the photo are sky and valley, where the lamplight falls, and where the ground is,
// read from the photo itself at load (no extra image files).
function sceneMasks(img){
  const w = 480, h = 270, cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  const px = ctx.getImageData(0, 0, w, h).data;
  const bg = new Float32Array(w*h), warm = new Float32Array(w*h), ground = new Float32Array(w*h), sky = new Float32Array(w*h);
  for(let j = 0; j < h; j++) for(let i = 0; i < w; i++){
    const k = j*w + i, r = px[k*4], b = px[k*4 + 2], x = i/w, y = j/h;
    const back = smooth(38, 62, b - r)*(1 - smooth(0.76, 0.80, y));
    bg[k] = back;
    warm[k] = smooth(5, 90, r - b);
    const edge = 0.41 + Math.max(0, y - 0.75)*0.35;
    ground[k] = (1 - back)*smooth(0.69, 0.735, y)*Math.max(1 - smooth(edge - 0.01, edge + 0.03, x), 0.4*smooth(0.94, 0.99, y));
    sky[k] = back*smooth(0.53, 0.45, y);
  }
  const R = boxBlur(bg, w, h, 1), G = boxBlur(warm, w, h, 4), B = boxBlur(ground, w, h, 3), A = boxBlur(erode(sky, w, h, 4), w, h, 3);
  const out = new Uint8Array(w*h*4);
  for(let k = 0; k < w*h; k++){ out[k*4] = R[k]*255; out[k*4 + 1] = G[k]*255; out[k*4 + 2] = B[k]*255; out[k*4 + 3] = A[k]*255; }
  return { w, h, data: out };
}

// ---- the scene -----------------------------------------------------------------------------

export function createLivingScene({ host, img, scene = PAVILION, focus = () => [0.5, 0.5], onFirstFrame, quality = {}, events = host }){
  const canvas = document.createElement('canvas');
  canvas.className = 'living-scene-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  // Only on a real GPU: where the browser would draw it in software (no GPU, or one it distrusts)
  // the scene is not worth the battery or the heat, and the still photograph stays.
  const attrs = { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: true, preserveDrawingBuffer: !!quality.preserve, failIfMajorPerformanceCaveat: !quality.allowSoftware };
  let gl = canvas.getContext('webgl2', attrs);
  const isGL2 = !!gl;
  if(!gl) gl = canvas.getContext('webgl', attrs);
  if(!gl) return null;
  host.appendChild(canvas);

  const [refW, refH] = scene.ref;
  const lamps = scene.lamps;
  const rnd = mulberry32(5);
  const dprCap = quality.dprCap || 2;
  let scale = 1, frameStats = { n: 0, sum: 0 };

  function shader(type, src){
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if(!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader');
    return s;
  }
  function program(vs, fs){
    const p = gl.createProgram(); gl.attachShader(p, shader(gl.VERTEX_SHADER, vs)); gl.attachShader(p, shader(gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(p, 0, 'aPos'); gl.bindAttribLocation(p, 0, 'aSeed'); gl.linkProgram(p);
    if(!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || 'link');
    const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for(let i = 0; i < n; i++){ const info = gl.getActiveUniform(p, i); u[info.name] = gl.getUniformLocation(p, info.name); }
    return { p, u };
  }
  function texture({ w, h, data, source, filter = gl.LINEAR, wrap = gl.CLAMP_TO_EDGE, mip = false }){
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    if(source) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    if(mip) gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mip ? gl.LINEAR_MIPMAP_LINEAR : filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
    return t;
  }

  let progFog, progComp, progMote, tri, motes, moteCount, texPhoto, texMask, texNoise, texGrain, fbo, fogTex, fogW = 0, fogH = 0;
  function init(){
    progFog = program(VERT, FOG); progComp = program(VERT, COMPOSITE); progMote = program(MOTE_VERT, MOTE_FRAG);
    tri = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, tri); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const seeds = [], r = mulberry32(17), perLamp = quality.motes ?? 16;
    for(let l = 0; l < lamps.length; l++) for(let i = 0; i < perLamp; i++) seeds.push(r(), r(), r(), l);
    moteCount = seeds.length/4;
    motes = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, motes); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(seeds), gl.STATIC_DRAW);
    texPhoto = texture({ source: img, mip: isGL2 });
    const mk = sceneMasks(img); texMask = texture(mk);
    texNoise = texture({ w: 256, h: 256, data: noiseTexture(3), wrap: gl.REPEAT, mip: true });
    const grain = new Uint8Array(64*64*4), gr = mulberry32(99); for(let i = 0; i < grain.length; i++) grain[i] = gr()*255;
    texGrain = texture({ w: 64, h: 64, data: grain, filter: gl.NEAREST, wrap: gl.REPEAT });
    fbo = gl.createFramebuffer(); fogTex = null; fogW = fogH = 0;
  }

  // ---- size and framing ----
  let cssW = 1, cssH = 1, view = [0, 0, 1, 1], devW = 1, devH = 1, pxRatio = 1;
  function resize(){
    const rect = host.getBoundingClientRect();
    cssW = Math.max(1, rect.width); cssH = Math.max(1, rect.height);
    let dpr = Math.min(window.devicePixelRatio || 1, dprCap)*scale;
    const budget = quality.pixelBudget || 3.2e6;
    if(cssW*cssH*dpr*dpr > budget) dpr = Math.sqrt(budget/(cssW*cssH));
    pxRatio = dpr;
    devW = Math.round(cssW*dpr); devH = Math.round(cssH*dpr);
    if(canvas.width !== devW || canvas.height !== devH){ canvas.width = devW; canvas.height = devH; }
    const [fx, fy] = focus(cssW, cssH);
    const s = Math.max(cssW/refW, cssH/refH);
    const vw = cssW/(refW*s), vh = cssH/(refH*s);
    view = [fx*(1 - vw), fy*(1 - vh), vw, vh];
    const fw = Math.max(64, Math.round(devW/3)), fh = Math.max(64, Math.round(devH/3));
    if(fw !== fogW || fh !== fogH){
      fogW = fw; fogH = fh;
      if(fogTex) gl.deleteTexture(fogTex);
      fogTex = texture({ w: fw, h: fh, data: null });
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fogTex, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
  }

  // ---- the air: wind, gusts, the touch ----
  const wn = noise1(41), gustNoise = noise1(43);
  // the scene's clock starts at 1000 s (the noise has no start), so the first gust comes 4-10 s in
  const air = { wind: 0.25, gust: 0, gustNext: 1004 + rnd()*6, gustAt: -10, gustAmp: 0, touch: 0, push: [0, 0], ptr: [0.5, 0.5], ptrStrength: 0 };
  const pend = lamps.map((l, i) => ({ a: 0, v: 0, w: 2*Math.PI/(i ? 2.5 : 2.2), n: noise1(l.seed + 101) }));
  const flick = lamps.map(l => [noise1(l.seed), noise1(l.seed + 1), noise1(l.seed + 2), noise1(l.seed + 3), noise1(l.seed + 4), noise1(l.seed + 5), noise1(l.seed + 6)]);
  const off = { valley: [0, 0], wisps: [0, 0], ground: [0, 0], haze: [0, 0], cloud: rnd(), motes: [0, 0] };
  let lastPtr = null;
  function onPointer(e){
    const rect = host.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top, now = performance.now();
    const u = view[0] + x/cssW*view[2], v = view[1] + y/cssH*view[3];
    air.ptr = [u, v];
    if(lastPtr){
      const dt = Math.max(8, now - lastPtr.t), vx = (x - lastPtr.x)/dt, vy = (y - lastPtr.y)/dt;
      const speed = Math.min(3, Math.hypot(vx, vy));
      const k = e.pointerType === 'mouse' ? 0.35 : 1;
      air.touch = Math.min(1.2, air.touch + speed*0.09*k);
      air.ptrStrength = Math.min(1, air.ptrStrength + speed*0.12*k);
      air.push = [air.push[0]*0.6 + vx*0.02*k, air.push[1]*0.6 + vy*0.02*k];
      air.touchDir = Math.sign(vx) || air.touchDir || 1;
    }
    lastPtr = { x, y, t: now };
  }
  function onDown(e){ onPointer(e); air.ptrStrength = Math.min(1, air.ptrStrength + 0.5); air.touch = Math.min(1.2, air.touch + 0.25); }
  function onLeave(){ lastPtr = null; }
  events.addEventListener('pointermove', onPointer, { passive: true });
  events.addEventListener('pointerdown', onDown, { passive: true });
  events.addEventListener('pointerleave', onLeave, { passive: true });

  function step(t, dt){
    // wind: a slow breeze, now and then a gust, and whatever the pointer stirs up
    if(t > air.gustNext){ air.gustAt = t; air.gustAmp = 0.35 + rnd()*0.5; air.gustNext = t + 6 + rnd()*9; }
    const ga = t - air.gustAt;
    air.gust = ga < 0 ? 0 : air.gustAmp*(ga < 0.9 ? smooth(0, 0.9, ga) : Math.exp(-(ga - 0.9)/2.4));
    air.touch *= Math.exp(-dt/1.4); air.ptrStrength *= Math.exp(-dt/1.6);
    air.push = [air.push[0]*Math.exp(-dt/0.8), air.push[1]*Math.exp(-dt/0.8)];
    const breeze = 0.22 + 0.16*wn(t*0.11) + 0.05*gustNoise(t*0.7);
    air.wind = breeze + air.gust + air.touch*(air.touchDir || 1);
    const stir = Math.abs(air.gust) + Math.abs(air.touch);

    // the lanterns swing as damped pendulums pushed by the wind
    pend.forEach((s, i) => {
      const force = 0.13*air.wind + 0.02*s.n(t*0.9);
      for(let k = 0; k < 4; k++){ const h = dt/4; s.v += (-s.w*s.w*s.a - 2*0.07*s.w*s.v + force)*h; s.a += s.v*h; }
      s.a = Math.max(-0.035, Math.min(0.035, s.a));
    });

    // the candles: a slow breath, a quicker shiver, and more of both when the air moves
    const lamp = flick.map(n => {
      let I = 1 + 0.045*n[0](t*0.9) + 0.035*n[1](t*2.7) + 0.025*n[2](t*8.3) + stir*(0.05*n[3](t*5.1) + 0.04*n[4](t*11.0));
      const lean = 0.55*air.wind + 0.28*n[5](t*2.1) + 0.14*n[6](t*6.0) + stir*0.3*n[3](t*3.7);
      const stretch = 1 + 0.9*(I - 1) + 0.045*n[6](t*4.4) - 0.05*stir;
      return { I, lean, stretch };
    });

    // mist drifts with the wind; the clouds keep their own slow pace
    const w = 0.6 + air.wind*0.9;
    off.valley[0] -= dt*0.0040*w*1.7778*0.33; off.valley[1] += dt*0.0004;
    off.wisps[0] -= dt*0.0045*w*1.7778*0.55; off.wisps[1] += dt*0.0050*0.55;
    off.ground[0] -= dt*0.0060*w*1.7778*0.40; off.ground[1] += dt*0.0003;
    off.haze[0] -= dt*0.0060*w*1.7778*0.6; off.haze[1] += dt*0.0008;
    for(const k of ['valley', 'wisps', 'ground', 'haze']) off[k] = off[k].map(v => v - Math.floor(v));
    off.cloud = (off.cloud + dt/14) % 1;
    off.motes = [off.motes[0] + dt*air.wind*9, 0];
    if(Math.abs(off.motes[0]) > 4000) off.motes[0] = 0;
    return lamp;
  }

  // ---- drawing ----
  let t0 = null, last = 0, raf = 0, running = false, first = true, frameNo = 0, clock = 0;
  const debug = quality.debug ? (quality.debugEl || null) : null;
  function draw(now){
    raf = running ? requestAnimationFrame(draw) : 0;
    if(t0 === null){ t0 = now; last = now; }
    const rawDt = (now - last)/1000; last = now;
    const dt = Math.min(0.05, Math.max(0, rawDt));
    clock += dt;
    const t = clock + 1000;
    if(rawDt > 0 && rawDt < 0.1){ frameStats.n++; frameStats.sum += rawDt; }
    if(frameStats.n >= 120){
      const avg = frameStats.sum/frameStats.n; frameStats = { n: 0, sum: 0 };
      if(avg > 0.026 && scale > 0.7){ scale = Math.max(0.7, scale*0.85); resize(); }
      if(debug) debug.textContent = `${(1/avg).toFixed(0)} fps · ${devW}×${devH} · fog ${fogW}×${fogH}`;
    }
    const lamp = step(t, dt);
    render(t, lamp);
    frameNo++;
    if(first){ first = false; onFirstFrame?.(); }
  }
  function render(t, lamp){
    const glowAt = lamps.map((l, i) => {
      const a = pend[i].a*(i ? 0.35 : 1), dx = l.flame[0] - l.pivot[0], dy = l.flame[1] - l.pivot[1];
      const c = Math.cos(a), s = Math.sin(a);
      const fx = l.pivot[0] + c*dx - s*dy, fy = l.pivot[1] + s*dx + c*dy;
      // the light pool moves a little further than the lantern itself, so the swing reads on the stone
      return [fx + (fx - l.flame[0])*2 + lamp[i].lean*3, fy];
    });
    // 1. mist, at a third of the resolution
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo); gl.viewport(0, 0, fogW, fogH);
    gl.disable(gl.BLEND);
    gl.useProgram(progFog.p); const uf = progFog.u;
    gl.bindBuffer(gl.ARRAY_BUFFER, tri); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.uniform4f(uf.uView, ...view);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texNoise); gl.uniform1i(uf.uNoise, 0);
    gl.uniform1f(uf.uAspect, refW/refH);
    gl.uniform4f(uf.uOffA, off.valley[0], off.valley[1], off.wisps[0], off.wisps[1]);
    gl.uniform4f(uf.uOffB, off.ground[0], off.ground[1], off.haze[0], off.haze[1]);
    const wt = t % 1000;
    gl.uniform4f(uf.uWarp, wt*0.0021, wt*0.0013, wt*0.0017, wt*0.0024);
    gl.uniform4f(uf.uPtr, air.ptr[0], air.ptr[1], air.ptrStrength, 0.09);
    gl.uniform2f(uf.uPush, air.push[0]*1.2, air.push[1]*1.2);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // 2. the photograph, lit and moving
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, devW, devH);
    gl.useProgram(progComp.p); const u = progComp.u;
    gl.uniform4f(u.uView, ...view);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texPhoto); gl.uniform1i(u.uPhoto, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texMask); gl.uniform1i(u.uMask, 1);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, fogTex); gl.uniform1i(u.uFog, 2);
    gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, texGrain); gl.uniform1i(u.uGrainTex, 3);
    gl.uniform2f(u.uRef, refW, refH);
    const [A, B] = lamps;
    gl.uniform4f(u.uLampA, A.flame[0], A.flame[1], A.pivot[0], A.pivot[1]);
    gl.uniform4f(u.uLampB, B.flame[0], B.flame[1], B.pivot[0], B.pivot[1]);
    gl.uniform4f(u.uLampC, A.bottom[1], A.halfW, A.feather, A.reach);
    gl.uniform4f(u.uLampD, B.bottom[1], B.halfW, B.feather, B.reach);
    gl.uniform4f(u.uSwing, pend[0].a, pend[1].a*0.35, lamp[0].lean, lamp[1].lean);
    gl.uniform4f(u.uFlame, lamp[0].stretch, lamp[1].stretch, 1 + 1.6*(lamp[0].I - 1), 1 + 1.6*(lamp[1].I - 1));
    const halo = I => Math.max(0, 0.030 + 0.55*(I - 1));
    gl.uniform4f(u.uLight, 1 + 2.0*(lamp[0].I - 1), 1 + 2.0*(lamp[1].I - 1), halo(lamp[0].I), halo(lamp[1].I)*0.8);
    gl.uniform4f(u.uGlowAt, glowAt[0][0], glowAt[0][1], glowAt[1][0], glowAt[1][1]);
    gl.uniform2f(u.uCloud, off.cloud, 30);
    const mist = quality.mist || [0.42, 0.22, 0.26, 0.40];
    gl.uniform4f(u.uMist, ...mist);
    gl.uniform4f(u.uGrain, Math.random(), Math.random(), quality.grain ?? 0.022, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // 3. dust in the lamplight
    if(moteCount){
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
      gl.useProgram(progMote.p); const um = progMote.u;
      gl.bindBuffer(gl.ARRAY_BUFFER, motes); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0);
      gl.uniform4f(um.uView, ...view); gl.uniform2f(um.uRef, refW, refH); gl.uniform1f(um.uT, t % 1000);
      gl.uniform4f(um.uGlowAt, glowAt[0][0], glowAt[0][1], glowAt[1][0], glowAt[1][1]);
      gl.uniform2f(um.uBright, lamp[0].I, lamp[1].I);
      gl.uniform2f(um.uWind, off.motes[0] % 300, 0);
      gl.uniform1f(um.uPx, pxRatio);
      gl.uniform1f(um.uScale, devW/(view[2]*refW));
      gl.drawArrays(gl.POINTS, 0, moteCount);
      gl.disable(gl.BLEND);
    }
  }

  const ro = new ResizeObserver(() => { resize(); if(!running && !first) render(clock + 1000, step(clock + 1000, 0)); });
  function start(){ if(running) return; running = true; last = performance.now(); raf = requestAnimationFrame(draw); }
  function stop(){ running = false; if(raf) cancelAnimationFrame(raf); raf = 0; }
  function onVisibility(){ if(document.hidden) stop(); else if(wanted) start(); }
  let wanted = false;
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); stop(); }, false);
  canvas.addEventListener('webglcontextrestored', () => { init(); fogW = fogH = 0; resize(); if(wanted) start(); }, false);

  try { init(); } catch(error){ canvas.remove(); console.warn('living scene unavailable', error); return null; }
  resize(); ro.observe(host);
  document.addEventListener('visibilitychange', onVisibility);
  return {
    canvas,
    play(){ wanted = true; if(!document.hidden) start(); },
    pause(){ wanted = false; stop(); },
    // for checks: advance the scene by a fixed time step and draw, independent of real time
    stepFor(seconds, fps = 30){ const n = Math.round(seconds*fps); let lamp; for(let i = 0; i < n; i++){ clock += 1/fps; lamp = step(clock + 1000, 1/fps); } render(clock + 1000, lamp || step(clock + 1000, 0)); if(first){ first = false; onFirstFrame?.(); } },
    poke(x, y){ onDown({ clientX: x, clientY: y, pointerType: 'touch' }); },
    destroy(){
      stop(); ro.disconnect(); document.removeEventListener('visibilitychange', onVisibility);
      events.removeEventListener('pointermove', onPointer); events.removeEventListener('pointerdown', onDown); events.removeEventListener('pointerleave', onLeave);
      gl.getExtension('WEBGL_lose_context')?.loseContext(); canvas.remove();
    },
  };
}
