-- Drop News, Aktivitäten/Strava, Avatars
-- Idempotent — sicher mehrfach ausführbar wo möglich.
-- Nach Anwendung: Edge Functions strava-* manuell im Dashboard entfernen.

-- ---------------------------------------------------------------------------
-- Feedback: News-Module entfernen, Constraint auf event only
-- ---------------------------------------------------------------------------

delete from public.feedback_modules
where entity_type = 'news';

alter table public.feedback_modules
  drop constraint if exists feedback_modules_entity_type_check;

alter table public.feedback_modules
  add constraint feedback_modules_entity_type_check
  check (entity_type in ('event'));

comment on column public.feedback_modules.entity_type is
  'Logische Entität: event → Termine.id (kein DB-FK).';

-- ---------------------------------------------------------------------------
-- News: Trigger, Policies, Tabelle (nur wenn Tabelle noch existiert)
-- ---------------------------------------------------------------------------

do $$
begin

  if to_regclass('public."News"') is null then
    return;
  end if;

  execute 'drop trigger if exists news_delete_feedback_modules on public."News"';
  execute 'drop trigger if exists news_set_created_by on public."News"';

  execute 'drop policy if exists "Public News lesen" on public."News"';
  execute 'drop policy if exists news_select_authenticated on public."News"';
  execute 'drop policy if exists news_select_anon on public."News"';
  execute 'drop policy if exists news_insert_vorstand on public."News"';
  execute 'drop policy if exists news_update_vorstand on public."News"';
  execute 'drop policy if exists news_delete_vorstand on public."News"';
  execute 'drop policy if exists news_insert_member_draft on public."News"';
  execute 'drop policy if exists news_update_member_draft on public."News"';
  execute 'drop policy if exists news_delete_member_draft on public."News"';
  execute 'drop policy if exists "Authenticated full access News" on public."News"';

  execute 'drop table public."News" cascade';

end $$;

drop function if exists public.delete_feedback_modules_for_news();

-- ---------------------------------------------------------------------------
-- resolve_content_slug — nur Termine
-- ---------------------------------------------------------------------------

create or replace function public.resolve_content_slug(
  p_kind text,
  p_slug text
)
returns json
language plpgsql
stable
security definer
set search_path = public
set row_security = off
as $$
declare
  v_visibility text;
begin

  if p_slug is null or trim(p_slug) = '' then
    return json_build_object('found', false);
  end if;

  if p_kind = 'event' then

    select sichtbarkeit
    into v_visibility
    from public."Termine"
    where slug = p_slug
    limit 1;

  else

    return json_build_object('found', false);

  end if;

  if v_visibility is null then
    return json_build_object('found', false);
  end if;

  return json_build_object(
    'found', true,
    'sichtbarkeit', v_visibility
  );

end;
$$;

-- ---------------------------------------------------------------------------
-- get_media_references — ohne News
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

-- ---------------------------------------------------------------------------
-- Aktivitäten / Strava Tabellen
-- ---------------------------------------------------------------------------

do $$
begin

  if to_regclass('public.activities') is not null then
    execute 'drop trigger if exists activities_sport_category_trg on public.activities';
  end if;

end $$;

drop table if exists public.activity_streams cascade;
drop table if exists public.activities cascade;
drop table if exists public.strava_connections cascade;
drop table if exists public.member_stats_month cascade;
drop table if exists public.member_stats_year cascade;
drop table if exists public.club_stats_month cascade;
drop table if exists public.club_stats_year cascade;

-- ---------------------------------------------------------------------------
-- members — Strava-, Avatar-, Publish-Spalten
-- ---------------------------------------------------------------------------

alter table public.members
  drop column if exists strava_connected_at,
  drop column if exists strava_sync_enabled,
  drop column if exists publish_feed,
  drop column if exists publish_rankings,
  drop column if exists contribute_to_club_goals,
  drop column if exists avatar_storage_path,
  drop column if exists avatar_updated_at,
  drop column if exists avatar_source,
  drop column if exists avatar_consent_at;

