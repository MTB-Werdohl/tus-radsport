-- Fix: ON CONFLICT (module_id, member_id) für feedback_answers
-- Ursache: supabase-feedback-public-voting.sql hat den UNIQUE-Constraint durch
-- einen partiellen Index ersetzt — Postgres/Supabase-Upsert findet kein Ziel.
-- Einmal im SQL Editor ausführen (mehrfach ausführbar).

-- Alte client_token-Zeilen (Legacy) entfernen
delete from public.feedback_answers
where member_id is null;

-- Alte anon-Policies (hängen an client_token) — vor Spalten-Drop
drop policy if exists feedback_answers_insert_anon_public on public.feedback_answers;
drop policy if exists feedback_answers_update_anon_public on public.feedback_answers;

-- Constraint zuerst (entfernt zugehörigen Index), danach evtl. partiellen Index
alter table public.feedback_answers
  drop constraint if exists feedback_answers_module_member_unique;

drop index if exists public.feedback_answers_module_member_unique;
drop index if exists public.feedback_answers_module_client_unique;

alter table public.feedback_answers
  drop constraint if exists feedback_answers_identity_check;

alter table public.feedback_answers
  alter column member_id set not null;

do $$
begin
  alter table public.feedback_answers
    add constraint feedback_answers_module_member_unique
    unique (module_id, member_id);
exception
  when duplicate_object then
    null;
end $$;

alter table public.feedback_answers
  drop column if exists client_token;
