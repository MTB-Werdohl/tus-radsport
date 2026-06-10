# Phase 5 — Administration & Content Management (Konzept)

**Status:** ✅ **Freigegeben & umgesetzt** (Mai 2026)  
**Implementierung:** `docs/PHASE-5-IMPLEMENTATION.md`, `docs/SMOKE-TEST-PHASE-5.md`  
**Stand:** Mai 2026  
**Bezug:** `docs/ARCHITECTURE.md`, `docs/supabase/SCHEMA.md`, `admin/index.html`, `assets/js/core/visibility.js`, `assets/js/push/state.js`

> **Scope:** Zwei Themen — (1) rollenbasierte Vorschau für Vorstand, (2) administrierbare Vereinsinhalte ohne Code-Deployment.  
> Kein vollständiges CMS, kein Seitenbaukasten, keine DB-Migrationen in dieser Phase.

---

# Thema 1 — Rollenbasierte Vorschau

## 1.1 Ist-Zustand

### Rollenmodell

Rollen liegen ausschließlich in `members.rolle` (Text, keine Enum-Tabelle). Es gibt **keinen Admin-Rolle-Wert** — Vorstand = Admin.

| Wert | Bedeutung | Quelle |
|------|-----------|--------|
| `Mitglied` | Vereinsmitglied, interner Bereich | `member-service.js` → `isClubMember()` |
| `Vorstand` | Wie Mitglied + `/admin/` + Draft-Sichtbarkeit | `isVorstand()` |
| `public` | Externer Teilnehmer (Feedback-Registrierung) | `isPublicParticipant()` |
| *(nicht angemeldet)* | Nur `sichtbarkeit = 'public'` | RLS + Client-Gates |

JWT enthält **keine Rolle** — jede Prüfung läuft über DB-Lookup (`fetchMemberByEmail`, SQL `is_vorstand()` / `is_member()`).

### Guards & Sichtbarkeit (Schichten)

| Schicht | Mechanismus | Dateien |
|---------|-------------|---------|
| Admin-Zugang | `requireAdminSession()` → `ensureVorstandSession()` → Redirect zu `/?login=admin` | `admin/js/auth-guard.js`, `admin/js/admin-auth.js` |
| Mitglied-Auth | Magic Link, `ensureMemberSession()`, `currentMember` | `assets/js/member/member-auth.js` |
| Session-Trennung | **Keine** — eine Supabase-Session für Profil und Admin | gleiche Auth |
| DB RLS | `sichtbarkeit` auf `News`/`Termine`: `public` / `members` / `draft` | `docs/supabase-content-visibility.sql` |
| Client-Sichtbarkeit | `canViewerAccessVisibility()`, `viewerIncludesDrafts()` | `content-access.js`, `visibility.js` |
| News-Fetch | `fetchNewsForViewer(member)` filtert Drafts clientseitig | `news-service.js` |
| Navigation | Admin-Link nur bei `isVorstand()` | `member-nav.js` |
| Kalender-Karten | Sichtbarkeits-Badge für Vorstand | `visibility.js` |

**Konsequenz heute:** Vorstand sieht in der DB immer alles, was RLS für Vorstand freigibt (inkl. Drafts). Um die Public-/Mitglied-Perspektive zu prüfen, braucht man einen zweiten Account, Logout oder zweiten Browser.

### Render-Logik (relevante Hook-Punkte)

| Funktion | Wirkung bei Override |
|----------|---------------------|
| `isVorstand(member)` | Admin-Link, Push-Admin, Draft-Zugriff |
| `isClubMember(member)` | Mitglieder-Inhalte, Feedback-Gates |
| `isPublicParticipant(member)` | Public-Profil-Ansicht |
| `viewerIncludesDrafts(member)` | Draft in Listen/Queries |
| `canViewerAccessVisibility(vis, member)` | Detailseiten-Zugang |
| `fetchNewsForViewer(member)` | News-Teaser/Listen |

---

## 1.2 Architekturvorschlag

