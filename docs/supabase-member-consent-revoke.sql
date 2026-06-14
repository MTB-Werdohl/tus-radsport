-- Einwilligungen: Widerrufsdatum dokumentieren (Admin + Profil-Anzeige)
-- Idempotent — sicher mehrfach ausführbar.

alter table public.members
  add column if not exists kontakt_widerrufen_am date,
  add column if not exists bilder_widerrufen_am date;

comment on column public.members.kontakt_widerrufen_am is
  'Datum des letzten Widerrufs der Kontakt-Einwilligung (Einwilligung bleibt historisch nachvollziehbar).';

comment on column public.members.bilder_widerrufen_am is
  'Datum des letzten Widerrufs der Bilder-Einwilligung.';
