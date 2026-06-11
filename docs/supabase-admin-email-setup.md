# Admin-E-Mail — Setup

Versand aus dem Admin-Bereich (`/admin/email.html`) über die Edge Function **`send-admin-email`**.

Absender standardmäßig: **info@mtb-werdohl.de**

Empfängerfilter (serverseitig, nicht umgehbar):

- `members.einwilligung_kontakt = true`
- gültige E-Mail-Adresse
- kein anonymisierter Account (`anonymized_at` leer)

## 1. Edge Function deployen

1. Code: [`supabase-edge-send-admin-email.ts`](supabase-edge-send-admin-email.ts) oder [`supabase/functions/send-admin-email/index.ts`](../supabase/functions/send-admin-email/index.ts)
2. Supabase Dashboard → **Edge Functions** → Deploy
3. **Slug exakt:** `send-admin-email`
4. **Verify JWT:** **OFF** (JWT wird in der Function geprüft, wie bei `anonymize-member-account`)

Optional CLI:

```bash
supabase functions deploy send-admin-email --project-ref eazizesytrnknbgrnggj
```

## 2. Secrets setzen

**Dashboard → Edge Functions → send-admin-email → Secrets**

### Variante A: SMTP (z. B. Strato, Google Workspace)

| Secret | Beispiel |
|--------|----------|
| `SMTP_HOST` | `smtp.strato.de` |
| `SMTP_PORT` | `465` oder `587` |
| `SMTP_SECURE` | `true` (bei Port 465) |
| `SMTP_USER` | `info@mtb-werdohl.de` |
| `SMTP_PASS` | Postfach-Passwort |
| `EMAIL_FROM` | `info@mtb-werdohl.de` |
| `EMAIL_FROM_NAME` | `MTB Werdohl` |

### Variante B: Resend

| Secret | Wert |
|--------|------|
| `RESEND_API_KEY` | API-Key aus Resend |
| `EMAIL_FROM` | `info@mtb-werdohl.de` (Domain in Resend verifiziert) |
| `EMAIL_FROM_NAME` | `MTB Werdohl` |

Wenn **SMTP_HOST** gesetzt ist, wird SMTP bevorzugt. Sonst **RESEND_API_KEY**.

## 3. Empfängermodi

| Modus | Bedeutung |
|-------|-----------|
| **Einzelmitglied** | Eine Person mit Kontakt-Einwilligung |
| **Termin** | Teilnehmer mit Antwort **Ja** oder **Vielleicht** (Modul `yes_maybe`, Einwilligung Kontakt); bei Umfrage (`poll`) alle mit Antwort |
| **Alle** | Alle Mitglieder mit Kontakt-Einwilligung |

## 4. Versandprotokoll (optional, empfohlen)

SQL im **SQL Editor** ausführen: [`supabase-admin-email-log.sql`](supabase-admin-email-log.sql)

- Tabelle `admin_email_log` — Betreff, Text, Empfänger, Absender, Zeitpunkt
- Nur Vorstand lesbar (RLS)
- **18 Monate** Aufbewahrung, danach automatische Löschung bei jedem neuen Eintrag
- Edge Function `send-admin-email` danach **neu deployen** (schreibt Protokoll per Service Role)

In `/admin/email.html` erscheint unten das **Versandprotokoll**.

## 5. Test

1. Frontend deployen (Cache-Version in `_config.yml`)
2. Als Vorstand `/admin/email.html` öffnen
3. Test an eigenes Mitglied mit Einwilligung
4. Bei Fehler: Edge Function **Logs** im Supabase Dashboard prüfen

## Siehe auch

- [`supabase/RUNBOOK.md`](supabase/RUNBOOK.md)
- [`ARCHITECTURE.md`](ARCHITECTURE.md)
