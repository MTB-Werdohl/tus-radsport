-- Phase 4a — Einzeltermine: Verbindlichkeit, Absagegründe, Historie
-- Nach supabase-feedback.sql, supabase-feedback-answers-delete-own.sql,
-- supabase-feedback-enabled.sql ausführen.
-- Phase 4b/4c: nicht enthalten. Serientermine (recurring=true) behalten direktes Upsert.

-- ---------------------------------------------------------------------------
-- Hilfsfunktion: RPC-Pflicht nur für Einzeltermine mit yes_maybe
-- ---------------------------------------------------------------------------

create or replace function public.feedback_answer_requires_rpc(
  p_module_id bigint
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.feedback_modules fm
    join public."Termine" t
      on t.id = fm.entity_id
    where fm.id = p_module_id
      and fm.entity_type = 'event'
      and fm.type in ('yes_maybe', 'yes_no_comment')
      and coalesce(t.recurring, false) is not true
  );
$$;

comment on function public.feedback_answer_requires_rpc(bigint) is
  'Phase 4a: Einzeltermine — Antworten nur noch über set_event_feedback_answer.';

-- ---------------------------------------------------------------------------
-- feedback_answer_events
-- ---------------------------------------------------------------------------

create table if not exists public.feedback_answer_events (
  id bigint generated always as identity primary key,
  module_id bigint not null
    references public.feedback_modules (id)
    on delete cascade,
  member_id bigint not null
    references public.members (id)
    on delete cascade,
  answer_id bigint
    references public.feedback_answers (id)
    on delete set null,
  event_type text not null,
  from_answer text,
  to_answer text,
  cancellation_reason_code text,
  comment text,
  created_at timestamptz not null default now(),

  constraint feedback_answer_events_event_type_check
    check (
      event_type in (
        'set_answer',
        'withdraw',
        'withdraw_after_yes',
        'downgrade_after_yes'
      )
    ),

  constraint feedback_answer_events_reason_check
    check (
      cancellation_reason_code is null
      or cancellation_reason_code in (
        'krankheit',
        'familie',
        'arbeit',
        'wetter',
        'terminueberschneidung',
        'sonstiges'
      )
    )
);

create index if not exists feedback_answer_events_module_created_idx
  on public.feedback_answer_events (module_id, created_at desc);

create index if not exists feedback_answer_events_member_created_idx
  on public.feedback_answer_events (member_id, created_at desc);

create index if not exists feedback_answer_events_created_idx
  on public.feedback_answer_events (created_at desc);

comment on table public.feedback_answer_events is
  'Phase 4a: Historie von Termin-Zusagen (Einzeltermine). Append-only.';

alter table public.feedback_answer_events enable row level security;

drop policy if exists feedback_answer_events_select_vorstand
  on public.feedback_answer_events;

create policy feedback_answer_events_select_vorstand
  on public.feedback_answer_events
  for select
  to authenticated
  using (public.is_vorstand());

-- ---------------------------------------------------------------------------
-- set_event_feedback_answer
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
    and member_id = v_member_id
  for update;

  v_from_answer :=
    nullif(
      lower(trim(coalesce(v_current.answer, ''))),
      ''
    );

  -- Serientermine: unverändertes Upsert/Delete (kein Phase-4a/4b-Eingriff)
  if v_recurring is true then

    if v_to_answer is null then

      delete from public.feedback_answers
      where module_id = p_module_id
        and member_id = v_member_id;

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
      v_member_id,
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

  -- Phase 4a — Einzeltermine
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
      and member_id = v_member_id;

    v_result := null;

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
      v_member_id,
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
    v_member_id,
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

revoke all on function public.set_event_feedback_answer(
  bigint, text, text, text
) from public;

grant execute on function public.set_event_feedback_answer(
  bigint, text, text, text
) to authenticated;

-- ---------------------------------------------------------------------------
-- list_feedback_participation_changes (Backoffice)
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
          and coalesce(t.recurring, false) is not true
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

revoke all on function public.list_feedback_participation_changes(
  bigint, integer, integer
) from public;

