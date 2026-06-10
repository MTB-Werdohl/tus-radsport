# Smoke-Test-Checkliste — Phase 2 & Phase 3

**Stand:** Juni 2026  
**Bezug:** [`PHASE-2-IMPLEMENTATION.md`](PHASE-2-IMPLEMENTATION.md), [`PHASE-3-IMPLEMENTATION.md`](PHASE-3-IMPLEMENTATION.md)

Manuelle Checkliste nach Deployment. Abhaken mit `[ ]` / `[x]`.

---

## Voraussetzungen (einmalig vor Tests)

| # | Schritt | Erledigt |
|---|---------|----------|
| P0 | SQL **`docs/supabase/supabase-sport-category-rad.sql`** im Supabase SQL Editor ausgeführt (inkl. Stats-Rebuild) | [ ] |
| P1 | Edge Function **`strava-sync`** neu deployt (`sport_type` vor `type`, `sport_category`) | [ ] |
| P2 | SQL **`docs/supabase/supabase-member-avatars.sql`** ausgeführt (nach Phase 2) | [ ] |
| P3 | Supabase Dashboard → Storage → Bucket **`avatars`** vorhanden, **public** lesbar | [ ] |
| P4 | Static Site / Frontend mit aktuellem Stand deployed | [ ] |

### Testdaten vorbereiten

| Rolle | Benötigt für |
|-------|----------------|
| **Mitglied A** | Strava verbunden, gemischte Aktivitäten (mindestens 1× Rad + 1× Nicht-Rad, z. B. Ride + Run) | Phase 2 |
| **Mitglied A** | Opt-ins steuerbar: Feed, Rankings, Vereinsziele (`/profil/` → Tab Strava) | Phase 2 + 3 |
| **Mitglied B** | Optional: nur Nicht-Rad-Aktivitäten (z. B. nur Läufe) | Phase 2 Grenzfälle |
| **Vorstand** | Admin-Zugang + Profilbild-Upload | Phase 3 |
| **Public** | Externer Teilnehmer (`rolle = public`) | Phase 3 Negativtest |
| **Admin** | Zugang zu Feedback-Auswertung | Phase 3 |

**Tipp:** UUID einer Rad- und einer Nicht-Rad-Aktivität aus Supabase notieren (`activities.id`, `sport_category`, `activity_type`).

---

## Phase 2 — Radfokus (nur Rad öffentlich)

### A. Öffentliches Aktivitätenportal (ohne Login)

**URL-Basis:** `/aktivitaeten/`

| # | Prüfpunkt | URL / Ort | Erwartung | OK |
|---|-----------|-----------|-----------|-----|
| 2.1 | **Feed** — nur Rad-Touren | Tab „Feed“ | Es erscheinen nur Radaktivitäten (Ride, MTB, Gravel, E-Bike, Virtual Ride, …). Keine Läufe, Workouts, Yoga, Schwimmen. | [ ] |
| 2.2 | **Feed** — Opt-in | Tab „Feed“ | Touren von Mitgliedern **ohne** „Im Feed veröffentlichen“ fehlen. | [ ] |
| 2.3 | **Feed** — Zeitfenster | Tab „Feed“ | Aktivitäten älter als 90 Tage erscheinen nicht (Standard `feedDays`). | [ ] |
| 2.4 | **Detail Rad** | `/aktivitaeten/{uuid-rad}/` | Seite lädt mit Name, Typ-Badge, Distanz, Datum. | [ ] |
| 2.5 | **Detail Nicht-Rad** | `/aktivitaeten/{uuid-lauf}/` | Meldung **„Aktivität nicht gefunden“** (RPC liefert `null`). | [ ] |
| 2.6 | **Ranking Monat** | Tab „Ranking“ | Liste sortiert nach Rad-Kilometern; Nicht-Rad-Distanzen fließen **nicht** ein. | [ ] |
| 2.7 | **Ranking Jahr** | Tab „Ranking“ | Jahreswertung ebenfalls nur Rad; kein Gesamt-Ranking über Sportarten. | [ ] |
| 2.8 | **Ranking** — Opt-in | Tab „Ranking“ | Mitglieder ohne „In Rankings erscheinen“ fehlen. | [ ] |
| 2.9 | **Vereinsziele Monat** | Tab „Vereinsziele“ | Distanz, Höhenmeter, Touren, aktive Mitglieder = **nur Rad**. | [ ] |
| 2.10 | **Vereinsziele Jahr** | Tab „Vereinsziele“ | Jahresblock ebenfalls nur Rad-Kennzahlen. | [ ] |
| 2.11 | **Vereinsziele** — Opt-in | Tab „Vereinsziele“ | Nur Mitglieder mit „Zu Vereinszielen beitragen“ zählen in `active_member_count`. | [ ] |
| 2.12 | **Kein Kategorie-Umschalter** | Gesamtes Portal | Kein Tab/Dropdown „Gesamt / Laufen / …“ — nur implizit Rad. | [ ] |

