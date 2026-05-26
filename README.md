# MTB Werdohl — Vereinswebsite

Öffentliche Website der **Radsportabteilung des TuS Jahn Werdohl e.V.**  
Live: [www.mtb-werdohl.de](https://www.mtb-werdohl.de)

Statische Site mit **Jekyll**, dynamische Inhalte (Termine, News, Galerien, Push) über **Supabase**.

---

## Tech-Stack

| Bereich | Technologie |
|---------|-------------|
| Frontend / Site | [Jekyll](https://jekyllrb.com/) (GitHub Pages) |
| Daten & Auth | [Supabase](https://supabase.com/) |
| JavaScript | Vanilla JS (kein Framework) |
| Kalender | FullCalendar (lokal unter `assets/js/fullcalendar/`) |
| Markdown (Inhalte) | [marked](https://marked.js.org/) |
| Lightbox | GLightbox |
| PWA / Push | Service Worker (`sw.js`), Web Push + VAPID |

---

## Repository-Struktur

```
├── _config.yml          # Jekyll-Konfiguration
├── _data/               # Navigation, Footer, Social-Links (YAML)
├── _includes/           # wiederverwendbare HTML-Fragmente (Sidebar, Admin-Head)
├── _layouts/            # Seiten-Layout (default.html)
├── admin/               # CMS-Oberfläche (Login, Termine, News, Galerie, Push)
│   └── js/              # Admin-Logik (termine-list, news-edit, …)
├── assets/
│   ├── css/             # Styles (global, Kalender, News, Admin, …)
│   └── js/
│       ├── core/        # site-config, supabase, dates, share, service-worker
│       ├── calendar/    # Kalender (loader, categories, FullCalendar)
│       ├── event/       # Termin-Detailseite
│       ├── news/        # News-Liste & Detail
│       ├── gallery/     # Galerie
│       └── push/        # Web-Push
├── *.md, *.html         # Öffentliche Seiten (Jekyll)
├── scripts/
│   └── generate-pages.js   # OG-Seiten für WhatsApp (CI)
├── .github/workflows/   # Deploy-Pipeline
├── sw.js, manifest.json # PWA
└── docs/
    └── ARCHITECTURE.md  # Datenfluss & Muster (technisch)
```

---

## Öffentliche Seiten (Auswahl)

| URL | Datei | Inhalt |
|-----|--------|--------|
| `/` | `index.md` | Startseite |
| `/kalender/` | `kalender.md` | Kalender + Termin-Karten |
| `/event.html?slug=…` | `event.html` | Termin-Detail |
| `/news/` | `news.md` | News-Übersicht |
| `/news-detail.html?slug=…` | `news-detail.html` | News-Detail |
| `/galerie/` | `galerie.md` | Galerie-Übersicht |
| `/galerie-detail.html?slug=…` | `galerie-detail.html` | Galerie-Detail |
| `/about`, `/training`, `/kodex`, … | jeweilige `.md` | Statische Infoseiten |
| `/app/` | `app.md` | PWA-Installationshinweise |
| `/admin/` | `admin/index.html` | Admin-Login & Dashboard |

Navigation: `_data/navigation.yml`

---

## Admin

Unter `/admin/` (nicht in der Hauptnavigation verlinkt; Footer-Link).

- **Termine** — Tabelle `Termine`, Bilder/GPX in Storage `media`
- **News** — Tabelle `News`
- **Galerien** — `galleries` + `gallery_images`
- **Push** — Edge Function `send-push`

Authentifizierung: Supabase E-Mail/Passwort. Geschützte Seiten nutzen `requireAdminSession()` aus `admin/js/auth-guard.js`.

---

## Supabase (Kurzüberblick)

| Name | Typ | Verwendung |
|------|-----|------------|
| `Termine` | Tabelle | Kalender, Termin-Detail |
| `News` | Tabelle | News-Liste & Detail |
| `galleries` | Tabelle | Galerie-Metadaten |
| `gallery_images` | Tabelle | Bilder pro Galerie |
| `PushSubscriptions` | Tabelle | Push-Empfänger |
| `site_state` | Tabelle | z. B. letzte Push-Meldung |
| `media` | Storage | Uploads (Bilder, GPX) |

Frontend-Konfiguration: `assets/js/core/site-config.js` (URL, Keys, Tabellennamen, Storage, Edge Functions). Anon-Key ist öffentlich — Schutz nur über **RLS** in Supabase.

Ausführlicher: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

---

## Lokale Entwicklung

### Voraussetzungen

- Ruby (z. B. 3.1) + Bundler
- Optional: Node.js (für `generate-pages.js`)

### Jekyll starten

```bash
bundle install
bundle exec jekyll serve
```

Site läuft typischerweise unter `http://localhost:4000`.

### OG-Seiten lokal erzeugen (optional)

Wie in der CI, mit Supabase-Zugang:

```bash
set SUPABASE_URL=https://<projekt>.supabase.co
set SUPABASE_KEY=<anon-oder-service-key-für-build>
set SITE_URL=https://www.mtb-werdohl.de
node scripts/generate-pages.js
bundle exec jekyll build
```

Secrets gehören in `.env` (nicht committen) — siehe `.gitignore`.

---

## Deploy

- Branch **`main`** → GitHub Actions (`.github/workflows/jekyll.yml`)
- Schritte: Gems installieren → `generate-pages.js` → `jekyll build` → GitHub Pages
- GitHub Secrets: `SUPABASE_URL`, `SUPABASE_KEY`
- Domain: `CNAME` → `www.mtb-werdohl.de`

---

## Externe / lokale Assets (nicht immer im Repo)

Diese Pfade werden referenziert und müssen für einen vollständigen lokalen Build vorhanden sein:

| Pfad | Zweck |
|------|--------|
| `assets/js/fullcalendar/` | FullCalendar-Bundle |
| `assets/js/glightbox/` | Lightbox CSS/JS |
| `assets/images/` | Logo, Favicon, Hero, PWA-Icons |

Fehlen sie lokal, funktionieren Kalender oder Bilder erst nach Ergänzen der Dateien.

---

## Code-Konventionen (kurz)

- **Termin** in der DB = Tabelle `Termine`, im Code oft `event` (Ordner `event/`)
- Öffentliche Seiten: `*-service.js` → `*-render.js` → `*-page.js` (News, Termin, Galerie)
- Supabase: `window.supabaseClient`, Tabellen/Storage in `assets/js/core/site-config.js`
- Datumsformat (lang): `assets/js/core/dates.js` — `formatDateLong()`
- Termin-spezifische Datumsanzeige: `assets/js/event/event-dates.js`, Kalender-Karten: `card-dates.js`

---

## Roadmap (intern)

- [x] Phase 1–2: Doku, `.gitignore`, toter Code
- [x] Phase 3: Kalender — eine gemeinsame Datenquelle (`termine-loader.js`, `categories.js`)
- [x] Phase 4: Admin-JavaScript aus HTML auslagern (`admin/js/`)
- [x] Phase 5: Einheitliches Seitenmuster (Galerie/News), gemeinsame Helfer
- [x] Phase 6: `site-config.js` zentral, `push/config.js` entfernt

---

## Sicherheit

- Nur der **Anon-Key** gehört ins Frontend (`site-config.js`).
- **Service-Role-Key** niemals ins Repository oder in den Browser.
- Schreibzugriffe im Admin über Supabase Auth + RLS absichern.

---

## Lizenz / Kontakt

Vereinsprojekt TuS Jahn Werdohl / MTB Werdohl.  
Technische Fragen: siehe `_config.yml` (`contact`) oder Vereinsverantwortliche.
