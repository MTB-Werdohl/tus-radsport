-- Medien-Storage Phase 3 — Referenzen, Move/Rename, sicheres Löschen
-- Nach supabase-media-storage-paths.sql + supabase-vorstand-roles.sql
-- Siehe docs/MEDIA-STORAGE-ROADMAP.md

create or replace function public.normalize_media_storage_path(
  p_path text
)
returns text
language sql
immutable
as $$
  select nullif(
    trim(both '/' from trim(coalesce(p_path, ''))),
    ''
  );
$$;

create or replace function public.assert_media_manage_authenticated()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin

  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_vorstand() then
    raise exception 'Nur Vorstand';
  end if;

end;
$$;

create or replace function public.get_media_references(
  p_path text
)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_path text;
  v_termine jsonb := '[]'::jsonb;
  v_news jsonb := '[]'::jsonb;
  v_gallery jsonb := '[]'::jsonb;
  v_termine_count integer := 0;
  v_news_count integer := 0;
  v_gallery_count integer := 0;
begin

  perform public.assert_media_manage_authenticated();

  v_path :=
    public.normalize_media_storage_path(
      p_path
    );

  if v_path is null then
    raise exception 'Pfad fehlt';
  end if;

  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', src.id,
          'title', src.title,
          'kind', src.kind
        )
      ),
      '[]'::jsonb
    ),
    count(*)::integer
  into
    v_termine,
    v_termine_count
  from (

    select
      t.id,
      t.title,
      'Bild'::text as kind
    from public."Termine" t
    where t.image_storage_path = v_path
       or (
         t.image is not null
         and t.image like '%' || v_path || '%'
       )

    union all

    select
      t.id,
      t.title,
      'GPX'::text as kind
    from public."Termine" t
    where t.gpx_storage_path = v_path
       or (
         t.gpx is not null
         and t.gpx like '%' || v_path || '%'
       )

  ) src;

  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', n.id,
          'title', n.title
        )
      ),
      '[]'::jsonb
    ),
    count(*)::integer
  into
    v_news,
    v_news_count
  from public."News" n
  where n.image_storage_path = v_path
     or (
       n.image is not null
       and n.image like '%' || v_path || '%'
     );

  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', g.id,
          'gallery_id', g.gallery_id
        )
      ),
      '[]'::jsonb
    ),
    count(*)::integer
  into
    v_gallery,
    v_gallery_count
  from public.gallery_images g
  where g.image_path is not null
    and g.image_path like '%' || v_path || '%';

  return jsonb_build_object(
    'path', v_path,
    'counts', jsonb_build_object(
      'termine', v_termine_count,
      'news', v_news_count,
      'gallery', v_gallery_count,
      'total',
        v_termine_count
        + v_news_count
        + v_gallery_count
    ),
    'termine', v_termine,
    'news', v_news,
    'gallery', v_gallery
  );

end;
$$;

comment on function public.get_media_references(text) is
  'Medien-Storage Phase 3: Referenzen zu einem Storage-Pfad (Vorstand).';

create or replace function public.move_media_object(
  p_old_path text,
  p_new_path text
)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_old text;
  v_new text;
  v_storage_moved integer;
  v_termine_image_path integer := 0;
  v_termine_gpx_path integer := 0;
  v_termine_image_url integer := 0;
  v_termine_gpx_url integer := 0;
  v_news_path integer := 0;
  v_news_url integer := 0;
  v_gallery integer := 0;
