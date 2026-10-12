// A Worker that is created on the first message that needs it. "stop" before the worker
// exists has nothing to stop, so it never creates one.
export function lazyWorker(url, create = u => new Worker(u)) {
  let worker = null, handler = null;
  return {
    get started() { return !!worker; },
    set onmessage(fn) { handler = fn; if (worker) worker.onmessage = fn; },
    get onmessage() { return handler; },
    postMessage(message) {
      if (!worker && message && message.action === 'stop') return;
      if (!worker) { worker = create(url); if (handler) worker.onmessage = handler; }
      worker.postMessage(message);
    },
    terminate() { worker?.terminate(); worker = null; },
  };
}
