# Phase 4a — Post-Deployment-Review

**Stand:** Juni 2026  
**Scope:** Einzeltermine (Phase 4a) — **keine** Bewertung von 4b/4c  
**Methode:** Statische Code-/SQL-Analyse gegen `docs/PHASE-4-ZUSAGEN-SERIENTERMINE-KONZEPT.md`; ergänzend Kurzcheck der Live-Site (Kalender, ohne Admin-/Mitglieds-Login)  
**Deployment:** vom Team als abgeschlossen gemeldet  
**Keine Codeänderungen** in diesem Review

---

## 1. Kurzfazit

Phase 4a ist **fachlich weitgehend korrekt** umgesetzt: Verbindlichkeit bei Einzelterminen, Absage-Hürde nach Ja, feste Gründe, Historie, Backoffice-Feed und getrennte Admin-Zählung sind vorhanden. Serientermine wurden bewusst nicht angefasst.

Es gibt **keine Blocker** für den produktiven Betrieb, aber mehrere **Nachschärfungen** (UX-Verständlichkeit, Backoffice-Fokus, Public-RPC-Lücke, CSV/Datenschutz). Diese betreffen überwiegend Komfort, Klarheit und Randfälle — nicht den Kernflow über die reguläre Event-UI.

---

## 2. Fachliche Umsetzung

### 2.1 Positiv — Konzept erfüllt

| Konzept (§) | Umsetzung | Bewertung |
|-------------|-----------|-----------|
| Ja = verbindlich, Vielleicht = Interesse (§2.1) | UI-Hinweis, Button-Sublabels, getrennte Admin-Labels „Verbindliche Teilnehmer“ / „Interessenten“ | ✅ |
| Absage nach Ja nur mit Hürde (§2.3) | RPC `set_event_feedback_answer` erzwingt Grund bei Ja → Vielleicht / Keine Teilnahme; Frontend-Dialog | ✅ |
| Feste Absagegründe (§2.3.1) | 6 Codes in DB-CHECK + UI-Radios | ✅ |
| Freitext nur bei Sonstiges, optional (§2.3.2) | UI zeigt Freitext nur bei `sonstiges`; Server verwirft Freitext bei anderen Gründen | ✅ |
| Historie (§2.3) | Tabelle `feedback_answer_events`, append-only | ✅ |
| Backoffice „Teilnahmeänderungen“ (§2.3.3) | `/admin/participation_changes.html` + RPC `list_feedback_participation_changes` | ✅ |
| Keine Sofort-E-Mail bei Absage (§2.3.3) | Keine neue Mail-Logik; Edge Function unverändert | ✅ |
| Getrennte Zählung (§2.4) | `feedback-results.js`, `feedback-list.js` | ✅ |
| Public gleiche Verbindlichkeit (§2.6) | Public nutzt nach Login dieselbe Event-UI + RPC (sofern regulärer UI-Pfad) | ✅ |
| Serien unverändert (Scope 4a) | RPC-Zweig `recurring = true` ohne Historie/Hürde; Frontend `commitmentEnabled = false` | ✅ |
| Kein `occurrence_date` | Nicht implementiert | ✅ |
| Aufbewahrung ohne Auto-Löschung (§2.7) | Keine Lösch-Jobs; Events bleiben persistiert | ✅ |

### 2.2 Abweichungen / Lücken

| Thema | Konzept | Ist | Schwere |
|-------|---------|-----|---------|
| **`submit_public_feedback` nicht an 4a angebunden** | Public gleiche Logik (Planung §3.3) | RPC schreibt weiterhin **direkt** in `feedback_answers` (SECURITY DEFINER) — umgeht Absage-Hürde und Historie | **Mittel** (Randpfad; Frontend nutzt ihn nicht) |
| **Datenschutz-Hinweis Absagegründe** | Umsetzungsaufgabe (§2.7) | `datenschutz.md` noch ohne Abschnitt zu Absagegründen | **Niedrig** (bekannt offen) |
| **`send-admin-email` Planungs vs. Info** | Planung nur Ja; Info Ja+Vielleicht (§2.1.1) | Edge Function unverändert: Modus `event` weiterhin `yes` + `maybe` — fachlich für **Info-Mails** OK, aber Admin-UI labelt das nicht | **Niedrig** (4a-Scope; kein Regressionsfehler) |
| **CSV-Export Semantik** | Getrennte Planungszahlen (§2.4) | CSV-Spalte „Antwort“ nutzt `formatFeedbackAnswerLabel` („Ja — verbindliche Teilnahme“), **keine** getrennte Planungs-Spalte | **Niedrig** |
| **Backoffice-Feed Inhalt** | Beispiel: Ja → Absage (§2.3.3) | Feed zeigt **alle** Event-Typen inkl. `set_answer` (z. B. Keine → Ja) | **Niedrig** (mehr als gefordert, teils Rauschen) |
| **Rückwirkende Historie** | — | Änderungen **vor** Deploy erzeugen keine Events | **Erwartet** (kein Fehler) |

