-- Tighten anonymous access and bind every move to an assigned room seat.
alter table public.games
  add column if not exists white_token text,
  add column if not exists black_token text;

drop policy if exists "public casual games" on public.games;
create policy "public can read games" on public.games for select using (true);
create policy "public can create games" on public.games for insert with check (
  status = 'active' and white_id is null and black_id is null and result is null
);

create or replace function public.claim_game_seat(game_id text, player_token text)
returns text
language plpgsql security definer set search_path = public
as $$
declare assigned text;
begin
  if length(player_token) < 16 then raise exception 'invalid player token'; end if;
  perform pg_advisory_xact_lock(hashtext(game_id));
  insert into public.games(id) values (game_id) on conflict do nothing;
  update public.games
    set white_token = case when white_token is null then player_token else white_token end
    where id = game_id and (white_token is null or white_token = player_token);
  select case
    when g.white_token = player_token then 'w'
    when g.black_token = player_token then 'b'
  end into assigned from public.games g where g.id = game_id;
  if assigned is null then
    update public.games set black_token = player_token
      where id = game_id and black_token is null;
    select case when g.black_token = player_token then 'b' end
      into assigned from public.games g where g.id = game_id;
  end if;
  return assigned;
end
$$;

create or replace function public.play_move(
  game_id text,
  expected_ply integer,
  san text,
  next_fen text,
  player_token text
) returns public.moves
language plpgsql security definer set search_path = public
as $$
declare result public.moves; stored_fen text; expected_color text;
begin
  perform pg_advisory_xact_lock(hashtext(game_id));
  select g.fen into stored_fen from public.games g where g.id = game_id for update;
  if stored_fen is null then raise exception 'game not found'; end if;
  expected_color := case
    when stored_fen = 'start' or split_part(stored_fen, ' ', 2) = 'w' then 'w'
    else 'b'
  end;
  if not exists (
    select 1 from public.games g where g.id = game_id and
      ((expected_color = 'w' and g.white_token = player_token) or
       (expected_color = 'b' and g.black_token = player_token))
  ) then raise exception 'not your turn'; end if;
  if (select count(*) from public.moves m where m.room_id = game_id) <> expected_ply then
    raise exception 'stale game';
  end if;
  insert into public.moves(room_id, ply, move, fen)
    values(game_id, expected_ply + 1, san, next_fen) returning * into result;
  update public.games set fen = next_fen, updated_at = now() where id = game_id;
  return result;
end
$$;

revoke all on function public.play_move(text, integer, text, text) from anon, authenticated;
grant execute on function public.claim_game_seat(text, text) to anon, authenticated;
grant execute on function public.play_move(text, integer, text, text, text) to anon, authenticated;

