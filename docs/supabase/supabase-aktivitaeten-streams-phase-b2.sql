-- Phase B.2: Activity-Streams (Strava distance, altitude, velocity_smooth, latlng, time)
-- Nach docs/supabase-aktivitaeten-detail-phase-a1.sql
-- Sync: strava-sync (rad only, non-blocking); Sichtbarkeit nur über RPC

-- ---------------------------------------------------------------------------
-- activity_streams (1:1 zu activities.id)
-- ---------------------------------------------------------------------------

create table if not exists public.activity_streams (
  activity_id uuid primary key
    references public.activities (id)
    on delete cascade,
  schema_version integer not null default 1,
  original_point_count integer not null,
  point_count integer not null,
  streams jsonb not null,
  synced_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint activity_streams_point_count_positive
    check (point_count > 0),
  constraint activity_streams_original_gte_point
    check (original_point_count >= point_count)
);

comment on table public.activity_streams is
  'Strava-Activity-Streams (downsampled, index-synchron); 1:1 zu activities.id.';

comment on column public.activity_streams.schema_version is
  'Format-Version der streams-JSONB-Payload (Spalte, nicht im JSON).';

comment on column public.activity_streams.original_point_count is
  'Punktanzahl der Strava-Referenzserie vor Downsampling.';

comment on column public.activity_streams.point_count is
  'Gespeicherte Punkte nach Downsampling (Obergrenze im Sync-Code).';

comment on column public.activity_streams.streams is
  'JSONB: distance, altitude, velocity_smooth, latlng, time (parallele Arrays).';

alter table public.activity_streams enable row level security;

-- Keine Client-Policies: Zugriff nur service role / security definer RPC

-- ---------------------------------------------------------------------------
-- RPC: get_public_activity_streams
-- ---------------------------------------------------------------------------

create or replace function public.get_public_activity_streams(
  p_activity_id uuid
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

  if p_activity_id is null then
    return null;
  end if;

  select jsonb_build_object(
    'activity_id', a.id,
    'schema_version', s.schema_version,
    'original_point_count', s.original_point_count,
    'point_count', s.point_count,
    'streams', s.streams
  )
  into v_result
  from public.activities a
  join public.members m
    on m.id = a.member_id
  join public.activity_streams s
    on s.activity_id = a.id
  where a.id = p_activity_id
    and a.deleted_at is null
    and a.sport_category = 'rad'
    and m.anonymized_at is null
    and m.publish_feed is true
    and a.start_date >= (
      now() - interval '90 days'
    );

  return v_result;

end;
$$;

comment on function public.get_public_activity_streams(uuid) is
  'Öffentliche Activity-Streams; gleiche Sichtbarkeit wie get_public_activity_detail (90 Tage, publish_feed, rad).';

-- ---------------------------------------------------------------------------
-- Rechte
-- ---------------------------------------------------------------------------

revoke all on function public.get_public_activity_streams(uuid) from public;

grant execute on function public.get_public_activity_streams(uuid)
  to anon, authenticated;
