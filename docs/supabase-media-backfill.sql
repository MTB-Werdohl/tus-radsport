-- Medien-Storage Phase 4 — Legacy-Backfill + Waisen-Report
-- Nach supabase-media-storage-paths.sql + supabase-media-move.sql
-- Siehe docs/MEDIA-STORAGE-ROADMAP.md

create or replace function public.extract_media_storage_path_from_url(
  p_url text
)
returns text
language plpgsql
immutable
as $$
declare
  v_raw text;
  v_path text;
begin

  v_raw :=
    trim(coalesce(p_url, ''));

  if v_raw = '' then
    return null;
  end if;

  v_raw :=
    split_part(
      split_part(v_raw, '#', 1),
      '?',
      1
    );

  v_path :=
    nullif(
      trim(both '/' from substring(
        v_raw
        from '/storage/v1/object/public/media/(.+)$'
      )),
      ''
    );

  if v_path is not null then
    return v_path;
  end if;

  v_path :=
    nullif(
      trim(both '/' from substring(
        v_raw
        from '/storage/v1/render/image/public/media/(.+)$'
      )),
      ''
    );

  if v_path is not null then
    return v_path;
  end if;

  if v_raw ~* '^https?://' then
    return null;
  end if;

  if v_raw ~ '^/' then
    return null;
  end if;

  return public.normalize_media_storage_path(
    v_raw
  );

end;
$$;

create or replace function public.media_storage_shared_target_path(
  p_path text
)
returns text
language plpgsql
immutable
as $$
declare
  v_path text;
  v_filename text;
  v_folder text;
begin

  v_path :=
    public.normalize_media_storage_path(
      p_path
    );

  if v_path is null then
    return null;
  end if;

  if v_path like 'shared/%' then
    return v_path;
  end if;

  v_filename :=
    regexp_replace(
      case
        when position('/' in v_path) > 0 then
          regexp_replace(v_path, '^.+/', '')
        else
          v_path
      end,
      '^[0-9]+-',
      ''
    );

  if v_filename is null or v_filename = '' then
    return null;
  end if;

  v_folder :=
    case
      when lower(v_filename) like '%.gpx' then
        'shared/routes'
      else
        'shared/images'
    end;

  return v_folder || '/' || v_filename;

end;
$$;

