-- Web Push endgültig entfernen + Mitglieder-Löschung reparieren
-- Tröte bleibt in site_state.last_push
--
-- Behebt Fehler beim Anonymisieren/Löschen von Mitgliedern, wenn
-- PushSubscriptions noch mit member_id verknüpft ist.
--
-- Edge Functions send-push, save-push-subscription, delete-push-subscription
-- im Supabase Dashboard optional löschen.

-- ---------------------------------------------------------------------------
-- 1) anonymize_member: Legacy-Push-Abos vor Anonymisierung entfernen
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

-- ---------------------------------------------------------------------------
-- 2) Web-Push-Tabellen entfernen (nur falls noch vorhanden)
-- ---------------------------------------------------------------------------

do $$
begin

  if to_regclass('public."PushSubscriptions"') is not null then

    drop policy if exists push_subscriptions_select_own on public."PushSubscriptions";
    drop policy if exists push_subscriptions_admin_select on public."PushSubscriptions";
    drop policy if exists push_subscriptions_delete_vorstand on public."PushSubscriptions";
    drop policy if exists "PushSubscriptions Admin Select" on public."PushSubscriptions";
    drop policy if exists "PushSubscriptions Public Insert" on public."PushSubscriptions";
    drop policy if exists "PushSubscriptions Public Delete" on public."PushSubscriptions";

    drop table public."PushSubscriptions" cascade;

  end if;

  if to_regclass('public."PushMessages"') is not null then

    drop policy if exists push_messages_select_public on public."PushMessages";
    drop policy if exists push_messages_insert_vorstand on public."PushMessages";
    drop policy if exists "PushMessages Admin Select" on public."PushMessages";
    drop policy if exists "PushMessages Public Insert" on public."PushMessages";

    drop table public."PushMessages" cascade;

  end if;

end $$;

-- site_state.key = 'last_push' bleibt unverändert (Tröte).
