-- Internes (News): nur Mitglieder + Vorstand
-- Siehe docs/supabase/RUNBOOK.md — nach supabase-content-visibility.sql

update public."News"
set sichtbarkeit = 'members'
where sichtbarkeit = 'public'
   or (
     sichtbarkeit is null
     and coalesce(published, false) = true
   );

drop policy if exists news_select_anon on public."News";

create policy news_select_anon
  on public."News"
  for select
  to anon
  using (false);

comment on table public."News" is
  'Internes — Vereinsbeiträge; sichtbarkeit members (veröffentlicht) oder draft (Entwurf). Kein public.';
