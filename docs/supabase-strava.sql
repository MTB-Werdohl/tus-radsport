-- Strava-Aktivitätenportal (Schritt 4 — Basis)
-- Nach supabase-members-anonymize.sql ausführen
-- OAuth/Webhook/Sync folgen in separaten Edge Functions
-- Siehe docs/supabase/RUNBOOK.md

-- ---------------------------------------------------------------------------
-- members — Strava-Opt-ins (client-sichtbar, keine Tokens)
-- ---------------------------------------------------------------------------

alter table public.members
  add column if not exists strava_connected_at timestamptz;

alter table public.members
  add column if not exists strava_sync_enabled boolean not null default false;

alter table public.members
  add column if not exists publish_feed boolean not null default false;

alter table public.members
  add column if not exists publish_rankings boolean not null default false;

alter table public.members
  add column if not exists contribute_to_club_goals boolean not null default false;

comment on column public.members.strava_connected_at is
  'Zeitpunkt der letzten Strava-Verbindung (Anzeige Profil).';

comment on column public.members.publish_feed is
  'Aktivitäten im öffentlichen Feed (90 Tage); unabhängig von Rankings/Zielen.';

comment on column public.members.publish_rankings is
  'Eigene Statistiken in Rankings; unabhängig vom Feed.';

comment on column public.members.contribute_to_club_goals is
  'Eigene Aktivitäten fließen in Vereinsstatistiken ein.';

-- ---------------------------------------------------------------------------
-- strava_connections — Tokens nur serverseitig
-- ---------------------------------------------------------------------------

create table if not exists public.strava_connections (
  member_id bigint primary key
    references public.members (id)
    on delete cascade,
  strava_athlete_id bigint not null,
  access_token text not null,
  refresh_token text not null,
  token_expires_at timestamptz,
  last_sync_at timestamptz,
  sync_status text not null default 'pending',
  sync_error_message text,
  imported_activity_count integer not null default 0,
  initial_sync_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint strava_connections_athlete_unique
    unique (strava_athlete_id)
);

comment on table public.strava_connections is
  'Strava-OAuth-Tokens — kein Client-Zugriff; nur Edge Functions / definer RPCs.';

alter table public.strava_connections enable row level security;

-- Keine Policies: Zugriff nur über service role / security definer

-- ---------------------------------------------------------------------------
-- activities
-- ---------------------------------------------------------------------------

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  strava_activity_id bigint not null,
  member_id bigint not null
    references public.members (id)
    on delete cascade,
  activity_type text not null,
  activity_name text not null default '',
  distance_m numeric not null default 0,
  moving_time_s integer not null default 0,
  elevation_gain_m numeric not null default 0,
  start_date timestamptz not null,
  map_summary_polyline text,
  activity_photo_url text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint activities_strava_id_unique
    unique (strava_activity_id)
);

create index if not exists activities_member_start_idx
  on public.activities (member_id, start_date desc)
  where deleted_at is null;

create index if not exists activities_start_date_idx
  on public.activities (start_date desc)
  where deleted_at is null;

comment on table public.activities is
  'Importierte Strava-Aktivitäten; Strava ist Source of Truth; Soft Delete bei Trennung.';

alter table public.activities enable row level security;

-- Kein direkter Client-Zugriff — Feed/Rankings über RPCs (folgt Schritt 7–10)

-- ---------------------------------------------------------------------------
-- Voraggregierte Statistiken
-- ---------------------------------------------------------------------------

create table if not exists public.member_stats_month (
  member_id bigint not null
    references public.members (id)
    on delete cascade,
  year integer not null,
  month integer not null
    check (month between 1 and 12),
  total_distance_m numeric not null default 0,
  total_elevation_m numeric not null default 0,
  activity_count integer not null default 0,
  primary key (member_id, year, month)
);

create table if not exists public.member_stats_year (
  member_id bigint not null
    references public.members (id)
    on delete cascade,
  year integer not null,
  total_distance_m numeric not null default 0,
  total_elevation_m numeric not null default 0,
  activity_count integer not null default 0,
  primary key (member_id, year)
);

