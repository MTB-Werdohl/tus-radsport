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

**Phase 4a — Einzeltermine (Verbindlichkeit):** [`supabase-phase4a-feedback-events.sql`](../supabase-phase4a-feedback-events.sql) — `feedback_answer_events`, RPCs `set_event_feedback_answer` / `list_feedback_participation_changes`, RLS: Einzeltermine nur noch über RPC schreibbar; `anonymize_member` bereinigt Event-Freitexte. **Nach** Feedback-Basis und `supabase-feedback-answers-delete-own.sql`. Frontend/Admin: `admin_js_version` **20260562**.

**Phase 4a Review:** [`supabase-phase4a-public-feedback-rpc-fix.sql`](../supabase-phase4a-public-feedback-rpc-fix.sql) — `submit_public_feedback` an 4a-Logik (`set_event_feedback_answer_for_member`); nach Phase-4a-Basis.

**Phase 4a Hotfix (Absage FK):** [`supabase-phase4a-withdraw-answer-id-fix.sql`](../supabase-phase4a-withdraw-answer-id-fix.sql) — behebt `23503 feedback_answer_events_answer_id_fkey` bei Absage nach Ja; nur `set_event_feedback_answer_for_member` neu deployen.

**Anonymisierung + zukünftige Zusagen:** [`supabase-anonymize-upcoming-feedback.sql`](../supabase-anonymize-upcoming-feedback.sql) — bei Profil-Löschung entfallen Zusagen für **zukünftige** Termine; ohne verbleibendes Feedback wird die `members`-Zeile **gelöscht**, sonst anonymisiert (vergangene Teilnahmen). Enthält einmalige Bestandsbereinigung.

**Abstimmung nach Termin-Ende:** [`supabase-feedback-event-expired.sql`](../supabase-feedback-event-expired.sql) — Zusagen/Abstimmung für abgelaufene Termine schließen (`is_termin_still_upcoming`); Frontend zeigt Hinweis statt Formular. Voraussetzung: `is_termin_still_upcoming()` deployt.

**Feedback Public-Registrierung (Magic Link):** [`supabase-feedback-public-registration.sql`](../supabase-feedback-public-registration.sql) — externe Teilnehmer, abstimmen erst nach Login; `submit_public_feedback` für anonym nicht mehr.

**Phase 5 — Website-Hinweise:** [`supabase/supabase-site-content.sql`](supabase-site-content.sql) — öffentliches SELECT auf `site_state` für `site_banner`, `saison_mode`, `landing_hints`, `site_overlay` (nach `supabase-public-read.sql`).


**Externe Teilnehmer Einwilligungen:** [`supabase-public-participant-consents.sql`](../supabase-public-participant-consents.sql) — Kontakt-Einwilligung Pflicht, Bilder optional (RPC + Datum).

**Gelöschte Mitglieder nicht neu anlegen:** Frontend-Fix in `member-auth.js` / `member-service.js`; SQL: anonymisierte Zeilen in `complete_public_participant_registration` ignorieren (in `supabase-public-participant-consents.sql`). Edge Function `anonymize-member-account` beendet alle Auth-Sessions (`signOut global`) vor User-Löschung — **neu deployen**.

**Mitglieder anonymisieren:** [`supabase-members-anonymize.sql`](../supabase-members-anonymize.sql) — Account-Löschung entfernt personenbezogene Daten, `member_id` und `feedback_answers` bleiben; Edge Function `anonymize-member-account` löscht zusätzlich `auth.users`.

**Mitglieder letzter Login:** [`supabase-members-last-login.sql`](../supabase-members-last-login.sql) — Spalte `last_login_at`, RPC `touch_member_last_login()` beim Magic-Link-Login; einmaliges Backfill aus `auth.users`.

