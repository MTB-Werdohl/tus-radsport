# Phase 4 — Zusagen & Serientermine: Architekturvergleich

**Status:** ✅ **Fachlich freigegeben** — Architektur- und Produktentscheidungen abgeschlossen  
**Umsetzung:** ⏸ **Nicht freigegeben** (kein Code, keine Migration, keine DB-Änderungen)  
**Stand:** Juni 2026  
**Bezug:** `docs/IA-TERMINE-ABSTIMMUNGEN.md`, `docs/supabase/SCHEMA.md`, `docs/ARCHITECTURE.md`

> **Geltungsbereich dieses Dokuments:** Fachliches und architektonisches Zielbild für Phase 4 (4a / 4b / 4c).  
> **Nicht enthalten:** Implementierung, Migration, Datenbank- oder Code-Änderungen — diese folgen erst nach separater Umsetzungsfreigabe.

---

## 0. Neue fachliche Einordnung (Produktentscheidung)

Die bisherige Analyse hat **zwei unterschiedliche Anwendungsfälle** gemeinsam betrachtet. Das führte dazu, dass **Variante B (`occurrence_date`)** als pauschale Empfehlung erschien — obwohl der eigentliche Schmerz woanders liegt.

| | Anwendungsfall A — Einzeltermine | Anwendungsfall B — Serientermine |
|---|----------------------------------|----------------------------------|
| **Beispiele** | Winterwanderung, Vereinsausflug, Helferfest, Tagesfahrt, Bikepark-Wochenende | Jeden Dienstag Training, Donnerstag Rennrad, Sonntag Gravel |
| **Kernbedarf** | **Verbindlichkeit** — Organisator darf planen | **Kommunikation** — Mitglieder über Änderungen informieren |
| **Primäres Produkt** | Verbindliche Teilnahme (Ja) vs. Interesse (Vielleicht) | Informations- / Abo-Modell |
| **Typische Admin-Aktion** | Zusagen zählen, Abmeldungen mit Grund nachvollziehen | Mitteilung: „Heute anderer Treffpunkt / früherer Start / fällt aus“ |
| **Phase (Konzept)** | **Phase 4a** | **Phase 4b** |
| **Datums-RSVP pro Vorkommen** | nicht nötig (ein Termin = eine Instanz) | **nicht Standard** — nur Sonderfall (**Phase 4c**) |

**Leitfrage zur alten Empfehlung:**

Löst `occurrence_date` den wichtigsten Schmerz?

**Nein.** Es löst primär ein **technisches Problem** (Zusage an die ganze Serie statt an ein Datum). Die eigentliche Herausforderung liegt bei **Verbindlichkeit** (Einzeltermine) und **Kommunikation** (Serientermine). Beides wird durch `occurrence_date` allein nicht adressiert.

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

**Konsequenz heute:** Ein Modell für alle Termine — **Ja**, **Vielleicht** und **keine Rückmeldung** werden fachlich nicht getrennt behandelt.

### 1.3 Profil „Teilnahmen“

`assets/js/member/member-votes.js`:

- Tab **Teilnahmen** mit Bereichen **Termine** (Ja/Vielleicht) und **Abstimmungen** (News)
- Für Serien: `formatCardDate(entity)` zeigt **„Jeden Dienstag“**, nicht das nächste konkrete Datum
- `isTerminStillUpcoming`: bei `recurring` nur Prüfung von `endRecur`

### 1.4 Benachrichtigungen

| Kanal | Mechanismus | Bezug zu Zusagen |
|-------|-------------|------------------|
| **Tröte** | `site_state.last_push` | Broadcast — kein Zusagen-Bezug |
| **Admin-E-Mail** | Edge Function `send-admin-email`, Modus `event` | Alle `feedback_answers` mit `yes` **und** `maybe` zum `feedback_module` |
| **Web Push** | entfernt | — |

**Ist-Probleme:**

