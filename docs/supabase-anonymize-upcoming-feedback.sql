-- Profil-Löschung: zukünftige Zusagen entfernen, leere Accounts hart löschen
--
-- Logik:
-- 1. Zusagen für zukünftige Termine löschen
-- 2. Bleibt kein Feedback/Historie übrig → members-Zeile komplett löschen
-- 3. Sonst (vergangene Teilnahme) → anonymisieren wie bisher
--
-- Nach Phase-4a-Basis ausführen.

-- ---------------------------------------------------------------------------
-- Hilfsfunktion: Termin noch nicht vorbei (Europe/Berlin, Kalendertag)
-- ---------------------------------------------------------------------------

create or replace function public.is_termin_still_upcoming(
  p_termin public."Termine"
)
returns boolean
language plpgsql
stable
set search_path = public
as $$
declare
  v_today date;
  v_end date;
begin
  v_today :=
    (timezone('Europe/Berlin', now()))::date;

  if coalesce(p_termin.recurring, false) is true then

    if p_termin."endRecur" is not null
      and p_termin."endRecur"::date < v_today then
      return false;
    end if;

    return true;

  end if;

  if p_termin.date is null then
    return false;
  end if;

  if p_termin."endDate" is not null then
    v_end := p_termin."endDate"::date;
  else
    v_end := p_termin.date::date;
  end if;

  return v_end >= v_today;

end;
$$;

comment on function public.is_termin_still_upcoming(public."Termine") is
  'true solange der Termin (Einzel: Endtag, Serie: endRecur) nicht vorbei ist.';

-- ---------------------------------------------------------------------------
-- Entfernt nicht mehr benötigte Admin-RPC (falls deployt)
-- ---------------------------------------------------------------------------

drop function if exists public.admin_remove_anonymized_feedback_participant(
  bigint, bigint
);

-- ---------------------------------------------------------------------------
-- anonymize_member
-- ---------------------------------------------------------------------------

create or replace function public.anonymize_member(
  p_member_id bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_email text;
  v_member_id bigint;
  v_auth_email text;
  v_rolle text;
  v_anonymized_at timestamptz;
  v_avatar_path text;
  v_removed_upcoming integer;
  v_has_answers boolean;
  v_has_events boolean;
begin
  v_caller_email :=
    lower(trim(coalesce(auth.jwt()->>'email', '')));

  if v_caller_email = '' then
    raise exception 'Nicht angemeldet.';
  end if;

  if p_member_id is not null then

    if not public.is_vorstand() then
      raise exception 'Keine Berechtigung.';
    end if;

    v_member_id := p_member_id;

  else

    select id
    into v_member_id
    from public.members
    where lower(trim(email)) = v_caller_email
      and anonymized_at is null
    limit 1;

  end if;

  if v_member_id is null then
    raise exception 'Mitglied nicht gefunden.';
  end if;

  select
    lower(trim(coalesce(email, ''))),
    lower(trim(coalesce(rolle, ''))),
    anonymized_at,
    avatar_storage_path
  into
    v_auth_email,
    v_rolle,
    v_anonymized_at,
    v_avatar_path
  from public.members
  where id = v_member_id;

  if v_anonymized_at is not null then
    return jsonb_build_object(
      'ok', true,
      'member_id', v_member_id,
      'already_anonymized', true,
      'deleted', false,
      'auth_email', null
    );
  end if;

  if p_member_id is null then

    if v_rolle <> 'public' then
      raise exception
        'Nur externe Teilnehmer können ihr Konto selbst löschen.';
    end if;

  end if;

  if to_regclass('public."PushSubscriptions"') is not null then
    delete from public."PushSubscriptions"
    where member_id = v_member_id;
  end if;

  if v_avatar_path is not null then
    delete from storage.objects
    where bucket_id = 'avatars'
      and name = v_avatar_path;
  end if;

  with removed as (
    delete from public.feedback_answers fa
    using public.feedback_modules fm
    join public."Termine" t
      on t.id = fm.entity_id
    where fa.member_id = v_member_id
      and fa.module_id = fm.id
      and fm.entity_type = 'event'
      and public.is_termin_still_upcoming(t)
    returning fa.id
  )
  select count(*)
  into v_removed_upcoming
  from removed;

  select exists (
    select 1
    from public.feedback_answers fa
    where fa.member_id = v_member_id
  )
  into v_has_answers;

  select exists (
    select 1
    from public.feedback_answer_events e
    where e.member_id = v_member_id
  )
  into v_has_events;

  if not v_has_answers
    and not v_has_events then

    delete from public.members
    where id = v_member_id;

    return jsonb_build_object(
      'ok', true,
      'member_id', v_member_id,
      'deleted', true,
      'already_anonymized', false,
      'removed_upcoming_feedback',
        coalesce(v_removed_upcoming, 0),
      'auth_email',
        nullif(v_auth_email, '')
    );

  end if;

  update public.feedback_answers
  set comment = null
  where member_id = v_member_id;

  update public.feedback_answer_events
  set
    comment = null,
    cancellation_reason_code = null
  where member_id = v_member_id;

  update public.members
  set
    email = null,
    vorname = null,
    nachname = null,
    mitgliedsnummer = null,
    abteilung = null,
    strasse = null,
    hausnummer = null,
    plz = null,
    wohnort = null,
    geburtsdatum = null,
    telefonnummer = null,
    einwilligung_kontakt = false,
    kontakt_eingewilligt_am = null,
    einwilligung_bilder = false,
    bilder_eingewilligt_am = null,
    avatar_storage_path = null,
    avatar_updated_at = null,
    avatar_source = null,
    avatar_consent_at = null,
    anonymized_at = now()
  where id = v_member_id;

  return jsonb_build_object(
    'ok', true,
    'member_id', v_member_id,
    'deleted', false,
    'already_anonymized', false,
    'removed_upcoming_feedback',
      coalesce(v_removed_upcoming, 0),
    'auth_email',
      nullif(v_auth_email, '')
  );

end;
$$;

revoke all on function public.anonymize_member(bigint) from public;
grant execute on function public.anonymize_member(bigint) to authenticated;

comment on function public.anonymize_member is
  'Profil löschen: zukünftige Termin-Zusagen entfernen; ohne verbleibendes Feedback members-Zeile löschen, sonst anonymisieren.';

-- ---------------------------------------------------------------------------
-- Bestand bereinigen: Geister ohne verbleibende Historie
-- ---------------------------------------------------------------------------

with removed_upcoming as (
  delete from public.feedback_answers fa
  using public.feedback_modules fm
  join public."Termine" t
    on t.id = fm.entity_id
  where fa.module_id = fm.id
    and fm.entity_type = 'event'
    and public.is_termin_still_upcoming(t)
    and fa.member_id in (
      select m.id
      from public.members m
      where m.anonymized_at is not null
    )
  returning fa.member_id
)
delete from public.members m
where m.anonymized_at is not null
  and not exists (
    select 1
    from public.feedback_answers fa
    where fa.member_id = m.id
  )
  and not exists (
    select 1
    from public.feedback_answer_events e
    where e.member_id = m.id
  );