### B. Profil — eingeloggtes Mitglied

**URL:** `/profil/`

| # | Prüfpunkt | Ort | Erwartung | OK |
|---|-----------|-----|-----------|-----|
| 2.13 | **Meine Aktivitäten** — nur Rad | Tab „Meine Aktivitäten“ | Liste enthält **nur** importierte Rad-Touren (keine Läufe/Workouts). | [ ] |
| 2.14 | **Badge „Im Feed sichtbar“** | Tab „Meine Aktivitäten“ | Badge **nur** bei Rad + `publish_feed` + innerhalb 90 Tage. | [ ] |
| 2.15 | **Badge „Privat“** | Tab „Meine Aktivitäten“ | Rad-Touren ohne Feed-Opt-in oder außerhalb 90 Tage: Badge „Privat“. | [ ] |
| 2.16 | **Strava-Tab Import-Zähler** | Tab „Strava“ | `imported_activity_count` zählt weiter **alle** importierten Aktivitäten (Rad + Nicht-Rad) — bewusst unverändert. | [ ] |
| 2.17 | **Strava-Sync neu** | Tab „Strava“ → Sync auslösen | Neue Rad-Tour erscheint in Feed/Profil; neue Lauf-Tour **nicht** öffentlich, aber Import-Zähler steigt. | [ ] |

### C. Datenbank (optional, Supabase SQL Editor)

| # | Prüfpunkt | SQL / Tabelle | Erwartung | OK |
|---|-----------|---------------|-----------|-----|
| 2.18 | **Spalte vorhanden** | `activities.sport_category` | Werte nur `rad` oder `other`. | [ ] |
| 2.19 | **Mapping Ride** | `map_strava_type_to_category('Ride')` | `'rad'`. | [ ] |
| 2.20 | **Mapping Run** | `map_strava_type_to_category('Run')` | `'other'`. | [ ] |
| 2.21 | **Backfill** | `SELECT activity_type, sport_category, count(*) FROM activities WHERE deleted_at IS NULL GROUP BY 1,2` | Plausible Zuordnung; keine NULLs. | [ ] |
| 2.22 | **Stats Rad** | `member_stats_month` / `club_stats_month` mit `sport_category = 'rad'` | Werte > 0 wo Rad-Aktivitäten existieren. | [ ] |
| 2.23 | **Stats other** | Zeilen mit `sport_category = 'other'` | Vorhanden wenn Nicht-Rad importiert; werden **nicht** in öffentlichen RPCs genutzt. | [ ] |
| 2.24 | **Trigger** | `UPDATE activities SET activity_type = 'Run' WHERE …` (Testzeile) | `sport_category` wechselt automatisch auf `other`. | [ ] |

### D. Edge Function `strava-sync`

| # | Prüfpunkt | Erwartung | OK |
|---|-----------|-----------|-----|
| 2.25 | Neuer Import setzt `sport_type` vor `type` | `activity_type` entspricht Strava `sport_type` wenn gesetzt. | [ ] |
| 2.26 | Neuer Import setzt `sport_category` | Rad-Typen → `rad`, sonst `other`. | [ ] |

---

## Phase 3 — Profilbilder

### E. Profil — Upload & Entfernen (Mitglied / Vorstand)

