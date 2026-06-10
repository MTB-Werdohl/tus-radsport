# Phase 3 — Profilbilder (Vorbereitungskonzept)

**Status:** ✅ **Freigegeben** (Produktentscheidung Mai 2026) — Umsetzung ausstehend  
**Projekt:** TUS-Website (Jekyll + Supabase Mitgliederbereich)  
**Stand:** Juni 2026

---

## Produktentscheidung (verbindlich)

**Profilbild und Aktivitäts-/Tourbilder sind zwei getrennte Konzepte.** Sie dürfen fachlich und technisch nicht vermischt werden.

### Profilbild

| Aspekt | Entscheidung |
|--------|--------------|
| Freiwilligkeit | Mitglieder dürfen freiwillig ein Profilbild hinterlegen |
| Sichtbarkeit | Profilbild **darf öffentlich** sichtbar sein |
| Einwilligung | **Keine** separate `einwilligung_bilder` für Profilbilder — Upload oder Strava-Profilbild-Übernahme = **bewusste Zustimmung** zur öffentlichen Darstellung |
| Anzeige | Feed, Rankings, Teilnehmerlisten, Profilseiten |
| Quellen | Eigenes Upload **oder** Strava-Profilbild übernehmen |

### Aktivitätsbilder / Tourfotos / Galerie

| Aspekt | Entscheidung |
|--------|--------------|
| Einwilligung | Weiterhin **`einwilligung_bilder`** / `bilder_eingewilligt_am` |
| Geltungsbereich | Aktivitätsbilder (Strava), Galerie, Tourfotos, Vereinsbilder im Kontext |
| Trennung | **Nicht** mit Profilbild verknüpfen oder dieselbe Einwilligung wiederverwenden |

---

## Ausgangslage (Ist-Zustand)

| Bereich | Befund |
|---------|--------|
| `members` | `einwilligung_bilder` / `bilder_eingewilligt_am` für **Vereinsbilder/Tourfotos** — **kein Avatar-Feld** |
| Auth | Magic Link; RLS: Mitglied eigene Zeile; Vorstand CRUD |
| Storage | Bucket `media` — öffentliches SELECT; Write nur Vorstand |
| Öffentliche Anzeige | Feed/Rankings: `member_name` via RPC |
| Löschung | `anonymize_member()` nullt Einwilligungen; kein Storage-Cleanup |

---

## 1. Datenmodellvorschlag

### 1.1 Erweiterung `members`

| Spalte | Typ | Zweck |
|--------|-----|--------|
| `avatar_storage_path` | `text` nullable | Pfad im Avatar-Storage, z. B. `{member_id}/avatar.webp` |
| `avatar_updated_at` | `timestamptz` nullable | Cache-Busting, Audit |
| `avatar_source` | `text` nullable | `upload` \| `strava` \| `admin` |

Optional: `avatar_consent_at timestamptz` — Zeitpunkt der Zustimmung durch Upload/Import (Audit, unabhängig von `bilder_eingewilligt_am`).

**Nicht speichern:** Vollständige öffentliche URL in der DB.

**`einwilligung_bilder`:** Bleibt bestehen — **ausschließlich** für Aktivitäts-/Tour-/Galeriebilder, nicht für Profilbilder.

### 1.2 RLS

**Tabelle `members`:** Bestehende Policies; Avatar-Felder in eigener Update-Logik.

**Öffentliche RPCs:** `avatar_url` mitliefern, wenn `avatar_storage_path` gesetzt — **ohne** Prüfung auf `einwilligung_bilder`. Opt-ins `publish_feed` / `publish_rankings` weiterhin für Namens-/Kontext-Sichtbarkeit prüfen.

**Storage:** Eigener Bucket `avatars` (nicht `media` — dort öffentlicher Lesezugriff auf alle Vereinsmedien).

| Policy | Rolle | Bedingung |
|--------|-------|-----------|
| `avatars_select_public` | `anon` + authenticated | Öffentlicher Lesezugriff (Profilbilder sind öffentlich) |
| `avatars_insert_own` | authenticated | Pfad `{member_id}/…` |
| `avatars_update_own` / `delete_own` | authenticated | Eigener Pfad |
| `avatars_insert_vorstand` | Vorstand | Beliebiger Pfad |

**Anonymisierung:** Storage-Objekt löschen; `avatar_*`-Felder nullen. `einwilligung_bilder` separat behandeln (Tourfotos).

---

## 2. Datenschutzbetrachtung (DSGVO)

### 2.1 Rechtsgrundlagen

| Verarbeitung | Grundlage |
|--------------|-----------|
| Profilbild (Upload/Strava-Import) | Art. 6 Abs. 1 lit. a DSGVO — **Einwilligung durch aktive Handlung** (Upload mit Hinweistext oder Button „Strava-Profilbild übernehmen“) |
| Aktivitäts-/Tourbilder | Art. 6 Abs. 1 lit. a — **`einwilligung_bilder`** (unverändert) |
| Vorstand sieht Avatare | Art. 6 Abs. 1 lit. f / lit. b (Vereinsorganisation) |

### 2.2 Profilbild — Upload-Flow

1. Mitglied wählt Datei **oder** „Profilbild von Strava übernehmen“.
2. **Pflicht-Hinweis vor Bestätigung:** „Dein Profilbild wird öffentlich auf der Website angezeigt (Feed, Rankings, Teilnehmerlisten, Profil).“
3. Bestätigung = Einwilligung; optional `avatar_consent_at` speichern.
4. **Entfernen:** Mitglied kann Profilbild jederzeit löschen → Storage + DB nullen.

**Kein** Verweis auf `einwilligung_bilder` im Profilbild-Flow.

### 2.3 Aktivitätsbilder — unverändert

