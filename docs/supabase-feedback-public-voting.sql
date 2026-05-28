-- Feedback: optionale öffentliche Abstimmung (ohne Login)
-- Nach supabase-feedback.sql ausführen
-- Anschließend: docs/supabase-members-public-role.sql (externe Teilnehmer als members.rolle = public)

alter table public.feedback_modules
  add column if not exists public_voting
  boolean not null default false;

comment on column public.feedback_modules.public_voting is
  'true = auch Gäste dürfen abstimmen (client_token). false = nur Vereinsmitglieder.';

alter table public.feedback_answers
  alter column member_id drop not null;

alter table public.feedback_answers
  add column if not exists client_token text;

alter table public.feedback_answers
  drop constraint if exists feedback_answers_module_member_unique;

alter table public.feedback_answers
  add constraint feedback_answers_identity_check
  check (
    member_id is not null
    or client_token is not null
  );

create unique index if not exists feedback_answers_module_member_unique
  on public.feedback_answers (module_id, member_id)
  where member_id is not null;

create unique index if not exists feedback_answers_module_client_unique
  on public.feedback_answers (module_id, client_token)
  where client_token is not null;

-- Öffentliche Abstimmung: anon darf eigene Zeile per client_token upserten
drop policy if exists feedback_answers_insert_anon_public on public.feedback_answers;
drop policy if exists feedback_answers_update_anon_public on public.feedback_answers;

create policy feedback_answers_insert_anon_public
  on public.feedback_answers
  for insert
  to anon
  with check (
    member_id is null
    and client_token is not null
    and exists (
      select 1
      from public.feedback_modules m
      where m.id = module_id
        and m.public_voting = true
    )
  );

create policy feedback_answers_update_anon_public
  on public.feedback_answers
  for update
  to anon
  using (
    member_id is null
    and client_token is not null
    and exists (
      select 1
      from public.feedback_modules m
      where m.id = module_id
        and m.public_voting = true
    )
  )
  with check (
    member_id is null
    and client_token is not null
    and exists (
      select 1
      from public.feedback_modules m
      where m.id = module_id
        and m.public_voting = true
    )
  );
