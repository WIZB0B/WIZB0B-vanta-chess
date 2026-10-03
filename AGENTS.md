# Vanta Chess contributor guide

## Scope

These instructions apply to the entire repository.

## Development workflow

- Use Node.js 20 or newer and install dependencies with `npm ci`.
- Keep browser code in `src/`, static worker/assets in `public/`, database changes
  in `supabase/migrations/`, and tests in `test/`.
- Never commit `.env`, Supabase service-role keys, Netlify tokens, or other secrets.
- Browser-facing Supabase access must use only the public project URL and anon key.
- Run `npm test`, `npm run build`, and `npm run check` before committing.
- Preserve the board's `aspect-ratio: 1` and eight equal grid columns.

## Database changes

- Add forward-only, timestamped SQL migrations; do not edit an already-deployed
  migration.
- Enable row-level security on every public table.
- Privileged game mutations belong in reviewed database functions or Edge
  Functions, not direct unrestricted table writes.

## Pull requests

Summarize user-visible behavior, list exact verification commands, and call out
any external deployment steps or unavailable credentials explicitly.
