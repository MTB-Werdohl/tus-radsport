-- Mitglieder anonymisieren statt hart löschen (Feedback-Teilnahmen bleiben gezählt)
-- Nach supabase-members-admin.sql und Feedback-Skripten ausführen
--
-- Öffentliche Nutzer: Self-Service über Edge Function anonymize-member-account
-- Vorstand: gleiche Logik für Admin-Löschen (Mitgliederliste)

-- ---------------------------------------------------------------------------
-- Spalte anonymized_at
-- ---------------------------------------------------------------------------

alter table public.members
  add column if not exists anonymized_at timestamptz;

comment on column public.members.anonymized_at is
  'Zeitpunkt der Anonymisierung (Account gelöscht). id bleibt für feedback_answers.';

-- ---------------------------------------------------------------------------
-- Kernfunktion: personenbezogene Daten entfernen, id behalten
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
    anonymized_at
  into
    v_auth_email,
    v_rolle,
    v_anonymized_at
  from public.members
  where id = v_member_id;

  if v_anonymized_at is not null then
    return jsonb_build_object(
      'ok', true,
      'member_id', v_member_id,
      'already_anonymized', true,
      'auth_email', null
    );
  end if;

  if p_member_id is null then

    if v_rolle <> 'public' then
      raise exception
        'Nur externe Teilnehmer können ihr Konto selbst löschen.';
    end if;

  end if;

  update public.feedback_answers
  set comment = null
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
    anonymized_at = now()
  where id = v_member_id;

  return jsonb_build_object(
    'ok', true,
    'member_id', v_member_id,
    'already_anonymized', false,
    'auth_email',
      nullif(v_auth_email, '')
  );
end;
$$;

revoke all on function public.anonymize_member(bigint) from public;
grant execute on function public.anonymize_member(bigint) to authenticated;

comment on function public.anonymize_member is
  'Entfernt personenbezogene Daten; member_id und feedback_answers bleiben. Self: nur rolle public. Vorstand: p_member_id.';

-- Kein Hard-Delete mehr über RLS (nur Anonymisierung)
drop policy if exists members_delete_vorstand on public.members;

-- ---------------------------------------------------------------------------
-- E-Mail-Prüfungen: anonymisierte Datensätze ignorieren
-- ---------------------------------------------------------------------------

create or replace function public.check_member_email(check_email text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.members
    where lower(trim(email)) = lower(trim(check_email))
      and anonymized_at is null
      and email is not null
  );
$$;

create or replace function public.check_public_participant_email(
  check_email text
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.members
    where lower(trim(email)) = lower(trim(check_email))
      and lower(trim(rolle)) = 'public'
      and anonymized_at is null
      and email is not null
  );
$$;

create or replace function public.can_register_public_participant(
  p_email text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rolle text;
  v_email text;
begin
  v_email :=
    lower(trim(coalesce(p_email, '')));

  if v_email = '' or position('@' in v_email) = 0 then
    raise exception 'Bitte eine gültige E-Mail angeben.';
  end if;

  select lower(trim(rolle))
  into v_rolle
  from public.members
  where lower(trim(email)) = v_email
    and anonymized_at is null
    and email is not null;

  if not found then
    return 'ok';
  end if;

  if v_rolle in ('mitglied', 'vorstand') then
    return 'club_member';
  end if;

  if v_rolle = 'public' then
    return 'already_public';
  end if;

  return 'ok';
end;
$$;
