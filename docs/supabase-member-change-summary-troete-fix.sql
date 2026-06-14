-- Tröte: Zähler seit letztem Besuch / Login (Patch)
-- Einmal im Supabase SQL Editor ausführen, wenn die Tröte leer bleibt.
-- Voraussetzung: supabase-member-change-summary.sql, supabase-members-last-login.sql
--
-- Falls die Tröte nach dem Umstieg einmal leer blieb (Erstbesuch-Bug im Frontend),
-- optional für deinen Account zurücksetzen:
--   update public.members
--   set last_change_summary_seen_at = null
--   where lower(trim(email)) = lower(trim('deine@email.de'));

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
  v_feed_days integer := 90;
  v_own integer := 0;
  v_feed integer := 0;
  v_termine integer := 0;
  v_news integer := 0;
  v_abstimmungen integer := 0;
begin

  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_club_member() then

    return jsonb_build_object(
      'activities_own', 0,
      'activities_feed', 0,
      'termine', 0,
      'news', 0,
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
      'activities_own', 0,
      'activities_feed', 0,
      'termine', 0,
      'news', 0,
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
      'activities_own', 0,
      'activities_feed', 0,
      'termine', 0,
      'news', 0,
      'abstimmungen', 0,
      'since', null
    );

  end if;

  select count(*)::integer
  into v_own
  from public.activities a
  where a.member_id = v_member.id
    and a.deleted_at is null
    and coalesce(a.sport_category, 'rad') = 'rad'
    and a.created_at > v_since;

  select count(*)::integer
  into v_feed
  from public.activities a
  join public.members m
    on m.id = a.member_id
  where a.deleted_at is null
    and coalesce(a.sport_category, 'rad') = 'rad'
    and m.anonymized_at is null
    and m.publish_feed is true
    and a.start_date >= (
      now() - (v_feed_days || ' days')::interval
    )
    and a.created_at > v_since;

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
  into v_news
  from public."News" n
  where n.created_at > v_since
    and (
      public.is_vorstand()
      or coalesce(n.sichtbarkeit, 'draft') <> 'draft'
    )
    and (
      public.is_vorstand()
      or coalesce(n.published, true) = true
    )
    and public.member_can_view_sichtbarkeit(n.sichtbarkeit);

  select count(*)::integer
  into v_abstimmungen
  from public.feedback_modules fm
  where fm.enabled = true
    and fm.created_at > v_since
    and not exists (
      select 1
      from public.feedback_answers fa
      where fa.module_id = fm.id
        and fa.member_id = v_member.id
    )
    and (
      (
        fm.entity_type = 'event'
        and exists (
          select 1
          from public."Termine" t
          where t.id = fm.entity_id
            and public.member_can_view_sichtbarkeit(t.sichtbarkeit)
        )
      )
      or (
        fm.entity_type = 'news'
        and exists (
          select 1
          from public."News" n
          where n.id = fm.entity_id
            and public.member_can_view_sichtbarkeit(n.sichtbarkeit)
        )
      )
    );

  return jsonb_build_object(
    'activities_own', v_own,
    'activities_feed', v_feed,
    'termine', v_termine,
    'news', v_news,
    'abstimmungen', v_abstimmungen,
    'since', v_since
  );

end;
$$;

comment on function public.get_member_change_summary() is
  'Zähler neuer sichtbarer Inhalte seit last_change_summary_seen_at bzw. last_login_at — nur Mitglied/Vorstand.';

grant execute on function public.get_member_change_summary()
  to authenticated;
