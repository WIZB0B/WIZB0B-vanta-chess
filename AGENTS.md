# Vanta Chess contributor guide

## Scope

These instructions apply to the entire repository.

## Development workflow

- Inspect the existing code, architecture, data flow, and latest PR feedback before editing.
- Use Node.js 20 or newer and install dependencies with `npm ci`.
- Keep browser code in `src/`, static worker/assets in `public/`, database changes
  in `supabase/migrations/`, and tests in `test/`.
- Never commit `.env`, Supabase service-role keys, Netlify tokens, or other secrets.
- Browser-facing Supabase access must use only the public project URL and anon key.
- Run `npm test`, `npm run build`, and `npm run check` before committing.
- Preserve the board's `aspect-ratio: 1` and eight equal grid columns.
- Preserve the authoritative hosted `chess` Edge Function and `chess_*` schema.
- The client must never authoritatively submit FEN, SAN, clocks, results, ratings,
  seats, or opponent state. Send move coordinates and an expected version only.
- Apply least privilege. Never weaken RLS, authorization, CSP, CORS, TLS, or
  security headers to make a feature work.
- Minimize personal data and third-party dependencies. Do not add analytics,
  session recording, marketing, payments, or tracking without explicit product
  approval and a documented data flow and consent review.
- Add regression tests for every security-sensitive behavior change.
- Run dependency, secret, security-header, test, and build checks; report every
  failure and unresolved risk honestly.

## Database changes

- Add forward-only, timestamped SQL migrations; do not edit an already-deployed
  migration.
- Enable row-level security on every public table.
- Privileged game mutations belong in the existing reviewed `chess` Edge
  Function, not frontend code, new public tables, or client-writable RPCs.

## Pull requests

Summarize user-visible behavior, list exact verification commands, and call out
any external deployment steps or unavailable credentials explicitly.
