# Go-live-Checkliste — MTB Werdohl (Gesamt)

**Stand:** Mai 2026  
**Zweck:** Einmalige Übersicht für Neuinstallation, Upgrade oder Abschluss-Prüfung nach den Phasen 0–5.

Detaillierte SQL-Reihenfolge: [`supabase/RUNBOOK.md`](supabase/RUNBOOK.md)

---

## 1. Supabase SQL (Basis)

| # | Datei | Erledigt |
|---|--------|----------|
| 0 | [`supabase-public-read.sql`](../supabase-public-read.sql) | [ ] |
| 1 | [`supabase-members-auth.sql`](../supabase-members-auth.sql) | [ ] |
| 2 | [`supabase-vorstand-roles.sql`](../supabase-vorstand-roles.sql) | [ ] |
| 3 | [`supabase-content-visibility.sql`](../supabase-content-visibility.sql) | [ ] |
| 3b | [`supabase-content-slug-resolve.sql`](../supabase-content-slug-resolve.sql) | [ ] |
| 4 | [`supabase-members-admin.sql`](../supabase-members-admin.sql) | [ ] |

**Optional / nach Bedarf:** Mehrtages-Termine, Tröte-Cleanup (`supabase-drop-web-push.sql`), Feedback-Skripte (siehe RUNBOOK), Protokolle, Public-Registrierung.

---

## 2. Supabase SQL (Feature-Phasen)

| Phase | Datei | Erledigt |
|-------|--------|----------|
| Strava Basis | [`supabase-strava.sql`](../supabase-strava.sql) | [ ] |
| Strava Public | [`supabase-strava-public.sql`](../supabase-strava-public.sql) | [ ] |
| Strava Profil-Aktivitäten | [`supabase-strava-member-activities.sql`](../supabase-strava-member-activities.sql) | [ ] |
| **Phase 2** Radfokus | [`supabase/supabase-sport-category-rad.sql`](supabase/supabase-sport-category-rad.sql) | [ ] |
| **Phase 3** Profilbilder | [`supabase/supabase-member-avatars.sql`](supabase/supabase-member-avatars.sql) | [ ] |
| **Phase 5** Website-Hinweise | [`supabase/supabase-site-content.sql`](supabase/supabase-site-content.sql) | [ ] |

---

## 3. Edge Functions (deployen)

| Funktion | Wann nötig | Erledigt |
|----------|------------|----------|
| `anonymize-member-account` | Account-Löschung | [ ] JWT Verify **OFF** |
| `send-admin-email` | Vorstand-E-Mails | [ ] |
| `strava-oauth-start` | Strava-Anbindung | [ ] |
| `strava-oauth-callback` | Strava-Anbindung | [ ] |
| `strava-sync` | Import + Webhooks | [ ] **nach Phase 2 neu deployen** |

Referenz: [`supabase/RUNBOOK.md`](supabase/RUNBOOK.md) · Setup: [`supabase-strava-setup.md`](supabase-strava-setup.md)

---

## 4. Supabase Dashboard (manuell)

| Punkt | Erledigt |
|-------|----------|
| Redirect URLs: `/profil/`, `/**`, ggf. `/event.html`, `/news-detail.html` | [ ] |
| Storage Bucket `media` — öffentlich lesbar | [ ] |
| Storage Bucket `avatars` — öffentlich lesbar (Phase 3) | [ ] |
| SMTP / Magic Link (Mitglieder-Login) | [ ] |

---

## 5. Frontend-Deploy

| Punkt | Erledigt |
|-------|----------|
| `main` → GitHub Actions → GitHub Pages | [ ] |
| Secrets `SUPABASE_URL`, `SUPABASE_KEY` gesetzt | [ ] |
| `_config.yml` → `vorstand_js_version` bei Admin-JS-Änderungen erhöht | [ ] |

**Hinweis:** Vorstand-JS Cache-Busting über `_config.yml` → `vorstand_js_version`.

---

## 6. Manuelle Tests

| Checkliste | Inhalt |
|------------|--------|
| [`supabase/SMOKE-TEST-PUBLIC-REGISTRATION.md`](supabase/SMOKE-TEST-PUBLIC-REGISTRATION.md) | Externe Abstimmung |

**Kurz-Regression (immer):**

- [ ] Mitglieder-Login Magic Link
- [ ] Vorstand → `/profil/?tab=verwaltung` (Mitglieder, Protokolle, Saisonmodus)
- [ ] `/mitglied-bearbeiten/`, `/protokoll-bearbeiten/`, `/termin-bearbeiten/` nur als Vorstand
- [ ] Termin + News: öffentlich / nur Mitglieder / Entwurf
- [ ] Saisonmodus: Banner + Overlay bei Aktivierung
- [ ] Keine kritischen Console-Errors auf Startseite und `/profil/`

---

## 7. Rechtliches & Doku

| Punkt | Erledigt |
|-------|----------|
| [`datenschutz.md`](../datenschutz.md) — Strava, Profilbilder, Website-Hinweise | [ ] |
| [`mitglieder-hilfe.md`](../mitglieder-hilfe.md) stimmt mit UI überein | [ ] |
| DPA Supabase (Dashboard → Legal Documents) | [ ] |

---

## Siehe auch

- Architektur: [`ARCHITECTURE.md`](ARCHITECTURE.md)
- Schema: [`supabase/SCHEMA.md`](supabase/SCHEMA.md)
- SQL-Reihenfolge: [`supabase/RUNBOOK.md`](supabase/RUNBOOK.md)
