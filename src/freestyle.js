// Freestyle: Chess960 starting positions, played without castling (chess.js has no 960
// castling). The same generator the game server uses.
export { freestyleBackRank, freestyleFen, isFreestyleRank } from '../supabase/functions/chess/rules.js';
export const FREESTYLE_LABEL = 'Freestyle · 960 start, no castling';
