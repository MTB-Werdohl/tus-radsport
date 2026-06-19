-- Phase A.1: DetailedActivity-Felder für alle importierten Aktivitäten
-- Nach docs/supabase-aktivitaeten-card-display.sql
-- Strava-Sync: jede Aktivität via GET /activities/{id}; Sichtbarkeit über RPCs

alter table public.activities
  add column if not exists elapsed_time_s integer;

alter table public.activities
  add column if not exists average_speed_mps numeric;

alter table public.activities
  add column if not exists max_speed_mps numeric;

alter table public.activities
  add column if not exists elev_high_m numeric;

alter table public.activities
  add column if not exists elev_low_m numeric;

alter table public.activities
  add column if not exists start_lat double precision;

alter table public.activities
  add column if not exists start_lng double precision;

alter table public.activities
  add column if not exists end_lat double precision;

alter table public.activities
  add column if not exists end_lng double precision;

alter table public.activities
  add column if not exists map_polyline text;

alter table public.activities
  add column if not exists splits_metric jsonb;

comment on column public.activities.elapsed_time_s is
  'Strava elapsed_time (Sekunden). DetailedActivity bei jedem Sync.';

comment on column public.activities.average_speed_mps is
  'Strava average_speed in m/s. DetailedActivity bei jedem Sync.';

comment on column public.activities.max_speed_mps is
  'Strava max_speed in m/s. DetailedActivity bei jedem Sync.';

comment on column public.activities.elev_high_m is
  'Strava elev_high in Metern. DetailedActivity bei jedem Sync.';

comment on column public.activities.elev_low_m is
  'Strava elev_low in Metern. DetailedActivity bei jedem Sync.';

comment on column public.activities.start_lat is
  'Start latitude aus Strava start_latlng. DetailedActivity bei jedem Sync.';

comment on column public.activities.start_lng is
  'Start longitude aus Strava start_latlng. DetailedActivity bei jedem Sync.';

comment on column public.activities.end_lat is
  'End latitude aus Strava end_latlng. DetailedActivity bei jedem Sync.';

comment on column public.activities.end_lng is
  'End longitude aus Strava end_latlng. DetailedActivity bei jedem Sync.';

comment on column public.activities.map_polyline is
  'Volle Strecken-Polyline (map.polyline). DetailedActivity bei jedem Sync.';

comment on column public.activities.splits_metric is
  'Strava splits_metric (JSON). DetailedActivity bei jedem Sync.';

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
    'map_summary_polyline', a.map_summary_polyline,
    'activity_photo_url', a.activity_photo_url,
    'elapsed_time_s', a.elapsed_time_s,
    'average_speed_mps', a.average_speed_mps,
    'max_speed_mps', a.max_speed_mps,
    'elev_high_m', a.elev_high_m,
    'elev_low_m', a.elev_low_m,
    'start_lat', a.start_lat,
    'start_lng', a.start_lng,
    'end_lat', a.end_lat,
    'end_lng', a.end_lng,
    'map_polyline', a.map_polyline,
    'splits_metric', a.splits_metric
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

comment on function public.get_public_activity_detail is
  'Aktivitätsdetail inkl. DetailedActivity-Felder (Phase A.1); öffentlich nur publish_feed + Rad.';