**URL:** `/profil/` → Tab „Profil“

| # | Prüfpunkt | Erwartung | OK |
|---|-----------|-----------|-----|
| 3.1 | **Block sichtbar** | Abschnitt „Profilbild“ mit Vorschau, Upload, Hinweistext zur öffentlichen Darstellung. | [ ] |
| 3.2 | **Initialen-Fallback** | Ohne Bild: Kreis mit Initialen (Vorname + Nachname). | [ ] |
| 3.3 | **Bestätigungsdialog** | Beim Upload erscheint Confirm mit Hinweis auf öffentliche Darstellung (Feed, Rankings, Teilnehmerlisten, Profil). | [ ] |
| 3.4 | **Upload Erfolg** | Nach Bestätigung: Bild in Vorschau, Status „Profilbild gespeichert.“, Button „Profilbild entfernen“ sichtbar. | [ ] |
| 3.5 | **Dateiformat** | JPEG/PNG/WebP bis 2 MB werden akzeptiert; Bild wird als WebP gespeichert. | [ ] |
| 3.6 | **Große Datei** | > 2 MB → Fehlermeldung, kein Upload. | [ ] |
| 3.7 | **Entfernen** | Confirm → Bild weg, Initialen wieder sichtbar, Status „Profilbild entfernt.“ | [ ] |
| 3.8 | **Keine Bilder-Einwilligung nötig** | Upload funktioniert **ohne** aktive „Einwilligung Bilder (Tourfotos & Aktivitätsbilder)“. | [ ] |
| 3.9 | **Vorstand** | Gleicher Profilbild-Block wie Mitglied; Upload/Entfernen funktioniert. | [ ] |

### F. Rolle `public` (Negativtest)

**URL:** `/profil/` als externer Teilnehmer

| # | Prüfpunkt | Erwartung | OK |
|---|-----------|-----------|-----|
| 3.10 | **Kein Profilbild-Block** | Abschnitt „Profilbild“ fehlt; nur externe Stammdaten + Logout/Löschen. | [ ] |

### G. Einwilligung Bilder (Trennung)

**URL:** `/profil/` → Tab „Profil“

| # | Prüfpunkt | Erwartung | OK |
|---|-----------|-----------|-----|
| 3.11 | **Label getrennt** | Consent heißt „Einwilligung Bilder (Tourfotos & Aktivitätsbilder)“ — Text erwähnt **nicht** Profilbild. | [ ] |
| 3.12 | **Profilbild + Tour-Einwilligung unabhängig** | Profilbild hochladen ohne `einwilligung_bilder`; umgekehrt Einwilligung erteilen ohne Profilbild möglich. | [ ] |

### H. Öffentliche Anzeige mit Profilbild

Voraussetzung: Mitglied A mit Profilbild + Strava-Rad-Tour + passende Opt-ins.

| # | Prüfpunkt | URL / Ort | Erwartung | OK |
|---|-----------|-----------|-----------|-----|
| 3.13 | **Feed-Avatar** | `/aktivitaeten/` → Feed | Rundes Profilbild (ca. 36 px) neben Name auf Feed-Karte. | [ ] |
| 3.14 | **Feed ohne Bild** | `/aktivitaeten/` | Mitglied ohne Avatar: Initialen-Kreis statt Foto. | [ ] |
| 3.15 | **Ranking-Avatar** | `/aktivitaeten/` → Ranking | Kleines Avatar (ca. 28 px) in Namensspalte. | [ ] |
| 3.16 | **Detail-Avatar** | `/aktivitaeten/{uuid}/` | Avatar neben Name in Meta-Zeile. | [ ] |
| 3.17 | **Feed ohne publish_feed** | `/aktivitaeten/` | Mitglied mit Avatar aber **ohne** Feed-Opt-in: Tour erscheint nicht (unabhängig vom Avatar). | [ ] |

### I. Admin — Teilnehmerlisten

**URL:** `/admin/feedback_results.html` (bzw. Auswertung eines Moduls mit Antworten)

