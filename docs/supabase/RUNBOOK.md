# Supabase Runbook — MTB Werdohl

Alle SQL-Skripte liegen in `docs/` und werden **manuell** im Supabase SQL Editor ausgeführt (kein `supabase/migrations/` im Repo).

## Ausführungsreihenfolge

| # | Datei | Voraussetzung | Inhalt |
|---|--------|---------------|--------|
| 0 | [`supabase-public-read.sql`](../supabase-public-read.sql) | Tabellen existieren | Öffentliches SELECT: `galleries`, `gallery_images`, `site_state` (`last_push`), Storage `media` |
| 1 | [`supabase-members-auth.sql`](../supabase-members-auth.sql) | Tabelle `members` | RLS Basis, `check_member_email()` |
| 2 | [`supabase-vorstand-roles.sql`](../supabase-vorstand-roles.sql) | #1 | `is_vorstand()`, Vorstand-Schreibrechte, Zwischen-News-SELECT |
| 3 | [`supabase-content-visibility.sql`](../supabase-content-visibility.sql) | #2 | `is_member()`, `sichtbarkeit`, finale News/Termine-SELECT |
| 4 | [`supabase-members-admin.sql`](../supabase-members-admin.sql) | #2 | Vorstand CRUD auf `members`, Push-Löschen |
| 5 | [`supabase-push-members.sql`](../supabase-push-members.sql) | #2 | Push RLS, eigene Subscriptions lesen |

**Optional (Mehrtages-Termine):** [`supabase-termine-multiday.sql`](../supabase-termine-multiday.sql) — Spalten `endDate`, `durationDays` auf `Termine`.

