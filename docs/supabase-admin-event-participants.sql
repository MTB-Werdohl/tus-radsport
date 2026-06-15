-- Vorstand: Teilnehmerliste für Einzeltermine manuell pflegen
-- Walk-in-Gäste (rolle guest), Korrekturen ohne Mitglieder-Absage-Hürde
--
-- Nach Phase-4a-Basis + Public-Registrierung ausführen.
-- Siehe docs/supabase/RUNBOOK.md

-- Walk-in-Entwurf-Merkmal (Profil → Entwürfe)
alter table public.members
  add column if not exists walkin_open boolean not null default false;

alter table public.members
  add column if not exists walkin_module_id bigint null;

comment on column public.members.walkin_open is
  'Walk-in-Gast offen — erscheint in Profil → Entwürfe bis fertig oder entfernt.';

comment on column public.members.walkin_module_id is
  'Feedback-Modul des Termins, an dem der Walk-in angelegt wurde.';

-- ---------------------------------------------------------------------------
-- Hilfsfunktionen
-- ---------------------------------------------------------------------------

create or replace function public.is_guest_internal_email(
  p_email text
)
returns boolean
language sql
immutable
as $$
  select coalesce(
    lower(trim(p_email)),
    ''
  ) like 'guest+%@walkin.internal.mtb-werdohl.de';
$$;

comment on function public.is_guest_internal_email(text) is
  'Technische Platzhalter-E-Mail für Walk-in-Gäste ohne Login.';

create or replace function public.admin_actor_member_id()
returns bigint
language plpgsql
stable
security definer
set search_path = public
set row_security = off
as $$
declare
  v_email text;
  v_member_id bigint;
begin
  v_email :=
    lower(trim(coalesce(auth.jwt()->>'email', '')));

  if v_email = '' then
    return null;
  end if;

  select m.id
  into v_member_id
  from public.members m
  where lower(trim(m.email)) = v_email
    and lower(trim(coalesce(m.rolle, ''))) = 'vorstand'
    and m.anonymized_at is null
  limit 1;

  return v_member_id;
end;
$$;

revoke all on function public.admin_actor_member_id() from public;
grant execute on function public.admin_actor_member_id() to authenticated;

-- Admin-Historie: zusätzliche event_type-Werte
alter table public.feedback_answer_events
  drop constraint if exists feedback_answer_events_event_type_check;

alter table public.feedback_answer_events
  add constraint feedback_answer_events_event_type_check
  check (
    event_type in (
      'set_answer',
      'withdraw',
      'withdraw_after_yes',
      'downgrade_after_yes',
      'admin_add',
      'admin_set_answer',
      'admin_remove',
      'admin_update_guest'
    )
  );

-- ---------------------------------------------------------------------------
-- Intern: Antwort für Einzeltermin (Vorstand, ohne Mitglieder-Hürden)
-- ---------------------------------------------------------------------------

