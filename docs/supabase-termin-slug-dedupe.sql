-- Termin-Slug: resolve_content_slug bei Duplikaten veröffentlichten Eintrag bevorzugen
-- Bestandsbereinigung doppelter Slugs

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

    select t.sichtbarkeit
    into v_visibility
    from public."Termine" t
    where t.slug = p_slug
    order by
      case coalesce(t.sichtbarkeit, 'public')
        when 'public' then 0
        when 'members' then 1
        when 'draft' then 2
        else 3
      end,
      t.id desc
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

-- Doppelte Slugs: Entwurf erhält eindeutigen Slug (Behält älteren Eintrag auf Kurz-URL)
update public."Termine" d
set slug = d.slug || '-' || d.id::text
where exists (
  select 1
  from public."Termine" t
  where t.slug = d.slug
    and t.id <> d.id
)
and d.sichtbarkeit = 'draft';
