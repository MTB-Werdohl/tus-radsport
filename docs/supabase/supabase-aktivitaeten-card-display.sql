-- Aktivitäten-Karten: Ort + Streckenpolyline für Feed, Profil, Detail
-- Nach supabase-member-avatars.sql / supabase-sport-category-rad.sql
-- Strava-Sync danach neu deployen (start_location beim Import)

alter table public.activities
  add column if not exists start_location text;

comment on column public.activities.start_location is
  'Anzeigeort aus Strava (location_city / location_state).';

create or replace function public.get_public_activity_feed(
  p_days integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_days integer;
begin
  v_days :=
    coalesce(nullif(p_days, 0), 90);

  if v_days < 1 or v_days > 365 then
    v_days := 90;
  end if;

  return coalesce(
    (
      select jsonb_agg(entry order by entry->>'start_date' desc)
      from (
        select jsonb_build_object(
          'id', a.id,
          'member_name',
            trim(
              coalesce(m.vorname, '')
              || ' '
              || coalesce(m.nachname, '')
            ),
          'avatar_url',
            public.build_avatar_public_url(
              m.avatar_storage_path,
              m.avatar_updated_at
            ),
          'activity_name', a.activity_name,
          'activity_type', a.activity_type,
          'distance_m', a.distance_m,
          'moving_time_s', a.moving_time_s,
          'elevation_gain_m', a.elevation_gain_m,
          'start_date', a.start_date,
          'start_location', a.start_location,
          'map_summary_polyline', a.map_summary_polyline
        ) as entry
        from public.activities a
        join public.members m
          on m.id = a.member_id
        where a.deleted_at is null
          and a.sport_category = 'rad'
          and m.anonymized_at is null
          and m.publish_feed is true
          and a.start_date >= (
            now() - (v_days || ' days')::interval
          )
        order by a.start_date desc
        limit 200
      ) rows
    ),
    '[]'::jsonb
  );
end;
$$;

create or replace function public.get_public_activity_detail(
  p_activity_id uuid,
  p_days integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_days integer;
  v_result jsonb;
begin
  if p_activity_id is null then
    return null;
  end if;

  v_days :=
    coalesce(nullif(p_days, 0), 90);

  if v_days < 1 or v_days > 365 then
    v_days := 90;
  end if;

  select jsonb_build_object(
    'id', a.id,
    'member_name',
      trim(
        coalesce(m.vorname, '')
        || ' '
        || coalesce(m.nachname, '')
      ),
    'avatar_url',
      public.build_avatar_public_url(
        m.avatar_storage_path,
        m.avatar_updated_at
      ),
    'activity_name', a.activity_name,
    'activity_type', a.activity_type,
    'distance_m', a.distance_m,
    'moving_time_s', a.moving_time_s,
    'elevation_gain_m', a.elevation_gain_m,
    'start_date', a.start_date,
    'start_location', a.start_location,
    'map_summary_polyline', a.map_summary_polyline
  )
  into v_result
  from public.activities a
  join public.members m
    on m.id = a.member_id
  where a.id = p_activity_id
    and a.deleted_at is null
    and a.sport_category = 'rad'
    and m.anonymized_at is null
    and m.publish_feed is true
    and a.start_date >= (
      now() - (v_days || ' days')::interval
    );

  return v_result;
end;
$$;

create or replace function public.get_member_activities(
  p_limit integer default 100
)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_member_id bigint;
  v_publish_feed boolean;
  v_feed_days integer := 90;
  v_limit integer;
begin
  v_member_id :=
    public.strava_assert_club_member();

  select coalesce(m.publish_feed, false)
  into v_publish_feed
  from public.members m
  where m.id = v_member_id;

  v_limit :=
    coalesce(nullif(p_limit, 0), 100);

  if v_limit < 1 or v_limit > 500 then
    v_limit := 100;
  end if;

  return jsonb_build_object(
    'publish_feed', v_publish_feed,
    'feed_days', v_feed_days,
    'activities',
      coalesce(
        (
          select jsonb_agg(entry order by entry->>'start_date' desc)
          from (
            select jsonb_build_object(
              'id', a.id,
              'activity_name', a.activity_name,
              'activity_type', a.activity_type,
              'distance_m', a.distance_m,
              'moving_time_s', a.moving_time_s,
              'elevation_gain_m', a.elevation_gain_m,
              'start_date', a.start_date,
              'start_location', a.start_location,
              'map_summary_polyline', a.map_summary_polyline,
              'in_public_feed',
                v_publish_feed
                and a.sport_category = 'rad'
                and a.start_date >= (
                  now() - (v_feed_days || ' days')::interval
                )
            ) as entry
            from public.activities a
            where a.member_id = v_member_id
              and a.deleted_at is null
              and a.sport_category = 'rad'
            order by a.start_date desc
            limit v_limit
          ) rows
        ),
        '[]'::jsonb
      )
  );
end;
$$;

comment on function public.get_public_activity_feed is
  'Öffentlicher Feed inkl. Ort und Streckenpolyline für Kartenansicht.';

comment on function public.get_public_activity_detail is
  'Aktivitätsdetail inkl. Ort und Streckenpolyline.';

comment on function public.get_member_activities is
  'Profil-Tab inkl. Ort und Streckenpolyline.';
