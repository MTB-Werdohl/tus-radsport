# Architektur

Überblick, wie die Teile des Projekts zusammenspielen. Für Setup und Ordnerstruktur siehe [README](../README.md). Supabase-SQL: [docs/supabase/RUNBOOK.md](supabase/RUNBOOK.md).

## Prinzip

```
Jekyll (statische Hülle)
    → HTML/CSS im Browser
    → Supabase (Daten, Auth, Storage, Edge Functions)
```

Inhalte wie Termine, News und Galerien liegen **nicht** in Jekyll-Collections, sondern in **Supabase**. Jekyll liefert Layout, Navigation und statische Textseiten.

## Build & Deploy (GitHub Actions)

```
git push main
    → bundle install
    → node scripts/generate-pages.js   (OG-Redirects für WhatsApp)
    → bundle exec jekyll build         → _site/
    → GitHub Pages Deploy
```

`generate-pages.js` erzeugt pro News/Termin eine statische Seite unter `news/{slug}/` bzw. `kalender/{slug}/` mit Open-Graph-Tags und leitet per JavaScript auf die Detailseite weiter.

## Öffentliche Seiten — zwei Typen

### Typ A: Statische Markdown-Seiten

Beispiele: `about.md`, `training.md`, `kodex.md`

- Frontmatter mit `layout: default`
- Inhalt = Markdown, gerendert in die Sidebar-Layout-Seite

### Typ B: Client-seitig befüllte Seiten

| Seite | Container | Skript-Kette |
|-------|-----------|----------------|
| Kalender | `#calendar`, `#event-cards` | FullCalendar + `calendar/*` |
| Termin-Detail | `#event`, `#event-feedback` | `event-service` → `event-render` → `event-page` + `feedback/*` |
| News-Liste | `#news-cards` | `news-service` → `render-cards` → `news-page` |
| News-Detail | `#news`, `#news-feedback` | `news-detail-service` → `news-detail-render` → `news-detail-page` + `feedback/*` |
| Galerie | `#gallery-grid` | `gallery-service` → `gallery-render` → `gallery-page` |
| Galerie-Detail | `#gallery-images` | `gallery-service` → `gallery-render` → `gallery-detail-page` |

**Gemeinsames Muster (Termin & News):**

```
service.js   → Daten von Supabase (nach slug)
render.js    → HTML in den Container schreiben
page.js      → slug aus URL lesen, service + render aufrufen
```

## Layout `default.html`

Lädt global:

- Supabase-Client (`site-config` → `core/supabase.js`)
- Push-Skripte
- Navigation, Sidebar, Footer, Service Worker

Optionale Frontmatter-Flags:

- `hide_title: true` — kein automatisches `<h1>` aus `page.title`
- `load_calendar_css` / `load_events_css` — CSS nur auf Kalender/Event-Seiten

## Mitglieder-Login (Magic Link)

Öffentliche Seiten nutzen `assets/js/member/`:

| Datei | Aufgabe |
|-------|---------|
| `member-service.js` | Abfrage Tabelle `members`, Rollen-Hilfen |
| `member-auth.js` | Session, Magic Link, Logout, Validierung; externe Registrierung nach Magic Link |
| `member-account.js` | Account-Löschung (Anonymisierung) via Edge Function |
| `member-nav.js` | Header-UI (Login / Profil / Logout) |
| `member-render.js` | Profilseite rendern (Mitglied + public) |
| `member-page.js` | Profilseite initialisieren |

Ablauf Vereinsmitglied: E-Mail in `members` → Magic Link → Session → E-Mail-Abgleich → Profil unter `/profil/`.

Ablauf extern (`public`): Registrierung im Feedback-Pop-up → Magic Link → DB-Eintrag → Abstimmung. Account-Löschung auf `/profil/` (Anonymisierung, siehe `anonymize-member-account`).

**Rollen** (`members.rolle`):

