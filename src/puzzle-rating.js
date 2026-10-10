// Puzzle rating helpers (the game server keeps the rating: rules.js puzzleRatingUpdate).

// Which difficulty to ask the puzzle provider for, from your puzzle rating.
export function difficultyForRating(rating = 1200) {
  const r = Number(rating) || 1200;
  if (r < 1000) return 'easiest';
  if (r < 1300) return 'easier';
  if (r < 1700) return 'normal';
  if (r < 2000) return 'harder';
  return 'hardest';
}

// "+12" / "−8" / "±0"
export function ratingDeltaText(before, after) {
  const d = Math.round(Number(after) - Number(before));
  if (!Number.isFinite(d)) return '';
  return d > 0 ? `+${d}` : d < 0 ? `−${-d}` : '±0';
}

// Theme ids from the puzzle provider are camelCase ("backRankMate"): make them readable.
export function themeLabel(theme) {
  const words = String(theme || '').replace(/([a-z])([A-Z0-9])/g, '$1 $2').replace(/[_-]+/g, ' ').trim().toLowerCase();
  return words ? words[0].toUpperCase() + words.slice(1) : '';
}

// Themes worth practising: at least 3 tries, lowest solve rate first.
export function weakestThemes(themes = [], n = 3) {
  return themes.filter(t => t.tries >= 3).sort((a, b) => a.rate - b.rate || b.tries - a.tries).slice(0, n);
}

// An SVG polyline path for the rating history (no chart library).
export function sparklinePoints(values = [], width = 280, height = 64, pad = 4) {
  const v = values.map(Number).filter(Number.isFinite);
  if (v.length < 2) return '';
  const min = Math.min(...v), max = Math.max(...v), span = max - min || 1;
  return v.map((x, i) => `${(pad + (i * (width - 2 * pad)) / (v.length - 1)).toFixed(1)},${(height - pad - ((x - min) * (height - 2 * pad)) / span).toFixed(1)}`).join(' ');
}
