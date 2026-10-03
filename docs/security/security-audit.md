# Security, privacy, and production-readiness audit

Audit date: 2026-10-03. Scope: the complete repository and the reviewed hosted VCH Edge Function v11 contract. The project owner reports zero Supabase security-advisor lints and direct-access-deny RLS on all `chess_*` tables; remaining performance notices are unused indexes, not security findings.

## A. Architecture and data flow

The browser loads a static Vite application from Netlify. A stable opaque guest token is stored in localStorage and sent in JSON bodies to the single HTTPS `chess` Edge Function. Signed-in sessions may instead send a Supabase access token in the Authorization header. Move requests contain coordinates, promotion, game ID, and expected version; the server owns legality, seats, position, clocks, results, and ratings. History and heartbeat responses replace local state. Chat, puzzles, tournaments, and matchmaking use named Edge Function actions. Stockfish loads only in a same-origin worker. The service worker caches only public same-origin shell GETs and never cross-origin API traffic.

## Personal-data inventory

| Data | Location/purpose | Retention/deletion status |
| --- | --- | --- |
| Random guest token | Browser localStorage; stable guest identity | Persists until site data is cleared; backend retention/export/deletion requires owner review |
| Guest display name | Edge Function profile/game display | Backend retention policy unavailable |
| Game moves/results/ratings | Hosted `chess_*` backend | Backend retention/export policy unavailable |
| Player chat | Hosted game messages; game participants | Backend retention/report/deletion policy unavailable |
| Puzzle attempts | Hosted puzzle-attempt backend | Backend retention policy unavailable |

No email, date of birth, payment data, uploads, analytics, advertising identifiers, or session recordings are collected by this repository.

## Third-party/network inventory

| Recipient | Purpose | Data sent |
| --- | --- | --- |
| Netlify | Static frontend delivery | Standard HTTP request metadata |
| VCH Supabase project | Authoritative chess, chat, puzzles, Arena, matchmaking | Guest token or auth header and action-specific game data |

Google Fonts was removed. Icons, service-worker files, and future Stockfish assets are same-origin. No analytics or marketing scripts are present.

## B. Prioritized findings and verification

### Critical

* **Resolved in frontend:** the parallel client-authoritative `games/moves` model trusted client FEN and clocks. It and its migrations were removed. API regression tests assert that move requests contain coordinates/version and no FEN, SAN, clocks, result, rating, or seat.
* **Backend hardened:** Edge Function v11 removed anonymous full-state GET, added participant-authorized `state` and `heartbeat`, returns authoritative seats, rejects bodies over 64 KiB/invalid JSON, and allow-lists production, preview, and local browser origins. The client uses POST state/heartbeat exclusively.

### High

* **Resolved:** untrusted room codes are allow-listed before DOM interpolation.
* **Resolved:** persistent chat renders with `textContent`, is length-bounded in the UI, and uses server persistence rather than peer broadcast.
* **Resolved:** Netlify adds CSP, HSTS, frame denial, MIME sniffing, referrer, and permissions policies. Verify these on the deployed candidate.
* **Resolved in repository:** the GPLv3 Stockfish.js 19.0.0 lite single-threaded JS/WASM build, license, and exact source links are self-hosted. The worker remains same-origin and isolated; deployment execution remains an acceptance gate.

### Medium

* **Resolved:** production source maps are disabled and remote Google Fonts were removed.
* **Resolved:** the service worker ignores non-GET and cross-origin API requests; regression checks protect this boundary.
* **Open:** direct tests of chat throttling, puzzle-attempt validation, matchmaking/rating protection, reconnect seat hijacking, and private-game IDOR require authorized test identities against the live/staging backend.

### Low

* The guest token persists until browser storage is cleared. A user-facing reset and documented backend deletion/export mechanism require product decisions.
* CSP permits inline styles because the application applies theme variables dynamically. Replace this with nonce/hash-safe styling if themes later add style elements.

## E. Guardrails and CI

`AGENTS.md` records permanent authority, privacy, and least-privilege rules. CI runs clean install, dependency audit, forbidden-secret/CORS checks, tests, build, and assertions over production security headers and service-worker caching.

## F. Remaining manual gates

1. Run cross-user negative tests for every action using two guest identities and authenticated identities where applicable.
2. Exercise two independent browser contexts through create/join, both move directions, clocks, chat, reconnect, draw/resign/endgame, queue fallback, puzzles, Arena, mobile, and visual comparison.
3. Verify the vendored Stockfish 19 build under deployed Netlify headers.
4. Inspect deployed Netlify response headers and PWA cache behavior.
5. Have qualified owners decide privacy retention, export/deletion, child safety, and chat moderation requirements. This audit makes no legal-compliance claim.
