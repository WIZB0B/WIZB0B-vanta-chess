-- Country flag and portrait for players (owner-approved 2026-10-10).
-- country_code: ISO 3166-1 alpha-2, set only when the player chooses to show a flag.
-- avatar_data: a small data: image (signed-in players), served inline so the CSP needs no
-- new image origin. Both are written only by the chess edge function (service role).
alter table public.chess_players
  add column if not exists country_code text,
  add column if not exists avatar_data text;
alter table public.chess_players
  add constraint chess_players_country_code_format check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  add constraint chess_players_avatar_data_format check (
    avatar_data is null or (
      length(avatar_data) <= 48000
      and avatar_data ~ '^data:image/(webp|jpeg|png);base64,[A-Za-z0-9+/]+={0,2}$'
    )
  );
