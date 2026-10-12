-- Round 5 (owner approved 2026-10-10): public profiles, clubs and club battles, monthly
-- leagues, conditional moves in daily games, fair-play reports and signals, Freestyle.
-- Every new table is server-only: RLS on and a deny-all policy for anon/authenticated; the
-- chess edge function (service role) is the only reader and writer.

-- Freestyle (Chess960 starts without castling): games remember their start position.
alter table public.chess_games
  add column if not exists variant text not null default 'standard' check (variant in ('standard','freestyle')),
  add column if not exists start_fen text check (start_fen is null or char_length(start_fen) <= 100);
alter table public.chess_challenges
  add column if not exists variant text not null default 'standard' check (variant in ('standard','freestyle'));

-- Clubs: one club per player; the creator owns it.
create table if not exists public.chess_clubs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{2,31}$'),
  name text not null check (char_length(name) between 3 and 40),
  description text not null default '' check (char_length(description) <= 280),
  owner_id uuid not null references public.chess_players(id) on delete cascade,
  member_count integer not null default 1,
  created_at timestamptz not null default now()
);
create table if not exists public.chess_club_members (
  club_id uuid not null references public.chess_clubs(id) on delete cascade,
  player_id uuid not null references public.chess_players(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  joined_at timestamptz not null default now(),
  primary key (club_id, player_id)
);
create unique index if not exists chess_club_members_one_club on public.chess_club_members (player_id);
create table if not exists public.chess_club_messages (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.chess_clubs(id) on delete cascade,
  player_id uuid not null references public.chess_players(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 280),
  created_at timestamptz not null default now()
);
create index if not exists chess_club_messages_club_idx on public.chess_club_messages (club_id, created_at desc);

-- Club battles are arenas where entries play for their club.
alter table public.chess_tournaments
  add column if not exists kind text not null default 'arena' check (kind in ('arena','club_battle'));
alter table public.chess_tournament_entries
  add column if not exists club_id uuid references public.chess_clubs(id) on delete set null;

-- Monthly leagues.
alter table public.chess_players
  add column if not exists league_division smallint not null default 0 check (league_division between 0 and 4);
create table if not exists public.chess_league_entries (
  season text not null check (season ~ '^[0-9]{4}-[0-9]{2}$'),
  player_id uuid not null references public.chess_players(id) on delete cascade,
  division smallint not null check (division between 0 and 4),
  points integer not null default 0,
  games integer not null default 0,
  wins integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (season, player_id)
);
create index if not exists chess_league_entries_division_idx on public.chess_league_entries (season, division, points desc);
create table if not exists public.chess_league_seasons (
  season text primary key check (season ~ '^[0-9]{4}-[0-9]{2}$'),
  processed_at timestamptz not null default now()
);

-- Conditional moves (daily games): your planned replies, one row per player and game.
create table if not exists public.chess_conditional_moves (
  game_id uuid not null references public.chess_games(id) on delete cascade,
  player_id uuid not null references public.chess_players(id) on delete cascade,
  lines jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (game_id, player_id)
);

-- Fair play: player reports, and accuracy signals sent by the opponent's own review.
create table if not exists public.chess_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.chess_players(id) on delete cascade,
  reported_id uuid not null references public.chess_players(id) on delete cascade,
  game_id uuid references public.chess_games(id) on delete set null,
  reason text not null check (reason in ('engine','abuse','sandbagging','other')),
  note text not null default '' check (char_length(note) <= 500),
  status text not null default 'open' check (status in ('open','reviewed','dismissed')),
  created_at timestamptz not null default now(),
  check (reporter_id <> reported_id)
);
create unique index if not exists chess_reports_once on public.chess_reports (reporter_id, reported_id, coalesce(game_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index if not exists chess_reports_reported_idx on public.chess_reports (reported_id, created_at desc);
create table if not exists public.chess_fairplay_signals (
  game_id uuid not null references public.chess_games(id) on delete cascade,
  submitter_id uuid not null references public.chess_players(id) on delete cascade,
  subject_id uuid not null references public.chess_players(id) on delete cascade,
  accuracy numeric(5,2) not null check (accuracy between 0 and 100),
  avg_loss numeric(6,2) not null check (avg_loss between 0 and 100),
  moves integer not null check (moves between 1 and 500),
  created_at timestamptz not null default now(),
  primary key (game_id, submitter_id)
);
create index if not exists chess_fairplay_subject_idx on public.chess_fairplay_signals (subject_id);

-- For the owner in the Supabase dashboard: players with reports or suspiciously accurate
-- games (as measured by their opponents' reviews). Invoker rights, so anon/authenticated
-- get nothing through RLS.
create or replace view public.chess_fairplay_review with (security_invoker = true) as
select p.id as player_id, p.username,
  (select count(*) from public.chess_reports r where r.reported_id = p.id and r.status = 'open') as open_reports,
  (select count(*) from public.chess_reports r where r.reported_id = p.id and r.reason = 'engine') as engine_reports,
  (select count(*) from public.chess_fairplay_signals s where s.subject_id = p.id and s.moves >= 20) as reviewed_games,
  (select count(*) from public.chess_fairplay_signals s where s.subject_id = p.id and s.moves >= 20 and s.accuracy >= 95) as games_95_plus,
  (select round(avg(s.accuracy), 1) from public.chess_fairplay_signals s where s.subject_id = p.id and s.moves >= 20) as avg_opponent_measured_accuracy
from public.chess_players p
where exists (select 1 from public.chess_reports r where r.reported_id = p.id)
   or exists (select 1 from public.chess_fairplay_signals s where s.subject_id = p.id and s.moves >= 20 and s.accuracy >= 95);
revoke all on public.chess_fairplay_review from anon, authenticated;

alter table public.chess_clubs enable row level security;
alter table public.chess_club_members enable row level security;
alter table public.chess_club_messages enable row level security;
alter table public.chess_league_entries enable row level security;
alter table public.chess_league_seasons enable row level security;
alter table public.chess_conditional_moves enable row level security;
alter table public.chess_reports enable row level security;
alter table public.chess_fairplay_signals enable row level security;
do $$
declare t text;
begin
  foreach t in array array['chess_clubs','chess_club_members','chess_club_messages','chess_league_entries','chess_league_seasons','chess_conditional_moves','chess_reports','chess_fairplay_signals'] loop
    execute format('drop policy if exists %I on public.%I', t || '_server_only', t);
    execute format('create policy %I on public.%I for all to anon, authenticated using (false) with check (false)', t || '_server_only', t);
  end loop;
end $$;
