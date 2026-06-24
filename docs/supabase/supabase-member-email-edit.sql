-- Vorstand: E-Mail nachtragen/ändern nur ohne Auth-Konto
-- Nach supabase-vorstand-roles.sql, supabase-members-admin.sql
-- Siehe docs/supabase/RUNBOOK.md

-- ---------------------------------------------------------------------------
-- Prüfung: auth.users für die aktuelle members.email
-- ---------------------------------------------------------------------------

create or replace function public.member_has_auth_account(
  p_member_id bigint
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
set row_security = off
as $$
declare
  v_email text;
begin

  if not public.is_vorstand() then
    raise exception 'Keine Berechtigung.';
  end if;

  if p_member_id is null then
    return false;
  end if;

  select lower(trim(coalesce(m.email, '')))
  into v_email
  from public.members m
  where m.id = p_member_id
    and m.anonymized_at is null;

  if v_email is null or v_email = '' then
    return false;
  end if;

  return exists (
    select 1
    from auth.users u
    where lower(trim(u.email)) = v_email
  );

end;
$$;

comment on function public.member_has_auth_account(bigint) is
  'Vorstand: true wenn auth.users zur members.email des Mitglieds existiert.';

revoke all on function public.member_has_auth_account(bigint) from public;

grant execute on function public.member_has_auth_account(bigint)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Prüfung: E-Mail bereits in auth.users (für Duplikat-Schutz beim Nachtragen)
-- ---------------------------------------------------------------------------

create or replace function public.auth_user_exists_for_email(
  p_email text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
set row_security = off
as $$
declare
  v_email text;
begin

  if not public.is_vorstand() then
    raise exception 'Keine Berechtigung.';
  end if;

  v_email :=
    lower(trim(coalesce(p_email, '')));

  if v_email = '' or position('@' in v_email) = 0 then
    return false;
  end if;

  return exists (
    select 1
    from auth.users u
    where lower(trim(u.email)) = v_email
  );

end;
$$;

comment on function public.auth_user_exists_for_email(text) is
  'Vorstand: true wenn auth.users diese E-Mail bereits nutzt.';

revoke all on function public.auth_user_exists_for_email(text) from public;

grant execute on function public.auth_user_exists_for_email(text)
  to authenticated;
