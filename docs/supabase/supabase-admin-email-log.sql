-- Admin-E-Mail Versandprotokoll (Vorstand)
-- Nach Feedback-Basis; Edge Function send-admin-email schreibt per Service Role.
-- Aufbewahrung: 18 Monate (automatische Löschung bei jedem Eintrag).

-- ---------------------------------------------------------------------------
-- admin_email_log
-- ---------------------------------------------------------------------------

create table if not exists public.admin_email_log (
  id bigint generated always as identity primary key,
  sent_at timestamptz not null default now(),
  sent_by_member_id bigint
    references public.members (id)
    on delete set null,
  sent_by_label text not null,
  audience_mode text not null,
  audience_label text not null,
  target_member_id bigint,
  target_event_id bigint,
  subject text not null,
  body text not null,
  recipient_count integer not null default 0,
  sent_count integer not null default 0,
  recipients jsonb not null default '[]'::jsonb,
  failures jsonb not null default '[]'::jsonb,

  constraint admin_email_log_audience_mode_check
    check (
      audience_mode in ('single', 'event', 'all')
    )
);

create index if not exists admin_email_log_sent_at_idx
  on public.admin_email_log (sent_at desc);

comment on table public.admin_email_log is
  'Versandprotokoll Vorstand-E-Mails; 18 Monate Aufbewahrung; nur Vorstand lesbar.';

comment on column public.admin_email_log.recipients is
  'Array: { member_id, email, name, status: sent|failed, error? }';

alter table public.admin_email_log enable row level security;

drop policy if exists admin_email_log_select_vorstand
  on public.admin_email_log;

create policy admin_email_log_select_vorstand
  on public.admin_email_log
  for select
  to authenticated
  using (public.is_vorstand());

-- Kein INSERT/UPDATE/DELETE für authenticated — nur Service Role (Edge Function).

-- ---------------------------------------------------------------------------
-- Retention: Einträge älter als 18 Monate löschen
-- ---------------------------------------------------------------------------

create or replace function public.purge_admin_email_log_retention()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  delete from public.admin_email_log
  where sent_at < (now() - interval '18 months');

  get diagnostics v_deleted = row_count;

  return v_deleted;
end;
$$;

revoke all on function public.purge_admin_email_log_retention()
  from public;

grant execute on function public.purge_admin_email_log_retention()
  to service_role;
