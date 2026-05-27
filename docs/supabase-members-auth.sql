-- Schritt 1 — Mitglieder-Login: RLS Basis + check_member_email
-- Siehe docs/supabase/RUNBOOK.md

-- 1) Row Level Security aktivieren
alter table public.members enable row level security;

-- 2) Alte Policies/Funktionen entfernen (falls vorhanden)
drop policy if exists "members_select_own" on public.members;
drop policy if exists "members_update_own" on public.members;
drop policy if exists "members_anon_select" on public.members;

-- 3) Eingeloggte User dürfen nur ihre eigene Zeile lesen (Profil + Session-Check)
create policy "members_select_own"
on public.members
for select
to authenticated
using (
  lower(trim(email)) = lower(trim(auth.jwt() ->> 'email'))
);

-- 3b) Eingeloggte User dürfen ihre eigene Zeile aktualisieren (Kontaktdaten + Einwilligungen)
create policy "members_update_own"
on public.members
for update
to authenticated
using (
  lower(trim(email)) = lower(trim(auth.jwt() ->> 'email'))
)
with check (
  lower(trim(email)) = lower(trim(auth.jwt() ->> 'email'))
);

-- Kein INSERT/DELETE für anon/authenticated über die Website.

-- 4) E-Mail-Prüfung vor Magic Link (ohne Mitgliederdaten preiszugeben)
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

-- 5) Test (optional — danach wieder löschen oder auskommentieren)
-- select public.check_member_email('deine@email.de');
