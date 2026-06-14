# Medien-Storage — Architektur, Roadmap & Implementierungsplan

**Status:** Phase 0–3 live + Phase-4-Grundlage + Rückblick-Storage (Phase 0 Historie) — SQL [`supabase-media-storage-paths.sql`](supabase-media-storage-paths.sql), [`supabase-media-move.sql`](supabase-media-move.sql), [`supabase-termin-recaps.sql`](supabase-termin-recaps.sql) in Supabase  
**Zielgruppe:** Vorstand / Entwickler  
**Letzte Aktualisierung:** 2026-06-14

---

## 1. Leitbild

Medien (Bilder, GPX) sollen im Admin **strukturiert**, **wiederverwendbar** und **verschiebbar** sein — ohne dass veröffentlichte Termine, News oder Galerien plötzlich kaputte Links haben.

**Kernentscheidung:** In der Datenbank **Storage-Pfade** speichern, öffentliche URLs zur **Laufzeit** auflösen (Vorbild: Profilbilder mit `avatar_storage_path` + `getPublicUrl`).

**Nicht-Ziele (vorerst):**

- Kein vollwertiges DAM (Tags, Versionen, Rechte pro Datei)
- Kein gemeinsamer Browser für `protocols/` (bleibt eigener Admin-Bereich)
- Kein Zugriff auf Bucket `avatars` in derselben Oberfläche

---

## 2. Ist-Zustand

| Bereich | Speicherung | Risiko bei Move/Rename |
|---------|-------------|-------------------------|
| `Termine.image`, `Termine.gpx` | Volle Public-URL | Link bricht |
| `News.image` | Volle Public-URL | Link bricht |
| `gallery_images.image_path` | Volle Public-URL | Link bricht |
| `members.avatar_storage_path` | Relativer Pfad im Bucket `avatars` | ✅ stabil |
| Protokolle `protocols/{id}/…` | Relativer Pfad + eigene UI | ✅ Move mit UI |

**Upload heute (Termin/News):** Ordner `shared/images/` bzw. `shared/routes/` — Bilder werden clientseitig nach WebP komprimiert (`assets/js/core/image-compress.js`, max. 1920px). GPX unverändert.

**Rückblick-Bilder (Phase 0 Historie):** Namespace `recaps/{termin_id}/` — siehe [`FACHKONZEPT-TERMIN-RECAPS.md`](FACHKONZEPT-TERMIN-RECAPS.md).

**Bereits umgesetzt (Bugfix, unabhängig von dieser Roadmap):**

- Dateinamen-Sanitisierung bei Upload (Umlaute → `oe`/`ae`, nur ASCII im Storage-Key)

**Referenz-Implementierung im Repo:**

- Protokoll-Ordner: `admin/js/protocol-utils.js`, `admin/js/protocol-folder-ui.js`
- Storage-Policies: `docs/supabase-vorstand-roles.sql`, `docs/supabase-board-documents-storage-update.sql` (`media_update_vorstand` für `move`)

---

## 3. Soll-Architektur

### 3.1 Drei Schichten

```text
┌─────────────────────────────────────────────────────────┐
│  Admin: Termin/News-Formular, Medien-Browser, Upload    │
└───────────────────────────┬─────────────────────────────┘
                            │ speichert Pfade
┌───────────────────────────▼─────────────────────────────┐
│  DB: *_storage_path (+ Legacy-URL-Spalten als Fallback) │
└───────────────────────────┬─────────────────────────────┘
                            │ resolveMediaPublicUrl(path)
┌───────────────────────────▼─────────────────────────────┐
│  Storage bucket `media` (strukturierte Namespaces)      │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Storage-Namespaces (Konvention)

| Pfad | Zweck | Wiederverwendung | Admin-Schreiben |
|------|--------|------------------|-----------------|
| `shared/routes/` | GPX für mehrere Ausfahrten | **Ja (Hauptfall)** | Vorstand |
| `shared/images/` | Wiederkehrende Header/Motive | **Ja** | Vorstand |
| `recaps/{termin_id}/` | Rückblick-Bilder (Historie) | Nein — 1:1 am Termin | Vorstand; Mitglied (eigener Termin, Phase 2) |
| `termine/{id}/` | Termin-spezifische Dateien | Selten | Vorstand |
| `news/{id}/` | News-spezifische Dateien | Selten | Vorstand |
| `galleries/{jahr}/{slug}/…` | Galerie (bestehend) | Unverändert | Vorstand |
| `protocols/{id}/…` | Vorstandsprotokolle | Separater Admin | Vorstand |
| Root `*.gpx`, `*.jpg` | **Legacy** | Nur lesen/migrieren | Kein neuer Upload |

**Regel ab Phase 0:** Neue Uploads **nicht** mehr in den Root — nur unter `shared/…` oder entity-spezifischen Ordnern.

### 3.3 Datenmodell (Ziel)

**Neue Spalten (nullable, parallel zu Legacy):**

| Tabelle | Spalte | Beispiel |
|---------|--------|----------|
| `Termine` | `image_storage_path` | `shared/images/ausfahrt.webp` |
| `Termine` | `gpx_storage_path` | `shared/routes/moehnesee.gpx` |
| `News` | `image_storage_path` | `shared/images/news-header.jpg` |

**Legacy (bleibt bis Migration abgeschlossen):**

- `Termine.image`, `Termine.gpx`, `News.image` — volle URLs

**Auflösungsregel (überall identisch):**

```text
effektives Medium =
  wenn *_storage_path gesetzt → resolveMediaPublicUrl(path)
  sonst wenn Legacy-URL gesetzt   → Legacy-URL (Fallback)
  sonst                           → null
