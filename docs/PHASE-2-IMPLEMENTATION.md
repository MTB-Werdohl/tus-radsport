# Phase 2 — Radfokus: Implementierung

**Stand:** Juni 2026  
**Bezug:** [`PHASE-2-SPORTARTEN-KONZEPT.md`](PHASE-2-SPORTARTEN-KONZEPT.md) (freigegeben)

## Zusammenfassung

Phase 2 stellt das Aktivitätenportal auf **Rad-only** für alle öffentlichen und profilbezogenen Auswertungen um. Alle Strava-Aktivitäten werden weiter importiert; `activity_type` bleibt der Strava-Rohwert. Eine neue abgeleitete Spalte `sport_category` (`rad` | `other`) steuert Filter und Stats-Aggregation.

**Öffentlich sichtbar (nur `rad`):**

- Aktivitäten-Feed und Detailseiten
- Mitglieder-Rankings (Monat/Jahr)
- Vereinsziele
- Profil-Tab „Meine Aktivitäten“ (verbindliche Entscheidung: auch für eingeloggtes Mitglied nur Rad)

**Kein Gesamt-Ranking** über Sportarten hinweg.

## Deployment-Reihenfolge

1. **SQL:** [`docs/supabase/supabase-sport-category-rad.sql`](supabase/supabase-sport-category-rad.sql) im Supabase SQL Editor ausführen (inkl. Stats-Rebuild am Ende).
2. **Edge Function:** `strava-sync` neu deployen (Code aus `supabase/functions/strava-sync/index.ts` oder Spiegel `docs/supabase-edge-strava-sync.ts`).
3. **Smoke-Test:** Feed, Rankings, Vereinsziele und Profil-Aktivitäten prüfen — Lauf-/Workout-Daten dürfen nicht mehr erscheinen.

## Geänderte Dateien

| Datei | Änderung |
|-------|----------|
| `docs/supabase/supabase-sport-category-rad.sql` | **Neu** — Migration (Spalte, Mapping, Stats, RPCs, Rebuild) |
| `supabase/functions/strava-sync/index.ts` | `sport_type` vor `type`; setzt `sport_category` |
| `docs/supabase-edge-strava-sync.ts` | Spiegel der Edge-Function-Änderungen |
| `docs/supabase/SCHEMA.md` | `sport_category`, Stats-PK, RPC-Filter dokumentiert |
| `docs/supabase/RUNBOOK.md` | Migrations-Schritt + aktualisierte RPC-Beschreibungen |
| `docs/PHASE-2-IMPLEMENTATION.md` | **Neu** — diese Datei |

**Keine Frontend-Änderungen:** Filter erfolgen serverseitig in RPCs; `aktivitaeten-*` und Profil-JS unverändert.

## DB-Änderungen

### Tabelle `activities`

- Neue Spalte `sport_category text NOT NULL DEFAULT 'other'` mit CHECK (`rad`, `other`)
- Index `activities_sport_category_start_idx`
- Trigger `activities_sport_category_trg` leitet Kategorie aus `activity_type` ab

### Funktionen

- `normalize_strava_type(text)` — Normalisierung für Mapping
- `map_strava_type_to_category(text)` → `'rad'` | `'other'`
- `activities_set_sport_category()` — Trigger-Funktion

**Rad-Typen:** Ride, MountainBikeRide, GravelRide, EBikeRide, EMountainBikeRide, VirtualRide, Handcycle, Velomobile (normalisiert).

### Stats-Tabellen

PK erweitert um `sport_category`:

- `member_stats_month(member_id, year, month, sport_category)`
- `member_stats_year(member_id, year, sport_category)`
- `club_stats_month(year, month, sport_category)`
- `club_stats_year(year, sport_category)`

`rebuild_member_stats` / `refresh_club_stats` aggregieren nach Kategorie; öffentliche RPCs lesen nur `sport_category = 'rad'`.

### Aktualisierte RPCs

| RPC | Filter |
|-----|--------|
| `get_public_activity_feed` | `sport_category = 'rad'` |
| `get_public_activity_detail` | `sport_category = 'rad'` |
| `get_public_member_rankings` | Stats `sport_category = 'rad'` |
| `get_public_club_stats` | Stats `sport_category = 'rad'` |
| `get_member_activities` | `sport_category = 'rad'` |

`get_strava_profile_status` zählt weiter **alle** importierten Aktivitäten (unverändert).

## Edge Function `strava-sync`

- `activity_type`: `sport_type || type || 'Workout'` (Priorität korrigiert)
- `sport_category`: clientseitig via gleiche Rad-Typ-Liste wie SQL
- DB-Trigger stellt Konsistenz sicher, falls `activity_type` ohne `sport_category` geschrieben wird

## Risiken

| Risiko | Mitigation |
|--------|------------|
| Stats-Tabellen werden bei Migration geleert und neu aufgebaut | Skript führt Full Rebuild aller Mitglieder + `refresh_club_stats` aus; kurzzeitig leere Rankings/Ziele bis Abschluss |
| Unbekannte Strava-Rad-Typen landen als `other` | Mapping-Liste erweiterbar in SQL + Edge; kein Auto-Rad bei Distanz > 0 (Produktentscheidung) |
| Alte Edge Function ohne `sport_category` | Trigger setzt Kategorie aus `activity_type`; dennoch Deploy empfohlen |
| Deep-Links zu Nicht-Rad-UUIDs | Detail-RPC liefert `null` → Frontend zeigt „nicht gefunden“ |

## Offene Punkte

1. **Opt-in-Texte im Profil:** Hinweis „Auswertungen gelten nur für Rad-Aktivitäten“ — UX-Entscheidung, nicht in Phase 2 umgesetzt.
2. **Logging unbekannter Rad-Typen:** Prozess für Mapping-Updates bei neuen Strava-Typen noch nicht automatisiert.
3. **Weitere Kategorien:** Schema (`sport_category` CHECK) ist erweiterbar; aktuell nur `rad` / `other`.

## Smoke-Test (nach Deploy)

1. Mitglied mit gemischten Strava-Aktivitäten (Rad + Lauf): Feed zeigt nur Rad.
2. Rankings: Kilometer entsprechen nur Rad-Summen.
3. Vereinsziele: Distanz/Höhenmeter nur aus Rad.
4. Profil → Meine Aktivitäten: nur Rad-Touren, Badge „Im Feed sichtbar“ nur bei Rad + Opt-in.
5. Direkt-URL `/aktivitaeten/{uuid}/` einer Lauf-Aktivität: leer / nicht gefunden.
6. Neuer Strava-Sync: `sport_category` korrekt gesetzt (`sport_type`-Priorität).

## SQL-Datei (manuell ausführen)

```
docs/supabase/supabase-sport-category-rad.sql
```
