// Resonance (round 13 idea): Chladni figures drawn by VCH's music.
//
// Sprinkle sand on a metal plate and make it ring: the sand jumps off the parts that vibrate and
// gathers on the lines that stay still (the nodal lines), drawing the figures Ernst Chladni
// published in 1787. VCH draws them in two places: big and live in the Resonance room (the
// music library), and dim and slow behind the whole page (the Resonance background), where the
// sand settles into one figure and drifts to the next only when the music changes chord. Nothing
// moves on the board. Nothing here is an image or AI art: every figure is computed.
//
// The plate: for a square plate, a standing wave of mode (n, m) is well approximated by
//   z(x, y) = cos(nπx)·cos(mπy) − s·cos(mπx)·cos(nπy),   x, y in [0, 1], s = ±1
// (the classic formula for Chladni's square-plate figures). Its pitch rises with n² + m².
// The sand: every grain hops a random distance proportional to how hard the plate moves under
// it, |z|, so grains wander off the antinodes and come to rest where z ≈ 0, as real sand does.
// Pure math helpers first, then a small canvas renderer (no DOM beyond the canvas it is given).

// The plate's modes, lowest pitch first: [{n, m, s}] with n > m ≥ 0 (n = m is flat for s = 1).
export function modeList(max = 9) {
  const out = [];
  for (let n = 1; n <= max; n++) for (let m = 0; m < n; m++) for (const s of [1, -1]) out.push({ n, m, s });
  return out.sort((a, b) => a.n * a.n + a.m * a.m - (b.n * b.n + b.m * b.m) || a.s - b.s);
}
export const MODES = Object.freeze(modeList().map(Object.freeze));

// Displacement of mode {n, m, s} at (x, y).
export function plate(mode, x, y) {
  const { n, m, s = 1 } = mode;
  return Math.cos(n * Math.PI * x) * Math.cos(m * Math.PI * y) - s * Math.cos(m * Math.PI * x) * Math.cos(n * Math.PI * y);
}

// A pitch (Hz) to a mode: low notes ring the simple figures, high notes the intricate ones.
// The range is two and a half octaves on each side of the music's middle (55–1760 Hz).
export function modeForFrequency(hz, modes = MODES) {
  const f = Math.max(55, Math.min(1760, Number(hz) || 220));
  const t = Math.log2(f / 55) / 5; // 0..1
  return modes[Math.min(modes.length - 1, Math.max(0, Math.round(t * (modes.length - 1) * 0.6)))];
}
const midiHz = m => 440 * 2 ** ((m - 69) / 12);
// A chord (MIDI notes) to a mode: its root picks the figure, the chord's shape picks the variant.
export function modeForChord(notes = [], modes = MODES) {
  if (!notes.length) return modes[2];
  const root = Math.min(...notes), base = modeForFrequency(midiHz(root + 12), modes);
  const third = notes.some(n => (n - root) % 12 === 4); // major chords ring the symmetric variant
  return modes.find(x => x.n === base.n && x.m === base.m && x.s === (third ? -1 : 1)) || base;
}
// The background's figure for a moment of the score: the chord picks it, a step finer than the
// room's (a full window needs the intricate figures; the simple ones read as guide lines), and
// the game's tension (0..1) makes it finer still, so the sand grows more intricate as a game
// heats up.
export function modeForMoment(notes = [], tension = 0, modes = MODES) {
  const base = Math.max(0, modes.indexOf(modeForChord(notes, modes))), heat = Math.max(0, Math.min(1, Number(tension) || 0));
  return modes[Math.min(modes.length - 1, base + 16 + Math.round(heat * 12))];
}

// The plate's slope at (x, y): [∂z/∂x, ∂z/∂y].
export function slope(mode, x, y) {
  const { n, m, s = 1 } = mode, P = Math.PI;
  const cnx = Math.cos(n * P * x), cmy = Math.cos(m * P * y), cmx = Math.cos(m * P * x), cny = Math.cos(n * P * y);
  return [
    -n * P * Math.sin(n * P * x) * cmy + s * m * P * Math.sin(m * P * x) * cny,
    -m * P * cnx * Math.sin(m * P * y) + s * n * P * cmx * Math.sin(n * P * y),
  ];
}
const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);
// Where a grain at (x, y) comes to rest: it slides to the nearest still line (Newton steps
// towards z = 0, each at most `reach` long). Returns [x, y].
export function restingPoint(mode, x, y, steps = 8, reach = 0.04) {
  for (let i = 0; i < steps; i++) {
    const z = plate(mode, x, y);
    if (Math.abs(z) < 1e-4) break;
    const [gx, gy] = slope(mode, x, y), g2 = gx * gx + gy * gy;
    if (g2 < 1e-6) break; // the top of a hump: the shaking throws it off next time
    let dx = -z * gx / g2, dy = -z * gy / g2;
    const len = Math.hypot(dx, dy);
    if (len > reach) { dx *= reach / len; dy *= reach / len; }
    x = clamp01(x + dx); y = clamp01(y + dy);
  }
  return [x, y];
}
// One grain's next home when the plate rings `mode`: it is thrown by how hard the plate moves
// under it (a grain already on a still line barely moves), then slides to a line. A grain that
// lands nowhere still (pinned against an edge) is thrown again, up to three times.
export function nextHome(mode, x, y, random = Math.random) {
  let px = x, py = y;
  for (let attempt = 0; attempt < 4; attempt++) {
    const throwBy = 0.03 + 0.06 * Math.min(1, Math.abs(plate(mode, x, y))) + attempt * 0.08;
    [px, py] = restingPoint(mode, clamp01(x + (random() - 0.5) * throwBy), clamp01(y + (random() - 0.5) * throwBy));
    if (Math.abs(plate(mode, px, py)) < 0.05) break;
  }
  return [px, py];
}