- **Ja** und **Vielleicht** werden in E-Mails und Auswertung **gleich behandelt**
- Backoffice zählt nicht getrennt: „Verbindliche Teilnehmer“ vs. „Interessenten“
- Abmeldung nach **Ja** ist **still** möglich (Keine Teilnahme / erneuter Klick ohne Hürde)
- Keine **Historie** von Statusänderungen, kein **Absagegrund**
- Serientermine: eine Antwort gilt für die **gesamte Serie** — passt weder zu verbindlicher Einzel-Zusage noch klar zum Kommunikations-Abo

`docs/IA-TERMINE-ABSTIMMUNGEN.md` empfiehlt **keine** separate RSVP-Tabelle und **keinen** eigenen Nav-Punkt — Lösungen sollen im Feedback-System verankert bleiben.

---

## 2. Anwendungsfall A — Einzeltermine (Phase 4a)

### 2.1 Fachliche Bedeutung der Antworten

Die Optionen **Ja**, **Vielleicht** und **Keine Rückmeldung** sind **nicht gleichwertig**.

#### Ja — verbindliche Teilnahme

Der Organisator **darf mit dieser Person planen**.

Beispiele: Reservierungen, Verpflegung, Gruppengröße, Material, Organisation.

#### Vielleicht — Interessenbekundung

**Keine verbindliche Zusage.**

Bedeutung: *„Ich habe Interesse und möchte informiert bleiben, kann aber noch nicht verbindlich zusagen.“*

#### Keine Rückmeldung

Kein Signal. Keine Planungsgrundlage.

### 2.1.1 ✅ Produktentscheidung: „Vielleicht“ und Termin-Informationen

**Festgelegt:** „Vielleicht“ erhält **weiterhin alle Informationen zum Termin** (Updates, Änderungen, Erinnerungen — soweit der Termin kommuniziert wird).

**Begründung:** Vielleicht bedeutet Interesse vorhanden, informiert bleiben, Teilnahme aktuell nicht garantiert. Wer informiert bleiben will, braucht dieselben Termin-Informationen wie ein verbindlich Zusagender — nur ohne Planungswirkung.

| | **Ja** | **Vielleicht** |
|---|--------|----------------|
| Bedeutung | Verbindliche Teilnahme | Interesse, keine Garantie |
| Termin-Updates | ✓ | ✓ |
| Zählt in verbindliche Planung | ✓ | ✗ |
| Entfernen / zurückziehen | nur mit **Absage-Hürde** (siehe §2.3) | **jederzeit**, ohne Hürde, ohne Grund |
| Admin-Zählung | Verbindliche Teilnehmer | Interessenten |

**Wichtig:** Vielleicht ist **keine schwächere Form von Ja**. Vielleicht ist fachlich ein **anderer Zustand**.

**Konsequenz für Phase 4a (später):**

- `send-admin-email` Modus `event`: Zielgruppe für **Organisator-Mitteilungen** = Ja **und** Vielleicht (beide informiert).
- Auswertung / Planungszahlen: **nur Ja** zählt verbindlich.
- Keine Einschränkung der Informationskanäle für Vielleicht.

### 2.2 Der eigentliche Schmerz

Nicht fehlendes `occurrence_date`, sondern **fehlende Verbindlichkeit**:

Ein Mitglied kann heute **Ja** wählen und später **still** auf Keine Teilnahme wechseln — ohne Rückmeldung an den Organisator.

```
Ja  →  Keine Teilnahme   (ohne Hürde, ohne Grund, ohne Historie)
```

Genau das soll verhindert werden.

### 2.3 Gewünschte Fachlogik (Abmeldung nach Ja)

Wenn ein Mitglied von **Ja** auf **Vielleicht** oder **Keine Teilnahme** wechselt, darf dies **nicht still** passieren.

**Ziel der Hürde** (nicht Bestrafung):

1. höhere Verbindlichkeit
2. bewusste Entscheidung
3. bessere Planbarkeit
4. Information für Organisatoren

**Zielbild (Umsetzung):**

