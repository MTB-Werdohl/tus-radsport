-- Slug-Auflösung für Detailseiten (ohne Inhalt preiszugeben)
-- Erlaubt „Link korrekt, aber keine Berechtigung“ statt leerer Seite.
-- Siehe docs/supabase/RUNBOOK.md

create or replace function public.resolve_content_slug(
  p_kind text,
  p_slug text
)
returns json
language plpgsql
stable
security definer
set search_path = public
set row_security = off
as $$
declare
  v_visibility text;
begin

  if p_slug is null or trim(p_slug) = '' then
    return json_build_object('found', false);
  end if;

  if p_kind = 'event' then

    select sichtbarkeit
    into v_visibility
    from public."Termine"
    where slug = p_slug
    limit 1;

  elsif p_kind = 'news' then

    select sichtbarkeit
    into v_visibility
    from public."News"
    where slug = p_slug
    limit 1;

  else

    return json_build_object('found', false);

  end if;

  if v_visibility is null then
    return json_build_object('found', false);
  end if;

  return json_build_object(
    'found', true,
    'sichtbarkeit', v_visibility
  );

end;
$$;

revoke all on function public.resolve_content_slug(text, text) from public;

grant execute on function public.resolve_content_slug(text, text) to anon;

grant execute on function public.resolve_content_slug(text, text) to authenticated;
