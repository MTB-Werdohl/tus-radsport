-- Internes-Polls: entity_type 'news' für feedback_modules erlauben
-- Fehler ohne dieses Skript:
--   feedback_modules_entity_type_check
-- (Constraint kannte nur 'event')
-- Siehe docs/supabase/RUNBOOK.md

alter table public.feedback_modules
  drop constraint if exists feedback_modules_entity_type_check;

alter table public.feedback_modules
  add constraint feedback_modules_entity_type_check
  check (entity_type in ('event', 'news'));

comment on column public.feedback_modules.entity_type is
  'Logische Entität: event → Termine.id, news → News.id (kein DB-FK).';