| Element | Beschreibung |
|---------|--------------|
| Dialog | z. B. *„Du hattest bereits verbindlich zugesagt. Warum möchtest du absagen?“* |
| Historie | Statusänderungen nachvollziehbar speichern |
| Backoffice | getrennte Zählung + Bereich **„Teilnahmeänderungen“** (§2.3.2) |
| Benachrichtigung | **Keine** Sofort-E-Mail pro Absage (v1); optional Digest später (§9) |

### 2.3.1 ✅ Produktentscheidung: Absagegründe (Einzeltermine)

**Festgelegt:** Feste Auswahl — **keine freie Eingabe als Standard**.

| Grund |
|-------|
| Krankheit |
| Familie |
| Arbeit |
| Wetter |
| Terminüberschneidung |
| Sonstiges |

### 2.3.2 ✅ Produktentscheidung: Freitext

**Festgelegt:**

- Freitext **nur** bei Auswahl **„Sonstiges“**
- Freitext ist **optional**, **nicht verpflichtend**

### 2.3.3 ✅ Produktentscheidung: Admin-Benachrichtigung bei Absage nach Ja

**Frage:** Sofortige E-Mail bei jeder Absage — oder Backoffice-Bereich?

| Option | Bewertung |
|--------|-----------|
| **Sofortige E-Mail pro Absage** | Planungsschaden wird schnell sichtbar — aber **E-Mail-Flut** bei vielen Terminen/Abmeldungen; Vorstand ignoriert Mails eher; kein Überblick über mehrere Änderungen |
| **Backoffice „Teilnahmeänderungen“** | **Empfohlen als Standard** — zentraler Feed im Admin; Organisator sieht Kontext (Termin, Person, vorher/nachher, Grund); keine Push-Pflicht pro Klick |
| **Beides parallel** | Optional später — E-Mail nur als Zusatz (Digest oder manuell) |

**Festgelegt:**

1. **Standard:** Admin-Bereich **„Teilnahmeänderungen“** (Liste/Feed, filterbar nach Termin, chronologisch).
2. **Historie** in der Datenbank — Backoffice liest daraus (kein separates „Protokoll“ ohne Persistenz).
3. **Keine automatische Sofort-E-Mail** bei jeder einzelnen Absage nach Ja (Phase 4a v1).
4. **Optional (technische Umsetzungsfrage, §9):** Täglicher Digest, manueller Button „Organisatoren per E-Mail informieren“.

**Beispiel Backoffice-Eintrag:**

| Feld | Wert |
|------|------|
| Person | Max Mustermann |
| Termin | Winterwanderung |
| Änderung | Ja → Absage |
| Grund | Krankheit |
| Zeitpunkt | 2026-06-14 18:32 |

**Wechsel ohne Hürde (festgelegt):**

- Vielleicht → Keine Teilnahme
- Vielleicht → Ja (mit klarer Bestätigung der Verbindlichkeit)
- Keine → Vielleicht / Ja

### 2.4 Backoffice — getrennte Zählung

Verbindliche Teilnehmer und Interessenten **dürfen nicht gemeinsam gezählt** werden.

| Falsch (Ist) | Richtig (Ziel) |
|--------------|----------------|
| Teilnehmer: 20 | Verbindliche Teilnehmer: 13 |
| | Interessenten: 7 |

Betrifft: Admin-Auswertung, CSV-Export, E-Mails an „Teilnehmer“ (nur Ja vs. Ja+Vielleicht trennen).

### 2.5 Architektur-Fit für Einzeltermine

Für Einzeltermine reicht **eine Antwort pro Termin** (`occurrence_date` nicht erforderlich).

Empfohlener konzeptioneller Strang **Phase 4a — Commitment-Modell (Variante F)**:

- Feedback-System beibehalten (`yes_maybe`)
- **Semantik** Ja ≠ Vielleicht in UI, Auswertung, Benachrichtigungen
- **Abmelde-Workflow** nach Ja mit Grund
- **Historie** (z. B. `feedback_answer_events` oder gleichwertig — nur Konzept)
- **Kein** zwingendes `occurrence_date`

### 2.6 ✅ Produktentscheidung: Public-Teilnehmer und Verbindlichkeit

