-- Termin-Rückblicke (Historie) — Phase 0
-- Nach supabase-member-content.sql (get_auth_member_id, created_by auf Termine)
-- und supabase-anonymize-upcoming-feedback.sql (is_termin_still_upcoming)
-- Siehe docs/supabase/RUNBOOK.md, docs/FACHKONZEPT-TERMIN-RECAPS.md
-- Idempotent — sicher mehrfach ausführbar.

-- ---------------------------------------------------------------------------
-- Hilfsfunktion: Einzeltermin in der Vergangenheit, kein Entwurf
-- ---------------------------------------------------------------------------

create or replace function public.termin_allows_recap(
  p_termin public."Termine"
)
returns boolean
language plpgsql
stable
set search_path = public
as $$
begin

  if coalesce(p_termin.recurring, false) is true then
    return false;
  end if;

  if trim(coalesce(p_termin.sichtbarkeit, '')) = 'draft' then
    return false;
  end if;

  if public.is_termin_still_upcoming(p_termin) then
    return false;
  end if;

  return true;

end;
$$;

comment on function public.termin_allows_recap(public."Termine") is
  'true nur für vergangene Einzeltermine mit sichtbarkeit public oder members.';

revoke all on function public.termin_allows_recap(public."Termine") from public;

grant execute on function public.termin_allows_recap(public."Termine")
  to authenticated;

-- ---------------------------------------------------------------------------
-- Hilfsfunktion: eingeloggtes Mitglied ist Ersteller des Termins
-- ---------------------------------------------------------------------------

create or replace function public.recap_member_owns_termin(
  p_termin_id bigint
)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public."Termine" t
    where t.id = p_termin_id
      and t.created_by = public.get_auth_member_id()
  );
$$;

revoke all on function public.recap_member_owns_termin(bigint) from public;

grant execute on function public.recap_member_owns_termin(bigint)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Tabellen (vor can_select_termin_recap — Composite-Typ termin_recaps)
-- ---------------------------------------------------------------------------

-- Tabelle termin_recaps (1:1 mit Termine)

create table if not exists public.termin_recaps (
  id bigint generated always as identity primary key,
  termin_id bigint not null
    references public."Termine"(id)
    on delete cascade,
  headline text,
  body text not null default '',
  status text not null default 'draft'
    check (status in ('draft', 'published')),
  created_by bigint
    references public.members(id)
    on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint termin_recaps_termin_id_unique unique (termin_id)
);

comment on table public.termin_recaps is
  'Rückblick zu einem Termin — eigener Status und Freigabe, 1:1 mit Termine.';

comment on column public.termin_recaps.headline is
  'Optionale Überschrift; leer = Termintitel in der Anzeige.';

comment on column public.termin_recaps.body is
  'Bericht (Markdown). Phase 1 Veröffentlichung: mindestens 100 Zeichen (trim).';

comment on column public.termin_recaps.status is
  'draft = Entwurf; published = öffentlich sichtbar (wenn Termin lesbar).';

comment on column public.termin_recaps.created_by is
  'Ersteller; Phase 2: Termin.created_by. Vorstand kann abweichend setzen.';

-- Phase 1 Veröffentlichungsqualität (App/RPC, kein DB-CHECK in Phase 0):
-- mindestens 1 Zeile in termin_recap_images UND length(trim(body)) >= 100

create index if not exists termin_recaps_status_published_at_idx
  on public.termin_recaps (status, published_at desc nulls last);

create index if not exists termin_recaps_created_by_idx
  on public.termin_recaps (created_by);

-- ---------------------------------------------------------------------------
-- Tabelle termin_recap_images (1:n)
-- ---------------------------------------------------------------------------

create table if not exists public.termin_recap_images (
  id bigint generated always as identity primary key,
  recap_id bigint not null
    references public.termin_recaps(id)
    on delete cascade,
  storage_path text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint termin_recap_images_storage_path_unique unique (storage_path)
);

comment on table public.termin_recap_images is
  'Bilder eines Rückblicks — Pfade unter media/recaps/{termin_id}/.';

create index if not exists termin_recap_images_recap_sort_idx
  on public.termin_recap_images (recap_id, sort_order, id);

-- ---------------------------------------------------------------------------
-- Hilfsfunktion: Leserechte für Rückblicke (getrennt von Termine-RLS)
-- ---------------------------------------------------------------------------

