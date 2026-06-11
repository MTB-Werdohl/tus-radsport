-- Phase 4a Review-Nacharbeit: Public-RPC an 4a-Logik anbinden
-- Nach supabase-phase4a-feedback-events.sql ausführen.
--
-- submit_public_feedback darf Einzeltermine nicht mehr per Direkt-Upsert umgehen.

-- ---------------------------------------------------------------------------
-- Kernlogik: Antwort für bekanntes member_id (intern + submit_public_feedback)
-- ---------------------------------------------------------------------------

create or replace function public.set_event_feedback_answer_for_member(
  p_module_id bigint,
  p_member_id bigint,
  p_answer text default null,
  p_comment text default null,
  p_cancellation_reason_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_module public.feedback_modules;
  v_recurring boolean;
  v_current public.feedback_answers;
  v_from_answer text;
  v_to_answer text;
  v_event_type text;
  v_event_id bigint;
  v_answer_id bigint;
  v_result public.feedback_answers;
  v_reason text;
  v_event_comment text;
begin
  if p_member_id is null then
    raise exception 'Mitglied nicht gefunden.';
  end if;

  select *
  into v_module
  from public.feedback_modules
  where id = p_module_id;

  if not found then
    raise exception 'Modul nicht gefunden.';
  end if;

  if v_module.entity_type <> 'event' then
    raise exception 'Nur für Termine.';
  end if;

  if v_module.type not in ('yes_maybe', 'yes_no_comment') then
    raise exception 'Nur für Zusagen (Ja/Vielleicht).';
  end if;

  if coalesce(v_module.enabled, true) is not true then
    raise exception 'Diese Zusage ist derzeit nicht aktiv.';
  end if;

  select coalesce(t.recurring, false)
  into v_recurring
  from public."Termine" t
  where t.id = v_module.entity_id;

  if not found then
    raise exception 'Termin nicht gefunden.';
  end if;

  v_to_answer :=
    nullif(
      lower(trim(coalesce(p_answer, ''))),
      ''
    );

  select *
  into v_current
  from public.feedback_answers
  where module_id = p_module_id
    and member_id = p_member_id
  for update;

  v_from_answer :=
    nullif(
      lower(trim(coalesce(v_current.answer, ''))),
      ''
    );

  if v_recurring is true then

    if v_to_answer is null then

      delete from public.feedback_answers
      where module_id = p_module_id
        and member_id = p_member_id;

      return jsonb_build_object(
        'ok', true,
        'answer', null,
        'event_id', null
      );

    end if;

    if v_to_answer not in ('yes', 'maybe') then
      raise exception 'Ungültige Antwort.';
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
      p_member_id,
      v_to_answer,
      nullif(trim(coalesce(p_comment, '')), ''),
      now()
    )
    on conflict (module_id, member_id)
    do update set
      answer = excluded.answer,
      comment = excluded.comment,
      updated_at = excluded.updated_at
    returning *
    into v_result;

    return jsonb_build_object(
      'ok', true,
      'answer', to_jsonb(v_result),
      'event_id', null
    );

  end if;

  if v_to_answer is not null
    and v_to_answer not in ('yes', 'maybe') then
    raise exception 'Ungültige Antwort.';
  end if;

  if v_from_answer = v_to_answer then

    if v_current.id is null then
      return jsonb_build_object(
        'ok', true,
        'answer', null,
        'event_id', null
      );
    end if;

    return jsonb_build_object(
      'ok', true,
      'answer', to_jsonb(v_current),
      'event_id', null
    );

  end if;

  v_reason :=
    nullif(
      lower(trim(coalesce(p_cancellation_reason_code, ''))),
      ''
    );

  v_event_comment :=
    nullif(trim(coalesce(p_comment, '')), '');

  if v_from_answer = 'yes'
    and (
      v_to_answer is null
      or v_to_answer = 'maybe'
    ) then

    if v_reason is null then
      raise exception 'Bitte Absagegrund angeben.';
    end if;

    if v_reason <> 'sonstiges' then
      v_event_comment := null;
    elsif v_event_comment is not null
      and length(v_event_comment) > 500 then
      raise exception 'Freitext darf maximal 500 Zeichen haben.';
    end if;

  else

    v_reason := null;
    v_event_comment := null;

  end if;

  if v_from_answer = 'yes'
    and v_to_answer is null then
    v_event_type := 'withdraw_after_yes';
  elsif v_from_answer = 'yes'
    and v_to_answer = 'maybe' then
    v_event_type := 'downgrade_after_yes';
  elsif v_to_answer is null then
    v_event_type := 'withdraw';
  else
    v_event_type := 'set_answer';
  end if;

  v_answer_id := v_current.id;

  if v_to_answer is null then

    delete from public.feedback_answers
    where module_id = p_module_id
      and member_id = p_member_id;

    v_result := null;
    v_answer_id := null;

  else

    insert into public.feedback_answers (
      module_id,
      member_id,
      answer,
      comment,
      updated_at
    )
    values (
      p_module_id,
      p_member_id,
      v_to_answer,
      null,
      now()
    )
    on conflict (module_id, member_id)
    do update set
      answer = excluded.answer,
      comment = null,
      updated_at = excluded.updated_at
    returning *
    into v_result;

    v_answer_id := v_result.id;

  end if;

  insert into public.feedback_answer_events (
    module_id,
    member_id,
    answer_id,
    event_type,
    from_answer,
    to_answer,
    cancellation_reason_code,
    comment
  )
  values (
    p_module_id,
    p_member_id,
    v_answer_id,
    v_event_type,
    v_from_answer,
    v_to_answer,
    v_reason,
    v_event_comment
  )
  returning id
  into v_event_id;

  return jsonb_build_object(
    'ok', true,
    'answer',
      case
        when v_result is null then null
        else to_jsonb(v_result)
      end,
    'event_id', v_event_id
  );

