-- Phase 3 — Profilbilder (Avatars)
-- Nach supabase-strava-public.sql und supabase-members-anonymize.sql ausführen
-- Siehe docs/PHASE-3-IMPLEMENTATION.md

-- ---------------------------------------------------------------------------
-- members: Avatar-Spalten (getrennt von einwilligung_bilder / Tourfotos)
-- ---------------------------------------------------------------------------

alter table public.members
  add column if not exists avatar_storage_path text,
  add column if not exists avatar_updated_at timestamptz,
  add column if not exists avatar_source text,
  add column if not exists avatar_consent_at timestamptz;

comment on column public.members.avatar_storage_path is
  'Pfad im Storage-Bucket avatars, z. B. {member_id}/avatar.webp';

comment on column public.members.avatar_source is
  'upload | strava | admin';

-- ---------------------------------------------------------------------------
-- Hilfsfunktionen
-- ---------------------------------------------------------------------------

create or replace function public.get_own_member_id()
returns bigint
language sql
security definer
set search_path = public
set row_security = off
stable
as $$
  select m.id
  from public.members m
  where lower(trim(m.email)) = lower(trim(auth.jwt()->>'email'))
    and m.anonymized_at is null
  limit 1;
$$;

revoke all on function public.get_own_member_id() from public;
grant execute on function public.get_own_member_id() to authenticated;

comment on function public.get_own_member_id is
  'Eigene member_id aus JWT-E-Mail; für Storage-RLS und Profil-RPCs.';

create or replace function public.build_avatar_public_url(
  p_storage_path text,
  p_updated_at timestamptz default null
)
returns text
language sql
immutable
as $$
  select case
    when p_storage_path is null
      or trim(p_storage_path) = '' then
      null
    else
      'https://eazizesytrnknbgrnggj.supabase.co/storage/v1/object/public/avatars/'
      || trim(p_storage_path)
      || case
        when p_updated_at is not null then
          '?t='
          || floor(extract(epoch from p_updated_at))::bigint::text
        else
          ''
      end
  end;
$$;

comment on function public.build_avatar_public_url is
  'Öffentliche Avatar-URL für RPCs (Cache-Busting via avatar_updated_at).';

-- ---------------------------------------------------------------------------
-- Storage-Bucket avatars
-- ---------------------------------------------------------------------------

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'avatars',
  'avatars',
  true,
  2097152,
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Öffentliches Lesen
drop policy if exists avatars_select_public on storage.objects;

create policy avatars_select_public
  on storage.objects
  for select
  to public
  using (bucket_id = 'avatars');

-- Eigenes Verzeichnis {member_id}/…
drop policy if exists avatars_insert_own on storage.objects;
drop policy if exists avatars_update_own on storage.objects;
drop policy if exists avatars_delete_own on storage.objects;

create policy avatars_insert_own
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1]
      = public.get_own_member_id()::text
  );

create policy avatars_update_own
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1]
      = public.get_own_member_id()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1]
      = public.get_own_member_id()::text
  );

create policy avatars_delete_own
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1]
      = public.get_own_member_id()::text
  );

-- Vorstand: beliebiger Pfad
drop policy if exists avatars_insert_vorstand on storage.objects;
drop policy if exists avatars_update_vorstand on storage.objects;
drop policy if exists avatars_delete_vorstand on storage.objects;

create policy avatars_insert_vorstand
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and public.is_vorstand()
  );

create policy avatars_update_vorstand
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and public.is_vorstand()
  )
  with check (
    bucket_id = 'avatars'
    and public.is_vorstand()
  );

create policy avatars_delete_vorstand
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and public.is_vorstand()
  );

-- ---------------------------------------------------------------------------
-- Öffentliche RPCs: avatar_url wenn avatar_storage_path gesetzt
-- (ohne einwilligung_bilder; Opt-ins publish_feed / publish_rankings unverändert)
-- ---------------------------------------------------------------------------

