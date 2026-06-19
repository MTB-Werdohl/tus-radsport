# Dokumentation — MTB Werdohl

Überblick über die **aktuelle** Codebasis.

## Einstieg

| Dokument | Inhalt |
|----------|--------|
| [../README.md](../README.md) | Projektüberblick, lokales Setup, Deploy |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Datenfluss, JS-Muster, Vorstand-Funktionen |
| [GO-LIVE-CHECKLIST.md](GO-LIVE-CHECKLIST.md) | Checkliste vor Livegang |

## Supabase

| Dokument | Inhalt |
|----------|--------|
| [supabase/RUNBOOK.md](supabase/RUNBOOK.md) | **SQL-Reihenfolge** — alle Skripte in `supabase/` |
| [supabase/SCHEMA.md](supabase/SCHEMA.md) | Tabellen & Spalten |
| [supabase-members-setup.md](supabase-members-setup.md) | Magic Link, Mitglieder, Vorstand |
| [supabase-admin-email-setup.md](supabase-admin-email-setup.md) | E-Mail-Versand (Profil → E-Mail) |
| [supabase/PUBLIC-REGISTRATION.md](supabase/PUBLIC-REGISTRATION.md) | Externe Abstimmung (Gäste) |

**SQL-Skripte:** ausschließlich unter [`supabase/`](supabase/) — keine verstreuten Legacy-Dateien.

Edge-Function-Quellcode: `docs/supabase-edge-*.ts`

## Mitglieder

| Dokument | Inhalt |
|----------|--------|
| [../mitglieder-hilfe.md](../mitglieder-hilfe.md) | Hilfe für Mitglieder (Login, Abstimmung) |
| [../datenschutz.md](../datenschutz.md) | Datenschutzerklärung |

## Repo neu aufsetzen (Kurz)

1. Ruby + Bundler, optional Node.js
2. `bundle install` · `bundle exec jekyll serve`
3. Supabase-Projekt anlegen, SQL laut [RUNBOOK](supabase/RUNBOOK.md) ausführen
4. `assets/js/core/site-config.js` — URL, Anon-Key, Tabellennamen
5. Supabase Auth: Redirect URLs `https://<domain>/profil/` und `/**`
6. GitHub Secrets `SUPABASE_URL`, `SUPABASE_KEY` für CI
7. Edge Functions deployen (E-Mail, Strava, Anonymisierung — siehe RUNBOOK)
