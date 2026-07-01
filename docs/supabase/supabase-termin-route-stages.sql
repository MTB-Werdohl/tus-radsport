-- Mehrtages-Routen: mehrere Komoot-/GPX-Etappen pro Termin
-- Siehe docs/supabase/RUNBOOK.md (Medien & Protokolle #46)

-- ---------------------------------------------------------------------------
-- termin_route_stages
-- ---------------------------------------------------------------------------

create table if not exists public.termin_route_stages (
  id bigint generated always as identity primary key,
  termin_id bigint not null
    references public."Termine" (id)
    on delete cascade,
  sort_order integer not null,
  komoot text,
  gpx_storage_path text,
  gpx text,
  created_at timestamptz not null default now(),

  constraint termin_route_stages_sort_order_check
    check (sort_order >= 1),

  constraint termin_route_stages_termin_sort_unique
    unique (termin_id, sort_order)
);

create index if not exists termin_route_stages_termin_idx
  on public.termin_route_stages (termin_id, sort_order);

comment on table public.termin_route_stages is
  'Routen-Etappen pro Termin (Tag 1, Tag 2, …) mit je Komoot-Link und GPX.';

comment on column public.termin_route_stages.sort_order is
  '1-basierter Tag-Index (Tag 1, Tag 2, …).';

-- Legacy-Daten → Etappe 1
insert into public.termin_route_stages (
  termin_id,
  sort_order,
  komoot,
  gpx_storage_path,
  gpx
)
select
  t.id,
  1,
  nullif(trim(t.komoot), ''),
  t.gpx_storage_path,
  t.gpx
from public."Termine" t
where (
  t.gpx_storage_path is not null
  or t.gpx is not null
  or nullif(trim(t.komoot), '') is not null
)
and not exists (
  select 1
  from public.termin_route_stages s
  where s.termin_id = t.id
);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.termin_route_stages enable row level security;

drop policy if exists termin_route_stages_select_anon
  on public.termin_route_stages;

create policy termin_route_stages_select_anon
  on public.termin_route_stages
  for select
  to anon
  using (
    exists (
      select 1
      from public."Termine" t
      where t.id = termin_id
        and t.sichtbarkeit = 'public'
    )
  );

drop policy if exists termin_route_stages_select_authenticated
  on public.termin_route_stages;

create policy termin_route_stages_select_authenticated
  on public.termin_route_stages
  for select
  to authenticated
  using (
    exists (
      select 1
      from public."Termine" t
      where t.id = termin_id
        and (
          public.is_vorstand()
          or t.sichtbarkeit = 'public'
          or (
            t.sichtbarkeit = 'members'
            and public.is_member()
          )
          or t.created_by = public.get_auth_member_id()
        )
    )
  );

drop policy if exists termin_route_stages_write_vorstand
  on public.termin_route_stages;

create policy termin_route_stages_write_vorstand
  on public.termin_route_stages
  for all
  to authenticated
  using (public.is_vorstand())
  with check (public.is_vorstand());

drop policy if exists termin_route_stages_insert_member_draft
  on public.termin_route_stages;

create policy termin_route_stages_insert_member_draft
  on public.termin_route_stages
  for insert
  to authenticated
  with check (
    public.is_club_member()
    and exists (
      select 1
      from public."Termine" t
      where t.id = termin_id
        and t.created_by = public.get_auth_member_id()
        and t.sichtbarkeit = 'draft'
    )
  );

drop policy if exists termin_route_stages_update_member_draft
  on public.termin_route_stages;

create policy termin_route_stages_update_member_draft
  on public.termin_route_stages
  for update
  to authenticated
  using (
    public.is_club_member()
    and exists (
      select 1
      from public."Termine" t
      where t.id = termin_id
        and t.created_by = public.get_auth_member_id()
        and t.sichtbarkeit = 'draft'
    )
  )
  with check (
    exists (
      select 1
      from public."Termine" t
      where t.id = termin_id
        and t.created_by = public.get_auth_member_id()
        and t.sichtbarkeit = 'draft'
    )
  );

drop policy if exists termin_route_stages_delete_member_draft
  on public.termin_route_stages;

create policy termin_route_stages_delete_member_draft
  on public.termin_route_stages
  for delete
  to authenticated
  using (
    public.is_club_member()
    and exists (
      select 1
      from public."Termine" t
      where t.id = termin_id
        and t.created_by = public.get_auth_member_id()
        and t.sichtbarkeit = 'draft'
    )
  );

-- ---------------------------------------------------------------------------
-- Mediathek: Referenzen & Pfad-Sync
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
  v_news jsonb := '[]'::jsonb;
  v_news_count integer := 0;
  v_gallery jsonb := '[]'::jsonb;
  v_gallery_count integer := 0;
begin

  perform public.assert_media_manage_authenticated();

  v_path :=
    public.normalize_media_storage_path(
      p_path
    );

  if v_path is null then
    raise exception 'Pfad erforderlich';
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

    union all

    select
      t.id,
      t.title,
      ('GPX Tag ' || s.sort_order::text)::text as kind
    from public.termin_route_stages s
    join public."Termine" t
      on t.id = s.termin_id
    where s.gpx_storage_path = v_path
       or (
         s.gpx is not null
         and s.gpx like '%' || v_path || '%'
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
  v_stage_gpx_path integer := 0;
  v_stage_gpx_url integer := 0;
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

  update public.termin_route_stages
  set gpx_storage_path = v_new
  where gpx_storage_path = v_old;

  get diagnostics v_stage_gpx_path = row_count;

  update public.termin_route_stages
  set gpx = replace(gpx, v_old, v_new)
  where gpx is not null
    and gpx like '%' || v_old || '%';

  get diagnostics v_stage_gpx_url = row_count;

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
      'termin_route_stages_gpx_path', v_stage_gpx_path,
      'termin_route_stages_gpx_url', v_stage_gpx_url,
      'news_path', v_news_path,
      'news_url', v_news_url,
      'gallery', v_gallery
    )
  );

end;
$$;
