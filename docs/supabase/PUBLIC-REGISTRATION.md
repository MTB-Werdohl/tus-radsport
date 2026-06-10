# Public-Anmeldung (externe Teilnehmer)

Stand: Phase-0-Fix. Technischer Ablauf für öffentliche Termin-Abstimmungen.

## Voraussetzungen (Admin)

1. Termin mit **`sichtbarkeit = public`**
2. Feedback-Modul **aktiviert** (`enabled = true`)
3. **`public_voting = true`** (Checkbox „Öffentliche Abstimmung“)
4. Typ **`yes_maybe`** (Standard bei Terminen)

Im Admin erscheint eine **Warnung**, wenn `public_voting` und `sichtbarkeit` nicht zusammenpassen.

## SQL (Reihenfolge)

Siehe [`RUNBOOK.md`](RUNBOOK.md). Mindestens:

1. `supabase-feedback-public-registration.sql`
2. `supabase-feedback-public-email-verify.sql` → RPCs `can_register_public_participant`, `complete_public_participant_registration`
3. `supabase-public-participant-consents.sql`
4. Bei Upsert-Fehlern: `supabase-feedback-answers-unique-fix.sql`

## Ablauf (Website)

```
Gast auf Event-Seite
  → Gate „Als externer Teilnehmer teilnehmen“
  → Formular + Einwilligung Kontakt
  → RPC can_register_public_participant
  → signInWithOtp (Metadaten + Pending in sessionStorage + localStorage)
  → E-Mail mit Magic Link
  → Klick → Session
  → RPC complete_public_participant_registration
  → members.rolle = 'public'
  → Ja / Vielleicht speichern (feedback_answers)
```

## Bekannte Fehlerursachen

| Symptom | Ursache | Lösung |
|---------|---------|--------|
| „serverseitig noch nicht eingerichtet“ | RPC fehlt | SQL ausführen (s. oben) |
| Gate fehlt | `public_voting=false` oder Termin nicht public | Admin prüfen |
| Nach E-Mail-Klick keine Abstimmung | RPC schlägt fehl / Session abgemeldet | Browser-Konsole + Supabase Logs; SQL deployt? |
| Upsert-Fehler beim Abstimmen | UNIQUE `(module_id, member_id)` fehlt | `supabase-feedback-answers-unique-fix.sql` |
| Registrierung in anderem Browser | Pending-Daten fehlen | Gleichen Browser nutzen; Metadaten aus Auth als Fallback |

## Phase-0-Code-Fixes (Frontend)

- **`member-auth.js`**: Kein automatisches Abmelden nach fehlgeschlagener Public-Registrierung am Magic-Link; sichtbare Fehlermeldung bei RPC-Fehler
- **`feedback-public-registration.js`**: Pending-Registrierung zusätzlich in `localStorage` (7 Tage)
- **`feedback-service.js`**: Legacy `submitPublicFeedbackAnswer` entfernt
- **`feedback-module-form.js`**: Admin-Warnung bei fehlender Konfiguration

## Smoke-Test

Siehe [`SMOKE-TEST-PUBLIC-REGISTRATION.md`](SMOKE-TEST-PUBLIC-REGISTRATION.md).

## Redirect URLs (Supabase Auth)

Site URL + Redirect URLs müssen Event-/News-Detail-URLs erlauben — siehe [`supabase-members-setup.md`](../supabase-members-setup.md).
