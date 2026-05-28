-- STADTRADELN-News (öffentlich — zum Anschauen; in Admin ggf. wieder auf Entwurf stellen)
-- Supabase Dashboard → SQL Editor → ausführen

insert into "News" (
  title,
  slug,
  excerpt,
  content,
  published,
  sichtbarkeit,
  updated_at
)
select
  'STADTRADELN 2026 — unser Team',
  'stadtradeln-2026',
  'Als MTB Werdohl / TuS Jahn sammeln wir Kilometer für Werdohl. Live-Stand und Link zum Mitmachen.',
  $content$## STADTRADELN 2026 — wir sind dabei!

Als Team **MTB Werdohl / TuS Jahn** sammeln wir Kilometer für Werdohl und fürs Klima. Schaut, wie weit wir schon sind — der Stand aktualisiert sich automatisch:

<iframe src="https://login.stadtradeln.de/specials/radelmeter/team/9038" width="415" height="415" style="max-width:100%;border:none;border-radius:12px;display:block;margin:16px auto" title="STADTRADELN MTB Werdohl / TuS Jahn" loading="lazy"></iframe>

### Mitmachen

Noch nicht im Team? Dann einfach bei STADTRADELN registrieren und unserem Team beitreten:

[Jetzt bei MTB Werdohl / TuS Jahn mitmachen](https://www.stadtradeln.de/index.php?id=171&team_preselect=9038)

Jede Tour zählt — ob After-Work am Dienstag oder die Fahrt zum Bäcker. Gemeinsam sind wir stärker!$content$,
  true,
  'public',
  now()
where not exists (
  select 1
  from "News"
  where slug = 'stadtradeln-2026'
);

-- Bereits vorhanden? Inhalt aktualisieren:
update "News"
set
  title = 'STADTRADELN 2026 — unser Team',
  excerpt = 'Als MTB Werdohl / TuS Jahn sammeln wir Kilometer für Werdohl. Live-Stand und Link zum Mitmachen.',
  content = $content$## STADTRADELN 2026 — wir sind dabei!

Als Team **MTB Werdohl / TuS Jahn** sammeln wir Kilometer für Werdohl und fürs Klima. Schaut, wie weit wir schon sind — der Stand aktualisiert sich automatisch:

<iframe src="https://login.stadtradeln.de/specials/radelmeter/team/9038" width="415" height="415" style="max-width:100%;border:none;border-radius:12px;display:block;margin:16px auto" title="STADTRADELN MTB Werdohl / TuS Jahn" loading="lazy"></iframe>

### Mitmachen

Noch nicht im Team? Dann einfach bei STADTRADELN registrieren und unserem Team beitreten:

[Jetzt bei MTB Werdohl / TuS Jahn mitmachen](https://www.stadtradeln.de/index.php?id=171&team_preselect=9038)

Jede Tour zählt — ob After-Work am Dienstag oder die Fahrt zum Bäcker. Gemeinsam sind wir stärker!$content$,
  published = true,
  sichtbarkeit = 'public',
  updated_at = now()
where slug = 'stadtradeln-2026';
