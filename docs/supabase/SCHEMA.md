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

Wiederkehrende Felder: `recurring`, `daysOfWeek`, `startRecur`, `endRecur`, `startTime`, `exclude`, …  
`sichtbarkeit` wie News.

## `galleries` / `gallery_images`

Metadaten + `image_path` (öffentliche Storage-URL).

## `PushSubscriptions`

| Spalte | Hinweis |
|--------|---------|
| `endpoint` | UNIQUE (empfohlen) |
| `member_id` | → `members.id` |
| `p256dh`, `auth`, `active` | Web Push |
| `device_name`, `user_agent` | Profil-Anzeige |

## `site_state`

Key-Value (JSONB), z. B. `last_push` für Push-Widget.

## Storage `media`

Pfade z. B. `galleries/{jahr}/{slug}/…`, News/Termin-Uploads.