create or replace function public.get_public_activity_feed(
  p_days integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_days integer;
begin
  v_days :=
    coalesce(nullif(p_days, 0), 90);

  if v_days < 1 or v_days > 365 then
    v_days := 90;
  end if;

  return coalesce(
    (
      select jsonb_agg(entry order by entry->>'start_date' desc)
      from (
        select jsonb_build_object(
          'id', a.id,
          'member_name',
            trim(
              coalesce(m.vorname, '')
              || ' '
              || coalesce(m.nachname, '')
            ),
          'avatar_url',
            public.build_avatar_public_url(
              m.avatar_storage_path,
              m.avatar_updated_at
            ),
          'activity_name', a.activity_name,
          'activity_type', a.activity_type,
          'distance_m', a.distance_m,
          'moving_time_s', a.moving_time_s,
          'elevation_gain_m', a.elevation_gain_m,
          'start_date', a.start_date
        ) as entry
        from public.activities a
        join public.members m
          on m.id = a.member_id
        where a.deleted_at is null
          and a.sport_category = 'rad'
          and m.anonymized_at is null
          and m.publish_feed is true
          and a.start_date >= (
            now() - (v_days || ' days')::interval
          )
        order by a.start_date desc
        limit 200
      ) rows
    ),
    '[]'::jsonb
  );
end;
$$;

create or replace function public.get_public_activity_detail(
  p_activity_id uuid,
  p_days integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_days integer;
  v_result jsonb;
begin
  if p_activity_id is null then
    return null;
  end if;

  v_days :=
    coalesce(nullif(p_days, 0), 90);

  if v_days < 1 or v_days > 365 then
    v_days := 90;
  end if;

  select jsonb_build_object(
    'id', a.id,
    'member_name',
      trim(
        coalesce(m.vorname, '')
        || ' '
        || coalesce(m.nachname, '')
      ),
    'avatar_url',
      public.build_avatar_public_url(
        m.avatar_storage_path,
        m.avatar_updated_at
      ),
    'activity_name', a.activity_name,
    'activity_type', a.activity_type,
    'distance_m', a.distance_m,
    'moving_time_s', a.moving_time_s,
    'elevation_gain_m', a.elevation_gain_m,
    'start_date', a.start_date
  )
  into v_result
  from public.activities a
  join public.members m
    on m.id = a.member_id
  where a.id = p_activity_id
    and a.deleted_at is null
    and a.sport_category = 'rad'
    and m.anonymized_at is null
    and m.publish_feed is true
    and a.start_date >= (
      now() - (v_days || ' days')::interval
    );

  return v_result;
end;
$$;

create or replace function public.get_public_member_rankings(
  p_year integer,
  p_month integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  if p_year is null or p_year < 2000 or p_year > 2100 then
    return '[]'::jsonb;
  end if;

  if p_month is not null then

    if p_month < 1 or p_month > 12 then
      return '[]'::jsonb;
    end if;

    return coalesce(
      (
        select jsonb_agg(entry order by (entry->>'rank')::integer)
        from (
          select jsonb_build_object(
            'rank', ranked.rn,
            'member_name', ranked.member_name,
            'avatar_url', ranked.avatar_url,
            'total_distance_m', ranked.total_distance_m,
            'total_elevation_m', ranked.total_elevation_m,
            'activity_count', ranked.activity_count
          ) as entry
          from (
            select
              row_number() over (
                order by
                  s.total_distance_m desc,
                  s.activity_count desc,
                  s.member_id
              ) as rn,
              trim(
                coalesce(m.vorname, '')
                || ' '
                || coalesce(m.nachname, '')
              ) as member_name,
              public.build_avatar_public_url(
                m.avatar_storage_path,
                m.avatar_updated_at
              ) as avatar_url,
              s.total_distance_m,
              s.total_elevation_m,
              s.activity_count
            from public.member_stats_month s
            join public.members m
              on m.id = s.member_id
            where s.year = p_year
              and s.month = p_month
              and s.sport_category = 'rad'
              and m.anonymized_at is null
              and m.publish_rankings is true
              and s.activity_count > 0
          ) ranked
        ) rows
      ),
      '[]'::jsonb
    );

  end if;

  return coalesce(
    (
      select jsonb_agg(entry order by (entry->>'rank')::integer)
      from (
        select jsonb_build_object(
          'rank', ranked.rn,
          'member_name', ranked.member_name,
          'avatar_url', ranked.avatar_url,
          'total_distance_m', ranked.total_distance_m,
          'total_elevation_m', ranked.total_elevation_m,
          'activity_count', ranked.activity_count
        ) as entry
        from (
          select
            row_number() over (
              order by
                s.total_distance_m desc,
                s.activity_count desc,
                s.member_id
            ) as rn,
            trim(
              coalesce(m.vorname, '')
              || ' '
              || coalesce(m.nachname, '')
            ) as member_name,
            public.build_avatar_public_url(
              m.avatar_storage_path,
              m.avatar_updated_at
            ) as avatar_url,
            s.total_distance_m,
            s.total_elevation_m,
            s.activity_count
          from public.member_stats_year s
          join public.members m
            on m.id = s.member_id
          where s.year = p_year
            and s.sport_category = 'rad'
            and m.anonymized_at is null
            and m.publish_rankings is true
            and s.activity_count > 0
        ) ranked
      ) rows
    ),
    '[]'::jsonb
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Profil-RPC: eigenes Avatar (optional, für Client ohne direkten Storage-Zugriff)
-- ---------------------------------------------------------------------------

create or replace function public.get_member_profile_avatar()
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_member_id bigint;
  v_row public.members%rowtype;
begin
  v_member_id :=
    public.get_own_member_id();

  if v_member_id is null then
    raise exception 'Mitglied nicht gefunden.';
  end if;

  select *
  into v_row
  from public.members
  where id = v_member_id;

  return jsonb_build_object(
    'avatar_storage_path', v_row.avatar_storage_path,
    'avatar_updated_at', v_row.avatar_updated_at,
    'avatar_source', v_row.avatar_source,
    'avatar_consent_at', v_row.avatar_consent_at,
    'avatar_url',
      public.build_avatar_public_url(
        v_row.avatar_storage_path,
        v_row.avatar_updated_at
      ),
    'initials',
      upper(
        left(trim(coalesce(v_row.vorname, '')), 1)
        || left(trim(coalesce(v_row.nachname, '')), 1)
      )
  );
end;
$$;

revoke all on function public.get_member_profile_avatar() from public;
grant execute on function public.get_member_profile_avatar() to authenticated;

comment on function public.get_member_profile_avatar is
  'Eigenes Profilbild-Metadaten für Profil-Tab (Mitglied/Vorstand).';

-- ---------------------------------------------------------------------------
-- anonymize_member: Avatar-Felder nullen + Storage-Objekt löschen
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
  v_avatar_path text;
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
    anonymized_at,
    avatar_storage_path
  into
    v_auth_email,
    v_rolle,
    v_anonymized_at,
    v_avatar_path
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

  if v_avatar_path is not null then
    delete from storage.objects
    where bucket_id = 'avatars'
      and name = v_avatar_path;
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
    avatar_storage_path = null,
    avatar_updated_at = null,
    avatar_source = null,
    avatar_consent_at = null,
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

comment on function public.get_public_activity_feed is
  'Öffentlicher Feed: publish_feed, soft-delete-frei, Standard 90 Tage; avatar_url wenn gesetzt.';

comment on function public.get_public_activity_detail is
  'Aktivitätsdetail per UUID; nur sichtbare Feed-Einträge; avatar_url wenn gesetzt.';

comment on function public.get_public_member_rankings is
  'Rankings nach Distanz; nur publish_rankings; avatar_url wenn gesetzt.';
