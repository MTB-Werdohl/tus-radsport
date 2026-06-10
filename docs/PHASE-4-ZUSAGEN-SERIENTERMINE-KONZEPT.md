# Phase 4 — Zusagen & Serientermine: Architekturvergleich

**Status:** ⏸ **Nicht freigegeben** — nur Referenzdokumentation  
**Stand:** Juni 2026  
**Bezug:** `docs/IA-TERMINE-ABSTIMMUNGEN.md`, `docs/supabase/SCHEMA.md`, `docs/ARCHITECTURE.md`

> **Produktentscheidung (Mai 2026):** Keine Implementierung, keine Datenbankänderungen, keine Migrationen, keine Architekturänderungen.  
> Themenbereich Zusagen / Absagen / Historie / Serientermine / Teilnehmermanagement wird **separat** analysiert und fachlich entschieden, bevor eine Umsetzung beginnt.  
> Dieses Dokument dient ausschließlich der späteren Entscheidungsvorbereitung.

---

## 1. Ausgangslage (Ist-Zustand)

### 1.1 Termine & Serientermine

`Termine` speichert **einmalige** und **wiederkehrende** Events in einer Zeile:

| Feld | Einzeltermin | Serientermin |
|------|--------------|--------------|
| `date`, `endDate` | Start/Ende (inkl. Mehrtages) | `null` |
| `recurring` | `false` | `true` |
| `daysOfWeek`, `startTime`, `startRecur`, `endRecur` | — | Wiederholungsregel |
| `exclude` | — | JSON-Array ausgeschlossener Tage (`YYYY-MM-DD`) |
| `durationDays` | — | optional Mehrtages-Dauer pro Vorkommen |

**Virtuelle Instanzen** entstehen nur im Frontend:

- `assets/js/calendar/event-cards.js` — iteriert Tage, setzt `generatedDate`
- `assets/js/calendar/termin-to-calendar.js` — FullCalendar-RRule
- `assets/js/core/termin-dates.js` — Datumsformatierung mit/ohne `generatedDate`

Die **Detailseite** (`assets/js/event/event-page.js`) lädt nur per `slug` — **ohne** konkretes Vorkommensdatum. Kalenderkarten verlinken mit `getEventUrl(slug)` ebenfalls ohne Datum.

### 1.2 Zusagen (Feedback-System)

```
Termine.id  ←→  feedback_modules (entity_type='event', entity_id)
                      ↕ module_id
               feedback_answers (member_id, answer, comment)
```

- **Ein Modul pro Termin:** `UNIQUE (entity_type, entity_id)` (`docs/supabase-feedback.sql`)
- **Eine Antwort pro Mitglied:** `UNIQUE (module_id, member_id)`
- Termin-RSVP: Typ `yes_maybe` → `answer` = `yes` | `maybe`
- Keine RSVP-Spalten in `Termine` (bewusst, siehe `SCHEMA.md`)

**Konsequenz für Serientermine:** Eine Zusage gilt für die **gesamte Serie**, nicht für ein einzelnes Vorkommen. Es gibt kein `occurrence_date`, keine Instanz-ID, kein Datums-Query-Parameter in der URL.

### 1.3 Profil „Meine Abstimmungen“

`assets/js/member/member-votes.js`:

- Lädt Antworten über `fetchMemberFeedbackAnswers`
- Für Events: `formatCardDate(entity)` zeigt bei Serien **„Jeden Dienstag“**, nicht das nächste konkrete Datum
- `isTerminStillUpcoming`: bei `recurring` nur Prüfung von `endRecur`, nicht des nächsten Vorkommens

### 1.4 Benachrichtigungen

| Kanal | Mechanismus | Bezug zu Zusagen |
|-------|-------------|------------------|
| **Tröte** | `site_state.last_push` | Kein — Broadcast an alle Besucher |
| **Admin-E-Mail** | Edge Function `send-admin-email`, Modus `event` | Alle `feedback_answers` mit `yes`/`maybe` zum `feedback_module` der `Termine.id` |
| **Web Push** | entfernt (`docs/supabase-drop-web-push.sql`) | — |