**Push-Verlauf:** [`supabase-push-messages.sql`](../supabase-push-messages.sql) — Tabelle `PushMessages` + RLS (nach #2). Edge Function `send-push` danach **neu deployen**.

**Feedback:** [`supabase-feedback.sql`](../supabase-feedback.sql) — `feedback_modules` + `feedback_answers` (nach #2). Polymorphe `entity_type`/`entity_id` **ohne FK**; Poll-Antworten speichern `option_id` in `answer`.

**Feedback öffentliche Abstimmung:** [`supabase-feedback-public-voting.sql`](../supabase-feedback-public-voting.sql) — Spalte `public_voting` (nach Feedback-Basis).

**Feedback Kaskaden-Löschung:** [`supabase-feedback-cascade-delete.sql`](../supabase-feedback-cascade-delete.sql) — DB-Trigger: beim Löschen von Termin/News wird das zugehörige `feedback_modules`-Eintrag (inkl. Antworten) entfernt; einmalige Bereinigung verwaister Module.

**Feedback Deaktivieren (ohne Löschen):** [`supabase-feedback-enabled.sql`](../supabase-feedback-enabled.sql) — Spalte `enabled`; deaktiviertes Modul ist öffentlich ausgeblendet, Antworten bleiben bis Entity-Löschung.

**Feedback Public-Registrierung (Magic Link):** [`supabase-feedback-public-registration.sql`](../supabase-feedback-public-registration.sql) — externe Teilnehmer, abstimmen erst nach Login; `submit_public_feedback` für anonym nicht mehr.

**Feedback Public E-Mail zuerst:** [`supabase-feedback-public-email-verify.sql`](../supabase-feedback-public-email-verify.sql) — `members`-Eintrag erst nach Magic-Link-Klick (`complete_public_participant_registration`); Name vorher nur in Auth-Metadaten.

**Mitglieder anonymisieren:** [`supabase-members-anonymize.sql`](../supabase-members-anonymize.sql) — Account-Löschung entfernt personenbezogene Daten, `member_id` und `feedback_answers` bleiben; Edge Function `anonymize-member-account` löscht zusätzlich `auth.users`.

**Rolle „public“ (externe Teilnehmer):** [`supabase-members-public-role.sql`](../supabase-members-public-role.sql) — `is_member()` ohne public, RPC `submit_public_feedback` / `get_public_feedback_answer`.

**Falls Abstimmung fehlschlägt mit „no unique or exclusion constraint“:** [`supabase-feedback-answers-unique-fix.sql`](../supabase-feedback-answers-unique-fix.sql) — stellt `UNIQUE (module_id, member_id)` wieder her (nach alter public-voting-Migration).

**Wichtig:** Schritt 3 ersetzt die News-SELECT-Policy aus Schritt 2. Ohne Schritt 3 gelten News-Leserechte noch über `published`, nicht `sichtbarkeit`.

### Einmalig (Push Upsert)

```sql
ALTER TABLE "PushSubscriptions"
  ADD CONSTRAINT push_subscriptions_endpoint_unique
  UNIQUE (endpoint);
```

Nur ausführen, wenn der Constraint noch fehlt (Edge Function `save-push-subscription` nutzt `onConflict: 'endpoint'`).

## Edge Functions

| Funktion | Referenz / Verhalten |
|----------|----------------------|
| `save-push-subscription` | [`supabase-edge-save-push-subscription.ts`](../supabase-edge-save-push-subscription.ts) — JWT des Mitglieds, Service Role Upsert |
| `delete-push-subscription` | Analog zu save — JWT, Endpoint löschen |
| `send-push` | [`supabase-edge-send-push.ts`](../supabase-edge-send-push.ts) — JWT + Vorstand-Check, Push senden, **Verlauf in `PushMessages` + `site_state`** (Service Role) |
| `anonymize-member-account` | [`supabase-edge-anonymize-member-account.ts`](../supabase-edge-anonymize-member-account.ts) — **Edge Function deployen, nicht SQL!** JWT; Self (public) oder Vorstand `{ member_id }`; ruft `anonymize_member()` + löscht Auth-User |

### Edge Function `anonymize-member-account` deployen

1. Zuerst SQL: [`supabase-members-anonymize.sql`](../supabase-members-anonymize.sql) im **SQL Editor** ausführen.
2. **Edge Functions** → **Deploy a new function** (oder CLI, siehe unten).
3. **Slug / Name exakt:** `anonymize-member-account` — die Website ruft `/functions/v1/anonymize-member-account` auf. Ein auto-generierter Slug wie `bright-function` führt zu **404/CORS**.
4. Code aus [`supabase-edge-anonymize-member-account.ts`](../supabase-edge-anonymize-member-account.ts) oder [`supabase/functions/anonymize-member-account/index.ts`](../../supabase/functions/anonymize-member-account/index.ts).
5. **Deploy**
6. **Verify JWT deaktivieren** (sonst CORS-Fehler im Browser):
   - Function → **Details** → **Enforce JWT Verification** → **OFF**
   - Oder CLI: `supabase/config.toml` → `[functions.anonymize-member-account] verify_jwt = false`
   - JWT wird intern per `auth.getUser()` geprüft.

**CLI (optional):**

```bash
supabase functions deploy anonymize-member-account --project-ref eazizesytrnknbgrnggj
```

Prüfen:

```bash
curl -i -X OPTIONS "https://eazizesytrnknbgrnggj.supabase.co/functions/v1/anonymize-member-account"
```

Erwartung: **HTTP 200**, Body `ok`, Header `Access-Control-Allow-Origin: *`.

Falscher Slug (404): alte Test-Function im Dashboard löschen.

## Policy-Matrix (Kurz)

| Tabelle | anon | authenticated (Mitglied) | authenticated (Vorstand) |
|---------|------|----------------------------|---------------------------|
| `News` / `Termine` | SELECT `sichtbarkeit=public` | + `members` + alle `public` | + alle Zeilen + CRUD |
| `members` | — | SELECT/UPDATE eigene Zeile | SELECT alle + CRUD alle |
| `galleries` / `gallery_images` | SELECT | SELECT | CRUD |
| `PushSubscriptions` | — | SELECT eigene (`member_id`) | SELECT alle, DELETE (Mitglied löschen) |
| `PushMessages` | SELECT | SELECT | INSERT |
| `feedback_modules` | SELECT | SELECT | ALL |
| `feedback_answers` | — | SELECT/INSERT/UPDATE eigene | SELECT alle + (später Auswertung) |
| `site_state` | SELECT `last_push` | SELECT `last_push` | ALL |
| `storage.objects` (media) | SELECT | SELECT | INSERT, DELETE |

Schreibzugriffe auf Push-Subscriptions für Mitglieder laufen über Edge Functions (Service Role), nicht über Client-RLS.

## Upgrade vs. Neuinstallation

- **Neu:** Skripte 0→5 der Reihe nach.
- **Bereits live:** Einzelne Skripte erneut ausführen ist idempotent (`drop policy if exists` …).
- **`is_vorstand()` / `is_member()`:** nutzen `SET row_security = off` — bei Problemen mit Admin-Listen erneut [`supabase-vorstand-roles.sql`](../supabase-vorstand-roles.sql) bzw. [`supabase-content-visibility.sql`](../supabase-content-visibility.sql) ausführen.

## Siehe auch

- Schema: [`SCHEMA.md`](SCHEMA.md)
- Magic Link Setup: [`../supabase-members-setup.md`](../supabase-members-setup.md)
- Architektur: [`../ARCHITECTURE.md`](../ARCHITECTURE.md)