create or replace function public.can_select_termin_recap(
  p_recap public.termin_recaps
)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select
    public.is_vorstand()
    or (
      p_recap.status = 'published'
      and exists (
        select 1
        from public."Termine" t
        where t.id = p_recap.termin_id
          and (
            t.sichtbarkeit = 'public'
            or (
              t.sichtbarkeit = 'members'
              and public.is_member()
            )
          )
      )
    )
    or (
      p_recap.status = 'draft'
      and p_recap.created_by = public.get_auth_member_id()
      and public.recap_member_owns_termin(p_recap.termin_id)
    );
$$;

comment on function public.can_select_termin_recap(public.termin_recaps) is
  'Öffentlich: published + public-Termin. Mitglieder: + members-Termine. Eigene Entwürfe.';

revoke all on function public.can_select_termin_recap(public.termin_recaps) from public;

grant execute on function public.can_select_termin_recap(public.termin_recaps)
  to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Trigger: created_by (Anti-Spoofing, Ausrichtung an Termin-Ersteller)
-- ---------------------------------------------------------------------------

create or replace function public.set_recap_created_by()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_id bigint;
  v_termin_creator bigint;
begin

  v_member_id :=
    public.get_auth_member_id();

  if v_member_id is null then
    return new;
  end if;

  select t.created_by
  into v_termin_creator
  from public."Termine" t
  where t.id = new.termin_id;

  if new.created_by is null then
    new.created_by :=
      coalesce(v_termin_creator, v_member_id);
  elsif new.created_by <> v_member_id
    and not public.is_vorstand() then
    raise exception 'created_by darf nicht geändert werden';
  end if;

  return new;

end;
$$;

drop trigger if exists termin_recaps_set_created_by on public.termin_recaps;

create trigger termin_recaps_set_created_by
  before insert on public.termin_recaps
  for each row
  execute function public.set_recap_created_by();

-- ---------------------------------------------------------------------------
-- Trigger: updated_at, published_at
-- ---------------------------------------------------------------------------

create or replace function public.touch_termin_recap()
returns trigger
language plpgsql
set search_path = public
as $$
begin

  new.updated_at := now();

  if new.status = 'published'
    and (
      tg_op = 'INSERT'
      or old.status is distinct from 'published'
    ) then
    new.published_at :=
      coalesce(new.published_at, now());
  end if;

  if new.status = 'draft' then
    new.published_at := null;
  end if;

  return new;

end;
$$;

drop trigger if exists termin_recaps_touch on public.termin_recaps;

create trigger termin_recaps_touch
  before insert or update on public.termin_recaps
  for each row
  execute function public.touch_termin_recap();

-- ---------------------------------------------------------------------------
-- RLS termin_recaps
-- ---------------------------------------------------------------------------

alter table public.termin_recaps enable row level security;

drop policy if exists termin_recaps_select_anon on public.termin_recaps;

create policy termin_recaps_select_anon
  on public.termin_recaps
  for select
  to anon
  using (public.can_select_termin_recap(termin_recaps.*));

drop policy if exists termin_recaps_select_authenticated on public.termin_recaps;

create policy termin_recaps_select_authenticated
  on public.termin_recaps
  for select
  to authenticated
  using (public.can_select_termin_recap(termin_recaps.*));

drop policy if exists termin_recaps_insert_vorstand on public.termin_recaps;

create policy termin_recaps_insert_vorstand
  on public.termin_recaps
  for insert
  to authenticated
  with check (
    public.is_vorstand()
    and exists (
      select 1
      from public."Termine" t
      where t.id = termin_id
        and public.termin_allows_recap(t)
    )
  );

drop policy if exists termin_recaps_update_vorstand on public.termin_recaps;

create policy termin_recaps_update_vorstand
  on public.termin_recaps
  for update
  to authenticated
  using (public.is_vorstand())
  with check (
    public.is_vorstand()
    and exists (
      select 1
      from public."Termine" t
      where t.id = termin_id
        and public.termin_allows_recap(t)
    )
  );

drop policy if exists termin_recaps_delete_vorstand on public.termin_recaps;

create policy termin_recaps_delete_vorstand
  on public.termin_recaps
  for delete
  to authenticated
  using (public.is_vorstand());

drop policy if exists termin_recaps_insert_member_draft on public.termin_recaps;

create policy termin_recaps_insert_member_draft
  on public.termin_recaps
  for insert
  to authenticated
  with check (
    public.is_club_member()
    and status = 'draft'
    and (
      created_by is null
      or created_by = public.get_auth_member_id()
    )
    and public.recap_member_owns_termin(termin_id)
    and exists (
      select 1
      from public."Termine" t
      where t.id = termin_id
        and public.termin_allows_recap(t)
    )
  );

drop policy if exists termin_recaps_update_member_draft on public.termin_recaps;

