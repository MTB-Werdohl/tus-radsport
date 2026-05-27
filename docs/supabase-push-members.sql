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

-- Admin-Accounts (nicht in members) dürfen alle Subscriptions lesen
DROP POLICY IF EXISTS push_subscriptions_admin_select ON "PushSubscriptions";
CREATE POLICY push_subscriptions_admin_select
  ON "PushSubscriptions"
  FOR SELECT
  TO authenticated
  USING (
    NOT EXISTS (
      SELECT 1 FROM members
      WHERE lower(trim(members.email)) = lower(trim(auth.jwt()->>'email'))
    )
  );

-- Alte zu offene Policies entfernen (Schreiben über Edge Functions + Service Role)
DROP POLICY IF EXISTS "PushSubscriptions Public Insert" ON "PushSubscriptions";
DROP POLICY IF EXISTS "PushSubscriptions Public Delete" ON "PushSubscriptions";
DROP POLICY IF EXISTS "PushSubscriptions Admin Select" ON "PushSubscriptions";
