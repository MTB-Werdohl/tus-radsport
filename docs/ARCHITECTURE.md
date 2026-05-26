# Architektur

Überblick, wie die Teile des Projekts zusammenspielen. Für Setup und Ordnerstruktur siehe [README](../README.md).

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
| Termin-Detail | `#event` | `event-service` → `event-render` → `event-page` |
| News-Liste | `#news-cards` | `news-service` → `render-cards` → `news-page` |
| News-Detail | `#news` | `news-detail-service` → `news-detail-render` → `news-detail-page` |
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

## Admin

- Eigene HTML-Seiten unter `admin/` mit Jekyll-Frontmatter `layout: null`
- Gemeinsamer Kopf: `_includes/admin-head.html`
- Session-Prüfung: `admin/js/auth-guard.js` → `requireAdminSession(callback)`
- Admin-Logik liegt in `admin/js/` (Termine, News, Push, Galerie)

## Supabase — logische Tabellen

| Tabelle | Zweck |
|---------|--------|
| `Termine` | Touren, Training, Events (einmalig + wiederkehrend) |
| `News` | Vereinsnachrichten |
| `galleries` | Galerie-Metadaten |
| `gallery_images` | Bilder pro Galerie |
| `PushSubscriptions` | Web-Push-Endpunkte |
| `site_state` | z. B. letzte Push-Nachricht (`last_push`) |

**Storage-Bucket:** `media` (Bilder, GPX)

**Edge Functions** (URLs in `site-config.js` → `functionsUrl`):

- `save-push-subscription`
- `delete-push-subscription`
- `send-push`

## URLs & Weiterleitungen

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

## Wartung

- Tabellennamen in `site-config.js` und `scripts/generate-pages.js` (`TABLES`) synchron halten
- Kein Service-Role-Key im Frontend
