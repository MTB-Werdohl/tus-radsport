# MTB Werdohl — Vereinswebsite

Öffentliche Website der **Radsportabteilung des TuS Jahn Werdohl e.V.**  
Live: [www.mtb-werdohl.de](https://www.mtb-werdohl.de)

Statische Site mit **Jekyll**, dynamische Inhalte (Termine, News, Galerien, Tröte) über **Supabase**.

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
| Tröte | Persönliche Zusammenfassung neuer Inhalte (Mitglieder/Vorstand) |
| Strava / Aktivitäten | Feed, Rankings, Vereinsziele (`/aktivitaeten/`) |
| Website-Hinweise | Banner, Saisonmodus, Overlay (`site_state`) |

---

## Repository-Struktur

```
├── _config.yml          # Jekyll-Konfiguration
├── _data/               # Navigation, Footer, Social-Links (YAML)
├── _includes/           # wiederverwendbare HTML-Fragmente (Sidebar, Admin-Head)
├── _layouts/            # Seiten-Layout (default.html)
├── admin/               # CMS für Vorstand (Termine, News, Galerie, Mitglieder, Tröte)
│   └── js/              # Admin-Logik (termine-list, news-edit, …)
├── assets/
│   ├── css/             # Styles (global, Kalender, News, Admin, …)
│   └── js/
│       ├── core/        # site-config, supabase, dates, share
│       ├── calendar/    # Kalender (loader, categories, FullCalendar)
│       ├── event/       # Termin-Detailseite
│       ├── news/        # News-Liste & Detail
│       ├── gallery/     # Galerie
│       ├── feedback/    # Abstimmungen (Termin/News)
│       ├── member/      # Mitglieder-Login (Magic Link), Profil, Strava
│       ├── aktivitaeten/ # Öffentliches Aktivitätsportal
│       ├── site/        # Website-Hinweise (Banner, Saison, Overlay)
│       └── push/        # Tröte-Widget (widget.js)
├── mitglieder-hilfe.md  # Hilfe für Mitglieder (Login, Abstimmung, Profil)
├── *.md, *.html         # Öffentliche Seiten (Jekyll)
├── scripts/
│   └── generate-pages.js   # OG-Seiten für WhatsApp (CI)
├── .github/workflows/   # Deploy-Pipeline
└── docs/
    ├── README.md           # Doku-Index
    ├── ARCHITECTURE.md     # Datenfluss & Muster
    └── supabase/RUNBOOK.md # SQL-Reihenfolge, RLS-Matrix
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
| `/verein/` | `verein.md` + `_includes/verein/*` | Verein (Über uns, Ausfahrt, Kodex) |
| `/about`, `/ausfahrt`, `/kodex`, `/training` | Redirects | Weiterleitung auf `/verein/?tab=…` |
| `/profil/` | `profil.md` | Mitgliederprofil (Magic Link) — Hilfe: [`mitglieder-hilfe.md`](mitglieder-hilfe.md) · Setup: [`docs/supabase-members-setup.md`](docs/supabase-members-setup.md) |
| `/aktivitaeten/` | `aktivitaeten/` | Strava-Aktivitäten-Feed (optional, SQL: RUNBOOK) |
| `/admin/` | `admin/index.html` | Vorstand-Dashboard (Magic Link in Navbar) |

Navigation: `_data/navigation.yml`

---

## Admin

Unter `/admin/` (nicht in der Hauptnavigation verlinkt; Footer-Link).

- **Termine** — Tabelle `Termine`, Bilder/GPX in Storage `media`; optional Feedback-Modul
- **News** — Tabelle `News` (`sichtbarkeit`); optional Feedback-Modul
- **Feedback** — Auswertung, CSV; Löschung über DB-Kaskade beim Entity-Löschen
- **Galerien** — `galleries` + `gallery_images`
- **Mitglieder** — `members` (CRUD, Rolle Vorstand/Mitglied)
- **Tröte** — automatische Zusammenfassung neuer Inhalte für eingeloggte Mitglieder/Vorstand
- **Website-Hinweise** — Banner, Saisonmodus, Landing, Overlay (`/admin/site-content.html`)
- **Rollen-Vorschau** — Website als Public/Mitglied betrachten (`/admin/preview.html`)
- **E-Mail** — Edge Function `send-admin-email` (`/admin/email.html`)

SQL-Reihenfolge und Policies: [`docs/supabase/RUNBOOK.md`](docs/supabase/RUNBOOK.md)

**Mitglieder löschen schlägt fehl (Push-FK):** [`supabase-drop-web-push.sql`](docs/supabase-drop-web-push.sql) im SQL Editor ausführen — entfernt Legacy-Tabellen `PushMessages` / `PushSubscriptions` und aktualisiert `anonymize_member`.

Authentifizierung: Magic Link in der Website-Navigation. Nur `members.rolle = 'Vorstand'` erhält Zugriff auf `/admin/`. Ohne Vorstand-Session leitet `/admin/` still nach `/` um (keine separate Login-Seite).

Rollen & Sichtbarkeit: [`docs/supabase-vorstand-roles.sql`](docs/supabase-vorstand-roles.sql) · [`docs/supabase-content-visibility.sql`](docs/supabase-content-visibility.sql) · [`docs/supabase-members-admin.sql`](docs/supabase-members-admin.sql)

---

## Supabase (Kurzüberblick)

| Name | Typ | Verwendung |
|------|-----|------------|
| `Termine` | Tabelle | Kalender, Termin-Detail |
| `News` | Tabelle | News-Liste & Detail |
| `galleries` | Tabelle | Galerie-Metadaten |
| `gallery_images` | Tabelle | Bilder pro Galerie |
| `site_state` | Tabelle | Website-Hinweise (Key-Value JSONB) |
| `members` | Tabelle | Vereinsmitglieder inkl. `avatar_*` (Profilbilder) |
| `activities` / `strava_connections` | Tabellen | Strava-Import (optional) |
| `feedback_modules` / `feedback_answers` | Tabellen | Abstimmungen an Terminen/News |
| `media` / `avatars` | Storage | Vereinsmedien / Profilbilder |

Frontend-Konfiguration: `assets/js/core/site-config.js` (URL, Keys, Tabellennamen, Storage, Edge Functions). Anon-Key ist öffentlich — Schutz nur über **RLS** in Supabase.

Ausführlicher: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · Go-live: [docs/GO-LIVE-CHECKLIST.md](docs/GO-LIVE-CHECKLIST.md)

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
| `assets/images/` | Logo, Favicon, Hero |

Fehlen sie lokal, funktionieren Kalender oder Bilder erst nach Ergänzen der Dateien.

---

## Code-Konventionen (kurz)

- **Termin** in der DB = Tabelle `Termine`, im Code oft `event` (Ordner `event/`)
- Öffentliche Seiten: `*-service.js` → `*-render.js` → `*-page.js` (News, Termin, Galerie)
- Supabase: `window.supabaseClient`, Tabellen/Storage in `assets/js/core/site-config.js`
- Datumsformat (lang): `assets/js/core/dates.js` — `formatDateLong()`
- Termin-spezifische Datumsanzeige: `assets/js/event/event-dates.js`, Kalender-Karten: `card-dates.js`

---

## Projektstand (Phasen)

| Phase | Thema | Doku |
|-------|--------|------|
| 0–1 | Public-Registrierung, Quick-Wins | `docs/PUBLIC-REGISTRATION.md`, `PHASE-1-CHANGELOG.md` |
| 2 | Radfokus (Strava) | `PHASE-2-IMPLEMENTATION.md` |
| 3 | Profilbilder | `PHASE-3-IMPLEMENTATION.md` |
| 4 | Zusagen / Serientermine | ⏸ `PHASE-4-ZUSAGEN-SERIENTERMINE-KONZEPT.md` (nicht freigegeben) |
| 5 | Admin-Vorschau, Website-Hinweise | `PHASE-5-IMPLEMENTATION.md` |

Smoke-Tests: `docs/SMOKE-TEST-PHASE-2-3.md`, `docs/SMOKE-TEST-PHASE-5.md`

---

## Sicherheit

- Nur der **Anon-Key** gehört ins Frontend (`site-config.js`).
- **Service-Role-Key** niemals ins Repository oder in den Browser.
- Schreibzugriffe im Admin über Supabase Auth + RLS absichern.

---

## Lizenz / Kontakt

Vereinsprojekt TuS Jahn Werdohl / MTB Werdohl.  
Technische Fragen: siehe `_config.yml` (`contact`) oder Vereinsverantwortliche.
