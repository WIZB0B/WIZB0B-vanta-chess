// The Vchess home scene: one still photograph of a stone pavilion at dusk, brought to life in
// WebGL. Nothing here is video and nothing loops. Each frame:
// - fog rolls through the valley and past the openings behind the pieces, thinning and thickening
//   the fog already in the photograph as banks and gaps drift through it; wisps rise on the left;
//   a thin ground mist slides over the hilltop and the steps;
// - the clouds move at a pace you can see;
// - every candle flickers, leans and stretches, and its light rises and falls on whatever it lights,
//   inside the pavilion and out on the steps and the path, in proportion to how much of that light
//   is its own (each lantern's share falls off with the square of the distance);
// - the lanterns sway a little on their chains, dust turns in their light, and a touch stirs the air.
//
// The photo stays on screen as a plain <img> (it is the first paint and the fallback); the canvas
// fades in over it once its first frame is drawn, so nothing jumps.

// Positions are in the reference frame of the 3840x2160 master, whatever size is loaded.
export const PAVILION = {
  ref: [3840, 2160],
  // eye level, as a fraction of the height: the fog lying in the valley vanishes toward it
  horizon: 0.515,
  // the near hilltop and the steps start below this line (fractions of the width and height)
  ground: { pavilionX: 0.43, steps: 0.865 },
  // the column of fog rising on the left: x from, x to (fading), y from, y to (fractions)
  plume: [0.13, 0.22, 0.26, 0.68],
  lamps: [
    // flame: centre of the bright core; pivot: where the chain meets the stone; bottom: base of the
    // lantern; halfW: half its width; swing: how freely it swings (0 for a far one)
    { flame: [2294, 794], pivot: [2298, 560], bottom: [2297, 880], halfW: 56, swing: 1, seed: 11 },
    { flame: [3739, 684], pivot: [3727, 300], bottom: [3741, 784], halfW: 70, swing: 0.35, seed: 29 },
  ],
};
export const MAX_LAMPS = 8;

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

// Low-resolution pass, in screen space: r how the fog thickens and thins as it drifts (0.5 as in
// the photo), g the ground mist, b unused, a the haze in the lamplight.
const FOG = `
precision highp float;
varying vec2 vUv;
varying vec2 vScr;
uniform sampler2D uNoise;
uniform float uAspect;
uniform float uHorizon;
uniform vec4 uBreath;  // drift x, y (noise units), strength, unused
uniform vec4 uGround;  // drift (world units), evolution clock, strength, unused
uniform vec4 uHaze;    // drift x, y, strength, unused
uniform vec4 uPtr;     // pointer x, y (image uv), strength, radius (image heights)
uniform vec2 uPush;    // pointer push (image heights)

const mat2 ROT = mat2(1.6, 1.2, -1.2, 1.6);
// fbm of tileable gradient noise (median 0.50, 5% below 0.35, 5% above 0.65); each octave is
// turned and shifted so no lattice lines up
float fbm(vec2 p){
  float s = 0.0, a = 0.5;
  for(int i = 0; i < 5; i++){ s += a*texture2D(uNoise, p).r; p = ROT*p + vec2(0.31, 0.17); a *= 0.5; }
  return s*1.032;
}
float fbm3(vec2 p){
  float s = 0.0, a = 0.5;
  for(int i = 0; i < 3; i++){ s += a*texture2D(uNoise, p).a; p = ROT*p + vec2(0.13, 0.29); a *= 0.5; }
  return s*1.143;
}
// how the fog thickens and thins: broad, slow patches drifting with it
float breath(vec2 uv){
  vec2 P = vec2(uv.x*uAspect, uv.y)*0.55 + uBreath.xy;
  return 0.5 + (fbm3(P) - 0.5)*2.2*uBreath.z;
}
// a thin ground mist sliding over the hilltop and the steps, in long low streaks, seen in
// perspective (far and slow near the horizon, near and quicker at the bottom)
float groundMist(vec2 uv){
  float dy = uv.y - uHorizon;
  if(dy < 0.12) return 0.0;
  float d = 0.05/dy;
  vec2 P = vec2((uv.x - 0.5)*uAspect*d*1.6, d*3.0) + vec2(uGround.x, 0.0);
  P += (vec2(texture2D(uNoise, P*0.37 + uGround.y*0.004).g, texture2D(uNoise, P.yx*0.37 - uGround.y*0.003).b) - 0.5)*0.06;
  return smoothstep(0.54, 0.70, fbm(P))*uGround.z;
}
float haze(vec2 uv){
  vec2 P = vec2(uv.x*uAspect, uv.y*1.2)*0.45 + uHaze.xy;
  return smoothstep(0.40, 0.66, fbm3(P))*uHaze.z;
}
void main(){
  vec2 uv = vUv;
  vec2 d = (uv - uPtr.xy)*vec2(uAspect, 1.0);
  float fall = exp(-dot(d, d)/(uPtr.w*uPtr.w));
  vec2 stir = (vec2(-d.y, d.x)*0.6*uPtr.z + uPush)*fall;
  uv -= stir/vec2(uAspect, 1.0);
  float part = 1.0 - 0.45*uPtr.z*fall;
  gl_FragColor = vec4(clamp(breath(uv) - 0.25*uPtr.z*fall, 0.0, 1.0), groundMist(uv)*part, 0.0, haze(uv));
}`;

