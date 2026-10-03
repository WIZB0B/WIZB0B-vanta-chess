# Supabase boundary

Vanta Chess uses the existing hosted `chess_*` schema exclusively through the
authoritative `chess` Edge Function. This repository intentionally contains no
parallel game tables or client-writable game RPCs. Realtime, when added, may only
notify clients that a version changed; clients must then fetch authoritative state.

The production project URL is public configuration. Service-role credentials and
the Edge Function implementation belong to the managed Supabase project and must
never be copied into this frontend repository.