### Empfohlene Variante: **Client-seitige Vorschau (Preview Mode)**

Ein Vorstand aktiviert temporär eine **Simulations-Rolle** (`public` | `Mitglied` | `Vorstand`). Die echte Session und DB-Berechtigungen bleiben unverändert.

```
┌─────────────────────────────────────────────────────────┐
│  Vorstand (echte Session, rolle = Vorstand)             │
│  sessionStorage: previewRole = 'Mitglied' | null        │
└──────────────────────────┬──────────────────────────────┘
                           │
         ┌─────────────────▼─────────────────┐
         │  previewRoleResolver()             │
         │  (zentral in member-service.js)    │
         └─────────────────┬─────────────────┘
                           │
    ┌──────────────────────┼──────────────────────┐
    ▼                      ▼                      ▼
 isVorstand()      isClubMember()     viewerIncludesDrafts()
 canViewerAccess…   updateMemberNav()  fetchNewsForViewer()
```

**Komponenten:**

1. **Preview-State** — `sessionStorage` (tab-lokal, kein Server): Key z. B. `adminPreviewRole` mit Werten `null` | `public` | `Mitglied` | `Vorstand`.
2. **Resolver** — `getEffectiveViewerRole(member)` liest Preview-State; nur wenn `isVorstand(member)` und Preview aktiv.
3. **Wrapper** — bestehende Rollen-Helfer rufen intern den Resolver auf (nicht überall manuell patchen).
4. **UI-Banner** — fixer Hinweis: „Vorschau als: Mitglied — [Beenden]“ (nicht wegklickbar, damit keine Verwechslung).
5. **Admin-Steuerung** — Dropdown in Admin-Header (`admin-escape-nav.html`) oder eigene Mini-Seite `/admin/preview.html`; „Vorschau starten“ öffnet `/` oder gewählte URL in gleichem Tab.
6. **Admin-Schutz** — während Preview aktiv: `/admin/*` weiterhin nur mit echtem Vorstand (Preview darf Admin **nicht** simulieren — Vorstand ist die Steuer-Rolle).

### Abgelehnte / spätere Varianten

| Variante | Bewertung |
|----------|-----------|
| **A — Nur URL-Parameter** (`?preview=Mitglied`) | Zu leicht vergessbar/teilbar; als Ergänzung zu sessionStorage ok |
| **B — Zweiter Browser / Account** | Kein Feature — bleibt Workaround |
| **C — Server-RPC mit Impersonation** | Korrekteste DB-Sicht, aber hoher Aufwand, Security-Review, neue RPCs pro Inhaltstyp — **nicht für v1** |
| **D — Supabase RLS-Override** | Nicht möglich ohne echte Rollenänderung oder Service-Role — **ausgeschlossen** |

### Wichtige Einschränkung (bewusst kommunizieren)

Preview ist eine **UI-/Client-Simulation**. Supabase-Queries laufen weiter als authentifizierter Vorstand — RLS liefert ggf. **mehr** Zeilen als die simulierte Rolle sehen dürfte. Die Client-Filter (`fetchNewsForViewer`, `canViewerAccessVisibility`) müssen deshalb konsequent greifen; Netzwerk-Tab kann weiterhin Draft-Daten zeigen.

Für v1 akzeptabel: Ziel ist „Wie wirkt die Seite für Besucher?“, nicht Penetrationstest.

---

## 1.3 Datenmodellvorschlag

**Keine Datenbankänderungen.**

| Speicher | Inhalt | Lebensdauer |
|----------|--------|-------------|
| `sessionStorage.adminPreviewRole` | `public` \| `Mitglied` \| `Vorstand` \| *(leer)* | Tab-Session |
| Optional `sessionStorage.adminPreviewReturnUrl` | Admin-URL vor Vorschau | Tab-Session |

Optional später: Audit-Log in `site_state` oder eigene Tabelle — **nicht für v1** empfohlen.

---

## 1.4 UI-Vorschlag