`send-admin-email` (`supabase/functions/send-admin-email/index.ts`, Zeilen 321–397) kennt **kein Vorkommensdatum** — Empfänger = alle Serien-Zusager.

---

## 2. Problemstellung

| Anforderung | Ist-Zustand | Lücke |
|-------------|-------------|-------|
| Verbindliche Zusage zu **einem** Trainingstermin | Zusage an ganze Serie gebunden | Keine terminbezogene Verpflichtung |
| „Bin nächste Woche dabei, übernächste nicht“ | nicht möglich | — |
| Admin: E-Mail nur an Teilnehmer **eines** Datums | E-Mail an alle Serien-Zusager | Keine Filterung |
| Profil: „Meine Zusagen“ mit konkretem Datum | „Jeden Montag“ | Kein nächstes Vorkommen |
| Ausgeschlossenes Datum (`exclude`) | Kalender blendet aus | Zusage bleibt semantisch an Serie gebunden |
| Mehrtages-Serientermin (`durationDays > 1`) | Karten zeigen Spanne | Zusage nicht an Spanne gebunden |

`docs/IA-TERMINE-ABSTIMMUNGEN.md` empfiehlt **keine** separate RSVP-Tabelle und **keinen** eigenen Nav-Punkt — das Konzept muss im Feedback-System verankert bleiben.

---

## 3. Lösungsvarianten

### Variante A — Serien-Zusage (Status quo + UX-Klarstellung)

**Idee:** Datenmodell unverändert. Semantik offiziell: *„Zusage gilt für alle zukünftigen Vorkommen der Serie“*. UI-Copy, Admin-Hinweise, Profil-Texte anpassen.

| | |
|---|---|
| **Pro** | Keine DB-Änderung; minimaler Aufwand; konsistent mit `UNIQUE (module_id, member_id)`; IA-konform |
| **Contra** | Keine verbindliche Einzeltermin-Zusage; „Vielleicht“ für ganze Serie ist semantisch schwach; Admin-E-Mails nicht datumsfilterbar; nicht „korrekt“ für wiederkehrende Events im engeren Sinn |

**Datenmodell:** keine Änderung  
**Feedback:** optional `config.recurring_scope: "series"` dokumentieren  
**Notifications:** unverändert — weiterhin alle Serien-Zusager

---

### Variante B — Vorkommens-Zusage im Feedback-System (empfohlen)

**Idee:** `feedback_answers` um nullable `occurrence_date date` erweitern. Unique-Constraint wird `(module_id, member_id, occurrence_date)` — bei Einzelterminen `occurrence_date IS NULL`.

- URL: `/kalender/{slug}/?datum=2026-06-17` (oder `date`)
- Kalenderkarten und FullCalendar-Klicks übergeben `generatedDate`
- Detailseite: RSVP-Kontext = explizites Datum oder „nächstes Vorkommen“
- Serien ohne Datum in URL: Modus wählbar (nur Einzelzusage vs. optional Serien-Zusage als zweites Modell)

| | |
|---|---|
| **Pro** | Verbindliche Zusage pro Instanz; Feedback-System bleibt zentral; polymorphes `entity_type`/`entity_id` unverändert; Admin-E-Mail filterbar nach `occurrence_date`; Profil zeigt konkrete Daten; `exclude` respektierbar (kein RSVP an ausgeschlossenen Tagen) |
| **Contra** | Schema-Änderung + Migration bestehender Antworten (`occurrence_date = NULL` → Serien-Zusage oder nächstes Vorkommen klären); alle Upsert-/RPC-Pfade anpassen (`submit_public_feedback`, `saveFeedbackAnswer`); mehr UI-Komplexität (Datumswahl, Serien-Übersicht) |