**Veränderungs-Zusammenfassung:** [`supabase-member-change-summary.sql`](../supabase-member-change-summary.sql) — `members.last_change_summary_seen_at`, `Termine.created_at`/`updated_at`, RPCs `get_member_change_summary()`, `touch_member_change_summary_seen()`, Hilfsfunktion `is_club_member()`. **Entwürfe (News/Termine `sichtbarkeit=draft`) zählen nur für Vorstand** — bei Popup-Problemen die Datei erneut im SQL Editor ausführen.

**Medien-Storage Phase 0:** [`supabase-media-storage-paths.sql`](../supabase-media-storage-paths.sql) — Spalten `image_storage_path`, `gpx_storage_path` (Termine), `image_storage_path` (News). Siehe [MEDIA-STORAGE-ROADMAP.md](../MEDIA-STORAGE-ROADMAP.md).

**Medien-Storage Phase 3:** [`supabase-media-move.sql`](../supabase-media-move.sql) — RPCs `get_media_references`, `move_media_object`, `delete_media_object` (Vorstand). Verschieben/Umbenennen/Löschen im Admin unter `/admin/medien.html`.

**Mitglieder-Inhalte (Entwürfe):** [`supabase-member-content.sql`](../supabase-member-content.sql) — Spalte `created_by` auf `News`/`Termine`, RLS: Vereinsmitglieder dürfen eigene Entwürfe einreichen/bearbeiten; erscheinen im Admin unter Entwürfe. Frontend: Profil-Tab **Content**, `/profil/termin_edit/`, `/profil/news_edit/`. **Nach** `supabase-member-change-summary.sql` (wegen `is_club_member()`).

**Mitglieder-Mediathek-Upload:** [`supabase-member-media-upload.sql`](../supabase-member-media-upload.sql) — Storage-Policy: Vereinsmitglieder dürfen in `shared/images/` und `shared/routes/` hochladen (Picker „Hochladen“ im Profil). **Nach** `supabase-member-change-summary.sql` und `supabase-vorstand-roles.sql`.

**Termin-Rückblicke (Historie) Phase 0:** [`supabase-termin-recaps.sql`](../supabase-termin-recaps.sql) — Tabellen `termin_recaps`, `termin_recap_images`, Hilfsfunktionen (`termin_allows_recap`, `can_select_termin_recap`), RLS (Vorstand CRUD; Mitglieder eigene Entwürfe wenn `Termine.created_by` passt). **Nach** `supabase-member-content.sql` und `supabase-anonymize-upcoming-feedback.sql` (`is_termin_still_upcoming`). Konzept: [`FACHKONZEPT-TERMIN-RECAPS.md`](../FACHKONZEPT-TERMIN-RECAPS.md).

**Rückblick-Bilder Storage:** [`supabase-recap-media-upload.sql`](../supabase-recap-media-upload.sql) — Mitglieder dürfen in `recaps/{termin_id}/` hochladen, wenn sie den Termin erstellt haben. Öffentliches Lesen über bestehende `media`-Policy (ohne `protocols/`). Vorstand: bestehende `media_insert_vorstand`. **Nach** `supabase-termin-recaps.sql`.

**Termin-Rückblicke Phase 1 Frontend:** Nach SQL Phase 0 — Admin `/admin/termine_edit.html` (Rückblick-Abschnitt), Entwürfe-Liste, Terminseite (`/kalender/{slug}/`), **Erlebtes** `/erlebtes/` (Alt: `/historie/` → Redirect). JS: `assets/js/recap/*`, `assets/js/erlebtes/*`. Checkliste: [`SMOKE-TEST-RECAPS.md`](../SMOKE-TEST-RECAPS.md).

**Termin-Rückblicke Phase 2 Frontend (Mitglieder):** Content-Tab `/profil/?tab=content` (Rückblick-Aktionen an freigegebenen Terminen), Bearbeitung `/profil/recap_edit/?termin_id=…`. JS: `assets/js/member/member-content.js`, `member-recaps.js`, `member-recap-edit.js`. Alt-Tab `?tab=rueckblicke` → Content.