| Element | Ort | Verhalten |
|---------|-----|-----------|
| Rollen-Auswahl | Admin-Header oder Dashboard-Karte „Als Rolle ansehen“ | 3 Buttons: Public / Mitglied / Vorstand (Normal) |
| Preview-Banner | `default.html` — oberhalb Header, nur wenn Preview aktiv | Rolle + Link „Vorschau beenden“ |
| Admin-Escape | Bestehendes `admin-escape-nav.html` | „Zur Website“ startet Preview optional mit gewählter Rolle |
| Kein Einfluss auf Login-Panel | Magic Link bleibt unverändert | Preview ≠ Impersonation |

---

## 1.5 Aufwandsschätzung

| Paket | Inhalt | Aufwand |
|-------|--------|---------|
| **MVP** | Resolver + 5–6 Wrapper, Banner, Admin-Dropdown, Doku | **1–2 PT** |
| **+ Abdeckung** | Kalender, Termin-Detail, Feedback-Gates, Aktivitäten-Feed prüfen/anpassen | **+1 PT** |
| **+ Harte Server-Sicht** | RPC-Wrapper pro Inhaltstyp (Variante C) | **5+ PT** — separater Backlog |

---

## 1.6 Risiken

| Risiko | Schwere | Mitigation |
|--------|---------|------------|
| Vorstand hält Preview für echte Sicht | Mittel | Permanentes Banner, Default „Vorschau beenden“ beim Admin-Besuch |
| RLS liefert mehr als simuliert | Mittel | In Doku + Banner-Hinweis; Client-Filter testen |
| Preview-State in URL geleakt | Gering | Kein URL-only; sessionStorage |
| Vergessene Hook-Stelle | Mittel | Zentraler Resolver statt Einzel-Patches; Smoke-Test-Checkliste |
| Admin während Preview gesperrt | Gering | Bewusst so — Admin bleibt echte Vorstand-Session |

---

## 1.7 Offene Fragen

1. Soll **Public-Vorschau** als „nicht angemeldet“ simuliert werden, obwohl Vorstand eingeloggt ist? (Empfehlung: **ja** — `getCurrentMember()` für Sichtbarkeit ignorieren, Session aber behalten.)
2. Soll Preview **mitgliederspezifische** Inhalte (eigene Abstimmungen, Profil) zeigen oder nur **öffentliche + members-Sichtbarkeit**? (Empfehlung: v1 nur **Sichtbarkeits-Ebene**, nicht fremdes Mitglied-Profil.)
3. Soll ein **Deep-Link** (`?preview_role=Mitglied`) für Support dokumentiert werden?
4. Brauchen **zwei Vorstände** unabhängige Preview-States? (sessionStorage = ja, pro Tab.)

---

## 1.8 Empfehlung

**Variante Client-Preview (Abschnitt 1.2) als v1 umsetzen**, sobald freigegeben:

- Kein Logout, kein Account-Wechsel, keine DB-Änderung
- Wiederverwendung bestehender Rollen-Helfer via zentralem Resolver
- Klare UX-Grenze: Simulation, kein Security-Tool
- Server-seitige Impersonation erst bei konkretem Bedarf (Compliance, externe Prüfung)

---

# Thema 2 — Administrierbare Inhalte

## 2.1 Ist-Zustand

### Bereits dynamisch (Supabase, admin-editierbar)

| Inhalt | Speicher | Admin-UI |
|--------|----------|----------|
| News, Termine, Galerien | Eigene Tabellen + `sichtbarkeit` | `/admin/news.html`, `termine.html`, … |
| Tröte (Startseiten-Mitteilung) | `site_state.last_push` | `/admin/push.html` |
| Mitglieder, Protokolle, Feedback-Auswertung | diverse Tabellen | Admin-Verwaltung |

**Muster Tröte:** `getLastPush()` / `saveLastPush()` in `assets/js/push/state.js` — Upsert auf `site_state` by key; Widget in `assets/js/push/widget.js` auf allen Seiten via Layout.

### Hardcoded (Code-Deploy nötig)