create or replace function public.ensure_unique_media_storage_target(
  p_target text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target text;
  v_filename text;
  v_folder text;
begin

  v_target :=
    public.normalize_media_storage_path(
      p_target
    );

  if v_target is null then
    return null;
  end if;

  if not exists (
    select 1
    from storage.objects o
    where o.bucket_id = 'media'
      and o.name = v_target
  ) then
    return v_target;
  end if;

  v_folder :=
    regexp_replace(v_target, '/[^/]+$', '');

  v_filename :=
    regexp_replace(v_target, '^.+/', '');

  return
    v_folder
    || '/'
    || floor(extract(epoch from clock_timestamp()))::bigint
    || '-'
    || v_filename;

end;
$$;

create or replace function public.count_media_backfill_candidates()
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_termine_image integer := 0;
  v_termine_gpx integer := 0;
  v_news_image integer := 0;
  v_legacy_paths integer := 0;
begin

  perform public.assert_media_manage_authenticated();

  select count(*)
  into v_termine_image
  from public."Termine" t
  where nullif(trim(t.image), '') is not null
    and coalesce(t.image_storage_path, '') = '';

  select count(*)
  into v_termine_gpx
  from public."Termine" t
  where nullif(trim(t.gpx), '') is not null
    and coalesce(t.gpx_storage_path, '') = '';

  select count(*)
  into v_news_image
  from public."News" n
  where nullif(trim(n.image), '') is not null
    and coalesce(n.image_storage_path, '') = '';

  select count(distinct src.path)
  into v_legacy_paths
  from (

    select t.image_storage_path as path
    from public."Termine" t
    where coalesce(t.image_storage_path, '') <> ''
      and t.image_storage_path not like 'shared/%'

    union

    select t.gpx_storage_path
    from public."Termine" t
    where coalesce(t.gpx_storage_path, '') <> ''
      and t.gpx_storage_path not like 'shared/%'

    union

    select n.image_storage_path
    from public."News" n
    where coalesce(n.image_storage_path, '') <> ''
      and n.image_storage_path not like 'shared/%'

  ) src
  where src.path is not null;

  return jsonb_build_object(
    'termine_image', v_termine_image,
    'termine_gpx', v_termine_gpx,
    'news_image', v_news_image,
    'legacy_paths', v_legacy_paths
  );

end;
$$;

create or replace function public.backfill_media_storage_paths(
  p_move_legacy_to_shared boolean default false,
  p_dry_run boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_items jsonb := '[]'::jsonb;
  v_moves jsonb := '[]'::jsonb;
  v_errors jsonb := '[]'::jsonb;
  v_termine_image_updated integer := 0;
  v_termine_gpx_updated integer := 0;
  v_news_image_updated integer := 0;
  v_moves_done integer := 0;
  v_row_count integer := 0;
  r record;
  v_path text;
  v_target text;
  v_move_result jsonb;
  v_legacy_preview text;
begin

  perform public.assert_media_manage_authenticated();

  create temp table _media_backfill_move_paths (
    path text primary key
  ) on commit drop;

  for r in

    select
      t.id,
      'termine_image'::text as kind,
      t.image as legacy_url
    from public."Termine" t
    where nullif(trim(t.image), '') is not null
      and coalesce(t.image_storage_path, '') = ''

    union all

    select
      t.id,
      'termine_gpx'::text,
      t.gpx
    from public."Termine" t
    where nullif(trim(t.gpx), '') is not null
      and coalesce(t.gpx_storage_path, '') = ''

    union all

    select
      n.id,
      'news_image'::text,
      n.image
    from public."News" n
    where nullif(trim(n.image), '') is not null
      and coalesce(n.image_storage_path, '') = ''

  loop

    v_legacy_preview :=
      left(trim(r.legacy_url), 160);

    v_path :=
      public.extract_media_storage_path_from_url(
        r.legacy_url
      );

    if v_path is null then

      v_errors :=
        v_errors
        || jsonb_build_array(
          jsonb_build_object(
            'kind', r.kind,
            'id', r.id,
            'legacy_url', v_legacy_preview,
            'error',
              case
                when trim(coalesce(r.legacy_url, '')) = '' then
                  'Leeres Medium-Feld'
                when trim(r.legacy_url) ~* '^https?://' then
                  'Externer Link, kein Storage-Pfad'
                else
                  'Pfad aus URL nicht extrahierbar'
              end
          )
        );

      continue;

    end if;

    if not exists (
      select 1
      from storage.objects o
      where o.bucket_id = 'media'
        and o.name = v_path
    ) then

      v_errors :=
        v_errors
        || jsonb_build_array(
          jsonb_build_object(
            'kind', r.kind,
            'id', r.id,
            'path', v_path,
            'error', 'Datei nicht im Storage'
          )
        );

      continue;

    end if;

    v_items :=
      v_items
      || jsonb_build_array(
        jsonb_build_object(
          'kind', r.kind,
          'id', r.id,
          'path', v_path
        )
      );

    insert into _media_backfill_move_paths (
      path
    )
    values (v_path)
    on conflict do nothing;

    if p_dry_run then
      continue;
    end if;

    if r.kind = 'termine_image' then

      update public."Termine"
      set image_storage_path = v_path
      where id = r.id;

      get diagnostics v_row_count = row_count;
      v_termine_image_updated :=
        v_termine_image_updated + v_row_count;

    elsif r.kind = 'termine_gpx' then

      update public."Termine"
      set gpx_storage_path = v_path
      where id = r.id;

      get diagnostics v_row_count = row_count;
      v_termine_gpx_updated :=
        v_termine_gpx_updated + v_row_count;

    elsif r.kind = 'news_image' then

      update public."News"
      set image_storage_path = v_path
      where id = r.id;

      get diagnostics v_row_count = row_count;
      v_news_image_updated :=
        v_news_image_updated + v_row_count;

    end if;

  end loop;

  if p_move_legacy_to_shared then

    for r in

      select distinct src.path
      from (

        select bmp.path
        from _media_backfill_move_paths bmp

        union

        select t.image_storage_path as path
        from public."Termine" t
        where coalesce(t.image_storage_path, '') <> ''

        union

        select t.gpx_storage_path
        from public."Termine" t
        where coalesce(t.gpx_storage_path, '') <> ''

        union

        select n.image_storage_path
        from public."News" n
        where coalesce(n.image_storage_path, '') <> ''

      ) src
      where src.path is not null
        and src.path not like 'shared/%'
        and src.path not like 'protocols/%'
        and src.path not like 'galleries/%'

    loop

      v_target :=
        public.ensure_unique_media_storage_target(
          public.media_storage_shared_target_path(
            r.path
          )
        );

      if v_target is null then
        continue;
      end if;

      if v_target = r.path then
        continue;
      end if;

      v_moves :=
        v_moves
        || jsonb_build_array(
          jsonb_build_object(
            'from', r.path,
            'to', v_target
          )
        );

      if p_dry_run then
        continue;
      end if;

      begin

        v_move_result :=
          public.move_media_object(
            r.path,
            v_target
          );

        v_moves_done :=
          v_moves_done + 1;

      exception
        when others then

          v_errors :=
            v_errors
            || jsonb_build_array(
              jsonb_build_object(
                'from', r.path,
                'to', v_target,
                'error', sqlerrm
              )
            );

      end;

    end loop;

  end if;

  return jsonb_build_object(
    'dry_run', coalesce(p_dry_run, true),
    'move_legacy_to_shared',
      coalesce(p_move_legacy_to_shared, false),
    'updated', jsonb_build_object(
      'termine_image', v_termine_image_updated,
      'termine_gpx', v_termine_gpx_updated,
      'news_image', v_news_image_updated,
      'moves', v_moves_done
    ),
    'items', v_items,
    'moves', v_moves,
    'errors', v_errors
  );

end;
$$;

comment on function public.backfill_media_storage_paths(boolean, boolean) is
  'Medien-Storage Phase 4: *_storage_path aus Legacy-URLs setzen; optional nach shared/ verschieben (Vorstand).';

create or replace function public.list_media_storage_orphans()
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_items jsonb := '[]'::jsonb;
  r record;
  v_refs jsonb;
  v_total integer;
begin

  perform public.assert_media_manage_authenticated();

  for r in

    select o.name as path
    from storage.objects o
    where o.bucket_id = 'media'
      and o.name not like 'protocols/%'
      and o.name not like '%.emptyFolderPlaceholder'

  loop

    v_refs :=
      public.get_media_references(r.path);

    v_total :=
      coalesce(
        (v_refs->'counts'->>'total')::integer,
        0
      );

    if v_total = 0 then

      v_items :=
        v_items
        || jsonb_build_array(
          jsonb_build_object(
            'path', r.path,
            'kind',
              case
                when lower(r.path) like '%.gpx' then
                  'gpx'
                when lower(r.path)
                  ~ '\.(jpe?g|png|gif|webp|avif|svg)$' then
                  'image'
                else
                  'other'
              end
          )
        );

    end if;

  end loop;

  return jsonb_build_object(
    'count', jsonb_array_length(v_items),
    'items', v_items
  );

end;
$$;

comment on function public.list_media_storage_orphans() is
  'Medien-Storage Phase 4: Storage-Dateien ohne DB-Referenz (Vorstand).';

revoke all on function public.extract_media_storage_path_from_url(text) from public;
revoke all on function public.media_storage_shared_target_path(text) from public;
revoke all on function public.ensure_unique_media_storage_target(text) from public;
revoke all on function public.count_media_backfill_candidates() from public;
revoke all on function public.backfill_media_storage_paths(boolean, boolean) from public;
revoke all on function public.list_media_storage_orphans() from public;

grant execute on function public.count_media_backfill_candidates()
  to authenticated;

grant execute on function public.backfill_media_storage_paths(boolean, boolean)
  to authenticated;

grant execute on function public.list_media_storage_orphans()
  to authenticated;
