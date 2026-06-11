# Phase 4b — Reality Check vor Umsetzung

**Stand:** Juni 2026  
**Scope:** Analyse only — **keine** Implementierung, Migration, SQL oder Code  
**Bezug:** `docs/PHASE-4-ZUSAGEN-SERIENTERMINE-KONZEPT.md` (§3, G2), `docs/PHASE-4-TECHNISCHE-UMSETZUNGSPLANUNG.md` (§4)  
**Phase 4a:** abgeschlossen · **Phase 4c:** eingefroren

---

## 1. Kurzfazit

**Ist die geplante Phase-4b-Architektur (`informed`, Migration, `event_mode`, Edge-Anpassung) notwendig?**

**Nein — nicht für den Kernnutzen.**

Serientermine sind **technisch bereits ein funktionierender Kommunikationskanal**: Wer in `feedback_answers` steht (`yes` oder `maybe`), erhält Admin-E-Mails im Modus `event`. Es gibt **kein separates Abo-Schema** und **keine** 4a-Verbindlichkeit auf Serien.

Der **echte Gap** zum Fachkonzept ist **primär semantisch/UI**:

- Mitglieder sehen weiter **Ja / Vielleicht** (RSVP-Assoziation).
- Labels sprechen von **„verbindlicher Teilnahme“** — auch auf Serien, obwohl 4a dort nicht greift.
- Admin-Auswertung trennt **Verbindliche / Interessenten** — auf Serien fachlich irreführend.

**Empfehlung:** **Variante C** (minimale Umdeutung ohne Migration) liefert **identischen Nutzen** mit **geringstem Aufwand**. Variante B (`informed` + Migration) ist **optional** für langfristige Datenhygiene, nicht Voraussetzung für das Zielbild.

---

## 2. Ist-Zustand — Speicherung

### 2.1 Datenmodell (unverändert seit Feedback-Einführung)

```
Termine (recurring = true)
    ↕ entity_type = 'event', entity_id
feedback_modules (type = 'yes_maybe')
    ↕ module_id
feedback_answers (member_id, answer, comment)
```

- **Eine Zeile pro Mitglied und Serie** (`UNIQUE module_id, member_id`).
- **Kein** `occurrence_date`, **kein** `informed`, **kein** `event_mode` in Produktion.
- **Keine** Historie auf Serien (`feedback_answer_events` filtert `recurring = false`).

### 2.2 Tatsächlich vorkommende Werte

| Zustand | Speicherung | Bedeutung heute (technisch) |
|---------|-------------|-----------------------------|
| Keine Rückmeldung | **keine Zeile** | nicht auf Liste |
| „Ja“ | `answer = 'yes'` | Eintrag auf Teilnehmerliste |
| „Vielleicht“ | `answer = 'maybe'` | Eintrag auf Teilnehmerliste |
| Freitext | `comment` (selten) | optional, nicht serienspezifisch |

**DB-Constraint auf `answer`:** kein ENUM — nur App-/RPC-Validierung (`yes` \| `maybe` für Termine).

**Verteilung:** Im Repo **keine Live-Auswertung** möglich. Typisch zu erwarten (aus bisherigem UI):

- **`maybe`** und **`yes`** parallel auf Serien — beide bedeuten faktisch „steht auf der Liste“.
- **`yes`** auf Serien ist **keine** 4a-Verbindlichkeit (RPC-Zweig `recurring = true` ohne Hürde/Historie).

### 2.3 Schreib-/Löschweg Serien (nach 4a)

| Pfad | Verhalten bei `recurring = true` |
|------|----------------------------------|
| `set_event_feedback_answer_for_member` | Direktes Upsert/Delete, **keine** Absage-Hürde, **keine** Events |
| RLS `feedback_answers` | Direktes Schreiben **erlaubt** (RPC-Pflicht nur Einzeltermine) |
| Frontend | Gleiche Ja/Vielleicht-UI, `commitmentEnabled = false` |

---

## 3. Ist-Zustand — Nutzende Funktionen

### 3.1 Übersicht