```

### 3.4 URL-Auflösung (keine hardcodierten Links im neuen Code)

Neues Modul (Vorschlag): `assets/js/core/media-url.js`

| Funktion | Aufgabe |
|----------|---------|
| `resolveMediaPublicUrl(storagePath, options?)` | Pfad → Public-URL via `getPublicUrl` |
| `extractStoragePath(publicUrl)` | URL → Pfad (existiert in `admin/js/admin-utils.js`) |
| `resolveTerminImage(termin)` / `resolveTerminGpx(termin)` | Pfad + Legacy-Fallback |
| `resolveNewsImage(news)` | Pfad + Legacy-Fallback |

**Alle Renderer** nutzen dieselbe Auflösung:

- `assets/js/event/event-render.js`
- `assets/js/news/news-detail-render.js`
- `admin/js/termine-edit.js`, `admin/js/news-edit.js`
- `scripts/generate-pages.js` (OG/static pages)
- Entwurf-Vorschau `admin/js/drafts.js`

### 3.5 Sicheres Verschieben (später, Phase 3)

Move/Rename **nur** über RPC — nie direkt `storage.move()` ohne DB-Update:

```text
move_media_object(old_path, new_path)
  1. Referenzen zählen (Termine, News, Galerie)
  2. storage.move (Copy-Fallback wie protocol-utils)
  3. UPDATE aller *_storage_path + Legacy-URLs wo Pfad enthalten
  4. Rückgabe: { updated: { termine: 2, news: 0, gallery: 0 } }
```

**Löschen:** nur bei Referenzcount = 0, oder explizite Vorstands-Bestätigung mit Liste der Betroffenen.

---

## 4. Roadmap (Phasen)

| Phase | Name | Risiko | Nutzen | Abhängigkeiten |
|-------|------|--------|--------|----------------|
| **0** | Fundament (Pfade + Resolver + Dual-Write) | Niedrig | Zukunftssichere neue Uploads | — |
| **1** | Medien-Browser (read-only) | Niedrig | Überblick, „Verwendet in“ | Phase 0 (Resolver optional) |
| **2** | Mediathek-Picker + Upload in Ordner | Niedrig | Wiederverwendung ohne Re-Upload | Phase 0, 1 |
| **3** | Move/Rename + sicheres Löschen | Mittel | Strukturieren ohne Bruch | RPC + Referenz-Logik |
| **4** | Legacy-Migration + Aufräumen | Mittel | Sauberer Bucket | Phase 3 |

**Empfohlener erster Sprint:** Phase 0 + Phase 1.

---

## 5. Implementierungsplan (Detail)

### Phase 0 — Fundament

**Ziel:** Neue Inhalte speichern Pfade; Website rendert weiterhin korrekt; Legacy unverändert.

#### 5.0.1 SQL

Neue Datei: `docs/supabase-media-storage-paths.sql`

```sql
-- Termine
alter table public."Termine"
  add column if not exists image_storage_path text,
  add column if not exists gpx_storage_path text;

-- News
alter table public."News"
  add column if not exists image_storage_path text;
