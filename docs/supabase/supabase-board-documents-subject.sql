-- Kurzbeschreibung für Protokoll-Listen (z. B. „Trikots“)
-- Einmal im Supabase SQL Editor ausführen

alter table public.board_documents
  add column if not exists subject text not null default '';

comment on column public.board_documents.subject is
  'Kurzbeschreibung für Listen- und Detailtitel, z. B. Trikots.';
