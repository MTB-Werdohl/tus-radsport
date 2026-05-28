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
| `rolle` | text | `Mitglied` (default) \| `Vorstand` \| `public` (extern, kein Vereinszugang) |
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