-- ---------------------------------------------------------------------------
-- Storage avatars — Policies
-- ---------------------------------------------------------------------------

drop policy if exists avatars_select_public on storage.objects;
drop policy if exists avatars_insert_own on storage.objects;
drop policy if exists avatars_update_own on storage.objects;
drop policy if exists avatars_delete_own on storage.objects;
drop policy if exists avatars_insert_vorstand on storage.objects;
drop policy if exists avatars_update_vorstand on storage.objects;
drop policy if exists avatars_delete_vorstand on storage.objects;

-- ---------------------------------------------------------------------------
-- Funktionen entfernen
-- ---------------------------------------------------------------------------

drop function if exists public.get_strava_profile_status();
drop function if exists public.update_strava_visibility(boolean, boolean, boolean);
drop function if exists public.disconnect_strava();
drop function if exists public.request_strava_sync();
drop function if exists public.get_member_activities(integer);
drop function if exists public.get_public_activity_feed(integer);
drop function if exists public.get_public_activity_detail(uuid, integer);
drop function if exists public.get_public_activity_detail(uuid);
drop function if exists public.get_public_activity_streams(uuid);
drop function if exists public.get_public_member_rankings(integer, integer);
drop function if exists public.get_public_club_stats(integer, integer);
drop function if exists public.build_avatar_public_url(text, timestamptz);
drop function if exists public.get_member_profile_avatar();
drop function if exists public.get_own_member_id();
drop function if exists public.strava_assert_club_member();
drop function if exists public.refresh_club_stats();
drop function if exists public.rebuild_member_stats(bigint);
drop function if exists public.strava_disconnect_member(bigint);
drop function if exists public.activities_set_sport_category();
drop function if exists public.map_strava_type_to_category(text);
drop function if exists public.normalize_strava_type(text);

-- ---------------------------------------------------------------------------
-- get_member_change_summary — nur Termine + Abstimmungen
-- ---------------------------------------------------------------------------

create or replace function public.get_member_change_summary()
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_member public.members%rowtype;
  v_since timestamptz;
  v_termine integer := 0;
  v_abstimmungen integer := 0;
begin

  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_club_member() then

    return jsonb_build_object(
      'termine', 0,
      'abstimmungen', 0,
      'since', null
    );

  end if;

  select *
  into v_member
  from public.members m
  where lower(trim(m.email)) = lower(trim(auth.jwt() ->> 'email'))
    and m.anonymized_at is null
  limit 1;

  if not found then

    return jsonb_build_object(
      'termine', 0,
      'abstimmungen', 0,
      'since', null
    );

  end if;

  v_since := coalesce(
    v_member.last_change_summary_seen_at,
    v_member.last_login_at
  );

  if v_since is null then

    return jsonb_build_object(
      'termine', 0,
      'abstimmungen', 0,
      'since', null
    );

  end if;

  select count(*)::integer
  into v_termine
  from public."Termine" t
  where t.created_at > v_since
    and (
      public.is_vorstand()
      or coalesce(t.sichtbarkeit, 'public') <> 'draft'
    )
    and public.member_can_view_sichtbarkeit(t.sichtbarkeit);

  select count(*)::integer
  into v_abstimmungen
  from public.feedback_modules fm
  where fm.enabled = true
    and fm.created_at > v_since
    and fm.entity_type = 'event'
    and not exists (
      select 1
      from public.feedback_answers fa
      where fa.module_id = fm.id
        and fa.member_id = v_member.id
    )
    and exists (
      select 1
      from public."Termine" t
      where t.id = fm.entity_id
        and public.member_can_view_sichtbarkeit(t.sichtbarkeit)
    );

  return jsonb_build_object(
    'termine', v_termine,
    'abstimmungen', v_abstimmungen,
    'since', v_since
  );

end;
$$;

comment on function public.get_member_change_summary() is
  'Zähler neuer Termine und Abstimmungen seit last_change_summary_seen_at bzw. last_login_at — nur Mitglied/Vorstand.';

revoke all on function public.get_member_change_summary() from public;
grant execute on function public.get_member_change_summary()
  to authenticated;
