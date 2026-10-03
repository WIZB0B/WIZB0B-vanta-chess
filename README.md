# Vanta Chess

Vanta Chess is a Vite single-page client for the existing authoritative VCH backend. The browser sends intent—move coordinates plus an expected version—through the hosted `chess` Edge Function. It never writes authoritative FEN, clocks, seats, results, or ratings.

See [`docs/architecture.md`](docs/architecture.md) and the [security audit](docs/security/security-audit.md).

## Development

Requires Node.js 20.19 or newer.

```sh
npm ci
npm run dev
```

The production Edge Function URL is public and built in. `.env.example` shows the optional endpoint override. Never add a service-role key to frontend environment variables.

## Validation

```sh
npm audit --audit-level=high
npm run security
npm test
npm run build
npm run check
```

## Deployment

Netlify builds with `netlify.toml` for the single `vanta-chess-play` site. The configuration pins Node, provides SPA routing, and defines production security headers. Verify actual deployed headers rather than assuming configuration was applied.

The pinned `stockfish@19.0.0` dependency supplies the self-hosted Stockfish.js 19
lite single-threaded build. `predev` and `prebuild` copy its JS, WASM, README, and
GPLv3 license into the gitignored `public/engines/` runtime directory; no engine
binary is stored in the Git patch or fetched from a CDN at runtime. Exact source
links remain in `public/engines/SOURCE.md`. The worker fails closed and never
substitutes random moves while presenting them as Stockfish.
