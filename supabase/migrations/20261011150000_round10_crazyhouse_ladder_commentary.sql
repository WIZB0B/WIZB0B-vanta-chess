-- Round 10 (owner approved 2026-10-11): Crazyhouse, the weekly Puzzle Battle ladder and live
-- commentary in tournament lobbies. New tables are server-only (RLS on, deny-all policy).

-- Crazyhouse: its own variant and rated pool; pockets and promoted squares beside the FEN.
alter table public.chess_games drop constraint if exists chess_games_variant_check;
alter table public.chess_games add constraint chess_games_variant_check check (variant in ('standard','freestyle','crazyhouse'));
alter table public.chess_challenges drop constraint if exists chess_challenges_variant_check;
alter table public.chess_challenges add constraint chess_challenges_variant_check check (variant in ('standard','freestyle','crazyhouse'));
alter table public.chess_games drop constraint if exists chess_games_pool_check;
alter table public.chess_games add constraint chess_games_pool_check
  check (pool in ('bullet','blitz','rapid','classical','daily','freestyle','crazyhouse'));
alter table public.chess_games
  add column if not exists zh_pockets jsonb,
  add column if not exists zh_promoted text[];

-- Puzzle Battle ladder: a weekly table from matched battles; the top three get a badge.
alter table public.chess_puzzle_battles add column if not exists ladder boolean not null default false;
create table if not exists public.chess_battle_queue (
  player_id uuid primary key references public.chess_players(id) on delete cascade,
  joined_at timestamptz not null default now()
);
create table if not exists public.chess_battle_ladder (
  week text not null check (week ~ '^[0-9]{4}-W[0-9]{2}$'),
  player_id uuid not null references public.chess_players(id) on delete cascade,
  points integer not null default 0,
  wins integer not null default 0,
  battles integer not null default 0,
  solved integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (week, player_id)
);
create index if not exists chess_battle_ladder_week_idx on public.chess_battle_ladder (week, points desc);
create table if not exists public.chess_battle_weeks (
  week text primary key check (week ~ '^[0-9]{4}-W[0-9]{2}$'),
  processed_at timestamptz not null default now()
);

-- Live commentary on tournament games, written by the organiser, the club owner or an admin.
create table if not exists public.chess_commentary (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.chess_tournaments(id) on delete cascade,
  game_id uuid references public.chess_games(id) on delete set null,
  author_id uuid not null references public.chess_players(id) on delete cascade,
  ply integer check (ply is null or ply between 0 and 1000),
  body text not null check (char_length(body) between 1 and 280),
  created_at timestamptz not null default now()
);
create index if not exists chess_commentary_tournament_idx on public.chess_commentary (tournament_id, created_at desc);

alter table public.chess_battle_queue enable row level security;
alter table public.chess_battle_ladder enable row level security;
alter table public.chess_battle_weeks enable row level security;
alter table public.chess_commentary enable row level security;
do $$
declare t text;
begin
  foreach t in array array['chess_battle_queue','chess_battle_ladder','chess_battle_weeks','chess_commentary'] loop
    execute format('drop policy if exists %I on public.%I', t || '_server_only', t);
    execute format('create policy %I on public.%I for all to anon, authenticated using (false) with check (false)', t || '_server_only', t);
  end loop;
end $$;
