-- Öffentliche Feedback-Teilnahme: Registrierung + Login per Magic Link
-- Nach supabase-members-public-role.sql ausführen
--
-- Kein anonymes Abstimmen mehr: erst register_public_participant,
-- dann Magic Link, dann abstimmen als authenticated (rolle public).

-- ---------------------------------------------------------------------------
-- Prüfung: E-Mail bereits als externer Teilnehmer (rolle public)
-- ---------------------------------------------------------------------------

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
  );
$$;

revoke all on function public.check_public_participant_email(text) from public;
grant execute on function public.check_public_participant_email(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Externen Teilnehmer anlegen/aktualisieren (ohne Abstimmung)
-- ---------------------------------------------------------------------------

create or replace function public.register_public_participant(
  p_email text,
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
  v_member_id bigint;
  v_rolle text;
  v_email text;
  v_vorname text;
  v_nachname text;
begin
  v_email :=
    lower(trim(coalesce(p_email, '')));

  v_vorname :=
    trim(coalesce(p_vorname, ''));

  v_nachname :=
    trim(coalesce(p_nachname, ''));

  if v_email = '' or position('@' in v_email) = 0 then
    raise exception 'Bitte eine gültige E-Mail angeben.';
  end if;

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

  else

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

  end if;

  return jsonb_build_object(
    'ok', true,
    'member_id', v_member_id
  );
end;
$$;

revoke all on function public.register_public_participant(
  text, text, text, text
) from public;

grant execute on function public.register_public_participant(
  text, text, text, text
) to anon, authenticated;

-- Anonymes Abstimmen ohne Login deaktivieren
revoke execute on function public.submit_public_feedback(
  bigint, text, text, text, text, text, text
) from anon;

comment on function public.register_public_participant is
  'Legt externen Teilnehmer (rolle public) an. Abstimmung erst nach Magic-Link-Login.';