---

## 3. UX — Mitglieder-Flows (Einzeltermin)

Bewertung anhand implementierter Logik in `feedback-render.js` + RPC. Live-Test auf https://www.mtb-werdohl.de/ ohne Login: Kalender Juni 2026 ohne sichtbare Event-Detailseiten mit Feedback — **interaktive Mitglieder-Tests nicht vollständig am Live-System möglich**.

### 3.1 Flow-Matrix

| Aktion | Erwartung (Konzept) | Implementierung | Verständlichkeit |
|--------|---------------------|-----------------|------------------|
| **Ja → erneuter Klick auf Ja** | Nicht still; Absage mit Grund | Öffnet Modal „Verbindliche Zusage absagen“ → Keine Teilnahme | ⚠️ **Funktional korrekt**, aber **nicht intuitiv**: erneuter Klick auf aktives „Ja“ wirkt wie Toggle/Deselektion, nicht wie „Absagen“. Kein separater Hinweis im UI. |
| **Ja → Vielleicht** | Absage-Hürde + Grund | Modal → `downgrade_after_yes` | ✅ Fachlich klar; Wechsel von verbindlich zu Interesse ist nachvollziehbar |
| **Vielleicht → Ja** | Bestätigung Verbindlichkeit | `window.confirm` | ✅ Inhalt OK; ⚠️ natives Confirm weniger einheitlich als Absage-Modal |
| **Vielleicht → Entfernen** | Ohne Hürde | Klick auf aktives „Vielleicht“ → zurückziehen | ✅ Entspricht Konzept |
| **Keine → Ja / Vielleicht** | Ja mit Bestätigung; Vielleicht frei | Wie spezifiziert | ✅ |
| **Keine → …** | — | Kein dritter Button „Keine Teilnahme“ | ✅ Konzept-konform (Rückzug über erneuten Klick auf aktive Option) |

### 3.2 UX-Positiv

- Hinweistext unter der Frage erklärt Semantik von Ja vs. Vielleicht.
- Button-Sublabels „Verbindlich“ / „Interesse“ unterstützen die Unterscheidung.
- Absage-Modal: klare Grundliste, Freitext nur bei Sonstiges, Abbrechen stellt UI wieder her (`rerenderFeedback`).
- Statusmeldungen „Antwort gespeichert“ / „Abstimmung zurückgezogen“ nach Aktion.

### 3.3 UX-Probleme

1. **Ja absagen nur über erneuten Ja-Klick** — für Nutzer schwer entdeckbar; Konzept-Dialogtext passt, der **Auslöser** nicht.
2. **Zwei Dialog-Stile** — natives `confirm` für verbindliches Ja vs. eigenes Modal für Absage; wirkt inkonsistent.
3. **Kein explizites „Absagen“** nach verbindlichem Ja — wer von Toggle-UI gewohnt ist, versteht den Flow ggf. erst nach Irritation.
4. **Profil „Teilnahmen“** — zeigt weiterhin Icons ✅/🤔 mit Text „Ja — verbindliche Teilnahme“; konsistent, aber kein Hinweis, dass Ja-Abmeldung eine Hürde hat (optional).

---

## 4. Backoffice — Teilnahmeänderungen

**Seite:** `/admin/participation_changes.html`  
**Review:** Code + Layout/CSS; Admin-Zugang im Review nicht getestet (Login erforderlich).

### 4.1 Vollständigkeit

| Feld (Konzept) | Vorhanden | Anmerkung |
|----------------|-----------|-----------|
| Person | ✅ | inkl. „(extern)“ für `rolle = public` |
| Termin | ✅ | Titel + Link |
| Vorheriger Status | ✅ | `from_answer` → Label |
| Neuer Status | ✅ | `to_answer` → Label |
| Grund | ✅ | bei Absage nach Ja; sonst „—“ |
| Zeitpunkt | ✅ | `de-DE` lokalisiert |

**Zusätzlich** im Feed: auch neutrale Wechsel (`set_answer`, `withdraw` ohne vorheriges Ja) — siehe §2.2.

### 4.2 Sortierung

- SQL: `ORDER BY e.created_at DESC` — **neueste zuerst** ✅
- Entspricht „chronologisch“ im Konzept (Feed-Kontext).

