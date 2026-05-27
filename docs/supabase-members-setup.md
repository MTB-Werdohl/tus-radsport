# Supabase einrichten — Mitglieder-Login (Magic Link)

Schritt-für-Schritt-Anleitung für das Projekt **MTB Werdohl**.  
Tabellenschema: `public.members` mit Spalte `email` (und Profilfeldern).

---

## Überblick: Wie der Login funktioniert

```
Mitglied gibt E-Mail ein
    → check_member_email (RPC): steht E-Mail in members?
    → ja: Supabase sendet Magic Link
    → Klick auf Link → Session (auth.users)
    → Website lädt Zeile aus members (gleiche E-Mail)
    → Profil sichtbar, Navbar zeigt „Mein Profil“
```

Zwei Systeme arbeiten zusammen:

| System | Rolle |
|--------|--------|
| **Supabase Auth** (`auth.users`) | Session, Magic Link, Login/Logout |
| **Tabelle `members`** | Vereinsdaten, Berechtigung „ist Mitglied“ |

Die E-Mail muss in **beiden** übereinstimmen (Groß/Kleinschreibung wird ignoriert).

---

## Schritt 1 — Mitgliederdaten prüfen

Im Supabase Dashboard: **Table Editor → members**

- Jede Zeile braucht eine **`email`** (z. B. `max@example.com`)
- Leere oder falsche E-Mails → Login schlägt fehl
- Empfehlung: E-Mails **klein geschrieben** speichern (nicht Pflicht, aber weniger Verwirrung)

Test-Abfrage im **SQL Editor**:

```sql
select id, vorname, nachname, email
from public.members
where email is not null
order by nachname;
```

---

## Schritt 2 — SQL für Sicherheit ausführen

**Dashboard → SQL → New query**

Inhalt aus [`supabase-members-auth.sql`](supabase-members-auth.sql) einfügen und **Run** klicken.

Das richtet ein:

1. **RLS** auf `members` (Zeilen nur für berechtigte Leser)
2. **Policy** `members_select_own` — eingeloggte User sehen nur die Zeile mit ihrer E-Mail
3. **Funktion** `check_member_email` — Website prüft vor dem Magic Link, ob die E-Mail in `members` steht (ohne andere Daten preiszugeben)

Test im SQL Editor:

```sql
select public.check_member_email('deine-echte@email.de');
-- true = Mitglied, false = nicht in Tabelle
```

---

## Schritt 3 — Auth URLs konfigurieren

**Dashboard → Authentication → URL Configuration**

| Feld | Wert |
|------|------|
| **Site URL** | `https://www.mtb-werdohl.de` |
| **Redirect URLs** (jeweils eine Zeile) | `https://www.mtb-werdohl.de/profil/` |
| | `https://www.mtb-werdohl.de/**` |
| | `http://localhost:4000/profil/` *(nur für lokales Testen)* |
| | `http://127.0.0.1:4000/profil/` *(optional)* |

Ohne `/profil/` in den Redirect URLs landet der Magic Link nicht korrekt auf der Profilseite.

---

## Schritt 4 — E-Mail-Provider (Magic Link)

**Dashboard → Authentication → Providers → Email**

- **Email** muss **aktiviert** sein
- **Confirm email** — bei Magic Link meist **aus** oder Standard lassen; der Link selbst bestätigt die Anmeldung
- **Secure email change** — nach Bedarf (für euren Use Case oft egal)

**Dashboard → Authentication → Email Templates → Magic Link**

- Betreff/Text nach Wunsch anpassen (z. B. „Dein Login für MTB Werdohl“)
- Link in der Vorlage zeigt auf Supabase; nach Klick leitet die Website auf `/profil/` weiter

---

## Schritt 5 — E-Mail-Versand (SMTP)

Supabase Free Tier: begrenzte E-Mails über Supabase. Für Vereinsbetrieb oft **Custom SMTP** sinnvoll.

**Dashboard → Project Settings → Authentication → SMTP Settings**

- SMTP aktivieren (z. B. Vereins-Mail, Strato, Google Workspace, …)
- Absender z. B. `noreply@mtb-werdohl.de` oder eine erreichbare Vereinsadresse
- Test: Magic Link an deine eigene E-Mail schicken

Ohne funktionierenden SMTP kommt **kein** Login-Link an.

