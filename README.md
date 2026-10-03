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

Official Stockfish 19 JS/WASM artifacts must be self-hosted at `public/engines/` with the upstream GPL license and source offer. Until those reviewed artifacts are present the worker fails closed and the UI does not substitute a random bot while calling it Stockfish.
