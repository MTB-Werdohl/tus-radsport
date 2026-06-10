# Phase 2 — Radfokus: Aktivitätsfilter & Auswertung (Konzept)

**Projekt:** TUS-Website (Jekyll + Supabase)  
**Abteilung:** Radsport / MTB Werdohl  
**Stand:** Juni 2026  
**Bezug:** Phase 1 (Anzeige-Labels, Feed-Badges) — siehe `docs/PHASE-1-CHANGELOG.md`

**Status:** ✅ **Freigegeben** (Produktentscheidung Mai 2026) — Umsetzung ausstehend

---

## Produktentscheidung (verbindlich)

Die Plattform ist ein **Radsportportal**. Feed, Rankings, Vereinsziele und öffentliche Auswertungen beziehen sich **ausschließlich auf Radaktivitäten**.

| Grundsatz | Entscheidung |
|-----------|--------------|
| Daten | **`activity_type` unverändert** speichern; **alle** Strava-Aktivitäten importieren — nichts löschen |
| Darstellung | Feed, Rankings, Vereinsziele: **nur Rad** |
| Nicht-Rad | Importiert und in DB vorhanden; **nicht** in Feed, Rankings oder Vereinszielen sichtbar |
| Gesamt-Ranking | **Nicht** vorgesehen |
| Erweiterbarkeit | Kategorie-Schicht in DB vorbereiten (`sport_category`), später weitere Kategorien möglich |

### Radaktivitäten (berücksichtigt)

Ride, MountainBikeRide, GravelRide, EBikeRide, EMountainBikeRide, VirtualRide, Handcycle, Velomobile sowie weitere radbezogene Strava-Typen (siehe Mapping).

### Nicht berücksichtigt (vorerst unsichtbar)

Run, TrailRun, Walk, Hike, Swim, Workout, Yoga, Crossfit, Wintersport, Sonstiges.

---

## 1. Analyse des Ist-Zustands

### 1.1 Datenmodell

Die zentrale Tabelle `activities` speichert importierte Strava-Aktivitäten:

| Feld | Typ | Verwendung heute |
|------|-----|------------------|
| `activity_type` | `text NOT NULL` | Roher Strava-Wert (`type` oder `sport_type`) |
| `activity_name` | `text` | Titel im Feed / Detail |
| `distance_m` | `numeric` | Rankings, Vereinsziele, Anzeige |
| `moving_time_s` | `integer` | Anzeige (Detail), **nicht** in Stats |
| `elevation_gain_m` | `numeric` | Rankings, Vereinsziele, Anzeige |
| `start_date` | `timestamptz` | Feed-Zeitfenster, Perioden-Aggregation |
| `deleted_at` | `timestamptz` | Soft Delete bei Strava-Trennung |

Quelle: `docs/supabase-strava.sql`, `docs/supabase/SCHEMA.md`

**Es gibt keine Sportkategorie-Spalte.** `activity_type` ist der einzige Typ-Indikator. Stats und öffentliche RPCs aggregieren **alle** Sportarten.

### 1.2 Import (Edge Function `strava-sync`)

- Typ: `activity.type || activity.sport_type || 'Workout'` — **keine Filterung**
- Strava empfiehlt `sport_type` vor `type`; im Code ist die Priorität **vertauscht** (Korrektur in Umsetzung)
- Nach Sync: `rebuild_member_stats` + `refresh_club_stats` über **alle** Aktivitäten

### 1.3 Öffentliche RPCs und Frontend

| RPC | Problem heute |
|-----|---------------|
| `get_public_activity_feed` | Zeigt Laufen, Workout etc. mit |
| `get_public_member_rankings` | Sortiert Kilometer aller Sportarten |
| `get_public_club_stats` | Vereinsziele inkl. Nicht-Rad |
| Profil-Tab Aktivitäten | Alle importierten Typen sichtbar (Mitglied) |

