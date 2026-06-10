# IA-Vorschlag: Termine & Abstimmungen

**Status:** Konzept (Phase 1) — keine Umsetzung

## Ist-Zustand

- **Kalender / Termine:** eigener Nav-Punkt, FullCalendar + Event-Detail
- **Abstimmung/RSVP:** Feedback-Modul am Termin (Ja/Vielleicht), kein eigener Menüpunkt
- **Admin:** Feedback in Termin-Editor; separate Listen „Feedback“ / „Ergebnisse“

Mitglieder erleben Abstimmung **im Event-Header**, nicht als eigener Bereich.

## Problem

- Begriff „Abstimmung“ passt für News-Umfragen, bei Terminen eher **Teilnahme / Zusage**
- Admin sieht Feedback getrennt von Kalender — funktional ok, semantisch unklar
- Kein zentraler Überblick „Meine Zusagen“ (Profil zeigt nur kommende Termine)

## Empfehlung (Option B — Umbenennung + leichte Struktur)

### Mitglieder-UI

| Heute | Vorschlag |
|-------|-----------|
| Kalender | **Kalender** (unverändert) |
| „Bist du dabei?“ / Ja·Vielleicht | **Teilnahme** als Überschrift im Event-Header |
| Profil → Termine | **Meine Teilnahmen** |

Kein neuer Nav-Punkt — vermeidet Duplikat zu Kalender.

### Admin-UI

| Heute | Vorschlag |
|-------|-----------|
| Feedback-Bereich Termin | **Teilnahme & Abstimmung** (Termin: Zusage; News: Umfrage) |
| `admin/feedback.html` | **Zusagen & Umfragen** (Liste) |

### Copy-Richtlinie

- Termin + `yes_maybe` → „Teilnahme“, „Zusage“, „Ja / Vielleicht“
- News + `poll` → „Abstimmung“, „Umfrage“

## Nicht empfohlen (Phase 4+)

- Separate RSVP-Tabelle losgelöst vom Feedback-System
- Eigener Nav-Punkt „Abstimmungen“ für Mitglieder

## Nächster Schritt

Freigabe dieser IA → Copy-Umbenennung in Phase 4 oder kleinem UX-Sprint.
