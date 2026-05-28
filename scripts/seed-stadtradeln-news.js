/**
 * STADTRADELN-News anlegen (Entwurf oder public).
 *
 * Voraussetzung: .env mit SUPABASE_URL und SUPABASE_KEY (service_role)
 *
 *   node scripts/seed-stadtradeln-news.js
 *   node scripts/seed-stadtradeln-news.js --publish
 */

const fs = require('fs');
const path = require('path');

function loadEnvFile() {

  const envPath =
    path.join(process.cwd(), '.env');

  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines =
    fs.readFileSync(envPath, 'utf8')
      .split(/\r?\n/);

  lines.forEach((line) => {

    const trimmed =
      line.trim();

    if (
      !trimmed
      || trimmed.startsWith('#')
    ) {
      return;
    }

    const index =
      trimmed.indexOf('=');

    if (index === -1) {
      return;
    }

    const key =
      trimmed.slice(0, index).trim();

    const value =
      trimmed.slice(index + 1).trim();

    if (!process.env[key]) {
      process.env[key] = value;
    }

  });

}

loadEnvFile();

const SUPABASE_URL =
  process.env.SUPABASE_URL;

const SUPABASE_KEY =
  process.env.SUPABASE_KEY;

const publish =
  process.argv.includes('--publish');

const NEWS = {

  title:
    'STADTRADELN 2026 — unser Team',

  slug:
    'stadtradeln-2026',

  excerpt:
    'Als MTB Werdohl / TuS Jahn sammeln wir Kilometer für Werdohl. Live-Stand und Link zum Mitmachen.',

  content: `## STADTRADELN 2026 — wir sind dabei!

Als Team **MTB Werdohl / TuS Jahn** sammeln wir Kilometer für Werdohl und fürs Klima. Schaut, wie weit wir schon sind — der Stand aktualisiert sich automatisch:

<iframe src="https://login.stadtradeln.de/specials/radelmeter/team/9038" width="415" height="415" style="max-width:100%;border:none;border-radius:12px;display:block;margin:16px auto" title="STADTRADELN MTB Werdohl / TuS Jahn" loading="lazy"></iframe>

### Mitmachen

Noch nicht im Team? Dann einfach bei STADTRADELN registrieren und unserem Team beitreten:

[Jetzt bei MTB Werdohl / TuS Jahn mitmachen](https://www.stadtradeln.de/index.php?id=171&team_preselect=9038)

Jede Tour zählt — ob After-Work am Dienstag oder die Fahrt zum Bäcker. Gemeinsam sind wir stärker!`,

  sichtbarkeit:
    publish
      ? 'public'
      : 'draft',

  published:
    publish

};

async function main() {

  if (!SUPABASE_URL || !SUPABASE_KEY) {

    console.error(
      'SUPABASE_URL und SUPABASE_KEY in .env setzen (service_role).'
    );

    console.error(
      'Alternativ: docs/supabase/seed-stadtradeln-news.sql im SQL Editor ausführen.'
    );

    process.exit(1);

  }

  const existing =
    await fetch(
      `${SUPABASE_URL}/rest/v1/News?slug=eq.${NEWS.slug}&select=id,slug`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`
        }
      }
    );

  const existingRows =
    await existing.json();

  const payload = {
    ...NEWS,
    updated_at: new Date().toISOString()
  };

  let response;

  if (existingRows?.length) {

    response =
      await fetch(
        `${SUPABASE_URL}/rest/v1/News?id=eq.${existingRows[0].id}`,
        {
          method: 'PATCH',
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'return=representation'
          },
          body: JSON.stringify(payload)
        }
      );

  } else {

    response =
      await fetch(
        `${SUPABASE_URL}/rest/v1/News`,
        {
          method: 'POST',
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'return=representation'
          },
          body: JSON.stringify(payload)
        }
      );

  }

  const body =
    await response.text();

  if (!response.ok) {

    console.error(
      'Fehler:',
      response.status,
      body
    );

    process.exit(1);

  }

  const row =
    JSON.parse(body)[0];

  console.log(
    publish
      ? 'News veröffentlicht:'
      : 'News als Entwurf angelegt:'
  );

  console.log(
    `  ID: ${row.id}`
  );

  console.log(
    `  Slug: ${row.slug}`
  );

  console.log(
    `  URL: https://www.mtb-werdohl.de/news/${row.slug}/`
  );

  console.log(
    `  Admin: /admin/news_edit.html?id=${row.id}`
  );

  if (!publish) {

    console.log(
      '\nZum Veröffentlichen: node scripts/seed-stadtradeln-news.js --publish'
    );

  }

}

main().catch((error) => {

  console.error(error);

  process.exit(1);

});
