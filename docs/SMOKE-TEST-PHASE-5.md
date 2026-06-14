# Smoke-Test — Phase 5 (Administration & Content Management)

Manuelle Checkliste nach Deploy + SQL-Migration.

**Voraussetzung:** Als Vorstand angemeldet; `docs/supabase/supabase-site-content.sql` ausgeführt.

---

## P0 — SQL

- [ ] `supabase-site-content.sql` im Supabase SQL Editor ohne Fehler
- [ ] Anon kann `site_state` mit Keys `site_banner`, `saison_mode`, `landing_hints`, `site_overlay` lesen (Supabase Table Editor oder Browser-Netzwerk)

---

## Phase 5a — Rollenbasierte Vorschau

### Admin

- [ ] `/admin/preview.html` erreichbar (nur Vorstand)
- [ ] „Als Public ansehen“ → Redirect Startseite, Banner „Vorschau aktiv: Public (nicht angemeldet)“
- [ ] Header zeigt Gast-Login (nicht „Hallo …“ / Profil)
- [ ] Admin-Link im Header **ausgeblendet**
- [ ] Entwurfs-News/Termine **nicht** in Teaser/Listen sichtbar
- [ ] `/profil/` zeigt Gast-Login (nicht Vorstands-Profil)
- [ ] „Vorschau beenden“ → normale Vorstands-Ansicht
- [ ] „Als Mitglied ansehen“ → Banner „Vorschau aktiv: Mitglied“
- [ ] Mitglieder-Inhalte sichtbar, Entwürfe weiterhin **nicht**
- [ ] Eigene Profil-Daten weiterhin sichtbar (kein Impersonation)
- [ ] `/admin/` weiterhin erreichbar während Vorschau (echte Vorstand-Session)

---

## Phase 5a — Banner & Saisonmodus

### Admin `/admin/site-content.html`

- [ ] Tab Banner: Text speichern, aktiv, Stil Warnung
- [ ] Optional Link und Zeitraum (von/bis)

### Frontend

- [ ] Aktiver Banner global unter Preview-Banner sichtbar
- [ ] Link im Banner funktioniert
- [ ] Banner außerhalb Zeitraum **nicht** sichtbar
- [ ] Tab Saisonmodus: „Saisonpause“ + Hinweistext speichern
- [ ] Saison-Hinweis sichtbar
- [ ] `body.site-saison-pause`: Hero-CTA und Mitfahren-CTA optisch abgeschwächt
- [ ] Saisonmodus „Saison aktiv“ → keine Pause-Darstellung

---

## Phase 5b — Landing-Hinweise & Overlay

### Landing-Hinweise

- [ ] Admin: 1–3 kurze Hinweise speichern
- [ ] Startseite `#home-quick-facts` zeigt DB-Inhalte
- [ ] Alle Hinweise deaktivieren / leeren → statischer Jekyll-Text bleibt

### Overlay

- [ ] Admin: Overlay aktiv, Titel + Text
- [ ] Modal erscheint auf Startseite (alle Besucher)
- [ ] „Schließbar“: Schließen → erscheint nach Reload **nicht** erneut (Local Storage)
- [ ] Overlay deaktivieren → kein Modal
- [ ] Zeitraum: außerhalb Fenster kein Overlay

---

## Regression

- [ ] Tröte zeigt „Seit deinem letzten Besuch“ bei neuen Inhalten; bleibt zu ohne Änderungen
- [ ] News/Termine CRUD im Admin unverändert
- [ ] Mitglieder-Login Magic Link unverändert
- [ ] Keine Console-Errors auf Startseite, `/profil/`, `/admin/`

---

## Rollback

1. Frontend auf vorherigen Stand deployen
2. SQL-Policies optional entfernen (site_state Keys bleiben harmlos in DB)
