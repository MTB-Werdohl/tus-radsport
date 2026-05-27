-- Phase 2: Sichtbarkeit für News und Termine
-- Werte: public | members | draft

create or replace function public.is_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.members
    where lower(trim(email)) = lower(trim(auth.jwt()->>'email'))
  );
$$;

revoke all on function public.is_member() from public;
grant execute on function public.is_member() to authenticated;

-- Spalte sichtbarkeit
alter table "News"
  add column if not exists sichtbarkeit text;

alter table "Termine"
  add column if not exists sichtbarkeit text;

-- Bestehende News aus published übernehmen
update "News"
set sichtbarkeit = case
  when published = true then 'public'
  else 'draft'
end
where sichtbarkeit is null;

-- Bestehende Termine waren öffentlich
update "Termine"
set sichtbarkeit = 'public'
where sichtbarkeit is null;

alter table "News"
  alter column sichtbarkeit set default 'draft';

alter table "Termine"
  alter column sichtbarkeit set default 'public';

-- News SELECT
drop policy if exists "Public News lesen" on "News";
drop policy if exists news_select_authenticated on "News";

create policy news_select_anon
  on "News"
  for select
  to anon
  using (sichtbarkeit = 'public');

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
  );

-- Termine SELECT
drop policy if exists "Public Termine lesen" on "Termine";

create policy termine_select_anon
  on "Termine"
  for select
  to anon
  using (sichtbarkeit = 'public');

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
  );
