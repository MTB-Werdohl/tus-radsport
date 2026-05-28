-- Push-Verlauf: alle Mitteilungen dauerhaft speichern
-- Siehe docs/supabase/RUNBOOK.md

create table if not exists public."PushMessages" (
  id bigint generated always as identity primary key,
  title text not null,
  body text not null,
  url text default '/',
  sent_at timestamptz not null default now()
);

create index if not exists push_messages_sent_at_idx
  on public."PushMessages" (sent_at desc);

alter table public."PushMessages" enable row level security;

drop policy if exists push_messages_select_public on public."PushMessages";
drop policy if exists push_messages_insert_vorstand on public."PushMessages";

create policy push_messages_select_public
  on public."PushMessages"
  for select
  to public
  using (true);

create policy push_messages_insert_vorstand
  on public."PushMessages"
  for insert
  to authenticated
  with check (public.is_vorstand());

-- Bestehende letzte Mitteilung aus site_state übernehmen (optional)
insert into public."PushMessages" (title, body, url, sent_at)
select
  coalesce(value->>'title', 'Mitteilung'),
  coalesce(value->>'body', ''),
  coalesce(nullif(value->>'url', ''), '/'),
  coalesce(
    (value->>'sent_at')::timestamptz,
    now()
  )
from public.site_state
where key = 'last_push'
  and value is not null
  and not exists (
    select 1
    from public."PushMessages"
    limit 1
  );
