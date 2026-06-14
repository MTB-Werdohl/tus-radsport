# Smoke-Test — Termin-Rückblicke (Phase 1.5)

Kurz-Checkliste vor Pilotbetrieb. SQL Phase 0 muss deployt sein.

## Admin

- [ ] Als Vorstand einloggen, vergangenen **Einzeltermin** bearbeiten (`sichtbarkeit` ≠ Entwurf)
- [ ] Abschnitt **Rückblick** sichtbar; bei zukünftigem/Serien-/Entwurf-Termin **nicht** sichtbar
- [ ] Entwurf speichern mit kurzem Text (ohne Bild) — OK
- [ ] Mindestens 1 Bild hochladen (WebP unter `recaps/{termin_id}/`)
- [ ] Veröffentlichen blockiert bei &lt;100 Zeichen oder 0 Bilder
- [ ] Veröffentlichen klappt mit ≥100 Zeichen + ≥1 Bild
- [ ] Entwurf erscheint unter `/admin/entwuerfe.html` und Dashboard-Entwürfe-Karte
- [ ] Zurückziehen setzt Status auf Entwurf

## Terminseite

- [ ] `/kalender/{slug}/` zeigt Block **Rückblick** (Headline, Markdown, Bilder)
- [ ] GLightbox öffnet Recap-Bilder
- [ ] Unveröffentlichter Rückblick **nicht** sichtbar (auch nicht für Vorstand auf öffentlicher Seite)

## Erlebtes

- [ ] `/erlebtes/` in Navigation als **Erlebtes** verlinkt
- [ ] `/historie/` leitet auf `/erlebtes/` weiter
- [ ] Nur **veröffentlichte** Rückblicke, Termin `public`, vergangen, Einzeltermin
- [ ] Jahresfilter filtert Liste
- [ ] Karte verlinkt zur Terminseite; Teaser + Vorschaubild
- [ ] Mobile: Kartenlayout, Bilder, Ladezeit

## Mitglieder (Phase 2, Stichprobe)

- [ ] `/profil/?tab=rueckblicke` — Entwurf anlegen, Vorstand veröffentlicht
- [ ] Veröffentlichter Rückblick erscheint auf Erlebtes (wenn Termin `public`)

## Berechtigungen (Stichprobe)

- [ ] Anon: published + public-Termin lesbar
- [ ] Mitglied: published + `members`-Termin lesbar auf Eventseite (Erlebtes nur `public`)