**Festgelegt:** Die Verbindlichkeitslogik gilt **rollenunabhängig**.

Sobald ein Teilnehmer **Ja** gewählt hat, gilt die Zusage als **verbindlich** — für:

- **Mitglied**
- **Vorstand**
- **Public**

| Aspekt | Entscheidung |
|--------|--------------|
| Ja = verbindlich | rollenunabhängig, sobald `answer = yes` |
| Absage-Hürde nach Ja | gleicher Dialog, gleiche Absagegründe (§2.3.1) |
| Vielleicht / Keine Hürde | wie §2.1.1 |
| Geltungsbereich | nur wo Termin-Feedback aktiv ist (öffentlicher Termin + Modul; bei `public_voting` auch externe Registrierung) |

### 2.7 ✅ Produktentscheidung: Aufbewahrung Absagegründe

**Festgelegt:**

- Absagegründe gelten als **Organisations- und Terminhistorie**
- **Keine automatische Löschung** vorgesehen (Produktentscheidung)

**Umsetzungsaufgabe (später, nicht Phase-4-Konzept):** Datenschutz-Hinweis in `datenschutz.md` ergänzen (Speicherung, Zweck, Betroffenenrechte). Technische Löschung bei Account-Anonymisierung prüfen.

---
## 3. Anwendungsfall B — Serientermine (Phase 4b)

### 3.1 Fachliche Einordnung

Serientermine sind **standardmäßig kein RSVP-Produkt**.

Der Hauptzweck ist **Kommunikation**, nicht Verbindlichkeit.

**Typische Mitteilungen:**

- Heute anderer Treffpunkt
- Heute früherer Start
- Heute andere Aktivität
- Heute fällt aus

Mitglieder, die sich für einen Serientermin **eingetragen** haben, sollen diese Informationen erhalten — ohne pro Dienstag eine verbindliche Ja-Zusage abgeben zu müssen.

### 3.2 Informationsmodell — Neubewertung: Neues Abo vs. bestehende Liste

**Frage:** Benötigt ein Serientermin wirklich ein **neues Abo-Datenmodell** — oder reicht die **bestehende Teilnehmerliste** fachlich als „Informiert bleiben“?

#### Option G1 — Neues Abo-Modell (technisch separat)

Neuer Antwort-Typ oder eigener Modus (`recurring_mode: subscription`), getrennt von Ja/Vielleicht.

| Pro | Contra |
|-----|--------|
| Semantik technisch eindeutig | Zusätzliche Komplexität (Schema/UI/RPC) |
| Keine Verwechslung mit Einzeltermin-RSVP | Migration bestehender Serien-Antworten |
| | Doppelung zu bestehendem Feedback |

#### Option G2 — Bestehende Liste fachlich umdeuten (✅ **Produktentscheidung Phase 4b v1**)

**Kein neues Datenmodell.** Serientermin nutzt weiter `feedback_modules` + `feedback_answers`, aber:

- **UI für Serien:** ein Einstieg — z. B. *„Ich möchte informiert werden“* (statt Ja/Vielleicht-RSVP).
- **Technisch (Konzept):** speichert z. B. `answer = maybe` oder dediziertes `answer = informed` — **Implementierungsdetail später**; fachlich = **Informiert bleiben**.
- **Admin:** `send-admin-email` Modus `event` an **alle Einträge der Serien-Teilnehmerliste** (wie heute, Semantik korrigiert).
- **Kein** verbindliches Ja auf Serienebene im Standard-UI.

**Ablauf (Zielbild):**

```
Mitglied: „Ich möchte informiert werden“
    ↓
Eintrag in Teilnehmerliste (Serie)
    ↓
Admin: E-Mail / Hinweis — „Heute anderer Treffpunkt“ / „fällt aus“ / „30 Min früher“
    ↓
Empfänger = alle Informiert-bleiben-Einträge der Serie
```

