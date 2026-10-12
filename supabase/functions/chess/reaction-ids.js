// Chat reactions: VCH's own animated reactions travel through game chat as a short, fixed body
// (":r:gg"). This tiny pure module is shared by the chess Edge Function, which accepts a reaction
// only when the body is exactly one of these ids, and the browser (src/reactions.js), which owns
// the pictures. Keep the ids in step with REACTIONS in src/reactions.js (a test checks it).
export const REACTION_PREFIX = ':r:';
export const REACTION_IDS = Object.freeze([
  'gg', 'nice', 'oops', 'blunder', 'check', 'hurry', 'thinking', 'fire',
  'crown', 'handshake', 'sacrifice', 'castle', 'promotion', 'goodluck', 'rematch', 'wow',
]);
const KNOWN = new Set(REACTION_IDS);
const LONGEST = REACTION_PREFIX.length + Math.max(...REACTION_IDS.map(id => id.length));

// The chat body that carries a reaction, or null for an unknown id.
export function reactionBody(id) {
  return typeof id === 'string' && KNOWN.has(id) ? REACTION_PREFIX + id : null;
}

// The reaction id carried by a chat body, or null. Strict: the whole body must be the prefix and a
// known id, with no spaces, other case, or extra text.
export function reactionIdOf(body) {
  if (typeof body !== 'string' || body.length > LONGEST || !body.startsWith(REACTION_PREFIX)) return null;
  const id = body.slice(REACTION_PREFIX.length);
  return KNOWN.has(id) ? id : null;
}

export function isReactionBody(body) {
  return reactionIdOf(body) !== null;
}