create table if not exists public.club_stats_month (
  year integer not null,
  month integer not null
    check (month between 1 and 12),
  total_distance_m numeric not null default 0,
  total_elevation_m numeric not null default 0,
  activity_count integer not null default 0,
  active_member_count integer not null default 0,
  primary key (year, month)
);

create table if not exists public.club_stats_year (
  year integer not null,
  total_distance_m numeric not null default 0,
  total_elevation_m numeric not null default 0,
  activity_count integer not null default 0,
  active_member_count integer not null default 0,
  primary key (year)
);

alter table public.member_stats_month enable row level security;
alter table public.member_stats_year enable row level security;
alter table public.club_stats_month enable row level security;
alter table public.club_stats_year enable row level security;

-- Öffentlich lesbar (nur aggregierte Werte) — Detail-RPCs folgen
drop policy if exists club_stats_month_public_read on public.club_stats_month;
create policy club_stats_month_public_read
  on public.club_stats_month
  for select
  to anon, authenticated
  using (true);

drop policy if exists club_stats_year_public_read on public.club_stats_year;
create policy club_stats_year_public_read
  on public.club_stats_year
  for select
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Hilfsfunktionen
-- ---------------------------------------------------------------------------

create or replace function public.strava_assert_club_member()
returns bigint
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_member_id bigint;
  v_rolle text;
begin
  if not public.is_member() then
    raise exception 'Nur Vereinsmitglieder können Strava nutzen.';
  end if;

  select id, lower(trim(rolle))
  into v_member_id, v_rolle
  from public.members
  where lower(trim(email)) = lower(trim(auth.jwt()->>'email'))
    and anonymized_at is null
  limit 1;

  if v_member_id is null then
    raise exception 'Mitglied nicht gefunden.';
  end if;

  return v_member_id;
end;
$$;

create or replace function public.refresh_club_stats()
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  delete from public.club_stats_month;
  delete from public.club_stats_year;

  insert into public.club_stats_month (
    year,
    month,
    total_distance_m,
    total_elevation_m,
    activity_count,
    active_member_count
  )
  select
    extract(year from a.start_date)::integer,
    extract(month from a.start_date)::integer,
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

  insert into public.club_stats_year (
    year,
    total_distance_m,
    total_elevation_m,
    activity_count,
    active_member_count
  )
  select
    extract(year from a.start_date)::integer,
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
  group by 1;
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
    total_distance_m,
    total_elevation_m,
    activity_count
  )
  select
    p_member_id,
    extract(year from a.start_date)::integer,
    extract(month from a.start_date)::integer,
    coalesce(sum(a.distance_m), 0),
    coalesce(sum(a.elevation_gain_m), 0),
    count(*)::integer
  from public.activities a
  where a.member_id = p_member_id
    and a.deleted_at is null
  group by 2, 3;

  insert into public.member_stats_year (
    member_id,
    year,
    total_distance_m,
    total_elevation_m,
    activity_count
  )
  select
    p_member_id,
    extract(year from a.start_date)::integer,
    coalesce(sum(a.distance_m), 0),
    coalesce(sum(a.elevation_gain_m), 0),
    count(*)::integer
  from public.activities a
  where a.member_id = p_member_id
    and a.deleted_at is null
  group by 2;
end;
$$;

create or replace function public.strava_disconnect_member(p_member_id bigint)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  delete from public.strava_connections
  where member_id = p_member_id;

  update public.members
  set
    strava_connected_at = null,
    strava_sync_enabled = false,
    publish_feed = false,
    publish_rankings = false,
    contribute_to_club_goals = false
  where id = p_member_id;

  update public.activities
  set
    deleted_at = now(),
    updated_at = now()
  where member_id = p_member_id
    and deleted_at is null;

  delete from public.member_stats_month
  where member_id = p_member_id;

  delete from public.member_stats_year
  where member_id = p_member_id;

  perform public.refresh_club_stats();
end;
$$;

