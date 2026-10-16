// Moves you hear where they happen (owner, 2026-10-13: "HD 3D audio"). A move is a wooden knock,
// placed around you by the square it lands on (HRTF panning: with headphones the files run left to
// right and the far ranks sound further away); a capture knocks twice, heavier; a check rings.
// Made in the browser (Web Audio), no recordings.

// Where a square is heard, from where it sits on the board: `x` −1 (left edge) .. 1 (right edge),
// `far` −1 (the near edge) .. 1 (the far edge). You sit at the near edge, facing the board (−z).
export function soundPlace(x = 0, far = 0) {
  const cx = Math.max(-1, Math.min(1, Number(x) || 0)), cf = Math.max(-1, Math.min(1, Number(far) || 0));
  return [cx * 1.4, -0.5, -1.8 - cf * 0.9];
}

const noiseFor = new WeakMap();
function noise(ctx) {
  let buf = noiseFor.get(ctx);
  if (!buf) {
    const rate = ctx.sampleRate || 44100, len = Math.floor(rate * 0.08), d = (buf = ctx.createBuffer(1, len, rate)).getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    noiseFor.set(ctx, buf);
  }
  return buf;
}
function tone(ctx, type, freq, at, decay, peak, dest) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, at);
  g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(peak, at + 0.002); g.gain.setTargetAtTime(0, at + 0.002, decay / 4);
  o.connect(g); g.connect(dest); o.start(at); o.stop(at + decay + 0.05);
}
// The knock: the wood's ring and its overtone, the thump of the board, the click of the felt.
function knock(ctx, at, dest, strength = 1, pitch = 1) {
  tone(ctx, 'sine', 245 * pitch, at, 0.09, 0.22 * strength, dest);
  tone(ctx, 'sine', 575 * pitch, at, 0.05, 0.08 * strength, dest);
  tone(ctx, 'sine', 120 * pitch, at, 0.07, 0.16 * strength, dest);
  const src = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = noise(ctx); bp.type = 'bandpass'; bp.frequency.value = 2300 * pitch; bp.Q.value = 1.4;
  g.gain.setValueAtTime(0.22 * strength, at); g.gain.setTargetAtTime(0, at, 0.006);
  src.connect(bp); bp.connect(g); g.connect(dest); src.start(at); src.stop(at + 0.08);
}

// Plays a move: {place: [x, y, z] (from soundPlace) or null for straight ahead, capture, check,
// volume}. Returns the node the sound was placed with (a panner, or the plain output).
export function playMoveSound(ctx, { place = null, capture = false, check = false, volume = 0.5 } = {}) {
  const at = (ctx.currentTime || 0) + 0.004, out = ctx.createGain();
  out.gain.value = volume;
  let head = out;
  if (place && ctx.createPanner) {
    const p = ctx.createPanner(); p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = 1.2; p.rolloffFactor = 0.5;
    const [x, y, z] = place;
    if (p.positionX) { p.positionX.value = x; p.positionY.value = y; p.positionZ.value = z; } else p.setPosition?.(x, y, z);
    out.connect(p); head = p;
  }
  head.connect(ctx.destination);
  knock(ctx, at, out, capture ? 1.25 : 1);
  if (capture) knock(ctx, at + 0.045, out, 0.8, 0.82);
  if (check) { tone(ctx, 'triangle', 1318.5, at + 0.02, 0.35, 0.06, out); tone(ctx, 'sine', 1975.5, at + 0.02, 0.25, 0.03, out); }
  return head;
}
