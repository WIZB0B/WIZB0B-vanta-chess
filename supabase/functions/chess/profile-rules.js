// Profile rules shared by the chess function and the browser (src/portrait.js re-exports them).
// - VCH portraits: anyone, guests included, can wear one of these instead of an uploaded
//   picture (uploads stay for signed-in accounts). An id is "<piece>-<tone>", e.g. "n-emerald".
// - About: a short line on the public profile.
// - Names: 3–20 letters, digits, spaces, "_", "." or "-" for guest display names.
export const PORTRAIT_PIECES = ['k', 'q', 'r', 'b', 'n', 'p'];
export const PORTRAIT_TONES = ['emerald', 'gold', 'ivory', 'onyx', 'crimson', 'cobalt'];
export const PORTRAIT_PRESETS = PORTRAIT_TONES.flatMap(tone => PORTRAIT_PIECES.map(piece => `${piece}-${tone}`));
export const isPortraitPreset = id => PORTRAIT_PRESETS.includes(String(id || ''));
export const BIO_MAX = 160;
export function cleanBio(value) {
  return String(value || '').replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, BIO_MAX);
}
export const DISPLAY_NAME_RE = /^[\p{L}\p{N}][\p{L}\p{N} _.-]{1,18}[\p{L}\p{N}_.]$/u;
export function cleanDisplayName(value) {
  return String(value || '').replace(/[\u0000-\u001F\u007F]/g, '').replace(/\s+/g, ' ').trim().slice(0, 20);
}
export const isDisplayName = value => DISPLAY_NAME_RE.test(cleanDisplayName(value));