const COMPOSITE = `
precision highp float;
varying vec2 vUv;
varying vec2 vScr;
uniform sampler2D uPhoto;
uniform sampler2D uMask;   // r far (sky, valley, openings), g lamplit, b near ground, a sky the clouds move in
uniform sampler2D uAmb;    // rgb the land under the fog (the photo with its fog thinned), a how foggy the photo is
uniform sampler2D uFog;
uniform sampler2D uGrainTex;
uniform vec2 uRef;
uniform int uLampN;
uniform vec4 uLampA[${MAX_LAMPS}];   // flame x, y (at rest); pivot x, y
uniform vec4 uLampB[${MAX_LAMPS}];   // bottom y, half width, size (1 = a near lantern), swing angle
uniform vec4 uLampC[${MAX_LAMPS}];   // flame lean, flame stretch, light on the stone, halo
uniform vec4 uLampD[${MAX_LAMPS}];   // where its light comes from now: x, y; flame gain; unused
uniform vec4 uCloud;   // phase, drift per phase (reference px), direction x, y
uniform vec3 uFogCol;  // the colour of the fog in the photograph
uniform vec4 uFogFlow; // phase, drift per phase (reference px), unused, unused
uniform vec4 uFogZone; // where the pavilion begins (x), the horizon (y), speed beyond the pavilion, unused
uniform vec4 uPlume;   // the rising column of fog: x from, x to (fading), y from, y to
uniform vec4 uMist;    // strength: unused, ground mist, unused, haze
uniform vec4 uGrain;   // offset x, y, amount, unused
uniform int uDebug;    // checks only: 1 fog, 2 masks, 3 the land under the fog, 4 how foggy the photo is

vec2 rot(vec2 v, float a){ float c = cos(a), s = sin(a); return vec2(c*v.x - s*v.y, s*v.x + c*v.y); }
float capsule(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba)/dot(ba, ba), 0.0, 1.0); return length(pa - ba*h); }
float skyness(vec3 c){ return smoothstep(0.149, 0.243, c.b - c.r); }

// A lantern swings about the point where its chain meets the stone.
vec2 swing(vec2 p, vec2 pivot, float bottom, float halfW, float angle){
  float feather = 0.2*halfW;
  float d = capsule(p, pivot + vec2(0.0, 0.4*halfW), vec2(pivot.x, bottom));
  float w = (1.0 - smoothstep(halfW, halfW + feather, d))*smoothstep(pivot.y + 0.9*halfW, pivot.y + 2.1*halfW, p.y);
  return pivot + rot(p - pivot, -angle*w);
}
// A flame leans and stretches from its wick; the wax below stays put.
vec2 flame(vec2 p, vec2 f, float size, float lean, float stretch){
  vec2 base = f + vec2(0.0, 22.0*size);
  vec2 q = (p - base)/size;
  float zone = 1.0 - smoothstep(0.55, 1.0, length(vec2(q.x/30.0, (q.y + 30.0)/56.0)));
  if(zone <= 0.0) return p;
  float h = clamp(-q.y/58.0, 0.0, 1.0);
  vec2 s = vec2(q.x - lean*pow(h, 1.5)*7.0, q.y/mix(1.0, stretch, h));
  return mix(p, base + s*size, zone);
}

void main(){
  vec2 uv = vUv;
  vec2 p = uv*uRef;
  vec3 c0 = texture2D(uPhoto, uv).rgb;
  vec4 m = texture2D(uMask, uv);

  // lanterns and flames
  vec2 q = p;
  for(int i = 0; i < ${MAX_LAMPS}; i++){
    if(i >= uLampN) break;
    vec4 A = uLampA[i], B = uLampB[i], C = uLampC[i];
    if(abs(p.x - A.z) < 3.0*B.y && p.y > A.w - 20.0 && p.y < B.x + 2.0*B.y){
      if(B.w != 0.0) q = swing(q, A.zw, B.x, B.y, B.w);
      q = flame(q, A.xy, B.z, C.x, C.y);
    }
  }
  vec3 c = texture2D(uPhoto, q/uRef).rgb;

  // where the drifting fog is: the land beyond the hilltop, the column of fog rising on the left,
  // and the far valley seen past the pavilion
  float plumeW = smoothstep(uPlume.y, uPlume.x, uv.x)*smoothstep(uPlume.z, uPlume.z + 0.14, uv.y)*(1.0 - smoothstep(uPlume.w - 0.06, uPlume.w + 0.02, uv.y));
  float left = 1.0 - smoothstep(uFogZone.x - 0.02, uFogZone.x + 0.01, uv.x);
  float zone = max(m.r, plumeW*smoothstep(0.0, 0.1, m.a + m.r));

  // the clouds move: two copies sliding along the wind, each faded out as it wraps round, and the
  // moment each one wraps differs from place to place, so the sky never pulses as one
  float skyW = m.a*(1.0 - plumeW);
  if(skyW > 0.002){
    float off = 0.5*sin(uv.x*5.3 + uv.y*3.1) + 0.5*sin(uv.x*2.1 - uv.y*7.7 + 1.3);
    float o1 = fract(uCloud.x + off*0.35) - 0.5, o2 = fract(uCloud.x + off*0.35 + 0.5) - 0.5;
    float w1 = 1.0 - 2.0*abs(o1), w2 = 1.0 - w1;
    vec2 v = uCloud.zw*uCloud.y/uRef;
    vec3 c1 = texture2D(uPhoto, uv - v*o1).rgb;
    vec3 c2 = texture2D(uPhoto, uv - v*o2).rgb;
    float k1 = w1*skyness(c1), k2 = w2*skyness(c2);
    vec3 cf = c1*k1 + c2*k2 + c*max(0.0, 1.0 - k1 - k2);
    c = mix(c, cf, skyW);
  }

  // the fog in the photograph drifts: the land under it stays put, and the light the fog adds is
  // carried along the wind (rising where the fog rises), thickening and thinning as it goes
  vec4 fog = texture2D(uFog, vScr);
  vec4 amb = texture2D(uAmb, uv);
  if(zone > 0.002){
    vec2 dir = normalize(mix(vec2(1.0, 0.04), vec2(0.55, -0.85), plumeW));
    float sp = mix(1.0, 0.7, plumeW)*mix(uFogZone.z, 1.0, left);
    vec2 v = dir*sp*uFogFlow.y/uRef;
    float ph = uFogFlow.x + 0.35*(0.5*sin(uv.x*4.1 + uv.y*6.3 + 0.7) + 0.5*sin(uv.x*7.3 - uv.y*2.9 + 2.1));
    float o1 = fract(ph) - 0.5, o2 = fract(ph + 0.5) - 0.5;
    float w1 = 1.0 - 2.0*abs(o1), w2 = 1.0 - w1;
    vec2 u1 = uv - v*o1, u2 = uv - v*o2;
    vec4 a1 = texture2D(uAmb, u1), a2 = texture2D(uAmb, u2);
    vec3 p1 = texture2D(uPhoto, u1).rgb, p2 = texture2D(uPhoto, u2).rgb;
    const vec3 L = vec3(0.3, 0.55, 0.15);
    // the light the fog adds there (its brightness over the land beneath it), carried here
    float d1 = max(0.0, dot(p1 - a1.rgb, L))*a1.a, d2 = max(0.0, dot(p2 - a2.rgb, L))*a2.a;
    float here = max(0.0, dot(c - amb.rgb, L))*amb.a;
    float thick = 1.0 + (fog.r - 0.5)*1.6;
    float add = (d1*w1 + d2*w2)*thick - here;
    // fog has the colour of the fog: what it adds or takes away is tinted by it
    vec3 tint = uFogCol/max(dot(uFogCol, L), 0.05);
    vec3 moved = clamp(c + tint*add, vec3(0.0), max(c, max(p1, p2)));
    c = mix(c, moved, zone);
  }

  // candlelight: each lantern's share of the light here falls off with the square of the distance;
  // the lit stone brightens and dims with the lanterns that light it, inside and out
  float wsum = 0.0, lsum = 0.0;
  vec3 glow = vec3(0.0);
  vec3 warm = vec3(1.0, 0.63, 0.30);
  for(int i = 0; i < ${MAX_LAMPS}; i++){
    if(i >= uLampN) break;
    vec4 B = uLampB[i], C = uLampC[i], D = uLampD[i];
    vec2 g = (p - D.xy)/B.z;
    float d2 = dot(g, g);
    float e = 1.0/(14400.0 + d2);              // inverse square, softened inside 120 px
    wsum += e; lsum += e*C.z;
    // the bright core and the halo in the glass, right round the flame
    c *= 1.0 + (D.z - 1.0)*exp(-d2/2900.0);
    glow += warm*C.w*(0.6*exp(-d2/7200.0) + 0.4*exp(-d2/64800.0));
  }
  float share = lsum/max(wsum, 1e-6);           // the light here, relative to the photograph
  c *= 1.0 + m.g*(share - 1.0);
  c += glow;

  // the ground mist lies in front, on the hilltop and the steps
  float dg = fog.g*uMist.y*m.b;
  c = mix(c, uFogCol*0.62 + warm*0.06*m.g, dg);
  float inside = smoothstep(0.43, 0.50, uv.x)*smoothstep(0.10, 0.20, uv.y)*(1.0 - smoothstep(0.84, 0.92, uv.y));
  float nearStone = (1.0 - skyness(c0))*(1.0 - m.g);
  c += warm*fog.a*uMist.w*inside*(1.0 - 0.85*nearStone)*min(wsum*30000.0, 1.5)*0.12;

  // a little sensor grain ties it together and hides banding
  float n = texture2D(uGrainTex, gl_FragCoord.xy/64.0 + uGrain.xy).r - 0.5;
  c += n*uGrain.z*(1.2 - dot(c, vec3(0.3, 0.5, 0.2)));
  gl_FragColor = vec4(c, 1.0);
  if(uDebug == 1) gl_FragColor = vec4(fog.r, fog.g, zone, 1.0);
  if(uDebug == 2) gl_FragColor = vec4(m.rgb, 1.0) + vec4(m.a*0.5);
  if(uDebug == 3) gl_FragColor = vec4(amb.rgb, 1.0);
  if(uDebug == 4) gl_FragColor = vec4(vec3(amb.a), 1.0);
}`;

