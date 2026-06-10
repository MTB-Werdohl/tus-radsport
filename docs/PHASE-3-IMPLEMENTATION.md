# Phase 3 — Profilbilder: Implementierung

**Stand:** Juni 2026  
**Bezug:** [`PHASE-3-PROFILBILDER-KONZEPT.md`](PHASE-3-PROFILBILDER-KONZEPT.md) (freigegeben)

## Zusammenfassung

Profilbilder sind von der **Einwilligung Bilder** (Tour-/Aktivitätsfotos) getrennt. Mitglieder und Vorstand können freiwillig ein Profilbild hochladen; der Upload inkl. Bestätigungsdialog gilt als Zustimmung zur **öffentlichen** Darstellung. Rolle `public` hat kein Profilbild-Feature.

**Anzeige:** Feed, Rankings, Aktivitätsdetail, Admin-Teilnehmerlisten, Profilseite. Initialen-Fallback ohne Bild.

## Deployment-Reihenfolge

1. **Phase 2** muss deployed sein (`sport_category`).
2. **SQL:** [`docs/supabase/supabase-member-avatars.sql`](supabase/supabase-member-avatars.sql) im Supabase SQL Editor ausführen.
3. **Bucket prüfen:** Dashboard → Storage → `avatars` (public read).
4. **Smoke-Test:** Profil-Upload, Feed/Ranking-Avatar, Entfernen, Anonymisierung.

**Nicht umgesetzt (Follow-up):** Strava-Profilbild-Import.

## Geänderte Dateien

| Datei | Änderung |
|-------|----------|
| `docs/supabase/supabase-member-avatars.sql` | **Neu** — Spalten, Bucket, RLS, RPCs, `anonymize_member` |
| `docs/supabase-members-anonymize.sql` | Avatar-Felder bei Anonymisierung nullen |
| `assets/js/core/site-config.js` | `storage.avatars` |
| `assets/js/member/member-service.js` | Upload, Entfernen, URL, Render, Normalisierung |
| `assets/js/member/member-render.js` | Profilbild-Block, Bilder-Einwilligung-Text angepasst |
| `assets/js/member/member-page.js` | Upload-/Entfernen-Events |
| `assets/js/aktivitaeten/aktivitaeten-render.js` | Avatare in Feed, Rankings, Detail |
| `assets/css/aktivitaeten.css` | Layout `.aktivitaeten-card-member` |
| `assets/css/style.css` | `.member-avatar*` Styles |
| `assets/js/feedback/feedback-service.js` | Avatar-Felder in Admin-Select |
| `admin/js/feedback-results.js` | Avatar in Teilnehmerliste |
| `docs/supabase/SCHEMA.md` | Avatar-Spalten dokumentiert |
| `docs/supabase/RUNBOOK.md` | Migrations-Schritt |
| `docs/PHASE-3-IMPLEMENTATION.md` | **Neu** — diese Datei |

## DB-Änderungen

### `members`

| Spalte | Zweck |
|--------|--------|
| `avatar_storage_path` | z. B. `{member_id}/avatar.webp` |
| `avatar_updated_at` | Cache-Busting |
| `avatar_source` | `upload` \| `strava` \| `admin` |
| `avatar_consent_at` | Zeitpunkt Upload-Zustimmung |

### Storage

- Bucket **`avatars`** (öffentlich lesbar)
- Policies: Mitglied eigener Pfad `{member_id}/…`; Vorstand voller Zugriff

### Funktionen

- `get_own_member_id()` — Storage-RLS
- `build_avatar_public_url(path, updated_at)` — RPCs liefern `avatar_url`
- Aktualisierte RPCs: `get_public_activity_feed`, `get_public_activity_detail`, `get_public_member_rankings`
- `anonymize_member` — Avatar-Felder nullen

## Risiken

| Risiko | Mitigation |
|--------|------------|
| Öffentlicher Bucket — URLs erratbar | Pfad enthält member_id; kein Listing; akzeptiertes Produktrisiko |
| Client-Upload ohne serverseitige Validierung | Max. 2 MB, WebP-Konvertierung, MIME-Filter; optional später Edge Function |
| `build_avatar_public_url` hardcoded Projekt-URL in SQL | Bei Domain-Wechsel SQL anpassen; Frontend nutzt `getPublicUrl` |
| Admin feedback-results ohne Avatar | `member-service.js` via `admin-head.html` geladen |

## Offene Punkte

1. **Strava-Profilbild übernehmen** — bewusst zurückgestellt
2. **`datenschutz.md`** — Abschnitt Profilbild vs. Tourfotos ergänzen (Redaktion)
3. **Vorstand setzt Avatar** — UI vorhanden über Storage-Policy; kein separater Admin-Dialog
4. **Edge Function Upload** — optional für EXIF-Stripping / Validierung

## Smoke-Test

1. Mitglied: Profilbild hochladen → Bestätigungsdialog → sichtbar im Profil
2. Feed/Ranking: Avatar neben Name (mit `publish_feed` / `publish_rankings`)
3. Profilbild entfernen → Initialen-Fallback
4. Rolle `public`: kein Profilbild-Block
5. `einwilligung_bilder` unabhängig vom Profilbild
6. Admin Feedback-Auswertung: kleines Avatar neben Name

## SQL-Datei (manuell ausführen)

```
docs/supabase/supabase-member-avatars.sql
```
