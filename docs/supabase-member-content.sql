-- Mitglieder-Inhalte: Ersteller-Metadaten + Entwürfe einreichen
-- Siehe docs/supabase/RUNBOOK.md

-- ---------------------------------------------------------------------------
-- Spalte created_by
-- ---------------------------------------------------------------------------

alter table "News"
  add column if not exists created_by bigint
  references public.members(id)
  on delete set null;

alter table "Termine"
  add column if not exists created_by bigint
  references public.members(id)
  on delete set null;

create index if not exists news_created_by_idx
  on "News" (created_by);

create index if not exists termine_created_by_idx
  on "Termine" (created_by);

comment on column "News".created_by is
  'Mitglied/Vorstand, das den Beitrag angelegt hat.';

comment on column "Termine".created_by is
  'Mitglied/Vorstand, das den Termin angelegt hat.';

-- ---------------------------------------------------------------------------
-- Hilfsfunktion: Member-ID des eingeloggten Users
-- ---------------------------------------------------------------------------

create or replace function public.get_auth_member_id()
returns bigint
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select m.id
  from public.members m
  where lower(trim(m.email)) = lower(trim(auth.jwt() ->> 'email'))
    and m.anonymized_at is null
  limit 1;
$$;

comment on function public.get_auth_member_id() is
  'ID in members für den aktuellen Auth-User (null wenn kein Mitglied).';

revoke all on function public.get_auth_member_id() from public;

grant execute on function public.get_auth_member_id()
  to authenticated;

-- ---------------------------------------------------------------------------
-- Trigger: created_by beim INSERT setzen (Anti-Spoofing)
-- ---------------------------------------------------------------------------

create or replace function public.set_content_created_by()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_id bigint;
begin

  v_member_id :=
    public.get_auth_member_id();

  if v_member_id is null then
    return new;
  end if;

  if new.created_by is null then
    new.created_by := v_member_id;
  elsif new.created_by <> v_member_id
    and not public.is_vorstand() then
    raise exception 'created_by darf nicht geändert werden';
  end if;

  return new;

end;
$$;

drop trigger if exists news_set_created_by on "News";

create trigger news_set_created_by
  before insert on "News"
  for each row
  execute function public.set_content_created_by();

drop trigger if exists termine_set_created_by on "Termine";

create trigger termine_set_created_by
  before insert on "Termine"
  for each row
  execute function public.set_content_created_by();

-- ---------------------------------------------------------------------------
-- SELECT: eigene Einreichungen unabhängig von sichtbarkeit
-- ---------------------------------------------------------------------------

drop policy if exists news_select_authenticated on "News";

create policy news_select_authenticated
  on "News"
  for select
  to authenticated
  using (
    public.is_vorstand()
    or sichtbarkeit = 'public'
    or (
      sichtbarkeit = 'members'
      and public.is_member()
    )
    or created_by = public.get_auth_member_id()
  );

drop policy if exists termine_select_authenticated on "Termine";

create policy termine_select_authenticated
  on "Termine"
  for select
  to authenticated
  using (
    public.is_vorstand()
    or sichtbarkeit = 'public'
    or (
      sichtbarkeit = 'members'
      and public.is_member()
    )
    or created_by = public.get_auth_member_id()
  );

-- ---------------------------------------------------------------------------
-- INSERT / UPDATE / DELETE: Vereinsmitglieder — nur Termin-Entwürfe, nur eigene
-- Internes (News): nur Vorstand — siehe supabase-vorstand-roles.sql
-- ---------------------------------------------------------------------------

drop policy if exists news_insert_member_draft on "News";
drop policy if exists news_update_member_draft on "News";
drop policy if exists news_delete_member_draft on "News";

drop policy if exists termine_insert_member_draft on "Termine";

create policy termine_insert_member_draft
  on "Termine"
  for insert
  to authenticated
  with check (
    public.is_club_member()
    and sichtbarkeit = 'draft'
    and (
      created_by is null
      or created_by = public.get_auth_member_id()
    )
  );

drop policy if exists termine_update_member_draft on "Termine";

create policy termine_update_member_draft
  on "Termine"
  for update
  to authenticated
  using (
    public.is_club_member()
    and created_by = public.get_auth_member_id()
    and sichtbarkeit = 'draft'
  )
  with check (
    created_by = public.get_auth_member_id()
    and sichtbarkeit = 'draft'
  );

drop policy if exists termine_delete_member_draft on "Termine";

create policy termine_delete_member_draft
  on "Termine"
  for delete
  to authenticated
  using (
    public.is_club_member()
    and created_by = public.get_auth_member_id()
    and sichtbarkeit = 'draft'
  );