**Einwilligung Widerruf:** [`supabase-member-consent-revoke.sql`](../supabase-member-consent-revoke.sql) — Spalten `kontakt_widerrufen_am`, `bilder_widerrufen_am` für dokumentierten Widerruf (Admin + Profil-Anzeige).

**Ersteller-Anzeige (Kalender/Details):** [`supabase-content-creator-display.sql`](../supabase-content-creator-display.sql) — RPC `get_content_creator_labels()` für öffentliche Anzeigenamen bei freigegebenen News/Terminen. **Nach** `supabase-member-content.sql`.

**Medien-Storage Phase 4 (optional aufräumen):** [`supabase-media-backfill-drop.sql`](../supabase-media-backfill-drop.sql) — Backfill-RPCs in Supabase entfernen, nachdem die einmalige Migration gelaufen ist.

**Protokolle (Vorstand):** [`supabase-board-documents.sql`](../supabase-board-documents.sql) — Tabelle `board_documents`, PDFs unter `protocols/` im Storage (nur Vorstand lesbar). **Kurzbeschreibung in Listen:** [`supabase-board-documents-subject.sql`](../supabase-board-documents-subject.sql) — Spalte `subject` (Feld „Inhalt“ im Admin). **Dateien verschieben:** [`supabase-board-documents-storage-update.sql`](../supabase-board-documents-storage-update.sql) — Storage-Policy `UPDATE` für `move`/Umbenennen.

**Admin-E-Mail Versandprotokoll:** [`supabase-admin-email-log.sql`](../supabase-admin-email-log.sql) — Tabelle `admin_email_log`, 18 Monate Retention; danach Edge `send-admin-email` neu deployen. Setup: [`supabase-admin-email-setup.md`](../supabase-admin-email-setup.md).

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
| `send-admin-email` | [`supabase-edge-send-admin-email.ts`](../supabase-edge-send-admin-email.ts) — Vorstand-E-Mails; Termin-Empfänger: **Ja und Vielleicht** bei `yes_maybe`; Versandprotokoll → [`supabase-admin-email-log.sql`](../supabase-admin-email-log.sql); Setup: [`supabase-admin-email-setup.md`](../supabase-admin-email-setup.md) — **nach Code-Änderung neu deployen** |
| `strava-oauth-start` | [`supabase-edge-strava-oauth-start.ts`](../supabase-edge-strava-oauth-start.ts) — POST + JWT; liefert Strava-Authorize-URL — Setup: [`supabase-strava-setup.md`](../supabase-strava-setup.md) |
| `strava-oauth-callback` | [`supabase-edge-strava-oauth-callback.ts`](../supabase-edge-strava-oauth-callback.ts) — GET; Token-Austausch, speichert `strava_connections`, Redirect `/profil/?strava=connected` |
| `strava-sync` | [`supabase-edge-strava-sync.ts`](../supabase-edge-strava-sync.ts) — Webhook + Sync — Setup: [`supabase-strava-sync-setup.md`](../supabase-strava-sync-setup.md) |

## Strava — Öffentliches Portal (Schritt 7–10)

SQL: [`supabase-strava-public.sql`](../supabase-strava-public.sql) im **SQL Editor** ausführen.

| RPC | Zweck |
|-----|--------|
| `get_public_activity_feed(p_days)` | Feed `/aktivitaeten/` — `publish_feed`, nur Rad, 90 Tage |
| `get_public_activity_detail(uuid, p_days)` | Detail `/aktivitaeten/{uuid}/` — nur Rad; inkl. DetailedActivity-Felder (Phase A.1) |
| `get_public_activity_streams(uuid)` | Streams lazy load — gleiche Sichtbarkeit wie Detail (Phase B.2) |
| `get_public_member_rankings(year, month?)` | Rankings — `publish_rankings`, nur Rad; `avatar_url` |
| `get_public_club_stats(year, month?)` | Vereinsziele — nur Rad-Kennzahlen |
| `get_member_profile_avatar()` | Profil-Tab — eigenes Avatar (authenticated) |

