# Fachkonzept — Termin-Rückblicke / Erlebtes



**Status:** Phase 1.5 (Pilotbetrieb)  

**Letzte Aktualisierung:** 2026-06-14



## Ziel



Vergangene Veranstaltungen sollen als dauerhafte **Rückblicke** dokumentiert werden — ohne neue Content-Art oder eigene Detail-URL. **Erlebtes** ist eine gefilterte Sicht auf veröffentlichte Termine mit veröffentlichtem Rückblick (öffentliche Seite `/erlebtes/`).



## Grundsatzentscheidungen



| Entscheidung | Festlegung |

|--------------|------------|

| Zentrale Entität | `"Termine"` bleibt Anker; gleiche Event-URL |

| Datenmodell | Eigene Tabellen, nicht Felder in `"Termine"` |

| Galerie | **Nicht** erweitert; Rückblick-Bilder separat |

| Serientermine | **v1 ausgeschlossen** (`recurring = true`) |

| Verantwortlichkeit | `Termine.created_by` → Rückblick-Ersteller (Phase 2) |

| Freigabe | Eigener Status `draft` / `published` |

| Öffentliche Liste | Nav **Erlebtes**, URL `/erlebtes/` (Alt-URL `/historie/` leitet weiter) |



## Datenmodell



```text

Termine (bestehend)

└─ termin_recaps (1:1, UNIQUE termin_id)

   └─ termin_recap_images (1:n)

```



### `termin_recaps`



- `headline` — optional

- `body` — Markdown-Bericht

- `status` — `draft` | `published`

- `created_by` — FK `members.id`

- `published_at` — bei Veröffentlichung



### `termin_recap_images`



- `storage_path` — `recaps/{slug}/…` im Bucket `media` (Legacy: `recaps/{termin_id}/…`)

- `sort_order` — Reihenfolge



SQL: [`supabase-termin-recaps.sql`](supabase-termin-recaps.sql), Storage: [`supabase-recap-media-upload.sql`](supabase-recap-media-upload.sql)



## Voraussetzungen für einen Rückblick



Funktion `termin_allows_recap(termin)`:



1. **Einzeltermin** — `recurring = false`

2. **Vergangenheit** — `is_termin_still_upcoming(termin) = false` (Europe/Berlin)

3. **Kein Termin-Entwurf** — `sichtbarkeit` ∈ `{public, members}`



## Sichtbarkeit & RLS



Getrennt von `"Termine"`-RLS über `can_select_termin_recap()`:



| Rolle | Sieht |

|-------|--------|

| anon | `published` + Termin `public` |

| Mitglied | + `published` + Termin `members`; eigene `draft` |

| Vorstand | alles |



**Erlebtes (öffentliche Liste):** nur `status = published`, Termin `sichtbarkeit = public`, Einzeltermin, vergangen.



## Berechtigungen Schreiben



| Rolle | `termin_recaps` | `termin_recap_images` | Storage `recaps/` |

|-------|-----------------|----------------------|-------------------|

| Vorstand | CRUD | CRUD | INSERT/UPDATE/DELETE (global `media`) |

| Mitglied (Phase 2) | INSERT/UPDATE/DELETE eigene `draft`, wenn `Termine.created_by` passt | nur an eigenen Draft-Recaps | INSERT/UPDATE/DELETE eigener `termin_id` |



Mitglieder **veröffentlichen nicht** selbst — Status bleibt `draft` (RLS `with check`).



## Veröffentlichungsqualität (Phase 1)



Vor `status = published`:



- **Mindestens 1 Bild** in `termin_recap_images`

- **Mindestens 100 Zeichen** in `trim(body)`



Validierung in App/RPC (Phase 1); in Phase 0 nur dokumentiert, kein DB-CHECK.



## Bildverarbeitung (Phase 0)



Zentrale Client-Pipeline: [`assets/js/core/image-compress.js`](../assets/js/core/image-compress.js)



- WebP, max. 1920px längste Kante, Qualität ~0.85

- Eingebunden in Admin- und Mitglieder-Uploads (Termin/News/Mediathek)



## Roadmap



```text

Phase 0 — SQL, RLS, Storage, Bildpipeline ✓

    ↓

Phase 1 — Admin-Rückblicke + Terminseite + Erlebtes ✓

    ↓

Phase 2 — Mitgliederworkflow + Vorstand-Freigabe ✓

    ↓

Phase 1.5 — Pilotbetrieb (2–3 Veranstaltungen) ← aktuell

```



## Phase 1 Frontend (umgesetzt)



| Bereich | Dateien |

|---------|---------|

| Validierung | `assets/js/recap/recap-validation.js` |

| Supabase CRUD | `assets/js/recap/recap-service.js` |

| Admin Termin | `admin/termine_edit.html`, `admin/js/termine-recap-edit.js` |

| Admin Entwürfe | `admin/js/drafts.js` (Rückblick-Entwürfe `status=draft`) |

| Terminseite | `assets/js/event/event-page.js`, `event-render.js` |

| Erlebtes | `erlebtes.md`, `assets/js/erlebtes/*`, Nav `_data/navigation.yml` |



Veröffentlichen: Client-Validierung in `validateRecapForPublish` (≥100 Zeichen, ≥1 Bild). Entwurf darf unvollständig sein.



## Phase 2 Frontend (Mitglieder, umgesetzt)



| Bereich | Dateien |

|---------|---------|

| Profil Content | `assets/js/member/member-content.js`, `member-recaps.js` (Helfer) |

| Rückblick bearbeiten | `profil/recap_edit.md`, `assets/js/member/member-recap-edit.js` |

| Vorstand-Freigabe | unverändert: `admin/js/drafts.js`, `admin/js/termine-recap-edit.js` |



Im **Content**-Tab: pro freigegebenem Termin Status und Aktion (Rückblick schreiben / bearbeiten / ansehen). Kein separater Profil-Tab mehr. Speichern nur als Entwurf — Veröffentlichen ausschließlich Vorstand.



## Phase 1.5 — Pilotbetrieb



Checkliste: [`SMOKE-TEST-RECAPS.md`](SMOKE-TEST-RECAPS.md)



2–3 bestehende vergangene Veranstaltungen als Test-Rückblicke anlegen, mobile Ansicht und `/erlebtes/` prüfen. Go für produktiven Mitgliederbetrieb nach Freigabe Projektleitung.



## Nicht in v1



Serientermine, mehrere Autoren, Rückweisungskommentare, Drag-and-Drop-Sortierung, mitgliederinterne Erlebtes-Ansicht, Startseiten-Teaser, Suche, Jahresrückblick, PDF-Export, Galerie-Migration.



## Erfolgskriterium



Ein Besucher kann auf **Erlebtes** nachvollziehen, welche Veranstaltungen stattgefunden haben, ohne vergangene Kalendertermine zu durchsuchen.