| Pro | Contra |
|-----|--------|
| **Kein neues Abo-Schema** — schneller, IA-konform | Ist-Zustand vermischt Ja/Vielleicht auf Serien — **UI/Copy muss wechseln** |
| Nutzt **bestehende** Teilnehmerliste + Admin-E-Mail | Ohne UI-Anpassung weiterhin missverständlich |
| Tröte optional für breite Hinweise | Instanz-Hinweise **außerhalb** Phase 4 (§3.5) |
| Geringer Implementierungsaufwand vs. G1 | |

**Festgelegt (Phase 4b v1):**

- **Option G2** — fachliche Umdeutung + UI nur **„Informiert bleiben“**; **kein** separates Abo-Subsystem
- **Kein** klassisches **Ja / Vielleicht** für Standard-Serientermine (§3.4)
- Admin: `send-admin-email` an Serien-Teilnehmerliste; Tröte ergänzend
- Optional später: `config.recurring_mode: "subscription"` als UI-Schalter, nicht als parallele Tabelle

### 3.4 ✅ Produktentscheidung: Serientermine — kein RSVP-Standard

**Festgelegt:**

- Standard-Serientermine sind **Kommunikationskanäle**, **keine** RSVP-Veranstaltungen
- UI-Zielbild: **„Informiert bleiben“** (ein Einstieg, kein Ja/Vielleicht)
- Serientermine dienen der **Information** bei Änderungen (Treffpunkt, Zeit, Ausfall, Aktivität)

### 3.5 ✅ Produktentscheidung: Serien-Instanz-Hinweise — nicht Phase 4

**Festgelegt:**

- **Nicht** Bestandteil von Phase 4 (weder 4a noch 4b)
- **V1 bleibt:** „Informiert bleiben“ + **Admin-E-Mail** an Interessenten der Serie
- Weitere Kommunikationsformen (z. B. Instanz-Hinweis im Termin-Detail pro Datum) = **mögliche spätere Erweiterung** (§9)

### 3.3 Ist-Modell vs. Zielbild

| Bestehend | Passt nach G2 (Umdeutung + UI)? |
|-----------|----------------------------------|
| Teilnehmerliste | ✓ — wird **Informiert-bleiben-Liste** |
| `send-admin-email` Modus `event` | ✓ — Zielgruppe = Serien-Teilnehmerliste |
| Tröte | ✓ — ergänzend, nicht ersetzend |
| Ja/Vielleicht-Buttons (Ist) | ✗ — für Serien-Standard **ersetzen** durch einen Informations-Einstieg |

---

## 4. Lösungsvarianten — Neubewertung (A–E)

Bewertung **getrennt** nach Anwendungsfall A (Einzeltermin) und B (Serientermin).

### Variante A — Status quo + UX-Klarstellung

**Idee:** Datenmodell unverändert. Copy und Hinweise anpassen.

| | Einzeltermin (4a) | Serientermin (4b) |
|---|-------------------|-------------------|
| **Pro** | geringer Aufwand | Serien als „Abo für alle Vorkommen“ erklärbar |
| **Contra** | **Ja-Abmeldung ungelöst**; Ja/Vielleicht weiter vermischt | **Falsches Produkt** — suggeriert RSVP statt Kommunikation |
| **Phase** | unzureichend | nur UX-Hilfe, kein Zielbild |

**Fazit:** Für **4a unzureichend**. Für **4b** höchstens Übergangs-Copy, nicht als Endziel.

---

### Variante B — `occurrence_date` in `feedback_answers`

**Idee:** Zusage pro Vorkommen binden; URL mit Datum; Unique `(module_id, member_id, occurrence_date)`.

| | Einzeltermin (4a) | Serientermin (4b) |
|---|-------------------|-------------------|
| **Pro** | — | technisch präzise pro Datum |
| **Contra** | **Overkill** — ein Termin braucht kein Datum | **Falsches Produkt** — erzwingt RSVP-Denken auf Trainingstermine |
| **Verbindlichkeit** | **löst nicht** Ja-Abmeldung / Grund / Historie | **löst nicht** Kommunikations-Bedarf |
| **Phase** | **nicht empfohlen** | **nicht als Standard** → **Phase 4c** (Sonderfall) |

