-- Rückblick-Storage: Ordner nach Termin-Slug statt numerischer ID
-- Nach supabase-recap-media-upload.sql
-- Neu: recaps/{slug}/datei.webp (Slug = URL-Titel des Termins)
-- Legacy recaps/{termin_id}/… bleibt für bestehende Dateien gültig.
-- Idempotent — sicher mehrfach ausführbar.

create or replace function public.recap_storage_folder_key(
  p_storage_path text
)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when p_storage_path like 'recaps/%/%' then
      nullif(split_part(p_storage_path, '/', 2), '')
    else null
  end;
$$;

comment on function public.recap_storage_folder_key(text) is
  'Ordner-Segment aus recaps/{ordner}/datei.webp (Slug oder Legacy-ID).';

revoke all on function public.recap_storage_folder_key(text) from public;

grant execute on function public.recap_storage_folder_key(text)
  to authenticated;

create or replace function public.recap_storage_termin_id(
  p_storage_path text
)
returns bigint
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  with folder as (
    select public.recap_storage_folder_key(
      p_storage_path
    ) as key
  )
  select coalesce(
    (
      select t.id
      from public."Termine" t
      cross join folder f
      where t.slug = f.key
      limit 1
    ),
    (
      select f.key::bigint
      from folder f
      where f.key ~ '^[0-9]+$'
    ),
    (
      select t.id
      from public."Termine" t
      cross join folder f
      where f.key = 'termin-' || t.id::text
      limit 1
    )
  );
$$;

comment on function public.recap_storage_termin_id(text) is
  'Termin-ID aus recaps/{slug}/…, Legacy recaps/{id}/… oder recaps/termin-{id}/….';

revoke all on function public.recap_storage_termin_id(text) from public;

grant execute on function public.recap_storage_termin_id(text)
  to authenticated;