| Bereich | Beispiel | Datei |
|---------|----------|-------|
| Hero Startseite | Headline, Lead, WhatsApp-CTA | `index.md` |
| Quick Facts | „After-Work Tour · Dienstag 18:00 …“ | `index.md` |
| Verein / Ausfahrt | Jahresprogramm, Trainingszeiten, WhatsApp | `_includes/verein/*.html` |
| Layout-Hinweise | Login-Panel-Text | `_layouts/default.html` |
| Mitfahren-Hero | Statischer Hinweistext | `mitfahren.md` |

**Saisonpause / Banner / Overlay:** Derzeit **nicht** als Feature vorhanden. CSS-Klassen wie `home-hero-overlay` sind **Design**, kein admin-gesteuerter Modus.

### Admin-Bereich (Wiederverwendbare Patterns)

| Pattern | Referenz | Eignung |
|---------|----------|---------|
| Einfaches Formular → Upsert | `admin/push.html` + `push-admin.js` | Banner, Saisonmodus, Landing-Hinweise |
| CRUD Liste + Edit | `termine-list.js` / `termine-edit.js` | Overkill für Key-Value |
| `requireAdminSession()` | `auth-guard.js` | Alle neuen Admin-Seiten |
| `initAdminUnsavedGuard()` | `admin-utils.js` | Formulare mit Dirty-State |
| Dashboard-Karte | `admin/index.html` | Navigation zu neuen Tools |

### Architektur-Grundprinzip

Jekyll liefert **statische Hülle**; dynamische Inhalte kommen per Browser-JS nach `DOMContentLoaded` (`docs/ARCHITECTURE.md`). Neue `site_state`-Keys benötigen **keinen Jekyll-Rebuild**, sobald das lesende JS deployed ist.

---

## 2.2 Architekturvorschlag

### Kernidee: **`site_state` erweitern** (Key-Value JSONB)

Bestehende Tabelle `site_state` (`key` text PK, `value` jsonb) — heute nur `last_push`. RLS: Vorstand schreibt, Lesen derzeit öffentlich nur für `last_push` (`docs/supabase/RUNBOOK.md`).

```
┌──────────────┐     upsert      ┌─────────────┐
│ Admin-Form   │ ──────────────► │ site_state  │
│ (Vorstand)   │                 │ key + value │
└──────────────┘                 └──────┬──────┘
                                        │ select (RLS)
                                        ▼
                              ┌─────────────────────┐
                              │ site-content.js     │
                              │ (Layout, alle Seiten)│
                              └──────────┬──────────┘
                                         ▼
                              Banner / Overlay / Hinweise
                              (DOM inject oder CSS class)
```

**Neues Frontend-Modul** (Vorschlag): `assets/js/site/site-content.js` + `assets/js/site/site-content-state.js` — analog `push/state.js`, aber für mehrere Keys in **einem** Request (`in('key', [...])`).

**Kein CMS:** flache JSON-Objekte pro Key, Plain-Text-Felder, Datumsfelder, Boolean — kein Rich-Text-Editor, kein Block-System.

### Inhaltstypen (v1-Scope)

| Key | Zweck | Felder (Vorschlag) |
|-----|-------|-------------------|
| `site_banner` | Schmale Hinweisleiste unter Header | `active`, `text`, `url?`, `style?` (`info`/`warning`), `starts_at?`, `ends_at?` |
| `site_overlay` | Vollseiten- oder Modal-Hinweis (selten) | `active`, `title`, `text`, `dismissible`, `starts_at?`, `ends_at?` |
| `saison_mode` | Saison aktiv / Pause | `mode` (`active`/`pause`), `message`, `starts_at?`, `ends_at?` |
| `landing_hints` | Startseiten-Zusatzinfos (Quick Facts) | `items[]` mit `{ text, url?, active }` max. 3–5 Einträge |