**Neubewertung:** Variante B war die **alte Gesamt-Empfehlung**. Sie adressiert ein **technisches Randproblem** (Serien-Instanz), nicht den **Hauptschmerz** (Verbindlichkeit vs. Kommunikation). **Nicht mehr pauschal empfohlen.**

---

### Variante C — Materialisierte Vorkommen (`termin_occurrences`)

**Idee:** Eigene Tabelle pro Vorkommen; `entity_type = 'occurrence'`.

| | Einzeltermin | Serientermin |
|---|--------------|--------------|
| **Bewertung** | unverhältnismäßig | technisch sauber, **produktpolitisch falsch** als Standard |
| **Aufwand** | hoch | sehr hoch |

**Fazit:** Weiterhin **nicht empfohlen** — weder für 4a noch als Serien-Standard.

---

### Variante D — Serien auf Einzeltermine aufspalten

**Idee:** Aus Serienmaster viele `Termine`-Zeilen erzeugen.

| | Einzeltermin | Serientermin |
|---|--------------|--------------|
| **Bewertung** | bekannte Semantik pro Zeile | Admin- und Datenchaos; schlecht für „jeden Dienstag“ |

**Fazit:** **Nicht empfohlen.**

---

### Variante E — Separate RSVP-Tabelle

**Idee:** Parallel zu `feedback_*`.

| | Bewertung |
|---|-----------|
| **IA** | widerspricht `IA-TERMINE-ABSTIMMUNGEN.md` |
| **Wartung** | doppelte Logik |

**Fazit:** **Bewusst abgelehnt.**

---

### Variante F — Commitment-Modell (neu, Phase 4a)

**Idee:** Feedback-System erweitern um Verbindlichkeit — **ohne** zwingendes `occurrence_date`.

| Element | Konzept |
|---------|---------|
| Ja / Vielleicht | getrennte Semantik, getrennte Zählung |
| Abmeldung nach Ja | Hürde + Grund (+ optional Freitext) |
| Historie | Statusänderungen speicherbar |
| Organisator | Backoffice **„Teilnahmeänderungen“** (Standard); **keine** Sofort-E-Mail pro Absage (v1) |
| Gilt für | `recurring = false`; Ja-Verbindlichkeit rollenunabhängig (§2.6) |

**Empfehlung:** **Kern von Phase 4a.**

---

### Variante G — Serien-Informationsmodus (Phase 4b)

**Idee:** Serientermin = Informationskanal; **bestehende Teilnehmerliste** fachlich als „Informiert bleiben“ (Option **G2**, §3.2).

| Element | Konzept |
|---------|---------|
| Mitgliedsaktion | *„Ich möchte informiert werden“* / abbestellen |
| Technik v1 | **Kein** neues Abo-Schema; UI-Modus + ggf. `config.recurring_mode` |
| Admin-Aktion | E-Mail an Serien-Teilnehmerliste (`send-admin-email`); **kein** Instanz-Hinweis in Phase 4 |
| Nicht Standard | verbindliches Ja auf Serienebene |
| Gilt für | `recurring = true` (Default) |

**Empfehlung:** **Kern von Phase 4b** — **G2** (Umdeutung + UI), nicht G1 (separates Abo-Modell).

---

## 5. Phase 4c — `occurrence_date` (Sonderfall)

**Nur** wenn ein Serientermin **ausnahmsweise** echte datumsbezogene **verbindliche** Zusagen braucht (selten: z. B. monatliches Event mit Catering pro Datum).

| | |
|---|---|
| **Technik** | Variante B (`occurrence_date`, URL mit Datum) |
| **Produkt** | explizit **nicht** Standard für Trainingsserien |
| **Priorität** | nach 4a und 4b; nur bei konkretem Bedarf |

---

## 6. Auswirkungsmatrix (aktualisiert)

Legende: **4a** = Einzeltermin-Verbindlichkeit · **4b** = Serien-Kommunikation · **4c** = Sonderfall datumsbezogen

