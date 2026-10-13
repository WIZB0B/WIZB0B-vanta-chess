// Living atmosphere (round 12): the room around the board reacts to your game. Candles gutter
// when your king is in check, a storm gathers as your clock runs down, warm light rises when you
// take the lead and the room cools when you fall behind; the end brings dawn or dusk. Only the
// position and the clocks drive it (never an engine), so it gives nothing away in live games.
// Pure: src/main.js puts the mood on the #atmosphere layer.

const VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
// Material on the board for each side, from a FEN.
export function materialFromFen(fen = '') {
  const out = { w: 0, b: 0 };
  for (const ch of String(fen).split(' ')[0] || '') { const t = ch.toLowerCase(); if (VALUE[t] !== undefined) out[ch === t ? 'b' : 'w'] += VALUE[t]; }
  return out;
}
// The mood: {mood, strength 0..1}. Moods, strongest first: dawn/dusk (game over), check, storm,
// lead, fall, calm.
export function atmosphereFor({ live = false, over = false, won = null, inCheck = false, myColor = 'w', fen = '', myClockSec = null, baseSec = 600 } = {}) {
  if (over) return won === true ? { mood: 'dawn', strength: 1 } : won === false ? { mood: 'dusk', strength: 1 } : { mood: 'calm', strength: 0 };
  if (!live) return { mood: 'calm', strength: 0 };
  if (inCheck) return { mood: 'check', strength: 1 };
  if (Number.isFinite(myClockSec) && myClockSec >= 0) {
    const limit = Math.max(15, Math.min(60, baseSec * 0.12)); // the last 12% of the clock (15s to a minute)
    if (myClockSec <= limit) return { mood: 'storm', strength: Math.round((1 - myClockSec / limit) * 100) / 100 || 0.05 };
  }
  const m = materialFromFen(fen), diff = (myColor === 'b' ? m.b - m.w : m.w - m.b);
  if (diff >= 2) return { mood: 'lead', strength: Math.min(1, (diff - 1) / 8) };
  if (diff <= -2) return { mood: 'fall', strength: Math.min(1, (-diff - 1) / 8) };
  return { mood: 'calm', strength: 0 };
}
// How tense the game is (0..1), for the music: deeper into the game, checks and captures.
export function tensionFor({ plies = 0, inCheck = false, recentCaptures = 0, storm = 0 } = {}) {
  const phase = Math.min(1, plies / 60), t = phase * 0.45 + (inCheck ? 0.3 : 0) + Math.min(0.25, recentCaptures * 0.1) + storm * 0.4;
  return Math.round(Math.min(1, t) * 100) / 100;
}