**Abgrenzung Tröte:** `last_push` = einmalige Mitteilung mit Gelesen-Status (Widget). Banner = zeitgesteuerter Hinweis ohne Gelesen-Logik. Saisonmodus = steuert optional Banner **und** CSS-Klasse auf `<body>` (z. B. gedämpfte CTAs).

**Nicht in v1:** Hero-Headline, WhatsApp-Nummer, komplette `_includes/verein`-Texte — zu viel DOM-Eingriff; optional Phase 5b.

---

## 2.3 Datenmodellvorschlag

### Tabelle (bestehend, erweitert in Nutzung)

**`site_state`** — keine Schema-Änderung, neue Keys:

```json
// site_banner
{
  "active": true,
  "text": "Saisonpause bis 15. März — kein Dienstags-Training.",
  "url": "/training/",
  "style": "warning",
  "starts_at": "2026-12-01T00:00:00Z",
  "ends_at": "2026-03-15T23:59:59Z"
}

// saison_mode
{
  "mode": "pause",
  "message": "Wir starten wieder am 18. März.",
  "starts_at": "2026-12-01T00:00:00Z",
  "ends_at": null
}

// site_overlay
{
  "active": false,
  "title": "Wichtiger Hinweis",
  "text": "…",
  "dismissible": true,
  "starts_at": null,
  "ends_at": null
}

// landing_hints
{
  "items": [
    { "text": "After-Work Tour · Dienstag 18:00 · Brüninghausplatz", "url": "/training/", "active": true }
  ]
}
```

### RLS-Anpassungen (bei Implementierung)

| Policy | Heute | Vorschlag |
|--------|-------|-----------|
| Public SELECT | nur `key = 'last_push'` | Erweitern auf Keys mit `active=true` und öffentlichem Zweck (`site_banner`, `saison_mode`, `landing_hints`) |
| Overlay | — | Optional nur `authenticated` oder nach Cookie-Dismiss — Product-Entscheidung |
| Write | Vorstand | unverändert |

Alternative: **eine RPC** `get_public_site_content()` filtert Keys serverseitig — weniger RLS-Komplexität, eine Roundtrip.

### Validierung

- Edge Function **nicht nötig** für v1 — Vorstand-only Write via RLS reicht (wie Tröte).
- JSON-Schema-Validierung optional in SQL Trigger — **nice-to-have**, nicht Pflicht.

---

## 2.4 UI-Vorschlag

Neuer Admin-Bereich **„Website-Hinweise“** (Dashboard-Sektion Content):

| Seite | Inhalt |
|-------|--------|
| `/admin/site-content.html` | Tabbed Formular: Banner \| Overlay \| Saison \| Landing-Hinweise |
| Vorschau-Link | „Als Public ansehen“ → koppelt an Thema 1 Preview |

**Formular-Felder (einfach):**

- Checkbox **Aktiv**
- Textarea **Text** (Plain, max. ~500 Zeichen)
- Optional URL, Datumsfelder (von/bis), Select Stil
- Speichern → Upsert + Toast; `initAdminUnsavedGuard()`

**Frontend-Darstellung:**

| Typ | Rendering |
|-----|-----------|
| Banner | `<div class="site-banner site-banner--warning">` unter Header |
| Overlay | `<dialog>` oder fixed div; Local Storage dismiss wenn `dismissible` |
| Saison | Banner + `document.body.classList.add('site-saison-pause')` für CSS |
| Landing hints | `#home-quick-facts` per JS befüllen (Fallback: statischer Jekyll-Inhalt wenn leer) |

---

## 2.5 Aufwandsschätzung

| Paket | Inhalt | Aufwand |
|-------|--------|---------|
| **Infrastruktur** | `site-content-state.js`, Reader im Layout, RLS/RPC | **1 PT** |
| **Admin-UI** | Eine Seite, 4 Tabs, Upsert | **1–1,5 PT** |
| **Frontend-Widgets** | Banner + Saison-CSS + Landing-Hints | **1 PT** |
| **Overlay + Dismiss** | Modal, Local Storage | **+0,5 PT** |
| **Doku + Smoke-Tests** | RUNBOOK, Datenschutz-Hinweis | **0,5 PT** |
| **Gesamt v1** | | **~3–4 PT** |

