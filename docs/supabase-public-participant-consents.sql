-- Externe Teilnehmer: Einwilligungen bei Registrierung (nach E-Mail-Bestätigung)
-- Nach supabase-feedback-public-email-verify.sql ausführen
-- Kontakt-Einwilligung Pflicht, Bilder-Einwilligung optional
-- Siehe docs/supabase/RUNBOOK.md

drop function if exists public.complete_public_participant_registration(
  text, text, text
);

drop function if exists public.complete_public_participant_registration(
  text, text, text, boolean, boolean
);

create or replace function public.complete_public_participant_registration(
  p_vorname text,
  p_nachname text,
  p_telefon text default null,
  p_einwilligung_kontakt boolean default false,
  p_einwilligung_bilder boolean default false
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
  v_today date;
  v_bilder boolean;
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

  if coalesce(p_einwilligung_kontakt, false) is not true then
    raise exception 'Bitte der Einwilligung Kontakt zustimmen.';
  end if;

  v_bilder :=
    coalesce(p_einwilligung_bilder, false);

  v_today :=
    current_date;

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
      rolle = 'public',
      einwilligung_kontakt = true,
      kontakt_eingewilligt_am =
        coalesce(kontakt_eingewilligt_am, v_today),
      einwilligung_bilder =
        case
          when v_bilder then true
          else einwilligung_bilder
        end,
      bilder_eingewilligt_am =
        case
          when v_bilder then coalesce(bilder_eingewilligt_am, v_today)
          else bilder_eingewilligt_am
        end
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
    rolle,
    einwilligung_kontakt,
    kontakt_eingewilligt_am,
    einwilligung_bilder,
    bilder_eingewilligt_am
  )
  values (
    v_email,
    nullif(v_vorname, ''),
    nullif(v_nachname, ''),
    nullif(trim(coalesce(p_telefon, '')), ''),
    'public',
    true,
    v_today,
    v_bilder,
    case
      when v_bilder then v_today
      else null
    end
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
  text, text, text, boolean, boolean
) from public;

grant execute on function public.complete_public_participant_registration(
  text, text, text, boolean, boolean
) to authenticated;

comment on function public.complete_public_participant_registration is
  'Legt externen Teilnehmer (rolle public) an — nur nach Magic Link; Kontakt-Einwilligung Pflicht, Bilder optional.';
