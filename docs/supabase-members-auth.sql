-- Mitglieder-Login: RLS-Policies für Supabase
-- Einmalig im Supabase SQL Editor ausführen.

-- Eingeloggte User dürfen ihre eigene Zeile lesen (Profil + Session-Check)
create policy "members_select_own"
on public.members
for select
to authenticated
using (
  lower(trim(email)) = lower(trim(auth.jwt() ->> 'email'))
);

-- Optional: E-Mail-Prüfung vor Magic Link (ohne andere Mitgliederdaten preiszugeben)
-- Dafür im Frontend supabase.rpc('check_member_email', { check_email: '...' }) nutzen.

create or replace function public.check_member_email(check_email text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.members
    where lower(trim(email)) = lower(trim(check_email))
  );
$$;

revoke all on function public.check_member_email(text) from public;
grant execute on function public.check_member_email(text) to anon, authenticated;
