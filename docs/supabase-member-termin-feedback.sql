-- Feedback-Modul automatisch für Termine (auch Mitglieder-Entwürfe)
-- Siehe docs/supabase/RUNBOOK.md

-- ---------------------------------------------------------------------------
-- Trigger: feedback_modules bei Termin anlegen / Sichtbarkeit ändern
-- ---------------------------------------------------------------------------

create or replace function public.sync_feedback_module_for_termin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin

  insert into public.feedback_modules (
    type,
    entity_type,
    entity_id,
    question,
    config,
    public_voting,
    enabled
  )
  values (
    'yes_maybe',
    'event',
    new.id,
    'Bist du dabei?',
    '{}'::jsonb,
    coalesce(new.sichtbarkeit = 'public', false),
    true
  )
  on conflict (entity_type, entity_id)
  do update set
    public_voting =
      coalesce(excluded.public_voting, feedback_modules.public_voting),
    enabled = true;

  return new;

end;
$$;

drop trigger if exists termine_sync_feedback_module on public."Termine";

create trigger termine_sync_feedback_module
  after insert or update of sichtbarkeit
  on public."Termine"
  for each row
  execute function public.sync_feedback_module_for_termin();

-- Bestand: fehlende Module für bestehende Termine
insert into public.feedback_modules (
  type,
  entity_type,
  entity_id,
  question,
  config,
  public_voting,
  enabled
)
select
  'yes_maybe',
  'event',
  t.id,
  'Bist du dabei?',
  '{}'::jsonb,
  coalesce(t.sichtbarkeit = 'public', false),
  true
from public."Termine" t
where not exists (
  select 1
  from public.feedback_modules fm
  where fm.entity_type = 'event'
    and fm.entity_id = t.id
);
