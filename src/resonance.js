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


// The Resonance background: sand behind the whole page, dim and still. The plate is a square
// that covers the window (centred, like background-size: cover), so its figures keep their
// shape on any screen. show(mode) works out where every grain goes next a few thousand grains a
// frame (so the page never stutters), lets the sand drift there over `flow` ms and then stops:
// between figures nothing is redrawn. The first figure appears without drifting. Grains are
// written straight into pixels (one putImageData a frame, a few ms even without a GPU), and
// where they pile up they add up, so the lines glow at their cores like real sand.
// Options: {color, density (CSS px² of window per grain), size and spread (CSS px: a grain, and
// how far grains scatter around a line), flow (ms), random, view, onReady} where `view` supplies innerWidth/innerHeight/devicePixelRatio and the animation frame
// calls, and onReady() runs once, when the first figure has been drawn.
const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const TONES = [45, 70, 100]; // three shades of sand (alpha out of 255) that add up where grains pile
const LITTLE_ENDIAN = new Uint8Array(new Uint32Array([1]).buffer)[0] === 1;
export class SandBackdrop {
  constructor(canvas, { color = '#e9dcb8', density = 60, size = 1.6, spread = 3, flow = 3200, random = Math.random, view = globalThis, onReady = null } = {}) {
    Object.assign(this, { canvas, color, density, size, spread, flow, random, view, onReady });
    this.ctx = canvas.getContext('2d'); this.image = null;
    const hex = /^#?([0-9a-f]{6})$/i.exec(color)?.[1] || 'e9dcb8', rgb = [0, 2, 4].map(k => parseInt(hex.slice(k, k + 2), 16));
    this.rgb = LITTLE_ENDIAN ? (rgb[2] << 16) | (rgb[1] << 8) | rgb[0] : (rgb[0] << 24) | (rgb[1] << 16) | (rgb[2] << 8);
    this.mode = null; this.count = 0; this.raf = 0; this.job = null; this.drift = null; this.drawn = false;
    this.layout();
  }
  get busy() { return !!(this.job || this.drift); }
  // The window, the covering square and the part of the plate in view. The sand is sown again
  // only when the window changes a lot (a phone turned on its side), and then simply re-forms.
  layout() {
    const v = this.view, W = Math.max(1, v.innerWidth || 1), H = Math.max(1, v.innerHeight || 1), S = Math.max(W, H);
    this.dpr = Math.min(W * H > 600000 ? 1 : 2, v.devicePixelRatio || 1); // a background: big windows draw at 1x
    Object.assign(this, { W, H, S, ox: (W - S) / 2, oy: (H - S) / 2 });
    const vx = (1 - W / S) / 2, vy = (1 - H / S) / 2, margin = 0.03;
    this.lo = [Math.max(0, vx - margin), Math.max(0, vy - margin)]; this.hi = [Math.min(1, 1 - vx + margin), Math.min(1, 1 - vy + margin)];
    const w = Math.round(W * this.dpr), h = Math.round(H * this.dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
    if (this.image?.width !== w || this.image?.height !== h) { this.image = this.ctx.createImageData(w, h); this.pixels = new Uint32Array(this.image.data.buffer); }
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
    for (const k of ['x', 'y', 'fx', 'fy', 'tx', 'ty', 'jx', 'jy', 'wait']) this[k] = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      this.x[i] = x0 + r() * (x1 - x0); this.y[i] = y0 + r() * (y1 - y0);
      // A fixed scatter around the line (Box–Muller, `spread` CSS px), drawn in screen space.
      const a = Math.sqrt(-2 * Math.log(1 - r() * 0.999)) * this.spread, b = 2 * Math.PI * r();
      this.jx[i] = a * Math.cos(b); this.jy[i] = a * Math.sin(b);
      this.wait[i] = r() * 0.3;
    }
    this.drawn = false;
  }
  inView(x, y) { return x >= this.lo[0] && x <= this.hi[0] && y >= this.lo[1] && y <= this.hi[1]; }
  // Sets the figure. flow: false places the sand at once (the first figure, reduced motion).
  show(mode, { flow = true } = {}) {
    if (!mode || (this.mode && mode.n === this.mode.n && mode.m === this.mode.m && mode.s === this.mode.s)) return;
    if (this.drift) this.hold();
    this.mode = mode;
    this.job = { mode, i: 0, flow: flow && this.drawn };
    this.schedule();
  }
  // Freezes a drift where it is (a new figure arrived before the last one formed).
  hold() {
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
  schedule() { if (!this.raf && this.view.requestAnimationFrame) this.raf = this.view.requestAnimationFrame(t => this.tick(t)); }
  // A drift is drawn about 30 times a second: slow sand needs no more, and the page behind the
  // glass panels is redrawn half as often.
  tick() {
    this.raf = 0;
    if (this.job) { this.work(this.now() + 6); if (this.busy) this.schedule(); return; }
    if (!this.drift) return;
    const now = this.now(), t = this.progress(now);
    if (t < 1 && now - (this.drift.drawn || 0) < 30) { this.schedule(); return; }
    this.drift.drawn = now;
    this.draw(t);
    if (t >= 1) { this.x.set(this.tx); this.y.set(this.ty); this.drift = null; return; }
    this.schedule();
  }
  // Paints the sand: during a drift at its point along the way (t), otherwise where it rests.
  draw(t = 1) {
    const { count, S, ox, oy, dpr, x: X, y: Y, fx, fy, tx, ty, jx, jy, pixels, rgb } = this, drifting = !!this.drift;
    const w = this.image.width, h = this.image.height, k = Math.max(1, Math.round(this.size * dpr)), half = k / 2, scale = S * dpr;
    pixels.fill(0);
    for (let i = 0; i < count; i++) {
      let x = X[i], y = Y[i];
      if (drifting) { const e = this.ease(i, t); x = fx[i] + (tx[i] - fx[i]) * e; y = fy[i] + (ty[i] - fy[i]) * e; }
      const px = Math.round((ox + jx[i]) * dpr + x * scale - half), py = Math.round((oy + jy[i]) * dpr + y * scale - half);
      if (px < 0 || py < 0 || px + k > w || py + k > h) continue;
      const add = TONES[i % 3];
      for (let r = 0; r < k; r++) for (let c = 0, p = (py + r) * w + px; c < k; c++, p++) {
        const a = Math.min(255, (LITTLE_ENDIAN ? pixels[p] >>> 24 : pixels[p] & 255) + add);
        pixels[p] = LITTLE_ENDIAN ? ((a << 24) | rgb) >>> 0 : (rgb | a) >>> 0;
      }
    }
    this.ctx.putImageData(this.image, 0, 0);
    if (!this.drawn) { this.drawn = true; const ready = this.onReady; this.onReady = null; ready?.(); }
  }
  stop() { if (this.raf) this.view.cancelAnimationFrame?.(this.raf); this.raf = 0; this.job = null; if (this.drift) this.hold(); }
}
