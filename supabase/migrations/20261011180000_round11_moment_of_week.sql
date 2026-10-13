-- Round 11: Vanta Moment of the Week. An admin may pin one finished rated game per ISO week;
-- otherwise the chess function picks the week's best checkmate itself. Server-only table
-- (RLS on, deny-all policy); players read the moment through the chess function.
create table if not exists public.chess_moments (
  week text primary key check (week ~ '^[0-9]{4}-W[0-9]{2}$'),
  game_id uuid not null references public.chess_games(id) on delete cascade,
  caption text check (caption is null or char_length(caption) between 1 and 120),
  picked_by uuid references public.chess_players(id) on delete set null,
  picked_at timestamptz not null default now()
);
create index if not exists chess_moments_game_idx on public.chess_moments (game_id);
create index if not exists chess_moments_picked_by_idx on public.chess_moments (picked_by);
-- The automatic pick reads recent finished rated games by end time.
create index if not exists chess_games_moment_idx on public.chess_games (ended_at desc) where rated and variant = 'standard' and result in ('1-0','0-1');

alter table public.chess_moments enable row level security;
drop policy if exists chess_moments_server_only on public.chess_moments;
create policy chess_moments_server_only on public.chess_moments for all to anon, authenticated using (false) with check (false);
