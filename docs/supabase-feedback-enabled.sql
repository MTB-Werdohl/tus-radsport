-- Feedback: Modul deaktivieren ohne Datenverlust
-- Nach supabase-feedback.sql (und optional public_voting) ausführen
--
-- enabled = false: öffentlich ausgeblendet, Antworten bleiben erhalten.
-- Löschen erfolgt nur beim Entfernen des zugehörigen Termins/News (Kaskade).

alter table public.feedback_modules
  add column if not exists enabled
  boolean not null default true;

comment on column public.feedback_modules.enabled is
  'false = auf der Website ausgeblendet; Modul und Antworten bleiben bis Entity-Löschung erhalten.';

-- Öffentliche Abstimmung: nur bei aktivem Modul
create or replace function public.submit_public_feedback(
  p_module_id bigint,
  p_email text,
  p_vorname text,
  p_nachname text,
  p_telefon text,
  p_answer text,
  p_comment text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_module public.feedback_modules;
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

  if coalesce(trim(p_answer), '') = '' then
    raise exception 'Bitte eine Antwort wählen.';
  end if;

  select *
  into v_module
  from public.feedback_modules
  where id = p_module_id;

  if not found then
    raise exception 'Abstimmung nicht gefunden.';
  end if;

  if coalesce(v_module.enabled, true) is not true then
    raise exception 'Diese Abstimmung ist derzeit nicht aktiv.';
  end if;

  if coalesce(v_module.public_voting, false) is not true then
    raise exception 'Diese Abstimmung ist nicht öffentlich.';
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

  insert into public.feedback_answers (
    module_id,
    member_id,
    answer,
    comment,
    updated_at
  )
  values (
    p_module_id,
    v_member_id,
    trim(p_answer),
    nullif(trim(coalesce(p_comment, '')), ''),
    now()
  )
  on conflict (module_id, member_id)
  do update set
    answer = excluded.answer,
    comment = excluded.comment,
    updated_at = excluded.updated_at;

  return jsonb_build_object(
    'ok', true,
    'member_id', v_member_id
  );
end;
$$;
