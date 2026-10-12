// Twin Fates: one famous position, played twice, once with each colour. The positions and the
// match score are the game server's (rules.js); the browser shows them.
export { FATES, fateById, twinScore } from '../supabase/functions/chess/rules.js';
// 1.5 → "1½"
export const points = n => { const v = Number(n) || 0, whole = Math.floor(v); return v - whole >= 0.5 ? `${whole || ''}½` : String(whole); };
