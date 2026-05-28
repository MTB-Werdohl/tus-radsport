-- Schritt 2 — Rollen Vorstand / Mitglied
-- Siehe docs/supabase/RUNBOOK.md

-- Hilfsfunktion: eingeloggter User ist Vorstand
create or replace function public.is_vorstand()
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.members
    where lower(trim(email)) = lower(trim(auth.jwt()->>'email'))
      and lower(trim(rolle)) = 'vorstand'
  );
$$;

revoke all on function public.is_vorstand() from public;
grant execute on function public.is_vorstand() to authenticated;

-- E-Mail-Prüfung vor Admin Magic Link
create or replace function public.check_vorstand_email(check_email text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.members
    where lower(trim(email)) = lower(trim(check_email))
      and lower(trim(rolle)) = 'vorstand'
  );
$$;

revoke all on function public.check_vorstand_email(text) from public;
grant execute on function public.check_vorstand_email(text) to anon, authenticated;

-- Termine: nur Vorstand schreiben
drop policy if exists "Authenticated insert Termine" on "Termine";
drop policy if exists "Authenticated update Termine" on "Termine";
drop policy if exists "Authenticated delete Termine" on "Termine";
drop policy if exists termine_insert_vorstand on "Termine";
drop policy if exists termine_update_vorstand on "Termine";
drop policy if exists termine_delete_vorstand on "Termine";

create policy termine_insert_vorstand
  on "Termine"
  for insert
  to authenticated
  with check (public.is_vorstand());

create policy termine_update_vorstand
  on "Termine"
  for update
  to authenticated
  using (public.is_vorstand())
  with check (public.is_vorstand());

create policy termine_delete_vorstand
  on "Termine"
  for delete
  to authenticated
  using (public.is_vorstand());

-- News: nur Vorstand schreiben; Mitglieder lesen veröffentlichte
drop policy if exists "Authenticated full access News" on "News";
drop policy if exists news_select_authenticated on "News";
drop policy if exists news_insert_vorstand on "News";
drop policy if exists news_update_vorstand on "News";
drop policy if exists news_delete_vorstand on "News";

create policy news_select_authenticated
  on "News"
  for select
  to authenticated
  using (
    public.is_vorstand()
    or published = true
  );

create policy news_insert_vorstand
  on "News"
  for insert
  to authenticated
  with check (public.is_vorstand());

create policy news_update_vorstand
  on "News"
  for update
  to authenticated
  using (public.is_vorstand())
  with check (public.is_vorstand());

create policy news_delete_vorstand
  on "News"
  for delete
  to authenticated
  using (public.is_vorstand());

-- Galerien
drop policy if exists "Authenticated insert galleries" on galleries;
drop policy if exists "Authenticated update galleries" on galleries;
drop policy if exists "Authenticated delete galleries" on galleries;
drop policy if exists galleries_insert_vorstand on galleries;
drop policy if exists galleries_update_vorstand on galleries;
drop policy if exists galleries_delete_vorstand on galleries;

create policy galleries_insert_vorstand
  on galleries
  for insert
  to authenticated
  with check (public.is_vorstand());

create policy galleries_update_vorstand
  on galleries
  for update
  to authenticated
  using (public.is_vorstand())
  with check (public.is_vorstand());

create policy galleries_delete_vorstand
  on galleries
  for delete
  to authenticated
  using (public.is_vorstand());

drop policy if exists "Authenticated insert gallery images" on gallery_images;
drop policy if exists "Authenticated update gallery images" on gallery_images;
drop policy if exists "Authenticated delete gallery images" on gallery_images;
drop policy if exists gallery_images_insert_vorstand on gallery_images;
drop policy if exists gallery_images_update_vorstand on gallery_images;
drop policy if exists gallery_images_delete_vorstand on gallery_images;

create policy gallery_images_insert_vorstand
  on gallery_images
  for insert
  to authenticated
  with check (public.is_vorstand());

create policy gallery_images_update_vorstand
  on gallery_images
  for update
  to authenticated
  using (public.is_vorstand())
  with check (public.is_vorstand());

create policy gallery_images_delete_vorstand
  on gallery_images
  for delete
  to authenticated
  using (public.is_vorstand());

-- site_state: nur Vorstand schreiben
drop policy if exists admin_can_write_site_state on site_state;
drop policy if exists site_state_write_vorstand on site_state;

create policy site_state_write_vorstand
  on site_state
  for all
  to authenticated
  using (public.is_vorstand())
  with check (public.is_vorstand());

-- PushSubscriptions: Vorstand sieht alle (Dashboard)
drop policy if exists push_subscriptions_admin_select on "PushSubscriptions";
drop policy if exists "PushSubscriptions Admin Select" on "PushSubscriptions";

create policy push_subscriptions_admin_select
  on "PushSubscriptions"
  for select
  to authenticated
  using (public.is_vorstand());

-- Storage media: nur Vorstand hochladen/löschen
drop policy if exists "Authenticated upload" on storage.objects;
drop policy if exists "Authenticated delete media" on storage.objects;
drop policy if exists media_insert_vorstand on storage.objects;
drop policy if exists media_delete_vorstand on storage.objects;

create policy media_insert_vorstand
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'media'
    and public.is_vorstand()
  );

create policy media_delete_vorstand
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'media'
    and public.is_vorstand()
  );