### 4.3 Filterbarkeit

- Dropdown „Termin filtern“ — nur **Einzeltermine mit Feedback-Modul** ✅
- **Kein** Datumsfilter, **kein** Filter „nur Absagen nach Ja“ — Konzept fordert Filter nach Termin, nicht mehr.

### 4.4 Pagination

- Clientseitig 25 Einträge/Seite.
- **Problem:** Gesamtanzahl nur geschätzt (`estimatedTotal`), kein `COUNT` aus DB → letzte Seite / „Weiter“ können irreführend sein bei vielen Einträgen.

### 4.5 Mobile Darstellung

- Kartenlayout (`participation-change-card`) statt breiter Tabelle — grundsätzlich **mobil tauglich** ✅
- Filter-Dropdown + Toolbar: `flex-wrap` — auf schmalen Viewports nutzbar ✅
- Kein dediziertes Mobile-Testing am Gerät durchgeführt; CSS-Vorgaben wirken ausreichend.

### 4.6 Navigation / Auffindbarkeit

- Link von `feedback.html` und `feedback_results.html` ✅
- **Nicht** im Dashboard-Index (`admin/index.html`) verlinkt — Auffindbarkeit ⚠️

---

## 5. Historie — Mehrfach-Wechsel

### 5.1 Technisches Modell

Pro Transition ein Eintrag in `feedback_answer_events`:

| `event_type` | Beispiel |
|--------------|----------|
| `set_answer` | Keine → Ja, Vielleicht → Ja, Keine → Vielleicht |
| `withdraw` | Vielleicht → Keine |
| `withdraw_after_yes` | Ja → Keine (mit Grund) |
| `downgrade_after_yes` | Ja → Vielleicht (mit Grund) |

**Beispiel-Kette:** Keine → Vielleicht → Ja → (Absage) Keine  
→ **4 Events**, vollständig nachvollziehbar ✅

### 5.2 Vollständigkeit

- Jede RPC-Transition auf Einzelterminen erzeugt ein Event (außer No-Op gleicher Status) ✅
- Serientermine: **keine** Events (bewusst) ✅
- Vor Deploy liegende Antworten: **keine** rückwirkende Historie ✅ (erwartet)

### 5.2 Nachvollziehbarkeit

- **Positiv:** `from_answer` / `to_answer`, Zeitstempel, Grund bei relevanten Events.
- **Einschränkung:** `event_type` wird im Backoffice **nicht angezeigt** — bei gleichen Labels (z. B. Ja → Keine vs. Vielleicht → Keine) ist der Unterschied nur über Grund erkennbar.
- **Anonymisierung:** `anonymize_member` löscht Freitext/Grundcode in Events; Person bleibt als anonym markiert — fachlich abgestimmt mit Planung.

---

## 6. Public — Registrierung, Zusage, Absage

### 6.1 Registrierter Ablauf (Soll)

1. Öffentlicher Termin + `public_voting` → Gate „Als externer Teilnehmer teilnehmen“
2. Magic-Link-Registrierung (`feedback-public-registration.js`)
3. Rückkehr auf Event-Seite, Session als `rolle = public`
4. Zusage/Absage über **dieselbe** UI wie Mitglieder (`commitmentEnabled` bei Einzeltermin)

### 6.2 Bewertung

| Schritt | Status |
|---------|--------|
| Registrierung | ✅ Unverändert, etablierter Flow |
| Zusage Ja mit Bestätigung | ✅ Gleiche `confirm`-Logik |
| Absage nach Ja mit Modal | ✅ Gleiche RPC + Dialog |
| Kennzeichnung im Backoffice | ✅ „(extern)“ |

### 6.3 Public — Problem

- **`submit_public_feedback`** bleibt für `authenticated`/`anon` ausführbar (ältere Grants in `supabase-members-public-role.sql`).
- Das **Frontend** nutzt diesen RPC für den Event-Flow **nicht** — regulärer Public-Pfad ist **konform**.
- **Manueller/API-Aufruf** könnte jedoch Einzeltermin-Antworten ohne Hürde/Historie ändern → **Sicherheits- und Fachlücke** (siehe §2.2).

---

## 7. Positivbefunde (Zusammenfassung)

