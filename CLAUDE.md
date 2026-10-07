# CLAUDE.md — Vanta Chess (VCH)

## Project

Vanta Chess (VCH) is a browser chess app: Vite + vanilla JS front end (`src/`), chess.js for
local move legality, bundled Stockfish 19 (WebAssembly, in a Web Worker under `public/`) for
bots and analysis, and a Supabase backend. Online games are authoritative on the server: the
hosted `chess` Edge Function (`supabase/functions/chess`) and the `chess_*` schema own FEN, SAN,
clocks, results, ratings and seats. The client only sends move coordinates and an expected
version, and may show moves optimistically but must roll back to server state on rejection.
Hosting is Netlify (`netlify.toml`).

Planning docs — read before starting work:
- `docs/VCH-BACKLOG.md` — numbered open tasks; do one per chat, in order, unless the owner names another.
- `docs/VCH-ROADMAP.md` — phases A–H after the backlog.
- `docs/VCH-FIXES.md` — the original UI fix list and batch plan.
- `AGENTS.md` — contributor rules (security, data minimisation, migrations). Follow it too.

## Branch

Work only on `codex/set-up-vch-repository-and-implement-chess-game`. Never commit or push to
any other branch (in particular not the old `...-a878ma` branch from PR #2).

## Before every commit

All three must pass; never commit or push with any of them failing:

```sh
npm run security
npm test
npm run build
```

(`npm run check` runs all three.) Report any failure honestly instead of working around it.

## Security headers

`netlify.toml` security headers stay strict. The only relaxation allowed is
`'wasm-unsafe-eval'` in `script-src`, which Stockfish's WebAssembly needs. Never add
`'unsafe-eval'`, wildcard sources, or loosen CSP, HSTS, CORS, Referrer-Policy,
Permissions-Policy or frame-ancestors to make a feature work. `scripts/security-check.mjs`
enforces part of this.

## Supabase

Do not redeploy the `chess` Edge Function (or apply migrations to the hosted project) without
the owner's explicit approval for that specific deployment. Code changes to the function may
be committed; deploying them is the owner's call. Browser code uses only the public project URL
and anon key — never a service-role key.

## chess.com

chess.com is a reference for how the app should *feel* (fluidity, interactions, layout
ideas) only. Never copy its logo, art, text, sounds or layouts. All visuals are VCH's own.

## Other standing rules (from the backlog)

- Don't create, convert or commit image files as part of code tasks.
- Don't edit `.github/workflows`, don't use the Codex bot, and don't poll GitHub Actions.
- Preserve the board's `aspect-ratio: 1` and eight equal grid columns, with a1 a dark square.
- No unicode/emoji as icons; use `public/assets/vch/icons/`.
