-- Mehrtages-Termine: endDate (Einzeltermin) + durationDays (wiederkehrend)
-- Siehe docs/supabase/RUNBOOK.md

alter table "Termine"
  add column if not exists "endDate" date;

alter table "Termine"
  add column if not exists "durationDays" integer;
