// Resonance (round 13 idea): Chladni figures on the chessboard.
//
// Sprinkle sand on a metal plate and make it ring: the sand jumps off the parts that vibrate and
// gathers on the lines that stay still (the nodal lines), drawing the figures Ernst Chladni
// published in 1787. A chessboard is a square plate, so VCH draws them on the board, live, from
// the game's own music and moves. Nothing here is an image or AI art: every figure is computed.
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
// A move to a mode, for the board without music: where the piece lands and what it is.
const PIECE_RANK = { p: 0, n: 1, b: 2, r: 3, q: 4, k: 5 };
export function modeForMove({ to = 'a1', piece = 'p', captured = null, check = false } = {}, modes = MODES) {
  const file = to.charCodeAt(0) - 97, rank = Number(to[1]) - 1;
  const base = 3 + PIECE_RANK[piece] * 3 + ((file + rank) % 4) + (captured ? 4 : 0) + (check ? 6 : 0);
  return modes[Math.min(modes.length - 1, base)];
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

