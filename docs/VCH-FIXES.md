# VCH — Master Fix List

The goal: the play screen looks like `public/assets/vch/ui/reference-ui.png` at 1672×941
and every control works. Audited on 2026-10-04 by building the branch and testing it in a browser.

## Working rules (apply to every task)

1. **One branch only:** `codex/set-up-vch-repository-and-implement-chess-game` (PR #1).
   Never commit to `...-a878ma` (PR #2). That branch has none of the VCH art; close PR #2.
2. Do **one batch per chat**. Don't start the next batch.
3. Finish every task with:
   - the branch name and commit hash;
   - a green GitHub Actions run;
   - a Playwright screenshot at 1672×941 committed to `docs/screens/<batch>.png`.
4. Never copy a mistake from the mockup. In the mockup, a1 is a light square. Real boards have a1 dark and h1 light; keep it that way.
5. No unicode or emoji used as icons (⚡ ♟ ▣ ↗ ◷ ⧉ ♫ ⚑ ⇄ ▦). Use files from `public/assets/vch/icons/`.

---

## Side-by-side: reference vs current

### Page structure
| Reference | Current | Fix |
|---|---|---|
| The game is the first screen and fits in one viewport, with no scrolling | A full-screen "Play Better Chess" menu sits on top; the game is below the fold | Make the menu a separate intro screen shown on first visit. "Join Now" or "Play" dismisses it, and the game view then fits 1672×941 with no scroll |
| No empty space | Empty green band above the three panels | Remove it |

### Top bar
| Reference | Current | Fix |
|---|---|---|
| Brand mark at left | Metal VCH wordmark ✔ | Keep the metal wordmark (owner's choice) |
| Filled, ivory-and-gold nav icons | Thin generic line icons | Use the generated icon set |
| Play is a green pill | ✔ close | — |

### Left panel
| Reference | Current | Fix |
|---|---|---|
| Serif headline "Play your next game." | Bold sans headline | Serif display font, tighter |
| Knight art blends into the panel's top-right | Knight is a boxed thumbnail | Full-bleed background art with a dark gradient fade |
| Match / Room / Computer each show their own content | **Bug:** switching tabs always shows the private-room card and room code. Only the dropdown label changes | Build three separate views (below); only the active one is visible, with a fade transition |
| Airy spacing | Jam-packed | More breathing room; collapse the room-code box until a room exists |
| Designed icons | Unicode glyphs | Generated icons |

**Match view:** time-control chips (1+0, 3+0, 5+0, 10+0, 15+10), a Rated/Casual toggle, a gold
"Find opponent" button, a searching animation, and a players-online count.
**Room view:** the current create/join room UI, with the room code box shown only after creating.
**Computer view:** bot cards with portrait, name, and Elo (900–2700); Play as White/Black/Random;
a gold "Start game" button that resets the board, starts the clocks, and lets the engine reply.
(The engine already works when Computer is selected, but nothing on screen tells the user that.)

### Center: board and players
| Reference | Current | Fix |
|---|---|---|
| Player bar: avatar, name, flag, rating, ping bars + "323 ms", red live dot | "Waiting for opponent", "connecting…" | Match the layout; show ping only in online games |
| Pieces fill ~85% of the square, with shadow and depth | Pieces smaller and flat | Scale to ~85%, add a contact shadow under each |
| Last-move highlight in yellow-green | Present but subtle | Match the reference color |
| Icons on Flip / Sound / Board theme / Resign | Unicode glyphs | Generated icons |

### Right panel
| Reference | Current | Fix |
|---|---|---|
| Move table: number, move, eval, time, book icon | Empty "Game ready" box | Real table: one row per move pair, eval and time per move, book icon for opening moves |
| No extra buttons in the Live Game card | Extra "½ Draw" and "Chat" buttons | Move these under the board or into a ⋯ menu |
| Feature cards: large icon tile plus background art | Art strip on top, no icon | Icon tile overlaid on the art, as in the reference |

---

## Analysis (chess.com-style Game Review)

Triggered when a game ends ("Review game" button) and from the Analysis tab.

- Run the bundled Stockfish 19 (GPL; keep the license files) in a Web Worker on every position, depth 16, with a progress bar.
- **Classify every move** using win-percentage loss (Lichess's open formula, not chess.com's private one): Brilliant, Great, Best, Excellent, Good, Book, Inaccuracy, Mistake, Miss, Blunder.
- Show each classification as a colored badge icon in the move list and on the square where the moved piece landed.
- **On the board:** a green arrow for the best move, an arrow for the played move when it differs, and a vertical eval bar beside the board.
- **Eval graph** across the whole game; clicking a point jumps to that move.
- **Accuracy %** for each player, plus counts per classification.
- **Step controls:** first, previous, next, last, and keyboard arrow keys. Clicking any move jumps the board there.
- **One-line explanation** per move from the engine line, e.g. "Best was Nf3 — develops and controls e5."

## Later (do not start yet)
- Tournament and lesson videos, played inside the app via official embeds only.

---

## Batches (one chat each, in order)

1. **Structure:** intro screen separated from the game; the game fits one viewport; remove the empty band. Close PR #2.
2. **Icons:** wire the icon set from `public/assets/vch/icons/` into the nav, modes, settings, board buttons, and cards. Remove all unicode icons.
3. **Left panel:** three real mode views (Match / Room / Computer), with spacing and the serif headline.
4. **Board and players:** piece scale and shadow, player bars, last-move color.
5. **Right panel:** move table, Live Game card cleanup, feature card icon tiles.
6. **Game Review part 1:** analysis worker, move classification, badges, move list.
7. **Game Review part 2:** arrows, eval bar, eval graph, accuracy, step controls, explanations.
8. **Polish:** compare against the reference and fix the 10 most visible differences.
