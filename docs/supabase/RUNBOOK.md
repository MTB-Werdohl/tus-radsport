# Supabase Runbook — MTB Werdohl

Alle SQL-Skripte liegen in `docs/` und werden **manuell** im Supabase SQL Editor ausgeführt (kein `supabase/migrations/` im Repo).

## Ausführungsreihenfolge

| # | Datei | Voraussetzung | Inhalt |
|---|--------|---------------|--------|
| 0 | [`supabase-public-read.sql`](../supabase-public-read.sql) | Tabellen existieren | Öffentliches SELECT: `galleries`, `gallery_images`, `site_state` (`last_push`), Storage `media` |
| 1 | [`supabase-members-auth.sql`](../supabase-members-auth.sql) | Tabelle `members` | RLS Basis, `check_member_email()` |
| 2 | [`supabase-vorstand-roles.sql`](../supabase-vorstand-roles.sql) | #1 | `is_vorstand()`, Vorstand-Schreibrechte, Zwischen-News-SELECT |
| 3 | [`supabase-content-visibility.sql`](../supabase-content-visibility.sql) | #2 | `is_member()`, `sichtbarkeit`, finale News/Termine-SELECT |
| 4 | [`supabase-members-admin.sql`](../supabase-members-admin.sql) | #2 | Vorstand CRUD auf `members`, Push-Löschen |
| 5 | [`supabase-push-members.sql`](../supabase-push-members.sql) | #2 | Push RLS, eigene Subscriptions lesen |

**Optional (Mehrtages-Termine):** [`supabase-termine-multiday.sql`](../supabase-termine-multiday.sql) — Spalten `endDate`, `durationDays` auf `Termine`.

**Push-Verlauf:** [`supabase-push-messages.sql`](../supabase-push-messages.sql) — Tabelle `PushMessages` + RLS (nach #2). Edge Function `send-push` danach **neu deployen**.

**Feedback:** [`supabase-feedback.sql`](../supabase-feedback.sql) — `feedback_modules` + `feedback_answers` (nach #2). Polymorphe `entity_type`/`entity_id` **ohne FK**; Poll-Antworten speichern `option_id` in `answer`.

**Wichtig:** Schritt 3 ersetzt die News-SELECT-Policy aus Schritt 2. Ohne Schritt 3 gelten News-Leserechte noch über `published`, nicht `sichtbarkeit`.

### Einmalig (Push Upsert)

```sql
ALTER TABLE "PushSubscriptions"
  ADD CONSTRAINT push_subscriptions_endpoint_unique
  UNIQUE (endpoint);
```

Nur ausführen, wenn der Constraint noch fehlt (Edge Function `save-push-subscription` nutzt `onConflict: 'endpoint'`).

## Edge Functions

| Funktion | Referenz / Verhalten |
|----------|----------------------|
| `save-push-subscription` | [`supabase-edge-save-push-subscription.ts`](../supabase-edge-save-push-subscription.ts) — JWT des Mitglieds, Service Role Upsert |
| `delete-push-subscription` | Analog zu save — JWT, Endpoint löschen |
| `send-push` | [`supabase-edge-send-push.ts`](../supabase-edge-send-push.ts) — JWT + Vorstand-Check, Push senden, **Verlauf in `PushMessages` + `site_state`** (Service Role) |

## Policy-Matrix (Kurz)

| Tabelle | anon | authenticated (Mitglied) | authenticated (Vorstand) |
|---------|------|----------------------------|---------------------------|
| `News` / `Termine` | SELECT `sichtbarkeit=public` | + `members` + alle `public` | + alle Zeilen + CRUD |
| `members` | — | SELECT/UPDATE eigene Zeile | SELECT alle + CRUD alle |
| `galleries` / `gallery_images` | SELECT | SELECT | CRUD |
| `PushSubscriptions` | — | SELECT eigene (`member_id`) | SELECT alle, DELETE (Mitglied löschen) |
| `PushMessages` | SELECT | SELECT | INSERT |
| `feedback_modules` | SELECT | SELECT | ALL |
| `feedback_answers` | — | SELECT/INSERT/UPDATE eigene | SELECT alle + (später Auswertung) |
| `site_state` | SELECT `last_push` | SELECT `last_push` | ALL |
| `storage.objects` (media) | SELECT | SELECT | INSERT, DELETE |

Schreibzugriffe auf Push-Subscriptions für Mitglieder laufen über Edge Functions (Service Role), nicht über Client-RLS.

## Upgrade vs. Neuinstallation

- **Neu:** Skripte 0→5 der Reihe nach.
- **Bereits live:** Einzelne Skripte erneut ausführen ist idempotent (`drop policy if exists` …).
- **`is_vorstand()` / `is_member()`:** nutzen `SET row_security = off` — bei Problemen mit Admin-Listen erneut [`supabase-vorstand-roles.sql`](../supabase-vorstand-roles.sql) bzw. [`supabase-content-visibility.sql`](../supabase-content-visibility.sql) ausführen.

## Siehe auch

- Schema: [`SCHEMA.md`](SCHEMA.md)
- Magic Link Setup: [`../supabase-members-setup.md`](../supabase-members-setup.md)
- Architektur: [`../ARCHITECTURE.md`](../ARCHITECTURE.md)
