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
- **Updated 2026-10-18** (owner, 2026-10-17: the menu "does not land naturally"): the browser
  never shows the splash. `index.html` has a veil in the theme's dark colour that covers the
  page until it is built, the saved theme applied and the pictures on screen decoded (at most
  1.4 s after navigation starts), then fades in 0.42 s while the page's regions rise 8 px into
  place once (`src/boot-reveal.js`). A slow load shows a faint V after 0.9 s. Installed
  launches keep the splash. Moving between screens and sections fades the new one in
  (`markEntering`, `enterView` in `src/main.js`). The veil also waits for a picture chosen from
  a srcset (the home screen's photograph) as the page chose it, and never waits on frames a
  background tab does not paint (250 ms at most).

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

## N. Network and fair play (owner live test 2026-10-10)
- N1 Instant online moves (PR #13): function pinned to us-east-2 next to the database; no
  per-request CORS preflight; the mover relays each move over Realtime the moment it is played
  (server stays the authority, `move_void` on rejection); 2 database round trips per move
  instead of 5 (edge-function deploy needs owner approval).
- N2 Fair play (PR #14): no engine analysis during live online games; returns at game end.
- N3 Illegal-move feedback (PR #14): low double knock, king square blinks red when the king is
  the reason.

## MB. Mobile app layout (owner approved 2026-10-10; built in PR claude/mobile-app-layout)
Desktop stays as it is. On phones the site should feel like the lichess / chess.com apps:
- MB1 Bottom tab bar (Play, Puzzles, Learn, Watch, More) instead of the scrolling page; slim
  top bar (logo, search, account). Menus open as bottom sheets.
- MB2 Game screen with no scrolling: opponent bar (portrait, flag, tray, clock), board edge to
  edge, own bar, a swipeable move strip, and an action bar (Options, Draw, Resign, Chat).
  Top navigation hides while a game is on; the screen stays awake (Wake Lock).
- MB3 Play home: one big Play button with a time sheet (Bullet / Blitz / Rapid), Play a friend,
  Play the computer, Tournaments; below it a daily puzzle and live games.
- MB4 App feel: safe areas, no pull-to-refresh or overscroll during a game, installable (PWA).
- Built: body.m-app below 760px (src/mobile-shell.js). Views home / panel / game / review;
  tabs Play, Puzzles, Learn, Games (famous games), More (sheet: Arena, Openings, Review, Board &
  pieces, Portrait & flag, Account, Notifications, Install). Game view: back bar, player bars,
  board, move strip (room code + copy while waiting), action bar Options / Draw / Resign / Chat /
  Hint, and Review / Rematch / New game after the end. "Back to your game" pill on other screens.
- Later: a Watch tab with live games once spectating exists; swipe through moves on the strip.

## G. Game moments (owner approved 2026-10-10; PR #15)
- G1 Claim win / draw 30s after the opponent leaves (server claim_win, deployed v17).
- G2 Low-time tick under 10s. G3 Hint in computer games. G4 Screen stays awake. G5 "Your move"
  tab title. Next ideas: takeback requests in casual games, a pre-move confirmation option for
  slow connections, puzzle streaks, and a weekly arena.

## R. Round 3 (owner approved 2026-10-10)
- R1 Look back through any game without taking back; Undo against the computer (PR #17).
- R2 Takeback requests in casual games; Watch tab for public live games; weekly arena every
  Saturday 18:00 UTC (PR #18; chess v18 and migration takeback_offers deployed).
- R3 My games + Game Story: archive with form insights, chapters, key moments, story
  playback, replay your toughest moment (PR #19).
- R4 Puzzle Streak, harder every three solves, one skip (PR #20). Fixed: tapped puzzle moves
  never matched because taps always send a queen promotion.

## S. Round 4 (owner approved 2026-10-10)
Server code is in PR #21; the migration `20261010180000_round4_social_daily_berserk` and
chess v19 are NOT deployed yet (owner cancelled the migration step; waiting for approval).
- S1 Berserk: one charge at every 3rd straight rated win (never stacked); a loss removes an
  unspent charge, a draw keeps it. Spend it before your first move in a live rated game:
  half your clock, rating change x1.25 win or lose (same stakes both ways, so no free Elo).
  Arena: 3 wins in a row = on fire (wins 4, draws 2); a Berserk win adds 1. (PR #21, #22)
- S2 Friends: search, follow, online status, direct challenges (live or daily, casual or
  rated, colour), bell notifications, realtime hints on `player:<id>`. (PR #22)
- S3 Daily games: 1/3/7 days per move, own "daily" rating pool, no abandon claims; web push
  for your move and challenges (VAPID private key only in `chess_server_secrets`). (PR #22)
- S4 Achievements (11 badges) on the profile. (PR #21, #22)
- S5 Puzzle rating (first try only), difficulty from your rating, daily puzzle, theme stats
  and theme training, server streak record. (PR #23)
- S6 Opening trainer from your own games; share Game Story as an image card or clip. (PR #24)
- S7 Sign-in checked locally (ES256 JWKS) with a getUser fallback, to cut a round trip per
  request. Verify after deploy: logs should rarely show "fell back to auth.getUser".

## T. Round 5 (owner approved 2026-10-10)
Server code in PR #25 (migration `20261010200000_round5_clubs_leagues_profiles`, needs the
round-4 migration first). Not deployed; waiting for the owner's approval.
- T1 Learn from your mistakes (browser-local spaced repetition from reviews). (PR #26)
- T2 Offline play against the computer (service worker caches engine + bundles). (PR #26)
- T3 Public profile: rating line, best wins, head-to-head, report player. (PR #27)
- T4 Clubs with chat, Sunday club battle (best five count, never vs your own club). (PR #28)
- T5 Monthly leagues Bronze to Diamond, top/bottom fifth move, season badges. (PR #28)
- T6 Fair play: reports and opponent-measured accuracy signals; human review only through
  the owner-only `chess_fairplay_review` view. No automatic bans. (PR #25-#27)
- T7 Conditional moves in daily games; one automatic reply per move. (PR #29)
- T8 Freestyle: Chess960 starts without castling (chess.js has no 960 castling), casual
  only, rooms, challenges and the computer. (PR #29)

## U. Round 6 (owner approved 2026-10-10)
Server code in PR #31 (migration `20261010220000_round6_moderation_studies_swiss`, after the
round-4 and round-5 migrations). Not deployed; waiting for the owner's approval.
- U0 Loading fix (owner screenshot: empty board while loading): sprite preload, engines
  start on first use, idle service-worker install, lazy bot portraits. (PR #30)
- U0 Pending bug: online games in My games replayed only the last move (stored PGN held
  one move); archive rebuilds from the move list, finished games store full PGN. (PR #30)
- U1 Moderation page for admins (set `role='admin'` on the owner's player row at deploy). (PR #31, #32)
- U2 Chess960 castling in Freestyle; Freestyle rated in its own pool. (PR #31, #33)
- U3 Studies: annotated lines shared by /?study=CODE. (PR #31, #33)
- U4 Coach mode against the computer. (PR #34)
- U5 Player/club tournaments, arena or Swiss (auto-paired rounds). (PR #31, #34)
- U6 Account: password reset, change password, download data, delete account. (PR #31, #32)
- U7 Spectator reactions in Watch (text chips, players never see them). (PR #34)
- Netlify deploy previews: the Netlify Drawer is blocked by our CSP (grey box at the bottom
  of previews only). Turn it off in Netlify: Project configuration > Build & deploy >
  Deploy Previews > Netlify Drawer. CSP stays strict.

## V. Round 7 (owner approved 2026-10-10)
Server code in PR #35 (migration `20261011000000_round7_notifications_explorer`, after
rounds 4-6). Not deployed; waiting for the owner's approval. After deploy, an admin can
fill the explorer from past games with the `explorer_backfill` action (150 games a call).
- V1 Faster live moves: replies to a move still in flight go straight out; the server waits
  for the move they answer. Preconnect to the game server. (PR #35, #36)
  True peer-to-peer (WebRTC) was not used: it would show each player's IP address to the
  opponent and need third-party STUN/TURN servers.
- V2 Opening explorer from VCH games, off for positions in your live game. (PR #35, #37)
- V3 Bullet: premove chains (up to 3); first moves untimed; 30 s to start or the game is
  aborted (no rating). (PR #35, #36)
- V4 Notifications inbox: bell + page. (PR #35, #37)
- V5 Languages: French, Spanish, Portuguese, Arabic (right-to-left, board stays LTR). (PR #38)
- V6 Season board sets unlocked by league division or season badge. (PR #38)
- Known: e2e/board-motion animation-timing tests are flaky in the shared container (same
  rate on round-5 builds); they pass when the machine is idle.

## W. Round 8 (owner approved 2026-10-11)
Server code in PR #39 (migration `20261011090000_round8_sandbagging`, after rounds 4-7).
Not deployed; deploys with the round 4-7 batch once the owner accepts the prompts.
- W1 Translations finished: toasts, lessons, openings, famous games, game-over messages and
  the remaining screens; values inside messages via patterns. The extra dictionary loads
  only for French, Spanish, Portuguese or Arabic. (PR #40)
- W2 Explorer: Stockfish score for each listed move (own worker, depth 10, MultiPV +
  searchmoves); "Your games" shows only your finished standard games; with no games the
  engine suggests its top three. Still off for positions in your live game. (PR #39, #41)
- W3 Tournament lobby: live games strongest first (your own marked), Swiss pairings for the
  round, standings; refreshes every 10 s while open. Club events stay private. (PR #39, #41)
- W4 Clubs in the league: each club scores its best 10 members' league points this season;
  table under the division standings. (PR #39, #41)
- W5 Accessibility: type moves (Nf3, e2e4, O-O; "/" focuses the box); every new move and
  your clock at 1 min / 30 s / 10 s announced to screen readers in the interface language;
  optional read-aloud in Theme Studio. (PR #40)
- W6 Anti-sandbagging: a hidden score rises on quick rated losses (resign, flag or leave
  within 6 moves; more against much weaker opponents) and falls with normal games. From 3
  the player is listed in Moderation and matchmaking treats them as up to 300 points
  stronger. A lead for a moderator, never an automatic penalty. (PR #39, #41)

## X. Round 9 (owner approved 2026-10-11)
Server code in PR #42 (migration `20261011120000_round9_repertoire_battle_simul_vacation`,
after rounds 4-8). Not deployed.
- X1 Opening repertoire: lines as White and Black, from the board or the explorer; drills
  where the computer plays your prepared replies; explorer marks your moves. Synced to the
  account, on the device for guests. (PR #42, #43)
- X2 Insights: score by colour, opening, opponent strength and time control; rating line
  per pool; how and when you lose; repertoire deviations; up to four things to work on with
  a button to the fix. (PR #42, #43)
- X3 Puzzle Battle: the same puzzles for two players, three minutes, three misses out;
  invite by code, link or from a friend. Unrated. (PR #42, #44)
- X4 Simuls: host plays everyone (White, casual), up to 20 boards, optional club-only;
  host bar with the boards waiting. No abandon claim or 30 s abort on simul boards. (PR #42, #44)
- X5 Endgame drills against Stockfish: queen, rook and two-bishop mates, king-and-pawn win
  and hold, Lucena; par and stars saved on the device. (PR #45)
- X6 Vacation for daily games: up to 14 days a year; clocks don't run out; opponents see
  it in the daily list. (PR #42, #45)
- Translations for all round 9 screens. (PR #45)

## Y. Round 10 (owner approved 2026-10-11)
Server code in PR #46 (migration `20261011150000_round10_crazyhouse_ladder_commentary`,
after rounds 4-9). Rounds 4-9 are live in the database (owner ran the SQL 2026-10-11); the
round 4-9 game server is waiting for the owner's deploy (CLI or dashboard).
- Y1 Today's training: a daily plan from your own data with a streak. (PR #47)
- Y2 Prep against a player: their rated openings, played back as often as they play them,
  with their score per move, until their book runs out. (PR #46, #47)
- Y3 Crazyhouse: drops from your pocket; own rated pool; live only. (PR #46, #48)
- Y4 Analyse together: a shared board and arrows over a realtime channel, by link. (PR #49)
- Y5 Puzzle Battle ladder: matched battles, weekly table, podium badges. (PR #46, #49)
- Y6 Live commentary in tournament lobbies by the organiser, club owner or an admin. (PR #46, #49)
- Translations for every round 10 screen. (PR #49)

## Z. Round 11 (owner request 2026-10-11)
Server code in PR claude/round11-server (migration `20261011180000_round11_moment_of_week`,
after round 10). Not deployed: on 2026-10-11 the Supabase write tools timed out in the build
session, so round 10's migration and function were not applied either.
- Z1 Vanta Dark (fog of war), against the computer: normal rules, you see only your pieces and
  the squares they reach; checking pieces are revealed; their moves show as "?"; no moods,
  hints, coach, evaluation or opening names while it's dark. Online play needs the server to
  hide the opponent's pieces from each player (later). (PR claude/round11-modes)
- Z2 Blackout Blitz, against the computer: 3 minutes; after every four of your moves the next
  two are blind (pieces fade, squares work, the move list goes dark). (PR claude/round11-modes)
- Z3 Your Shadow: a bot from your own games that opens like you, as often as you play each
  move, then plays at your rating. (PR claude/round11-modes)
- Z4 The Vanta Gauntlet: seven bots, 900 to 2700, three lives, colours alternate; leaving a
  stage unfinished costs a life. On the device. (PR claude/round11-modes)
- Z5 Rivals (Community tab): players you meet often with close results, from your history;
  challenge from the list. (PR claude/round11-rivals-moment)
- Z6 Relic sets (Theme Studio): six earned board themes (squares, accent, gold, wallpaper;
  pieces stay plain artwork) for Vanta Dark, Blackout Blitz, Your Shadow, two Gauntlet
  milestones and beating a rival. On the device. (PR claude/round11-modes)
- Z7 Vanta Moment of the Week: the week's best checkmate from rated games (mating while down
  material first), or an admin's pick; on Watch and the main menu, with a replay.
  (PR claude/round11-server, claude/round11-rivals-moment)
- Translations for every round 11 screen. (PR claude/round11-rivals-moment)

## R12. Round 12 (owner approved 2026-10-12: "implement all your wonderful ideas")
Fixes first in PR #53 (full game records on every ending, threefold repetition online, the
flag prompt no longer covers chat, the Back button returns to the previous screen). Server code
in PR #54 (migration `20261012120000_round12_bughouse_twins_heraldry`, after round 11); its
deploy waits for round 11 and the owner's approval for that deployment.
- R12.1 The Vanta Campaign: five realms, each lending its board (relic), weather and music to
  the battle; two guards and a boss whose battle bends the rules (Blackout Blitz, Vanta Dark,
  Your Shadow, Chess960, the Vanta King); three stars per battle; freeing a realm earns its
  relic. On the device. (PR #55)
- R12.2 Veteran pieces: each piece's career from your finished standard games (captures,
  forks, checks, mates, promotions); ranks as chevrons on the board, a hover card, and "Your
  army" in Review. On the device. (PR #55)
- R12.3 Oaths: three a day, sworn before a game, judged at the end; honor earns the Oathbound
  and Paladin relics. On the device. (PR #55)
- R12.4 Living atmosphere: the room reacts to check, a low clock, material and the result
  (position and clocks only); full, subtle or off. (PR #55)
- R12.5 Adaptive music: a Web Audio score in each theme's key that follows the game's
  tension; off by default. (PR #55) Then a synthesized cinematic score (PR #65, first commits),
  which the owner turned down (2026-10-13: "That music does not make sense... please use
  Lyria"). Now real music, made with Lyria 3.5 in Google Flow Music (the owner's account; the
  owner asked for 100 to 200 pieces, sounds for every action, rank and mood music, and above
  all smooth transitions). (PR #65)
  - The library: 83 pieces (about 3.5 hours) plus 13 stings, as AAC (.m4a) files in
    `public/assets/vch/music/` with `library.json` beside them (same origin: the CSP stays as
    it is), read by src/music-library.js the first time Music is on. Each track carries its
    station, place, part, theme, division, kind (song), skin, its silence trimmed (start/end),
    a gain to -16 LUFS, and its measured tempo and first downbeat (bpm/beat).
  - What plays where (Music: Follows the game): in the menus your league division's hall
    (Bronze to Diamond, two each; Bronze before you have a division) with the Vanta Hall, and
    a song about one time in three (13 songs with vocals, never two in a row); in a game the
    theme's suite (Vanta, and each relic set's or realm's: Ashen March, Drowned Keep, Mirror
    Court, Hollow Crown, Obsidian Spire, Rivalry) whose part follows the game: calm in the
    opening, tense in the middlegame, Advantage or Under Siege when you are three points up or
    down, the storm when your clock runs low; opera for each Campaign boss; electric music for
    fast games and Blackout Blitz; focus music for puzzles, lessons, study, analysis and review;
    after a game the win or loss music until you go elsewhere; each relic set's own theme in the
    Relic sets. Stations: Dark cinematic, Focus, Opera, Electric, Songs, Everything.
  - Transitions (the owner's priority): changes land on the music's own bar line (the incoming
    track starts silently so that its first downbeat meets the outgoing track's next bar line,
    and is lined up again once it plays); equal-power crossfades over two bars; leaving
    somewhere, the old music also sinks into the distance (a low-pass sweep); a game's parts
    hand over like one piece (same key and tempo, no sweep), at most every ten seconds and with
    hysteresis, the storm on the next beat; a page you only pass through does not change the
    music (it waits 1.2 s); into and out of a game it turns on the next bar line; three decks,
    so a second change soon after the first never cuts a fading track; a settings dialog
    muffles the music as if behind a door; stings (start, win, loss, draw, checkmate, up or
    down a division, relic, realm freed, puzzle solved or failed, brilliant move) play over the
    music, which steps back for them.
  - Sound effects (src/sfx.js; `public/assets/vch/sfx/`, MP3): cut from Lyria sound packs
    (tools in the PR description). The interface: a tap on every press, a page turning
    forward and back on every screen change and Back, dialogs opening and closing, switches,
    a chime with each message, success, error, warning, match found, a game's start and end,
    the clock's tick under ten seconds; one sound per action (the most telling). The pieces:
    each piece its own sound, a capture, castling, a promotion, a check, a mate, an illegal
    try, in five sets (Wood, Crystal, Tidal, Gilded, Ember) or Classic (synthesized), or the
    set of the relic you wear; placed where the move lands (HRTF). Theme Studio: Piece sounds,
    Interface sounds, and a Sound test with every sound and sting, for the owner to judge.
  - The room follows the real music (as before): the player listens to itself, and the
    candles, the glow round the board, the clock and the captured pieces keep its beat.
- R12.5b Next for the music (owner to judge first): listen through the Sound test and the
  stings; replace any that miss with new takes (more packs of single hits with silence
  between them); legendary and epic piece sets get their own sound sets and themes as they
  are made; an MP3 copy of the music for browsers without AAC (open-source Chromium, some
  Linux Firefox) if players ask for it.
- R12.6 Vanta Bughouse: two against two on two boards, tables by link, the partner's board
  beside yours, team calls, the first board to finish decides the match. Casual. Server in
  PR #54; app in PR claude/round12-social.
- R12.7 Orders and heraldry: club owners design a crest (shield, division, colours, charge);
  shown on clubs, profiles and player bars. Drawn in code, no image files. (PR #54, social)
- R12.8 Twin Fates: one famous position played twice with colours swapped; the second game
  starts by itself; the match is the total. Casual. (PR #54, social)
- R12.9 Hall of Relics: the profile showroom (Moments of the Week won, club crest, and on your
  own profile your relics, campaign, honor and veterans). (PR #54, social)
- Fix: on phones, Your Shadow, the Vanta Gauntlet and Relic sets opened off-screen. (PR #55)
- Translations for every round 12 screen. (PR #55, social)

## R13. Round 13 (owner requests 2026-10-12)
Built in PR #58 (stacked on #57) and PR #59 (Resonance). Server changes are committed in
`supabase/functions/chess`; migration `20261013090000_round13_profiles_chat_fog` and the
function deploy wait for the owner's approval for that deployment.
- R13.1 Vanta Dark and Blackout Blitz online and rated, each with its own pool. The server
  keeps the real game and sends each seat only what it may see (`fog.js`); spectators see the
  game when it is over; history, data export and the explorer reveal nothing while it is on.
- R13.2 A fair blind computer in Vanta Dark and Blackout (plays from the board it believes in).
- R13.3 Engines: multi-variant Stockfish 10 for Crazyhouse; Lozza 2.5 (MIT) as a second mind,
  measured against Stockfish (`scripts/calibrate-lozza.mjs`), for the campaign guards from the
  Mirror Court on. Bosses stay on Stockfish 19. No opponent screen names an engine.
- R13.4 Review by mode: Crazyhouse with the variant engine (archived games replay drops);
  Vanta Dark and Blackout reviewed on the board the player could see ("Ambushed" moves);
  accuracy by the published Lichess formula.
- R13.5 Learn library (8 courses) and 14 famous-game "what would you play?" lessons.
- R13.6 Puzzles: Streak (count-up) and Survival (countdown per puzzle); skip tokens earned by
  daily visits and every 10 solved.
- R13.7 Profiles for everyone (portraits, name, About line); chat reactions and chess emoji;
  moderate filter with the mute ladder (warning, 2 h, 1 day, 1 week, 1 month, 6 months,
  1 year, then permanent; slurs count double). Owner confirmed 2026-10-13: permanent after
  the year.
- R13.8 Live streamers in Watch; rematches made by the server; the 50-move counter.
- R13.9 Bigger board, centred Regal pieces, soft piece shadows lit per theme; languages switch
  both ways; 11 languages; hover descriptions for every section, tab and mode; drawn icons
  instead of unicode glyphs on the game controls.
- R13.10 Resonance (PR #59): Chladni figures in sand behind the page (Theme Studio: Resonance
  background, off / on). Nothing on the board (owner feedback 2026-10-13: the first version,
  on the board, was distracting). Alive and reactive (owner, 2026-10-13: "make it come to life
  ... more responsive and reactive"): the theme's figure gathers out of scattered sand; every
  move sends a ring of light out from the square the piece lands on (a capture a stronger ring
  and its echo; a check shivers the plate and rings from the king; in Vanta Dark and Blackout
  the hidden opponent's moves ring from the middle of the board and say nothing else);
  captures re-tune the plate to a new figure; a win brings an intricate figure and more light,
  a loss a simple one and less; time trouble shivers it. The pointer parts the sand where it
  shows (through the panels when the glass is clear), a tap rings it, a slow swell crosses it
  now and then. With the music the lines brighten with every note, the figure swells with the
  bass, every chord rings the plate, every other chord moves the sand to a new figure, and the
  storm's heartbeat shakes it. A low-resolution glow layer carries the light, so it reads
  through frosted glass. Still while a piece travels; nothing is drawn while it rests; reduced
  motion keeps one still figure. And the Resonance room, the music library drawn in sand.
  Owner's idea, 2026-10-12.
- R13.11 The computer ladder (owner feedback 2026-10-13): twelve levels named in chess terms,
  Beginner (400) to Maximum, each describing how it plays; the lowest three make a
  beginner's mistakes on purpose. Hover descriptions rewritten in chess language.

### Open from round 13 (next)
- Redesign (owner concept 2026-10-12; direction in the "Vanta Chess Redesign Direction" design
  canvas): home page, brand name always "Vanta Chess" or VCH (never "Vanta" alone; check the
  trademark position of the "Vanta …" mode names before launch), modern type (Bricolage
  Grotesque, Geist, Geist Mono, self-hosted), one ground / one metal / one signal colour, mode
  marks drawn from each rule, no invented statistics. Higgsfield art only after the art
  direction is agreed.
- Full pages for every section (Community, Puzzles, Watch, Arena, Learn, Openings, Famous,
  Review, Analysis) and a search page; the puzzle section's visual redesign. Design first.
- The trailer ("The Film"): a slot on the home page; made later in the workflow.
- Living Armies: the same game played by soldiers and warriors instead of pieces, a view you
  switch on (see P3); captures as short duels.
- Board skins (MLBB-style collectible boards) and interactive boards (squares that react,
  realm boards with weather on the squares). With P.
- Round 13 ideas: Bughouse tournaments, Rival's Shadow (a bot from your rival's games),
  seasonal campaign chapters.
- Security before launch: items M3–M5 and L2–L12 from the round 13 review; owner checks of RLS
  on the base tables, `realtime.messages` policies and auth settings.

## H1. The living home screen (owner, 2026-10-18)
Owner: "The one with the pavilion is good. So we just need to bring it to life because the home
screen needs to be alive with the lights glowing and flickering and the background fog alive ...
And a sound that suits it." The landing's name is Vchess. After a generated video loop did not
look alive ("more effort can be put into this"), the life is drawn in code from the one still.
- **The photograph:** the stone pavilion at dusk (Higgsfield, AI-checked and fixed with a GPT
  Image edit: Staunton knight, true 8x8 floor, candle flames, no border), served as WebP at
  1920, 2560 and 3840 px (`public/assets/vch/home/`). It is the first paint, and all there is
  with reduced motion, Motion at 0, no WebGL, or WebGL drawn in software.
- **The scene** (`src/living-scene.js`, WebGL, loaded only when the home screen first shows):
  the candle flames flicker, lean and stretch, their light rises and falls on the stone, the
  floor and the pieces (the photograph's own warm light, multiplied), the near lantern swings
  on its chain as a damped pendulum pushed by the wind; mist drifts through the valley, creeps
  over the ground and hangs in the lamplight (at a third of the resolution); the clouds creep;
  a few motes of dust turn near the lanterns; a little grain. Touch or a moving pointer stirs
  the air (gusts, the flames gutter, the mist swirls around the finger). Never a loop. It pauses
  off the home screen and in hidden tabs, lets its GPU memory go after a minute away, and draws
  fewer pixels on a slow device.
- **The home screen** (`src/home-scene.js`, `#mainMenu`): Vchess beside the V, Play Better
  Chess, Play now and Sign in (hidden when signed in), over the dark sky on wide screens and
  over the floor on tall ones. The V at the top left leads back to it from anywhere.
- **Open:** the night sound (made in Google Flow Music, after the first tap, following the sound
  settings); the topbar wordmark still reads VCH until the rename (task: rename to Vchess).

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
- E8 Captured pieces, alive (owner, 2026-10-13: captured pieces "should be animated... where
  they will be staying"): a captured piece is knocked off its square as the capturing piece
  lands and flies in an arc to its own place in the capturer's tray (each kind keeps its
  place, biggest first), lands with a bounce, and the material lead counts up as it lands;
  pieces taken back leave the tray; jumps pop in without flights. Crazyhouse/Bughouse pockets
  (the pieces waiting to come into the game) glow while you can drop them, a capture flies
  into the pocket and its number counts up, a dropped piece flies from the pocket to its
  square. Fog-safe: the hidden opponent's captures arrive without a flight. Reduced motion
  and Motion 0: no flights. (src/capture-tray.js)

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
