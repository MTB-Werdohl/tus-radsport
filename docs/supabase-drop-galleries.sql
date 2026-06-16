-- Drop Galerien (galleries / gallery_images)
-- Idempotent — sicher mehrfach ausführbar wo möglich.

-- ---------------------------------------------------------------------------
-- Policies + Tabellen (nur wenn noch vorhanden)
-- ---------------------------------------------------------------------------

do $$
begin

  if to_regclass('public.gallery_images') is not null then
    execute 'drop policy if exists "Public read gallery images" on public.gallery_images';
    execute 'drop policy if exists "Authenticated insert gallery images" on public.gallery_images';
    execute 'drop policy if exists "Authenticated update gallery images" on public.gallery_images';
    execute 'drop policy if exists "Authenticated delete gallery images" on public.gallery_images';
    execute 'drop policy if exists gallery_images_insert_vorstand on public.gallery_images';
    execute 'drop policy if exists gallery_images_update_vorstand on public.gallery_images';
    execute 'drop policy if exists gallery_images_delete_vorstand on public.gallery_images';
  end if;

  if to_regclass('public.galleries') is not null then
    execute 'drop policy if exists "Public read galleries" on public.galleries';
    execute 'drop policy if exists "Authenticated insert galleries" on public.galleries';
    execute 'drop policy if exists "Authenticated update galleries" on public.galleries';
    execute 'drop policy if exists "Authenticated delete galleries" on public.galleries';
    execute 'drop policy if exists galleries_insert_vorstand on public.galleries';
    execute 'drop policy if exists galleries_update_vorstand on public.galleries';
    execute 'drop policy if exists galleries_delete_vorstand on public.galleries';
  end if;

end $$;

drop policy if exists "Public gallery access" on storage.objects;

drop table if exists public.gallery_images cascade;
drop table if exists public.galleries cascade;

-- ---------------------------------------------------------------------------
-- get_media_references — nur Termine
-- ---------------------------------------------------------------------------

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
  v_termine_count integer := 0;
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

  return jsonb_build_object(
    'path', v_path,
    'counts', jsonb_build_object(
      'termine', v_termine_count,
      'total', v_termine_count
    ),
    'termine', v_termine
  );

end;
$$;

comment on function public.get_media_references(text) is
  'Medien-Storage: Referenzen zu einem Storage-Pfad (nur Termine, Vorstand).';

-- ---------------------------------------------------------------------------
-- sync_media_object_references — nur Termine
-- ---------------------------------------------------------------------------

create or replace function public.sync_media_object_references(
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
  v_termine_image_path integer := 0;
  v_termine_gpx_path integer := 0;
  v_termine_image_url integer := 0;
  v_termine_gpx_url integer := 0;
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

  return jsonb_build_object(
    'ok', true,
    'old_path', v_old,
    'new_path', v_new,
    'updated', jsonb_build_object(
      'termine_image_path', v_termine_image_path,
      'termine_gpx_path', v_termine_gpx_path,
      'termine_image_url', v_termine_image_url,
      'termine_gpx_url', v_termine_gpx_url
    )
  );

end;
$$;

comment on function public.sync_media_object_references(text, text) is
  'Medien-Storage: DB-Referenzen nach Storage move/rename (nur Termine, Vorstand).';
