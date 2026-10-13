// Living wallpaper (owner request 2026-10-13: "the candles in the background, flickering and
// reacting to the board; everything should feel alive"). The candles, lamps and their floor
// reflections in each VCH wallpaper, found by brightness and checked by eye, as positions in
// the image (0..1). src/main.js lays a soft glow over each one that flickers on its own and
// answers the game: a breath on every move, the flames gutter on a capture, flare on a check,
// tremble in time trouble, rise when you lead and fall when you trail. Pure data and helpers
// here; no image files.
//
// Each light: [x, y, size (share of the image width), colour, kind]
//   kind 'f' a flame (flickers), 'l' a lamp (breathes slowly), 'r' a reflection (follows,
//   softer).
export const WALLPAPER_SIZE = Object.freeze([2688, 1520]);
export const WALLPAPER_LIGHTS = Object.freeze({
  classic: [
    [0.8255, 0.9319, 0.0383, '#cf9762', 'r'],
    [0.7379, 0.9885, 0.013, '#d79a5e', 'r'],
    [0.9706, 0.5336, 0.0126, '#e4a960', 'f'],
    [0.101, 0.8513, 0.0119, '#b59367', 'r'],
    [0.032, 0.4855, 0.0126, '#e1a863', 'f'],
    [0.9842, 0.0704, 0.0149, '#d08d50', 'f'],
    [0.8387, 0.1138, 0.0193, '#d39e6b', 'f'],
    [0.1371, 0.9701, 0.0071, '#c68c59', 'f'],
    [0.1752, 0.9368, 0.0067, '#d4985d', 'f'],
    [0.7301, 0.8556, 0.0071, '#d09860', 'r'],
    [0.1618, 0.1161, 0.01, '#d79b64', 'f'],
    [0.4866, 0.4138, 0.0052, '#c6996b', 'f'],
    [0.6416, 0.3628, 0.0078, '#db984d', 'f'],
    [0.1375, 0.9391, 0.0078, '#cb905a', 'f'],
    [0.0339, 0.072, 0.0078, '#d49553', 'f'],
    [0.4505, 0.4141, 0.006, '#c89c6c', 'f'],
    [0.1776, 0.9036, 0.0078, '#d39659', 'r'],
    [0.6708, 0.3023, 0.0056, '#d0985f', 'f'],
    [0.9727, 0.697, 0.0086, '#cf965e', 'f'],
    [0.9957, 0.372, 0.0048, '#d19451', 'f'],
    [0.4661, 0.9776, 0.0067, '#d79d66', 'f'],
    [0.3566, 0.3622, 0.0086, '#dd9b52', 'f'],
    [0.3255, 0.2898, 0.0063, '#d49454', 'f'],
    [0.3571, 0.7447, 0.006, '#cf8c52', 'r'],
    [0.4812, 0.1878, 0.0048, '#d39b67', 'f'],
    [0.7236, 0.4102, 0.0056, '#d19257', 'f'],
    [0.2729, 0.4118, 0.0045, '#d59a5b', 'f'],
    [0.0026, 0.5579, 0.0052, '#e4a565', 'f'],
    [0.4148, 0.3865, 0.0056, '#dda25b', 'f'],
    [0.4332, 0.526, 0.0048, '#d59954', 'f'],
    [0.6641, 0.2941, 0.006, '#d29c62', 'f'],
    [0.0218, 0.6928, 0.0078, '#d09d6a', 'f'],
    [0.0331, 0.699, 0.0045, '#d49d63', 'f'],
    [0.9952, 0.6947, 0.0052, '#be8d63', 'f'],
    [0.5718, 0.3832, 0.0041, '#de9c59', 'f'],
  ],
  burgundy: [
    [0.8129, 0.1105, 0.026, '#e49341', 'l'],
    [0.2161, 0.1118, 0.0246, '#dc8f42', 'l'],
    [0.7967, 0.9322, 0.0208, '#e8a440', 'r'],
    [0.0048, 0.6648, 0.013, '#efae46', 'f'],
    [0.1187, 0.4523, 0.0093, '#e19943', 'f'],
    [0.0277, 0.703, 0.0093, '#db8531', 'r'],
    [0.9987, 0.1566, 0.0097, '#eba341', 'f'],
    [0.9665, 0.4766, 0.0074, '#eba03a', 'f'],
    [0.8735, 0.3162, 0.0085, '#f1b35c', 'f'],
    [0.8886, 0.3813, 0.0085, '#f1b35c', 'f'],
    [0.9924, 0.3349, 0.0085, '#f1b35c', 'f'],
  ],
  ivory: [
    [0.305, 0.201, 0.012, '#f4bd6a', 'f'],
    [0.695, 0.201, 0.012, '#f4bd6a', 'f'],
    [0.872, 0.265, 0.01, '#f2b862', 'f'],
    [0.84, 0.271, 0.007, '#f2b862', 'f'],
    [0.885, 0.416, 0.008, '#f4c070', 'f'],
    [0.81, 0.4405, 0.006, '#f4c070', 'f'],
    [0.7987, 0.448, 0.006, '#f4c070', 'f'],
    [0.0175, 0.3993, 0.0164, '#eab75e', 'l'],
    [0.3657, 0.7704, 0.0112, '#d4a06d', 'r'],
    [0.6352, 0.7671, 0.01, '#cb9767', 'r'],
  ],
  cobalt: [
    [0.3188, 0.2257, 0.007, '#f1b866', 'f'],
    [0.327, 0.229, 0.006, '#f1b866', 'f'],
    [0.3188, 0.3704, 0.009, '#f0b464', 'f'],
    [0.3188, 0.3987, 0.006, '#f0b464', 'f'],
    [0.7429, 0.2257, 0.007, '#f1b866', 'f'],
    [0.7429, 0.3704, 0.009, '#f0b464', 'f'],
    [0.7429, 0.3967, 0.006, '#f0b464', 'f'],
    [0.745, 0.6447, 0.0097, '#dca669', 'r'],
    [0.3205, 0.6447, 0.0074, '#d7ab7d', 'r'],
  ],
});

