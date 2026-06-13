-- Medien-Storage Phase 0 — Pfad-Spalten für Termine/News
-- Nach supabase-content-visibility.sql / supabase-vorstand-roles.sql
-- Siehe docs/MEDIA-STORAGE-ROADMAP.md

alter table public."Termine"
  add column if not exists image_storage_path text,
  add column if not exists gpx_storage_path text;

comment on column public."Termine".image_storage_path is
  'Relativer Pfad im Bucket media, z. B. shared/images/ausfahrt.webp';

comment on column public."Termine".gpx_storage_path is
  'Relativer Pfad im Bucket media, z. B. shared/routes/moehnesee.gpx';

alter table public."News"
  add column if not exists image_storage_path text;

comment on column public."News".image_storage_path is
  'Relativer Pfad im Bucket media, z. B. shared/images/news-header.jpg';