| # | Prüfpunkt | Erwartung | OK |
|---|-----------|-----------|-----|
| 3.18 | **Avatar in Tabelle** | Spalte „Mitglied“: kleines Avatar links neben Name (wenn `avatar_storage_path` gesetzt). | [ ] |
| 3.19 | **Ohne Avatar** | Initialen-Fallback oder leerer Kreis — kein Fehler in Konsole. | [ ] |
| 3.20 | **Anonymisiert** | Anonymisierter Account: kein Profilbild, Name „Anonym …“. | [ ] |

### J. Storage & Datenbank (optional)

| # | Prüfpunkt | Ort | Erwartung | OK |
|---|-----------|-----|-----------|-----|
| 3.21 | **Storage-Objekt** | Bucket `avatars` → `{member_id}/avatar.webp` | Datei nach Upload vorhanden. | [ ] |
| 3.22 | **members-Spalten** | `avatar_storage_path`, `avatar_updated_at`, `avatar_source = 'upload'`, `avatar_consent_at` gesetzt | [ ] |
| 3.23 | **Öffentliche URL** | `build_avatar_public_url(...)` / direkter Storage-Link | Bild im Browser abrufbar (public bucket). | [ ] |
| 3.24 | **RPC Feed** | `get_public_activity_feed` → Eintrag enthält `avatar_url` wenn Bild gesetzt | [ ] |
| 3.25 | **RPC Profil** | `get_member_profile_avatar()` (authenticated) | Liefert `avatar_url`, `initials`, Pfade. | [ ] |
| 3.26 | **Fremdes Upload verboten** | Als Mitglied A Upload in Pfad von Mitglied B versuchen (nur falls manuell testbar) | RLS verweigert. | [ ] |

### K. Anonymisierung / Löschung (optional, Destruktiv)

| # | Prüfpunkt | Erwartung | OK |
|---|-----------|-----------|-----|
| 3.27 | **Account löschen / anonymisieren** | `avatar_*`-Felder null; Storage-Objekt in `avatars` gelöscht. | [ ] |
| 3.28 | **Öffentliche Stellen danach** | Feed/Ranking zeigen kein altes Bild mehr (Initialen/Fallback). | [ ] |

### L. Bewusst nicht in Phase 3

| # | Feature | Erwartung | OK |
|---|---------|-----------|-----|
| 3.29 | **Strava-Profilbild übernehmen** | Nicht vorhanden — kein Button, kein `avatar_source = 'strava'`. | [ ] |
| 3.30 | **Profilbild in Mitfahrer-/Public-Registrierung** | Kein Avatar für `public`-Rolle. | [ ] |

---

## Schnell-Regression nach Änderungen

Minimaler Pfad (~15 Min):

1. [ ] `/aktivitaeten/` Feed: nur Rad, kein Lauf
2. [ ] `/aktivitaeten/{uuid-lauf}/`: nicht gefunden
3. [ ] `/profil/` → Meine Aktivitäten: nur Rad
4. [ ] `/profil/` → Profilbild hochladen + entfernen
5. [ ] `/aktivitaeten/` Feed + Ranking: Avatar sichtbar
6. [ ] Admin Feedback-Auswertung: Avatar in Liste

---

## Fehler protokollieren

| Datum | Tester | Phase | # | Beobachtung | Schwere |
|-------|--------|-------|---|-------------|---------|
| | | | | | |

---

## Referenzen (Implementierung)

| Bereich | Dateien |
|---------|---------|
| Phase 2 SQL | `docs/supabase/supabase-sport-category-rad.sql` |
| Phase 2 Sync | `supabase/functions/strava-sync/index.ts` |
| Phase 3 SQL | `docs/supabase/supabase-member-avatars.sql` |
| Profil UI | `assets/js/member/member-render.js`, `member-page.js`, `member-service.js` |
| Aktivitäten UI | `assets/js/aktivitaeten/aktivitaeten-render.js`, `aktivitaeten-service.js` |
| Admin | `admin/js/feedback-results.js`, `assets/js/feedback/feedback-service.js` |
| Styles | `assets/css/style.css`, `assets/css/aktivitaeten.css` |