grant execute on function public.list_feedback_participation_changes(
  bigint, integer, integer
) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS: Direktes Schreiben für Einzeltermin-Zusagen sperren
-- ---------------------------------------------------------------------------

drop policy if exists feedback_answers_insert_own
  on public.feedback_answers;

create policy feedback_answers_insert_own
  on public.feedback_answers
  for insert
  to authenticated
  with check (
    member_id in (
      select m.id
      from public.members m
      where lower(trim(m.email)) = lower(trim(auth.jwt()->>'email'))
    )
    and not public.feedback_answer_requires_rpc(module_id)
  );

drop policy if exists feedback_answers_update_own
  on public.feedback_answers;

create policy feedback_answers_update_own
  on public.feedback_answers
  for update
  to authenticated
  using (
    member_id in (
      select m.id
      from public.members m
      where lower(trim(m.email)) = lower(trim(auth.jwt()->>'email'))
    )
  )
  with check (
    member_id in (
      select m.id
      from public.members m
      where lower(trim(m.email)) = lower(trim(auth.jwt()->>'email'))
    )
    and not public.feedback_answer_requires_rpc(module_id)
  );

drop policy if exists feedback_answers_delete_own
  on public.feedback_answers;

create policy feedback_answers_delete_own
  on public.feedback_answers
  for delete
  to authenticated
  using (
    member_id in (
      select m.id
      from public.members m
      where lower(trim(m.email)) = lower(trim(auth.jwt()->>'email'))
    )
    and not public.feedback_answer_requires_rpc(module_id)
  );

-- ---------------------------------------------------------------------------
-- anonymize_member: Freitext in Events entfernen
-- ---------------------------------------------------------------------------

create or replace function public.anonymize_member(
  p_member_id bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_email text;
  v_member_id bigint;
  v_auth_email text;
  v_rolle text;
  v_anonymized_at timestamptz;
begin
  v_caller_email :=
    lower(trim(coalesce(auth.jwt()->>'email', '')));

  if v_caller_email = '' then
    raise exception 'Nicht angemeldet.';
  end if;

  if p_member_id is not null then

    if not public.is_vorstand() then
      raise exception 'Keine Berechtigung.';
    end if;

    v_member_id := p_member_id;

  else

    select id
    into v_member_id
    from public.members
    where lower(trim(email)) = v_caller_email
      and anonymized_at is null
    limit 1;

  end if;

  if v_member_id is null then
    raise exception 'Mitglied nicht gefunden.';
  end if;

  select
    lower(trim(coalesce(email, ''))),
    lower(trim(coalesce(rolle, ''))),
    anonymized_at
  into
    v_auth_email,
    v_rolle,
    v_anonymized_at
  from public.members
  where id = v_member_id;

  if v_anonymized_at is not null then
    return jsonb_build_object(
      'ok', true,
      'member_id', v_member_id,
      'already_anonymized', true,
      'auth_email', null
    );
  end if;

  if p_member_id is null then

    if v_rolle <> 'public' then
      raise exception
        'Nur externe Teilnehmer können ihr Konto selbst löschen.';
    end if;

  end if;

  if to_regclass('public."PushSubscriptions"') is not null then
    delete from public."PushSubscriptions"
    where member_id = v_member_id;
  end if;

  update public.feedback_answers
  set comment = null
  where member_id = v_member_id;

  update public.feedback_answer_events
  set
    comment = null,
    cancellation_reason_code = null
  where member_id = v_member_id;

  update public.members
  set
    email = null,
    vorname = null,
    nachname = null,
    mitgliedsnummer = null,
    abteilung = null,
    strasse = null,
    hausnummer = null,
    plz = null,
    wohnort = null,
    geburtsdatum = null,
    telefonnummer = null,
    einwilligung_kontakt = false,
    kontakt_eingewilligt_am = null,
    einwilligung_bilder = false,
    bilder_eingewilligt_am = null,
    anonymized_at = now()
  where id = v_member_id;

  return jsonb_build_object(
    'ok', true,
    'member_id', v_member_id,
    'already_anonymized', false,
    'auth_email',
      nullif(v_auth_email, '')
  );
end;
$$;
