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

`generate-pages.js` erzeugt pro News/Termin eine statische Seite unter `news/{slug}/` bzw. `kalender/{slug}/` mit Open-Graph-Tags und leitet per JavaScript auf die Detailseite weiter. Die Ordner stehen in `.gitignore` (lokal), werden im CI-Build aber via `_config.yml` → `include` in `_site` übernommen.

## Öffentliche Seiten — zwei Typen

### Typ A: Statische Markdown-Seiten

Beispiele: `about.md`, `training.md`, `kodex.md`

- Frontmatter mit `layout: default`
- Inhalt = Markdown, gerendert in die Sidebar-Layout-Seite

### Typ B: Client-seitig befüllte Seiten

| Seite | Container | Skript-Kette |
|-------|-----------|----------------|
| Kalender | `#calendar`, `#event-cards` | FullCalendar + `calendar/*` |
| Termin-Detail | `#event` (Feedback im Header) | `event-service` → `event-render` → `event-page` + `feedback/*` |
| News-Liste | `#news-cards` | `news-service` → `render-cards` → `news-page` |
| News-Detail | `#news` (Feedback im Header) | `news-service` → `news-detail-render` → `news-detail-page` + `feedback/*` |
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
- Mitglieder-Auth (`member-service`, `member-auth`, `preview-role`)
- Tröte (`member/member-change-summary.js`, `push/widget.js`)
- Website-Hinweise (`site/site-content-state.js`, `site/site-content-render.js`)
- Rollen-Vorschau-Banner (`core/preview-banner.js`) — nur sichtbar bei aktiver Admin-Vorschau
- Navigation (`member-nav.js`, `nav.js`)

**Kein** Service Worker, **kein** Web Push.

Optionale Frontmatter-Flags:

- `hide_title: true` — kein automatisches `<h1>` aus `page.title`
- `load_calendar_css` / `load_events_css` — CSS nur auf Kalender/Event-Seiten

## Mitglieder-Login (Magic Link)

Öffentliche Seiten nutzen `assets/js/member/`:

| Datei | Aufgabe |
|-------|---------|
| `member-service.js` | Abfrage Tabelle `members`, Rollen-Hilfen, Avatar-URLs |
| `member-auth.js` | Session, Magic Link, Logout, Validierung; Rückkehr-URL (`memberReturnUrl`, `?next=`) nach Login |
| `member-change-summary.js` | Popup „Seit deinem letzten Besuch“ (nur Mitglied/Vorstand) |
| `member-account.js` | Account-Löschung (Anonymisierung) via Edge Function |
| `member-nav.js` | Header-UI (Login / Profil) |
| `member-render.js` | Profilseite rendern (Mitglied + public), Avatar-Block |
| `member-page.js` | Profilseite initialisieren (Tabs Strava, Abstimmungen, Aktivitäten) |
| `preview-role.js` | Rollen-Vorschau für Vorstand (`getViewerMember`, `isRealVorstand`) |

Ablauf Vereinsmitglied: E-Mail in `members` → Magic Link → Session → E-Mail-Abgleich → Profil unter `/profil/`.

Ablauf extern (`public`): Registrierung im Feedback-Pop-up → Magic Link → DB-Eintrag → Abstimmung. Account-Löschung auf `/profil/` (Anonymisierung, siehe `anonymize-member-account`).

**Rollen** (`members.rolle`):

| Rolle | Profil | Verwaltung | Interne Inhalte (`sichtbarkeit=members`) |
|-------|--------|------------|------------------------------------------|
| `Mitglied` | ja | nein | ja |
| `Vorstand` | ja | ja | ja |
| `public` | ja (eingeschränkt) | nein | nein — nur öffentliche Abstimmungen |

Ausführliche Einrichtung: [`docs/supabase-members-setup.md`](supabase-members-setup.md) · SQL: [`docs/supabase/RUNBOOK.md`](supabase/RUNBOOK.md)

---

## Vorstand / Verwaltung

Kein separater `/admin/`-Bereich. Vorstand arbeitet im **Frontend**:

| Bereich | URL / Dateien |
|---------|----------------|
| Mitglieder, Protokolle, Saisonmodus | `/profil/?tab=verwaltung` — `member/member-verwaltung.js`, `admin/members-list.js`, `admin/protocols-list.js`, `admin/site-content-admin.js` |
| E-Mail | `/profil/?tab=email` — `member/member-email.js` |
| Mitglied bearbeiten | `/mitglied-bearbeiten/` — `admin/members-edit.js` |
| Protokolle | `/protokoll/`, `/protokoll-bearbeiten/` — `admin/protocol-*.js` |
| Termine | `/termin-bearbeiten/` — `admin/feedback-module-form.js`, Medien-Picker |
| Abstimmungen auswerten | Inline in Kalender, Event, Profil — `admin/feedback-results.js` |

Auth: Magic Link in der Navigation. Geschützte Seiten: `requireVorstandSession()` in `assets/js/admin/auth-guard.js` (`isRealVorstand()`).

Hilfsfunktionen: `escapeAdminHtml()` in `assets/js/admin/admin-utils.js` · Styles: `assets/css/vorstand.css` (Formulare, Protokoll-Ordner)

SQL für Rollen und RLS: [`docs/supabase/RUNBOOK.md`](supabase/RUNBOOK.md)

**Sichtbarkeit** (`sichtbarkeit` auf `News` und `Termine`):

| Wert | Wer sieht es |
|------|----------------|
| `public` | Alle (auch Gäste) |
| `members` | Eingeloggte Mitglieder + Vorstand |
| `draft` | Nur Vorstand |

