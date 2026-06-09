-- Fix: „DELETE requires a WHERE clause“ bei Strava-Sync
-- Supabase erlaubt kein DELETE ohne WHERE — trifft refresh_club_stats() nach jedem Import.
-- Im SQL Editor ausführen, danach im Profil „Synchronisierung erneut versuchen“.

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

revoke all on function public.refresh_club_stats() from public;
