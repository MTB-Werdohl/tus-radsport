# Strava Sync & Webhook — Setup (Schritt 5–6)

Voraussetzungen:

- [`supabase-strava.sql`](supabase-strava.sql) ausgeführt
- [`supabase-strava-sync-status.sql`](supabase-strava-sync-status.sql) ausgeführt *(Sync-Status-Spalten)*
- [`supabase-aktivitaeten-detail-phase-a1.sql`](supabase-aktivitaeten-detail-phase-a1.sql) ausgeführt *(Phase A.1 — Detail-Spalten + Detail-RPC)*
- OAuth deployt ([`supabase-strava-setup.md`](supabase-strava-setup.md))

## Betriebsmodell (wartungsfrei)

| Phase | Auslöser | Verhalten |
|-------|----------|-----------|
| **Erstverbindung** | OAuth-Callback | Initial-Import automatisch (`STRAVA_SYNC_DAYS`, Standard 400) |
| **Laufend** | Strava-Webhooks | Einzelaktivität create/update/delete |
| **Sicherheitsnetz** | Nächtlicher Cron | Reconcile letzte 30 Tage (`STRAVA_RECONCILE_DAYS`) |
| **Fehlerfall** | Profil-Button | „Synchronisierung erneut versuchen“ (nur bei Fehler sichtbar) |

Kein permanenter „Jetzt synchronisieren“-Button.

**Phase A.1:** Jede importierte Strava-Aktivität wird über `GET /activities/{id}` (DetailedActivity) gespeichert — inkl. `map_polyline`, Geschwindigkeiten und `splits_metric`. Die List-API dient nur der Discovery (IDs im Zeitfenster). Öffentliche Anzeige bleibt über RPCs gefiltert (`publish_feed`, `sport_category = rad`).

Code: [`supabase-edge-strava-sync.ts`](supabase-edge-strava-sync.ts)  
OAuth-Callback (Initial-Trigger): [`supabase-edge-strava-oauth-callback.ts`](supabase-edge-strava-oauth-callback.ts)

---

## 1. SQL

Im **SQL Editor** ausführen:

1. [`supabase-strava.sql`](supabase-strava.sql) *(falls noch nicht)*
2. [`supabase-strava-sync-status.sql`](supabase-strava-sync-status.sql) *(Sync-Status-Spalten)*
3. Bei Fehler **„DELETE requires a WHERE clause“**: [`supabase-strava-safe-delete-fix.sql`](supabase-strava-safe-delete-fix.sql)

---

## 2. Edge Functions deployen

| Slug | Datei | Verify JWT |
|------|-------|------------|
| `strava-oauth-callback` | `supabase-edge-strava-oauth-callback.ts` | AUS |
| `strava-sync` | `supabase-edge-strava-sync.ts` | AUS |

Callback-URL (Webhook + Cron):

```text
https://eazizesytrnknbgrnggj.supabase.co/functions/v1/strava-sync
```

---

## 3. Secrets

| Secret | Wert | Pflicht |
|--------|------|---------|
| `STRAVA_WEBHOOK_VERIFY_TOKEN` | Zufälliger String | Webhook |
| `STRAVA_INTERNAL_SECRET` | Zufälliger String | Initial-Sync aus OAuth *(Fallback: Service-Role-Key)* |
| `STRAVA_CRON_SECRET` | Zufälliger String | Nächtlicher Reconcile |
| `STRAVA_SYNC_DAYS` | Initial-Import (Standard `400`) | Nein |
| `STRAVA_RECONCILE_DAYS` | Nacht-Abgleich (Standard `30`) | Nein |

Bereits vorhanden: `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `SITE_URL`.

---

## 4. Webhook bei Strava (einmalig)

```bash
curl -X POST "https://www.strava.com/api/v3/push_subscriptions" \
  -F client_id=DEINE_CLIENT_ID \
  -F client_secret=DEIN_CLIENT_SECRET \
  -F callback_url=https://eazizesytrnknbgrnggj.supabase.co/functions/v1/strava-sync \
  -F verify_token=DEIN_STRAVA_WEBHOOK_VERIFY_TOKEN
```

---

## 5. Nächtlicher Reconcile (Cron)

Täglich z. B. **03:00 Uhr** — per externem Cron oder Supabase **pg_cron** + `pg_net`:

```bash
curl -X POST "https://eazizesytrnknbgrnggj.supabase.co/functions/v1/strava-sync" \
  -H "X-Strava-Cron-Secret: DEIN_STRAVA_CRON_SECRET"
```

Prüft alle verbundenen Mitglieder (`sync_status` active/error) und gleicht die **letzten 30 Tage** ab.

---

## 6. Profil-UI

Nach Verbindung zeigt der Strava-Tab automatisch:

- Verbunden seit
- Letzte Synchronisierung (Datum + Uhrzeit)
- Importierte Aktivitäten (Anzahl)
- Status: **✓ Aktiv** / Import läuft … / Fehler

Button **„Synchronisierung erneut versuchen“** nur bei `sync_status = error` (oder hängendem Initial-Import).

---

## 7. Test

1. Strava verbinden → Toast „Aktivitäten werden automatisch importiert …“
2. Status wechselt: Import läuft … → ✓ Aktiv
3. Webhook-Validierung:

```bash
curl -G "https://eazizesytrnknbgrnggj.supabase.co/functions/v1/strava-sync" \
  --data-urlencode "hub.mode=subscribe" \
  --data-urlencode "hub.verify_token=DEIN_TOKEN" \
  --data-urlencode "hub.challenge=test123"
```

---

## 8. Nächster Schritt

SQL: [`supabase-strava-public.sql`](supabase-strava-public.sql) → Website deployen → `/aktivitaeten/` testen.

Siehe [`supabase/RUNBOOK.md`](supabase/RUNBOOK.md).
