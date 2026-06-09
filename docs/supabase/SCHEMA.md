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
| `strava_connected_at` | timestamptz | letzte Strava-Verbindung (Profil-Anzeige) |
| `strava_sync_enabled` | boolean | Sync aktiv (intern) |
| `publish_feed` | boolean | im öffentlichen Feed (90 Tage) |
| `publish_rankings` | boolean | in Rankings |
| `contribute_to_club_goals` | boolean | fließt in Vereinsstatistiken ein |

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
| `activity_type`, `activity_name` | text | |
| `distance_m`, `moving_time_s`, `elevation_gain_m` | numeric/int | |
| `start_date` | timestamptz | Feed: letzte 90 Tage |
| `map_summary_polyline`, `activity_photo_url` | text | MVP: gespeichert, nicht angezeigt |
| `deleted_at` | timestamptz | Soft Delete (Strava-Trennung) |

**Sichtbarkeit:** Feed/Rankings/Ziele über `members.publish_*` — Opt-ins ändern nur Anzeige, nicht Löschung (außer `disconnect_strava`).

## `member_stats_month` / `member_stats_year` / `club_stats_month` / `club_stats_year`

Voraggregierte Werte; Rankings/Feed lesen vorberechnete Daten. Vereinsziele: nur Mitglieder mit `contribute_to_club_goals`.

### Öffentliche RPCs (Schritt 7–10)

| RPC | Grant | Filter |
|-----|-------|--------|
| `get_public_activity_feed(p_days)` | anon, authenticated | `publish_feed`, 90 Tage, nicht soft-deleted |
| `get_public_activity_detail(uuid, p_days)` | anon, authenticated | wie Feed |
| `get_public_member_rankings(year, month?)` | anon, authenticated | `publish_rankings` |
| `get_public_club_stats(year, month?)` | anon, authenticated | nur `contribute_to_club_goals` in Stats |

SQL: [`supabase-strava-public.sql`](../supabase-strava-public.sql)

## `News`

| Spalte | Hinweis |
|--------|---------|
| `sichtbarkeit` | `public` \| `members` \| `draft` — **RLS-Leseregel** |
| `published` | Legacy; Admin schreibt parallel via `publishedFromVisibility()`; OG-Build fallback |

## `Termine`

| Spalte | Hinweis |
|--------|---------|
| `date` | Einzeltermin: Start (Datum/Zeit) |
| `endDate` | Einzeltermin: optionales Enddatum (Mehrtages-Termin, inklusive) |
| `recurring`, `daysOfWeek`, `startTime`, `startRecur`, `endRecur`, `exclude` | Wiederkehrend |
| `durationDays` | Wiederkehrend: aufeinanderfolgende Tage pro Termin (optional, >1) |
| `sichtbarkeit` | `public` \| `members` \| `draft` |

## `galleries` / `gallery_images`

Metadaten + `image_path` (öffentliche Storage-URL).

## `site_state`

Key-Value (JSONB). Für die **Tröte** auf der Startseite: `key = 'last_push'`, `value` = `{ title, body, url, sent_at }`. Nur eine aktuelle Mitteilung; Vorstand überschreibt beim Veröffentlichen.

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
- Beim Löschen von Termin/News: Modul + Antworten entfernen (Admin-JS + DB-Trigger, siehe `supabase-feedback-cascade-delete.sql`)
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

**Unique:** `(module_id, member_id)` — eine Antwort pro Mitglied, Upsert zum Ändern.

## Storage `media`

Pfade z. B. `galleries/{jahr}/{slug}/…`, News/Termin-Uploads.
