-- Mitglieder-Upload in shared/images und shared/routes (Mediathek-Picker im Profil)
-- Nach supabase-member-change-summary.sql (is_club_member) und supabase-vorstand-roles.sql
-- Idempotent — sicher mehrfach ausführbar.
--
-- Hinweis: Kein COMMENT ON POLICY — dafür fehlen in Supabase oft Owner-Rechte auf storage.objects.

drop policy if exists media_insert_club_member_shared on storage.objects;

create policy media_insert_club_member_shared
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'media'
    and public.is_club_member()
    and (
      name like 'shared/images/%'
      or name like 'shared/routes/%'
    )
  );
