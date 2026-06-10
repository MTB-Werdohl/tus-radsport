-- Phase 5: Website-Hinweise (site_state Keys)
-- Idempotent — nach supabase-public-read.sql ausführen.

drop policy if exists public_can_read_site_content on public.site_state;
drop policy if exists site_state_read_site_content_authenticated on public.site_state;

create policy public_can_read_site_content
  on public.site_state
  for select
  to anon
  using (
    key in (
      'site_banner',
      'saison_mode',
      'landing_hints',
      'site_overlay'
    )
  );

create policy site_state_read_site_content_authenticated
  on public.site_state
  for select
  to authenticated
  using (
    key in (
      'site_banner',
      'saison_mode',
      'landing_hints',
      'site_overlay'
    )
  );

comment on table public.site_state is
  'Key-Value-Konfiguration: last_push (Tröte), site_banner, saison_mode, landing_hints, site_overlay.';
