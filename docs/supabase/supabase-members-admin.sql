-- Schritt 4 — Vorstand: Mitglieder verwalten
-- Siehe docs/supabase/RUNBOOK.md

drop policy if exists members_select_vorstand on public.members;
drop policy if exists members_insert_vorstand on public.members;
drop policy if exists members_update_vorstand on public.members;
drop policy if exists members_delete_vorstand on public.members;

create policy members_select_vorstand
  on public.members
  for select
  to authenticated
  using (public.is_vorstand());

create policy members_insert_vorstand
  on public.members
  for insert
  to authenticated
  with check (public.is_vorstand());

create policy members_update_vorstand
  on public.members
  for update
  to authenticated
  using (public.is_vorstand())
  with check (public.is_vorstand());

create policy members_delete_vorstand
  on public.members
  for delete
  to authenticated
  using (public.is_vorstand());
