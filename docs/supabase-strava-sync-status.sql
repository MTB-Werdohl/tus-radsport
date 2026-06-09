-- Strava Sync-Status (wartungsfreier Betrieb)
-- Nach docs/supabase-strava.sql ausführen
-- Siehe docs/supabase-strava-sync-setup.md

alter table public.strava_connections
  add column if not exists sync_status text not null default 'pending';

alter table public.strava_connections
  add column if not exists sync_error_message text;

alter table public.strava_connections
  add column if not exists imported_activity_count integer not null default 0;

alter table public.strava_connections
  add column if not exists initial_sync_completed_at timestamptz;

comment on column public.strava_connections.sync_status is
  'pending | syncing | active | error — Anzeige Profil + Retry-Button';

-- ---------------------------------------------------------------------------
-- get_strava_profile_status — erweitert
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

revoke all on function public.get_strava_profile_status() from public;
grant execute on function public.get_strava_profile_status() to authenticated;
