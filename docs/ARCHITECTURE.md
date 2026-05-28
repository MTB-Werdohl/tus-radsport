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
- Push/PWA-Skripte
- Navigation, Sidebar, Footer, Service Worker

Optionale Frontmatter-Flags:

- `hide_title: true` — kein automatisches `<h1>` aus `page.title`
- `load_calendar_css` / `load_events_css` — CSS nur auf Kalender/Event-Seiten

## Mitglieder-Login (Magic Link)

Öffentliche Seiten nutzen `assets/js/member/`:

| Datei | Aufgabe |
|-------|---------|
| `member-service.js` | Abfrage Tabelle `members` |
| `member-auth.js` | Session, Magic Link, Logout, Validierung |
| `member-nav.js` | Header-UI (Login / Profil / Logout) |
| `member-render.js` | Profilseite rendern |
| `member-page.js` | Profilseite initialisieren |

Ablauf: E-Mail in `members` → Magic Link → Session → E-Mail-Abgleich → Profil unter `/profil/`.

**Rollen** (`members.rolle`):

| Rolle | Profil | Admin `/admin/` | Interne Inhalte (`sichtbarkeit=members`) |
|-------|--------|-----------------|------------------------------------------|
| `Mitglied` | ja | nein | ja |
| `Vorstand` | ja | ja (voller CMS-Zugriff) | ja |
| `public` | ja (eingeschränkt) | nein | nein — nur öffentliche Abstimmungen |

Ausführliche Einrichtung: [`docs/supabase-members-setup.md`](supabase-members-setup.md) · SQL: [`docs/supabase-members-auth.sql`](supabase-members-auth.sql) · Rollen/RLS: [`docs/supabase-vorstand-roles.sql`](supabase-vorstand-roles.sql)

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
| `PushSubscriptions` | Web-Push-Endpunkte (verknüpft mit `members` über `member_id`) |
| `site_state` | z. B. letzte Push-Nachricht (`last_push`) |
| `members` | Vereinsmitglieder (`rolle`, Profil, Einwilligungen) |
| `feedback_modules` | Universelles Feedback (polymorph: `entity_type` + `entity_id`, kein FK) |
| `feedback_answers` | Antworten pro Modul und Mitglied (`answer` = Code/`option_id`) |

**Storage-Bucket:** `media` (Bilder, GPX)

SQL Feedback: [`supabase-feedback.sql`](supabase-feedback.sql)

**Edge Functions** (URLs in `site-config.js` → `functionsUrl`):

- `save-push-subscription` — JWT des Mitglieds (Referenz: `docs/supabase-edge-save-push-subscription.ts`)
- `delete-push-subscription` — JWT des Mitglieds
- `send-push` — JWT + Vorstand-Check serverseitig; Referenz: [`supabase-edge-send-push.ts`](supabase-edge-send-push.ts)

## Web Push (Mitglieder)

Push-Aktivierung nur auf `/profil/` für eingeloggte Mitglieder (Magic Link).

| Datei | Aufgabe |
|-------|---------|
| `push/subscribe.js` | Permission, `pushManager.subscribe`, ruft `saveSubscription` |
| `push/save-subscription.js` | POST an Edge Function mit JWT + `member_id`, `device_name`, `user_agent` |
| `push/push-subscription-service.js` | Profil-Status: Browser-Endpoint + DB-Abfrage |
| `push/utils.js` | VAPID-Hilfe, `getDeviceName()` |
| `push/widget.js` | Anzeige letzter Push (unabhängig von Aktivierung) |
| `sw.js` | Service Worker |

Ablauf: Profil → „Push-Mitteilungen aktivieren“ → Upsert in `PushSubscriptions` nach `endpoint` (keine Duplikate).

Supabase-Setup: [`docs/supabase-push-members.sql`](supabase-push-members.sql) · Edge Function: [`docs/supabase-edge-save-push-subscription.ts`](supabase-edge-save-push-subscription.ts)

---

| Aufruf | Verhalten |
|--------|-----------|
| `/event.html?slug=xyz` | Termin-Detail (lädt aus Supabase) |
| `/kalender/xyz/` | CI-Redirect-Seite → `event.html?slug=xyz`; danach `replaceState` auf `/kalender/xyz` |
| `/news-detail.html?slug=…` | analog für News |
| `/news/…/` | CI-Redirect für OG |

## Konfiguration im Frontend

Zentrale Datei: `assets/js/core/site-config.js`

- Supabase-URL, Anon-Key, VAPID-Key
- `siteUrl`, `functionsUrl`
- `tables`, `storage`, `functions`, `siteStateKeys`
- Hilfsfunktion: `getFunctionUrl('sendPush')` usw.

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
feedback_modules (type, question, config)
        ↕ module_id
feedback_answers (member_id, answer, comment?)
```

**Frontend** (`assets/js/feedback/`):

```
feedback-types.js               → Validierung, poll option_id
feedback-public-registration.js → E-Mail/Name für externe Abstimmung
feedback-service.js             → Supabase load/upsert + RPC
feedback-render.js              → UI je type (yes_maybe, yes_no_comment, poll)
feedback-init.js                → initFeedbackModule({ entityType, entityId, container })
```

Detail-Seiten rufen nur `initFeedbackModule()` auf — kein Feedback-Code in `event-service` / `news-detail-service`.

**Admin:** `admin/js/feedback-module-form.js` in Termin-/News-Bearbeitung (optional, zusammen mit Speichern). Auswertung: `admin/feedback.html`, `admin/feedback_results.html?module_id=…` (CSV-Export).

Typen v1: `yes_maybe`, `yes_no_comment`, `poll` — Poll speichert `option_id` in `answer`, nicht Anzeige-Text.

## Wartung

- Tabellennamen in `site-config.js` und `scripts/generate-pages.js` (`TABLES`) synchron halten
- Kein Service-Role-Key im Frontend
