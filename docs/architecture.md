# Architecture

## Runtime topology

```text
Netlify static SPA
  ├─ chess.js: local rendering and preflight UX only
  ├─ same-origin Stockfish Worker (computer play only)
  ├─ public-shell-only service worker (+ My music: the player's own songs, from IndexedDB)
  └─ HTTPS JSON → VCH `chess` Supabase Edge Function
                    └─ existing private `chess_*` data model
```

The Edge Function is the sole game authority. `create`, `join`, `move`, `resign`, draw, history, heartbeat, persistent chat, puzzle, tournament, bot, and queue actions use that boundary. A move supplies `gameId`, `expectedVersion`, `from`, `to`, and optional `promotion`; server responses replace local position and clock state. Realtime may later announce IDs/versions but may never transport trusted peer state.

## Source layout

| Path | Responsibility |
| --- | --- |
| `src/vch-api.js` | Typed action boundary, guest/auth identity, no-store networking |
| `src/main.js` | UI orchestration and authoritative-state rendering |
| `src/music.js`, `src/music-library.js` | The music player and the Lyria library (`public/assets/vch/music/`) |
| `src/my-music.js` | My music: the player's own songs, kept in IndexedDB on their device |
| `src/style.css` | Responsive visual system and strict square geometry |
| `public/` | PWA shell and isolated, same-origin engine worker/assets |
| `supabase/README.md` | Hosted backend boundary; no duplicate schema |
| `test/` | Rules, configuration, and security regressions |
| `docs/security/` | Data-flow audit, findings, privacy inventory, manual gates |

## Trust and privacy boundaries

The random guest token is a credential-like opaque identifier: it remains in localStorage and JSON bodies, never URLs or logs. Authenticated access tokens belong only in Authorization headers. User chat is rendered through `textContent`. The service worker excludes cross-origin and non-GET traffic, preventing API/chat/game caching. No service-role key belongs in this repository.

## My music (the player's own songs)

Song files a player adds stay on their device: they are stored in IndexedDB (`vch-my-music`) and are never uploaded or sent anywhere. The service worker serves them to the music player from `/my-music/<id>` (same origin, `Range` requests answered with 206), so the Content-Security-Policy needs no `blob:` media source. The worker answers only same-origin GETs of that exact route and never caches the songs. A song's title is the player's own text and is rendered escaped. Each song's loudness is measured in the browser when it is added (ITU-R BS.1770) so it plays at the library's level.
