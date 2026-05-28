# Datenbankschema (public)

Stand: Projekt MTB Werdohl. Spalten aus Code + Supabase; bei Abweichungen Dashboard prüfen.

## `members`

| Spalte | Typ | Hinweis |
|--------|-----|---------|
| `id` | bigint PK | FK für `PushSubscriptions.member_id` |
| `mitgliedsnummer` | text | |
| `vorname`, `nachname` | text | |
| `abteilung` | text | |
| `strasse`, `hausnummer`, `plz`, `wohnort` | text | Profil editierbar (Mitglied) |
| `geburtsdatum` | date | |
| `email` | text | Magic-Link-Identität; mit `auth.users.email` abgleichen |
| `telefonnummer` | text | Profil editierbar |
| `rolle` | text | `Mitglied` (default) \| `Vorstand` |
| `einwilligung_kontakt` | boolean | Profil: nur Erteilen |
| `kontakt_eingewilligt_am` | date | |
| `einwilligung_bilder` | boolean | Profil: nur Erteilen |
| `bilder_eingewilligt_am` | date | |

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

## `PushSubscriptions`

| Spalte | Hinweis |
|--------|---------|
| `endpoint` | UNIQUE (empfohlen) |
| `member_id` | → `members.id` |
| `p256dh`, `auth`, `active` | Web Push |
| `device_name`, `user_agent` | Profil-Anzeige |

## `PushMessages`

| Spalte | Hinweis |
|--------|---------|
| `id` | bigint PK |
| `title`, `body`, `url` | Mitteilungsinhalt |
| `sent_at` | Zeitstempel (neueste zuerst) |

Verlauf wird beim Senden **append-only** gespeichert (kein Löschen). Widget + `/mitteilungen/` lesen daraus.

## `site_state`

Key-Value (JSONB), z. B. `last_push` für Push-Widget (Spiegel der letzten Mitteilung).

## Storage `media`

Pfade z. B. `galleries/{jahr}/{slug}/…`, News/Termin-Uploads.