SQL: [`docs/supabase/RUNBOOK.md`](supabase/RUNBOOK.md) · Hilfsfunktionen: `assets/js/core/visibility.js`

## Supabase — logische Tabellen

| Tabelle | Zweck |
|---------|--------|
| `Termine` | Touren, Training, Events (einmalig + wiederkehrend) |
| `News` | Vereinsnachrichten |
| `galleries` | Galerie-Metadaten |
| `gallery_images` | Bilder pro Galerie |
| `site_state` | Saisonmodus (`saison_mode`) |
| `members` | Vereinsmitglieder (`rolle`, Profil, Einwilligungen, `avatar_*`) |
| `strava_connections` / `activities` | Strava-OAuth, importierte Touren (`sport_category`) |
| `member_stats_*` / `club_stats_*` | Rankings und Vereinsziele (nur Rad) |
| `feedback_modules` | Universelles Feedback (polymorph: `entity_type` + `entity_id`, kein FK) |
| `feedback_answers` | Antworten pro Modul und Mitglied (`answer` = Code/`option_id`) |

**Storage-Buckets:** `media` (Bilder, GPX), `avatars` (Profilbilder, öffentlich lesbar)

Geplante Erweiterung Medien-Struktur: siehe RPCs in [`supabase-media-move.sql`](supabase-media-move.sql).

SQL Feedback: [`supabase-feedback.sql`](supabase-feedback.sql)

**Edge Functions** (URLs in `site-config.js` → `functionsUrl`):

- `send-admin-email` — Vorstand-E-Mails
- `anonymize-member-account` — Account-Löschung; **Verify JWT OFF**
- `strava-oauth-start`, `strava-oauth-callback`, `strava-sync` — Strava-Integration

## Vorstand-E-Mail

| Datei | Aufgabe |
|-------|---------|
| `member/member-email.js` | Formular, Vorschau, Versand |
| `member/member-email-log.js` | Versandprotokoll |

Edge Function: `send-admin-email` — Setup: [`supabase-admin-email-setup.md`](supabase-admin-email-setup.md)

## Tröte (Mitglieder-Zusammenfassung)

Die Tröte zeigt eingeloggten Vereinsmitgliedern und Vorständen automatisch **„Seit deinem letzten Besuch“** — Zähler für neue Termine, Internes, Aktivitäten und Abstimmungen. **Kein** manuelles Veröffentlichen mehr; Gelesen-Status liegt serverseitig in `members.last_change_summary_seen_at`.

| Datei | Aufgabe |
|-------|---------|
| `member/member-change-summary.js` | RPC `get_member_change_summary`, Anzeige-Logik |
| `push/widget.js` | Tröte-Widget im Layout |

SQL: RPCs in Phase-5-Migration (`get_member_change_summary`, `touch_member_change_summary_seen`)

---

## Saisonmodus

| Datei | Aufgabe |
|-------|---------|
| `site/site-content-state.js` | Lesen/Schreiben `site_state.saison_mode` |
| `site/site-content-render.js` | Banner + Overlay für Besucher |
| `admin/site-content-admin.js` | Formular in Profil → Verwaltung |

Bei aktivem Saisonmodus: Banner unter dem Header + schließbares Overlay. SQL: [`supabase/supabase-site-content.sql`](supabase/supabase-site-content.sql)

---

## Aktivitätenportal (Strava, Phase 2+3)

Öffentlich unter `/aktivitaeten/` — nur **Rad**-Aktivitäten mit Opt-in (`publish_feed`, `publish_rankings`). Profilbilder optional (`avatars`-Bucket, `avatar_url` in RPCs).

| Datei | Aufgabe |
|-------|---------|
| `aktivitaeten/aktivitaeten-service.js` | RPCs Feed, Rankings, Club-Stats |
| `aktivitaeten/aktivitaeten-render.js` | Feed-Karten mit Avatar/Initialen |
| `aktivitaeten/aktivitaeten-page.js` | Portal initialisieren |

SQL: [`supabase-strava-public.sql`](supabase-strava-public.sql), Phase 2/3 siehe RUNBOOK.

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
feedback-render.js              → UI je type; Gate nur bei public + public_voting
feedback-init.js                → initFeedbackModule({ entityType, entityId, entityVisibility, container })
```

Detail-Seiten: Abstimmung im **Seiten-Header** (Termin neben Datum, News neben Titel), nicht am Ende des Artikels. Nach Login: Kalender-Cache wird geleert (`termine-loader.js` → `member-session-ready`).

**Vorstand:** `assets/js/admin/feedback-module-form.js` in `/termin-bearbeiten/`. Auswertung inline (`assets/js/admin/feedback-results.js`). Mitglieder-E-Mail im Formular **nicht änderbar** (Login-Bindung).

Typen v1: `yes_maybe`, `yes_no_comment`, `poll` — Poll speichert `option_id` in `answer`, nicht Anzeige-Text.

SQL-Reihenfolge: [`docs/supabase/RUNBOOK.md`](supabase/RUNBOOK.md) (Feedback + public + email-verify + anonymize).

## Wartung

- Tabellennamen in `site-config.js` und `scripts/generate-pages.js` (`TABLES`) synchron halten
- Vorstand-JS-Version in `_config.yml` → `vorstand_js_version` (Cache-Busting)
- Kein Service-Role-Key im Frontend
- Go-live: [`GO-LIVE-CHECKLIST.md`](GO-LIVE-CHECKLIST.md)
