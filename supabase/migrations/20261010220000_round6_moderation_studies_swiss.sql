-- Round 6 (owner approved 2026-10-10): moderation, Chess960 castling and rated Freestyle,
-- studies, Swiss and club tournaments, account export and deletion.
-- New tables are server-only: RLS on and a deny-all policy for anon/authenticated.

-- Moderation: roles, mutes and suspensions, and an audit log of every action.
alter table public.chess_players
  add column if not exists role text not null default 'player' check (role in ('player','admin')),
  add column if not exists muted_until timestamptz,
  add column if not exists banned_at timestamptz,
  add column if not exists ban_reason text check (ban_reason is null or char_length(ban_reason) <= 300);
create table if not exists public.chess_mod_actions (
  id uuid primary key default gen_random_uuid(),
  moderator_id uuid references public.chess_players(id) on delete set null,
  player_id uuid references public.chess_players(id) on delete cascade,
  action text not null check (action in ('mute','unmute','ban','unban','dismiss','resolve')),
  note text not null default '' check (char_length(note) <= 500),
  created_at timestamptz not null default now()
);
create index if not exists chess_mod_actions_player_idx on public.chess_mod_actions (player_id, created_at desc);

-- Chess960 castling rights (rook files, "HAha" style) and a rated Freestyle pool.
alter table public.chess_games
  add column if not exists castling960 text check (castling960 is null or castling960 ~ '^(-|[A-Ha-h]{1,4})$'),
  add column if not exists tournament_round integer;
alter table public.chess_games drop constraint if exists chess_games_pool_check;
alter table public.chess_games add constraint chess_games_pool_check
  check (pool in ('bullet','blitz','rapid','classical','daily','freestyle'));

-- Studies: an annotated line anyone with the link can read.
create table if not exists public.chess_studies (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9]{8}$'),
  owner_id uuid not null references public.chess_players(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  start_fen text not null check (char_length(start_fen) <= 100),
  moves jsonb not null default '[]'::jsonb,
  views integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists chess_studies_owner_idx on public.chess_studies (owner_id, updated_at desc);

-- Tournaments: Swiss format, player- and club-run events.
alter table public.chess_tournaments drop constraint if exists chess_tournaments_format_check;
alter table public.chess_tournaments add constraint chess_tournaments_format_check check (format in ('arena','swiss'));
alter table public.chess_tournaments drop constraint if exists chess_tournaments_pool_check;
alter table public.chess_tournaments add constraint chess_tournaments_pool_check check (pool in ('bullet','blitz','rapid','classical'));
alter table public.chess_tournaments
  add column if not exists rounds integer check (rounds is null or rounds between 1 and 15),
  add column if not exists current_round integer not null default 0,
  add column if not exists club_id uuid references public.chess_clubs(id) on delete cascade;
alter table public.chess_tournament_entries
  add column if not exists opponents uuid[] not null default '{}',
  add column if not exists whites integer not null default 0,
  add column if not exists byes integer not null default 0;
create index if not exists chess_games_tournament_round_idx on public.chess_games (tournament_id, tournament_round) where tournament_id is not null;

alter table public.chess_mod_actions enable row level security;
alter table public.chess_studies enable row level security;
do $$
declare t text;
begin
  foreach t in array array['chess_mod_actions','chess_studies'] loop
    execute format('drop policy if exists %I on public.%I', t || '_server_only', t);
    execute format('create policy %I on public.%I for all to anon, authenticated using (false) with check (false)', t || '_server_only', t);
  end loop;
end $$;
