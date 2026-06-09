# Strava — Setup (OAuth, Webhook, Sync)

Voraussetzung: [`supabase-strava.sql`](supabase-strava.sql) im SQL Editor ausgeführt.

Profil-Tab unter `/profil/` → **Strava** (Schritt 2). OAuth und Sync folgen in Edge Functions.

## 1. Strava API App

1. [Strava API Settings](https://www.strava.com/settings/api) → App anlegen
2. **Authorization Callback Domain:** eure Supabase Functions-Domain (ohne Pfad), z. B. `eazizesytrnknbgrnggj.supabase.co`
3. **Client ID** und **Client Secret** notieren

Geplante Callback-URL:

```text
https://<project-ref>.supabase.co/functions/v1/strava-oauth-callback
```

## 2. Edge Function Secrets (folgt Schritt 3)

| Secret | Wert |
|--------|------|
| `STRAVA_CLIENT_ID` | aus Strava App |
| `STRAVA_CLIENT_SECRET` | aus Strava App |
| `STRAVA_WEBHOOK_VERIFY_TOKEN` | zufälliger String (Webhook-Handshake) |

## 3. Webhook (folgt Schritt 5)

Strava Webhook-Subscription auf die Function `strava-webhook` — Events: `activity.create`, `activity.update`, `activity.delete`.

## 4. Verhalten (Produkt)

| Aktion | Wirkung |
|--------|---------|
| Opt-in Feed/Rankings/Ziele ändern | Nur Sichtbarkeit — **keine** Löschung von Aktivitäten |
| **Verbindung trennen** (mit Bestätigung) | Tokens weg, Opt-ins aus, Aktivitäten soft-delete, Stats neu |
| Profil-Anzeige | „Verbunden mit: Vorname Nachname“, **keine** Athlete-ID (nur Admin/Debug) |

## 5. Nächste Implementierungsschritte

1. `strava-oauth-start` + `strava-oauth-callback` Edge Functions
2. `strava-webhook` + Import in `activities`
3. `strava-sync` für Button „Jetzt synchronisieren“
4. Öffentliche Seite `/aktivitaeten/` (Feed, Stats, Rankings)

Siehe [`supabase/RUNBOOK.md`](supabase/RUNBOOK.md) und [`supabase/SCHEMA.md`](supabase/SCHEMA.md).
