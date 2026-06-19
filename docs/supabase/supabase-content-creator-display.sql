-- Öffentliche Anzeige: Name des Erstellers zu News/Terminen
-- Siehe docs/supabase/RUNBOOK.md
-- Voraussetzung: docs/supabase-member-content.sql (created_by)

create or replace function public.get_content_creator_labels(
  p_member_ids bigint[]
)
returns jsonb
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select coalesce(
    jsonb_object_agg(
      m.id::text,
      nullif(
        trim(
          concat(
            coalesce(m.vorname, ''),
            ' ',
            coalesce(m.nachname, '')
          )
        ),
        ''
      )
    ) filter (where m.id is not null),
    '{}'::jsonb
  )
  from public.members m
  where m.id = any(p_member_ids)
    and m.anonymized_at is null
    and (
      exists (
        select 1
        from public."Termine" t
        where t.created_by = m.id
          and coalesce(t.sichtbarkeit, 'public')
            in ('public', 'members')
      )
      or exists (
        select 1
        from public."News" n
        where n.created_by = m.id
          and coalesce(n.sichtbarkeit, 'draft')
            in ('public', 'members')
      )
    );
$$;

comment on function public.get_content_creator_labels(bigint[]) is
  'Anzeigenamen für Ersteller sichtbarer News/Termine — für Kalender/Detail (anon/authenticated).';

revoke all on function public.get_content_creator_labels(bigint[])
  from public;

grant execute on function public.get_content_creator_labels(bigint[])
  to anon, authenticated;
