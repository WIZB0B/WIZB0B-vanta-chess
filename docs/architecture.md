# Architecture

## Runtime topology

```text
Browser / Netlify
  ├─ Vite application (`src/`)
  ├─ chess.js legal-move model
  ├─ Stockfish UCI Web Worker (`public/stockfish.worker.js`)
  └─ Supabase JS client
       ├─ Postgres games and moves
       ├─ `play_move` transaction RPC
       └─ Realtime move and chat channels
```

The frontend is a static single-page application. Netlify's fallback redirect
serves `index.html` for private-room URLs. Public configuration is injected by
Vite at build time. The service-role key must never enter the frontend build.

## Source layout

| Path | Responsibility |
| --- | --- |
| `src/main.js` | Application state, chess interaction, room and engine adapters |
| `src/style.css` | Responsive visual system and board geometry |
| `public/` | Static Web Workers and externally licensed engine artifacts |
| `supabase/migrations/` | Ordered database migrations for local and hosted Supabase |
| `supabase/schema.sql` | Hosted-dashboard bootstrap snapshot |
| `test/` | Deterministic rules tests using Node's built-in test runner |

## Trust boundaries

The anon key is public by design and authorization must be enforced through
RLS and server-side functions. The current transaction function serializes a
room's ply sequence. A production rated-game release must additionally validate
the submitted move against the stored position in a trusted Edge Function or
database chess extension; client-side `chess.js` validation alone is not a
security boundary.

Stockfish executes in a dedicated Worker so search cannot delay board input.
The upstream Stockfish JavaScript and WASM artifacts are deployment inputs and
must retain their GPL notices.