| Funktion | Datei / Ort | Nutzt Serienantworten? | Verhalten heute |
|----------|-------------|------------------------|-----------------|
| **Termin-Detail UI** | `feedback-render.js` | ✅ | Ja/Vielleicht-Buttons; kein Commitment |
| **Profil „Teilnahmen“** | `member-votes.js` | ✅ | ✅/🤔 + Label (auch „verbindliche Teilnahme“ auf Serien) |
| **Admin Feedback-Liste** | `feedback-list.js` | ✅ | Summary: „Verbindliche Teilnehmer“ / „Interessenten“ |
| **Admin Auswertung** | `feedback-results.js` | ✅ | Gleiche Trennung + CSV |
| **Admin-E-Mail (UI)** | `admin/js/email-admin.js` | ✅ | Empfänger-Vorschau: `yes` **oder** `maybe` |
| **Admin-E-Mail (Edge)** | `send-admin-email` | ✅ | Modus `event`: alle `yes` + `maybe` |
| **Teilnahmeänderungen** | `participation-changes` | ❌ | nur Einzeltermine (`recurring = false`) |
| **Tröte** | `site_state.last_push` | ❌ | kein Zusagen-Bezug |
| **Kalender / Karten** | `event-cards.js` | ❌ | nur Navigation, keine Antwortlogik |
| **RPC 4a** | `set_event_feedback_answer_*` | ✅ (Serien-Zweig) | Upsert ohne 4a-Semantik |

### 3.2 Was bereits dem 4b-Zielbild entspricht

| Ziel „Informiert bleiben“ | Bereits erfüllt? |
|---------------------------|------------------|
| Liste der Interessenten pro Serie | ✅ `feedback_answers` |
| Admin-Mail an alle Interessenten | ✅ `yes` + `maybe` = Empfänger |
| Keine Verbindlichkeit / keine 4a-Hürde | ✅ Serien-RPC-Zweig |
| Kein neues Abo-Schema | ✅ |

### 3.3 Was **nicht** dem Zielbild entspricht

| Gap | Auswirkung |
|-----|------------|
| UI: Ja / Vielleicht statt ein Einstieg | RSVP-Assoziation |
| Label „Ja — verbindliche Teilnahme“ auf Serien | Widerspruch zu Kommunikationskanal |
| Admin: getrennte Zählung Ja/Vielleicht auf Serien | Suggeriert Planungs-RSVP |
| Zwei Speicherwerte für eine fachliche Bedeutung | Auswertung/E-Mails ok, Semantik unklar |

---

## 4. Zielbild (Fachkonzept) — Was muss wirklich geändert werden?

**Produktentscheidung G2 (§3.2):** Bestehende Liste fachlich umdeuten — **kein** neues Abo-Subsystem.

| Muss-Ziel | Technische Voraussetzung |
|-----------|-------------------------|
| Ein Einstieg „Informiert bleiben“ | **UI** (+ optional Admin-Frage) |
| Kein RSVP auf Serien | **UI** — kein Ja/Vielleicht |
| Mail an Interessenten | **Bereits vorhanden** |
| Keine verbindliche Planungszählung | **Admin-Labels** für Serien anpassen |
| Kein `occurrence_date` | — (4c) |

**Fazit:** Der Mehrwert von 4b liegt zu **~70 % in Darstellung**, zu **~30 % in Konsolidierung** der Semantik — nicht in einem neuen Datenpfad.

---

## 5. Varianten-Vergleich

### Variante A — Nur UI-Umbenennung, Daten unverändert

**Idee:** Copy/Labels anpassen, `yes`/`maybe` bleiben in der DB.

| Aspekt | Bewertung |
|--------|-----------|
| Umsetzung | Zwei Buttons umbenennen (z. B. „Informiert bleiben“ / „…“) **oder** Texte erklären |
| Admin-E-Mail | ✅ unverändert nutzbar |
| Migration | ❌ keine |
| Konzept-Konformität | ⚠️ **Unzureichend**, wenn weiter **zwei** RSVP-Optionen sichtbar bleiben (§3.4: kein Ja/Vielleicht) |
| Risiko | Nutzer wählen weiterhin zwei Stufen ohne fachlichen Unterschied |

**Aufwand:** ~0,5–1 PT (nur Copy) — **reicht nicht** als Endziel.