---

## Schritt 6 — Website testen

1. Seite öffnen: `https://www.mtb-werdohl.de`
2. E-Mail eingeben, die **in `members.email` steht**
3. Toast: „Login-Link wurde an deine E-Mail gesendet.“
4. E-Mail öffnen, Link klicken
5. Weiterleitung auf `/profil/` mit Vorname, Nachname, …
6. Navbar: „Hallo {Vorname} · Mein Profil · Logout“

**Fehler „Kein Vereinsmitglied gefunden“ nach Klick auf den Link:**

- E-Mail in `members` fehlt oder weicht ab (Tippfehler, Leerzeichen)
- Schritt-2-SQL (RLS + Policy) noch nicht ausgeführt
- Redirect URL passt nicht → Session kommt nicht an (Browser-Konsole / Network prüfen)

**Fehler schon beim „Login-Link senden“:**

- RPC `check_member_email` liefert `false` → E-Mail nicht in `members`
- Oder RPC/SQL noch nicht eingerichtet (dann kann Verhalten abweichen — SQL ausführen)

---

## Schritt 7 — Lokale Entwicklung

In `assets/js/core/site-config.js`:

- `siteUrl` für Produktion: `https://www.mtb-werdohl.de`
- Lokal testen: Redirect `http://localhost:4000/profil/` in Supabase eintragen (Schritt 3)

```bash
bundle exec jekyll serve
# → http://localhost:4000
```

Magic Link muss auf localhost zeigen dürfen (Redirect URLs).

---

## Schritt 8 — Admin vs. Mitglieder-Login

| | **Mitglieder** (Website) | **Admin** (`/admin/`) |
|--|--------------------------|-------------------------|
| Methode | Magic Link | E-Mail + Passwort |
| Tabelle | `members` | Supabase Auth User (CMS) |
| Zweck | Profil lesen | Termine, News, Push |

Beide nutzen **dieselbe Supabase-Instanz**, aber **unterschiedliche Auth-User**.  
Admin-Login unter `/admin/` ist vom Mitglieder-Login getrennt.

---

## Checkliste

- [ ] `members.email` für alle Mitglieder gesetzt
- [ ] [`supabase-members-auth.sql`](supabase-members-auth.sql) ausgeführt (inkl. **UPDATE-Policy** für Profil speichern)
- [ ] `check_member_email('test@…')` → `true` für bekannte E-Mail
- [ ] Site URL + Redirect URLs gesetzt
- [ ] E-Mail-Provider / SMTP konfiguriert
- [ ] Magic Link kommt an und `/profil/` funktioniert
- [ ] Fremde E-Mail (nicht in `members`) → Toast „Kein Vereinsmitglied gefunden“

---

## Häufige Probleme

### Magic Link kommt nicht an

- Spam-Ordner prüfen
- SMTP / Supabase E-Mail-Limits prüfen
- **Authentication → Logs** im Dashboard

### Link öffnet Seite, aber sofort zurück zur Startseite

- **Ursache (behoben im Code):** Session aus Magic Link braucht einen Moment; die URL mit `?code=` darf nicht zu früh bereinigt werden.
- Zusätzlich prüfen: RLS-Policy `members_select_own` aktiv (SQL aus Schritt 2)
- E-Mail in `auth.users` und `members.email` identisch (Groß/Kleinschreibung egal)

### `check_member_email` Fehler in Browser-Konsole

- SQL aus Schritt 2 noch nicht ausgeführt
- Funktion im Dashboard unter **Database → Functions** prüfen

### Spalten auf Profilseite leer

- Felder in `members` sind `NULL` — Daten im Table Editor nachtragen
- Angezeigt werden: `vorname`, `nachname`, `mitgliedsnummer`, `abteilung`, `wohnort`, `geburtsdatum`

---

## Nächste Schritte (optional)

- Weitere Profilfelder anzeigen (`telefonnummer`, Adresse, …) — Frontend in `member-render.js` erweitern
- Einwilligungen (`einwilligung_kontakt`, …) auf der Profilseite
- Mitglieder-Import per CSV in Supabase Table Editor

Bei Fragen: zuerst **SQL Editor Test** + **Authentication Logs** — damit sieht man fast immer, ob das Problem Auth oder `members` ist.