end;
$$;

revoke all on function public.set_event_feedback_answer_for_member(
  bigint, bigint, text, text, text
) from public;

-- ---------------------------------------------------------------------------
-- set_event_feedback_answer — JWT-Auflöser, delegiert an for_member
-- ---------------------------------------------------------------------------

create or replace function public.set_event_feedback_answer(
  p_module_id bigint,
  p_answer text default null,
  p_comment text default null,
  p_cancellation_reason_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_email text;
  v_member_id bigint;
begin
  v_caller_email :=
    lower(trim(coalesce(auth.jwt()->>'email', '')));

  if v_caller_email = '' then
    raise exception 'Nicht angemeldet.';
  end if;

  select m.id
  into v_member_id
  from public.members m
  where lower(trim(m.email)) = v_caller_email
    and m.anonymized_at is null
  limit 1;

  if v_member_id is null then
    raise exception 'Mitglied nicht gefunden.';
  end if;

  return public.set_event_feedback_answer_for_member(
    p_module_id,
    v_member_id,
    p_answer,
    p_comment,
    p_cancellation_reason_code
  );

end;
$$;

revoke all on function public.set_event_feedback_answer(
  bigint, text, text, text
) from public;

grant execute on function public.set_event_feedback_answer(
  bigint, text, text, text
) to authenticated;

-- ---------------------------------------------------------------------------
-- submit_public_feedback — Termin-Zusagen über for_member (4a-konform)
-- ---------------------------------------------------------------------------

create or replace function public.submit_public_feedback(
  p_module_id bigint,
  p_email text,
  p_vorname text,
  p_nachname text,
  p_telefon text,
  p_answer text,
  p_comment text default null,
  p_cancellation_reason_code text default null
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
  v_caller_email text;
  v_result jsonb;
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

  v_caller_email :=
    lower(trim(coalesce(auth.jwt()->>'email', '')));

  if v_caller_email <> ''
    and v_caller_email <> v_email then
    raise exception 'E-Mail stimmt nicht mit der Anmeldung überein.';
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

  if v_module.entity_type = 'event'
    and v_module.type in ('yes_maybe', 'yes_no_comment') then

    v_result :=
      public.set_event_feedback_answer_for_member(
        p_module_id,
        v_member_id,
        p_answer,
        p_comment,
        p_cancellation_reason_code
      );

    return v_result || jsonb_build_object(
      'member_id', v_member_id
    );

  end if;

  if coalesce(trim(p_answer), '') = '' then
    raise exception 'Bitte eine Antwort wählen.';
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

revoke all on function public.submit_public_feedback(
  bigint, text, text, text, text, text, text, text
) from public;

grant execute on function public.submit_public_feedback(
  bigint, text, text, text, text, text, text, text
) to authenticated;