Hero/Verein-Texte dynamisch: **+2–3 PT** (DOM-Ersatz, Fallback-Konzept) — separat.

---

## 2.6 Risiken

| Risiko | Schwere | Mitigation |
|--------|---------|------------|
| XSS durch Admin-Text | Hoch | Nur Plain-Text, `escapeHtml` beim Rendern (wie Tröte) |
| RLS zu offen | Mittel | Key-Whitelist in Policy oder RPC |
| Leerer Zustand / Fallback | Gering | Jekyll-Static bleibt Fallback für Landing |
| Zeitzonen Starts/Ends | Mittel | UTC in DB, Anzeige lokal; klare UI-Labels |
| Overlay nervt Besucher | Mittel | `dismissible`, Zeitraum, selten einsetzen |
| Verwechslung Tröte vs Banner | Gering | Getrennte Admin-Einträge + Doku |

---

## 2.7 Offene Fragen

1. **Overlay** für alle Besucher oder nur Mitglieder?
2. Soll **Saisonpause** Termine/Kalender optisch markieren oder nur Hinweis?
3. **Landing-Hints:** Jekyll-Static entfernen oder als Fallback behalten?
4. Max. **Länge / Anzahl** der Hinweise (Spam-Schutz)?
5. Brauchen Banner/Overlay **Versionierung / Historie**? (Empfehlung v1: **nein** — nur aktueller Stand.)
6. Datenschutz: neue Keys in **Datenschutzerklärung** ergänzen? (wie Tröte, Abschnitt 13)

---

## 2.8 Empfehlung

**`site_state`-Erweiterung + ein Admin-Formular + ein Layout-Reader** — bewusst minimal:

- Wiederverwendung des bewährten Tröte-Musters (`push/state.js`, `push-admin.js`)
- Kein neues CMS, keine neue Tabelle für v1
- Klare Trennung: Tröte (Mitteilung + Gelesen) vs Banner (zeitgesteuert) vs Saisonmodus
- RLS über Key-Whitelist oder RPC `get_public_site_content()`
- Hero/Verein-Fließtext **nicht** in v1 — zu hoher DOM-Aufwand; stattdessen Landing-Hints für die wichtigsten wechselnden Zeilen

---

# Gesamtübersicht Phase 5

| Thema | DB-Änderung v1 | Aufwand | Priorität |
|-------|----------------|---------|-----------|
| Rollenbasierte Vorschau | Keine | 1–3 PT | Hoch — entblockt Admin-QA |
| Administrierbare Inhalte | RLS/RPC nur (kein Schema) | 3–4 PT | Hoch — reduziert Deploy-Zyklen |

**Empfohlene Reihenfolge:** Zuerst **Thema 1 (Preview)** — geringerer Aufwand, sofort nutzbar zum Testen von Thema 2. Dann **Thema 2 (site_state)**.

**Freigabe erforderlich vor Implementierung:**

- [ ] Preview-Verhalten für eingeloggten Vorstand als „Public“
- [ ] Scope Landing-Hints vs vollständiger Hero
- [ ] Overlay-Zielgruppe (alle vs Mitglieder)
- [ ] RLS-Strategie (Policy-Erweiterung vs RPC)

---

## Referenzen (Code)

| Datei | Relevanz |
|-------|----------|
| `assets/js/member/member-service.js` | Rollen-Helfer, Preview-Hook |
| `assets/js/core/visibility.js` | `CONTENT_VISIBILITY`, Draft-Sicht |
| `assets/js/core/content-access.js` | Detailseiten-Gate |
| `admin/js/auth-guard.js` | Admin-Schutz |
| `assets/js/push/state.js` | `site_state`-Muster |
| `admin/js/push-admin.js` | Einfaches Admin-Formular |
| `docs/supabase/RUNBOOK.md` | RLS-Reihenfolge für `site_state` |
