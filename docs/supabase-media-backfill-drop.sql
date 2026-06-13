-- Medien-Storage: Backfill-RPCs entfernen (einmalig nach Migration)
-- Optional im Supabase SQL Editor ausführen, wenn Phase-4-Backfill abgeschlossen ist.

drop function if exists public.backfill_media_storage_paths(boolean, boolean);
drop function if exists public.count_media_backfill_candidates();
drop function if exists public.list_media_storage_orphans();
drop function if exists public.ensure_unique_media_storage_target(text);
drop function if exists public.media_storage_shared_target_path(text);
drop function if exists public.extract_media_storage_path_from_url(text);
