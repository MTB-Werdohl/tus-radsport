# Datenbankschema (public)

Stand: Projekt MTB Werdohl. Spalten aus Code + Supabase; bei Abweichungen Dashboard prüfen.

## `members`

| Spalte | Typ | Hinweis |
|--------|-----|---------|
| `id` | bigint PK | FK für `feedback_answers.member_id` |
| `mitgliedsnummer` | text | |
| `vorname`, `nachname` | text | |
| `abteilung` | text | |
| `strasse`, `hausnummer`, `plz`, `wohnort` | text | Profil editierbar (Mitglied) |
| `geburtsdatum` | date | |
| `email` | text | Magic-Link-Identität; mit `auth.users.email` abgleichen |
| `telefonnummer` | text | Profil editierbar |
| `rolle` | text | `Mitglied` (default) \| `Vorstand` \| `public` (extern, kein Vereinszugang) |
| `einwilligung_kontakt` | boolean | Profil: nur Erteilen |
| `kontakt_eingewilligt_am` | date | |
| `einwilligung_bilder` | boolean | Profil: nur Erteilen |
| `bilder_eingewilligt_am` | date | |
| `anonymized_at` | timestamptz | gesetzt nach Account-Löschung; `id` bleibt für `feedback_answers` |
| `last_login_at` | timestamptz | letzter erfolgreicher Magic-Link-Login (Admin: grün/rot) |
| `last_change_summary_seen_at` | timestamptz | letzte geschlossene Veränderungs-Zusammenfassung (Popup) |
| `strava_connected_at` | timestamptz | letzte Strava-Verbindung (Profil-Anzeige) |
| `strava_sync_enabled` | boolean | Sync aktiv (intern) |
| `publish_feed` | boolean | im öffentlichen Feed (90 Tage) |
| `publish_rankings` | boolean | in Rankings |
| `contribute_to_club_goals` | boolean | fließt in Vereinsstatistiken ein |
| `avatar_storage_path` | text | Pfad im Bucket `avatars`, z. B. `{member_id}/avatar.webp` |
| `avatar_updated_at` | timestamptz | Cache-Busting, Audit |
| `avatar_source` | text | `upload` \| `strava` \| `admin` |
| `avatar_consent_at` | timestamptz | optional — Zustimmung durch Upload/Import |

**Profilbild** ist getrennt von `einwilligung_bilder` (Tour-/Aktivitätsfotos). Upload = Einwilligung zur öffentlichen Darstellung. Rolle `public` hat kein Avatar-Feature.

## `strava_connections`

Nur serverseitig (kein Client-SELECT). Tokens für OAuth.

| Spalte | Typ | Hinweis |
|--------|-----|---------|
| `member_id` | bigint PK | → `members.id` |
| `strava_athlete_id` | bigint UNIQUE | Strava Athlete (Admin/Debug) |
| `access_token`, `refresh_token` | text | nur Edge Functions / definer |
| `token_expires_at`, `last_sync_at` | timestamptz | |
| `sync_status` | text | `pending` \| `syncing` \| `active` \| `error` |
| `sync_error_message` | text | letzter Fehler (Profil) |
| `imported_activity_count` | integer | Anzeige Profil |
| `initial_sync_completed_at` | timestamptz | Erstimport abgeschlossen |
| `created_at`, `updated_at` | timestamptz | |

## `activities`

Import aus Strava; UUID in URLs (`/aktivitaeten/{uuid}/`).

| Spalte | Typ | Hinweis |
|--------|-----|---------|
| `id` | uuid PK | öffentliche Detail-URL |
| `strava_activity_id` | bigint UNIQUE | Strava Source of Truth |
| `member_id` | bigint | → `members.id` |
| `activity_type`, `activity_name` | text | `activity_type` = Strava-Rohwert (`sport_type` vor `type` beim Import) |
| `sport_category` | text | `rad` \| `other` — abgeleitet via `map_strava_type_to_category()`; Filter für Feed/Rankings/Ziele |
| `distance_m`, `moving_time_s`, `elevation_gain_m` | numeric/int | |
| `start_date` | timestamptz | Feed: letzte 90 Tage |
| `start_location` | text | Ort aus Strava (`location_city` / `location_state`) |
| `map_summary_polyline`, `activity_photo_url` | text | Karte Feed / Foto |
| `elapsed_time_s` | integer | DetailedActivity; bei jedem Strava-Sync |
| `average_speed_mps`, `max_speed_mps` | numeric | m/s; DetailedActivity |
| `elev_high_m`, `elev_low_m` | numeric | Meter; DetailedActivity |
| `start_lat`, `start_lng`, `end_lat`, `end_lng` | double precision | Koordinaten; DetailedActivity |
| `map_polyline` | text | Volle Route; Detail-RPC, nicht Feed |
| `splits_metric` | jsonb | km-Splits; DetailedActivity |
| `deleted_at` | timestamptz | Soft Delete (Strava-Trennung) |

