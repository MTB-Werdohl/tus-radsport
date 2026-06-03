-- Protokolle, Beschlüsse, Informationen (nur Vorstand)
-- Nach supabase-vorstand-roles.sql ausführen
-- Siehe docs/supabase/RUNBOOK.md

create table if not exists public.board_documents (
  id bigint generated always as identity primary key,
  meeting_date date not null,
  meeting_label text not null default 'Vorstandssitzung',
  scope text not null default 'abteilung'
    check (scope in ('abteilung', 'hauptverein')),
  content text not null default '',
  protocol_pdf_path text,
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.board_documents is
  'Vorstands-Protokolle und Informationen — nur Admin, nicht öffentlich.';

comment on column public.board_documents.scope is
  'abteilung = Radsportabteilung; hauptverein = TuS / Beirat.';

comment on column public.board_documents.attachments is
  'JSON-Array: [{ "path": "protocols/..." }] — Anzeigename aus Dateiname.';

create index if not exists board_documents_meeting_date_idx
  on public.board_documents (meeting_date desc);

alter table public.board_documents enable row level security;

drop policy if exists board_documents_vorstand_all on public.board_documents;

create policy board_documents_vorstand_all
  on public.board_documents
  for all
  to authenticated
  using (public.is_vorstand())
  with check (public.is_vorstand());

-- PDFs unter protocols/ nicht öffentlich lesbar
drop policy if exists "Public gallery access" on storage.objects;

create policy media_public_read_excluding_protocols
  on storage.objects
  for select
  to public
  using (
    bucket_id = 'media'
    and not (name like 'protocols/%')
  );

drop policy if exists media_vorstand_read_protocols on storage.objects;

create policy media_vorstand_read_protocols
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'media'
    and name like 'protocols/%'
    and public.is_vorstand()
  );

drop policy if exists media_vorstand_delete_protocols on storage.objects;

create policy media_vorstand_delete_protocols
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'media'
    and name like 'protocols/%'
    and public.is_vorstand()
  );