const MOTE_VERT = `
attribute vec4 aSeed;
uniform vec4 uView;
uniform vec2 uRef;
uniform float uT;
uniform vec4 uLamp;     // this lantern's light: x, y, brightness (around 1), size
uniform vec2 uWind;     // accumulated wind drift (reference px)
uniform float uPx;      // device px per CSS px
uniform float uScale;   // device px per reference px
varying float vA;
void main(){
  vec2 c = uLamp.xy;
  float b = uLamp.z, sz = uLamp.w;
  float ang = aSeed.x*6.2832, rad = sqrt(fract(aSeed.y*7.13));
  vec2 home = vec2(cos(ang)*210.0, sin(ang)*250.0 + 70.0)*rad*sz;
  float life = fract(uT*(0.020 + aSeed.z*0.025) + aSeed.y);
  vec2 drift = vec2(sin(uT*0.17 + aSeed.z*20.0)*36.0 + sin(uT*0.41 + aSeed.x*13.0)*14.0,
                    (0.5 - life)*170.0 + sin(uT*0.23 + aSeed.y*9.0)*18.0)*sz;
  vec2 p = c + home + drift + uWind*(0.4 + aSeed.z*0.8)*sz;
  vec2 d = (p - c)/sz;
  float near = 1.0/(1.0 + dot(d, d)/(105.0*105.0));
  float twinkle = 0.35 + 0.65*pow(0.5 + 0.5*sin(uT*(1.3 + aSeed.z*2.7) + aSeed.x*40.0), 3.0);
  vA = near*twinkle*sin(life*3.1416)*b*(0.55 + 0.45*aSeed.z);
  vec2 s = (p/uRef - uView.xy)/uView.zw;
  gl_Position = vec4(s.x*2.0 - 1.0, 1.0 - s.y*2.0, 0.0, 1.0);
  gl_PointSize = max(1.0, (1.0 + aSeed.z*1.4)*max(uPx, uScale*2.2*sz));
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
// What the photo shows where, read from the photo itself at load (no extra image files):
// mask: r far (sky, the valley, the land beyond, seen past the pavilion), g lamplit stone,
//       b the near hilltop and the steps, a the sky the clouds move in;
// amb:  rgb the land under the fog (the photo with its fog thinned: its darkest nearby colours),
//       a how much fog the photo already shows there;
// fog:  the colour of the fog in the photo.
export function sceneMasks(img, scene = PAVILION){
  const w = 480, h = 270, cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  const px = ctx.getImageData(0, 0, w, h).data;
  const n = w*h, far = new Float32Array(n), warm = new Float32Array(n), ground = new Float32Array(n), sky = new Float32Array(n), plume = new Float32Array(n), lum = new Float32Array(n);
  const { pavilionX, steps } = scene.ground, hz = scene.horizon;
  // per column on the left: where the near ground begins (the blue of the land beyond gives way)
  const groundAt = new Float32Array(w).fill(1);
  for(let i = 0; i < w; i++){
    if(i/w > pavilionX) { groundAt[i] = steps; continue; }
    let run = 0;
    for(let j = Math.round(h*(hz + 0.08)); j < h; j++){
      const k = j*w + i, bmr = px[k*4 + 2] - px[k*4];
      run = bmr < 20 ? run + 1 : 0;
      if(run >= 4){ groundAt[i] = (j - 3)/h; break; }
    }
  }
  const ga = boxBlur(groundAt, w, 1, 6, 2);
  // per column: where the sky ends (the first land darker than the sky above it); fog drifts only
  // below it, the clouds only above it
  const lumAt = (i, j) => { const k = j*w + i; return (0.3*px[k*4] + 0.55*px[k*4 + 1] + 0.15*px[k*4 + 2])/255; };
  const skyAt = new Float32Array(w).fill(hz);
  for(let i = 0; i < w; i++){
    const ref = []; for(let j = Math.round(h*(hz - 0.15)); j < Math.round(h*(hz - 0.06)); j++) ref.push(lumAt(i, j));
    ref.sort((a, b) => a - b); const S = ref[ref.length >> 1] || 0.3;
    let run = 0;
    for(let j = Math.round(h*(hz - 0.09)); j < Math.round(h*(hz + 0.12)); j++){
      run = lumAt(i, j) < 0.78*S ? run + 1 : 0;
      if(run >= 6){ skyAt[i] = (j - 5)/h; break; }
    }
  }
  // a dark cloud can stop the search early in a column or two: take the lowest line nearby
  const lowest = new Float32Array(w);
  for(let i = 0; i < w; i++){ let m = 0; for(let k = Math.max(0, i - 8); k <= Math.min(w - 1, i + 8); k++) m = Math.max(m, skyAt[k]); lowest[i] = m; }
  const sl = boxBlur(lowest, w, 1, 3, 2);
  const [px0, px1, py0, py1] = scene.plume || [0, 0, 0, 0];
  const plumeAt = (x, y) => smooth(px1, px0, x)*smooth(py0, py0 + 0.14, y)*(1 - smooth(py1 - 0.06, py1 + 0.02, y));
  for(let j = 0; j < h; j++) for(let i = 0; i < w; i++){
    const k = j*w + i, r = px[k*4], g = px[k*4 + 1], b = px[k*4 + 2], x = i/w, y = j/h;
    lum[k] = (0.3*r + 0.55*g + 0.15*b)/255;
    const near = smooth(ga[i] - 0.012, ga[i] + 0.012, y);
    // the sky against stone; the blue land beyond against the brown near ground; the openings
    // of the pavilion against its stone, which the sky lights blue-grey
    const bmr = b - r, above = y < hz + 0.02;
    const blue = (above ? smooth(36, 52, bmr) : x < pavilionX ? smooth(16, 32, bmr) : smooth(40, 58, bmr))*(1 - near);
    const land = smooth(sl[i] - 0.008, sl[i] + 0.004, y);
    far[k] = blue*land;
    warm[k] = smooth(5, 90, r - b);
    ground[k] = near*(x < pavilionX ? 1 : smooth(steps - 0.01, steps + 0.02, y));
    sky[k] = blue*(1 - land);
    plume[k] = blue*plumeAt(x, y);
  }
  // the land under the fog: the darkest colour nearby, smoothed (fog only ever adds light)
  const dark = erode(lum, w, h, 5), base = boxBlur(dark, w, h, 4);
  const blur = [0, 1, 2].map(ch => { const a = new Float32Array(n); for(let k = 0; k < n; k++) a[k] = px[k*4 + ch]/255; return boxBlur(a, w, h, 3); });
  // the fog's own colour: the brightest of the land beyond, just below the horizon
  let fr = 0, fg = 0, fb = 0, fn = 0;
  const cand = [];
  for(let j = Math.round(h*(hz + 0.02)); j < Math.round(h*(hz + 0.16)); j++) for(let i = 0; i < Math.round(w*pavilionX); i++){ const k = j*w + i; if(far[k] > 0.9) cand.push(k); }
  cand.sort((a, b) => lum[b] - lum[a]);
  for(const k of cand.slice(0, Math.max(1, Math.round(cand.length*0.08)))){ fr += px[k*4]; fg += px[k*4 + 1]; fb += px[k*4 + 2]; fn++; }
  const fogCol = fn ? [fr/fn/255, fg/fn/255, fb/fn/255] : [0.42, 0.50, 0.62];
  const fogL = 0.3*fogCol[0] + 0.55*fogCol[1] + 0.15*fogCol[2];
  const R = boxBlur(far, w, h, 1), G = boxBlur(warm, w, h, 4), B = boxBlur(ground, w, h, 2), A = boxBlur(erode(sky, w, h, 4), w, h, 3);
  const mask = new Uint8Array(n*4), amb = new Uint8Array(n*4);
  for(let k = 0; k < n; k++){
    mask[k*4] = R[k]*255; mask[k*4 + 1] = G[k]*255; mask[k*4 + 2] = B[k]*255; mask[k*4 + 3] = A[k]*255;
    // how much fog the photo shows: how far its light rises above the land underneath, toward the fog's own
    const fogged = Math.min(1, Math.max(0, (lum[k] - base[k])/Math.max(0.05, fogL - base[k])));
    const thin = 1 - 0.75*fogged;   // the land under the fog: the photo with most of its fog taken out
    for(let ch = 0; ch < 3; ch++){
      const under = blur[ch][k]*thin + base[k]*(1 - thin)*(ch === 2 ? 1.25 : ch === 1 ? 1.05 : 0.9);
      amb[k*4 + ch] = Math.max(0, Math.min(255, under*255));
    }
    amb[k*4 + 3] = fogged*Math.max(far[k], plume[k])*255;
  }
  return { mask: { w, h, data: mask }, amb: { w, h, data: amb }, fogCol };
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
  const lamps = scene.lamps.slice(0, MAX_LAMPS);
  const sizeOf = l => l.halfW/56;   // a lantern's size, relative to a near one
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
    for(let i = 0; i < n; i++){ const info = gl.getActiveUniform(p, i); u[info.name.replace(/\[0\]$/, '')] = gl.getUniformLocation(p, info.name); }
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

  let progFog, progComp, progMote, tri, motes, moteCount, texPhoto, texMask, texAmb, texNoise, texGrain, fbo, fogTex, fogW = 0, fogH = 0, fogCol = [0.42, 0.5, 0.62];
  function init(){
    progFog = program(VERT, FOG); progComp = program(VERT, COMPOSITE); progMote = program(MOTE_VERT, MOTE_FRAG);
    tri = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, tri); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const seeds = [], r = mulberry32(17), perLamp = quality.motes ?? 14;
    for(let i = 0; i < perLamp; i++) seeds.push(r(), r(), r(), 0);
    moteCount = seeds.length/4;
    motes = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, motes); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(seeds), gl.STATIC_DRAW);
    texPhoto = texture({ source: img, mip: isGL2 });
    const mk = sceneMasks(img, scene); texMask = texture(mk.mask); texAmb = texture(mk.amb); fogCol = mk.fogCol;
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
  // each lantern is a damped pendulum; its period follows its chain (a longer drop swings slower)
  const pend = lamps.map(l => { const drop = Math.max(0.3, (l.bottom[1] - l.pivot[1])/(4.6*l.halfW)); return { a: 0, v: 0, w: 2*Math.PI/(1.6*Math.sqrt(drop)), n: noise1(l.seed + 101) }; });
  const flick = lamps.map(l => [0, 1, 2, 3, 4, 5, 6].map(k => noise1(l.seed + k)));
  // world drift of the fog (noise units) and the clouds' phase
  const off = { fog: rnd(), breath: [rnd()*10, rnd()*10], ground: rnd()*10, groundEvo: rnd()*100, haze: [0, 0], cloud: rnd(), motes: 0 };
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

  // speeds, measured on the master (reference px per second at the bottom of the valley fog)
  const speed = { cloud: quality.cloudSpeed ?? 20, fog: quality.fogSpeed ?? 22, ground: quality.groundSpeed ?? 0.6 };
  function step(t, dt){
    // wind: a breeze that rises and falls, now and then a gust, and whatever the pointer stirs up
    if(t > air.gustNext){ air.gustAt = t; air.gustAmp = 0.35 + rnd()*0.5; air.gustNext = t + 6 + rnd()*9; }
    const ga = t - air.gustAt;
    air.gust = ga < 0 ? 0 : air.gustAmp*(ga < 0.9 ? smooth(0, 0.9, ga) : Math.exp(-(ga - 0.9)/2.4));
    air.touch *= Math.exp(-dt/1.4); air.ptrStrength *= Math.exp(-dt/1.6);
    air.push = [air.push[0]*Math.exp(-dt/0.8), air.push[1]*Math.exp(-dt/0.8)];
    const breeze = 0.22 + 0.16*wn(t*0.11) + 0.05*gustNoise(t*0.7);
    air.wind = breeze + air.gust + air.touch*(air.touchDir || 1);
    const stir = Math.abs(air.gust) + Math.abs(air.touch);

    // the lanterns sway as damped pendulums pushed by the wind
    pend.forEach((s, i) => {
      const free = lamps[i].swing ?? 1;
      if(!free){ s.a = 0; return; }
      const force = 0.10*air.wind + 0.02*s.n(t*0.9);
      for(let k = 0; k < 4; k++){ const h = dt/4; s.v += (-s.w*s.w*s.a - 2*0.08*s.w*s.v + force)*h; s.a += s.v*h; }
      s.a = Math.max(-0.03, Math.min(0.03, s.a));
    });

    // the candles: a slow breath, a quicker shiver, and more of both when the air moves
    const lamp = flick.map(n => {
      const I = 1 + 0.05*n[0](t*0.9) + 0.035*n[1](t*2.7) + 0.025*n[2](t*8.3) + stir*(0.06*n[3](t*5.1) + 0.045*n[4](t*11.0));
      const lean = 0.55*air.wind + 0.28*n[5](t*2.1) + 0.14*n[6](t*6.0) + stir*0.3*n[3](t*3.7);
      const stretch = 1 + 0.9*(I - 1) + 0.045*n[6](t*4.4) - 0.05*stir;
      return { I, lean, stretch };
    });

    // the fog drifts with the wind (a gust hurries it a little); the clouds keep their own pace
    const w = 0.75 + 0.6*air.wind;
    off.fog = (off.fog + dt*w/(quality.fogPeriod ?? 7)) % 1;
    off.breath = [off.breath[0] - dt*0.0090*w, off.breath[1] + dt*0.0030];
    off.ground += dt*0.010*w*speed.ground; off.groundEvo += dt*w*1.5;
    off.haze = [off.haze[0] - dt*0.004*w, off.haze[1] + dt*0.0008];
    off.cloud = (off.cloud + dt/(quality.cloudPeriod ?? 7)) % 1;
    off.motes = (off.motes + dt*air.wind*9) % 300;
    return lamp;
  }

  // ---- drawing ----
  let t0 = null, last = 0, raf = 0, running = false, first = true, clock = 0;
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
    if(first){ first = false; onFirstFrame?.(); }
  }
  const A = new Float32Array(MAX_LAMPS*4), B = new Float32Array(MAX_LAMPS*4), C = new Float32Array(MAX_LAMPS*4), D = new Float32Array(MAX_LAMPS*4);
  function render(t, lamp){
    lamps.forEach((l, i) => {
      const a = pend[i].a, dx = l.flame[0] - l.pivot[0], dy = l.flame[1] - l.pivot[1];
      const cs = Math.cos(a), sn = Math.sin(a);
      const fx = l.pivot[0] + cs*dx - sn*dy, fy = l.pivot[1] + sn*dx + cs*dy;
      const size = sizeOf(l), I = lamp[i].I;
      A.set([l.flame[0], l.flame[1], l.pivot[0], l.pivot[1]], i*4);
      B.set([l.bottom[1], l.halfW, size, a], i*4);
      C.set([lamp[i].lean, lamp[i].stretch, 1 + 1.8*(I - 1), Math.max(0, 0.030 + 0.55*(I - 1))*Math.min(1, size)], i*4);
      // the light pool moves a little further than the lantern itself, so the sway reads on the stone
      D.set([fx + (fx - l.flame[0])*2 + lamp[i].lean*3*size, fy, 1 + 1.6*(I - 1), 0], i*4);
    });
    // 1. fog, at a third of the resolution
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo); gl.viewport(0, 0, fogW, fogH);
    gl.disable(gl.BLEND);
    gl.useProgram(progFog.p); const uf = progFog.u;
    gl.bindBuffer(gl.ARRAY_BUFFER, tri); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.uniform4f(uf.uView, ...view);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texNoise); gl.uniform1i(uf.uNoise, 0);
    gl.uniform1f(uf.uAspect, refW/refH);
    gl.uniform1f(uf.uHorizon, scene.horizon);
    const mist = quality.mist || [1, 0.32, 1, 0.4];
    gl.uniform4f(uf.uBreath, off.breath[0] % 64, off.breath[1] % 64, 1, 0);
    gl.uniform4f(uf.uGround, -(off.ground % 64), off.groundEvo % 1000, 1, 0);
    gl.uniform4f(uf.uHaze, off.haze[0] % 64, off.haze[1] % 64, 1, 0);
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
    gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, texAmb); gl.uniform1i(u.uAmb, 4);
    gl.uniform2f(u.uRef, refW, refH);
    gl.uniform1i(u.uLampN, lamps.length);
    gl.uniform4fv(u.uLampA, A); gl.uniform4fv(u.uLampB, B); gl.uniform4fv(u.uLampC, C); gl.uniform4fv(u.uLampD, D);
    const dir = scene.cloudDir || [1, -0.06], dl = Math.hypot(dir[0], dir[1]);
    gl.uniform4f(u.uCloud, off.cloud, speed.cloud*(quality.cloudPeriod ?? 7), dir[0]/dl, dir[1]/dl);
    gl.uniform3f(u.uFogCol, ...fogCol);
    gl.uniform4f(u.uFogFlow, off.fog, speed.fog*(quality.fogPeriod ?? 7), 0, 0);
    gl.uniform4f(u.uFogZone, scene.ground.pavilionX, scene.horizon, 0.55, 0);
    gl.uniform4f(u.uPlume, ...(scene.plume || [0, 0, 0, 0]));
    gl.uniform4f(u.uMist, ...mist);
    gl.uniform4f(u.uGrain, Math.random(), Math.random(), quality.grain ?? 0.022, 0);
    gl.uniform1i(u.uDebug, { fog: 1, mask: 2, amb: 3, fogged: 4 }[quality.view] || 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // 3. dust in the lamplight
    if(moteCount){
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
      gl.useProgram(progMote.p); const um = progMote.u;
      gl.bindBuffer(gl.ARRAY_BUFFER, motes); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0);
      gl.uniform4f(um.uView, ...view); gl.uniform2f(um.uRef, refW, refH); gl.uniform1f(um.uT, t % 1000);
      gl.uniform2f(um.uWind, off.motes, 0);
      gl.uniform1f(um.uPx, pxRatio);
      gl.uniform1f(um.uScale, devW/(view[2]*refW));
      lamps.forEach((l, i) => {
        if(sizeOf(l) < 0.6) return;   // too far away to see its dust
        gl.uniform4f(um.uLamp, D[i*4], D[i*4 + 1], lamp[i].I, sizeOf(l));
        gl.uniform1f(um.uT, (t + i*37.3) % 1000);
        gl.drawArrays(gl.POINTS, 0, moteCount);
      });
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
