-- Storage: UPDATE für Verschieben/Umbenennen von Protokoll-Dateien
-- Einmal im Supabase SQL Editor ausführen (nach supabase-board-documents.sql)

drop policy if exists media_update_vorstand on storage.objects;

create policy media_update_vorstand
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'media'
    and public.is_vorstand()
  )
  with check (
    bucket_id = 'media'
    and public.is_vorstand()
  );
