/* Stockfish.js 19 GPLv3 bridge. The vendored single-threaded browser build and
 * complete GPL text live in /engines. Upstream/source details are documented in
 * /engines/README.md. Search remains isolated from the application thread. */
let engine;
function ensureEngine() {
  if (engine) return engine;
  engine = new Worker('/engines/stockfish-19-lite-single.js');
  engine.onmessage = event => self.postMessage({ type: 'uci', line: String(event.data) });
  engine.onerror = () => self.postMessage({ type: 'unavailable', message: 'Stockfish 19 failed to load' });
  engine.postMessage('uci');
  return engine;
}
self.onmessage = ({ data }) => {
  try {
    const worker = ensureEngine();
    const requested = Math.max(800, Math.min(3190, Number(data.elo) || 1500));
    if (requested < 1320) {
      const skill = requested < 1000 ? 0 : requested < 1150 ? 2 : 4;
      worker.postMessage('setoption name UCI_LimitStrength value false');
      worker.postMessage(`setoption name Skill Level value ${skill}`);
    } else {
      worker.postMessage('setoption name UCI_LimitStrength value true');
      worker.postMessage(`setoption name UCI_Elo value ${requested}`);
    }
    worker.postMessage(`position fen ${data.fen}`);
    worker.postMessage(`go movetime ${Math.max(100, Number(data.movetime) || 350)}`);
  } catch {
    self.postMessage({ type: 'unavailable', message: 'Stockfish 19 failed to load' });
  }
};