Opt-ins (`publish_feed`, `publish_rankings`, `contribute_to_club_goals`) bleiben unverändert — sie steuern **ob**, nicht **welche Sportart**.

---

## 2. Zielarchitektur (Radfokus, erweiterbar)

### 2.1 Kategorie-Spalte

Neue abgeleitete Spalte auf `activities`:

| Wert | Bedeutung | Öffentlich |
|------|-----------|------------|
| `rad` | Radbezogene Strava-Typen | Feed, Rankings, Vereinsziele |
| `other` | Alles andere | Nur gespeichert; Profil optional intern |

**CHECK-Constraint:** `sport_category IN ('rad', 'other')` — Werte später erweiterbar (z. B. `laufen`, `schwimmen`), ohne `activity_type` zu ändern.

### 2.2 Designprinzipien

1. **`activity_type` = Strava-Rohwert** — unverändert, für Debugging und spätere Feinkategorien.
2. **`sport_category` = abgeleitete Schicht** — Single Source of Truth für Filter und Stats.
3. **Import unverändert breit** — alle Aktivitäten bleiben in `activities`.
4. **Öffentliche Oberfläche = Rad only** — kein Kategorie-Umschalter, kein Gesamt-Ranking.
5. **Stats erweiterbar** — Aggregation nach `sport_category`; öffentliche RPCs filtern auf `rad`.

---

## 3. Mapping-Regeln: Strava → `sport_category`

### 3.1 Normalisierung

```sql
lower(trim(replace(activity_type, ' ', '')))
```

Import künftig: **`sport_type` vor `type`**.

### 3.2 Mapping → `rad`

| Strava-Typ (normalisiert) | Entspricht u. a. |
|---------------------------|------------------|
| `ride` | Ride |
| `mountainbikeride` | MountainBikeRide |
| `gravelride` | GravelRide |
| `ebikeride` | EBikeRide |
| `emountainbikeride` | EMountainBikeRide |
| `virtualride` | VirtualRide |
| `handcycle` | Handcycle |
| `velomobile` | Velomobile |

Weitere radbezogene Strava-Typen bei Bedarf ergänzen; unbekannte Typen mit Rad-Distanz > 0 **nicht** automatisch als `rad` — Logging + manuelle Mapping-Ergänzung.

### 3.3 Mapping → `other`

Explizit ausgeschlossen (Produktliste):

Run, TrailRun, VirtualRun, Walk, Hike, Swim, Workout, Yoga, Crossfit, WeightTraining, Wintersport (AlpineSki, NordicSki, …), Wassersport, Ballsport, generisches Workout — sowie **alle übrigen** Strava-Typen.

### 3.4 Implementierungsort

| Ort | Zweck |
|-----|--------|
| SQL `map_strava_type_to_category(text)` → `'rad' \| 'other'` | Backfill, Stats, RPC-Filter |
| Edge Function `strava-sync` | Setzt `sport_category` beim Import |
| Frontend | Kein Mapping — nur Anzeige; Filter serverseitig |

---

## 4. Auswirkungen auf Rankings, Vereinsziele, Feed

### 4.1 Feed

- `get_public_activity_feed`: `WHERE sport_category = 'rad'` (+ bestehende Opt-ins, 90-Tage-Fenster)
- Detailseite: nur Rad-Aktivitäten öffentlich verlinkbar
- Nicht-Rad: nicht im öffentlichen Feed

### 4.2 Rankings

- **Nur Rad** — Monat und Jahr
- Kein Gesamt-Ranking, kein Kategorie-Tabs
- Sortierung unverändert: Distanz → Touren → `member_id`
- RPC filtert Stats mit `sport_category = 'rad'`

### 4.3 Vereinsziele

- **Nur Rad-Kennzahlen:** Distanz, Höhenmeter, Touren, aktive Mitglieder (mit Rad-Aktivität)
- Keine Aufschlüsselung nach weiteren Sportarten

### 4.4 Profil (Mitglied)

