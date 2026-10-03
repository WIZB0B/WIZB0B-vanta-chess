# Vanta Chess

A cinematic chess client built with Vite, `chess.js`, and Supabase Realtime. The
client works locally without credentials and enables persistent private rooms
and chat when Supabase environment variables are configured.

See [`docs/architecture.md`](docs/architecture.md) for the runtime topology,
repository layout, and security boundaries.

## Development

```sh
npm install
npm run dev
```

Copy `.env.example` to `.env` and add the `vanta-chess` project URL and anon key.
Apply `supabase/schema.sql` in that project's SQL editor. The Netlify production
site is configured by `netlify.toml`; connect the repository to the
`vanta-chess-play` project and set the same environment variables there.

For Supabase CLI development, run `supabase start` followed by
`supabase db reset`. The canonical migrations live under
`supabase/migrations/`; `supabase/schema.sql` is retained as a dashboard-friendly
bootstrap snapshot.

## Validation

```sh
npm test
npm run build
npm run check
```

## Stockfish

The app's worker boundary is `public/stockfish.worker.js`. Add the official
Stockfish 19 web build as `public/engines/stockfish-19.js` and its companion WASM
files before production deployment. Elo is clamped to Stockfish's supported
limited-strength range. Engine files are intentionally not masqueraded by a
home-grown chess bot or committed without their upstream license.
