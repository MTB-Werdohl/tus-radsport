-- Phase 2: Radfokus — sport_category auf activities + Stats/RPCs
-- Nach supabase-strava.sql und supabase-strava-public.sql ausführen
-- Siehe docs/supabase/RUNBOOK.md

-- ---------------------------------------------------------------------------
-- Hilfsfunktionen
-- ---------------------------------------------------------------------------

create or replace function public.normalize_strava_activity_type(p_type text)
returns text
language sql
immutable
as $$
  select lower(trim(replace(coalesce(p_type, ''), ' ', '')));
$$;

create or replace function public.map_strava_type_to_category(p_type text)
returns text
language sql
immutable
as $$
  select case
    when public.normalize_strava_activity_type(p_type) in (
      'ride',
      'virtualride',
      'ebikeride',
      'gravelride',
      'mountainbikeride',
      'emountainbikeride',
      'handcycle',
      'velomobile'
    ) then 'rad'
    else 'other'
  end;
$$;

comment on function public.map_strava_type_to_category(text) is
  'Leitet Strava activity_type in Vereinskategorie ab: rad | other (erweiterbar).';

-- ---------------------------------------------------------------------------
-- activities.sport_category
-- ---------------------------------------------------------------------------

alter table public.activities
  add column if not exists sport_category text;

update public.activities
set sport_category =
  public.map_strava_type_to_category(activity_type)
where sport_category is null;

alter table public.activities
  alter column sport_category set default 'other';

alter table public.activities
  alter column sport_category set not null;

alter table public.activities
  drop constraint if exists activities_sport_category_check;

alter table public.activities
  add constraint activities_sport_category_check
  check (sport_category in ('rad', 'other'));

create index if not exists activities_sport_category_idx
  on public.activities (sport_category)
  where deleted_at is null;

comment on column public.activities.sport_category is
  'Abgeleitete Vereinskategorie; öffentliche Oberfläche filtert auf rad. activity_type bleibt Strava-Rohwert.';

-- Trigger: Kategorie bei Typ-Änderung nachziehen
create or replace function public.activities_set_sport_category()
returns trigger
language plpgsql
as $$
begin
  new.sport_category :=
    public.map_strava_type_to_category(new.activity_type);
  return new;
end;
$$;

drop trigger if exists activities_sport_category_trg on public.activities;

create trigger activities_sport_category_trg
  before insert or update of activity_type
  on public.activities
  for each row
  execute function public.activities_set_sport_category();

-- ---------------------------------------------------------------------------
-- Stats-Tabellen: sport_category in PK (erweiterbar)
-- ---------------------------------------------------------------------------

delete from public.member_stats_month where true;
delete from public.member_stats_year where true;
delete from public.club_stats_month where true;
delete from public.club_stats_year where true;

alter table public.member_stats_month
  add column if not exists sport_category text not null default 'rad';

alter table public.member_stats_month
  drop constraint if exists member_stats_month_pkey;

alter table public.member_stats_month
  drop constraint if exists member_stats_month_sport_category_check;

alter table public.member_stats_month
  add constraint member_stats_month_sport_category_check
  check (sport_category in ('rad', 'other'));

alter table public.member_stats_month
  add primary key (member_id, year, month, sport_category);

alter table public.member_stats_year
  add column if not exists sport_category text not null default 'rad';

alter table public.member_stats_year
  drop constraint if exists member_stats_year_pkey;

alter table public.member_stats_year
  drop constraint if exists member_stats_year_sport_category_check;

alter table public.member_stats_year
  add constraint member_stats_year_sport_category_check
  check (sport_category in ('rad', 'other'));

alter table public.member_stats_year
  add primary key (member_id, year, sport_category);

alter table public.club_stats_month
  add column if not exists sport_category text not null default 'rad';

alter table public.club_stats_month
  drop constraint if exists club_stats_month_pkey;

alter table public.club_stats_month
  drop constraint if exists club_stats_month_sport_category_check;

alter table public.club_stats_month
  add constraint club_stats_month_sport_category_check
  check (sport_category in ('rad', 'other'));

alter table public.club_stats_month
  add primary key (year, month, sport_category);

alter table public.club_stats_year
  add column if not exists sport_category text not null default 'rad';

alter table public.club_stats_year
  drop constraint if exists club_stats_year_pkey;

alter table public.club_stats_year
  drop constraint if exists club_stats_year_sport_category_check;

alter table public.club_stats_year
  add constraint club_stats_year_sport_category_check
  check (sport_category in ('rad', 'other'));

