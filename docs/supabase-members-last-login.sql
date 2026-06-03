-- Letzter Login für Mitglieder (Admin-Übersicht)
-- Nach supabase-members-admin.sql ausführen
-- Siehe docs/supabase/RUNBOOK.md

alter table public.members
  add column if not exists last_login_at timestamptz;

comment on column public.members.last_login_at is
  'Zeitpunkt des letzten erfolgreichen Magic-Link-Logins (auth).';

-- Bestehende Logins aus Supabase Auth übernehmen (einmalig)
update public.members m
set last_login_at = u.last_sign_in_at
from auth.users u
where lower(trim(m.email)) = lower(trim(u.email))
  and m.last_login_at is null
  and u.last_sign_in_at is not null
  and m.anonymized_at is null;

create or replace function public.touch_member_last_login()
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin

  update public.members
  set last_login_at = now()
  where lower(trim(email)) = lower(trim(auth.jwt() ->> 'email'))
    and anonymized_at is null;

end;
$$;

revoke all on function public.touch_member_last_login() from public;

grant execute on function public.touch_member_last_login()
  to authenticated;