create policy termin_recaps_update_member_draft
  on public.termin_recaps
  for update
  to authenticated
  using (
    public.is_club_member()
    and status = 'draft'
    and created_by = public.get_auth_member_id()
    and public.recap_member_owns_termin(termin_id)
  )
  with check (
    status = 'draft'
    and created_by = public.get_auth_member_id()
    and public.recap_member_owns_termin(termin_id)
    and exists (
      select 1
      from public."Termine" t
      where t.id = termin_id
        and public.termin_allows_recap(t)
    )
  );

drop policy if exists termin_recaps_delete_member_draft on public.termin_recaps;

create policy termin_recaps_delete_member_draft
  on public.termin_recaps
  for delete
  to authenticated
  using (
    public.is_club_member()
    and status = 'draft'
    and created_by = public.get_auth_member_id()
    and public.recap_member_owns_termin(termin_id)
  );

-- ---------------------------------------------------------------------------
-- RLS termin_recap_images
-- ---------------------------------------------------------------------------

alter table public.termin_recap_images enable row level security;

drop policy if exists termin_recap_images_select_anon on public.termin_recap_images;

create policy termin_recap_images_select_anon
  on public.termin_recap_images
  for select
  to anon
  using (
    exists (
      select 1
      from public.termin_recaps r
      where r.id = recap_id
        and public.can_select_termin_recap(r.*)
    )
  );

drop policy if exists termin_recap_images_select_authenticated on public.termin_recap_images;

create policy termin_recap_images_select_authenticated
  on public.termin_recap_images
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.termin_recaps r
      where r.id = recap_id
        and public.can_select_termin_recap(r.*)
    )
  );

drop policy if exists termin_recap_images_insert_vorstand on public.termin_recap_images;

create policy termin_recap_images_insert_vorstand
  on public.termin_recap_images
  for insert
  to authenticated
  with check (
    public.is_vorstand()
    and exists (
      select 1
      from public.termin_recaps r
      join public."Termine" t on t.id = r.termin_id
      where r.id = recap_id
        and public.termin_allows_recap(t)
    )
  );

drop policy if exists termin_recap_images_update_vorstand on public.termin_recap_images;

create policy termin_recap_images_update_vorstand
  on public.termin_recap_images
  for update
  to authenticated
  using (public.is_vorstand())
  with check (
    public.is_vorstand()
    and exists (
      select 1
      from public.termin_recaps r
      join public."Termine" t on t.id = r.termin_id
      where r.id = recap_id
        and public.termin_allows_recap(t)
    )
  );

drop policy if exists termin_recap_images_delete_vorstand on public.termin_recap_images;

create policy termin_recap_images_delete_vorstand
  on public.termin_recap_images
  for delete
  to authenticated
  using (public.is_vorstand());

drop policy if exists termin_recap_images_insert_member_draft on public.termin_recap_images;

create policy termin_recap_images_insert_member_draft
  on public.termin_recap_images
  for insert
  to authenticated
  with check (
    public.is_club_member()
    and exists (
      select 1
      from public.termin_recaps r
      join public."Termine" t on t.id = r.termin_id
      where r.id = recap_id
        and r.status = 'draft'
        and r.created_by = public.get_auth_member_id()
        and t.created_by = public.get_auth_member_id()
        and public.termin_allows_recap(t)
    )
  );

drop policy if exists termin_recap_images_update_member_draft on public.termin_recap_images;

create policy termin_recap_images_update_member_draft
  on public.termin_recap_images
  for update
  to authenticated
  using (
    public.is_club_member()
    and exists (
      select 1
      from public.termin_recaps r
      join public."Termine" t on t.id = r.termin_id
      where r.id = recap_id
        and r.status = 'draft'
        and r.created_by = public.get_auth_member_id()
        and t.created_by = public.get_auth_member_id()
    )
  )
  with check (
    public.is_club_member()
    and exists (
      select 1
      from public.termin_recaps r
      join public."Termine" t on t.id = r.termin_id
      where r.id = recap_id
        and r.status = 'draft'
        and r.created_by = public.get_auth_member_id()
        and t.created_by = public.get_auth_member_id()
    )
  );

drop policy if exists termin_recap_images_delete_member_draft on public.termin_recap_images;

create policy termin_recap_images_delete_member_draft
  on public.termin_recap_images
  for delete
  to authenticated
  using (
    public.is_club_member()
    and exists (
      select 1
      from public.termin_recaps r
      join public."Termine" t on t.id = r.termin_id
      where r.id = recap_id
        and r.status = 'draft'
        and r.created_by = public.get_auth_member_id()
        and t.created_by = public.get_auth_member_id()
    )
  );