Strava-Aktivitätsfotos, Galerie, Tourfotos: weiter **`einwilligung_bilder`**. Bestehende Consent-UI und `datenschutz.md` Abs. 12.3 für diesen Zweck beibehalten; Text klar von Profilbild abgrenzen.

### 2.4 Sichtbarkeit Profilbild

| Kontext | Avatar |
|---------|--------|
| Feed / Rankings | Ja, wenn `avatar_storage_path` + jeweiliger Opt-in (`publish_feed` / `publish_rankings`) |
| Teilnehmerlisten (Admin, ggf. öffentlich) | Ja, wenn Pfad gesetzt |
| Profilseite | Ja (eigenes + andere Mitglieder wo sichtbar) |
| Abstimmungen (Mitglieder-UI) | Optional in Admin-Ergebnissen; Teilnehmerlisten wo fachlich vorgesehen |

### 2.5 Löschung

| Ereignis | Profilbild | `einwilligung_bilder` |
|----------|------------|------------------------|
| Profilbild entfernen | Storage + DB nullen | Unverändert |
| Widerruf `einwilligung_bilder` | **Unberührt** | Nur Aktivitäts-/Tourbilder betroffen |
| Anonymisierung | Profilbild löschen | Einwilligung nullen |

---

## 3. Storage-Konzept

### 3.1 Bucket `avatars`

- Pfad: `avatars/{member_id}/avatar.webp`
- **Öffentlich lesbar** (Profilbilder sind öffentlich by design)
- Max. Upload 2 MB; gespeichert als WebP, max. 512×512 px, 1:1 crop

### 3.2 Strava-Profilbild

- Edge Function oder Server-Fetch: Strava-Profilbild-URL → Download → in `avatars`-Bucket speichern
- Gleicher Hinweistext + Bestätigung vor Import
- `avatar_source = 'strava'`

### 3.3 Upload-Ablauf

```
Hinweis + Bestätigung (öffentliche Darstellung)
  → Client: Resize/Crop
  → storage.from('avatars').upload(...)
  → members.update({ avatar_storage_path, avatar_updated_at, avatar_source, avatar_consent_at })
```

Alternative: Edge Function `upload-member-avatar` für Validierung und Strava-Import.

---

## 4. UI-Konzept

### 4.1 Profil (`/profil/`)

- Avatar-Block: Kreis, Initialen-Fallback
- Aktionen: „Profilbild hochladen“, „Von Strava übernehmen“, „Entfernen“
- **Consent-Gate:** Hinweistext zur **öffentlichen** Darstellung — **nicht** `einwilligung_bilder`
- Getrennter Abschnitt: „Einwilligung Bilder“ bleibt für Tour-/Aktivitätsfotos

### 4.2 Feed & Rankings

- Avatar neben `member_name` (32–40 px Feed, 24–32 px Ranking)
- RPC liefert `avatar_url` wenn Pfad gesetzt + Opt-in

### 4.3 Teilnehmerlisten

- Admin-Feedback-Ergebnisse, ggf. öffentliche Teilnehmerübersichten: Avatar neben Name

### 4.4 Admin

- Mitgliederliste: Thumbnail optional
- Vorstand kann Avatar setzen/entfernen (`avatar_source = 'admin'`) — mit Hinweis an Mitglied empfohlen

### 4.5 Abgrenzung in UX

| Element | Profilbild | Aktivitätsbild |
|---------|------------|----------------|
| Einwilligung | Upload/Import-Hinweis | `einwilligung_bilder` |
| Speicher | Bucket `avatars` | Strava / `media` / Galerie |
| Öffentlich | Ja (bewusst) | Nur mit Bilder-Einwilligung |

---

## 5. Entschiedene Punkte & Restfragen

### Entschieden ✅

| Thema | Entscheidung |
|-------|--------------|
| Trennung Profilbild / Tourbild | Ja, strikt |
| `einwilligung_bilder` für Profilbild | Nein |
| Öffentliche Profilbilder | Ja, mit Upload-/Import-Hinweis |
| Anzeigeorte | Feed, Rankings, Teilnehmerlisten, Profil |
| Strava-Profilbild | Erlaubt mit gleichem Hinweis |

### Offen (Umsetzung)

1. **Upload-Weg:** Client direkt vs. Edge Function (Validierung, EXIF-Stripping)?
2. **Vorstand-Upload:** Automatisch oder nur nach Rücksprache?
3. **Externe Teilnehmer (`public`):** Profilbild anbieten?
4. **Rechtstext:** `datenschutz.md` — Abschnitt Profilbild vs. Tourbilder trennen; wer pflegt?
5. **Thumbnails:** Separat speichern oder CSS aus 512px?

---

## 6. Umsetzungsreihenfolge

1. Rechtstexte (`datenschutz.md`, Upload-Hinweise)
2. Supabase: Bucket `avatars`, Policies, `members`-Spalten
3. Strava-Profilbild-Import (falls in Scope)
4. Profil-UI (Upload / Strava / Entfernen) — getrennt von Bilder-Einwilligung
5. RPC + Feed/Rankings/Teilnehmerlisten-Rendering
6. `anonymize_member` + Storage-Cleanup
7. Smoke-Tests

---

## Referenzen im Repo

- Schema: `docs/supabase/SCHEMA.md`
- Auth/RLS: `docs/supabase-members-auth.sql`
- Anonymisierung: `docs/supabase-members-anonymize.sql`
- Öffentliche RPCs: `docs/supabase-strava-public.sql`
- Profil-UI: `assets/js/member/member-render.js`
- Feed-UI: `assets/js/aktivitaeten/aktivitaeten-render.js`
- Datenschutz: `datenschutz.md` (Abs. 12.3 — Tourbilder)
- Storage: `assets/js/core/site-config.js`
