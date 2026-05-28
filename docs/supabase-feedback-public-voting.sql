-- Feedback: optionale öffentliche Abstimmung
-- Nach supabase-feedback.sql ausführen
-- Anschließend: docs/supabase-members-public-role.sql
-- Falls bereits supabase-feedback-public-voting.sql (alt) gelaufen:
--   docs/supabase-feedback-answers-unique-fix.sql ausführen

alter table public.feedback_modules
  add column if not exists public_voting
  boolean not null default false;

comment on column public.feedback_modules.public_voting is
  'true = externe Teilnehmer mit Name/E-Mail (members.rolle = public). false = nur Vereinsmitglieder.';
