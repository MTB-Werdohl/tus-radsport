-- Profil: „Meine Aktivitäten“ — eigene importierte Touren (authenticated)
-- Nach docs/supabase-strava.sql ausführen
-- Siehe docs/supabase/RUNBOOK.md

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
                and a.start_date >= (
                  now() - (v_feed_days || ' days')::interval
                )
            ) as entry
            from public.activities a
            where a.member_id = v_member_id
              and a.deleted_at is null
            order by a.start_date desc
            limit v_limit
          ) rows
        ),
        '[]'::jsonb
      )
  );
end;
$$;

revoke all on function public.get_member_activities(integer) from public;

grant execute on function public.get_member_activities(integer)
  to authenticated;

comment on function public.get_member_activities is
  'Eigene importierte Aktivitäten für Profil-Tab; in_public_feed = publish_feed und innerhalb feed_days.';
