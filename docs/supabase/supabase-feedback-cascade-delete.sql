-- Feedback: Kaskaden-Löschung wenn Termin oder News gelöscht wird
-- (feedback_answers werden über ON DELETE CASCADE am Modul mit entfernt)
-- Ausführung nach supabase-feedback.sql

-- ---------------------------------------------------------------------------
-- Trigger: feedback_modules entfernen, wenn Ziel-Inhalt gelöscht wird
-- ---------------------------------------------------------------------------

create or replace function public.delete_feedback_modules_for_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.feedback_modules
  where entity_type = 'event'
    and entity_id = old.id;

  return old;
end;
$$;

create or replace function public.delete_feedback_modules_for_news()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.feedback_modules
  where entity_type = 'news'
    and entity_id = old.id;

  return old;
end;
$$;

drop trigger if exists termine_delete_feedback_modules on public."Termine";

create trigger termine_delete_feedback_modules
  before delete on public."Termine"
  for each row
  execute function public.delete_feedback_modules_for_event();

drop trigger if exists news_delete_feedback_modules on public."News";

create trigger news_delete_feedback_modules
  before delete on public."News"
  for each row
  execute function public.delete_feedback_modules_for_news();

-- ---------------------------------------------------------------------------
-- Einmalig: bereits verwaiste Module bereinigen
-- ---------------------------------------------------------------------------

delete from public.feedback_modules fm
where
  (
    fm.entity_type = 'event'
    and not exists (
      select 1
      from public."Termine" t
      where t.id = fm.entity_id
    )
  )
  or (
    fm.entity_type = 'news'
    and not exists (
      select 1
      from public."News" n
      where n.id = fm.entity_id
    )
  );
