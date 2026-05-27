-- Push-Mitteilungen: Mitgliederverknüpfung + RLS
-- In Supabase SQL Editor ausführen (idempotent wo möglich).

-- Unique Constraint für Upsert nach endpoint (nur einmal ausführen)
-- ALTER TABLE "PushSubscriptions"
--   ADD CONSTRAINT push_subscriptions_endpoint_unique
--   UNIQUE (endpoint);

ALTER TABLE "PushSubscriptions" ENABLE ROW LEVEL SECURITY;

-- Mitglied darf eigene Subscriptions lesen (Profil-Status)
DROP POLICY IF EXISTS push_subscriptions_select_own ON "PushSubscriptions";
CREATE POLICY push_subscriptions_select_own
  ON "PushSubscriptions"
  FOR SELECT
  TO authenticated
  USING (
    member_id IN (
      SELECT id FROM members
      WHERE lower(email) = lower(auth.jwt()->>'email')
    )
  );

-- PushSubscriptions: Vorstand sieht alle (Dashboard)
-- Voraussetzung: public.is_vorstand() existiert (docs/supabase-vorstand-roles.sql)
drop policy if exists push_subscriptions_admin_select on "PushSubscriptions";

create policy push_subscriptions_admin_select
  on "PushSubscriptions"
  for select
  to authenticated
  using (public.is_vorstand());

-- Alte zu offene Policies entfernen (Schreiben über Edge Functions + Service Role)
DROP POLICY IF EXISTS "PushSubscriptions Public Insert" ON "PushSubscriptions";
DROP POLICY IF EXISTS "PushSubscriptions Public Delete" ON "PushSubscriptions";
DROP POLICY IF EXISTS "PushSubscriptions Admin Select" ON "PushSubscriptions";