alter table public.club_stats_year
  add primary key (year, sport_category);

-- ---------------------------------------------------------------------------
-- refresh_club_stats / rebuild_member_stats
-- ---------------------------------------------------------------------------

create or replace function public.refresh_club_stats()
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  delete from public.club_stats_month
  where true;

  delete from public.club_stats_year
  where true;

  insert into public.club_stats_month (
    year,
    month,
    sport_category,
    total_distance_m,
    total_elevation_m,
    activity_count,
    active_member_count
  )
  select
    extract(year from a.start_date)::integer,
    extract(month from a.start_date)::integer,
    a.sport_category,
    coalesce(sum(a.distance_m), 0),
    coalesce(sum(a.elevation_gain_m), 0),
    count(*)::integer,
    count(distinct a.member_id)::integer
  from public.activities a
  join public.members m
    on m.id = a.member_id
  where a.deleted_at is null
    and m.anonymized_at is null
    and m.contribute_to_club_goals is true
  group by 1, 2, 3;

  insert into public.club_stats_year (
    year,
    sport_category,
    total_distance_m,
    total_elevation_m,
    activity_count,
    active_member_count
  )
  select
    extract(year from a.start_date)::integer,
    a.sport_category,
    coalesce(sum(a.distance_m), 0),
    coalesce(sum(a.elevation_gain_m), 0),
    count(*)::integer,
    count(distinct a.member_id)::integer
  from public.activities a
  join public.members m
    on m.id = a.member_id
  where a.deleted_at is null
    and m.anonymized_at is null
    and m.contribute_to_club_goals is true
  group by 1, 2;
end;
$$;

create or replace function public.rebuild_member_stats(p_member_id bigint)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  delete from public.member_stats_month
  where member_id = p_member_id;

  delete from public.member_stats_year
  where member_id = p_member_id;

  insert into public.member_stats_month (
    member_id,
    year,
    month,
    sport_category,
    total_distance_m,
    total_elevation_m,
    activity_count
  )
  select
    p_member_id,
    extract(year from a.start_date)::integer,
    extract(month from a.start_date)::integer,
    a.sport_category,
    coalesce(sum(a.distance_m), 0),
    coalesce(sum(a.elevation_gain_m), 0),
    count(*)::integer
  from public.activities a
  where a.member_id = p_member_id
    and a.deleted_at is null
  group by 2, 3, 4;

  insert into public.member_stats_year (
    member_id,
    year,
    sport_category,
    total_distance_m,
    total_elevation_m,
    activity_count
  )
  select
    p_member_id,
    extract(year from a.start_date)::integer,
    a.sport_category,
    coalesce(sum(a.distance_m), 0),
    coalesce(sum(a.elevation_gain_m), 0),
    count(*)::integer
  from public.activities a
  where a.member_id = p_member_id
    and a.deleted_at is null
  group by 2, 3;
end;
$$;

-- Full rebuild nach Migration
do $$
declare
  v_member record;
begin
  for v_member in
    select distinct member_id
    from public.activities
    where deleted_at is null
  loop
    perform public.rebuild_member_stats(v_member.member_id);
  end loop;

  perform public.refresh_club_stats();
end;
$$;

-- ---------------------------------------------------------------------------
-- Öffentliche RPCs — nur sport_category = rad
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
    and a.sport_category = 'rad'
    and m.anonymized_at is null
    and m.publish_feed is true
    and a.start_date >= (
      now() - (v_days || ' days')::interval
    );

  return v_result;
end;
$$;

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
              and s.sport_category = 'rad'
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
            and s.sport_category = 'rad'
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
      and c.month = p_month
      and c.sport_category = 'rad';

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
  where c.year = p_year
    and c.sport_category = 'rad';

  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profil: nur Radaktivitäten
-- ---------------------------------------------------------------------------

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
  'Öffentlicher Feed: publish_feed, nur Rad (sport_category=rad), Standard 90 Tage.';

comment on function public.get_public_activity_detail is
  'Aktivitätsdetail; nur sichtbare Rad-Einträge im Feed-Zeitfenster.';

comment on function public.get_public_member_rankings is
  'Rad-Ranking nach Distanz; nur publish_rankings, sport_category=rad.';

comment on function public.get_public_club_stats is
  'Vereinsstatistik Rad; nur contribute_to_club_goals in refresh.';

comment on function public.get_member_activities is
  'Profil-Tab: nur importierte Radaktivitäten; in_public_feed nur bei publish_feed.';
