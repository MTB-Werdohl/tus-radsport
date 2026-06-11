-- Phase 4a Hotfix: FK-Fehler bei Absage (withdraw / withdraw_after_yes)
--
-- Symptom: 23503 feedback_answer_events_answer_id_fkey —
-- answer_id zeigt auf gelöschte feedback_answers-Zeile.
--
-- Fix: Nach DELETE v_answer_id := null setzen.
--
-- In Supabase SQL Editor ausführen (nach Phase-4a-Basis).
-- Alternativ: gesamte docs/supabase-phase4a-public-feedback-rpc-fix.sql erneut ausführen.

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
