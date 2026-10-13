-- Round 13: profiles everyone can edit, chat moderation with a mute ladder, and the fog
-- variants (Vanta Dark, Blackout Blitz) in online and rated play. Forward-only; re-runnable.

-- Profiles: a VCH portrait anyone can wear (guests included) and a short About line.
alter table public.chess_players add column if not exists avatar_preset text;
alter table public.chess_players add column if not exists bio text;
-- Chat moderation (supabase/functions/chess/moderation.js): strikes in force and the last one.
alter table public.chess_players add column if not exists chat_strikes smallint not null default 0;
alter table public.chess_players add column if not exists chat_strike_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'chess_players_avatar_preset_check') then
    alter table public.chess_players add constraint chess_players_avatar_preset_check
      check (avatar_preset is null or avatar_preset ~ '^[kqrbnp]-(emerald|gold|ivory|onyx|crimson|cobalt)$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'chess_players_bio_check') then
    alter table public.chess_players add constraint chess_players_bio_check
      check (bio is null or char_length(bio) <= 160);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'chess_players_chat_strikes_check') then
    alter table public.chess_players add constraint chess_players_chat_strikes_check
      check (chat_strikes between 0 and 100);
  end if;
end $$;

-- Automatic moderation leaves a trail for admins (no message text is stored).
alter table public.chess_mod_actions drop constraint if exists chess_mod_actions_action_check;
alter table public.chess_mod_actions add constraint chess_mod_actions_action_check
  check (action in ('mute','unmute','ban','unban','dismiss','resolve','auto_warn','auto_mute'));

-- Fog variants online: each has its own rating pool.
alter table public.chess_games drop constraint if exists chess_games_variant_check;
alter table public.chess_games add constraint chess_games_variant_check
  check (variant in ('standard','freestyle','crazyhouse','bughouse','dark','blackout'));
alter table public.chess_games drop constraint if exists chess_games_pool_check;
alter table public.chess_games add constraint chess_games_pool_check
  check (pool in ('bullet','blitz','rapid','classical','daily','freestyle','crazyhouse','bughouse','dark','blackout'));
alter table public.chess_matchmaking_queue drop constraint if exists chess_matchmaking_queue_pool_check;
alter table public.chess_matchmaking_queue add constraint chess_matchmaking_queue_pool_check
  check (pool in ('bullet','blitz','rapid','classical','dark','blackout'));
alter table public.chess_challenges drop constraint if exists chess_challenges_variant_check;
alter table public.chess_challenges add constraint chess_challenges_variant_check
  check (variant in ('standard','freestyle','crazyhouse','dark','blackout'));

-- Rematches are made by the server (security review C1): the offer and the new game live on
-- the finished game's row, so no game code ever travels from one browser to another.
alter table public.chess_games add column if not exists rematch_offer_by uuid references public.chess_players(id) on delete set null;
alter table public.chess_games add column if not exists rematch_game_id uuid references public.chess_games(id) on delete set null;
create index if not exists chess_games_rematch_game_idx on public.chess_games (rematch_game_id) where rematch_game_id is not null;

-- Rate limits that survive new guest identities and many function instances (security review
-- M1): one row per key and fixed window. Keys hold a hash of the address, never the address.
create table if not exists public.chess_rate_limits (
  key text primary key check (char_length(key) <= 120),
  window_start timestamptz not null default now(),
  hits integer not null default 0
);
alter table public.chess_rate_limits enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'chess_rate_limits' and policyname = 'chess_rate_limits_server_only') then
    create policy chess_rate_limits_server_only on public.chess_rate_limits for all to anon, authenticated using (false) with check (false);
  end if;
end $$;
create or replace function public.chess_rate_hit(p_key text, p_limit integer, p_window integer)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare v_hits integer;
begin
  insert into public.chess_rate_limits as r (key, window_start, hits) values (p_key, now(), 1)
  on conflict (key) do update set
    hits = case when r.window_start < now() - make_interval(secs => p_window) then 1 else r.hits + 1 end,
    window_start = case when r.window_start < now() - make_interval(secs => p_window) then now() else r.window_start end
  returning hits into v_hits;
  -- Old windows are cleared now and then, so the table stays small.
  if random() < 0.01 then delete from public.chess_rate_limits where window_start < now() - interval '1 day'; end if;
  return v_hits <= p_limit;
end $$;
revoke all on function public.chess_rate_hit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.chess_rate_hit(text, integer, integer) to service_role;
