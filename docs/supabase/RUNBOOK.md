# Supabase Runbook — MTB Werdohl

Alle SQL-Skripte liegen in `docs/` und werden **manuell** im Supabase SQL Editor ausgeführt (kein `supabase/migrations/` im Repo).

## Ausführungsreihenfolge

| # | Datei | Voraussetzung | Inhalt |
|---|--------|---------------|--------|
| 0 | [`supabase-public-read.sql`](../supabase-public-read.sql) | Tabellen existieren | Öffentliches SELECT: `galleries`, `gallery_images`, `site_state` (`last_push`), Storage `media` |
| 1 | [`supabase-members-auth.sql`](../supabase-members-auth.sql) | Tabelle `members` | RLS Basis, `check_member_email()` |
| 2 | [`supabase-vorstand-roles.sql`](../supabase-vorstand-roles.sql) | #1 | `is_vorstand()`, Vorstand-Schreibrechte, Zwischen-News-SELECT |
| 3 | [`supabase-content-visibility.sql`](../supabase-content-visibility.sql) | #2 | `is_member()`, `sichtbarkeit`, finale News/Termine-SELECT |
| 3b | [`supabase-content-slug-resolve.sql`](../supabase-content-slug-resolve.sql) | #3 | `resolve_content_slug()` — Hinweis statt leerer Detailseite bei fehlender Berechtigung |
| 4 | [`supabase-members-admin.sql`](../supabase-members-admin.sql) | #2 | Vorstand CRUD auf `members` |

**Optional (Mehrtages-Termine):** [`supabase-termine-multiday.sql`](../supabase-termine-multiday.sql) — Spalten `endDate`, `durationDays` auf `Termine`.

**Tröte (Web Push entfernt):** [`supabase-drop-web-push.sql`](../supabase-drop-web-push.sql) — löscht `PushMessages` und `PushSubscriptions`, aktualisiert `anonymize_member` (Legacy-Push-Abos vor Löschung); **Tröte** bleibt in `site_state.last_push`. Edge Functions `send-push`, `save-push-subscription`, `delete-push-subscription` im Dashboard optional löschen.

