-- Serientermine entfernen (recurring-Spalten + zugehörige Daten)
-- Idempotent wo möglich — RPCs werden ohne recurring neu erstellt.

-- ---------------------------------------------------------------------------
-- Serientermine und zugehöriges Feedback löschen (nur wenn Spalte noch existiert)
-- ---------------------------------------------------------------------------

do $$
begin

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'Termine'
      and column_name = 'recurring'
  ) then
    return;
  end if;

  delete from public.feedback_answer_events e
  using public.feedback_modules fm
  join public."Termine" t
    on t.id = fm.entity_id
  where e.module_id = fm.id
    and fm.entity_type = 'event'
    and coalesce(t.recurring, false) is true;

  delete from public.feedback_answers fa
  using public.feedback_modules fm
  join public."Termine" t
    on t.id = fm.entity_id
  where fa.module_id = fm.id
    and fm.entity_type = 'event'
    and coalesce(t.recurring, false) is true;

  delete from public.feedback_modules fm
  using public."Termine" t
  where fm.entity_type = 'event'
    and fm.entity_id = t.id
    and coalesce(t.recurring, false) is true;

  delete from public."Termine"
  where coalesce(recurring, false) is true;

end $$;

-- ---------------------------------------------------------------------------
-- is_termin_still_upcoming — nur Einzeltermine (date + endDate)
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
  'true solange der Termin (Endtag bzw. Starttag) nicht vorbei ist.';

-- ---------------------------------------------------------------------------
-- set_event_feedback_answer_for_member — ohne Serien-Zweig
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
  v_termin public."Termine";
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

  select *
  into v_termin
  from public."Termine" t
  where t.id = v_module.entity_id;

  if not found then
    raise exception 'Termin nicht gefunden.';
  end if;

  if not public.is_termin_still_upcoming(v_termin) then
    raise exception 'Die Abstimmung für diesen Termin ist beendet.';
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

-- ---------------------------------------------------------------------------
-- admin_manage_event_participant — ohne Serien-Check
-- ---------------------------------------------------------------------------

