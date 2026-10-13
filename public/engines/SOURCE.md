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

# Multi-variant Stockfish (Crazyhouse) browser distribution

Stockfish 19 cannot play variants with piece drops. For Crazyhouse (and Bughouse
boards, searched as Crazyhouse) the build prepares `stockfish-mv-10.js` and
`stockfish-mv-10.wasm` locally from the pinned GPL-3.0 `stockfish.js@10.0.2` npm
dependency: the multi-variant Stockfish fork (Stockfish 2019-08-15 Multi-Variant,
by D. Dugovic, F. Fichter et al.) compiled to single-threaded WebAssembly by
Niklas Fiekas with Emscripten. `/variant.worker.js` drives it. The generated files
and the package README (`README-stockfish-mv-10.md`) are gitignored like the
Stockfish 19 files:

- Browser port/source: <https://github.com/niklasf/stockfish.js/tree/ddugovic>
- Upstream multi-variant Stockfish source: <https://github.com/ddugovic/Stockfish>
- Exact npm source archive: <https://registry.npmjs.org/stockfish.js/-/stockfish.js-10.0.2.tgz>
  (`sha512-treB3AYcdvRJ9SDPOyL0R2NcEAtQgG432nStfRzR4wzVELGQ6iVoeBHwvirHTfocNOTims7XNkK3SADaocsJmQ==`)

Only the package's WebAssembly build is shipped: `stockfish.wasm.js` as
`stockfish-mv-10.js` and `stockfish.wasm` as `stockfish-mv-10.wasm`. Its asm.js
fallback (`stockfish.js`) is not. `scripts/prepare-variant-engine.mjs` checks both
files against pinned SHA-256 digests and makes one change to the loader, recorded
in a notice at its top (2026-10-12): the WebAssembly file name it fetches,
`stockfish.wasm`, becomes `stockfish-mv-10.wasm`. The `.wasm` binary is unmodified.
The package's GPLv3 text is byte-identical to `Copying.txt` above, which covers
both engines. The loader uses neither `eval` nor `new Function`, so it runs under
the site CSP with only `'wasm-unsafe-eval'`, and it needs no SharedArrayBuffer.

Run `npm run prepare:variant-engine` to materialize these runtime files.

# Lozza 2.5 (MIT)

Lozza is a JavaScript chess engine by Colin Jenkins with a hand-tuned evaluation inspired by
Fruit 2.1. VCH uses it as a second engine with its own judgement: the Fruitwood and Ironbark
computer opponents and the campaign guards from the Mirror Court on (`src/engine-roster.js`).

- Source: <https://github.com/op12no2/lozza>, tag `2.5`, commit
  `0cf341d0965016adb93bbd6b3575b4a693828deb` (10 February 2023)
- License: MIT (`vendor/lozza/LICENSE`, shipped as `/engines/LICENSE-lozza.txt`)

`vendor/lozza/lozza-2.5.js` is the upstream `lozza.js`, unchanged.
`scripts/prepare-lozza.mjs` checks it and the license against pinned SHA-256 digests and copies
them to `public/engines` (gitignored, like the Stockfish files). `/lozza.worker.js` runs it.
Lozza has no Elo setting; VCH plays it at fixed node budgets whose strength was measured against
Stockfish 19 at VCH's bot settings (`LOZZA_LEVELS` in `src/engine-roster.js`).
