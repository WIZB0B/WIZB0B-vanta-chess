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
