-- Schritt 0 (optional, falls noch nicht im Dashboard gesetzt):
-- Öffentliches Lesen für Galerie, site_state und Storage media
-- Idempotent — sicher mehrfach ausführbar.

-- Galerien
drop policy if exists "Public read galleries" on public.galleries;
create policy "Public read galleries"
  on public.galleries
  for select
  to public
  using (true);

-- Galerie-Bilder
drop policy if exists "Public read gallery images" on public.gallery_images;
create policy "Public read gallery images"
  on public.gallery_images
  for select
  to public
  using (true);

-- Letzte Push-Meldung für Widget (nur Key last_push)
drop policy if exists public_can_read_last_push on public.site_state;
drop policy if exists site_state_read_last_push_authenticated on public.site_state;

create policy public_can_read_last_push
  on public.site_state
  for select
  to anon
  using (key = 'last_push');

create policy site_state_read_last_push_authenticated
  on public.site_state
  for select
  to authenticated
  using (key = 'last_push');

-- Storage: öffentliche URLs für media-Bucket
drop policy if exists "Public gallery access" on storage.objects;
create policy "Public gallery access"
  on storage.objects
  for select
  to public
  using (bucket_id = 'media');