**Datenmodell:**

| Tabelle | Änderung |
|---------|----------|
| `Termine` | unverändert (Serien weiter 1 Zeile + `exclude`) |
| `feedback_modules` | optional `config`: `{ "recurring_mode": "per_occurrence" \| "series" }` |
| `feedback_answers` | + `occurrence_date`; Unique-Constraint erweitern |

**Feedback:** Kernänderung in `feedback-service.js`, `feedback-init.js`, `member-votes.js`, Admin-Auswertung  
**Notifications:** `send-admin-email` Modus `event` + optional `occurrence_date`; Tröte weiterhin unabhängig

---

### Variante C — Materialisierte Vorkommen (`termin_occurrences`)

**Idee:** Neue Tabelle mit je einer Zeile pro berechnetem Vorkommen (oder lazy bei erstem RSVP). `feedback_modules.entity_type = 'occurrence'`, `entity_id = termin_occurrences.id`. Master-Serie bleibt Template.

| | |
|---|---|
| **Pro** | Saubere 1:1-Entität pro Termin; FK möglich; eigenes `sichtbarkeit`/Absage pro Instanz denkbar; klare Admin-Listen pro Datum |
| **Contra** | Größte Migration; Sync bei Änderung von `exclude`, `endRecur`, `daysOfWeek`; Kaskaden-Löschung erweitern; viele Zeilen bei langen Serien; Content-Duplikation oder Indirektion nötig; widerspricht Minimalismus des Ist-Modells |

**Datenmodell:** neue Tabelle + neuer `entity_type` in CHECK-Constraint  
**Feedback:** neuer Entity-Typ, Cascade-Trigger, Admin-Formulare  
**Notifications:** natürlich pro `occurrence.id` — aber hoher Pflegeaufwand

---

### Variante D — Serien auf Einzeltermine aufspalten (Expand-on-write)

**Idee:** Bei Aktivierung von Zusagen oder manuell: aus Serienmaster konkrete `Termine`-Zeilen erzeugen (`parent_series_id`). Bestehendes 1:1-Feedback pro `Termine.id` bleibt.

| | |
|---|---|
| **Pro** | Keine Änderung an `feedback_answers`; bekannte Semantik pro Zeile |
| **Contra** | Datenexplosion; Serie bearbeiten = viele Zeilen; `exclude` = Löschen/Deaktivieren einzelner Zeilen; Slugs/URLs pro Instanz oder generisch; Admin-Chaos; schlecht für „Jeden Dienstag bis Dezember“ |

**Datenmodell:** `Termine` + Referenz auf Serie; viele neue Zeilen  
**Feedback:** unverändert pro Zeile  
**Notifications:** pro Einzeltermin — aber Verwaltungskosten hoch

---

### Variante E — Separate RSVP-Tabelle (bewusst nicht IA-konform)

**Idee:** `event_rsvps (termin_id, member_id, occurrence_date, status)` parallel zum Feedback.

| | |
|---|---|
| **Pro** | Klare Domain-Trennung |
| **Contra** | Doppelte Logik zu `feedback_*`; `IA-TERMINE-ABSTIMMUNGEN.md` lehnt ab; zwei Systeme für Admin/Profil/E-Mail; höchster Wartungsaufwand |

---

## 4. Auswirkungsmatrix

| Bereich | A | B | C | D | E |
|---------|---|---|---|---|---|
| `Termine`-Schema | — | — | — | +Spalten/Zeilen | — |
| `feedback_modules` | config? | config? | +entity_type | — | parallel |
| `feedback_answers` | — | +occurrence_date | — | — | parallel |
| Einzeltermine | ✓ | ✓ (`NULL`) | ✓ | ✓ | ✓ |
| Serientermine korrekt | ✗ | ✓ | ✓ | △ | ✓ |
| Migrationsaufwand | keiner | mittel | hoch | hoch | hoch |
| Frontend-Aufwand | gering | mittel | hoch | hoch | sehr hoch |
| IA-Konformität | ✓ | ✓ | △ | △ | ✗ |

