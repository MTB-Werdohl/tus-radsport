# Go-live-Checkliste — MTB Werdohl

**Zweck:** Abschluss-Prüfung vor Livegang oder nach Neuinstallation.

SQL-Reihenfolge: [`supabase/RUNBOOK.md`](supabase/RUNBOOK.md) (alle Skripte in `docs/supabase/`).

---

## 1. Supabase SQL

- [ ] RUNBOOK Kern (#0–12) ausgeführt
- [ ] RUNBOOK Feedback (#20–32) ausgeführt
- [ ] RUNBOOK Medien & Protokolle (#40–45) ausgeführt
- [ ] RUNBOOK E-Mail (#50) ausgeführt
- [ ] RUNBOOK Strava (#60–68) ausgeführt *(falls Aktivitätenportal genutzt)*

---

## 2. Edge Functions

| Funktion | Erledigt |
|----------|----------|
| `anonymize-member-account` | [ ] JWT Verify **OFF** |
| `send-admin-email` | [ ] |
| `strava-oauth-start` / `strava-oauth-callback` / `strava-sync` | [ ] *(optional)* |

---

## 3. Supabase Auth

- [ ] Site URL gesetzt
- [ ] Redirect URLs: `/profil/`, `/**`
- [ ] Magic Link getestet

Details: [`supabase-members-setup.md`](supabase-members-setup.md)

---

## 4. Website / GitHub

- [ ] `assets/js/core/site-config.js` — URL, Anon-Key
- [ ] GitHub Secrets `SUPABASE_URL`, `SUPABASE_KEY`
- [ ] `_config.yml` → `vorstand_js_version` bei JS-Änderungen erhöhen

---

## 5. Manuelle Tests

| Checkliste | Inhalt |
|------------|--------|
| [`supabase/SMOKE-TEST-PUBLIC-REGISTRATION.md`](supabase/SMOKE-TEST-PUBLIC-REGISTRATION.md) | Externe Abstimmung |

**Kurz-Regression:**

- [ ] Mitglieder-Login Magic Link
- [ ] Vorstand → `/profil/?tab=verwaltung` (Mitglieder, Protokolle, Saisonmodus)
- [ ] `/mitglied-bearbeiten/`, `/protokoll-bearbeiten/`, `/termin-bearbeiten/` nur als Vorstand
- [ ] Termin + News: öffentlich / nur Mitglieder / Entwurf
- [ ] Saisonmodus: Banner + Overlay bei Aktivierung
- [ ] Keine kritischen Console-Errors auf Startseite und `/profil/`

---

## 6. Rechtliches & Doku

| Punkt | Erledigt |
|-------|----------|
| [`datenschutz.md`](../datenschutz.md) | [ ] |
| [`mitglieder-hilfe.md`](../mitglieder-hilfe.md) stimmt mit UI überein | [ ] |
| DPA Supabase | [ ] |

---

## Siehe auch

- Architektur: [`ARCHITECTURE.md`](ARCHITECTURE.md)
- Schema: [`supabase/SCHEMA.md`](supabase/SCHEMA.md)
