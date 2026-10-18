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
- **Sounds:** move, capture, check, castle, promote, game start, game end, low time. (Done in
  R12.5: recorded sounds for each piece and moment in five sets, interface sounds on every
  press and screen, stings over the music.)
- **Game over modal:**
  - every result reason, including "abandoned by opponent";
  - a mini analysis summary (accuracy for both sides, best/blunder counts);
  - buttons: Game Review, New game (with time control), Rematch.
  - (2026-10-18: no longer a modal. A result card over the board, after the ending animation,
    leaves the rest of the page free: the result and how it ended, both players with the
    score and the rating change counting up, Game Review, Rematch online, New game. The mini
    analysis summary is still to come.)
- **Game start (2026-10-18):** the start card shows over the empty squares, then the pieces
  settle onto their squares from the middle files out (`src/board-arrival.js`); a touch on
  the board ends it at once.
- **Move list:** first/previous/play/next/last controls under it, and Draw / Abort
  (before move 2) / Resign / Flip there too.
- **Opening name** shown above the move list (from an open opening database such as the
  lichess openings TSV, CC0).

## Phase C: Settings (full player control)
- **Board:**
  - board themes (wood, marble, glass, green, etc.) generated with Higgsfield;
  - piece sets (Vanta, Vanta Ink, Monarch, Monarch Ink, Heritage, plus more generated sets);
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
- **Sound:** on/off and volume. (Piece sounds, Interface sounds and a Sound test are in Theme
  Studio since R12.5; a sound-effects volume of its own is still to do.)
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
- **Done 2026-10-18 (backlog H1):** the home screen is the living pavilion (a still brought to
  life in WebGL), with Vchess, the headline, Play now and Sign in; the V leads home from
  anywhere. Still to come here: the night sound, and the parts below that it does not cover.
- **Visitor home page:**
  - an animated board replaying a famous game, view-only (not a playable board);
  - a headline and a "Get started" / "Play now" call to action;
  - quick links (Play, Puzzles, Learn, Watch).
- The **VCH logo is clickable everywhere** and returns to Home. (Done 2026-10-18.)
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

## Phase R: Redesign and launch polish (owner concept 2026-10-12)
- Home page and brand: "Vanta Chess" / VCH, the direction in the design canvas, then
  Higgsfield art for realms and the trailer once the art direction is agreed.
- Full-page sections and search; the puzzle section redesign; mode marks with hover
  descriptions everywhere (hover descriptions done in round 13).
- Resonance (cymatics) as VCH's signature visual: a living background behind the page that
  answers every move, the pointer and the music (never on the board), the music library, and
  the home page hero (PR #59).
- Living Armies view and the trailer.
- Security items before go-live (backlog R13, open list).