---

## 5. Empfehlung

### **Variante B — Vorkommens-Zusage in `feedback_answers`**

**Begründung:**

1. **Semantik:** Verbindliche Zusagen brauchen ein **Instanz-Datum**. Das Ist-Modell (`entity_id` = Serien-`Termine.id`, eine Antwort pro Mitglied) kann das nicht abbilden.
2. **Architektur-Fit:** `docs/ARCHITECTURE.md` und `IA-TERMINE-ABSTIMMUNGEN.md` halten am universellen Feedback-System fest — Variante B erweitert es, statt es zu ersetzen.
3. **Serientermin-Modell bleibt:** Eine Zeile + `exclude`-JSON ist für Kalender/Admin bewährt; Instanzen bleiben virtuell, nur die **Zusage** wird materialisiert (ein Datum pro Antwort).
4. **Notifications:** `send-admin-email` kann `occurrence_date` filtern — ohne neues Subsystem.
5. **Kosten:** Deutlich geringer als C/D/E; deutlich korrekter als A.

**Zielbild (ohne Implementierung):**

```
Kalender-Klick (generatedDate=2026-06-17)
  → /kalender/montags-training/?datum=2026-06-17
  → feedback_module (entity_id = Serien-Termin.id)
  → feedback_answers (member_id, answer, occurrence_date='2026-06-17')
```

**Migrations-Leitplanken (Konzept):**

- Bestehende Antworten an Serienterminen: `occurrence_date = NULL` als Legacy „Serien-Zusage“ markieren oder Admin-Tool zur Zuordnung
- Einzeltermine: weiter `occurrence_date IS NULL`
- `submit_public_feedback` + Unique-Constraint synchron anpassen

**Phase-4-UI (referenziert IA):** Copy „Teilnahme“ / „Zusage“; Profil „Meine Teilnahmen“ mit konkretem Datum; Admin „Zusagen & Umfragen“ mit Datumsfilter für Serien.

---

## 6. Referenzen im Code

| Thema | Pfad |
|-------|------|
| Serien-Expansion | `C:/Users/fuers/Desktop/Programme/TUS-Website/assets/js/calendar/event-cards.js` |
| Exclude-Filter | `C:/Users/fuers/Desktop/Programme/TUS-Website/assets/js/calendar/event-filter.js` |
| Feedback-Service | `C:/Users/fuers/Desktop/Programme/TUS-Website/assets/js/feedback/feedback-service.js` |
| Event-Detail + Feedback | `C:/Users/fuers/Desktop/Programme/TUS-Website/assets/js/event/event-page.js` |
| Mitglied-Zusagen | `C:/Users/fuers/Desktop/Programme/TUS-Website/assets/js/member/member-votes.js` |
| Admin-E-Mail Event-Modus | `C:/Users/fuers/Desktop/Programme/TUS-Website/supabase/functions/send-admin-email/index.ts` |
| Feedback-SQL | `C:/Users/fuers/Desktop/Programme/TUS-Website/docs/supabase-feedback.sql` |
| Schema-Doku | `C:/Users/fuers/Desktop/Programme/TUS-Website/docs/supabase/SCHEMA.md` |

---

## Kurzfassung (Empfehlung)

**Variante B:** `occurrence_date` in `feedback_answers`, Datums-Parameter in Event-URLs, Kalender übergibt `generatedDate`. Serientermine bleiben eine DB-Zeile mit `exclude`-JSON; Zusagen werden pro Vorkommen gebunden. Feedback-System und IA-Vorgaben bleiben erhalten; Admin-E-Mails und Profil werden datumsfähig. Variante A reicht nur für UX-Klarstellung, nicht für verbindliche Einzel-Zusagen.

---
