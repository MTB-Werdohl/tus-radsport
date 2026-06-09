# Strava Sync & Webhook — Setup (Schritt 5–6)

Voraussetzungen:

- [`supabase-strava.sql`](supabase-strava.sql) ausgeführt
- OAuth deployt ([`supabase-strava-setup.md`](supabase-strava-setup.md))

Eine Edge Function **`strava-sync`** übernimmt:

| Anfrage | Auslöser | Verhalten |
|---------|----------|-----------|
| **GET** | Strava Webhook-Validierung | `hub.challenge` zurückgeben |
| **POST** (ohne JWT) | Strava Webhook-Event | Aktivität importieren / soft-delete, Stats neu |
| **POST** + JWT | Button „Jetzt synchronisieren“ | Aktivitäten der letzten ~400 Tage importieren |

Code: [`supabase-edge-strava-sync.ts`](supabase-edge-strava-sync.ts)

---

## 1. Edge Function deployen

1. **Edge Functions** → **Deploy a new function**
2. **Slug exakt:** `strava-sync`
3. Code aus [`supabase-edge-strava-sync.ts`](supabase-edge-strava-sync.ts) einfügen → **Deploy**
4. **Verify JWT:** **AUS**

Callback-URL (für Webhook):

```text
https://eazizesytrnknbgrnggj.supabase.co/functions/v1/strava-sync
```

---

## 2. Secrets

**Dashboard → Edge Functions → Secrets** (zusätzlich zu OAuth):

| Secret | Wert | Pflicht |
|--------|------|---------|
| `STRAVA_WEBHOOK_VERIFY_TOKEN` | Zufälliger langer String (z. B. 32+ Zeichen) | **Ja** (Webhook) |
| `STRAVA_SYNC_DAYS` | Tage zurück für manuellen Import (Standard: `400`) | Nein |

Bereits vorhanden: `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `SITE_URL`.

---

## 3. Webhook bei Strava anlegen (einmalig)

**Vor dem POST:** Function deployen und `STRAVA_WEBHOOK_VERIFY_TOKEN` setzen.

Strava sendet sofort eine **GET**-Validierung an die Callback-URL. Die Function antwortet mit `{"hub.challenge":"…"}`.

```bash
curl -X POST "https://www.strava.com/api/v3/push_subscriptions" \
  -F client_id=DEINE_CLIENT_ID \
  -F client_secret=DEIN_CLIENT_SECRET \
  -F callback_url=https://eazizesytrnknbgrnggj.supabase.co/functions/v1/strava-sync \
  -F verify_token=DEIN_STRAVA_WEBHOOK_VERIFY_TOKEN
```

Erfolg: JSON mit `id` der Subscription.

**Fehler `not verifiable`:** Callback-URL muss per HTTPS erreichbar sein; Verify-Token muss exakt passen. Supabase-Edge-URLs sind in der Regel unkritisch.

Bestehende Subscription prüfen:

```bash
curl -G "https://www.strava.com/api/v3/push_subscriptions" \
  --data-urlencode "client_id=DEINE_CLIENT_ID" \
  --data-urlencode "client_secret=DEIN_CLIENT_SECRET"
```

---

## 4. Manueller Sync (Profil)

1. Mitglied → `/profil/` → Tab **Strava**
2. **Jetzt synchronisieren** → POST an `strava-sync` mit JWT
3. Importiert Aktivitäten (Standard: letzte 400 Tage, inkrementell danach)
4. Ruft `rebuild_member_stats` + `refresh_club_stats` auf
5. Setzt `strava_connections.last_sync_at`

Nach dem Website-Deploy (JS-Update) nutzt der Button die Edge Function direkt — die RPC `request_strava_sync` ist obsolet.

---

## 5. Webhook-Ereignisse

Strava sendet bei `activity` + `create` / `update` / `delete`:

- **create/update:** Einzelaktivität von Strava laden → upsert in `activities`
- **delete:** `deleted_at` setzen (Soft Delete)
- Stats werden pro Event neu berechnet

Nur Athleten mit Eintrag in `strava_connections` werden verarbeitet.

---

## 6. Test

Webhook-Validierung (lokal simuliert):

```bash
curl -G "https://eazizesytrnknbgrnggj.supabase.co/functions/v1/strava-sync" \
  --data-urlencode "hub.mode=subscribe" \
  --data-urlencode "hub.verify_token=DEIN_TOKEN" \
  --data-urlencode "hub.challenge=test123"
```

Erwartung: `{"hub.challenge":"test123"}`

Manueller Sync: Profil → Strava → **Jetzt synchronisieren** (nach Strava-Verbindung).

---

## 7. Nächster Schritt

Schritt 7–10: Öffentliches `/aktivitaeten/`-Portal (Feed, Detail, Rankings).

Siehe [`supabase/RUNBOOK.md`](supabase/RUNBOOK.md).
