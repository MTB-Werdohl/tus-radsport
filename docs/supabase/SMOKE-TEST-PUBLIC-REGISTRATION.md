# Smoke-Test: Public-Anmeldung

Manueller Test nach Deploy oder SQL-Änderungen.

## Vorbereitung

- [ ] Öffentlicher Test-Termin mit Feedback (`public_voting=true`, `enabled=true`)
- [ ] Test-E-Mail (nicht in `members` als Mitglied/Vorstand)
- [ ] Supabase Redirect URLs konfiguriert

## Registrierung (Neu)

1. [ ] Event-Seite als Gast öffnen (nicht eingeloggt)
2. [ ] Gate „Als externer Teilnehmer teilnehmen“ sichtbar
3. [ ] Formular ausfüllen, Einwilligung Kontakt aktivieren
4. [ ] „Registrieren & Bestätigungs-Link senden“ → Erfolgsmeldung
5. [ ] E-Mail erhalten, Link im **gleichen Browser** öffnen
6. [ ] Ja/Vielleicht-Buttons sichtbar (kein Gate mehr)
7. [ ] Abstimmung speichern → aktiv markiert
8. [ ] In Supabase: `members.rolle = 'public'`, Zeile in `feedback_answers`

## Wiederkehr (Bereits registriert)

1. [ ] Ausloggen / neuer Tab als Gast
2. [ ] Gate → „Anmelde-Link senden“ mit bekannter E-Mail
3. [ ] Magic Link → Abstimmung ohne erneute Registrierung

## Negativfälle

- [ ] E-Mail bereits als **Mitglied** → Hinweis „Bitte als Vereinsmitglied anmelden“
- [ ] Termin **members-only** + `public_voting=true` → Gate nicht sichtbar für Gast
- [ ] `public_voting=false` bei public Termin → nur Mitglieder-Hinweis

## Admin-Warnung

- [ ] Termin auf „Nur Mitglieder“ + `public_voting` an → gelbe Warnung im Termin-Editor
