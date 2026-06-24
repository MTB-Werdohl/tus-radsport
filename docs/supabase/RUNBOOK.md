# Supabase Runbook — MTB Werdohl

Alle SQL-Skripte liegen in **`docs/supabase/`** und werden **manuell** im Supabase SQL Editor ausgeführt.

**Voraussetzung:** Supabase-Projekt mit Basis-Tabellen (`members`, `Termine`, Storage-Bucket `media`, …). Tabelle **`News`** fehlt in manchen Installationen — dann zuerst [`supabase-news-table.sql`](supabase-news-table.sql) ausführen. Die Website erwartet die Konfiguration in `assets/js/core/site-config.js`.

---

## Neuinstallation — Reihenfolge

Skripte der Reihe nach ausführen. Jedes Skript ist idempotent (`drop … if exists`, `add column if not exists`, …).

### Kern (Mitglieder, Inhalte, RLS)

| # | Datei | Inhalt |
|---|--------|--------|
| 0a | [`supabase-news-table.sql`](supabase-news-table.sql) | **Basis-Tabelle `News`** (falls noch nicht vorhanden) — vor Schritt 3 |
| 0 | [`supabase-public-read.sql`](supabase-public-read.sql) | Öffentliches SELECT: `galleries`, `gallery_images`, `site_state` (`last_push`), Storage `media` |
| 1 | [`supabase-members-auth.sql`](supabase-members-auth.sql) | RLS Basis, `check_member_email()` |
| 2 | [`supabase-vorstand-roles.sql`](supabase-vorstand-roles.sql) | `is_vorstand()`, Vorstand-Schreibrechte |
| 3 | [`supabase-content-visibility.sql`](supabase-content-visibility.sql) | `is_member()`, `sichtbarkeit`, News/Termine-SELECT |
| 3b | [`supabase-content-slug-resolve.sql`](supabase-content-slug-resolve.sql) | `resolve_content_slug()` |
| 4 | [`supabase-members-admin.sql`](supabase-members-admin.sql) | Vorstand CRUD auf `members` |
| 5 | [`supabase-site-content.sql`](supabase-site-content.sql) | Saisonmodus / Website-Hinweise in `site_state` |
| 6 | [`supabase-members-last-login.sql`](supabase-members-last-login.sql) | `last_login_at`, `touch_member_last_login()` |
| 7 | [`supabase-member-change-summary.sql`](supabase-member-change-summary.sql) | Tröte: `get_member_change_summary()`, `is_club_member()` |
| 8 | [`supabase-member-content.sql`](supabase-member-content.sql) | `created_by`, Entwürfe für Termine |
| 8b | [`supabase-member-news-vorstand-only.sql`](supabase-member-news-vorstand-only.sql) | News-Entwürfe nur Vorstand |
| 8c | [`supabase-member-termin-feedback.sql`](supabase-member-termin-feedback.sql) | Feedback-Modul automatisch für Termine |
| 9 | [`supabase-content-creator-display.sql`](supabase-content-creator-display.sql) | `get_content_creator_labels()` |
| 10 | [`supabase-member-consent-revoke.sql`](supabase-member-consent-revoke.sql) | Widerruf Einwilligungen |
| 11 | [`supabase-members-anonymize.sql`](supabase-members-anonymize.sql) | `anonymize_member()` |
| 12 | [`supabase-anonymize-upcoming-feedback.sql`](supabase-anonymize-upcoming-feedback.sql) | Löschung: zukünftige Zusagen entfallen |

### Feedback & Abstimmungen

| # | Datei | Inhalt |
|---|--------|--------|
| 20 | [`supabase-feedback.sql`](supabase-feedback.sql) | `feedback_modules`, `feedback_answers` |
| 21 | [`supabase-feedback-answers-delete-own.sql`](supabase-feedback-answers-delete-own.sql) | Eigene Antwort löschen |
| 22 | [`supabase-feedback-public-voting.sql`](supabase-feedback-public-voting.sql) | Spalte `public_voting` |
| 23 | [`supabase-feedback-cascade-delete.sql`](supabase-feedback-cascade-delete.sql) | Trigger: Modul mit Termin/News löschen |
| 24 | [`supabase-feedback-enabled.sql`](supabase-feedback-enabled.sql) | Spalte `enabled` |
| 25 | [`supabase-phase4a-feedback-events.sql`](supabase-phase4a-feedback-events.sql) | Einzeltermine: `feedback_answer_events`, RPCs |
| 26 | [`supabase-admin-event-participants.sql`](supabase-admin-event-participants.sql) | Teilnehmerliste, Walk-in, `submit_public_feedback` |
| 27 | [`supabase-feedback-event-expired.sql`](supabase-feedback-event-expired.sql) | Abstimmung nach Termin-Ende schließen |
| 28 | [`supabase-feedback-module-summary.sql`](supabase-feedback-module-summary.sql) | RPC `get_feedback_module_summary()` |
| 29 | [`supabase-feedback-public-registration.sql`](supabase-feedback-public-registration.sql) | Externe Registrierung (Magic Link) |
| 30 | [`supabase-feedback-public-email-verify.sql`](supabase-feedback-public-email-verify.sql) | RPCs `can_register_public_participant`, `complete_public_participant_registration` |
| 31 | [`supabase-public-participant-consents.sql`](supabase-public-participant-consents.sql) | Einwilligungen externe Teilnehmer |
| 32 | [`supabase-members-public-role.sql`](supabase-members-public-role.sql) | Rolle `public`, `is_member()` ohne public |

Details externe Abstimmung: [`PUBLIC-REGISTRATION.md`](PUBLIC-REGISTRATION.md)

### Medien & Protokolle

