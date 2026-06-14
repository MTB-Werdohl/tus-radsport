-- Storage-Policies: Rückblick-Bilder unter media/recaps/{termin_id}/...
-- Nach supabase-termin-recaps.sql und supabase-member-change-summary.sql
-- Öffentliches Lesen: bestehende Policy media_public_read_excluding_protocols
-- (recaps/ ist nicht ausgeschlossen). Vorstand: media_insert_vorstand (gesamter Bucket).
-- Idempotent — sicher mehrfach ausführbar.
--
-- Hinweis: Kein COMMENT ON POLICY — dafür fehlen in Supabase oft Owner-Rechte auf storage.objects.

-- ---------------------------------------------------------------------------
-- Hilfsfunktion: termin_id aus Storage-Pfad recaps/{termin_id}/...
-- ---------------------------------------------------------------------------

create or replace function public.recap_storage_termin_id(
  p_storage_path text
)
returns bigint
language sql
immutable
set search_path = public
as $$
  select case
    when p_storage_path like 'recaps/%/%' then
      nullif(split_part(p_storage_path, '/', 2), '')::bigint
    else null
  end;
$$;

comment on function public.recap_storage_termin_id(text) is
  'Extrahiert Termin-ID aus recaps/{termin_id}/datei.webp.';

revoke all on function public.recap_storage_termin_id(text) from public;

grant execute on function public.recap_storage_termin_id(text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Vereinsmitglieder: eigene vergangene Termine (Phase-2-Vorbereitung)
-- ---------------------------------------------------------------------------

drop policy if exists media_insert_club_member_recaps on storage.objects;

create policy media_insert_club_member_recaps
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'media'
    and public.is_club_member()
    and name like 'recaps/%/%'
    and public.recap_member_owns_termin(
      public.recap_storage_termin_id(name)
    )
    and exists (
      select 1
      from public."Termine" t
      where t.id = public.recap_storage_termin_id(name)
        and public.termin_allows_recap(t)
    )
  );

drop policy if exists media_update_club_member_recaps on storage.objects;

create policy media_update_club_member_recaps
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'media'
    and public.is_club_member()
    and name like 'recaps/%/%'
    and public.recap_member_owns_termin(
      public.recap_storage_termin_id(name)
    )
  )
  with check (
    bucket_id = 'media'
    and public.is_club_member()
    and name like 'recaps/%/%'
    and public.recap_member_owns_termin(
      public.recap_storage_termin_id(name)
    )
    and exists (
      select 1
      from public."Termine" t
      where t.id = public.recap_storage_termin_id(name)
        and public.termin_allows_recap(t)
    )
  );

drop policy if exists media_delete_club_member_recaps on storage.objects;

create policy media_delete_club_member_recaps
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'media'
    and public.is_club_member()
    and name like 'recaps/%/%'
    and public.recap_member_owns_termin(
      public.recap_storage_termin_id(name)
    )
  );