create or replace function public.admin_manage_event_participant(
  p_module_id bigint,
  p_action text,
  p_member_id bigint default null,
  p_answer text default null,
  p_vorname text default null,
  p_nachname text default null,
  p_telefon text default null,
  p_email text default null,
  p_admin_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_module public.feedback_modules;
  v_action text;
  v_member public.members;
  v_new_member_id bigint;
  v_placeholder_email text;
  v_vorname text;
  v_nachname text;
  v_email text;
  v_answer text;
  v_event_type text;
  v_result jsonb;
  v_existing_id bigint;
begin
  if not public.is_vorstand() then
    raise exception 'Keine Berechtigung.';
  end if;

  if public.admin_actor_member_id() is null then
    raise exception 'Vorstand nicht gefunden.';
  end if;

  v_action :=
    lower(trim(coalesce(p_action, '')));

  if v_action = '' then
    raise exception 'Aktion fehlt.';
  end if;

  if v_action in ('update_guest', 'complete_walkin') then

    if p_member_id is null then
      raise exception 'Mitglied fehlt.';
    end if;

    select *
    into v_member
    from public.members
    where id = p_member_id;

    if not found then
      raise exception 'Person nicht gefunden.';
    end if;

    if v_member.anonymized_at is not null then
      raise exception 'Anonymisierte Person kann nicht bearbeitet werden.';
    end if;

    if v_action = 'update_guest' then

      if lower(trim(coalesce(v_member.rolle, ''))) <> 'guest' then
        raise exception 'Nur Gäste können so bearbeitet werden.';
      end if;

      v_vorname :=
        trim(coalesce(p_vorname, ''));

      v_nachname :=
        trim(coalesce(p_nachname, ''));

      if v_vorname = '' and v_nachname = '' then

        v_vorname :=
          coalesce(v_member.vorname, '');

        v_nachname :=
          coalesce(v_member.nachname, '');

        if v_vorname = '' and v_nachname = '' then
          raise exception 'Bitte mindestens Vorname oder Nachname angeben.';
        end if;

      end if;

      v_email :=
        lower(trim(coalesce(p_email, '')));

      if v_email <> ''
        and position('@' in v_email) = 0 then
        raise exception 'Bitte eine gültige E-Mail angeben.';
      end if;

      if v_email <> ''
        and public.is_guest_internal_email(v_email) then
        raise exception 'Diese E-Mail ist reserviert.';
      end if;

      if v_email <> '' then

        select m.id
        into v_existing_id
        from public.members m
        where lower(trim(m.email)) = v_email
          and m.id <> p_member_id
        limit 1;

        if v_existing_id is not null then
          raise exception 'E-Mail ist bereits vergeben.';
        end if;

      end if;

      update public.members
      set
        vorname = nullif(v_vorname, ''),
        nachname = nullif(v_nachname, ''),
        telefonnummer =
          case
            when p_telefon is null then telefonnummer
            else nullif(trim(p_telefon), '')
          end,
        email =
          case
            when v_email <> '' then v_email
            else email
          end,
        walkin_open =
          case
            when v_email <> ''
              and not public.is_guest_internal_email(v_email)
              then false
            else walkin_open
          end
      where id = p_member_id;

      insert into public.feedback_answer_events (
        module_id,
        member_id,
        answer_id,
        event_type,
        from_answer,
        to_answer,
        comment
      )
      select
        fa.module_id,
        p_member_id,
        fa.id,
        'admin_update_guest',
        fa.answer,
        fa.answer,
        nullif(trim(coalesce(p_admin_note, '')), '')
      from public.feedback_answers fa
      where fa.member_id = p_member_id;

      return jsonb_build_object(
        'ok', true,
        'member_id', p_member_id,
        'action', v_action
      );

    end if;

    if v_action = 'complete_walkin' then

      if lower(trim(coalesce(v_member.rolle, ''))) <> 'guest' then
        raise exception 'Nur Walk-in-Gäste können so abgeschlossen werden.';
      end if;

      update public.members
      set walkin_open = false
      where id = p_member_id;

      return jsonb_build_object(
        'ok', true,
        'member_id', p_member_id,
        'action', v_action
      );

    end if;

  end if;

  if p_module_id is null then
    raise exception 'Modul fehlt.';
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

  if v_module.type <> 'yes_maybe' then
    raise exception 'Nur für Ja/Vielleicht-Termine.';
  end if;

  if not exists (
    select 1
    from public."Termine" t
    where t.id = v_module.entity_id
  ) then
    raise exception 'Termin nicht gefunden.';
  end if;

  if v_action = 'add_guest' then

    v_vorname :=
      trim(coalesce(p_vorname, ''));

    v_nachname :=
      trim(coalesce(p_nachname, ''));

    if v_vorname = '' and v_nachname = '' then
      raise exception 'Bitte mindestens Vorname oder Nachname angeben.';
    end if;

    v_placeholder_email :=
      'guest+'
      || gen_random_uuid()::text
      || '@walkin.internal.mtb-werdohl.de';

    insert into public.members (
      email,
      vorname,
      nachname,
      telefonnummer,
      rolle,
      walkin_open,
      walkin_module_id
    )
    values (
      v_placeholder_email,
      nullif(v_vorname, ''),
      nullif(v_nachname, ''),
      nullif(trim(coalesce(p_telefon, '')), ''),
      'guest',
      true,
      p_module_id
    )
    returning id
    into v_new_member_id;

    v_result :=
      public.admin_write_event_participant_answer(
        p_module_id,
        v_new_member_id,
        'yes',
        'admin_add',
        coalesce(
          p_admin_note,
          'Walk-in Gast hinzugefügt'
        )
      );

    return v_result || jsonb_build_object(
      'member_id', v_new_member_id,
      'action', v_action
    );

  end if;

  if p_member_id is null then
    raise exception 'Mitglied fehlt.';
  end if;

  select *
  into v_member
  from public.members
  where id = p_member_id;

  if not found then
    raise exception 'Person nicht gefunden.';
  end if;

  if v_member.anonymized_at is not null then
    raise exception 'Anonymisierte Person kann nicht bearbeitet werden.';
  end if;

  if v_action = 'add_member' then

    if lower(trim(coalesce(v_member.rolle, '')))
      not in ('mitglied', 'vorstand') then
      raise exception 'Nur Vereinsmitglieder können so hinzugefügt werden.';
    end if;

    if exists (
      select 1
      from public.feedback_answers fa
      where fa.module_id = p_module_id
        and fa.member_id = p_member_id
    ) then
      raise exception 'Person ist bereits auf der Liste.';
    end if;

    v_result :=
      public.admin_write_event_participant_answer(
        p_module_id,
        p_member_id,
        'yes',
        'admin_add',
        coalesce(
          p_admin_note,
          'Vorstand: Teilnehmer hinzugefügt'
        )
      );

    return v_result || jsonb_build_object(
      'member_id', p_member_id,
      'action', v_action
    );

  end if;

  if v_action = 'set_answer' then

    if lower(trim(coalesce(v_member.rolle, ''))) = 'guest' then
      raise exception 'Gäste sind immer Ja — bitte Gast bearbeiten oder entfernen.';
    end if;

    v_answer :=
      nullif(
        lower(trim(coalesce(p_answer, ''))),
        ''
      );

    if v_answer not in ('yes', 'maybe') then
      raise exception 'Antwort muss Ja oder Interesse sein.';
    end if;

    if not exists (
      select 1
      from public.feedback_answers fa
      where fa.module_id = p_module_id
        and fa.member_id = p_member_id
    ) then
      raise exception 'Person ist nicht auf der Liste.';
    end if;

    v_result :=
      public.admin_write_event_participant_answer(
        p_module_id,
        p_member_id,
        v_answer,
        'admin_set_answer',
        coalesce(
          p_admin_note,
          'Vorstand: Antwort geändert'
        )
      );

    return v_result || jsonb_build_object(
      'member_id', p_member_id,
      'action', v_action
    );

  end if;

  if v_action = 'remove' then

    if not exists (
      select 1
      from public.feedback_answers fa
      where fa.module_id = p_module_id
        and fa.member_id = p_member_id
    ) then
      raise exception 'Person ist nicht auf der Liste.';
    end if;

    v_result :=
      public.admin_write_event_participant_answer(
        p_module_id,
        p_member_id,
        null,
        'admin_remove',
        coalesce(
          p_admin_note,
          'Vorstand: von Liste entfernt'
        )
      );

    if lower(trim(coalesce(v_member.rolle, ''))) = 'guest' then

      update public.members
      set
        walkin_open = false,
        walkin_module_id = null
      where id = p_member_id;

    end if;

    return v_result || jsonb_build_object(
      'member_id', p_member_id,
      'action', v_action
    );

  end if;

  raise exception 'Unbekannte Aktion: %', v_action;

end;
$$;

-- ---------------------------------------------------------------------------
-- list_feedback_participation_changes — ohne Serien-Filter
-- ---------------------------------------------------------------------------

create or replace function public.list_feedback_participation_changes(
  p_module_id bigint default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
  v_offset integer;
begin
  if not public.is_vorstand() then
    raise exception 'Keine Berechtigung.';
  end if;

  v_limit :=
    greatest(
      least(coalesce(p_limit, 50), 200),
      1
    );

  v_offset :=
    greatest(coalesce(p_offset, 0), 0);

  return coalesce(
    (
      select jsonb_agg(row_data order by row_data->>'created_at' desc)
      from (
        select jsonb_build_object(
          'id', e.id,
          'created_at', e.created_at,
          'event_type', e.event_type,
          'from_answer', e.from_answer,
          'to_answer', e.to_answer,
          'cancellation_reason_code', e.cancellation_reason_code,
          'comment', e.comment,
          'module_id', e.module_id,
          'member_id', e.member_id,
          'member_vorname', m.vorname,
          'member_nachname', m.nachname,
          'member_email', m.email,
          'member_rolle', m.rolle,
          'member_anonymized_at', m.anonymized_at,
          'event_id', fm.entity_id,
          'event_title', t.title,
          'event_slug', t.slug
        ) as row_data
        from public.feedback_answer_events e
        join public.feedback_modules fm
          on fm.id = e.module_id
        join public."Termine" t
          on t.id = fm.entity_id
        join public.members m
          on m.id = e.member_id
        where fm.entity_type = 'event'
          and (
            p_module_id is null
            or e.module_id = p_module_id
          )
        order by e.created_at desc
        limit v_limit
        offset v_offset
      ) sub
    ),
    '[]'::jsonb
  );

end;
$$;

-- ---------------------------------------------------------------------------
-- Spalten entfernen
-- ---------------------------------------------------------------------------

alter table public."Termine"
  drop column if exists recurring,
  drop column if exists "daysOfWeek",
  drop column if exists "startRecur",
  drop column if exists "endRecur",
  drop column if exists exclude,
  drop column if exists "durationDays";
