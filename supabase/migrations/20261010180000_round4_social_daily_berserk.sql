-- Round 4 (owner approved 2026-10-10): Berserk and arena streaks, friends and challenges,
-- puzzle rating, daily (correspondence) games with push notifications, achievements.
-- Every table stays server-only: RLS on and a deny-all policy for anon/authenticated, the
-- chess edge function (service role) is the only reader and writer.

-- Berserk: earned after every three straight rated wins, spent in one rated game.
alter table public.chess_players
  add column if not exists berserk_ready boolean not null default false,
  add column if not exists puzzle_rating integer not null default 1200,
  add column if not exists puzzle_games integer not null default 0,
  add column if not exists puzzle_best_streak integer not null default 0,
  add column if not exists achievements jsonb not null default '[]'::jsonb;
alter table public.chess_games
  add column if not exists white_berserk boolean not null default false,
  add column if not exists black_berserk boolean not null default false,
  add column if not exists daily_days integer check (daily_days is null or daily_days between 1 and 14),
  add column if not exists challenge_id uuid;
-- Daily games keep their per-move days in daily_days; the real-time clock limit doesn't apply to them.
alter table public.chess_games drop constraint if exists chess_games_time_control_seconds_check;
alter table public.chess_games add constraint chess_games_time_control_seconds_check
  check (daily_days is not null or (time_control_seconds >= 30 and time_control_seconds <= 7200));
-- Daily games are rated in their own pool.
alter table public.chess_games drop constraint if exists chess_games_pool_check;
alter table public.chess_games add constraint chess_games_pool_check
  check (pool in ('bullet','blitz','rapid','classical','daily'));
-- Arena: wins in a row (three or more puts you "on fire": wins score double).
alter table public.chess_tournament_entries
  add column if not exists streak integer not null default 0,
  add column if not exists berserks integer not null default 0;

-- Friends: one-way follows.
create table if not exists public.chess_follows (
  follower_id uuid not null references public.chess_players(id) on delete cascade,
  followee_id uuid not null references public.chess_players(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
create index if not exists chess_follows_followee_idx on public.chess_follows (followee_id);

-- Direct challenges between players.
create table if not exists public.chess_challenges (
  id uuid primary key default gen_random_uuid(),
  from_player_id uuid not null references public.chess_players(id) on delete cascade,
  to_player_id uuid not null references public.chess_players(id) on delete cascade,
  base_seconds integer not null default 600 check (base_seconds between 30 and 7200),
  increment_seconds integer not null default 0 check (increment_seconds between 0 and 60),
  daily_days integer check (daily_days is null or daily_days between 1 and 14),
  rated boolean not null default false,
  color text not null default 'random' check (color in ('w','b','random')),
  status text not null default 'pending' check (status in ('pending','accepted','declined','cancelled','expired')),
  game_id uuid references public.chess_games(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '10 minutes',
  check (from_player_id <> to_player_id)
);
create index if not exists chess_challenges_to_idx on public.chess_challenges (to_player_id, status);
create index if not exists chess_challenges_from_idx on public.chess_challenges (from_player_id, status);

-- Web push subscriptions ("your move" in daily games).
create table if not exists public.chess_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.chess_players(id) on delete cascade,
  endpoint text not null unique check (char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 100),
  created_at timestamptz not null default now()
);
create index if not exists chess_push_player_idx on public.chess_push_subscriptions (player_id);

-- Puzzle attempts remember the rating change.
alter table public.chess_puzzle_attempts
  add column if not exists rating_before integer,
  add column if not exists rating_after integer;

create index if not exists chess_games_daily_idx on public.chess_games (status, daily_days) where daily_days is not null;
create index if not exists chess_players_username_lower_idx on public.chess_players (lower(username));

alter table public.chess_follows enable row level security;
alter table public.chess_challenges enable row level security;
alter table public.chess_push_subscriptions enable row level security;
drop policy if exists chess_follows_server_only on public.chess_follows;
create policy chess_follows_server_only on public.chess_follows for all to anon, authenticated using (false) with check (false);
drop policy if exists chess_challenges_server_only on public.chess_challenges;
create policy chess_challenges_server_only on public.chess_challenges for all to anon, authenticated using (false) with check (false);
drop policy if exists chess_push_subscriptions_server_only on public.chess_push_subscriptions;
create policy chess_push_subscriptions_server_only on public.chess_push_subscriptions for all to anon, authenticated using (false) with check (false);

-- Server-side settings that must not reach the browser (the web push VAPID private key).
-- Values are inserted out of band, never committed. Service role only.
create table if not exists public.chess_server_secrets (
  name text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
alter table public.chess_server_secrets enable row level security;
drop policy if exists chess_server_secrets_server_only on public.chess_server_secrets;
create policy chess_server_secrets_server_only on public.chess_server_secrets for all to anon, authenticated using (false) with check (false);
revoke all on public.chess_server_secrets from anon, authenticated;
