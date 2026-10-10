-- Takeback requests in casual human games: who asked, and at which game version (the offer
-- lapses as soon as another move is played). Written only by the chess edge function.
alter table public.chess_games
  add column if not exists takeback_offer_by uuid references public.chess_players(id) on delete set null,
  add column if not exists takeback_offer_version integer;

create index if not exists chess_games_takeback_offer_by_idx on public.chess_games (takeback_offer_by) where takeback_offer_by is not null;

-- The Watch tab lists recent public games (queue and tournament games, never private rooms).
create index if not exists chess_games_watch_idx on public.chess_games (status, source, updated_at desc);