```

Keine RLS-Änderung nötig (Vorstand schreibt Termine/News wie bisher).

**Deploy:** Supabase SQL Editor → Skript ausführen → in [RUNBOOK](supabase/RUNBOOK.md) eintragen.

#### 5.0.2 JavaScript — Resolver

| Datei | Änderung |
|-------|----------|
| `assets/js/core/media-url.js` | **Neu:** `resolveMediaPublicUrl`, Entity-Helper |
| `assets/js/event/event-render.js` | Bild/GPX über Resolver |
| `assets/js/news/news-detail-render.js` | Bild über Resolver |
| `admin/js/termine-edit.js` | Dual-Write: Pfad + Legacy-URL beim Upload |
| `admin/js/news-edit.js` | Dual-Write Bild |
| `admin/js/admin-utils.js` | `buildMediaStorageKey` → Zielordner-Parameter (`shared/routes/` etc.) |
| `aktivitaeten-detail.html` / Layouts | Script `media-url.js` einbinden wo nötig |
| `admin/termine_edit.html`, `news_edit.html` | Scripts |

**Dual-Write beim Speichern:**

```text
upload nach shared/routes/{key}.gpx
→ gpx_storage_path = Pfad
→ gpx = resolveMediaPublicUrl(Pfad)   // Legacy parallel, Fallback für alte Clients
```

#### 5.0.3 Upload-Pfad-Konvention (ab sofort)

| Feld | Zielordner |
|------|------------|
| Termin GPX | `shared/routes/` |
| Termin Bild | `shared/images/` |
| News Bild | `shared/images/` |

#### 5.0.4 Smoke-Tests Phase 0

| # | Test | Erwartung |
|---|------|-----------|
| M0.1 | Bestehender Termin mit Legacy-URL | Bild/GPX weiter sichtbar |
| M0.2 | Neuer Termin mit GPX-Upload | `gpx_storage_path` gesetzt, Download funktioniert |
| M0.3 | Dateiname mit Umlaut (`Möhnesee.gpx`) | Upload ok (`moehnesee.gpx`) |
| M0.4 | News mit neuem Bild | `image_storage_path` + Anzeige ok |
| M0.5 | OG/static generate-pages | Keine Regression bei Termin/News mit Bild |

**Definition of Done Phase 0:**

- [ ] SQL deployed
- [ ] Resolver in allen relevanten Renderern
- [ ] Neue Uploads nur unter `shared/…`
- [ ] Legacy-Termine unverändert ok
- [ ] Smoke M0.1–M0.5 bestanden

---

### Phase 1 — Medien-Browser (read-only)

**Ziel:** Vorstand sieht Bucket-Struktur und Referenzen — **ohne** Move/Delete.

#### 5.1.1 Admin-UI

| Datei | Inhalt |
|-------|--------|
| `admin/medien.html` | Neue Seite |
| `admin/js/media-browser.js` | Listing, Navigation, Filter |
| `assets/css/admin.css` | Styles Medien-Browser |
| `admin/index.html` | Dashboard-Karte „Medien“ |
| `_includes/admin-escape-nav.html` | Link (falls zentral) |

**Features:**

- Baum/Liste: `shared/`, `galleries/`, Legacy-Root (Badge „Legacy“)
- **Ausblenden:** `protocols/`
- Filter: Bilder / GPX / Sonstiges
- Aktionen: Vorschau, Pfad kopieren, Public-URL kopieren
- **„Verwendet in“:** Anzahl + Links zu Termin/News-Edit

#### 5.1.2 Referenz-Abfrage

Client-seitig (MVP): Supabase-Queries auf `Termine` / `News` / `gallery_images`:

```text
WHERE image LIKE '%{path}%' OR gpx LIKE '%{path}%'
   OR image_storage_path = path OR gpx_storage_path = path
