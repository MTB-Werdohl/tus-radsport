-- Feedback-System: feedback_modules + feedback_answers
-- Siehe docs/supabase/SCHEMA.md (polymorphe entity_type/entity_id, poll option_id)
-- Ausführung nach supabase-vorstand-roles.sql (#2)

-- ---------------------------------------------------------------------------
-- feedback_modules
-- entity_type + entity_id = polymorphe Zuordnung OHNE Foreign Key
-- (ein Feld kann nicht gleichzeitig auf Termine, News, … zeigen)
-- ---------------------------------------------------------------------------

create table if not exists public.feedback_modules (
  id bigint generated always as identity primary key,
  type text not null,
  entity_type text not null,
  entity_id bigint not null,
  question text not null,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),

  constraint feedback_modules_type_check
    check (type in ('yes_maybe', 'yes_no_comment', 'poll')),

  constraint feedback_modules_entity_type_check
    check (entity_type in ('event', 'news')),

  constraint feedback_modules_entity_unique
    unique (entity_type, entity_id)
);

create index if not exists feedback_modules_entity_idx
  on public.feedback_modules (entity_type, entity_id);

comment on table public.feedback_modules is
  'Universelle Feedback-Module; Zuordnung zu Inhalten über polymorphes entity_type + entity_id (kein FK).';

comment on column public.feedback_modules.entity_type is
  'Logische Entität: event → Termine.id, news → News.id (kein DB-FK).';

comment on column public.feedback_modules.entity_id is
  'Primärschlüssel der Ziel-Entität; Bedeutung hängt von entity_type ab.';

comment on column public.feedback_modules.config is
  'Poll: {"options":[{"id":"18uhr","label":"18 Uhr"},…]}. IDs stabil, Labels änderbar.';

-- ---------------------------------------------------------------------------
-- feedback_answers
-- poll: answer = option_id (z. B. "18uhr"), nicht Anzeige-Text
-- ---------------------------------------------------------------------------

create table if not exists public.feedback_answers (
  id bigint generated always as identity primary key,
  module_id bigint not null
    references public.feedback_modules (id)
    on delete cascade,
  member_id bigint not null
    references public.members (id)
    on delete cascade,
  answer text not null,
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint feedback_answers_module_member_unique
    unique (module_id, member_id)
);

create index if not exists feedback_answers_module_idx
  on public.feedback_answers (module_id);

comment on column public.feedback_answers.answer is
  'yes_maybe/yes_no_comment: yes|maybe|no. poll: option_id aus config.options (z. B. 18uhr).';

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.feedback_modules enable row level security;
alter table public.feedback_answers enable row level security;

drop policy if exists feedback_modules_select_public on public.feedback_modules;
drop policy if exists feedback_modules_write_vorstand on public.feedback_modules;

create policy feedback_modules_select_public
  on public.feedback_modules
  for select
  to public
  using (true);

create policy feedback_modules_write_vorstand
  on public.feedback_modules
  for all
  to authenticated
  using (public.is_vorstand())
  with check (public.is_vorstand());

drop policy if exists feedback_answers_select_own on public.feedback_answers;
drop policy if exists feedback_answers_insert_own on public.feedback_answers;
drop policy if exists feedback_answers_update_own on public.feedback_answers;
drop policy if exists feedback_answers_select_vorstand on public.feedback_answers;

create policy feedback_answers_select_own
  on public.feedback_answers
  for select
  to authenticated
  using (
    member_id in (
      select m.id
      from public.members m
      where lower(trim(m.email)) = lower(trim(auth.jwt()->>'email'))
    )
  );

create policy feedback_answers_insert_own
  on public.feedback_answers
  for insert
  to authenticated
  with check (
    member_id in (
      select m.id
      from public.members m
      where lower(trim(m.email)) = lower(trim(auth.jwt()->>'email'))
    )
  );

create policy feedback_answers_update_own
  on public.feedback_answers
  for update
  to authenticated
  using (
    member_id in (
      select m.id
      from public.members m
      where lower(trim(m.email)) = lower(trim(auth.jwt()->>'email'))
    )
  )
  with check (
    member_id in (
      select m.id
      from public.members m
      where lower(trim(m.email)) = lower(trim(auth.jwt()->>'email'))
    )
  );

create policy feedback_answers_select_vorstand
  on public.feedback_answers
  for select
  to authenticated
  using (public.is_vorstand());