| Variante | 4a | 4b | 4c | Aufwand | IA |
|----------|----|----|-----|---------|-----|
| A Status quo + Copy | ✗ | △ | — | gering | ✓ |
| B `occurrence_date` | △ | ✗ Standard | ✓ | mittel | ✓ |
| C `termin_occurrences` | △ | △ | △ | hoch | △ |
| D Aufspaltung | ✓ | ✗ | — | hoch | △ |
| E separate RSVP | ✓ | ✓ | ✓ | sehr hoch | ✗ |
| **F Commitment** | **✓ Kern** | — | — | mittel | ✓ |
| **G Serien-Info (G2)** | — | **✓ Kern** | — | gering–mittel | ✓ |

---

## 7. Empfehlung (neu)

Phase 4 **nicht** als ein Block mit pauschaler Variante B umsetzen, sondern **getrennt**:

### Phase 4a — Einzeltermine: Verbindliche Teilnahme

- ✅ Ja ≠ Vielleicht (§2.1.1); Absagegründe feste Liste + optionaler Freitext bei Sonstiges (§2.3.1–2.3.2)
- ✅ Abmelde-Hürde nach Ja; rollenunabhängig inkl. Public (§2.6)
- ✅ Historie + Backoffice „Teilnahmeänderungen“ (§2.3.3); keine Sofort-E-Mail v1
- ✅ Aufbewahrung ohne Auto-Löschung (§2.7)
- Konzept: **Variante F**

### Phase 4b — Serientermine: Informationskanal

- ✅ Nur **„Informiert bleiben“** — kein Ja/Vielleicht (§3.4)
- ✅ G2: bestehende Liste + Admin-E-Mail; kein neues Abo-Schema (§3.2)
- ✅ Keine Serien-Instanz-Hinweise in Phase 4 (§3.5)
- Konzept: **Variante G**

### Phase 4c — Zusagen pro Vorkommen (Sonderfall)

- **Variante B** (`occurrence_date`) nur bei explizitem Bedarf
- **Nicht** zentrale Standardempfehlung
- Nicht Voraussetzung für 4a oder 4b

### Reihenfolge (Vorschlag)

1. **4a** — größter fachlicher Hebel (Verbindlichkeit, Organisator-Planung)
2. **4b** — Serien-Kommunikation klären; bestehende Serien-Antworten fachlich neu interpretieren (Abo statt RSVP)
3. **4c** — nur bei konkretem Einzelfall

---

## 8. Festgelegte Produktentscheidungen (vollständig)

| # | Thema | Entscheidung | Referenz |
|---|--------|--------------|----------|
| 1 | **Vielleicht** | Alle Termin-Updates; **nicht** verbindlich; Abmeldung ohne Hürde | §2.1.1 |
| 2 | **Ja** | Verbindliche Teilnahme; Planungszählung; Abmeldung mit Hürde + Grund | §2.3 |
| 3 | **Absagegründe** | Feste Liste (6 Kategorien); **keine** freie Eingabe als Standard | §2.3.1 |
| 4 | **Freitext** | Nur bei „Sonstiges“; **optional** | §2.3.2 |
| 5 | **Public** | Gleiche Verbindlichkeit bei Ja wie Mitglied/Vorstand | §2.6 |
| 6 | **Aufbewahrung** | Organisations-/Terminhistorie; **keine** automatische Löschung | §2.7 |
| 7 | **Admin bei Absage** | Backoffice **„Teilnahmeänderungen“**; **keine** Sofort-E-Mail pro Absage (v1) | §2.3.3 |
| 8 | **Serientermine** | **Informiert bleiben**; kein Ja/Vielleicht-RSVP; G2 ohne neues Abo-Schema | §3.2–3.4 |
| 9 | **Serien-Instanz-Hinweise** | **Nicht** Phase 4; v1 = Liste + Admin-E-Mail | §3.5 |
| 10 | **Architektur** | Phase **4a / 4b / 4c** getrennt; **Variante B** nur Sonderfall 4c | §0, §5, §7 |

**Datenschutz:** Ergänzung `datenschutz.md` zu Absagegründen = **Umsetzungsaufgabe**, keine offene Produktentscheidung (§2.7).

