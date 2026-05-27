-- Push-Mitteilungen: Mitgliederverknüpfung
-- In Supabase SQL Editor ausführen (nach Schema-Erweiterung member_id, device_name, user_agent).

-- Unique Constraint für Upsert nach endpoint (nur einmal ausführen)
ALTER TABLE "PushSubscriptions"
  ADD CONSTRAINT push_subscriptions_endpoint_unique
  UNIQUE (endpoint);

-- RLS aktivieren (falls noch nicht aktiv)
ALTER TABLE "PushSubscriptions" ENABLE ROW LEVEL SECURITY;

-- Mitglied darf eigene Subscriptions lesen (Profil-Status)
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