| # | Datei | Inhalt |
|---|--------|--------|
| 40 | [`supabase-media-storage-paths.sql`](supabase-media-storage-paths.sql) | Spalten `image_storage_path`, `gpx_storage_path` |
| 41 | [`supabase-media-move.sql`](supabase-media-move.sql) | RPCs Mediathek (Verschieben/Löschen) |
| 42 | [`supabase-member-media-upload.sql`](supabase-member-media-upload.sql) | Mitglieder-Upload in `shared/` |
| 43 | [`supabase-board-documents.sql`](supabase-board-documents.sql) | Protokolle (`board_documents`) |
| 44 | [`supabase-board-documents-subject.sql`](supabase-board-documents-subject.sql) | Spalte `subject` |
| 45 | [`supabase-board-documents-storage-update.sql`](supabase-board-documents-storage-update.sql) | Storage UPDATE für Verschieben |

### E-Mail (Vorstand)

| # | Datei | Inhalt |
|---|--------|--------|
| 50 | [`supabase-admin-email-log.sql`](supabase-admin-email-log.sql) | Versandprotokoll — danach Edge `send-admin-email` deployen |

Setup: [`../supabase-admin-email-setup.md`](../supabase-admin-email-setup.md)

### Strava / Aktivitätenportal

| # | Datei | Inhalt |
|---|--------|--------|
| 60 | [`supabase-strava.sql`](supabase-strava.sql) | Verbindungen, `activities`, Profil-RPCs |
| 61 | [`supabase-strava-sync-status.sql`](supabase-strava-sync-status.sql) | Sync-Status-Spalten |
| 62 | [`supabase-strava-public.sql`](supabase-strava-public.sql) | Öffentlicher Feed, Rankings, Detail-RPCs |
| 63 | [`supabase-sport-category-rad.sql`](supabase-sport-category-rad.sql) | Radfokus (`sport_category`) |
| 64 | [`supabase-member-avatars.sql`](supabase-member-avatars.sql) | Profilbilder, Bucket `avatars` |
| 65 | [`supabase-aktivitaeten-card-display.sql`](supabase-aktivitaeten-card-display.sql) | Karten-Felder für Feed |
| 66 | [`supabase-aktivitaeten-detail-phase-a1.sql`](supabase-aktivitaeten-detail-phase-a1.sql) | Detail-Spalten + RPC |
| 67 | [`supabase-aktivitaeten-streams-phase-b2.sql`](supabase-aktivitaeten-streams-phase-b2.sql) | Activity-Streams |
| 68 | [`supabase-strava-member-activities.sql`](supabase-strava-member-activities.sql) | Profil „Meine Aktivitäten“ |

Nach **60–68** jeweils Edge Function `strava-sync` neu deployen, wenn sich Import-Logik ändert.

Setup: [`../supabase-strava-setup.md`](../supabase-strava-setup.md) · Sync: [`../supabase-strava-sync-setup.md`](../supabase-strava-sync-setup.md)

### Optional

| Datei | Inhalt |
|--------|--------|
| [`supabase-termine-multiday.sql`](supabase-termine-multiday.sql) | Mehrtages-Termine (`endDate`, `durationDays`) |
| [`seed-stadtradeln-news.sql`](seed-stadtradeln-news.sql) | Beispiel-News (nur Demo) |

---

## Edge Functions

| Funktion | Quellcode | Hinweis |
|----------|-----------|---------|
| `anonymize-member-account` | [`../supabase-edge-anonymize-member-account.ts`](../supabase-edge-anonymize-member-account.ts) | JWT Verify **OFF**; ruft `anonymize_member()` |
| `send-admin-email` | [`../supabase-edge-send-admin-email.ts`](../supabase-edge-send-admin-email.ts) | Nach SQL #50 deployen |
| `strava-oauth-start` | [`../supabase-edge-strava-oauth-start.ts`](../supabase-edge-strava-oauth-start.ts) | POST + JWT |
| `strava-oauth-callback` | [`../supabase-edge-strava-oauth-callback.ts`](../supabase-edge-strava-oauth-callback.ts) | GET Redirect |
| `strava-sync` | [`../supabase-edge-strava-sync.ts`](../supabase-edge-strava-sync.ts) | Webhook + Import |

---

## Policy-Matrix (Kurz)

| Tabelle | anon | authenticated (Mitglied) | authenticated (Vorstand) |
|---------|------|----------------------------|---------------------------|
| `News` / `Termine` | SELECT `public` | + `members` + `public` | alle + CRUD |
| `members` | — | eigene Zeile | alle + CRUD |
| `feedback_modules` | SELECT | SELECT | ALL |
| `feedback_answers` | — | eigene | alle |
| `site_state` | SELECT Hinweise + `last_push` | SELECT Hinweise + `last_push` | ALL |
| `storage.objects` (media) | SELECT | SELECT | INSERT/UPDATE/DELETE |
| `storage.objects` (avatars) | SELECT | eigenes `{member_id}/` | alle |

---

## Auth (Magic Link)

Redirect URLs in Supabase Auth:

- `https://<domain>/profil/`
- `https://<domain>/**`

Details: [`../supabase-members-setup.md`](../supabase-members-setup.md)

---

## Siehe auch

- Go-live: [`../GO-LIVE-CHECKLIST.md`](../GO-LIVE-CHECKLIST.md)
- Schema: [`SCHEMA.md`](SCHEMA.md)
- Architektur: [`../ARCHITECTURE.md`](../ARCHITECTURE.md)
- Smoke-Test externe Abstimmung: [`SMOKE-TEST-PUBLIC-REGISTRATION.md`](SMOKE-TEST-PUBLIC-REGISTRATION.md)
