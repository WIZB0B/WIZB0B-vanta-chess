// Analyse together: every change bumps a counter; the higher counter wins, and on a tie the
// higher client id, so two people editing at once end up on the same board.
export function isNewer(incoming, local, myId) {
  const a = Number(incoming?.seq) || 0, b = Number(local?.seq) || 0;
  return a > b || (a === b && String(incoming?.id || '') > String(myId || ''));
}
const SQ = /^[a-h][1-8]$/;
export function cleanShapes(shapes) {
  return (Array.isArray(shapes) ? shapes : []).filter(x => x && SQ.test(x.from) && (!x.to || SQ.test(x.to))).slice(0, 24).map(x => ({ from: x.from, ...(x.to ? { to: x.to } : {}), brush: ['orange', 'red', 'green', 'blue', 'yellow'].includes(x.brush) ? x.brush : 'orange' }));
}
