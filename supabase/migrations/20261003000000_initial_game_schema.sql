-- Canonical initial schema. Keep supabase/schema.sql as a convenient one-shot
-- setup file for the hosted dashboard; new production changes go in migrations.
create table if not exists public.games (
  id text primary key,
  status text not null default 'active',
  fen text not null default 'start',
  white_id uuid,
  black_id uuid,
  white_ms integer not null default 600000 check (white_ms >= 0),
  black_ms integer not null default 600000 check (black_ms >= 0),
  result text,
  updated_at timestamptz not null default now()
);

create table if not exists public.moves (
  id bigint generated always as identity primary key,
  room_id text not null references public.games(id) on delete cascade,
  ply integer not null check (ply > 0),
  move text not null,
  fen text not null,
  created_at timestamptz not null default now(),
  unique (room_id, ply)
);

alter table public.games enable row level security;
alter table public.moves enable row level security;

create policy "public casual games" on public.games
  for all using (true) with check (true);
create policy "public casual moves" on public.moves
  for select using (true);

create or replace function public.play_move(
  game_id text,
  expected_ply integer,
  san text,
  next_fen text
) returns public.moves
language plpgsql security definer set search_path = public
as $$
declare result public.moves;
begin
  if (select count(*) from public.moves where room_id = game_id) <> expected_ply then
    raise exception 'stale game';
  end if;
  insert into public.moves(room_id, ply, move, fen)
    values(game_id, expected_ply + 1, san, next_fen) returning * into result;
  update public.games set fen = next_fen, updated_at = now() where id = game_id;
  return result;
end
$$;

grant execute on function public.play_move(text, integer, text, text) to anon, authenticated;

do $$ begin
  alter publication supabase_realtime add table public.moves;
exception when duplicate_object then null;
end $$;
