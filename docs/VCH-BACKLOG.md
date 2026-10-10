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

## V1. Piece movement like chess.com (done 2026-10-07)
- **In code:** pieces are dragged with pointer events (mouse, pen, touch) instead of native
  drag-and-drop: the piece follows the pointer centred under it, the hovered square is
  outlined, legal drops play instantly, other drops slide back. Helpers live in
  `src/board-drag.js`; see PR #5.

## V1-fix. Board rendering like chessground / chess.com (done 2026-10-07)
- **Cause (from frame-by-frame video of PR #5):** pieces were rendered inside their
  squares, so a piece in flight was painted under later squares (the queen vanished on
  d1→h5 and its square's contact shadow showed up first); every square `<button>` inherited
  the global 400ms `button` transition, so highlights faded instead of switching; and the
  panels' backdrop blur was re-run by the compositor on every frame of a move (~20fps in
  software-rendered Chrome). A premove was also lost when the opponent replied while it
  was being made (piece picked up or in the air): the drop was still judged as a premove.
- **In code:** `#board` is the squares grid (built once, updated in place), then ONE
  `.piece-layer` where every piece is a `.board-piece` placed with
  `transform: translate(col*100%, row*100%)` (`src/piece-layer.js`, pure diffing in
  `src/board-view.js`), then the `.arrow-layer` SVG, then the fixed `.drag-layer`. A move is
  a Web Animations API animation of transform alone (`element.animate`), started in the same
  frame as the move with its clock pinned to the move: CSS `ease`, ~150ms for one square up
  to ~250ms for the longest move (scaled by the Motion slider, none with reduced motion);
  captures fade with opacity. `renderBoard()` is synchronous and cheap; status text, move
  list, clocks, sound, analysis, the engine call and the game-over check wait until the
  slide has landed and two frames are painted (`afterBoardPaint`); the online move request
  waits two frames. Panels keep the backdrop blur only when Theme Studio glass is below 90%.
  A piece picked for a premove becomes a normal selection when the opponent replies, and a
  drop is judged by what the piece may do at drop time.
- **Dragging:** the origin square shows only its highlight; the dragged piece is opaque and
  crisp (no scale, shadow or filter, whole-pixel positions) and stays inside the board
  (it slides along the edge); releasing outside the board cancels. Cursor: `grab` over your
  movable pieces, `grabbing` from the press to the drop.
- **Hints:** soft dark translucent dots for moves, a translucent ring around capturable
  pieces. Square marks fill the whole square; arrows are ~22% of a square thick at .85.
- **Proof:** `e2e/board-timing.spec.js` (runs alone, after all other tests) samples every
  frame of Qd1–h5: the queen leaves d1 within 40ms and its first moved frame is within the
  first 25% of the path, a frame is painted at least every 20ms until it lands, through at
  least 8 positions. It fails on the previous build (first moved frame at 37%).
  `e2e/board-motion.spec.js` checks the queen stays on top in every frame, the Web Animation
  (transform only, `ease`, distance-scaled), dragging, hints, marks and arrows.

## V1b. Arrows and square marks (done 2026-10-07)
- Right-drag draws an orange arrow (L-shaped for knight jumps); right-click on a square
  toggles a red mark. Shift = green, Ctrl/Cmd = blue, Alt = yellow. Drawing the same shape
  again removes it; drawing it in another colour recolours it. A left-click on the board or
  any move clears them. Right-click still cancels a drag in flight and queued premoves first.

## MOTION (M0–M9)
Don't start these until T1 (PR #6: V1-fix + V1b) is merged.

- M0 Motion foundation: add gsap (incl. Flip + ScrollTrigger) and lenis via npm (bundled, no
  CDN, CSP unchanged). One motion-tokens module (durations, easings, stagger). Respect
  prefers-reduced-motion everywhere. No main-thread jank: transform/opacity only.
- M1 Intro replacing the VCH splash: dark board fades in, gold stroke draws the Vanta king
  (SVG line art from owner), king steps e1→e2 with squash & stretch and a glow ring on
  landing, VCH wordmark reveals. <2s, tap to skip, once per session; refresh goes
  straight to the app.
- M2 Loader: bouncing pawn with squash & stretch + glow rings, replaces all spinners.
- M3 Find Match: full-screen searching state (board dims, radar rings, live timer);
  opponent found = VS reveal (avatar/rating flip), pieces drop in rank by rank, clocks
  slide in; cancel reverses.
- M4 Page transitions: crossfade + staggered rise; GSAP Flip shared-element board ↔ mini
  live board.
- M5 Auth: sign-in/up card bloom, staggered fields, focus glow, error shake, success check
  draw + card flies into header avatar.
- M6 Micro-interactions: button lift/press, icon hover, sliding tab underline, spring
  toggles, subtle cursor glow on Home.
- M7 Home scroll story: entrance reveal, parallax hero, pinned board replaying a sample game
  as you scroll with review badges, horizontal-scroll gallery, scroll progress bar.
- M8 Game moments: start drop-in, check flash, capture pop, promotion burst, checkmate
  topple + optional "dramatic" ember dissolve (setting).
- M9 Optional cinematic looping video backgrounds for Home and some presets (small, Home
  only, poster image fallback).

## V2. Typography
One display serif for headlines, one clean UI sans for everything else,
consistent sizes/weights/letter-spacing across the app (design tokens).

## V3. Icons
Replace generic icons with a proper icon set (Computer = monitor/robot chip,
Match = crossed swords/lightning, Room = door/link, etc.). Art comes from the owner.

## V4. Settings page
Top-right Settings becomes a full page (left categories: Board &
Pieces, Gameplay, Profile, Notifications, Sound, Accessibility, Privacy & Security), with
Boards/Pieces/Backgrounds/Presets tabs and a live preview board (see VCH-ROADMAP.md).
The Board theme button under the board becomes a small quick-settings popover only,
with "All settings" linking to the page.

## S1. Security audit
Supabase Security Advisor clean; RLS on every table; no service keys
client-side; rate limits on the edge function (moves, chat, sign-up); input validation;
CAPTCHA on sign-up; leaked-password protection; CORS locked to our domains; dependency
audit; chat content limits; basic anti-cheat flags noted for later.

## C1. Competitor comparison
Feature matrix vs chess.com, lichess and others; list gaps.

## Done 2026-10-09 (live in production via release PR #9)
- Pieces (PR #7): Vanta (default) and Vanta Ink with bold dark outlines, fixed bishops, more
  detailed Ink; new top-down 3D set Regal; filled selected square; selection clears after a move.
- Piece reactions (PR #8): per-piece hover gestures, lean toward the cursor, press pull, touch
  tap reaction, swelling legal-move dots.
- Board fits the screen (PR #10, in review): board side = min(free height, free width).

## E. Expressions (prototype PR, owner reviewing the demo video)
Pieces show how their position feels; landings can shock the enemy. Owner's idea (2026-10-10).
- E1 Drag sway: the dragged piece hangs from the hand, swings against the motion, bobs. (prototype)
- E2 Landing ring on every drop; shockwave across the board when the mover is ahead and lands
  within 2 squares of enemy pieces, which flinch nearest first. (prototype; "ahead" = material)
- E3 Moods: fear (attacked, not safely defended; king in check), attack (leans toward a bigger
  or undefended target), courage (attacked but defended), shock. Hover intensifies. 3D sets
  express more than Ink sets. (prototype)
- E4 Fair play (owner decision 2026-10-10): expressions stay ON in rated games, softer ("fair"
  level), and decide automatically what to show: only contact threats (pieces next to each
  other) and checks. Long-range bishop/rook/queen threats and hanging pieces are never shown,
  so captures can still be a surprise. All other modes get full expressions. Players can set
  Full / Subtle / Off in Theme Studio. Engine evaluation never drives effects in live games.
  (prototype)
- E5 More expressions: strength/triumph after a capture, despair for a lone king, victory and
  defeat poses at game end, idle breathing.
- E6 Setting: Expressions Full / Subtle / Off (prototype in Theme Studio); later in the Settings page, plus a separate shockwave toggle.
- E7 Per-piece sounds (landing, capture, fear, shock), matched to each set.

## P. Piece sets, themes and store (later; owner will send references)
- P1 More piece sets, each in a 3D and a 2D version, all supporting expressions (3D fuller).
- P2 Themed sets generated in Higgsfield: each theme = pieces + board + background + its own
  theme song; users can still mix and customise.
- P3 Medieval realistic 3D set: real soldiers with shields, swords and helmets as the pieces,
  the king behind the lines. Owner will send a reference before we start.
- P4 Premium piece sets and skins behind a paywall, better than anything on chess.com. Last
  part of the project (needs payments, entitlements and a store page).

## A. Accounts, profile and legal (owner request 2026-10-10)
- A1 Player portraits (done 2026-10-10, PR claude/game-feel): guests show an empty silhouette;
  signed-in players upload a picture (cropped to 128px, stored as a small inline image in
  `chess_players.avatar_data`, so the CSP needs no new origin). Later: pick a VCH avatar.
- A2 Country flag beside every name (done 2026-10-10, same PR): a one-time prompt and the
  "Edit portrait & flag" menu. "Detect" asks `/api/geo` (Netlify edge) only when pressed and keeps
  just the 2-letter code (`chess_players.country_code`, never the IP); players can change or hide
  it. Migration applied and `chess` function v16 deployed with owner approval.
- A3 Terms and conditions, privacy policy (what we store, why, how to delete it) and a cookie /
  storage notice if analytics are ever added. Linked from sign-up and the footer.
- A4 Backend security pass later (see S1): RLS review, rate limits, anti-cheat signals.

## I. Ideas proposed by Claude (approved 2026-10-10; done in PR claude/game-feel)
- I1 Captured-pieces tray by each player bar with the material difference (+3).
- I2 Game-end cinematic: the winner's pieces cheer, the losing king topples (uses expressions).
- I3 Review mode: pieces react to move quality (brilliant glow, blunder slump).
- I4 Haptics on phones: light buzz on pick-up, firmer on capture and check.