1. **Kernziel erreicht:** Stilles Ja→Absage auf Einzelterminen ist über RPC + RLS unterbunden.
2. **Serverseitige Durchsetzung** statt reiner UI-Hürde — konzeptionell richtig und robust für den Standardpfad.
3. **Absagegründe** vollständig und korrekt validiert (DB + UI).
4. **Historie** append-only, mehrere Wechsel lückenlos dokumentierbar.
5. **Backoffice-Feed** liefert die im Konzept geforderten Felder.
6. **Admin-Auswertung** trennt verbindliche Teilnehmer und Interessenten mit erklärendem Hinweis zur Gesamtzahl.
7. **Scope-Disziplin:** Serien, `informed`, `occurrence_date` nicht angetastet.
8. **Keine Absage-Sofortmail** — Konformität mit v1.

---

## 8. Probleme (priorisiert)

| Prio | Problem | Auswirkung |
|------|---------|------------|
| **P1** | `submit_public_feedback` umgeht 4a-Logik | Public/manueller RPC-Aufruf kann Verbindlichkeit aushebeln |
| **P2** | Ja absagen nur via erneuter Klick auf „Ja“ | UX: Absage-Flow schwer auffindbar |
| **P3** | Backoffice-Feed enthält alle `set_answer`-Events | Feed kann durch Erst-Zusagen unübersichtlich werden |
| **P4** | Pagination ohne echte Gesamtanzahl | Admin-Navigation bei langem Feed ungenau |
| **P5** | CSV ohne Planungs-Spalten / Admin-Labels | Export weniger nützlich für Organisatoren |
| **P6** | `datenschutz.md` ohne Absagegründe | Rechtliche Transparenz noch offen (bekannt) |
| **P7** | Teilnahmeänderungen nicht im Dashboard verlinkt | Geringere Auffindbarkeit für Vorstand |

---

## 9. Verbesserungsvorschläge

*Keine Umsetzung empfohlen in diesem Review — nur Vorschläge für spätere Iterationen (ohne 4b).*

### 9.1 Fachlich / Technisch

1. **`submit_public_feedback` delegieren** an `set_event_feedback_answer` oder für Einzeltermine deaktivieren/entziehen.
2. **`datenschutz.md`** um Abschnitt zu Speicherung von Absagegründen und Historie ergänzen (Konzept §2.7).

### 9.2 UX (Einzeltermin)

3. **Explizite Aktion „Verbindliche Zusage absagen“** wenn `answer = yes` (zusätzlich oder statt Ja-Retoggle).
4. **Einheitliches Modal** auch für Ja-Bestätigung (statt `window.confirm`).
5. **Kurzer Hilfetext** bei aktivem Ja: *„Erneut auf Ja klicken, um verbindlich abzusagen.“* — oder besser Punkt 3.

### 9.3 Backoffice

6. **Filter „Nur Absagen nach Ja“** (`withdraw_after_yes`, `downgrade_after_yes`) als Standardansicht.
7. **`event_type` als Badge** in der Karte (z. B. „Absage nach Ja“).
8. **Echte Pagination** mit `COUNT(*)` im RPC.
9. **CSV-Export** für Teilnahmeänderungen.
10. **Dashboard-Link** zu Teilnahmeänderungen.
11. **Admin-Link** zum Termin-Edit statt (nur) Public-Event-URL im Backoffice optional ergänzen.

### 9.4 Auswertung

12. **CSV/Tabellen-Export:** Spalten „Verbindlich (Ja)“ / „Interessent (Vielleicht)“ oder Admin-Labels konsistent nutzen.

---

## 10. Smoke-Test-Status (Review)

| Check | Review-Ergebnis |
|-------|----------------|
| SQL deployed | Vom Team bestätigt; Code/SQL konsistent |
| Frontend deployed | Live-Site erreichbar; `admin_js_version` 20260562 im Repo |
| Einzeltermin Ja-Hürde | Code ✅; Live interaktiv nicht verifiziert |
| Backoffice Feed | Code ✅; Admin nicht getestet |
| Public Flow | Code ✅; Rand-RPC ⚠️ |
| Serien unverändert | Code ✅ |

**Empfehlung:** Kurzes **manuelles Retest** mit Vorstand-Login (4–5 Minuten) auf einem Einzeltermin: Ja → Ja-Klick → Grund → Eintrag im Feed prüfen.

---

## 11. Referenzen

| Dokument / Code | Pfad |
|-----------------|------|
| Fachkonzept | `docs/PHASE-4-ZUSAGEN-SERIENTERMINE-KONZEPT.md` |
| Technische Planung | `docs/PHASE-4-TECHNISCHE-UMSETZUNGSPLANUNG.md` |
| SQL 4a | `docs/supabase-phase4a-feedback-events.sql` |
| Frontend | `assets/js/feedback/feedback-render.js` |
| Backoffice | `admin/js/participation-changes.js` |

---

**Review abgeschlossen.** Keine Implementierung in diesem Schritt. Phase 4b bleibt unberührt.