| Rolle | Profil | Admin `/admin/` | Interne Inhalte (`sichtbarkeit=members`) |
|-------|--------|-----------------|------------------------------------------|
| `Mitglied` | ja | nein | ja |
| `Vorstand` | ja | ja (voller CMS-Zugriff) | ja |
| `public` | ja (eingeschränkt, inkl. Account löschen) | nein | nein — nur öffentliche Abstimmungen (`public_voting`) |

Ausführliche Einrichtung: [`docs/supabase-members-setup.md`](supabase-members-setup.md) · SQL: [`docs/supabase-members-auth.sql`](supabase-members-auth.sql) · Rollen/RLS: [`docs/supabase-vorstand-roles.sql`](supabase-vorstand-roles.sql) · Public/Anonymisierung: [`docs/supabase/RUNBOOK.md`](supabase/RUNBOOK.md)

---

## Admin

- Eigene HTML-Seiten unter `admin/` mit Jekyll-Frontmatter `layout: null`
- Gemeinsamer Kopf: `_includes/admin-head.html` (Supabase, Member-Service, `admin-utils.js`, `auth-guard.js`)
- Einheitliches Layout: `.page-header` + `.admin-topbar` (Listen) bzw. `.member-admin-form` (Formulare)
- Kein separates Admin-Login: Vorstand meldet sich in der Website-Navigation per Magic Link an
- `/admin/` und Unterseiten: ohne Vorstand-Session → Redirect nach `/` (Mitglied bleibt eingeloggt)
- Session-Prüfung: `requireAdminSession(callback)` in `admin/js/auth-guard.js`
- Admin-Module: Termine, News, Galerien, Mitglieder, Push, Feedback (`admin/js/*-list.js`, `*-edit.js`, `feedback-module-form.js`)
- HTML-Escaping: `escapeAdminHtml()` in `admin/js/admin-utils.js`

SQL für Rollen und RLS: [`docs/supabase-vorstand-roles.sql`](supabase-vorstand-roles.sql)

**Sichtbarkeit** (`sichtbarkeit` auf `News` und `Termine`):

| Wert | Wer sieht es |
|------|----------------|
| `public` | Alle (auch Gäste) |
| `members` | Eingeloggte Mitglieder + Vorstand |
| `draft` | Nur Vorstand |

SQL: [`docs/supabase-content-visibility.sql`](supabase-content-visibility.sql) · Hilfsfunktionen: `assets/js/core/visibility.js`

## Supabase — logische Tabellen

| Tabelle | Zweck |
|---------|--------|
| `Termine` | Touren, Training, Events (einmalig + wiederkehrend) |
| `News` | Vereinsnachrichten |
| `galleries` | Galerie-Metadaten |
| `gallery_images` | Bilder pro Galerie |
| `site_state` | Tröte: letzte Mitteilung (`last_push`) |
| `members` | Vereinsmitglieder (`rolle`, Profil, Einwilligungen) |
| `feedback_modules` | Universelles Feedback (polymorph: `entity_type` + `entity_id`, kein FK) |
| `feedback_answers` | Antworten pro Modul und Mitglied (`answer` = Code/`option_id`) |

**Storage-Bucket:** `media` (Bilder, GPX)

SQL Feedback: [`supabase-feedback.sql`](supabase-feedback.sql)

**Edge Functions** (URLs in `site-config.js` → `functionsUrl`):

- `send-admin-email` — Vorstand-E-Mails (Einzel / Termin / Alle mit Kontakt-Einwilligung); Setup: [`supabase-admin-email-setup.md`](supabase-admin-email-setup.md)
- `anonymize-member-account` — Account-Löschung (public Self-Service / Vorstand); Referenz: [`supabase-edge-anonymize-member-account.ts`](supabase-edge-anonymize-member-account.ts), **Verify JWT OFF**

## Admin-E-Mail

| Datei | Aufgabe |
|-------|---------|
| `admin/email.html` | Formular: Empfänger, Betreff, Nachricht |
| `admin/js/email-admin.js` | Vorschau + Aufruf Edge Function |

Empfängerfilter serverseitig: `einwilligung_kontakt = true`, gültige E-Mail, nicht anonymisiert.

