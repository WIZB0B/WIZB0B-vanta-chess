-- Round 7 (owner approved 2026-10-10): notifications inbox, opening explorer from VCH
-- games, aborted games when nobody moves first. Server-only tables under RLS.

create table if not exists public.chess_notifications (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.chess_players(id) on delete cascade,
  tag text not null check (char_length(tag) between 1 and 80),
  kind text not null default 'info' check (kind in ('game','challenge','tournament','club','achievement','league','info')),
  title text not null check (char_length(title) between 1 and 120),
  body text not null default '' check (char_length(body) <= 300),
  url text not null default '/' check (char_length(url) <= 200 and url like '/%' and url not like '//%'),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  unique (player_id, tag)
);
create index if not exists chess_notifications_player_idx on public.chess_notifications (player_id, created_at desc);

-- Opening explorer: one row per (position, move) with results, from finished human games.
create table if not exists public.chess_opening_moves (
  position text not null check (char_length(position) <= 100),
  san text not null check (char_length(san) <= 10),
  games integer not null default 0,
  white integer not null default 0,
  draws integer not null default 0,
  black integer not null default 0,
  primary key (position, san)
);
alter table public.chess_games add column if not exists explorer_at timestamptz;

-- Adds one game's moves to the explorer in one statement. Service role only.
create or replace function public.chess_explorer_add(p_rows jsonb) returns void
language sql security invoker set search_path = '' as $$
  insert into public.chess_opening_moves (position, san, games, white, draws, black)
  select r->>'position', r->>'san', 1, (r->>'w')::int, (r->>'d')::int, (r->>'b')::int
  from jsonb_array_elements(p_rows) as r
  on conflict (position, san) do update set
    games = public.chess_opening_moves.games + 1,
    white = public.chess_opening_moves.white + excluded.white,
    draws = public.chess_opening_moves.draws + excluded.draws,
    black = public.chess_opening_moves.black + excluded.black;
$$;
revoke execute on function public.chess_explorer_add(jsonb) from public, anon, authenticated;
grant execute on function public.chess_explorer_add(jsonb) to service_role;

alter table public.chess_notifications enable row level security;
alter table public.chess_opening_moves enable row level security;
drop policy if exists chess_notifications_server_only on public.chess_notifications;
create policy chess_notifications_server_only on public.chess_notifications for all to anon, authenticated using (false) with check (false);
drop policy if exists chess_opening_moves_server_only on public.chess_opening_moves;
create policy chess_opening_moves_server_only on public.chess_opening_moves for all to anon, authenticated using (false) with check (false);
