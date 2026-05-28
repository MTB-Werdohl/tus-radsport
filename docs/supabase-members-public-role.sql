-- Rolle „public“: externe Teilnehmer (z. B. Trainingslager-Anmeldung)
-- Voraussetzung: supabase-feedback.sql, supabase-feedback-public-voting.sql (public_voting)
-- Siehe docs/supabase/RUNBOOK.md

-- Nur Vereinsmitglieder (nicht „public“) für interne Inhalte
create or replace function public.is_member()
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.members
    where lower(trim(email)) = lower(trim(auth.jwt()->>'email'))
      and lower(trim(rolle)) in ('mitglied', 'vorstand')
  );
$$;

revoke all on function public.is_member() from public;
grant execute on function public.is_member() to authenticated;

comment on column public.members.rolle is
  'Mitglied | Vorstand | public (externer Teilnehmer, kein Vereinszugang)';

-- Öffentliche Abstimmung: externen Teilnehmer anlegen/aktualisieren + Antwort speichern
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
    updated_at = now();

  return jsonb_build_object(
    'ok', true,
    'member_id', v_member_id
  );

end;
$$;

revoke all on function public.submit_public_feedback(
  bigint, text, text, text, text, text, text
) from public;

grant execute on function public.submit_public_feedback(
  bigint, text, text, text, text, text, text
) to anon, authenticated;

-- Eigene Antwort anhand gespeicherter E-Mail (nur Rolle public)
create or replace function public.get_public_feedback_answer(
  p_module_id bigint,
  p_email text
)
returns jsonb
language sql
security definer
set search_path = public
set row_security = off
as $$
  select jsonb_build_object(
    'answer', fa.answer,
    'comment', fa.comment
  )
  from public.feedback_answers fa
  join public.members m
    on m.id = fa.member_id
  join public.feedback_modules fm
    on fm.id = fa.module_id
  where fa.module_id = p_module_id
    and lower(trim(m.email)) = lower(trim(coalesce(p_email, '')))
    and lower(trim(m.rolle)) = 'public'
    and coalesce(fm.public_voting, false) is true
  limit 1;
$$;

revoke all on function public.get_public_feedback_answer(
  bigint, text
) from public;

grant execute on function public.get_public_feedback_answer(
  bigint, text
) to anon, authenticated;

-- Alte anonyme client_token-Abstimmung entfernen (ersetzt durch members.rolle = public)
drop policy if exists feedback_answers_insert_anon_public on public.feedback_answers;
drop policy if exists feedback_answers_update_anon_public on public.feedback_answers;

comment on column public.feedback_modules.public_voting is
  'true = externe Teilnehmer mit Name/E-Mail (members.rolle = public). false = nur Vereinsmitglieder.';
