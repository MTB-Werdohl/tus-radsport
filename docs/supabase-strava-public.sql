-- Strava-Aktivitätsportal — öffentliche Lese-RPCs (Schritt 7–10)
-- Nach docs/supabase-strava.sql (+ sync-status) ausführen
-- Kein direkter Client-Zugriff auf activities / member_stats

-- ---------------------------------------------------------------------------
-- Feed (Schritt 7) — publish_feed, letzte N Tage
-- ---------------------------------------------------------------------------

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
          'activity_name', a.activity_name,
          'activity_type', a.activity_type,
          'distance_m', a.distance_m,
          'moving_time_s', a.moving_time_s,
          'elevation_gain_m', a.elevation_gain_m,
          'start_date', a.start_date
        ) as entry
        from public.activities a
        join public.members m
          on m.id = a.member_id
        where a.deleted_at is null
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

-- ---------------------------------------------------------------------------
-- Detail (Schritt 8) — UUID, gleiche Sichtbarkeitsregeln
-- ---------------------------------------------------------------------------

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
    'activity_name', a.activity_name,
    'activity_type', a.activity_type,
    'distance_m', a.distance_m,
    'moving_time_s', a.moving_time_s,
    'elevation_gain_m', a.elevation_gain_m,
    'start_date', a.start_date
  )
  into v_result
  from public.activities a
  join public.members m
    on m.id = a.member_id
  where a.id = p_activity_id
    and a.deleted_at is null
    and m.anonymized_at is null
    and m.publish_feed is true
    and a.start_date >= (
      now() - (v_days || ' days')::interval
    );

  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Rankings (Schritt 9) — publish_rankings, voraggregiert
-- p_month null → Jahreswertung
-- ---------------------------------------------------------------------------

create or replace function public.get_public_member_rankings(
  p_year integer,
  p_month integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  if p_year is null or p_year < 2000 or p_year > 2100 then
    return '[]'::jsonb;
  end if;

  if p_month is not null then

    if p_month < 1 or p_month > 12 then
      return '[]'::jsonb;
    end if;

    return coalesce(
      (
        select jsonb_agg(entry order by (entry->>'rank')::integer)
        from (
          select jsonb_build_object(
            'rank', ranked.rn,
            'member_name', ranked.member_name,
            'total_distance_m', ranked.total_distance_m,
            'total_elevation_m', ranked.total_elevation_m,
            'activity_count', ranked.activity_count
          ) as entry
          from (
            select
              row_number() over (
                order by
                  s.total_distance_m desc,
                  s.activity_count desc,
                  s.member_id
              ) as rn,
              trim(
                coalesce(m.vorname, '')
                || ' '
                || coalesce(m.nachname, '')
              ) as member_name,
              s.total_distance_m,
              s.total_elevation_m,
              s.activity_count
            from public.member_stats_month s
            join public.members m
              on m.id = s.member_id
            where s.year = p_year
              and s.month = p_month
              and m.anonymized_at is null
              and m.publish_rankings is true
              and s.activity_count > 0
          ) ranked
        ) rows
      ),
      '[]'::jsonb
    );

  end if;

  return coalesce(
    (
      select jsonb_agg(entry order by (entry->>'rank')::integer)
      from (
        select jsonb_build_object(
          'rank', ranked.rn,
          'member_name', ranked.member_name,
          'total_distance_m', ranked.total_distance_m,
          'total_elevation_m', ranked.total_elevation_m,
          'activity_count', ranked.activity_count
        ) as entry
        from (
          select
            row_number() over (
              order by
                s.total_distance_m desc,
                s.activity_count desc,
                s.member_id
            ) as rn,
            trim(
              coalesce(m.vorname, '')
              || ' '
              || coalesce(m.nachname, '')
            ) as member_name,
            s.total_distance_m,
            s.total_elevation_m,
            s.activity_count
          from public.member_stats_year s
          join public.members m
            on m.id = s.member_id
          where s.year = p_year
            and m.anonymized_at is null
            and m.publish_rankings is true
            and s.activity_count > 0
        ) ranked
      ) rows
    ),
    '[]'::jsonb
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Vereinsziele (Schritt 10) — club_stats (nur contribute_to_club_goals in refresh)
-- p_month null → Jahreswert
-- ---------------------------------------------------------------------------

create or replace function public.get_public_club_stats(
  p_year integer,
  p_month integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_result jsonb;
begin
  if p_year is null or p_year < 2000 or p_year > 2100 then
    return null;
  end if;

  if p_month is not null then

    if p_month < 1 or p_month > 12 then
      return null;
    end if;

    select jsonb_build_object(
      'year', c.year,
      'month', c.month,
      'total_distance_m', c.total_distance_m,
      'total_elevation_m', c.total_elevation_m,
      'activity_count', c.activity_count,
      'active_member_count', c.active_member_count
    )
    into v_result
    from public.club_stats_month c
    where c.year = p_year
      and c.month = p_month;

    return v_result;

  end if;

  select jsonb_build_object(
    'year', c.year,
    'total_distance_m', c.total_distance_m,
    'total_elevation_m', c.total_elevation_m,
    'activity_count', c.activity_count,
    'active_member_count', c.active_member_count
  )
  into v_result
  from public.club_stats_year c
  where c.year = p_year;

  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Rechte
-- ---------------------------------------------------------------------------

revoke all on function public.get_public_activity_feed(integer) from public;
revoke all on function public.get_public_activity_detail(uuid, integer) from public;
revoke all on function public.get_public_member_rankings(integer, integer) from public;
revoke all on function public.get_public_club_stats(integer, integer) from public;

grant execute on function public.get_public_activity_feed(integer)
  to anon, authenticated;

grant execute on function public.get_public_activity_detail(uuid, integer)
  to anon, authenticated;

grant execute on function public.get_public_member_rankings(integer, integer)
  to anon, authenticated;

grant execute on function public.get_public_club_stats(integer, integer)
  to anon, authenticated;

comment on function public.get_public_activity_feed is
  'Öffentlicher Feed: publish_feed, soft-delete-frei, Standard 90 Tage.';

comment on function public.get_public_activity_detail is
  'Aktivitätsdetail per UUID; nur sichtbare Feed-Einträge.';

comment on function public.get_public_member_rankings is
  'Rankings nach Distanz; nur publish_rankings.';

comment on function public.get_public_club_stats is
  'Vereinsstatistik (Monat oder Jahr); nur Mitglieder mit contribute_to_club_goals.';
