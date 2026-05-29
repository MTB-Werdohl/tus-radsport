-- Öffentliche Feedback-Registrierung: DB-Eintrag erst nach E-Mail-Bestätigung
-- Nach supabase-feedback-public-registration.sql ausführen
--
-- Ablauf:
-- 1. Formular → Magic Link (Name in auth user_metadata, noch kein members-Eintrag)
-- 2. Klick auf Link → Session → complete_public_participant_registration()

-- ---------------------------------------------------------------------------
-- Vor Magic Link: darf sich diese E-Mail neu als public registrieren?
-- Rückgabe: ok | club_member | already_public
-- ---------------------------------------------------------------------------

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
  where lower(trim(email)) = v_email;

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

revoke all on function public.can_register_public_participant(text) from public;
grant execute on function public.can_register_public_participant(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Nach Magic-Link-Login: members-Eintrag anlegen (nur authenticated)
-- ---------------------------------------------------------------------------

create or replace function public.complete_public_participant_registration(
  p_vorname text,
  p_nachname text,
  p_telefon text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_member_id bigint;
  v_rolle text;
  v_vorname text;
  v_nachname text;
begin
  v_email :=
    lower(trim(coalesce(auth.jwt()->>'email', '')));

  if v_email = '' then
    raise exception 'Nicht angemeldet.';
  end if;

  v_vorname :=
    trim(coalesce(p_vorname, ''));

  v_nachname :=
    trim(coalesce(p_nachname, ''));

  if v_vorname = '' and v_nachname = '' then
    raise exception 'Bitte mindestens Vor- oder Nachname angeben.';
  end if;

  select id, rolle
  into v_member_id, v_rolle
  from public.members
  where lower(trim(email)) = v_email;

  if v_member_id is not null then

    if lower(trim(v_rolle)) in ('mitglied', 'vorstand') then
      raise exception 'Bitte als Vereinsmitglied anmelden.';
    end if;

    update public.members
    set
      vorname = nullif(v_vorname, ''),
      nachname = nullif(v_nachname, ''),
      telefonnummer = nullif(trim(coalesce(p_telefon, '')), ''),
      rolle = 'public'
    where id = v_member_id;

    return jsonb_build_object(
      'ok', true,
      'member_id', v_member_id,
      'created', false
    );

  end if;

  insert into public.members (
    email,
    vorname,
    nachname,
    telefonnummer,
    rolle
  )
  values (
    v_email,
    nullif(v_vorname, ''),
    nullif(v_nachname, ''),
    nullif(trim(coalesce(p_telefon, '')), ''),
    'public'
  )
  returning id
  into v_member_id;

  return jsonb_build_object(
    'ok', true,
    'member_id', v_member_id,
    'created', true
  );
end;
$$;

revoke all on function public.complete_public_participant_registration(
  text, text, text
) from public;

grant execute on function public.complete_public_participant_registration(
  text, text, text
) to authenticated;

-- Alte Sofort-Registrierung ohne E-Mail-Bestätigung: nicht mehr für anon
revoke execute on function public.register_public_participant(
  text, text, text, text
) from anon;

comment on function public.complete_public_participant_registration is
  'Legt externen Teilnehmer (rolle public) an — nur nach bestätigtem Magic Link (authenticated).';

comment on function public.can_register_public_participant is
  'Prüft vor dem Magic Link, ob E-Mail als public registriert werden darf.';