**Feedback:** [`supabase-feedback.sql`](../supabase-feedback.sql) — `feedback_modules` + `feedback_answers` (nach #2). Polymorphe `entity_type`/`entity_id` **ohne FK**; Poll-Antworten speichern `option_id` in `answer`.

**Feedback Antwort zurückziehen:** [`supabase-feedback-answers-delete-own.sql`](../supabase-feedback-answers-delete-own.sql) — DELETE-Policy: Mitglieder können die eigene Antwort löschen (Umfrage/Termin freiwillig zurücknehmen).

**Feedback öffentliche Abstimmung:** [`supabase-feedback-public-voting.sql`](../supabase-feedback-public-voting.sql) — Spalte `public_voting` (nach Feedback-Basis).

**Feedback Kaskaden-Löschung:** [`supabase-feedback-cascade-delete.sql`](../supabase-feedback-cascade-delete.sql) — DB-Trigger: beim Löschen von Termin/News wird das zugehörige `feedback_modules`-Eintrag (inkl. Antworten) entfernt; einmalige Bereinigung verwaister Module.

**Feedback Deaktivieren (ohne Löschen):** [`supabase-feedback-enabled.sql`](../supabase-feedback-enabled.sql) — Spalte `enabled`; deaktiviertes Modul ist öffentlich ausgeblendet, Antworten bleiben bis Entity-Löschung.

**Feedback Public-Registrierung (Magic Link):** [`supabase-feedback-public-registration.sql`](../supabase-feedback-public-registration.sql) — externe Teilnehmer, abstimmen erst nach Login; `submit_public_feedback` für anonym nicht mehr.

**Feedback Public E-Mail zuerst:** [`supabase-feedback-public-email-verify.sql`](../supabase-feedback-public-email-verify.sql) — `members`-Eintrag erst nach Magic-Link-Klick (`complete_public_participant_registration`); Name vorher nur in Auth-Metadaten.

**Externe Teilnehmer Einwilligungen:** [`supabase-public-participant-consents.sql`](../supabase-public-participant-consents.sql) — Kontakt-Einwilligung Pflicht, Bilder optional (RPC + Datum).

**Gelöschte Mitglieder nicht neu anlegen:** Frontend-Fix in `member-auth.js` / `member-service.js`; SQL: anonymisierte Zeilen in `complete_public_participant_registration` ignorieren (in `supabase-public-participant-consents.sql`). Edge Function `anonymize-member-account` beendet alle Auth-Sessions (`signOut global`) vor User-Löschung — **neu deployen**.

**Mitglieder anonymisieren:** [`supabase-members-anonymize.sql`](../supabase-members-anonymize.sql) — Account-Löschung entfernt personenbezogene Daten, `member_id` und `feedback_answers` bleiben; Edge Function `anonymize-member-account` löscht zusätzlich `auth.users`.

**Mitglieder letzter Login:** [`supabase-members-last-login.sql`](../supabase-members-last-login.sql) — Spalte `last_login_at`, RPC `touch_member_last_login()` beim Magic-Link-Login; einmaliges Backfill aus `auth.users`.

**Protokolle (Vorstand):** [`supabase-board-documents.sql`](../supabase-board-documents.sql) — Tabelle `board_documents`, PDFs unter `protocols/` im Storage (nur Vorstand lesbar). **Kurzbeschreibung in Listen:** [`supabase-board-documents-subject.sql`](../supabase-board-documents-subject.sql) — Spalte `subject` (Feld „Inhalt“ im Admin). **Dateien verschieben:** [`supabase-board-documents-storage-update.sql`](../supabase-board-documents-storage-update.sql) — Storage-Policy `UPDATE` für `move`/Umbenennen.

**Strava / Aktivitätenportal (MVP Schritt 4+2):** [`supabase-strava.sql`](../supabase-strava.sql) — `strava_connections`, `activities`, Stats-Tabellen, Profil-RPCs (`get_strava_profile_status`, `update_strava_visibility`, `disconnect_strava`). OAuth/Webhook/Sync: Edge Functions folgen — Setup: [`supabase-strava-setup.md`](../supabase-strava-setup.md).

**Rolle „public“ (externe Teilnehmer):** [`supabase-members-public-role.sql`](../supabase-members-public-role.sql) — `is_member()` ohne public, RPC `submit_public_feedback` / `get_public_feedback_answer`.

**Falls Abstimmung fehlschlägt mit „no unique or exclusion constraint“:** [`supabase-feedback-answers-unique-fix.sql`](../supabase-feedback-answers-unique-fix.sql) — stellt `UNIQUE (module_id, member_id)` wieder her (nach alter public-voting-Migration).

**Wichtig:** Schritt 3 ersetzt die News-SELECT-Policy aus Schritt 2. Ohne Schritt 3 gelten News-Leserechte noch über `published`, nicht `sichtbarkeit`.

### Einmalig (Tröte / Web Push entfernen)

Nach Frontend-Deploy: [`supabase-drop-web-push.sql`](../supabase-drop-web-push.sql) ausführen.

## Edge Functions

| Funktion | Referenz / Verhalten |
|----------|----------------------|
| `anonymize-member-account` | [`supabase-edge-anonymize-member-account.ts`](../supabase-edge-anonymize-member-account.ts) — **Edge Function deployen, nicht SQL!** JWT; Self (public) oder Vorstand `{ member_id }`; ruft `anonymize_member()` + löscht Auth-User |
| `send-admin-email` | [`supabase-edge-send-admin-email.ts`](../supabase-edge-send-admin-email.ts) — Vorstand-E-Mails; Termin-Empfänger: **Ja und Vielleicht** bei `yes_maybe`; Setup: [`supabase-admin-email-setup.md`](../supabase-admin-email-setup.md) — **nach Code-Änderung neu deployen** |
| `strava-oauth-start` | [`supabase-edge-strava-oauth-start.ts`](../supabase-edge-strava-oauth-start.ts) — POST + JWT; liefert Strava-Authorize-URL — Setup: [`supabase-strava-setup.md`](../supabase-strava-setup.md) |
| `strava-oauth-callback` | [`supabase-edge-strava-oauth-callback.ts`](../supabase-edge-strava-oauth-callback.ts) — GET; Token-Austausch, speichert `strava_connections`, Redirect `/profil/?strava=connected` |
| `strava-sync` | [`supabase-edge-strava-sync.ts`](../supabase-edge-strava-sync.ts) — Webhook + Sync — Setup: [`supabase-strava-sync-setup.md`](../supabase-strava-sync-setup.md) |

## Strava — Öffentliches Portal (Schritt 7–10)

SQL: [`supabase-strava-public.sql`](../supabase-strava-public.sql) im **SQL Editor** ausführen.

| RPC | Zweck |
|-----|--------|
| `get_public_activity_feed(p_days)` | Feed `/aktivitaeten/` — `publish_feed`, 90 Tage |
| `get_public_activity_detail(uuid, p_days)` | Detail `/aktivitaeten/{uuid}/` |
| `get_public_member_rankings(year, month?)` | Rankings — `publish_rankings` |
| `get_public_club_stats(year, month?)` | Vereinsziele — `contribute_to_club_goals` |

Website: `/aktivitaeten/`, Navigation „Aktivitäten“, JS unter `assets/js/aktivitaeten/`.

Mitglieder steuern Sichtbarkeit im Profil → Tab Strava (Feed / Rankings / Vereinsziele getrennt).

**Profil — Meine Aktivitäten:** [`supabase-strava-member-activities.sql`](../supabase-strava-member-activities.sql) — RPC `get_member_activities(p_limit)` (nur `authenticated`, eigene importierte Touren inkl. Feed-Badge).

### Edge Function `anonymize-member-account` deployen

1. Zuerst SQL: [`supabase-members-anonymize.sql`](../supabase-members-anonymize.sql) im **SQL Editor** ausführen.
2. **Edge Functions** → **Deploy a new function**.
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
| `feedback_modules` | SELECT | SELECT | ALL |
| `feedback_answers` | — | SELECT/INSERT/UPDATE eigene | SELECT alle + (später Auswertung) |
| `site_state` | SELECT `last_push` | SELECT `last_push` | ALL (Tröte) |
| `storage.objects` (media) | SELECT | SELECT | INSERT, UPDATE, DELETE |

Schreibzugriffe auf `site_state` (`last_push`) für die Tröte: Vorstand direkt per Client (RLS).

## Upgrade vs. Neuinstallation

- **Neu:** Skripte 0→4 der Reihe nach.
- **Bereits live:** Einzelne Skripte erneut ausführen ist idempotent (`drop policy if exists` …).
- **`is_vorstand()` / `is_member()`:** nutzen `SET row_security = off` — bei Problemen mit Admin-Listen erneut [`supabase-vorstand-roles.sql`](../supabase-vorstand-roles.sql) bzw. [`supabase-content-visibility.sql`](../supabase-content-visibility.sql) ausführen.

## Go-live Checkliste (Website + Supabase)

Vor dem produktiven Start einmal durchgehen:

| Bereich | Aktion |
|---------|--------|
| **SQL Feedback** | [`supabase-feedback-cascade-delete.sql`](../supabase-feedback-cascade-delete.sql) + [`supabase-feedback-answers-delete-own.sql`](../supabase-feedback-answers-delete-own.sql) ausgeführt |
| **Edge `send-admin-email`** | Code deployt; Termin-Mails zählen **Ja + Vielleicht** (Preview in Admin = tatsächlicher Versand) |
| **Edge `anonymize-member-account`** | Deployt, JWT Verify **OFF**; Test Account löschen |
| **Redirect URLs** | `/profil/`, `/**`, ggf. `/event.html`, `/news-detail.html` für Rückkehr nach Magic Link |
| **Smoke-Test** | Öffentlicher Termin + Abstimmung; Mitglieder-only Termin; Entwurf nur Vorstand; Kalender nach Login aktualisiert |
| **Mitglieder-Hilfe** | [`mitglieder-hilfe.md`](../../mitglieder-hilfe.md) verlinkt / Inhalt stimmt mit UI |

Details: [`../supabase-members-setup.md`](../supabase-members-setup.md), [`../supabase-admin-email-setup.md`](../supabase-admin-email-setup.md).

## Siehe auch

- Schema: [`SCHEMA.md`](SCHEMA.md)
- Magic Link Setup: [`../supabase-members-setup.md`](../supabase-members-setup.md)
- Architektur: [`../ARCHITECTURE.md`](../ARCHITECTURE.md)