**Speicherung:** Jede importierte Strava-Aktivität wird als DetailedActivity (`GET /activities/{id}`) persistiert — unabhängig von `publish_feed` und `sport_category`.

**Sichtbarkeit:** Feed/Rankings/Ziele/Profil-Aktivitäten nur `sport_category = 'rad'`. Opt-ins (`members.publish_*`) steuern zusätzlich ob — nicht welche Sportart. Nicht-Rad bleibt in DB, ist aber nicht öffentlich sichtbar.

## `activity_streams`

Strava-Activity-Streams (Phase B.2), 1:1 zu `activities.id`.

| Spalte | Typ | Hinweis |
|--------|-----|---------|
| `activity_id` | uuid PK/FK → `activities.id` | `ON DELETE CASCADE` |
| `schema_version` | integer | Format-Version der Payload (Spalte, nicht im JSONB) |
| `original_point_count` | integer | Strava-Punkte vor Downsampling |
| `point_count` | integer | Gespeicherte Punkte (Obergrenze im Sync) |
| `streams` | jsonb | `distance`, `altitude`, `velocity_smooth`, `latlng`, `time` |
| `synced_at`, `updated_at` | timestamptz | |

**Speicherung:** Sync nur für `sport_category = 'rad'`; Fehler blockieren Activity-Import nicht.

**Sichtbarkeit:** Nur über `get_public_activity_streams(uuid)` — gleiche Filter wie Detail-RPC. Soft-Delete auf `activities` versteckt Streams; Zeile bleibt in DB.

SQL: [`supabase-aktivitaeten-streams-phase-b2.sql`](../supabase-aktivitaeten-streams-phase-b2.sql)

## `member_stats_month` / `member_stats_year` / `club_stats_month` / `club_stats_year`

Voraggregierte Werte nach `sport_category` (PK enthält Kategorie). Öffentliche RPCs lesen nur `sport_category = 'rad'`. Vereinsziele: nur Mitglieder mit `contribute_to_club_goals`.

### Öffentliche RPCs (Schritt 7–10)

| RPC | Grant | Filter |
|-----|-------|--------|
| `get_public_activity_feed(p_days)` | anon, authenticated | `publish_feed`, `sport_category=rad`, 90 Tage; `avatar_url` wenn gesetzt |
| `get_public_activity_detail(uuid, p_days)` | anon, authenticated | wie Feed; inkl. DetailedActivity-Felder (Phase A.1); `avatar_url` wenn gesetzt |
| `get_public_activity_streams(uuid)` | anon, authenticated | wie Detail-RPC; JSONB-Streams (Phase B.2); lazy load |
| `get_public_member_rankings(year, month?)` | anon, authenticated | `publish_rankings`, Stats `sport_category=rad`; `avatar_url` wenn gesetzt |
| `get_public_club_stats(year, month?)` | anon, authenticated | Vereinsziele nur Rad (`sport_category=rad`) |

SQL: [`supabase-strava-public.sql`](../supabase-strava-public.sql)

### Profil-RPCs (Mitglied)

| RPC | Grant | Zweck |
|-----|-------|--------|
| `get_strava_profile_status()` | authenticated | Strava-Tab: Verbindung, Sync, Sichtbarkeits-Flags |
| `update_strava_visibility(...)` | authenticated | Feed / Rankings / Vereinsziele |
| `disconnect_strava()` | authenticated | Verbindung trennen |
| `get_member_activities(p_limit)` | authenticated | Tab „Meine Aktivitäten“ — nur Rad, Badge `in_public_feed` |
| `get_member_change_summary()` | authenticated (Mitglied/Vorstand) | Zähler neuer sichtbarer Inhalte seit `last_change_summary_seen_at` |
| `touch_member_change_summary_seen()` | authenticated (Mitglied/Vorstand) | Popup/Erstbesuch: Zeitstempel setzen |
| `get_member_profile_avatar()` | authenticated | Eigenes Profilbild-Metadaten (URL, Initialen) |

SQL Profil-Aktivitäten: [`supabase-strava-member-activities.sql`](../supabase-strava-member-activities.sql)

SQL Profilbilder: [`supabase/supabase-member-avatars.sql`](supabase/supabase-member-avatars.sql)