Website: `/aktivitaeten/`, Navigation „Aktivitäten“, JS unter `assets/js/aktivitaeten/`.

Mitglieder steuern Sichtbarkeit im Profil → Tab Strava (Feed / Rankings / Vereinsziele getrennt).

**Profil — Meine Aktivitäten:** [`supabase-strava-member-activities.sql`](../supabase-strava-member-activities.sql) — RPC `get_member_activities(p_limit)` (nur `authenticated`, eigene importierte Touren inkl. Feed-Badge).

**Phase 2 — Radfokus (sport_category):** [`supabase/supabase-sport-category-rad.sql`](supabase-sport-category-rad.sql) — Spalte `sport_category`, Mapping-Funktion, Stats-Rebuild, Public-RPCs und Profil-Aktivitäten filtern auf `rad`. **Danach** Edge Function `strava-sync` neu deployen (siehe [`PHASE-2-IMPLEMENTATION.md`](../PHASE-2-IMPLEMENTATION.md)).

**Phase 3 — Profilbilder:** [`supabase/supabase-member-avatars.sql`](supabase/supabase-member-avatars.sql) — `members.avatar_*`, Bucket `avatars`, Storage-RLS, Public-RPCs mit `avatar_url`, `get_member_profile_avatar()`, `anonymize_member` erweitert. Siehe [`PHASE-3-IMPLEMENTATION.md`](../PHASE-3-IMPLEMENTATION.md).

**Phase A.1 — Aktivitätsdetail (DetailedActivity):** [`supabase-aktivitaeten-detail-phase-a1.sql`](../supabase-aktivitaeten-detail-phase-a1.sql) — 11 Detail-Spalten auf `activities`, erweiterte RPC `get_public_activity_detail`. **Danach** Edge Function `strava-sync` neu deployen (jede importierte Aktivität via `GET /activities/{id}`; öffentliche Sichtbarkeit weiter nur über RPC). Karten-Felder: [`supabase-aktivitaeten-card-display.sql`](../supabase-aktivitaeten-card-display.sql) muss vorher ausgeführt sein.

**Phase B.2 — Activity-Streams:** [`supabase-aktivitaeten-streams-phase-b2.sql`](../supabase-aktivitaeten-streams-phase-b2.sql) — Tabelle `activity_streams`, RPC `get_public_activity_streams(uuid)`. **Danach** Edge Function `strava-sync` neu deployen (Streams nur Rad, non-blocking, Downsample via `STRAVA_STREAM_TARGET_POINTS`, Prod typisch **1000**). Kein Frontend in B.2.

**Stream-Validierung (B.2):** Alle fünf Keys (`distance`, `altitude`, `velocity_smooth`, `latlng`, `time`) sind Pflicht mit gleicher Array-Länge. Fehlende/unvollständige Strava-Antworten → Stream-Skip, Activity-Import bleibt erfolgreich.

**Möglicher zukünftiger Fallback (nicht B.2):** `time` optional behandeln, wenn Strava den Stream sporadisch nicht liefert — würde höhere Persistenzrate ergeben, ist aber bewusst nicht in B.2 umgesetzt.

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
| `termin_recaps` / `termin_recap_images` | SELECT `published` + Termin `public` | + `published` + Termin `members`; eigene `draft` | ALL |
| `members` | — | SELECT/UPDATE eigene Zeile | SELECT alle + CRUD alle |
| `galleries` / `gallery_images` | SELECT | SELECT | CRUD |
| `feedback_modules` | SELECT | SELECT | ALL |
| `feedback_answers` | — | SELECT/INSERT/UPDATE eigene | SELECT alle + (später Auswertung) |
| `site_state` | SELECT `last_push` + Phase-5-Keys | SELECT `last_push` + Phase-5-Keys | ALL |
| `storage.objects` (media) | SELECT | SELECT | INSERT, UPDATE, DELETE |
| `storage.objects` (avatars) | SELECT | INSERT/UPDATE/DELETE eigenes `{member_id}/` | INSERT/UPDATE/DELETE alle |

