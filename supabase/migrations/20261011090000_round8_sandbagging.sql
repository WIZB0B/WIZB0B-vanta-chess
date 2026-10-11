-- Round 8 (owner approved 2026-10-11): anti-sandbagging score. Written only by the chess
-- edge function (service role); players never see their own score.
alter table public.chess_players
  add column if not exists sandbag_score numeric(5,2) not null default 0 check (sandbag_score between 0 and 10);
create index if not exists chess_players_sandbag_idx on public.chess_players (sandbag_score) where sandbag_score >= 3;
