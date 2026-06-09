# Strava OAuth — Setup & Deploy (Schritt 3)

Voraussetzung: [`supabase-strava.sql`](supabase-strava.sql) ausgeführt.

Code (Dashboard Copy-Paste):

- [`supabase-edge-strava-oauth-start.ts`](supabase-edge-strava-oauth-start.ts)
- [`supabase-edge-strava-oauth-callback.ts`](supabase-edge-strava-oauth-callback.ts)

Repo-Spiegel: `supabase/functions/strava-oauth-start/index.ts` und `strava-oauth-callback/index.ts` (identisch, jeweils vollständig eigenständig).

---

## 1. Strava API App

1. [Strava API Settings](https://www.strava.com/settings/api)
2. **Authorization Callback Domain:** `eazizesytrnknbgrnggj.supabase.co` (nur Domain, ohne Pfad)
3. Client ID + Client Secret notieren

Exakte Redirect-URI (wird automatisch verwendet):

```text
https://eazizesytrnknbgrnggj.supabase.co/functions/v1/strava-oauth-callback
```

---

## 2. Edge Function Secrets

**Dashboard → Edge Functions → Secrets** (Organisation/Projekt):

| Secret | Wert |
|--------|------|
| `STRAVA_CLIENT_ID` | Strava App |
| `STRAVA_CLIENT_SECRET` | Strava App |
| `SITE_URL` | `https://www.mtb-werdohl.de` |
| `STRAVA_OAUTH_STATE_SECRET` | optional, zufälliger langer String (sonst Service-Role-Key) |

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` werden von Supabase gesetzt.

---

## 3. Deploy (Supabase Dashboard)

Slugs **exakt** (siehe `assets/js/core/site-config.js`):

- `strava-oauth-start`
- `strava-oauth-callback`

Für jede Function:

1. **Edge Functions** → **Deploy a new function** (oder bestehende öffnen)
2. **Slug / Name exakt** wie oben — kein auto-generierter Name wie `bright-function`
3. **Gesamten Inhalt** der jeweiligen `docs/supabase-edge-*.ts` einfügen → **Deploy**
4. **Verify JWT:** für beide **AUS** (`strava-oauth-start` prüft JWT intern per `auth.getUser()`; Callback ist ein Browser-Redirect von Strava)

Prüfen:

```bash
curl -i -X OPTIONS "https://eazizesytrnknbgrnggj.supabase.co/functions/v1/strava-oauth-start"
curl -i -X OPTIONS "https://eazizesytrnknbgrnggj.supabase.co/functions/v1/strava-oauth-callback"
```

Erwartung: **HTTP 200**, CORS-Header.

---

## 4. Ablauf

1. Mitglied → `/profil/` → Tab **Strava** → „Mit Strava verbinden“
2. `strava-oauth-start` (POST + JWT) → Weiterleitung zu Strava
3. Nach Freigabe → `strava-oauth-callback` → Tokens in `strava_connections`
4. Redirect → `/profil/?strava=connected` → Tab Strava, Toast

**Profil zeigt:** „Verbunden mit: Vorname Nachname“ + „Seit:“ — **keine** Athlete-ID.

---

## 5. Fehlercodes in der URL

| `reason` | Bedeutung |
|----------|-----------|
| `access_denied` | In Strava abgebrochen |
| `athlete_linked` | Strava-Konto schon anderem Mitglied zugeordnet |
| `invalid_state` | OAuth-State abgelaufen (~15 Min.) |
| `server` | Server/Strava-Fehler |

---

## 6. Nächster Schritt

Schritt 5–6: Webhook + `strava-sync` (Button „Jetzt synchronisieren“).

Siehe [`supabase/RUNBOOK.md`](supabase/RUNBOOK.md).