create or replace function public.admin_write_event_participant_answer(
  p_module_id bigint,
  p_member_id bigint,
  p_answer text,
  p_event_type text,
  p_admin_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current public.feedback_answers;
  v_from_answer text;
  v_to_answer text;
  v_answer_id bigint;
  v_result public.feedback_answers;
  v_event_id bigint;
begin
  v_to_answer :=
    nullif(
      lower(trim(coalesce(p_answer, ''))),
      ''
    );

  if v_to_answer is not null
    and v_to_answer not in ('yes', 'maybe') then
    raise exception 'Ungültige Antwort.';
  end if;

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

  if v_from_answer is not distinct from v_to_answer then

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
    p_event_type,
    v_from_answer,
    v_to_answer,
    null,
    nullif(trim(coalesce(p_admin_note, '')), '')
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

revoke all on function public.admin_write_event_participant_answer(
  bigint, bigint, text, text, text
) from public;

-- ---------------------------------------------------------------------------
-- Vorstand-RPC: Teilnehmer verwalten (nur Einzeltermine)
-- Alte Signatur (mit p_incognito) zuerst entfernen — sonst „function name is not unique“.
-- ---------------------------------------------------------------------------

drop function if exists public.admin_manage_event_participant(
  bigint, text, bigint, text, text, text, boolean, text, text, text
);

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
  v_recurring boolean;
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

  select coalesce(t.recurring, false)
  into v_recurring
  from public."Termine" t
  where t.id = v_module.entity_id;

  if not found then
    raise exception 'Termin nicht gefunden.';
  end if;

  if v_recurring is true then
    raise exception 'Serientermine werden nicht unterstützt.';
  end if;

  -- -------------------------------------------------------------------------
  -- add_guest
  -- -------------------------------------------------------------------------

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

  -- -------------------------------------------------------------------------
  -- add_member
  -- -------------------------------------------------------------------------

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

  -- -------------------------------------------------------------------------
  -- update_guest
  -- -------------------------------------------------------------------------

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
      p_module_id,
      p_member_id,
      fa.id,
      'admin_update_guest',
      fa.answer,
      fa.answer,
      nullif(trim(coalesce(p_admin_note, '')), '')
    from public.feedback_answers fa
    where fa.module_id = p_module_id
      and fa.member_id = p_member_id
    limit 1;

    return jsonb_build_object(
      'ok', true,
      'member_id', p_member_id,
      'action', v_action
    );

  end if;

  -- -------------------------------------------------------------------------
  -- complete_walkin (Entwurf schließen, Gast bleibt auf Teilnehmerliste)
  -- -------------------------------------------------------------------------

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

  -- -------------------------------------------------------------------------
  -- set_answer (nur Vereinsmitglieder / public, nicht guest)
  -- -------------------------------------------------------------------------

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

  -- -------------------------------------------------------------------------
  -- remove
  -- -------------------------------------------------------------------------

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

revoke all on function public.admin_manage_event_participant(
  bigint, text, bigint, text, text, text, text, text, text
) from public;

grant execute on function public.admin_manage_event_participant(
  bigint, text, bigint, text, text, text, text, text, text
) to authenticated;

comment on function public.admin_manage_event_participant(
  bigint, text, bigint, text, text, text, text, text, text
) is
  'Vorstand: Einzeltermin-Teilnehmer hinzufügen, ändern, entfernen; Walk-in-Gäste (rolle guest, immer Ja).';

-- ---------------------------------------------------------------------------
-- Public-Registrierung: bestehenden Gast-Datensatz weiterverwenden
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

  if public.is_guest_internal_email(v_email) then
    raise exception 'Ungültige E-Mail.';
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

  if v_rolle = 'guest' then
    return 'ok';
  end if;

  return 'ok';
end;
$$;

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

  if public.is_guest_internal_email(v_email) then
    raise exception 'Ungültige Anmeldung.';
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
      rolle = 'public',
      walkin_open = false,
      walkin_module_id = null
    where id = v_member_id;

    return jsonb_build_object(
      'ok', true,
      'member_id', v_member_id,
      'created', false,
      'promoted_from_guest',
        lower(trim(v_rolle)) = 'guest'
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
    'created', true,
    'promoted_from_guest', false
  );
end;
$$;

comment on column public.members.rolle is
  'Mitglied | Vorstand | public (extern) | guest (Walk-in, Vorstand-verwaltet)';

-- ---------------------------------------------------------------------------
-- submit_public_feedback: Gast-Datensatz weiterverwenden (kein Duplikat)
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

  if public.is_guest_internal_email(v_email) then
    raise exception 'Ungültige E-Mail.';
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
      rolle = 'public',
      walkin_open = false,
      walkin_module_id = null
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

-- ---------------------------------------------------------------------------
-- Walk-in-Entwürfe für Profil → Entwürfe (Vorstand)
-- RETURNS TABLE statt jsonb — zuverlässiger mit PostgREST/Supabase-JS
-- ---------------------------------------------------------------------------

drop function if exists public.list_guest_walkin_drafts();

create or replace function public.list_guest_walkin_drafts()
returns table (
  member_id bigint,
  module_id bigint,
  termin_id bigint,
  termin_title text,
  vorname text,
  nachname text,
  telefonnummer text,
  email text,
  sort_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_vorstand() then
    raise exception 'Keine Berechtigung.';
  end if;

  return query
  select
    m.id,
    fa.module_id,
    fm.entity_id,
    t.title,
    m.vorname,
    m.nachname,
    m.telefonnummer,
    m.email,
    coalesce(fa.updated_at, m.updated_at)
  from public.members m
  left join lateral (
    select
      fa_inner.module_id,
      fa_inner.updated_at
    from public.feedback_answers fa_inner
    where fa_inner.member_id = m.id
    order by fa_inner.updated_at desc nulls last
    limit 1
  ) fa on true
  left join public.feedback_modules fm
    on fm.id = fa.module_id
  left join public."Termine" t
    on t.id = fm.entity_id
  where lower(trim(coalesce(m.rolle, ''))) = 'guest'
    and m.anonymized_at is null
  order by coalesce(fa.updated_at, m.updated_at) desc nulls last;

end;
$$;

revoke all on function public.list_guest_walkin_drafts() from public;

grant execute on function public.list_guest_walkin_drafts() to authenticated;

comment on function public.list_guest_walkin_drafts() is
  'Vorstand: alle Mitglieder mit rolle guest für Profil-Entwürfe.';
