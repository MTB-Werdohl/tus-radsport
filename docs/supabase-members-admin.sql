-- Mitglieder-Verwaltung im Admin (Vorstand)
-- Voraussetzung: public.is_vorstand() existiert (docs/supabase-vorstand-roles.sql)

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

-- Push-Abos vor dem Löschen eines Mitglieds entfernen
drop policy if exists push_subscriptions_delete_vorstand on "PushSubscriptions";

create policy push_subscriptions_delete_vorstand
  on "PushSubscriptions"
  for delete
  to authenticated
  using (public.is_vorstand());
