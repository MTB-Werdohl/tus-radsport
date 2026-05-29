# Magic-Link E-Mail — Supabase Vorlage

Einmalig im Supabase Dashboard eintragen:

**Authentication → Email Templates → Magic Link**

Betreff und HTML-Body unten kopieren. Absender über **Project Settings → Authentication → SMTP Settings** (z. B. `noreply@mtb-werdohl.de` oder erreichbare Vereinsadresse).

Rechtliche Einordnung (Website): [Datenschutzerklärung § 12.1](https://www.mtb-werdohl.de/datenschutz/) — Magic Link, keine Passwortspeicherung, Verarbeitung über Supabase Auth (Region eu-central-2).

---

## Betreff

```
Dein Anmeldelink — MTB Werdohl
```

Alternativ (kürzer):

```
Anmeldelink für mtb-werdohl.de
```

---

## HTML-Body (in Supabase einfügen)

```html
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Anmeldelink</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;line-height:1.55;">

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f4;padding:24px 12px;">
    <tr>
      <td align="center">

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e0e0e0;">

          <tr>
            <td style="padding:28px 28px 8px 28px;">
              <p style="margin:0 0 8px 0;font-size:13px;color:#666;text-transform:uppercase;letter-spacing:0.04em;">
                MTB Werdohl · TuS Jahn Werdohl e.V.
              </p>
              <h1 style="margin:0;font-size:22px;line-height:1.35;color:#111;">
                Dein Anmeldelink
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding:8px 28px 20px 28px;font-size:15px;">
              <p style="margin:0 0 14px 0;">
                du hast einen Anmeldelink für die Website
                <strong>mtb-werdohl.de</strong> angefordert
                (Mitgliederbereich, Abstimmung oder Profil).
              </p>
              <p style="margin:0 0 22px 0;">
                Klicke auf den Button, um dich anzumelden. Der Link ist
                <strong>nur einmalig</strong> und
                <strong>zeitlich begrenzt</strong> gültig.
              </p>

              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 22px 0;">
                <tr>
                  <td style="border-radius:6px;background:#ed1c24;">
                    <a href="{{ .ConfirmationURL }}"
                       style="display:inline-block;padding:14px 24px;font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:6px;">
                      Jetzt anmelden
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 10px 0;font-size:13px;color:#555;">
                Button funktioniert nicht? Link in die Adresszeile des Browsers kopieren:
              </p>
              <p style="margin:0 0 20px 0;font-size:12px;word-break:break-all;color:#333;">
                <a href="{{ .ConfirmationURL }}" style="color:#1a5490;">{{ .ConfirmationURL }}</a>
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:16px 28px 24px 28px;background:#f9f9f9;border-top:1px solid #ececec;font-size:12px;color:#666;">
              <p style="margin:0 0 10px 0;">
                <strong>Du hast keinen Link angefordert?</strong><br>
                Dann kannst du diese E-Mail ignorieren und löschen.
                Ohne Klick auf den Link wird kein Login durchgeführt.
              </p>
              <p style="margin:0 0 10px 0;">
                <strong>Datenschutz:</strong>
                Wir verarbeiten deine E-Mail-Adresse zur Anmeldung ohne gespeichertes Passwort
                (Supabase Auth, Region EU). Details:
                <a href="https://www.mtb-werdohl.de/datenschutz/" style="color:#1a5490;">Datenschutzerklärung</a>
                (insbes. Abschnitt 12.1).
              </p>
              <p style="margin:0 0 10px 0;">
                <strong>Verantwortlicher:</strong><br>
                TuS Jahn Werdohl e.V., Abteilung Radsport, Postfach 1771, 58791 Werdohl<br>
                E-Mail: schlotmann@t-online.de
              </p>
              <p style="margin:0;font-size:11px;color:#888;">
                Diese Nachricht ist eine automatische System-E-Mail im Zusammenhang mit
                deiner Anmeldung. Bitte antworte nicht auf diese E-Mail.
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
```

---

## Plain-Text (optional)

Falls Supabase ein separates Textfeld anbietet oder du eine reine Text-Variante brauchst:

```
MTB Werdohl · TuS Jahn Werdohl e.V.
Dein Anmeldelink

Du hast einen Anmeldelink für mtb-werdohl.de angefordert
(Mitgliederbereich, Abstimmung oder Profil).

Jetzt anmelden (nur einmalig und zeitlich begrenzt gültig):
{{ .ConfirmationURL }}

Du hast keinen Link angefordert?
Diese E-Mail ignorieren und löschen. Ohne Klick erfolgt kein Login.

Datenschutz: https://www.mtb-werdohl.de/datenschutz/ (Abschnitt 12.1)

Verantwortlicher:
TuS Jahn Werdohl e.V., Abteilung Radsport
Postfach 1771, 58791 Werdohl
E-Mail: schlotmann@t-online.de

Automatische System-E-Mail — bitte nicht antworten.
```

---

## Hinweise


| Thema               | Empfehlung                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------ |
| **Absender-Name**   | `MTB Werdohl` oder `TuS Jahn Werdohl e.V.`                                                 |
| **Reply-To**        | erreichbare Vereinsadresse (z. B. [schlotmann@t-online.de](mailto:schlotmann@t-online.de)) |
| **Link-Gültigkeit** | in Supabase unter Auth-Einstellungen prüfen; im Text bewusst nur „zeitlich begrenzt“       |
| **Test**            | Magic Link an eigene Adresse senden — Darstellung in Gmail, Outlook, Handy prüfen          |
| **Confirm email**   | bei Magic Link in der Regel deaktiviert lassen (Link = Bestätigung)                        |


Nach dem Speichern: einmal als Vereinsmitglied und einmal als externer Teilnehmer (public) testen.