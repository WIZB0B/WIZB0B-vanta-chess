# VCH Backlog (2026-10-06)

Work on ONE numbered task per chat, in order, unless the user names a different task.

Every task follows these rules:
- Make code changes only. Never create, convert or commit image files.
- Run npm run security, npm test and npm run build. Never push with a failing test.
- Push ONE commit to `dev` and open (or update) a PR from `dev` to `main`; merge only when
  CI is green and the owner approves.
- Don't use the Codex bot, don't poll GitHub Actions, and never edit `.github/workflows`.
- Reply with the commit hash and stop.

## 1. Online play feels laggy (highest priority)
- **Cause:** in online games the player's own move is not shown until the edge function
  accepts it (makeMove → `api.move` round trip). The piece sits still for the full
  server time.
- **Fix: optimistic moves.** When a legal move (checked locally with chess.js) is made,
  apply and animate it immediately, start the opponent's clock locally, then send it to
  the server. If the server rejects it, roll back to the server state with a short toast.
  The server stays the authority.
- Apply incoming opponent moves the moment the Realtime 'state'/'moved' event arrives.

## 2. Premoves (chess.com style)
- While it's the opponent's turn, the player can queue premoves by click or drag:
  - up to 1 premove by default (setting: allow multiple);
  - queued squares are highlighted in a distinct color;
  - right-click or Escape cancels all premoves.
- When the opponent's move arrives, the first premove plays instantly if it is still
  legal. If not, all premoves are cleared silently.
- Works in online games and computer games. Not available in analysis or review.

## 3. Menus don't close / profile menu broken
- Every popover, menu and dialog closes on an outside click, on Escape, and when another
  menu opens. This covers the ⋯ menu under the board, Board theme / Theme Studio, the
  profile menu and the notifications menu.
- Only one menu can be open at a time.
- **Profile menu (top-right avatar):** a compact dropdown (about 280px wide) anchored
  under the avatar, with name, rating, Profile, Settings and Sign in/out. Add a close
  button. It must never cover the whole screen.

## 4. Engine consistency
- **Bot moves:** use a fixed search size per bot level (nodes or depth), not
  `movetime 350`, so the same bot plays the same strength on fast and slow devices.
  Keep UCI_Elo / Skill Level per bot.
- **Live analysis panel:** currently runs Elo-limited (elo 3190 with
  UCI_LimitStrength) for 280ms, so the eval jumps around and shows "Depth 1". Use full
  strength (UCI_LimitStrength false, Skill Level 20) and deepen progressively (depth 10,
  then up to 18) while the position is unchanged. Show the real depth.
- Analysis and the bot must never run on the same Stockfish worker at once.

## 5. Pieces feel detached from the board
Use the current piece images and refine them with CSS only:
- Remove any filter/drop-shadow halo around Vanta pieces.
- Add a subtle elliptical contact shadow under each piece: a radial gradient at the
  base, about 60% of the square wide, 12% tall, opacity about .35, slightly blurred. It
  should look like the piece rests on the square.
- The lift animation raises the piece and softens the shadow while dragging.
- Pieces sit on the same baseline in every square, centered horizontally.

## 6. Splash / loading screen (done 2026-10-07)
- Show the splash only when running as an installed app
  (`display-mode: standalone`), or for the first visit if it is under 600ms.
- On a normal web refresh, render the app immediately.
- Splash visuals will be redesigned later.
- **In code:** `src/splash.js` decides (`splashPlan`). Installed launches keep the full
  splash; a first web visit gets 380ms + 200ms fade, remembered in `localStorage`
  (`vch.splash-seen`); if storage can't be read or written the splash is skipped.

## 7. Separate screens + mini live game
- Each top-nav item (Arena, Puzzles, Learn, Openings, Famous Games, Review) opens its
  own full screen. Use client-side routing, and the browser back button must work.
- If a game is in progress and the user leaves the Play screen, show a mini live board
  (about 220px) bottom-left with both clocks and whose turn it is. Clicking it returns
  to the game. Play a sound and pulse it when it's the user's turn. It is view-only (no
  moves on the mini board).

## 8. Button and UI animations
- Consistent hover, press (scale .97) and focus states on all buttons.
- Smooth open/close for menus and dialogs, about 150ms.
- All of it respects prefers-reduced-motion and the Motion slider.

## 9. Server ping floor (needs user input)
- About 300ms after the fixes suggests the Supabase project is far from the players.
  Check the region (Project Settings → General) before any migration.

## 10. Auth redirects (done 2026-10-07)
- **Cause:** the email sign-up confirmation sent users to
  `http://localhost:3000/#access_token=...` because the Supabase Site URL was the default.
  The owner is fixing Site URL + Redirect URLs in the Supabase dashboard.
- **In code:**
  1. Every auth call that sends an email passes a redirect of
     `window.location.origin + '/auth/callback'`, so production, deploy previews and
     localhost each return to themselves. Today that is sign-up and the confirmation
     resend (REST `redirect_to`, which is what supabase-js `emailRedirectTo` sends). Any
     future password reset, magic link or OAuth call must use `withAuthRedirect()` /
     `authRedirectUrl()` from `src/auth-callback.js`; a test enforces this.
  2. `/auth/callback` lets supabase-js read the session from the URL
     (`detectSessionInUrl`), clears the tokens from the address bar with
     `history.replaceState`, routes to Home and toasts "Email confirmed, you're signed in".
  3. Error links (expired/invalid) show a friendly dialog with a
     "Resend confirmation email" button.
  4. Tokens are never logged or displayed.
- **Dashboard (owner):** Authentication → URL Configuration: Site URL
  `https://vanta-chess-play.netlify.app`; Redirect URLs
  `https://vanta-chess-play.netlify.app/auth/callback`,
  `https://deploy-preview-*--vanta-chess-play.netlify.app/auth/callback`,
  `http://localhost:5173/auth/callback` (and `http://localhost:4173/auth/callback` for
  `vite preview`). Supabase rejects a `redirect_to` that is not on this list and falls back
  to the Site URL.
