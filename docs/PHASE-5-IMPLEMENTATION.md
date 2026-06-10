# Phase 5 — Administration & Content Management (Implementierung)

**Status:** ✅ Umgesetzt (5a + 5b)  
**Stand:** Mai 2026

---

## Umgesetzt

### Thema 1 — Rollenbasierte Vorschau

| Feature | Details |
|---------|---------|
| Preview-State | `sessionStorage.adminPreviewRole` — `public` \| `Mitglied` |
| Resolver | `assets/js/core/preview-role.js` |
| Rollen-Helfer | `isVorstand()`, `isClubMember()` respektieren Vorschau; Admin nutzt `isRealVorstand()` |
| Public-Vorschau | Simuliert **nicht angemeldeten** Besucher (`getViewerMember()` → `null`) |
| Mitglied-Vorschau | Nur Sichtbarkeitsebene, kein Impersonation |
| Banner | Permanent, nicht wegklickbar — `assets/js/core/preview-banner.js` |
| Admin-UI | `/admin/preview.html` |

### Thema 2 — Administrierbare Inhalte

| Key | Zweck | Admin |
|-----|-------|-------|
| `site_banner` | Globale Hinweisleiste | `/admin/site-content.html` → Banner |
| `saison_mode` | Saison aktiv / Saisonpause | Tab Saisonmodus |
| `landing_hints` | Startseiten Quick Facts | Tab Landing-Hinweise |
| `site_overlay` | Modal für alle Besucher | Tab Overlay |

**Frontend:** `assets/js/site/site-content-state.js`, `site-content-render.js` (Layout)

**Saisonpause:** `body.site-saison-pause` schwächt CTA-Buttons optisch ab.

**Landing-Hinweise:** Ersetzen `#home-quick-facts` nur wenn DB-Einträge vorhanden — sonst Jekyll-Fallback.

**Overlay:** `<dialog>`, optional schließbar (Local Storage `siteOverlayDismissedAt`).

---

## Datenbank

**Migration:** `docs/supabase/supabase-site-content.sql`

- Erweitert SELECT-RLS für Keys: `site_banner`, `saison_mode`, `landing_hints`, `site_overlay`
- Keine Schema-Änderung an `site_state` (bestehende Key-Value-Tabelle)
- Write weiterhin nur Vorstand (bestehende Policy)

---

## Deployment

1. **Supabase SQL Editor:** `docs/supabase/supabase-site-content.sql` ausführen
2. **Frontend deployen** (Jekyll Build + statische Assets)
3. **Cache:** Admin-Seiten nutzen `admin_js_version` — in `_config.yml` auf `20260561` gesetzt

---

## Geänderte / neue Dateien

### Neu

| Datei | Zweck |
|-------|--------|
| `assets/js/core/preview-role.js` | Preview-State & Resolver |
| `assets/js/core/preview-banner.js` | Vorschau-Banner |
| `assets/js/site/site-content-state.js` | site_state Lesen/Schreiben |
| `assets/js/site/site-content-render.js` | Banner, Saison, Landing, Overlay |
| `admin/preview.html` | Rollen-Vorschau |
| `admin/js/preview-admin.js` | Preview-Admin-Logik |
| `admin/site-content.html` | Website-Hinweise |
| `admin/js/site-content-admin.js` | Admin-Formulare |
| `docs/supabase/supabase-site-content.sql` | RLS-Migration |
| `docs/SMOKE-TEST-PHASE-5.md` | Manuelle Tests |

### Geändert

| Datei | Änderung |
|-------|----------|
| `assets/js/member/member-service.js` | Preview in Rollen-Helfern |
| `assets/js/member/member-auth.js` | Nav mit `getViewerMember()` |
| `assets/js/member/member-nav.js` | Admin-Login mit `isRealVorstand()` |
| `assets/js/member/member-page.js` | Public-Preview → Gast-Profil |
| `admin/js/admin-auth.js` | `isRealVorstand()` für Admin-Gate |
| `assets/js/core/visibility.js` | `ensureContentViewerMember()` |
| `assets/js/home/home-page.js` | Viewer + Preview-Reload |
| `assets/js/news/news-service.js` | Viewer für News |
| `assets/js/calendar/termine-loader.js` | Viewer + Preview-Reload |
| `assets/js/feedback/feedback-init.js` | Viewer für Feedback-Anzeige |
| `assets/js/core/site-config.js` | siteStateKeys |
| `_layouts/default.html` | Scripts, Banner-Container |
| `_includes/admin-head.html` | preview-role.js |
| `admin/index.html` | Dashboard-Karten |
| `index.md` | `#home-quick-facts` |
| `assets/css/style.css` | Preview + Site-Content Styles |
| `assets/css/admin.css` | Admin Site-Content Tabs |
| `_config.yml` | `admin_js_version` |

---

## Bewusst nicht umgesetzt

- Hero-Editor, Vereinsseiten-Editor, CMS, Versionierung
- Server-seitige Impersonation
- Phase 4 (Zusagen/Serientermine)

---

## Bezug

- Konzept: `docs/PHASE-5-ADMIN-CMS-KONZEPT.md`
- Smoke-Tests: `docs/SMOKE-TEST-PHASE-5.md`
- RUNBOOK: `docs/supabase/RUNBOOK.md`
