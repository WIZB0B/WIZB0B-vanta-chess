# Stockfish 19 browser distribution

The build prepares the `stockfish-19-lite-single` browser files locally from the
pinned GPL-3.0 `stockfish@19.0.0` npm dependency. Generated JS, WASM, package
README, and license files are deliberately gitignored so the source patch stays
text-only:

- Browser port/source: <https://github.com/nmrugg/stockfish.js>
- Upstream Stockfish source/tag: <https://github.com/official-stockfish/Stockfish/tree/sf_19>
- Exact npm source archive: <https://registry.npmjs.org/stockfish/-/stockfish-19.0.0.tgz>

`Copying.txt` is the complete GPLv3 license supplied with that distribution.
The corresponding source is available at the links above. The single-threaded
lite build avoids cross-origin-isolation requirements while retaining Stockfish
19 UCI and limited-strength support.

Run `npm run prepare:stockfish` to materialize the runtime files. No engine file
is fetched from a CDN at runtime.