-- ---------------------------------------------------------------------------
-- RPCs — Profil (Schritt 2)
-- ---------------------------------------------------------------------------

create or replace function public.get_strava_profile_status()
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_member_id bigint;
  v_member public.members;
  v_conn public.strava_connections;
  v_connected boolean;
  v_activity_count integer;
begin
  v_member_id :=
    public.strava_assert_club_member();

  select *
  into v_member
  from public.members
  where id = v_member_id;

  select *
  into v_conn
  from public.strava_connections
  where member_id = v_member_id;

  v_connected := v_conn.member_id is not null;

  select count(*)::integer
  into v_activity_count
  from public.activities a
  where a.member_id = v_member_id
    and a.deleted_at is null;

  return jsonb_build_object(
    'connected', v_connected,
    'display_name',
      trim(
        coalesce(v_member.vorname, '')
        || ' '
        || coalesce(v_member.nachname, '')
      ),
    'connected_at', v_member.strava_connected_at,
    'last_sync_at', v_conn.last_sync_at,
    'imported_activity_count',
      coalesce(
        v_conn.imported_activity_count,
        v_activity_count,
        0
      ),
    'sync_status',
      case
        when not v_connected then null
        else coalesce(v_conn.sync_status, 'pending')
      end,
    'sync_error_message', v_conn.sync_error_message,
    'initial_sync_completed',
      v_conn.initial_sync_completed_at is not null,
    'publish_feed', coalesce(v_member.publish_feed, false),
    'publish_rankings', coalesce(v_member.publish_rankings, false),
    'contribute_to_club_goals',
      coalesce(v_member.contribute_to_club_goals, false),
    'strava_sync_enabled',
      coalesce(v_member.strava_sync_enabled, false)
  );
end;
$$;

create or replace function public.update_strava_visibility(
  p_publish_feed boolean,
  p_publish_rankings boolean,
  p_contribute_to_club_goals boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_member_id bigint;
begin
  v_member_id :=
    public.strava_assert_club_member();

  if not exists (
    select 1
    from public.strava_connections
    where member_id = v_member_id
  ) then
    raise exception 'Bitte zuerst Strava verbinden.';
  end if;

  update public.members
  set
    publish_feed = coalesce(p_publish_feed, false),
    publish_rankings = coalesce(p_publish_rankings, false),
    contribute_to_club_goals = coalesce(p_contribute_to_club_goals, false)
  where id = v_member_id;

  return public.get_strava_profile_status();
end;
$$;

create or replace function public.disconnect_strava()
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_member_id bigint;
begin
  v_member_id :=
    public.strava_assert_club_member();

  perform public.strava_disconnect_member(v_member_id);

  return jsonb_build_object(
    'ok', true,
    'connected', false
  );
end;
$$;

create or replace function public.request_strava_sync()
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  raise exception
    'Synchronisation erfolgt automatisch. Bei Fehlern „Synchronisierung erneut versuchen“ im Profil nutzen.';
end;
$$;

revoke all on function public.strava_assert_club_member() from public;
revoke all on function public.refresh_club_stats() from public;
revoke all on function public.rebuild_member_stats(bigint) from public;
revoke all on function public.strava_disconnect_member(bigint) from public;
revoke all on function public.get_strava_profile_status() from public;
revoke all on function public.update_strava_visibility(boolean, boolean, boolean) from public;
revoke all on function public.disconnect_strava() from public;
revoke all on function public.request_strava_sync() from public;

grant execute on function public.get_strava_profile_status() to authenticated;
grant execute on function public.update_strava_visibility(boolean, boolean, boolean) to authenticated;
grant execute on function public.disconnect_strava() to authenticated;
grant execute on function public.request_strava_sync() to authenticated;

comment on function public.update_strava_visibility is
  'Opt-ins Feed/Rankings/Vereinsziele — ändert nur Sichtbarkeit, löscht keine Aktivitäten.';

comment on function public.disconnect_strava is
  'Strava trennen: Tokens entfernen, Opt-ins zurücksetzen, Aktivitäten soft-delete, Stats neu.';