## `News`

| Spalte | Hinweis |
|--------|---------|
| `sichtbarkeit` | `public` \| `members` \| `draft` — **RLS-Leseregel** |
| `published` | Legacy; Admin schreibt parallel via `publishedFromVisibility()`; OG-Build fallback |
| `image_storage_path` | Relativer Pfad im Bucket `media` (Phase 0 Medien-Storage); Legacy: `image` URL |

## `Termine`

| Spalte | Hinweis |
|--------|---------|
| `date` | Einzeltermin: Start (Datum/Zeit) |
| `endDate` | Einzeltermin: optionales Enddatum (Mehrtages-Termin, inklusive) |
| `created_at` | timestamptz | Erstellungszeitpunkt (Veränderungs-Zusammenfassung) |
| `updated_at` | timestamptz | letzte Bearbeitung |
| `recurring`, `daysOfWeek`, `startTime`, `startRecur`, `endRecur`, `exclude` | Wiederkehrend |
| `durationDays` | Wiederkehrend: aufeinanderfolgende Tage pro Termin (optional, >1) |
| `sichtbarkeit` | `public` \| `members` \| `draft` |
| `image`, `gpx` | Legacy: volle Public-URL |
| `image_storage_path`, `gpx_storage_path` | Relativer Pfad im Bucket `media` (Phase 0 Medien-Storage) |

## `galleries` / `gallery_images`

Metadaten + `image_path` (öffentliche Storage-URL).

## `site_state`

Key-Value (JSONB). Vorstand schreibt per Client (RLS).

| Key | Zweck |
|-----|--------|
| `last_push` | Tröte — `{ title, body, url, sent_at }` |
| `site_banner` | Globale Hinweisleiste — `{ active, text, url?, style, starts_at?, ends_at?, updated_at }` |
| `saison_mode` | Saison aktiv / pause — `{ mode, message, starts_at?, ends_at?, updated_at }` |
| `landing_hints` | Startseiten-Hinweise — `{ items: [{ text, url?, active }], updated_at }` |
| `site_overlay` | Modal für alle — `{ active, title, text, dismissible, starts_at?, ends_at?, updated_at }` |

Öffentliches SELECT: `last_push` + Phase-5-Keys (siehe `supabase-site-content.sql`).

## `feedback_modules` / `feedback_answers`

Universelles Feedback-System — **keine** RSVP-/Poll-Spalten in `Termine` oder `News`.

```
Content (Termin / News / …)
        ↕  entity_type + entity_id
feedback_modules
        ↕  module_id
feedback_answers
```

### Polymorphe Zuordnung (`entity_type` + `entity_id`)

`feedback_modules` verweist **bewusst ohne Foreign Key** auf unterschiedliche Tabellen:

| `entity_type` | Ziel (logisch) | `entity_id` |
|---------------|----------------|-------------|
| `event` | `Termine.id` | bigint |
| `news` | `News.id` | bigint |
| *(später)* `poll`, `organization`, … | eigene / andere Tabellen | bigint |

**Warum kein FK?** PostgreSQL erlaubt keine Spalte, die je nach Zeile auf `Termine`, `News` oder künftige Tabellen zeigt. Stattdessen:

- Integrität in **App-Logik** (Admin legt Modul nur an, wenn Entity existiert)
- Beim Löschen von Termin/News: Modul + Antworten entfernen (**DB-Trigger** in `supabase-feedback-cascade-delete.sql`; Admin-Listen löschen nur die Entity). Legacy-Vorab-Löschung nur noch in `admin/js/drafts.js`.
- `entity_type` per CHECK-Constraint auf erlaubte Werte
- optional `UNIQUE (entity_type, entity_id)` — max. ein Modul pro Inhalt (v1)

### `feedback_modules`

| Spalte | Typ | Hinweis |
|--------|-----|---------|
| `id` | bigint PK | |
| `type` | text | `yes_maybe` \| `yes_no_comment` \| `poll` |
| `entity_type` | text | siehe Tabelle oben |
| `entity_id` | bigint | polymorph, **kein FK** |
| `question` | text | Anzeige-Frage |
| `config` | jsonb | typ-spezifisch, default `{}` |
| `public_voting` | boolean | optional öffentliche Abstimmung |
| `enabled` | boolean | `false` = öffentlich ausgeblendet, Daten bleiben |
| `created_at` | timestamptz | |

**Poll-`config`** — Labels änderbar, IDs stabil:

```json
{
  "options": [
    { "id": "18uhr", "label": "18 Uhr" },
    { "id": "19uhr", "label": "19 Uhr" },
    { "id": "20uhr", "label": "20 Uhr" }
  ]
}
```

- `id`: slug-artig, unveränderlich nach erster Antwort (Admin-Validierung)
- `label`: Anzeige im Frontend, darf später angepasst werden

### `feedback_answers`

| Spalte | Typ | Hinweis |
|--------|-----|---------|
| `id` | bigint PK | |
| `module_id` | bigint | → `feedback_modules.id` (FK) |
| `member_id` | bigint | → `members.id` (FK) |
| `answer` | text | **Codierter Wert**, nicht Anzeige-Text |
| `comment` | text | optional (`yes_no_comment`) |
| `created_at`, `updated_at` | timestamptz | |

**Semantik von `answer` je Modul-Typ:**

| `type` | `answer` speichert | Beispiel |
|--------|-------------------|----------|
| `yes_maybe` | `yes` \| `maybe` | `yes` |
| `yes_no_comment` | `yes` \| `no` | `no` |
| `poll` | **`option_id`** aus `config.options[]` | `18uhr` — **nicht** `"18 Uhr"` |

Alte Poll-Antworten bleiben gültig, wenn Labels geändert werden; unbekannte `option_id` in Auswertung als „(Option entfernt)“ behandeln.

**Unique:** `(module_id, member_id)` — eine Antwort pro Mitglied, Upsert zum Ändern (Einzeltermine Phase 4a: Schreiben nur über RPC `set_event_feedback_answer`).

### `feedback_answer_events` (Phase 4a)

Historie von Statusänderungen bei **Einzeltermin**-Zusagen (`Termine.recurring = false`).

| Spalte | Typ | Hinweis |
|--------|-----|---------|
| `id` | bigint PK | |
| `module_id` | bigint | → `feedback_modules.id` |
| `member_id` | bigint | → `members.id` |
| `answer_id` | bigint NULL | → `feedback_answers.id` (NULL nach Löschen) |
| `event_type` | text | `set_answer` \| `withdraw` \| `withdraw_after_yes` \| `downgrade_after_yes` |
| `from_answer` | text NULL | vorheriger Code (`yes` / `maybe`) |
| `to_answer` | text NULL | neuer Code; NULL = keine Teilnahme |
| `cancellation_reason_code` | text NULL | bei Absage nach Ja: `krankheit`, `familie`, … |
| `comment` | text NULL | optional Freitext bei `sonstiges` |
| `created_at` | timestamptz | |

RPCs: `set_event_feedback_answer`, `list_feedback_participation_changes` (Vorstand). Siehe [`supabase-phase4a-feedback-events.sql`](../supabase-phase4a-feedback-events.sql).

## Storage `media`

Pfade z. B. `shared/images/…`, `shared/routes/…`, `galleries/{jahr}/{slug}/…`, Legacy-Root-Uploads. Siehe [MEDIA-STORAGE-ROADMAP.md](../MEDIA-STORAGE-ROADMAP.md).

| RPC | Rolle | Zweck |
|-----|-------|--------|
| `get_media_references(p_path)` | Vorstand | Referenzen in Terminen/News/Galerien |
| `move_media_object(p_old_path, p_new_path)` | Vorstand | Storage verschieben + DB-Referenzen aktualisieren |
| `delete_media_object(p_path, p_force)` | Vorstand | Löschen; mit Referenzen nur bei `p_force=true` |
| `count_media_backfill_candidates()` | Vorstand | Anzahl fehlender `*_storage_path` / Legacy-Pfade |
| `backfill_media_storage_paths(p_move_legacy_to_shared, p_dry_run)` | Vorstand | Backfill + optional Move nach `shared/` |
| `list_media_storage_orphans()` | Vorstand | Storage-Dateien ohne DB-Referenz |

SQL: [`supabase-media-move.sql`](../supabase-media-move.sql), [`supabase-media-backfill.sql`](../supabase-media-backfill.sql)

## Storage `avatars`

Profilbilder — öffentlich lesbar. Pfad: `{member_id}/avatar.webp` (WebP, max. 512×512, 1:1-Crop clientseitig).

| Policy | Rolle | Bedingung |
|--------|-------|-----------|
| `avatars_select_public` | anon + authenticated | öffentliches SELECT |
| `avatars_insert/update/delete_own` | authenticated | Pfad `{member_id}/…` via `get_own_member_id()` |
| `avatars_insert/update/delete_vorstand` | Vorstand | beliebiger Pfad |

`anonymize_member()` löscht Storage-Objekt und nullt `avatar_*`-Felder.
