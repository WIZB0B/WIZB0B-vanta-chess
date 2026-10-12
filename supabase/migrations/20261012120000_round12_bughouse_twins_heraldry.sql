-- Round 12 (owner approved 2026-10-12): Vanta Bughouse (two against two on two boards), Twin Fates
-- (one famous position played twice, once with each colour) and club heraldry. New tables are
-- server-only (RLS on, deny-all policy); players reach them through the chess function.

-- Bughouse matches: four seats, two linked games. Seats are {aw, ab, bw, bb}: {id, name}.
create table if not exists public.chess_bughouse (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9]{6,10}$'),
  status text not null default 'waiting' check (status in ('waiting','active','finished','aborted')),
  seats jsonb not null default '{}'::jsonb check (jsonb_typeof(seats) = 'object' and octet_length(seats::text) <= 1200),
  seat_version integer not null default 0, -- every seat change bumps it, so two joins can't take the same seat
  secret text, -- names each team's private call channel; never sent to players as is
  game_a uuid references public.chess_games(id) on delete set null,
  game_b uuid references public.chess_games(id) on delete set null,
  time_control_seconds integer not null default 180 check (time_control_seconds between 60 and 900),
  increment_seconds integer not null default 0 check (increment_seconds between 0 and 15),
  winner text check (winner is null or winner in ('team1','team2','draw')),
  end_reason text check (end_reason is null or char_length(end_reason) <= 40),
  created_by uuid references public.chess_players(id) on delete set null,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  ended_at timestamptz
);
alter table public.chess_bughouse add column if not exists secret text;
create index if not exists chess_bughouse_created_by_idx on public.chess_bughouse (created_by);
create index if not exists chess_bughouse_game_a_idx on public.chess_bughouse (game_a);
create index if not exists chess_bughouse_game_b_idx on public.chess_bughouse (game_b);

-- Twin Fates: two games from the same start, colours swapped for the second.
create table if not exists public.chess_twins (
  id uuid primary key default gen_random_uuid(),
  fate text not null check (fate ~ '^[a-z0-9-]{2,40}$'),
  start_fen text not null check (char_length(start_fen) between 20 and 100),
  status text not null default 'first' check (status in ('first','second','finished','aborted')),
  game_1 uuid references public.chess_games(id) on delete set null,
  game_2 uuid references public.chess_games(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists chess_twins_game_1_idx on public.chess_twins (game_1);
create index if not exists chess_twins_game_2_idx on public.chess_twins (game_2);

alter table public.chess_games
  add column if not exists bughouse_id uuid references public.chess_bughouse(id) on delete set null,
  add column if not exists bughouse_board text check (bughouse_board is null or bughouse_board in ('a','b')),
  add column if not exists twin_id uuid references public.chess_twins(id) on delete set null,
  add column if not exists twin_leg smallint check (twin_leg is null or twin_leg in (1,2));
create index if not exists chess_games_bughouse_idx on public.chess_games (bughouse_id) where bughouse_id is not null;
create index if not exists chess_games_twin_idx on public.chess_games (twin_id) where twin_id is not null;

-- Bughouse is its own variant and pool (never rated).
alter table public.chess_games drop constraint if exists chess_games_variant_check;
alter table public.chess_games add constraint chess_games_variant_check check (variant in ('standard','freestyle','crazyhouse','bughouse'));
alter table public.chess_games drop constraint if exists chess_games_pool_check;
alter table public.chess_games add constraint chess_games_pool_check
  check (pool in ('bullet','blitz','rapid','classical','daily','freestyle','crazyhouse','bughouse'));

-- Club heraldry: a small crest object (rules.js cleanCrest decides what's allowed).
alter table public.chess_clubs add column if not exists crest jsonb
  check (crest is null or (jsonb_typeof(crest) = 'object' and octet_length(crest::text) <= 400));

-- Bughouse pockets change from both boards at once (a capture on one board feeds the other), so
-- the chess function changes them one piece at a time, atomically, never by rewriting the whole
-- pocket. Only the service role (the chess function) may call it.
create or replace function public.chess_bughouse_pocket(p_game uuid, p_color text, p_piece text, p_delta integer)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  cur integer;
  pockets jsonb;
begin
  if p_color not in ('w','b') or p_piece not in ('q','r','b','n','p') or p_delta not in (-1, 1) then
    raise exception 'bad pocket change';
  end if;
  select coalesce(zh_pockets, '{"w":{},"b":{}}'::jsonb) into pockets from public.chess_games where id = p_game and variant = 'bughouse' for update;
  if not found then raise exception 'bughouse game not found'; end if;
  if not (pockets ? p_color) then pockets := jsonb_set(pockets, array[p_color], '{}'::jsonb, true); end if;
  cur := coalesce((pockets -> p_color ->> p_piece)::integer, 0);
  if cur + p_delta < 0 then raise exception 'pocket empty'; end if;
  pockets := jsonb_set(pockets, array[p_color, p_piece], to_jsonb(cur + p_delta), true);
  update public.chess_games set zh_pockets = pockets where id = p_game;
  return pockets;
end $$;
revoke all on function public.chess_bughouse_pocket(uuid, text, text, integer) from public, anon, authenticated;
grant execute on function public.chess_bughouse_pocket(uuid, text, text, integer) to service_role;

alter table public.chess_bughouse enable row level security;
alter table public.chess_twins enable row level security;
do $$
declare t text;
begin
  foreach t in array array['chess_bughouse','chess_twins'] loop
    execute format('drop policy if exists %I on public.%I', t || '_server_only', t);
    execute format('create policy %I on public.%I for all to anon, authenticated using (false) with check (false)', t || '_server_only', t);
  end loop;
end $$;
