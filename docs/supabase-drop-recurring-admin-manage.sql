-- Patch admin_manage_event_participant after recurring column drop
-- Apply via Supabase migration if not already deployed.

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