**Teilvariante A+:** Ein Button + bestehende `yes`/`maybe` beim Lesen als „informiert“ interpretieren → siehe Variante C.

---

### Variante B — Neuer Wert `informed` + Migration (geplante 4b-Architektur)

**Idee:** `answer = 'informed'`, Batch `yes`/`maybe` → `informed`, `config.event_mode = subscription`, Edge-Filter, RPC-Validierung erweitern.

| Aspekt | Bewertung |
|--------|-----------|
| Semantik in DB | ✅ eindeutig |
| Admin/E-Mail | Anpassung nötig: nur `informed` auf Serien |
| Migration | ✅ einmalig SQL |
| Konzept-Konformität | ✅ voll |
| Risiko | Deploy-Reihenfolge; Rollback `informed` → `maybe` unschön |

**Aufwand:** ~1,5–2 PT (Planung §4 + Edge + SQL + UI + Admin)

**Nutzen vs. A/C:** **Gleicher sichtbarer Nutzen** für Mitglieder/Organisatoren — **zusätzlich** saubere Queries und weniger Sonderfälle im Code.

---

### Variante C — Minimale Lösung ohne Migration (empfohlen)

**Idee:** G2 konsequent, aber **ohne** neuen DB-Wert:

1. **UI (Serien):** ein Toggle **„Informiert bleiben“** / **„Nicht mehr informiert werden“**.
2. **Schreiben:** immer `maybe` (Konvention) — oder ein binärer Wert, bestehendes Schema.
3. **Lesen:** `yes` **oder** `maybe` = „informiert“ (Abwärtskompatibilität).
4. **Admin (Serien):** eine Zahl **„Informiert bleiben“** = count(`yes`) + count(`maybe`).
5. **Labels (Serien):** kein „Verbindliche Teilnahme“ in UI/Profil/Admin.
6. **E-Mail:** **keine Änderung** — filtert bereits `yes` + `maybe`.
7. **Erkennung:** `Termine.recurring = true` — **`event_mode` optional**, nicht nötig.

| Aspekt | Bewertung |
|--------|-----------|
| Migration | ❌ keine |
| Edge Function | ❌ keine (optional Dokumentation) |
| SQL | ❌ keine |
| Konzept-Konformität | ✅ (ein Einstieg, kein RSVP-UI) |
| Technische Schuld | ⚠️ Legacy-`yes` bleibt in DB |

**Aufwand:** ~**0,75–1,25 PT** (Frontend + bedingte Admin-/Profil-Labels + Admin-Frage optional)

---

## 6. Aufwand und Nutzen (Matrix)

| Variante | Aufwand | Nutzen vs. Zielbild | DB/SQL | Edge | Langfristige Klarheit |
|----------|---------|---------------------|--------|------|----------------------|
| **A** (nur Copy, 2 Buttons) | ~0,5–1 PT | ⚠️ unvollständig | — | — | niedrig |
| **B** (`informed` + Migration) | ~1,5–2 PT | ✅ voll | ✅ | ✅ | hoch |
| **C** (UI + Leselogik, `maybe`) | ~**0,75–1,25 PT** | ✅ voll (sichtbar) | — | — | mittel |

### Antwort auf die Kernfrage

> Welche Variante erzeugt den **geringsten Aufwand bei identischem Nutzen**?

**Variante C.**

Identischer **Mitglieds- und Organisator-Nutzen** (Informiert bleiben, Mail an Liste, kein RSVP-Denken) ohne Migration und ohne Edge-Deploy.

Variante B lohnt sich, wenn **explizit** technische Eindeutigkeit in der DB und einfachere Auswertungsqueries gewünscht sind — das ist **Qualitäts-/Wartungsziel**, kein zusätzlicher Endnutzen.

---

## 7. Risiken

### Variante A (reine Umbenennung)

- Weiterhin zwei Optionen → **RSVP-Missverständnis** bleibt.
- 4a-Labels auf Serien (**„verbindlich“**) bleiben irreführend, sofern nicht serienspezifisch gefixt.

### Variante B

- Migrationsfenster / Kommunikation an Mitglieder mit altem „Ja“ auf Serien.
- Edge + Frontend + RPC müssen **synchron** deployed werden.
- Rollback aufwändiger.