- **Öffentlich:** wie Feed — nur Rad in sichtbaren Listen (wenn Opt-ins)
- **Eigene Ansicht:** optional alle importierten Aktivitäten im Profil-Tab (nur für eingeloggtes Mitglied) — Produktentscheidung offen; Minimum: Nicht-Rad nicht öffentlich

### 4.5 Stats-Tabellen

Stats-Tabellen um `sport_category` erweitern (PK inkl. Kategorie):

```
member_stats_month(member_id, year, month, sport_category)
```

`rebuild_member_stats` / `refresh_club_stats`: `GROUP BY …, sport_category`.

Öffentliche RPCs lesen nur `sport_category = 'rad'`. Werte für `other` bleiben für spätere Auswertungen vorhanden.

### 4.6 Betroffene Artefakte

| Schicht | Objekte |
|---------|---------|
| SQL | Migration, `map_strava_type_to_category`, Stats-Rebuild, Public-RPCs |
| Edge | `strava-sync` — `sport_type`-Priorität + `sport_category` |
| Frontend | `aktivitaeten-*`, ggf. Profil-Tab — keine Kategorie-UI nötig |
| Doku | `SCHEMA.md`, `RUNBOOK.md` |

---

## 5. Migrationsstrategie

### 5.1 Ablauf

1. Spalte `activities.sport_category` (nullable)
2. Funktion `map_strava_type_to_category(text)`
3. Backfill aller Zeilen mit `deleted_at IS NULL`
4. `NOT NULL` + Default für Neuanlagen
5. Stats-Tabellen erweitern; Full Rebuild
6. Public-RPCs: Filter `sport_category = 'rad'`
7. Edge Function deployen
8. Smoke-Test: Feed/Rankings/Vereinsziele zeigen keine Lauf-/Workout-Daten mehr

### 5.2 Rollback

- RPC-Filter entfernen = vorheriges Verhalten (alle Sportarten sichtbar)
- Spalte nullable lassen bis stabil
- Stats-Rebuild idempotent

### 5.3 Downtime

Keine erwartet — additive Migration.

---

## 6. Entschiedene Punkte & Restfragen

### Entschieden ✅

| Thema | Entscheidung |
|-------|--------------|
| Kategorien | Nur Rad öffentlich; Rest `other` |
| Gesamt-Ranking | Nein |
| Datenverlust | Nein — alles importieren |
| `activity_type` | Unverändert |
| E-Bike / Virtual Ride | **Rad** |
| Erweiterbarkeit | `sport_category`-Spalte, CHECK erweiterbar |

### Offen (Umsetzung)

1. **Profil-Tab:** Alle Aktivitäten für Mitglied sichtbar oder auch dort nur Rad?
2. **Unbekannte Strava-Rad-Typen:** Logging-Prozess für Mapping-Updates?
3. **Opt-in-Texte:** Hinweis „Auswertungen gelten nur für Rad-Aktivitäten“ in Profil?

---

## Anhang — Abgrenzung Phase 1 / Phase 2

| Phase 1 (erledigt) | Phase 2 (freigegeben) |
|--------------------|------------------------|
| Deutsche Strava-Typ-Labels | Rad-Filter in DB + RPCs |
| Badge im Feed | Feed nur Rad |
| Keine Schema-Änderung | `sport_category` + Stats-Rebuild |

---

## Zusammenfassung

1. **`sport_category`** (`rad` \| `other`) auf `activities`; **`activity_type` bleibt Strava-Rohwert**.
2. **Öffentlich nur Rad:** Feed, Rankings, Vereinsziele — kein Gesamt-Ranking.
3. **Alle Aktivitäten importieren** — Nicht-Rad gespeichert, nicht öffentlich ausgewertet.
4. **Mapping in PostgreSQL**; Sync: `sport_type` vor `type`.
5. **Stats nach Kategorie** — öffentliche RPCs filtern auf `rad`; Architektur für spätere Kategorien offen.