begin

  perform public.assert_media_manage_authenticated();

  v_old :=
    public.normalize_media_storage_path(
      p_old_path
    );

  v_new :=
    public.normalize_media_storage_path(
      p_new_path
    );

  if v_old is null or v_new is null then
    raise exception 'Alte und neue Pfade erforderlich';
  end if;

  if v_new not like 'shared/%' then
    raise exception 'Zielpfad muss mit shared/ beginnen';
  end if;

  if v_old like 'protocols/%'
     or v_old like 'galleries/%' then
    raise exception 'Dieser Quellpfad kann hier nicht verschoben werden';
  end if;

  if v_old like 'shared/%' then
    null;

  elsif position('/' in v_old) = 0 then
    null;

  else
    raise exception 'Quellpfad nicht erlaubt';
  end if;

  if v_old = v_new then

    return jsonb_build_object(
      'ok', true,
      'old_path', v_old,
      'new_path', v_new,
      'updated', jsonb_build_object()
    );

  end if;

  if exists (
    select 1
    from storage.objects o
    where o.bucket_id = 'media'
      and o.name = v_new
  ) then
    raise exception 'Ziel existiert bereits: %', v_new;
  end if;

  update storage.objects
  set name = v_new
  where bucket_id = 'media'
    and name = v_old;

  get diagnostics v_storage_moved = row_count;

  if v_storage_moved = 0 then
    raise exception 'Datei nicht im Storage gefunden: %', v_old;
  end if;

  update public."Termine"
  set image_storage_path = v_new
  where image_storage_path = v_old;

  get diagnostics v_termine_image_path = row_count;

  update public."Termine"
  set gpx_storage_path = v_new
  where gpx_storage_path = v_old;

  get diagnostics v_termine_gpx_path = row_count;

  update public."Termine"
  set image = replace(image, v_old, v_new)
  where image is not null
    and image like '%' || v_old || '%';

  get diagnostics v_termine_image_url = row_count;

  update public."Termine"
  set gpx = replace(gpx, v_old, v_new)
  where gpx is not null
    and gpx like '%' || v_old || '%';

  get diagnostics v_termine_gpx_url = row_count;

  update public."News"
  set image_storage_path = v_new
  where image_storage_path = v_old;

  get diagnostics v_news_path = row_count;

  update public."News"
  set image = replace(image, v_old, v_new)
  where image is not null
    and image like '%' || v_old || '%';

  get diagnostics v_news_url = row_count;

  update public.gallery_images
  set image_path = replace(image_path, v_old, v_new)
  where image_path is not null
    and image_path like '%' || v_old || '%';

  get diagnostics v_gallery = row_count;

  return jsonb_build_object(
    'ok', true,
    'old_path', v_old,
    'new_path', v_new,
    'updated', jsonb_build_object(
      'termine_image_path', v_termine_image_path,
      'termine_gpx_path', v_termine_gpx_path,
      'termine_image_url', v_termine_image_url,
      'termine_gpx_url', v_termine_gpx_url,
      'news_path', v_news_path,
      'news_url', v_news_url,
      'gallery', v_gallery
    )
  );

end;
$$;

comment on function public.move_media_object(text, text) is
  'Medien-Storage Phase 3: Storage verschieben/umbenennen + DB-Referenzen aktualisieren (Vorstand).';

create or replace function public.delete_media_object(
  p_path text,
  p_force boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_path text;
  v_refs jsonb;
  v_total integer;
  v_deleted integer;
begin

  perform public.assert_media_manage_authenticated();

  v_path :=
    public.normalize_media_storage_path(
      p_path
    );

  if v_path is null then
    raise exception 'Pfad fehlt';
  end if;

  if v_path like 'protocols/%' then
    raise exception 'Protokolle werden hier nicht gelöscht';
  end if;

  v_refs :=
    public.get_media_references(v_path);

  v_total :=
    coalesce(
      (v_refs->'counts'->>'total')::integer,
      0
    );

  if v_total > 0
     and not coalesce(p_force, false) then

    raise exception using
      errcode = 'P0001',
      message = 'MEDIA_REFERENCED',
      detail = v_refs::text;

  end if;

  delete from storage.objects
  where bucket_id = 'media'
    and name = v_path;

  get diagnostics v_deleted = row_count;

  if v_deleted = 0 then
    raise exception 'Datei nicht im Storage gefunden: %', v_path;
  end if;

  return jsonb_build_object(
    'ok', true,
    'path', v_path,
    'forced', coalesce(p_force, false),
    'references', v_refs->'counts'
  );

end;
$$;

comment on function public.delete_media_object(text, boolean) is
  'Medien-Storage Phase 3: Storage-Datei löschen; mit Referenzen nur bei p_force=true (Vorstand).';

revoke all on function public.normalize_media_storage_path(text) from public;
revoke all on function public.assert_media_manage_authenticated() from public;
revoke all on function public.get_media_references(text) from public;
revoke all on function public.move_media_object(text, text) from public;
revoke all on function public.delete_media_object(text, boolean) from public;

grant execute on function public.get_media_references(text)
  to authenticated;

grant execute on function public.move_media_object(text, text)
  to authenticated;

grant execute on function public.delete_media_object(text, boolean)
  to authenticated;