### Variante C

- **Dauerhafte Dualität** `yes` \| `maybe` in Bestandsdaten — jede neue Auswertung muss Serien-Logik kennen (`yes OR maybe` bzw. recurring-Branch).
- Wenn später doch B: Migration C→B bleibt möglich (Planung §4.6).

### Ohne 4b (Status quo)

- Kommunikation funktioniert, aber **Produktversprechen** aus §3.4 nicht erfüllt.
- Organisatoren sehen „Verbindliche Teilnehmer“ auf Trainingsserien — **fachlich falsch** nach 4a-Trennung.

---

## 8. Ist die geplante 4b-Architektur notwendig?

| Geplantes Element | Notwendig? | Begründung |
|-------------------|------------|------------|
| Neues Abo-Schema / Tabelle | ❌ | G2 bewusst abgelehnt; Liste existiert |
| `answer = informed` | ❌ | `yes`/`maybe` erfüllen Listenfunktion; Umdeutung reicht |
| `config.event_mode` | ⚠️ optional | `Termine.recurring` reicht zur Verzweigung |
| Migration Bestand | ❌ | Leselogik kann `yes`+`maybe` zusammenfassen |
| Edge `send-admin-email` Anpassung | ❌ | sendet bereits beide Werte |
| UI „Informiert bleiben“ (ein Control) | ✅ | **Haupthebel** |
| Admin-Labels nur für Serien | ✅ | Behebt Irreführung „Verbindliche Teilnehmer“ |
| RPC-/Historie-Erweiterung Serien | ❌ | nicht im Zielbild |

**Architektur-Umfang der ursprünglichen Planung (§4) ist größer als nötig** für das fachlich freigegebene Zielbild. Sie optimiert **Datenmodell-Reinheit**, nicht **neue Funktion**.

---

## 9. Empfehlung

### 9.1 Kurz

**Phase 4b umsetzen — aber als Variante C, nicht als vollständige Planungs-Variante B.**

### 9.2 Konkret (bei Freigabe, nicht jetzt)

1. **Frontend:** `recurring = true` → Subscription-UI (ein Toggle), kein Ja/Vielleicht.
2. **Schreiben:** neuer Zustand → `maybe` (Konvention); Abmelden → Delete.
3. **Lesen:** `yes` oder `maybe` → UI „Informiert bleiben“.
4. **Labels:** `formatFeedbackAnswerLabel` / Admin / Profil — **serienspezifisch** („Informiert bleiben“, nicht „verbindlich“).
5. **Admin-Summary:** Serien → **eine** Kennzahl, keine Ja/Vielleicht-Trennung.
6. **Admin-Modul-Frage:** optional Standard „Über Änderungen informiert werden?“.
7. **Nicht** vorsehen: SQL-Migration, `informed`, Edge-Deploy — **es sei denn**, später explizit für Reporting gewünscht.

### 9.3 Wann Variante B nachziehen?

- Wenn Auswertungen/Exports **explizit** nur einen Wert brauchen.
- Wenn Code-Komplexität durch überall `yes OR maybe` auf Serien stört.
- **Nicht** als Blocker für 4b-Start.

### 9.4 Phase 4c

Weiter **eingefroren** — Reality Check bestätigt: Serien brauchen kein `occurrence_date` für Kommunikationsziel.

---

## 10. Referenzen

| Thema | Pfad |
|-------|------|
| Fachkonzept 4b | `docs/PHASE-4-ZUSAGEN-SERIENTERMINE-KONZEPT.md` §3 |
| Technische Planung 4b | `docs/PHASE-4-TECHNISCHE-UMSETZUNGSPLANUNG.md` §4 |
| 4a Review | `docs/PHASE-4A-REVIEW.md` |
| Serien-RPC-Zweig | `docs/supabase-phase4a-public-feedback-rpc-fix.sql` / `set_event_feedback_answer_for_member` |
| Commitment-Ausschluss Serien | `assets/js/feedback/feedback-types.js` → `isFeedbackEventCommitmentEnabled` |
| Admin-E-Mail Filter | `supabase/functions/send-admin-email/index.ts` → `isRegisteredEventAnswer` |

---

**Review abgeschlossen. Keine Implementierung.**
