-- Veränderungs-Zusammenfassung für Vereinsmitglieder / Vorstand
-- Nach supabase-content-visibility.sql, supabase-strava.sql, supabase-feedback.sql
-- Siehe docs/supabase/RUNBOOK.md

-- ---------------------------------------------------------------------------
-- members.last_change_summary_seen_at
-- ---------------------------------------------------------------------------

alter table public.members
  add column if not exists last_change_summary_seen_at timestamptz;

comment on column public.members.last_change_summary_seen_at is
  'Zeitpunkt, zu dem die persönliche Veränderungs-Zusammenfassung zuletzt geschlossen wurde.';

-- ---------------------------------------------------------------------------
-- Termine: Erstellungszeitpunkt (für „neue Termine“)
-- ---------------------------------------------------------------------------

alter table public."Termine"
  add column if not exists created_at timestamptz;

alter table public."Termine"
  add column if not exists updated_at timestamptz;

update public."Termine"
set
  created_at = coalesce(
    created_at,
    '2020-01-01 00:00:00+00'::timestamptz
  ),
  updated_at = coalesce(
    updated_at,
    created_at
  )
where
  created_at is null
  or updated_at is null;

alter table public."Termine"
  alter column created_at set default now();

alter table public."Termine"
  alter column updated_at set default now();

-- ---------------------------------------------------------------------------
-- Hilfsfunktion: Vereinsmitglied / Vorstand (ohne Rolle public)
-- ---------------------------------------------------------------------------

create or replace function public.is_club_member()
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.members m
    where lower(trim(m.email)) = lower(trim(auth.jwt() ->> 'email'))
      and m.anonymized_at is null
      and lower(trim(coalesce(m.rolle, 'mitglied')))
        in ('mitglied', 'vorstand')
  );
$$;

comment on function public.is_club_member() is
  'Eingeloggtes Vereinsmitglied oder Vorstand — ohne externe Rolle public.';

revoke all on function public.is_club_member() from public;

grant execute on function public.is_club_member()
  to authenticated;

-- ---------------------------------------------------------------------------
-- Hilfsfunktion: Sichtbarkeit wie News/Termine-SELECT
-- ---------------------------------------------------------------------------

create or replace function public.member_can_view_sichtbarkeit(
  p_sichtbarkeit text
)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select case trim(coalesce(p_sichtbarkeit, ''))
    when 'draft' then public.is_vorstand()
    when 'public' then true
    when 'members' then public.is_club_member()
    when '' then public.is_vorstand()
    else public.is_vorstand()
  end;
$$;

comment on function public.member_can_view_sichtbarkeit(text) is
  'Prüft Leserechte für News/Termine analog zu RLS — Entwürfe nur für Vorstand.';

revoke all on function public.member_can_view_sichtbarkeit(text) from public;

grant execute on function public.member_can_view_sichtbarkeit(text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: Zähler seit last_change_summary_seen_at
-- ---------------------------------------------------------------------------

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

  if v_member.last_change_summary_seen_at is null then

    return jsonb_build_object(
      'activities_own', 0,
      'activities_feed', 0,
      'termine', 0,
      'news', 0,
      'abstimmungen', 0,
      'since', null
    );

  end if;

  v_since :=
    v_member.last_change_summary_seen_at;

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
  'Zähler neuer sichtbarer Inhalte seit last_change_summary_seen_at — nur Mitglied/Vorstand.';

revoke all on function public.get_member_change_summary() from public;

grant execute on function public.get_member_change_summary()
  to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: Zusammenfassung als gesehen markieren
-- ---------------------------------------------------------------------------

create or replace function public.touch_member_change_summary_seen()
returns timestamptz
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_seen_at timestamptz := now();
begin

  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_club_member() then
    return null;
  end if;

  update public.members
  set last_change_summary_seen_at = v_seen_at
  where lower(trim(email)) = lower(trim(auth.jwt() ->> 'email'))
    and anonymized_at is null;

  return v_seen_at;

end;
$$;

comment on function public.touch_member_change_summary_seen() is
  'Setzt last_change_summary_seen_at auf jetzt (Erstbesuch oder Popup geschlossen).';

revoke all on function public.touch_member_change_summary_seen() from public;

grant execute on function public.touch_member_change_summary_seen()
  to authenticated;