// Energy (how hard the plate rings, 0..1) from a byte frequency spectrum (AnalyserNode).
export function spectrumEnergy(bytes) {
  if (!bytes?.length) return 0;
  let sum = 0;
  for (let i = 0; i < bytes.length; i++) sum += bytes[i] * bytes[i];
  return Math.min(1, Math.sqrt(sum / bytes.length) / 140);
}

// A small seeded generator, so a figure can be drawn the same way twice (tests, share images).
export function seeded(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

// The sand. Positions live in Float32Arrays in plate units (0..1).
export class Sand {
  constructor(count = 4000, random = Math.random) {
    this.random = random; this.count = count;
    this.x = new Float32Array(count); this.y = new Float32Array(count);
    for (let i = 0; i < count; i++) { this.x[i] = random(); this.y[i] = random(); }
    this.mode = MODES[2]; this.from = null; this.blend = 1; this.energy = 0.6;
  }
  setMode(mode) {
    if (!mode || (mode.n === this.mode.n && mode.m === this.mode.m && mode.s === this.mode.s)) return;
    this.from = this.mode; this.mode = mode; this.blend = 0;
  }
  amplitude(x, y) {
    const a = Math.abs(plate(this.mode, x, y));
    return this.from && this.blend < 1 ? a * this.blend + Math.abs(plate(this.from, x, y)) * (1 - this.blend) : a;
  }
  // One time step: dt in seconds (clamped), energy 0..1. Each grain hops at random by how hard
  // the plate moves under it, and slides a little downhill on |z| (the plate tilts it towards the
  // still lines), plus a whisker of jitter so the lines keep the grain of real sand.
  step(dt = 1 / 60, energy = this.energy) {
    dt = Math.min(dt, 0.05);
    const k = dt * 3 * (0.15 + energy), drift = dt * 0.006 * (0.4 + energy), jitter = 0.0042, h = 0.004, r = this.random;
    if (this.blend < 1) { this.blend = Math.min(1, this.blend + dt * 1.6); if (this.blend === 1) this.from = null; }
    for (let i = 0; i < this.count; i++) {
      const x0 = this.x[i], y0 = this.y[i], a = this.amplitude(x0, y0), hop = a * k + jitter;
      const gx = (this.amplitude(x0 + h, y0) - this.amplitude(x0 - h, y0)) / (2 * h);
      const gy = (this.amplitude(x0, y0 + h) - this.amplitude(x0, y0 - h)) / (2 * h);
      let x = x0 + (r() - 0.5) * hop - gx * drift, y = y0 + (r() - 0.5) * hop - gy * drift;
      // Grains that fall off the edge land back on the plate somewhere.
      if (x < 0 || x > 1 || y < 0 || y > 1) { x = r(); y = r(); }
      this.x[i] = x; this.y[i] = y;
    }
  }
  // Average |z| under the grains: near 0 once the figure has formed.
  restlessness() {
    let s = 0;
    for (let i = 0; i < this.count; i++) s += this.amplitude(this.x[i], this.y[i]);
    return s / this.count;
  }
}

// Draws sand on a canvas that covers the board. options: {count, color, size}
export class ResonancePlate {
  constructor(canvas, { count = 4000, color = '#e9dcb8', size = 1.4, random = Math.random } = {}) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.sand = new Sand(count, random); this.color = color; this.size = size;
    this.energy = 0.5; this.target = 0.5; this.raf = 0; this.last = 0; this.running = false;
  }
  setMode(mode) { this.sand.setMode(mode); }
  // A move or a beat: the plate rings harder for a moment, then settles.
  ring(strength = 1) { this.energy = Math.min(1.4, this.energy + 0.6 * strength); }
  setTarget(energy) { this.target = Math.max(0, Math.min(1, Number(energy) || 0)); }
  resize() {
    const r = this.canvas.getBoundingClientRect(), dpr = Math.min(2, globalThis.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
  }
  draw() {
    const { ctx, canvas, sand } = this, w = canvas.width, h = canvas.height, s = this.size * Math.min(2, globalThis.devicePixelRatio || 1);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = this.color;
    for (let i = 0; i < sand.count; i++) ctx.fillRect(sand.x[i] * w - s / 2, sand.y[i] * h - s / 2, s, s);
  }
  // Lets the sand settle without drawing (reduced motion: one still figure).
  settle(steps = 240) { for (let i = 0; i < steps; i++) this.sand.step(1 / 30, 0.8); this.draw(); }
  frame(now) {
    if (!this.running) return;
    const dt = this.last ? (now - this.last) / 1000 : 1 / 60; this.last = now;
    this.energy += (this.target - this.energy) * Math.min(1, dt * 1.2);
    this.sand.step(dt, this.energy);
    this.draw();
    this.raf = globalThis.requestAnimationFrame(t => this.frame(t));
  }
  start() { if (this.running) return; this.running = true; this.last = 0; this.resize(); this.raf = globalThis.requestAnimationFrame(t => this.frame(t)); }
  stop() { this.running = false; if (this.raf) globalThis.cancelAnimationFrame(this.raf); this.raf = 0; }
}


// The Resonance background: living sand behind the whole page. The plate is a square that
// covers the window (centred, like background-size: cover), so its figures keep their shape on
// any screen. show(mode) works out where every grain goes next a few thousand grains a frame (so
// the page never stutters) and lets the sand drift there over `flow` ms; the first figure
// gathers out of scattered sand. Then the sand rests and answers what happens around it:
//   ripple(x, y)  a ring runs through it from a point of the window (a move lands, a tap);
//   tremble()     it shivers (a check, the clock running out);
//   touch(x, y)   it parts around the pointer and flows back behind it;
//   listen(ear)   it dances with the music: a tremor with every note, a swell with the bass;
// and now and then a slow swell crosses it on its own. Every answer ends exactly where it began,
// and when nothing happens nothing is drawn. pause(ms) keeps it still while a piece travels.
// Grains are written straight into pixels (one putImageData a frame, a few ms even without a
// GPU); where they pile up they add up, so the lines glow at their cores like real sand. A
// second, low-resolution canvas (`glow`, which the browser smooths up to the window) carries the
// light of the lines and of each ring: it still reads through frosted glass, where single grains
// blur away.
// Options: {glow, color, glowColor, density (CSS px² of window per grain), size and spread (CSS
// px: a grain, and how far grains scatter around a line), flow (ms), fps, maxDpr (the most pixels
// per CSS px it draws at), motion (false: nothing
// moves, for reduced motion), swell ([shortest, longest] ms between swells, or null), random,
// view, onReady}, where `view` supplies innerWidth/innerHeight/devicePixelRatio, performance,
// the animation frame and timer calls, and onReady() runs once, when the first figure is drawn.
const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const TONES = [45, 70, 100]; // three shades of sand (alpha out of 255) that add up where grains pile
const LITTLE_ENDIAN = new Uint8Array(new Uint32Array([1]).buffer)[0] === 1;
const packRgb = hex => {
  const h = /^#?([0-9a-f]{6})$/i.exec(hex)?.[1] || 'e9dcb8', [r, g, b] = [0, 2, 4].map(k => parseInt(h.slice(k, k + 2), 16));
  return LITTLE_ENDIAN ? (b << 16) | (g << 8) | r : (r << 24) | (g << 16) | (b << 8);
};
const GLOW = 4; // CSS px per pixel of the glow layer
const GLOW_GAIN = 30; // glow alpha per grain on a glow pixel, after blurring
const HALO = 3.2; // a ring's own light on the glow layer, in grains
const RING = 2.3316; // 1 / max(u·e^(−u²)): a ring's `amp` is the farthest a grain is moved
// A soft blur of the glow layer: a three-wide box across, then down.
function blur3(a, tmp, w, h) {
  for (let y = 0; y < h; y++) {
    const o = y * w; let prev = 0, cur = a[o];
    for (let x = 0; x < w; x++) { const next = x + 1 < w ? a[o + x + 1] : 0; tmp[o + x] = (prev + cur + next) / 3; prev = cur; cur = next; }
  }
  for (let x = 0; x < w; x++) {
    let prev = 0, cur = tmp[x];
    for (let y = 0, o = x; y < h; y++, o += w) { const next = y + 1 < h ? tmp[o + w] : 0; a[o] = (prev + cur + next) / 3; prev = cur; cur = next; }
  }
}
export class SandBackdrop {
  constructor(canvas, { glow = null, color = '#e9dcb8', glowColor = '#e5c17c', density = 60, size = 1.6, spread = 3, flow = 3200, fps = 30, maxDpr = 2, motion = true, swell = [9000, 16000], random = Math.random, view = globalThis, onReady = null } = {}) {
    Object.assign(this, { canvas, glowCanvas: glow, density, size, spread, flow, fps, maxDpr, motion, swell, random, view, onReady });
    this.ctx = canvas.getContext('2d'); this.gctx = glow?.getContext?.('2d') || null;
    this.rgb = packRgb(color); this.grgb = packRgb(glowColor); this.image = null; this.gimage = null;
    this.mode = null; this.count = 0; this.raf = 0; this.job = null; this.drift = null; this.drawn = false;
    this.ripples = []; this.rings = new Float64Array(6 * 8); this.nr = 0; this.shiver = null;
    this.ear = null; this.hearing = false; this.dance = 0; this.bass = 0;
    this.finger = null; this.pushed = false; this.pausedUntil = 0; this.lastDraw = -1e9; this.dirty = false;
    this.swellTimer = 0; this.stopped = false;
    this.layout();
    this.armSwell();
  }
  get busy() { return !!(this.job || this.drift); }
  // Something is still answering (a ring, a shiver, the pointer, the music).
  lively() { return this.ripples.length > 0 || !!this.shiver || this.pushed || !!this.finger || this.hearing || this.dance > 0 || this.bass > 0; }
  // The window, the covering square and the part of the plate in view. The sand is sown again
  // only when the window changes a lot (a phone turned on its side), and then simply re-forms.
  layout() {
    const v = this.view, W = Math.max(1, v.innerWidth || 1), H = Math.max(1, v.innerHeight || 1), S = Math.max(W, H);
    this.dpr = Math.min(W * H > 600000 ? 1 : this.maxDpr, v.devicePixelRatio || 1); // a background: big windows draw at 1x (and any, given maxDpr 1)
    Object.assign(this, { W, H, S, ox: (W - S) / 2, oy: (H - S) / 2 });
    const vx = (1 - W / S) / 2, vy = (1 - H / S) / 2, margin = 0.03;
    this.lo = [Math.max(0, vx - margin), Math.max(0, vy - margin)]; this.hi = [Math.min(1, 1 - vx + margin), Math.min(1, 1 - vy + margin)];
    const w = Math.round(W * this.dpr), h = Math.round(H * this.dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
    if (this.image?.width !== w || this.image?.height !== h) { this.image = this.ctx.createImageData(w, h); this.pixels = new Uint32Array(this.image.data.buffer); }
    if (this.gctx) {
      const gw = Math.ceil(W / GLOW), gh = Math.ceil(H / GLOW), c = this.glowCanvas;
      if (c.width !== gw || c.height !== gh) { c.width = gw; c.height = gh; }
      if (this.gimage?.width !== gw || this.gimage?.height !== gh) {
        this.gimage = this.gctx.createImageData(gw, gh); this.gpix = new Uint32Array(this.gimage.data.buffer);
        this.gbuf = new Float32Array(gw * gh); this.gtmp = new Float32Array(gw * gh);
      }
    }
    const count = Math.round(Math.min(32000, Math.max(2500, W * H / this.density)));
    const shifted = !this.sown || Math.abs(this.sown[0] - this.lo[0]) + Math.abs(this.sown[1] - this.lo[1]) > 0.05; // turned on its side
    if (!this.count || shifted || Math.abs(count - this.count) / this.count > 0.3) {
      this.sow(count);
      if (this.mode) { const mode = this.mode; this.mode = null; this.show(mode, { flow: false }); return; }
    }
    if (this.drawn && !this.busy) this.draw(1);
  }
  sow(count) {
    const r = this.random, [x0, y0] = this.lo, [x1, y1] = this.hi;
    this.count = count; this.sown = [x0, y0];
    for (const k of ['x', 'y', 'fx', 'fy', 'tx', 'ty', 'jx', 'jy', 'wait', 'dx', 'dy', 'ux', 'uy', 'ph']) this[k] = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      this.x[i] = x0 + r() * (x1 - x0); this.y[i] = y0 + r() * (y1 - y0);
      // A fixed scatter around the line (Box–Muller, `spread` CSS px), drawn in screen space.
      const a = Math.sqrt(-2 * Math.log(1 - r() * 0.999)) * this.spread, b = 2 * Math.PI * r();
      this.jx[i] = a * Math.cos(b); this.jy[i] = a * Math.sin(b);
      this.wait[i] = r() * 0.3;
      // Which way this grain hops when the plate shivers or the music plays, and its moment in the beat.
      const c = 2 * Math.PI * r(); this.ux[i] = Math.cos(c); this.uy[i] = Math.sin(c); this.ph[i] = 2 * Math.PI * r();
    }
    this.drawn = false; this.pushed = false;
  }
  inView(x, y) { return x >= this.lo[0] && x <= this.hi[0] && y >= this.lo[1] && y <= this.hi[1]; }
  // Sets the figure. flow: false places the sand at once (reduced motion); otherwise it drifts
  // there, and the very first figure gathers out of the scattered sand.
  show(mode, { flow = true } = {}) {
    if (!mode || (this.mode && mode.n === this.mode.n && mode.m === this.mode.m && mode.s === this.mode.s)) return;
    if (this.drift) this.freeze();
    this.mode = mode;
    this.job = { mode, i: 0, flow: flow && this.motion };
    this.schedule();
  }
  // Freezes a drift where it is (a new figure arrived before the last one formed).
  freeze() {
    const t = this.drift ? this.progress(this.now()) : 1;
    for (let i = 0; i < this.count; i++) { const e = this.ease(i, t); this.x[i] = this.fx[i] + (this.tx[i] - this.fx[i]) * e; this.y[i] = this.fy[i] + (this.ty[i] - this.fy[i]) * e; }
    this.drift = null;
  }
  now() { return this.view.performance?.now?.() ?? Date.now(); }
  progress(now) { return Math.min(1, (now - this.drift.start) / this.flow); }
  ease(i, t) { const w = this.wait[i]; return easeInOut(Math.max(0, Math.min(1, (t - w) / (1 - w)))); }
  // Works out new homes until the deadline (performance.now() ms); true when every grain has one.
  work(deadline = Infinity) {
    const job = this.job; if (!job) return true;
    const r = this.random, [x0, y0] = this.lo, [x1, y1] = this.hi;
    for (; job.i < this.count; job.i++) {
      const i = job.i;
      let [tx, ty] = nextHome(job.mode, this.x[i], this.y[i], r);
      // Sand that drifts out of view is swept back in somewhere new, so the window never empties.
      if (!this.inView(tx, ty)) [tx, ty] = nextHome(job.mode, x0 + r() * (x1 - x0), y0 + r() * (y1 - y0), r);
      this.tx[i] = tx; this.ty[i] = ty;
      if ((i & 255) === 255 && this.now() > deadline) { job.i++; return false; }
    }
    this.job = null;
    if (job.flow) { this.fx.set(this.x); this.fy.set(this.y); this.drift = { start: this.now() }; }
    else { this.x.set(this.tx); this.y.set(this.ty); this.draw(1); }
    return true;
  }
  schedule() { if (!this.raf && !this.stopped && this.view.requestAnimationFrame) this.raf = this.view.requestAnimationFrame(t => this.tick(t)); }
  // Drawn at `fps` while anything quick moves (30: sand needs no more, and the page behind the
  // glass panels is redrawn half as often), 24 for the music alone, 12 for a slow swell alone.
  // Nothing while resting.
  interval() {
    const quick = this.drift || this.shiver || this.finger || this.pushed || this.ripples.some(r => !r.slow);
    return 1000 / Math.min(this.fps, quick ? this.fps : this.hearing || this.dance || this.bass ? 24 : 12);
  }
  tick() {
    this.raf = 0;
    if (this.stopped) return;
    if (this.job) { this.work(this.now() + 6); if (this.busy || this.lively() || this.dirty) this.schedule(); return; }
    const now = this.now(), moving = !!this.drift || this.lively();
    if (!moving && !this.dirty) return;
    if (now < this.pausedUntil || (moving && now - this.lastDraw < this.interval() - 2)) { this.schedule(); return; }
    if (moving) this.hear();
    const t = this.drift ? this.progress(now) : 1;
    if (this.drift && t >= 1) { this.x.set(this.tx); this.y.set(this.ty); this.drift = null; } // arrived
    this.draw(t, now); // the last of these, once everything has ended, lays the sand back exactly
    if (this.drift || this.lively() || this.dirty) this.schedule();
  }
  // ---- Answers ----
  // A ring from (x, y) in CSS px of the window: it runs out at `speed` px/s, gathers the sand on
  // its front (`amp`: how far a grain moves, `width`: how wide the front is), lights the lines it
  // crosses (`light`), and fades out over `life` ms or as it leaves the window. `from` (px) starts
  // it already that wide, so a ring from under the board shows the moment the piece lands.
  ripple(x, y, { amp = 9, speed = 560, width = 26, light = 1, life = 2600, from = 0, slow = false } = {}) {
    if (!this.motion || !this.drawn || this.stopped || !Number.isFinite(x) || !Number.isFinite(y)) return false;
    const { W, H } = this, far = Math.max(Math.hypot(x, y), Math.hypot(W - x, y), Math.hypot(x, H - y), Math.hypot(W - x, H - y));
    from = Math.max(0, Math.min(Number(from) || 0, far));
    this.ripples.push({ x, y, at: this.now(), amp, speed, width, light, slow, from, life: Math.max(1, Math.min(life, (far - from + 2.5 * width) / speed * 1000)) });
    if (this.ripples.length > 6) this.ripples.shift();
    this.schedule();
    return true;
  }
  // The whole plate shivers by up to `px` CSS px, dying away over `ms`.
  tremble(px = 2.2, ms = 800) {
    if (!this.motion || !this.drawn || this.stopped) return false;
    const now = this.now(), left = this.shiverAt(now);
    this.shiver = { a: Math.max(px, left), at: now, ms };
    this.schedule();
    return true;
  }
  shiverAt(now) { const s = this.shiver; if (!s) return 0; const k = 1 - (now - s.at) / s.ms; return k > 0 ? s.a * k * k : 0; }
  // The pointer at (x, y): the sand parts around it (radius in CSS px) and flows back behind it.
  touch(x, y, radius = 30) {
    if (!this.motion || !this.drawn || this.stopped || !Number.isFinite(x) || !Number.isFinite(y)) return false;
    const f = this.finger, now = this.now();
    if (f && now - f.at < 250) Object.assign(f, { x, y, at: now, radius }); else this.finger = { x, y, px: x, py: y, at: now, radius };
    this.schedule();
    return true;
  }
  lift() { this.finger = null; }
  // The music: ear() returns the score's byte spectrum while it plays (else null). wake() starts
  // the frames again when the music starts.
  listen(ear) { this.ear = typeof ear === 'function' ? ear : null; }
  wake() { if (this.motion && this.drawn && !this.stopped && this.ear?.()?.length) { this.hearing = true; this.schedule(); } }
  hear() {
    const bytes = this.motion && this.ear ? this.ear() : null;
    this.hearing = !!bytes?.length;
    let e = 0, b = 0;
    if (this.hearing) {
      const n = bytes.length, cut = Math.max(2, n >> 5); let sum = 0, low = 0;
      for (let i = 0; i < n; i++) { const v = bytes[i]; sum += v * v; if (i < cut) low += v; }
      e = Math.min(1, Math.sqrt(sum / n) / 140); b = Math.min(1, low / cut / 200);
    }
    // Quick to rise with a note and slower to fall, like sand thrown up and settling.
    this.dance += (e - this.dance) * (e > this.dance ? 0.6 : 0.25); if (this.dance < 0.004) this.dance = 0;
    this.bass += (b - this.bass) * (b > this.bass ? 0.5 : 0.2); if (this.bass < 0.004) this.bass = 0;
  }
  // No frames for `ms` (a piece is travelling on the board).
  pause(ms) { this.pausedUntil = Math.max(this.pausedUntil, this.now() + ms); }
  // Reduced motion turned on or off: off drops every answer and lays the sand still.
  setMotion(on) {
    on = !!on; if (on === this.motion) return;
    this.motion = on;
    if (on) { this.armSwell(); return; }
    this.view.clearTimeout?.(this.swellTimer); this.swellTimer = 0;
    this.ripples = []; this.shiver = null; this.finger = null; this.dance = 0; this.bass = 0; this.hearing = false;
    if (this.pushed) { this.dx.fill(0); this.dy.fill(0); this.pushed = false; }
    if (this.drift) { this.drift = null; this.x.set(this.tx); this.y.set(this.ty); }
    if (this.drawn) this.draw(1);
  }
  // Now and then a slow, faint swell crosses the window from one of its edges.
  armSwell() {
    const v = this.view, [shortest, longest] = this.swell || [];
    if (!this.motion || !shortest || !v.setTimeout || this.stopped) return;
    v.clearTimeout?.(this.swellTimer);
    this.swellTimer = v.setTimeout(() => {
      this.swellTimer = 0;
      if (this.stopped || !this.motion) return;
      if (this.drawn && !this.busy && !this.ripples.length && v.document?.visibilityState !== 'hidden') {
        const r = this.random, t = r(), m = 60, { W, H } = this;
        const [x, y] = [[t * W, -m], [W + m, t * H], [t * W, H + m], [-m, t * H]][Math.floor(r() * 4) % 4];
        this.ripple(x, y, { amp: 3.2, speed: 230, width: 120, light: 0.45, life: 9000, slow: true });
      }
      this.armSwell();
    }, shortest + this.random() * Math.max(0, longest - shortest));
  }
  // ---- Painting ----
  // This frame's rings, packed for the loop: [x, y, radius, 1/width, push, inner², outer², light].
  ringsAt(now) {
    const out = this.rings; let n = 0;
    this.ripples = this.ripples.filter(r => now - r.at < r.life);
    for (const r of this.ripples) {
      const age = Math.max(0, now - r.at), s = age / r.life, env = 1 - s * s, R = r.from + r.speed * age / 1000, o = n * 8; // strong until late: still bright as it crosses the window
      out[o] = r.x; out[o + 1] = r.y; out[o + 2] = R; out[o + 3] = 1 / r.width; out[o + 4] = r.amp * env * RING;
      out[o + 5] = R > 3 * r.width ? (R - 3 * r.width) ** 2 : 0; out[o + 6] = (R + 3 * r.width) ** 2; out[o + 7] = r.light * env;
      n++;
    }
    this.nr = n; return n;
  }
  // Paints the sand: during a drift at its point along the way (t), with this frame's answers.
  draw(t = 1, now = this.now()) {
    const { count, S, ox, oy, dpr, x: X, y: Y, fx, fy, tx, ty, jx, jy, dx, dy, ux, uy, ph, pixels, rgb } = this;
    const drifting = !!this.drift && t < 1, w = this.image.width, h = this.image.height;
    const k = Math.max(1, Math.round(this.size * dpr)), half = k / 2;
    const dt = Math.min(100, Math.max(0, now - this.lastDraw)); this.lastDraw = now;
    const nr = this.motion ? this.ringsAt(now) : (this.nr = 0), rb = this.rings;
    if (this.shiver && now - this.shiver.at >= this.shiver.ms) this.shiver = null;
    const shake = this.shiverAt(now), osc = shake + this.dance * 2.2, phase = now * 0.001 * 2 * Math.PI * (shake > this.dance ? 10 : 4.5);
    const breath = this.bass * 0.008, cx = this.W / 2, cy = this.H / 2;
    // The pointer's path since the last frame, as a capsule `radius` wide.
    let f = this.finger;
    if (f && now - f.at > 1200) f = this.finger = null; // a pointer that rests lets the sand back
    // Near it the lines bend away; under it they part, and they flow back once it has passed.
    const pushing = this.pushed || !!f, relax = pushing ? Math.exp(-dt / 800) : 1;
    let fax = 0, fay = 0, fdx = 0, fdy = 0, finv = 0, frad = 0, reach = 0, reach2 = 0, minx = 0, maxx = -1, miny = 0, maxy = -1;
    if (f) {
      fax = f.px; fay = f.py; fdx = f.x - f.px; fdy = f.y - f.py; finv = fdx || fdy ? 1 / (fdx * fdx + fdy * fdy) : 0;
      frad = f.radius; reach = 2 * frad; reach2 = reach * reach;
      minx = Math.min(f.px, f.x) - reach; maxx = Math.max(f.px, f.x) + reach; miny = Math.min(f.py, f.y) - reach; maxy = Math.max(f.py, f.y) + reach;
    }
    const g = this.gctx ? this.gbuf : null, gw = this.gimage?.width || 0, gh = this.gimage?.height || 0, gi = 1 / GLOW;
    if (g) g.fill(0);
    pixels.fill(0);
    let moved = 0;
    for (let i = 0; i < count; i++) {
      let px0 = X[i], py0 = Y[i];
      if (drifting) { const e = this.ease(i, t); px0 = fx[i] + (tx[i] - fx[i]) * e; py0 = fy[i] + (ty[i] - fy[i]) * e; }
      let sx = ox + px0 * S + jx[i], sy = oy + py0 * S + jy[i], boost = 0;
      if (pushing) {
        let ex = dx[i] * relax, ey = dy[i] * relax;
        if (sx > minx && sx < maxx && sy > miny && sy < maxy) {
          // How far from the pointer's path this grain lies at rest, and how far out it is pushed:
          // past the rim from under the pointer, a little less the farther it lies, none at 2×radius.
          let u = ((sx - fax) * fdx + (sy - fay) * fdy) * finv; u = u < 0 ? 0 : u > 1 ? 1 : u;
          const vx = sx - fax - fdx * u, vy = sy - fay - fdy * u, d2 = vx * vx + vy * vy;
          if (d2 < reach2) {
            const d = Math.sqrt(d2) || 0.01, nx = vx / d, ny = vy / d, want = d < frad ? frad - d + 0.35 * frad : 0.35 * (reach - d), have = ex * nx + ey * ny;
            if (want > have) { ex += nx * (want - have); ey += ny * (want - have); }
          }
        }
        dx[i] = ex; dy[i] = ey;
        const m = (ex < 0 ? -ex : ex) + (ey < 0 ? -ey : ey);
        if (m > moved) moved = m;
        sx += ex; sy += ey; boost += m > 8 ? 64 : m * 8; // disturbed sand catches the light
      }
      if (nr) {
        let mx = 0, my = 0;
        for (let r = 0, o = 0; r < nr; r++, o += 8) {
          const vx = sx - rb[o], vy = sy - rb[o + 1], d2 = vx * vx + vy * vy;
          if (d2 > rb[o + 6] || d2 < rb[o + 5]) continue;
          const d = Math.sqrt(d2) || 1, u = (d - rb[o + 2]) * rb[o + 3], e = Math.exp(-u * u), s = -u * e * rb[o + 4] / d;
          mx += vx * s; my += vy * s; boost += e * rb[o + 7] * 110;
        }
        sx += mx; sy += my;
      }
      if (osc) { const s = Math.sin(phase + ph[i]) * osc; sx += ux[i] * s; sy += uy[i] * s; }
      if (breath) { sx += (sx - cx) * breath; sy += (sy - cy) * breath; }
      const px = Math.round(sx * dpr - half), py = Math.round(sy * dpr - half);
      if (px >= 0 && py >= 0 && px + k <= w && py + k <= h) {
        const add = TONES[i % 3] + (boost | 0);
        for (let r = 0; r < k; r++) for (let c = 0, p = (py + r) * w + px; c < k; c++, p++) {
          const a = Math.min(255, (LITTLE_ENDIAN ? pixels[p] >>> 24 : pixels[p] & 255) + add);
          pixels[p] = LITTLE_ENDIAN ? ((a << 24) | rgb) >>> 0 : (rgb | a) >>> 0;
        }
      }
      if (g) { const gx = (sx * gi) | 0, gy = (sy * gi) | 0; if (gx >= 0 && gy >= 0 && gx < gw && gy < gh) g[gy * gw + gx] += 1 + boost * 0.012; }
    }
    // The pointer has gone and the sand is back where it lay: exactly back, so the rest is the same.
    if (pushing) { this.pushed = !!f || moved >= 0.1; if (!this.pushed) { dx.fill(0); dy.fill(0); } }
    if (f) { f.px = f.x; f.py = f.y; } // the next frame's path starts here
    this.ctx.putImageData(this.image, 0, 0);
    if (g) this.paintGlow();
    this.dirty = nr > 0 || osc > 0 || breath > 0 || pushing; // then one more, clean frame follows
    if (!this.drawn) { this.drawn = true; const ready = this.onReady; this.onReady = null; ready?.(); }
  }
  // The light: the sand's own glow, softened, and the light of each ring on top of it.
  paintGlow() {
    const g = this.gbuf, gw = this.gimage.width, gh = this.gimage.height, rb = this.rings;
    blur3(g, this.gtmp, gw, gh); // the browser's smoothing as it scales the layer up does the rest
    for (let r = 0, o = 0; r < this.nr; r++, o += 8) {
      const a = rb[o + 7] * HALO; if (a < 0.02) continue;
      const cx = rb[o] / GLOW, cy = rb[o + 1] / GLOW, R = rb[o + 2] / GLOW, wd = 1 / (rb[o + 3] * GLOW), outer = R + 3 * wd, inner = Math.max(0, R - 3 * wd);
      const y0 = Math.max(0, Math.floor(cy - outer)), y1 = Math.min(gh - 1, Math.ceil(cy + outer));
      for (let y = y0; y <= y1; y++) {
        const vy = y + 0.5 - cy, vy2 = vy * vy; if (vy2 > outer * outer) continue;
        const span = Math.sqrt(outer * outer - vy2), hole = inner * inner > vy2 ? Math.sqrt(inner * inner - vy2) : 0;
        const xa = Math.max(0, Math.floor(cx - span)), xb = Math.min(gw - 1, Math.ceil(cx + span));
        for (let x = xa; x <= xb; x++) {
          const vx = x + 0.5 - cx; if (hole && vx > -hole && vx < hole) { x = Math.ceil(cx + hole - 0.5) - 1; continue; }
          const u = (Math.sqrt(vx * vx + vy2) - R) / wd; g[y * gw + x] += a * Math.exp(-u * u);
        }
      }
    }
    const pix = this.gpix, rgb = this.grgb, gain = GLOW_GAIN * (1 + 0.8 * this.dance); // the lines brighten with every note
    for (let p = 0; p < pix.length; p++) {
      const v = g[p] * gain;
      pix[p] = v < 1 ? 0 : LITTLE_ENDIAN ? (((v > 255 ? 255 : v | 0) << 24) | rgb) >>> 0 : (rgb | (v > 255 ? 255 : v | 0)) >>> 0;
    }
    this.gctx.putImageData(this.gimage, 0, 0);
  }
  stop() {
    this.stopped = true;
    if (this.raf) this.view.cancelAnimationFrame?.(this.raf); this.raf = 0; this.job = null;
    if (this.drift) this.freeze();
    if (this.swellTimer) this.view.clearTimeout?.(this.swellTimer); this.swellTimer = 0;
  }
}
