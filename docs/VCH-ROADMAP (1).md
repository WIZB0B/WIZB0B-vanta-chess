# VCH Roadmap (2026-10-06)

This roadmap comes from the owner's chess.com walkthrough. chess.com is a reference for
how things should *feel*. Never copy its logo, art, text or layouts. Every visual is
VCH's own (Higgsfield-generated art, VCH brand). Finish the open tasks in
docs/VCH-BACKLOG.md first.

## Phase A: Finish the current backlog
Backlog tasks 3–9: menus closing, profile menu, engine consistency, pieces sitting
naturally, web splash, separate screens with the mini live game, button animations, and
the server region.

## Phase B: Gameplay feel (match chess.com's fluidity)
- **Drag and drop:** the piece follows the cursor smoothly with a slight enlarge, the
  target square is highlighted while hovering, and it snaps into place on drop.
  Click-to-move still works.
- **Animations:** every move slides (own, opponent, engine, castling, en passant).
  Captures fade out.
- **Board look:**
  - coordinates inside the edge squares, in the square's contrasting color;
  - last-move highlight;
  - legal-move dots and capture rings;
  - check glow on the king.
- **Sounds:** move, capture, check, castle, promote, game start, game end, low time.
- **Game over modal:**
  - every result reason, including "abandoned by opponent";
  - a mini analysis summary (accuracy for both sides, best/blunder counts);
  - buttons: Game Review, New game (with time control), Rematch.
- **Move list:** first/previous/play/next/last controls under it, and Draw / Abort
  (before move 2) / Resign / Flip there too.
- **Opening name** shown above the move list (from an open opening database such as the
  lichess openings TSV, CC0).

## Phase C: Settings (full player control)
- **Board:**
  - board themes (wood, marble, glass, green, etc.) generated with Higgsfield;
  - piece sets (Vanta 3D/2D, Staunton 3D/2D, plus more generated sets);
  - coordinates inside/outside/off, highlight colors, legal-move display.
- **Backgrounds and sceneries:** a gallery of Higgsfield scenes, each also usable as a
  full preset theme (board + pieces + background + accent).
- **Gameplay:**
  - auto-queen and premoves (single/multiple);
  - confirm moves (for correspondence);
  - move method (click, drag or both) and animation speed;
  - always play as White/Black/random, and show the rating range when matching;
  - magnify piece while dragging.
- **Notifications:** messages, friend requests, game invites, your turn (correspondence).
- **Sound:** on/off and volume.
- All settings are saved per account (and in the browser for guests).

## Phase D: Accounts and social
- **Sign-in with Supabase Auth:** email + password, Google, Apple and Facebook.
  - Each provider needs the owner's developer account: Apple has an annual fee, Google
    and Meta are free.
  - Guest play stays.
- **Profile:** avatar, country flag, separate ratings (bullet, blitz, rapid, daily,
  puzzles), game history and stats.
- **Friends:** requests, a friends list, challenge a friend, online status.
- **Messages and a notification center** (the bell in the header).

## Phase E: Training
- **Analysis board:**
  - set up any position (drag pieces, FEN/PGN import);
  - eval bar;
  - top engine lines with arrows;
  - explore variations;
  - save and share.
- **Puzzles:**
  - use the lichess puzzle database (CC0, millions of rated puzzles with themes);
  - puzzle rating (Glicko-2) that rises and falls with results;
  - themes (mate in 2, forks, endgames…), Puzzle Rush, daily puzzle.
- **Lessons and courses:** short interactive lessons (openings, tactics, endgames),
  each with practice positions against the engine.
- **Endgame practice:** set positions the player must convert against Stockfish.
- **Insights:** stats from the player's own games (openings, accuracy over time, time
  usage).

## Phase F: Watch
- **Live and top games:** featured ongoing VCH games to spectate.
- **Streamers:** official Twitch/YouTube embeds only, playing inside VCH. The CSP
  frame-src needs to allow those players.
- **Famous games library:** classic games (moves are public facts), replayed on the VCH
  board with notes.

## Phase G: Home page and navigation
- **Visitor home page:**
  - an animated board replaying a famous game, view-only (not a playable board);
  - a headline and a "Get started" / "Play now" call to action;
  - quick links (Play, Puzzles, Learn, Watch).
- The **VCH logo is clickable everywhere** and returns to Home.
- **Left sidebar navigation** (Play, Puzzles, Learn, Train, Watch, Community, More)
  with search, profile, messages, notifications and settings at the bottom. It
  collapses on small screens.
- **Signed-in home:** continue the current game, daily puzzle, and recent games.

## Phase H: Art pipeline (Higgsfield)
- Board themes, extra piece sets, backgrounds/sceneries and preset themes are generated
  in Higgsfield in the VCH style.
- Each one is checked on a real board before shipping, then delivered as optimized
  WebP/sprites.
- Splash screen and home page hero art get redesigned in the same pass.

## Details observed in the walkthrough video (chess.com, for reference only)
- **Win popup (Phase B):**
  - compact, centered over the board (not full-screen) and can be minimized;
  - trophy headline "You Won!" with the reason ("Game Abandoned");
  - a coach character with a speech bubble ("A great win! Let's review it together");
  - counts of move qualities (Great, Best, Excellent);
  - a big primary "Game Review" button, with "New 10 min" and "Rematch" below.
  - VCH needs its own coach character (Higgsfield).
- **Result badges on the kings:** a crown on the winner's king; a resign/abandon/flag
  icon on the loser's.
- **Move list:** figurine notation (small piece icons instead of letters) and the
  opening name above the list.
- **Settings (Phase C):**
  - left category list: Board & Pieces, Gameplay, Profile, Accessibility.
  - Board & Pieces has tabs Boards / Pieces / Background / Presets, a thumbnail grid
    with a live preview board beside it, and Cancel / Save.
  - Background changes the whole site (forest, castle and other sceneries).
  - Toggles:
    - show coordinates (inside/outside) and highlight last move;
    - piece movement (drag, click or both) and board animation type;
    - enable premoves, always promote to queen, show legal moves;
    - confirm resign/draw and low-time warning;
    - sound theme, language, dark mode.
- **Analysis page (Phase E):**
  - a paste box for FEN/PGN/link, with an eval bar beside the board;
  - side menu: Set Up Position, New Analysis, Game Collections, Game Search, Explorer,
    Saved Analysis, Classroom.
- **Sign-in (Phase D):** a modal with username/email, password, Remember me, Forgot
  password and Log in, then Apple / Google / Facebook buttons and a Sign up link.
- **Puzzles (Phase E):** an illustrated progression path with a large "Solve Puzzles"
  button, plus a puzzle board.
- **Watch (Phase F):**
  - a featured stream with the board;
  - lists of streamers and events;
  - a broadcast schedule calendar and leaderboards.
- **Sidebar (Phase G):** hover flyout submenus, e.g. Train → Courses, Analysis, Insights,
  Classroom, Endgames, Practice, Drills.
- **Visitor home (Phase G):**
  - a demo board auto-plays a sample game *and pops move-quality badges* on the pieces
    (??, !!, !), showing off Game Review;
  - beside it, a headline, subtext and a "Get Started" button.