```

Optional später: RPC `get_media_references(p_path)` (performanter, eine Quelle).

#### 5.1.3 Smoke-Tests Phase 1

| # | Test | Erwartung |
|---|------|-----------|
| M1.1 | Browser öffnen als Vorstand | Liste lädt |
| M1.2 | GPX unter `shared/routes/` | Vorschau/Link ok |
| M1.3 | Datei in 2 Terminen referenziert | „Verwendet in: 2 Termine“ |
| M1.4 | `protocols/` | Nicht sichtbar |
| M1.5 | Legacy-Root-Datei | Sichtbar mit Legacy-Badge |

**Definition of Done Phase 1:**

- [ ] Admin-Seite live
- [ ] Referenz-Anzeige für Pfade + Legacy-URLs
- [ ] Keine Schreiboperationen im Browser
- [ ] Smoke M1.1–M1.5 bestanden

---

### Phase 2 — Mediathek-Picker & strukturierter Upload

**Ziel:** In Termin/News-Formular bestehende Datei wählen statt erneut hochladen.

#### 5.2.1 Komponenten

| Datei | Inhalt |
|-------|--------|
| `admin/js/media-storage-lib.js` | Shared Listing, Referenz-Index, „Zuletzt verwendet“ |
| `admin/js/media-picker.js` | Modal: „Zuletzt verwendet“ + Browser-Auszug |
| `admin/js/termine-edit.js` | Buttons „Aus Mediathek“ für Bild + GPX |
| `admin/js/news-edit.js` | Button „Aus Mediathek“ für Bild |

**Tabs im Picker (MVP):**

1. **Zuletzt verwendet** — distinct Pfade aus Termine/News (letzte 20)
2. **Storage** — eingebetteter Auszug aus Medien-Browser (Phase 1)
3. **Neu hochladen** — bestehendes File-Input

**Speichern:** nur `*_storage_path` setzen (+ Dual-Write Legacy bis Phase 4).

#### 5.2.2 Smoke-Tests Phase 2

| # | Test | Erwartung |
|---|------|-----------|
| M2.1 | GPX aus Mediathek in neuen Termin | Kein Re-Upload, gleicher Pfad |
| M2.2 | Zwei Termine, gleiche GPX | Beide Downloads ok |
| M2.3 | Bild aus „Zuletzt verwendet“ | Vorschau im Formular ok |

**Definition of Done Phase 2:**

- [x] Picker in Termin + News
- [x] Wiederverwendung ohne doppelten Storage-Verbrauch
- [ ] Smoke M2.1–M2.3 bestanden

---

### Phase 3 — Move, Rename, sicheres Löschen

**Ziel:** Dateien in `shared/` umstrukturieren ohne kaputte Links.

#### 5.3.1 SQL

Neue Datei: `docs/supabase-media-move.sql`

- RPC `get_media_references(p_path text)` → JSON mit counts + IDs
- RPC `move_media_object(p_old_path text, p_new_path text)` → Move + DB-Updates

**DB-Updates in `move_media_object`:**

- `Termine.image_storage_path`, `gpx_storage_path`
- `News.image_storage_path`
- Legacy: `REPLACE(image, old_segment, new_segment)` wo URL Fragment matcht
- `gallery_images.image_path` (falls noch URL — später Pfad-Spalte)

#### 5.3.2 Admin-UI

| Datei | Inhalt |
|-------|--------|
| `docs/supabase-media-move.sql` | RPCs `get_media_references`, `move_media_object`, `delete_media_object` |
| `admin/js/media-storage-ops.js` | RPC-Wrapper + Bestätigungsdialoge |
| `admin/js/media-browser.js` | Umbenennen, Verschieben, Löschen |

Erweiterung Medien-Browser:

- Move/Rename (nur `shared/**`, Legacy-Root mit Warnung)
- Delete (nur Waisen oder mit Bestätigung + Referenzliste)
- UI-Muster: Bestätigungsdialoge wie bei Protokollen

#### 5.3.3 Smoke-Tests Phase 3

| # | Test | Erwartung |
|---|------|-----------|
| M3.1 | GPX in `shared/routes/` umbenennen, 1 Termin referenziert | Termin-Download weiter ok |
| M3.2 | Move mit 0 Referenzen | Ok |
| M3.3 | Delete Waise | Datei weg, niemand betroffen |
| M3.4 | Delete mit Referenz ohne Bestätigung | Abgebrochen |

**Definition of Done Phase 3:**

- [x] RPC deployed (SQL-Datei im Repo)
- [x] Move aktualisiert alle Referenzen (Frontend + RPC)
- [ ] Smoke M3.1–M3.4 bestanden

---

### Phase 4 — Legacy-Migration & Aufräumen

**Ziel:** Einmalige Migration abgeschlossen; danach nur noch Pfad-basierte Medien (Mediathek, Move/Delete im Browser).

#### 5.4.1 Backfill (einmalig, erledigt)

Einmal-Backfill wurde über `/admin/media-migration.html` ausgeführt. **Admin-UI und Backfill-RPCs sind aus dem Repo entfernt** — künftig: Upload/Picker/Medien-Browser.

Optional in Supabase aufräumen: [`supabase-media-backfill-drop.sql`](supabase-media-backfill-drop.sql)

#### 5.4.2 Endzustand (bleibt)

- Keine neuen Writes auf `image`/`gpx` URL-Spalten
- Renderer: nur noch `*_storage_path` (+ Fallback read-only für Restbestand)
- Optional: Waisen-Report + manuelles Löschen im Browser

#### 5.4.3 Smoke-Tests Phase 4

| # | Test | Erwartung |
|---|------|-----------|
| M4.1 | Stichprobe 10 Legacy-Termine | Medien weiter sichtbar |
| M4.2 | Kein neuer Upload schreibt Legacy-URL | Nur Pfad-Spalten |

**Definition of Done Phase 4:**

- [x] Einmal-Backfill durchgeführt
- [x] Keine neuen Writes auf Legacy-URL-Spalten (Termin/News-Save)
- [x] Backfill-Tooling aus Code entfernt
- [ ] Smoke M4.1–M4.2 bestanden

---

## 6. Was wir bewusst nicht tun

| Nicht | Grund |
|-------|--------|
| Big-Bang: alle URLs sofort durch Pfade ersetzen | Hohes Risiko, schwer rollback |
| Freier Storage-Explorer ohne Referenz-RPC | Kaputte veröffentlichte Inhalte |
| `protocols/` im allgemeinen Medien-Browser editierbar | Eigene Domäne + Vertraulichkeit |
| Avatare im selben UI | Anderer Bucket + Owner-Modell |
| Hardcodierte Supabase-URLs in neuem Code | Nur Pfade + Resolver |

---

## 7. Migrationsstrategie (Zeitachse)

```text
Phase 0   Dual-Write (Pfad + Legacy-URL)
    ↓
Phase 1   Read-only Browser (Transparenz)
    ↓
Phase 2   Mediathek-Picker (Wiederverwendung)
    ↓
Phase 3   Move-RPC (Strukturieren)
    ↓
Phase 4   Backfill Legacy → deprecate URL-Spalten
```

**Rollback-Prinzip:** Solange Legacy-URL-Spalten befüllt bleiben und Renderer Fallback haben, ist jede Phase rückgängig machbar.

---

## 8. Abhängigkeiten & Verwandte Themen

| Thema | Dokument / Code |
|-------|------------------|
| Storage-Policies | [supabase/RUNBOOK.md](supabase/RUNBOOK.md), `supabase-vorstand-roles.sql` |
| Protokoll-Ordner (Referenz-UI) | `admin/js/protocol-utils.js` |
| Veränderungs-Popup (Entwürfe filtern) | `docs/supabase-member-change-summary.sql` |
| Architektur CMS | [ARCHITECTURE.md](ARCHITECTURE.md) |
| Upload-Dateinamen | `sanitizeMediaStorageFilename()` in `admin/js/admin-utils.js` |

**Offen (separat, nicht Teil dieser Roadmap):**

- Galerie auf `*_storage_path` umstellen (optional Phase 4+)
- `generate-pages.js` langfristig nur Resolver

---

## 9. Aufwand (Grobschätzung)

| Phase | Aufwand | Priorität |
|-------|---------|-----------|
| 0 Fundament | 0,5–1 Tag | **P0** |
| 1 Medien-Browser | 1–1,5 Tage | **P0** |
| 2 Mediathek-Picker | 1 Tag | P1 |
| 3 Move/Delete RPC | 1,5–2 Tage | P2 |
| 4 Legacy-Migration | 0,5–1 Tag | P3 |

---

## 10. Checkliste „Sprint 1“ (Phase 0 + 1)

```text
[x] docs/supabase-media-storage-paths.sql schreiben + in Supabase ausführen
[x] assets/js/core/media-url.js anlegen
[x] Resolver in event-render, news-detail-render einbinden
[x] termine-edit / news-edit: Dual-Write + Upload nach shared/
[x] admin/medien.html + media-browser.js (read-only)
[x] Dashboard-Link „Medien“
[ ] Smoke M0.* + M1.* (nach SQL-Deploy)
[ ] RUNBOOK + diese Datei Status auf „Phase 0+1 live“ setzen
```

---

## 11. Status-Tracking

| Phase | Status | Deploy-Datum | Notizen |
|-------|--------|--------------|---------|
| 0 Fundament | ✅ Code live | | SQL in Supabase noch ausführen |
| 1 Medien-Browser | ✅ Code live | | `/admin/medien.html` |
| 2 Mediathek-Picker | ✅ Code live | | Termin/News „Aus Mediathek“ |
| 3 Move/Delete | ✅ Code live | | RPC + `/admin/medien.html` |
| 4 Legacy-Migration | ✅ erledigt | | Backfill einmalig; Tooling entfernt |

*Bei Abschluss einer Phase: Status auf ✅ setzen, Datum eintragen, Smoke-Tests verlinken.*
