-- Round 9 (owner approved 2026-10-11): opening repertoires, Puzzle Battle, simuls and
-- vacation days for daily games. New tables are server-only: RLS on and a deny-all policy
-- for anon/authenticated; the chess edge function (service role) reads and writes them.

-- Opening repertoire: your lines as White and as Black (SAN move lists).
create table if not exists public.chess_repertoires (
  player_id uuid not null references public.chess_players(id) on delete cascade,
  color text not null check (color in ('w','b')),
  lines jsonb not null default '[]'::jsonb check (jsonb_typeof(lines) = 'array' and jsonb_array_length(lines) <= 300),
  updated_at timestamptz not null default now(),
  primary key (player_id, color)
);

-- Puzzle Battle: two players race through the same puzzles for three minutes.
create table if not exists public.chess_puzzle_battles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9]{6}$'),
  host_id uuid not null references public.chess_players(id) on delete cascade,
  guest_id uuid references public.chess_players(id) on delete cascade,
  puzzles jsonb not null default '[]'::jsonb,
  status text not null default 'waiting' check (status in ('waiting','live','finished','cancelled')),
  host_score integer not null default 0, guest_score integer not null default 0,
  host_misses integer not null default 0, guest_misses integer not null default 0,
  starts_at timestamptz, ends_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists chess_puzzle_battles_host_idx on public.chess_puzzle_battles (host_id, created_at desc);
create index if not exists chess_puzzle_battles_guest_idx on public.chess_puzzle_battles (guest_id, created_at desc);

-- Simuls: one host plays everyone who joined, each on their own board.
create table if not exists public.chess_simuls (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9]{6}$'),
  host_id uuid not null references public.chess_players(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  base_seconds integer not null default 1800 check (base_seconds between 300 and 7200),
  increment_seconds integer not null default 30 check (increment_seconds between 0 and 60),
  max_players integer not null default 10 check (max_players between 2 and 20),
  club_id uuid references public.chess_clubs(id) on delete cascade,
  status text not null default 'open' check (status in ('open','live','finished','cancelled')),
  created_at timestamptz not null default now(),
  started_at timestamptz
);
create index if not exists chess_simuls_status_idx on public.chess_simuls (status, created_at desc);
create table if not exists public.chess_simul_entries (
  simul_id uuid not null references public.chess_simuls(id) on delete cascade,
  player_id uuid not null references public.chess_players(id) on delete cascade,
  game_id uuid references public.chess_games(id) on delete set null,
  joined_at timestamptz not null default now(),
  primary key (simul_id, player_id)
);
alter table public.chess_games add column if not exists simul_id uuid references public.chess_simuls(id) on delete set null;
create index if not exists chess_games_simul_idx on public.chess_games (simul_id) where simul_id is not null;

-- Vacation for daily games: up to 14 days a calendar year. While it lasts, your daily-game
-- clocks don't run out.
alter table public.chess_players
  add column if not exists vacation_year integer,
  add column if not exists vacation_used integer not null default 0 check (vacation_used between 0 and 14),
  add column if not exists vacation_from timestamptz,
  add column if not exists vacation_until timestamptz;

alter table public.chess_repertoires enable row level security;
alter table public.chess_puzzle_battles enable row level security;
alter table public.chess_simuls enable row level security;
alter table public.chess_simul_entries enable row level security;
do $$
declare t text;
begin
  foreach t in array array['chess_repertoires','chess_puzzle_battles','chess_simuls','chess_simul_entries'] loop
    execute format('drop policy if exists %I on public.%I', t || '_server_only', t);
    execute format('create policy %I on public.%I for all to anon, authenticated using (false) with check (false)', t || '_server_only', t);
  end loop;
end $$;