Schreibzugriffe auf `site_state` (`last_push`) für die Tröte: Vorstand direkt per Client (RLS).

## Upgrade vs. Neuinstallation

- **Neu:** Skripte 0→4 der Reihe nach.
- **Bereits live:** Einzelne Skripte erneut ausführen ist idempotent (`drop policy if exists` …).
- **`is_vorstand()` / `is_member()`:** nutzen `SET row_security = off` — bei Problemen mit Admin-Listen erneut [`supabase-vorstand-roles.sql`](../supabase-vorstand-roles.sql) bzw. [`supabase-content-visibility.sql`](../supabase-content-visibility.sql) ausführen.

## Go-live Checkliste (Website + Supabase)

**Gesamtübersicht:** [`GO-LIVE-CHECKLIST.md`](../GO-LIVE-CHECKLIST.md) — SQL, Edge Functions, Smoke-Tests Phase 2–3–5.

Kurz (Details im Dokument oben):

| Bereich | Aktion |
|---------|--------|
| **SQL Feedback** | [`supabase-feedback-cascade-delete.sql`](../supabase-feedback-cascade-delete.sql) + [`supabase-feedback-answers-delete-own.sql`](../supabase-feedback-answers-delete-own.sql) ausgeführt |
| **SQL Change Summary** | [`supabase-member-change-summary.sql`](../supabase-member-change-summary.sql) ausgeführt |
| **Edge `send-admin-email`** | Code deployt; Termin-Mails zählen **Ja + Vielleicht** (Preview in Admin = tatsächlicher Versand) |
| **Edge `anonymize-member-account`** | Deployt, JWT Verify **OFF**; Test Account löschen |
| **Redirect URLs** | `/profil/`, `/**`, ggf. `/event.html`, `/news-detail.html` für Rückkehr nach Magic Link |
| **Smoke-Test** | Öffentlicher Termin + Abstimmung; siehe [`SMOKE-TEST-PUBLIC-REGISTRATION.md`](SMOKE-TEST-PUBLIC-REGISTRATION.md) |
| **Mitglieder-Hilfe** | [`mitglieder-hilfe.md`](../../mitglieder-hilfe.md) verlinkt / Inhalt stimmt mit UI |
| **Public-Registrierung** | SQL + Frontend; Details [`PUBLIC-REGISTRATION.md`](PUBLIC-REGISTRATION.md) |

## Public-Registrierung — Troubleshooting

| Symptom | Prüfen |
|---------|--------|
| Gate fehlt | `Termine.sichtbarkeit=public`, `feedback_modules.public_voting=true`, `enabled=true` |
| RPC-Fehler im Browser | `can_register_public_participant`, `complete_public_participant_registration` in Supabase SQL Editor vorhanden? |
| Nach Magic Link keine Abstimmung | Browser-Konsole; gleicher Browser wie Formular; Redirect URL erlaubt |
| Upsert-Fehler | [`supabase-feedback-answers-unique-fix.sql`](../supabase-feedback-answers-unique-fix.sql) |

Details: [`PUBLIC-REGISTRATION.md`](PUBLIC-REGISTRATION.md)

Details: [`../supabase-members-setup.md`](../supabase-members-setup.md), [`../supabase-admin-email-setup.md`](../supabase-admin-email-setup.md).

## Siehe auch

- Go-live: [`GO-LIVE-CHECKLIST.md`](../GO-LIVE-CHECKLIST.md)
- Schema: [`SCHEMA.md`](SCHEMA.md)
- Architektur: [`../ARCHITECTURE.md`](../ARCHITECTURE.md)
- Magic Link Setup: [`../supabase-members-setup.md`](../supabase-members-setup.md)