## Tröte (Startseite)

Der Vorstand veröffentlicht unter `/admin/push.html` eine Mitteilung. Gespeichert wird nur `site_state.last_push` (Titel, Text, optional Link, Zeitstempel). Die Tröte auf allen Seiten liest diesen Eintrag — **kein** Web Push, **kein** Service Worker.

| Datei | Aufgabe |
|-------|---------|
| `push/state.js` | Lesen/Schreiben `last_push`, Gelesen-Status (Local Storage) |
| `push/widget.js` | Tröte-Widget im Layout |
| `admin/js/push-admin.js` | Formular → `saveLastPush()` |

SQL: [`docs/supabase-drop-web-push.sql`](supabase-drop-web-push.sql) (entfernt alte Push-Tabellen nach Migration)

---

| Aufruf | Verhalten |
|--------|-----------|
| `/event.html?slug=xyz` | Termin-Detail (lädt aus Supabase) |
| `/kalender/xyz/` | CI-Redirect-Seite → `event.html?slug=xyz`; danach `replaceState` auf `/kalender/xyz` |
| `/news-detail.html?slug=…` | analog für News |
| `/news/…/` | CI-Redirect für OG |

## Konfiguration im Frontend

Zentrale Datei: `assets/js/core/site-config.js`

- Supabase-URL, Anon-Key
- `siteUrl`, `functionsUrl`
- `tables`, `storage`, `functions`, `siteStateKeys`
- Hilfsfunktion: `getFunctionUrl('anonymizeMemberAccount')` usw.

Gemeinsame Datumsformatierung: `assets/js/core/dates.js`

## Kalender — Datenfluss

```
fetchTermine()  (termine-loader.js, ein Fetch pro Seitenaufruf)
    ├── termineToCalendarEvents() → FullCalendar (event-sources.js)
    └── loadCards() → Monats-Karten (event-cards.js)

Kategorien/Farben: categories.js (getTerminCategory)
```

## Feedback — Datenfluss

```
Content (Termin.id / News.id)
        ↕ entity_type + entity_id (polymorph, kein DB-FK)
feedback_modules (type, question, config, enabled, public_voting)
        ↕ module_id
feedback_answers (member_id, answer, comment?)
```

**Öffentliche Abstimmung** (`public_voting=true`, `enabled=true`):

```
Gast → Pop-up (Name, E-Mail 2×) → Magic Link
     → Klick → complete_public_participant_registration (RPC)
     → Session → saveFeedbackAnswer (authenticated)
```

Kein anonymes Abstimmen; DB-Eintrag erst nach E-Mail-Bestätigung.

**Frontend** (`assets/js/feedback/`):

```
feedback-types.js               → Validierung, poll option_id
feedback-public-registration.js → Externe Registrierung, Magic Link, sessionStorage
feedback-service.js             → Supabase load/upsert + RPC
feedback-render.js              → UI je type; Gate für public_voting
feedback-init.js                → initFeedbackModule({ entityType, entityId, container })
```

Detail-Seiten rufen nur `initFeedbackModule()` auf — kein Feedback-Code in `event-service` / `news-detail-service`.

**Admin:** `admin/js/feedback-module-form.js` in Termin-/News-Bearbeitung (optional, zusammen mit Speichern). Schalter **Öffentliche Abstimmung** (`public_voting`). Auswertung: `admin/feedback.html`, `admin/feedback_results.html?module_id=…` (CSV-Export). Mitglieder-Löschung = Anonymisierung (`anonymize_member` + Edge Function).

Typen v1: `yes_maybe`, `yes_no_comment`, `poll` — Poll speichert `option_id` in `answer`, nicht Anzeige-Text.

SQL-Reihenfolge: [`docs/supabase/RUNBOOK.md`](supabase/RUNBOOK.md) (Feedback + public + email-verify + anonymize).

## Wartung

- Tabellennamen in `site-config.js` und `scripts/generate-pages.js` (`TABLES`) synchron halten
- Kein Service-Role-Key im Frontend