// The wallpaper in a computed background-image ("…/wallpaper-cobalt.webp") as a light-set key.
export function wallpaperKey(backgroundImage = '') {
  const m = /wallpaper-(emerald|cobalt|burgundy|ivory)\.webp/.exec(String(backgroundImage));
  return m ? (m[1] === 'emerald' ? 'classic' : m[1]) : null;
}

// Where the image lands for background-size: cover; background-position: center top.
export function coverPlacement(areaW, areaH, [imgW, imgH] = WALLPAPER_SIZE) {
  const s = Math.max(areaW / imgW, areaH / imgH);
  return { s, ox: (areaW - imgW * s) / 2, oy: 0 };
}

// Screen boxes for the lights of one wallpaper in an area of areaW × areaH (CSS px). Each
// light gets its own flicker: a duration and a start offset drawn from a small seeded
// generator, so a light flickers the same way every visit. Lights off the area are dropped.
export function placeLights(key, areaW, areaH) {
  const lights = WALLPAPER_LIGHTS[key] || [], { s, ox, oy } = coverPlacement(areaW, areaH);
  let seed = 97;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const out = [];
  for (const [x, y, size, color, kind] of lights) {
    const px = ox + x * WALLPAPER_SIZE[0] * s, py = oy + y * WALLPAPER_SIZE[1] * s;
    const glow = Math.max(18, size * WALLPAPER_SIZE[0] * s * (kind === 'l' ? 5 : kind === 'r' ? 3.2 : 4.2));
    const d = kind === 'l' ? 3.2 + rand() * 1.6 : 0.9 + rand() * 1.1, o = -rand() * 3;
    if (px < -glow || py < -glow || px > areaW + glow || py > areaH + glow) continue;
    out.push({ x: Math.round(px), y: Math.round(py), size: Math.round(glow), color, kind, d: Number(d.toFixed(2)), o: Number(o.toFixed(2)) });
  }
  return out;
}

// What the room does for a move: 'flare' for a check, 'gutter' for a capture, else 'breath'.
// In Vanta Dark and Blackout the room only breathes for the other side's moves, so it never
// tells you about a capture or a check you couldn't see.
export function lightReaction({ captured = false, check = false, mine = true, fog = false } = {}) {
  if (fog && !mine) return 'breath';
  if (check) return 'flare';
  if (captured) return 'gutter';
  return 'breath';
}