---

## 9. Verbleibende technische Umsetzungsfragen

Alle **Produktentscheidungen** sind getroffen. Folgendes ist bei **Implementierung** zu klären (ohne fachliche Neubewertung):

| Thema | Frage | Phase |
|-------|--------|-------|
| Historie-Modell | `feedback_answer_events` vs. Erweiterung `feedback_answers` + Audit-Felder | 4a |
| Absagegrund speichern | Spalte `cancellation_reason_code` + optional `comment` vs. nur `comment` mit Code | 4a |
| Backoffice UI | Ort/Navigation „Teilnahmeänderungen“; Filter; CSV-Export Historie | 4a |
| Public im Backoffice | Kennzeichnung Rolle `public` in Teilnahmeänderungen | 4a |
| Account-Löschung | Verhalten bei Anonymisierung (`anonymize_member`) — Grund textlich entfernen, Historie anonym? | 4a |
| `send-admin-email` | Empfängerfilter: Planungs-Mails nur Ja; Info-Mails Ja+Vielleicht (Einzeltermin) | 4a |
| Serien UI-Modus | Erkennung `recurring = true` → nur „Informiert bleiben“-Control | 4b |
| Serien `answer`-Wert | `maybe` vs. neuer Code `informed` / `subscribed` | 4b |
| `config.recurring_mode` | Schalter im Modul (`subscription` vs. `per_occurrence` für 4c) | 4b / 4c |
| Migration bestehender Daten | Serien-Antworten `yes`/`maybe` → „Informiert bleiben“; Einzeltermine unverändert | 4a/4b |
| E-Mail-Digest | Optional später: Zusammenfassung Teilnahmeänderungen | nach 4a v1 |
| Instanz-Hinweise | Termin-Detail pro Datum für Serien-Abonnenten | **nach** Phase 4 |
| Phase 4c Bedarf | Konkreter Termin, der datumsbezogene verbindliche Zusagen braucht | 4c |

**Freigabestatus:** Fachlich **freigegeben**. Technische Umsetzung und Deploy **noch nicht freigegeben**.

---

## 10. Referenzen im Code (Ist-Zustand)

| Thema | Pfad |
|-------|------|
| Serien-Expansion | `assets/js/calendar/event-cards.js` |
| Exclude-Filter | `assets/js/calendar/event-filter.js` |
| Feedback-Service | `assets/js/feedback/feedback-service.js` |
| Feedback-Typen / Abwahl | `assets/js/feedback/feedback-types.js` |
| Event-Detail + Feedback | `assets/js/event/event-page.js` |
| Profil Teilnahmen | `assets/js/member/member-votes.js` |
| Admin-E-Mail Event-Modus | `supabase/functions/send-admin-email/index.ts` |
| Feedback-SQL | `docs/supabase-feedback.sql` |
| IA Copy-Richtlinie | `docs/IA-TERMINE-ABSTIMMUNGEN.md` |
| Schema | `docs/supabase/SCHEMA.md` |

---

## Kurzfassung

**Status:** ✅ **Fachlich freigegeben** · Umsetzung ⏸ **nicht freigegeben**

**Architektur:** Phase **4a** (Einzeltermine, Verbindlichkeit) · **4b** (Serien, Informationskanal) · **4c** (`occurrence_date` nur Sonderfall).

**Produktentscheidungen (Auszug):**

- **Ja** verbindlich (Mitglied, Vorstand, Public); **Vielleicht** informiert, nicht planungsrelevant
- Absage nach Ja: feste Gründe, Freitext nur optional bei Sonstiges, Historie, Backoffice „Teilnahmeänderungen“
- Absagegründe: **keine** automatische Löschung (Datenschutz-Text = Umsetzungsaufgabe)
- **Serientermine:** nur **„Informiert bleiben“** + Admin-E-Mail; **kein** Ja/Vielleicht; **keine** Instanz-Hinweise in Phase 4

**Offen:** nur **technische Umsetzungsfragen** — siehe §9.

---