// Arena listing helpers: where an arena is in its life and how to say so.

export const isWeeklyArena = t => String(t?.slug || '').startsWith('weekly-arena-');

function span(ms) {
  const m = Math.max(0, Math.round(ms / 60000)), d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = m % 60;
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${mm}m`;
  return `${Math.max(1, mm)}m`;
}

// {phase:'upcoming'|'live'|'finished', label}
export function arenaPhase(t, now = Date.now()) {
  const start = Date.parse(t?.starts_at || ''), end = Date.parse(t?.ends_at || '');
  if (t?.status === 'finished' || t?.status === 'cancelled' || (Number.isFinite(end) && now >= end)) return { phase: 'finished', label: 'Finished' };
  if (Number.isFinite(start) && now < start) return { phase: 'upcoming', label: `Starts in ${span(start - now)}` };
  // Permanent halls run for a year: "Open now" reads better than a far-off end.
  if (Number.isFinite(end) && end - now < 86400000) return { phase: 'live', label: `Live · ends in ${span(end - now)}` };
  return { phase: 'live', label: 'Open now' };
}

// Weekly arena first, then live, upcoming, finished.
export function sortArenas(list = [], now = Date.now()) {
  const rank = t => (isWeeklyArena(t) ? 0 : 10) + { live: 0, upcoming: 1, finished: 2 }[arenaPhase(t, now).phase];
  return [...list].sort((a, b) => rank(a) - rank(b) || Date.parse(a.starts_at || 0) - Date.parse(b.starts_at || 0));
}

export function standingsRows(standings = []) {
  return standings.map((p, i) => ({ rank: i + 1, name: p.username || p.display_name || 'Player', points: Number(p.points || 0), record: `${p.wins || 0}W ${p.draws || 0}D ${p.losses || 0}L`, fire: !!p.on_fire || Number(p.streak || 0) >= 3, berserks: Number(p.berserks || 0) }));
}
