/* Lozza 2.5 bridge (MIT, Colin Jenkins: https://github.com/op12no2/lozza, tag 2.5).
 * The engine file and its license are prepared into /engines by scripts/prepare-lozza.mjs.
 * Lozza is a JavaScript engine with a hand-tuned, Fruit-style evaluation: VCH's second mind,
 * for the campaign's guards (src/engine-roster.js).
 *
 * Requests (the same shape as /stockfish.worker.js):
 *   {mode:'bot', fen, nodes, requestId}       searches a fixed number of nodes
 *   {mode:'analysis', fen, depth, requestId}  searches to a depth
 *   {action:'stop'}                           ends the running search
 * Replies: {type:'uci', line, requestId} for each engine line, and
 *          {type:'unavailable', message, requestId} if the engine can't start.
 * Lozza searches synchronously and does not obey "stop", so stopping it (or a new request
 * during a search) ends its worker; the next request starts a fresh one. */
const MIN_NODES = 200, MAX_NODES = 500000, MAX_DEPTH = 20;
let engine = null, current = null;

const clamp = (value, min, max, fallback) => { const n = Number(value); return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.round(n))) : fallback; };

function boot() {
  engine = new Worker('/engines/lozza-2.5.js');
  engine.onmessage = event => {
    if (!current) return;
    for (const raw of String(event.data).split('\n')) {
      const line = raw.trim();
      if (!line) continue;
      self.postMessage({ type: 'uci', line, requestId: current.requestId });
      if (line.startsWith('bestmove')) { current = null; return; }
    }
  };
  engine.onerror = () => {
    self.postMessage({ type: 'unavailable', message: 'Lozza failed to load', requestId: current?.requestId ?? null });
    current = null; engine?.terminate(); engine = null;
  };
  engine.postMessage('uci');
  engine.postMessage('ucinewgame');
}
function halt() {
  if (engine && current) { engine.terminate(); engine = null; }
  current = null;
}

self.onmessage = ({ data }) => {
  try {
    if (data?.action === 'stop') { halt(); return; }
    if (!data?.fen) return;
    halt();
    if (!engine) boot();
    current = { requestId: data.requestId ?? null };
    engine.postMessage(`position fen ${String(data.fen).replace(/[^\w/ -]/g, '')}`);
    engine.postMessage(data.mode === 'analysis' ? `go depth ${clamp(data.depth, 1, MAX_DEPTH, 12)}` : `go nodes ${clamp(data.nodes, MIN_NODES, MAX_NODES, 5000)}`);
  } catch {
    self.postMessage({ type: 'unavailable', message: 'Lozza failed to load', requestId: data?.requestId ?? null });
  }
};
