# MTB Werdohl — Vereinswebsite

Öffentliche Website der **Radsportabteilung des TuS Jahn Werdohl e.V.**  
Live: [www.mtb-werdohl.de](https://www.mtb-werdohl.de)

Statische Site mit **Jekyll**, dynamische Inhalte (Termine, News, Galerien, Mitglieder) über **Supabase**.

---

## Tech-Stack

| Bereich | Technologie |
|---------|-------------|
| Frontend / Site | [Jekyll](https://jekyllrb.com/) (GitHub Pages) |
| Daten & Auth | [Supabase](https://supabase.com/) |
| JavaScript | Vanilla JS (kein Framework) |
| Kalender | FullCalendar (`assets/js/fullcalendar/`) |
| Markdown | [marked](https://marked.js.org/) |

---

## Repository-Struktur

```
├── _config.yml              # Jekyll + vorstand_js_version (Cache-Busting)
├── _data/                   # Navigation, Footer
├── _includes/               # HTML-Fragmente
├── _layouts/default.html    # Seiten-Layout
├── assets/
│   ├── css/                 # style.css, calendar.css, member-content-edit.css, vorstand.css
│   └── js/
│       ├── core/            # site-config, supabase, dates, visibility
│       ├── calendar/        # Kalender
│       ├── event/           # Termin-Detail
│       ├── news/            # News
│       ├── gallery/         # Galerie
│       ├── feedback/        # Abstimmungen
│       ├── member/          # Login, Profil, Verwaltung
│       ├── admin/           # Vorstand-Tools (Listen, Formulare, Medien-Picker)
│       ├── site/            # Saisonmodus (Banner + Overlay)
│       ├── aktivitaeten/    # Strava-Feed
│       └── push/            # Tröte-Widget
├── profil.md                # Mitgliederprofil + Vorstand-Tabs
├── mitglied-bearbeiten.md   # Mitglied anlegen/bearbeiten
├── protokoll.md             # Protokoll ansehen
├── protokoll-bearbeiten.md  # Protokoll bearbeiten
├── termin-bearbeiten.md     # Termin-Editor (Vorstand)
├── scripts/generate-pages.js
├── docs/                    # Architektur, Supabase RUNBOOK, Setup
└── .github/workflows/       # Deploy
```

---

## Öffentliche Seiten (Auswahl)

| URL | Datei | Inhalt |
|-----|--------|--------|
| `/` | `index.md` | Startseite |
| `/kalender/` | `kalender.md` | Kalender + Termin-Karten |
| `/event.html?slug=…` | `event.html` | Termin-Detail |
| `/news/` | `news.md` | News |
| `/galerie/` | `galerie.md` | Galerie |
| `/profil/` | `profil.md` | Profil, Verwaltung (Vorstand), E-Mail (Vorstand) |
| `/mitglied-bearbeiten/` | `mitglied-bearbeiten.md` | Mitglied pflegen |
| `/protokoll/` | `protokoll.md` | Protokoll ansehen |
| `/protokoll-bearbeiten/` | `protokoll-bearbeiten.md` | Protokoll pflegen |
| `/termin-bearbeiten/` | `termin-bearbeiten.md` | Termin anlegen/bearbeiten |

Navigation: `_data/navigation.yml`

---

## Vorstand / Verwaltung

Alles im **Frontend** unter `/profil/` und dedizierten Seiten — **kein** `/admin/`-Bereich mehr.

| Funktion | Wo |
|----------|-----|
| Mitglieder, Protokolle, Saisonmodus | `/profil/?tab=verwaltung` |
| E-Mail-Versand | `/profil/?tab=email` |
| Termine bearbeiten | `/termin-bearbeiten/` |
| Abstimmungen auswerten | Kalender, Event-Detail, Profil (inline) |

Auth: Magic Link in der Navigation. Nur `members.rolle = 'Vorstand'` sieht Verwaltung. Geschützte Seiten nutzen `requireVorstandSession()` (`assets/js/admin/auth-guard.js`).

SQL & RLS: [`docs/supabase/RUNBOOK.md`](docs/supabase/RUNBOOK.md)

---

## Supabase (Kurzüberblick)

| Name | Verwendung |
|------|------------|
| `Termine` | Kalender, Termin-Detail |
| `News` | News |
| `galleries` / `gallery_images` | Galerie |
| `site_state` | Saisonmodus |
| `members` | Mitglieder, Login |
| `feedback_modules` / `feedback_answers` | Abstimmungen |
| `media` / `avatars` | Storage |

Konfiguration: `assets/js/core/site-config.js`

Details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · [docs/supabase/SCHEMA.md](docs/supabase/SCHEMA.md)

---

## Lokale Entwicklung

```bash
bundle install
bundle exec jekyll serve
```

Site: `http://localhost:4000`

Optional OG-Seiten wie in CI:

```bash
set SUPABASE_URL=https://<projekt>.supabase.co
set SUPABASE_KEY=<anon-key>
set SITE_URL=https://www.mtb-werdohl.de
node scripts/generate-pages.js
bundle exec jekyll build
```

---

## Deploy

Branch **`main`** → GitHub Actions → `generate-pages.js` → `jekyll build` → GitHub Pages

Secrets: `SUPABASE_URL`, `SUPABASE_KEY`

---

## Code-Konventionen

- Öffentliche Seiten: `*-service.js` → `*-render.js` → `*-page.js`
- Supabase: `window.supabaseClient`, Tabellen in `site-config.js`
- Vorstand-JS: `assets/js/admin/` — Cache-Bust über `_config.yml` → `vorstand_js_version`

---

## Dokumentation

| Dokument | Inhalt |
|----------|--------|
| [docs/README.md](docs/README.md) | Doku-Index |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Datenfluss, JS-Muster |
| [docs/supabase/RUNBOOK.md](docs/supabase/RUNBOOK.md) | SQL-Reihenfolge |
| [docs/supabase-members-setup.md](docs/supabase-members-setup.md) | Magic Link, Mitglieder |
| [mitglieder-hilfe.md](mitglieder-hilfe.md) | Hilfe für Mitglieder |

---

## Sicherheit

- Nur **Anon-Key** im Frontend.
- **Service-Role-Key** niemals ins Repo oder in den Browser.
- Schreibzugriffe über Supabase Auth + RLS.
