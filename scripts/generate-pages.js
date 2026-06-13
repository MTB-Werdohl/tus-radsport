const fs = require("fs");
const path = require("path");

// Tabellennamen — synchron halten mit assets/js/core/site-config.js
const TABLES = {
  news: "News",
  termine: "Termine"
};

const SUPABASE_URL =
process.env.SUPABASE_URL;

const SUPABASE_KEY =
process.env.SUPABASE_KEY;

const SITE_URL =
(process.env.SITE_URL || 'https://www.mtb-werdohl.de')
.replace(/\/$/, '');

function isPublicVisibility(value) {

  return value === 'public' || !value;

}

function resolveEntityImageUrl(entity) {

  const storagePath =
    entity?.image_storage_path;

  if (
    storagePath
    && SUPABASE_URL
  ) {

    const path =
      String(storagePath)
        .trim()
        .replace(/^\/+/, '');

    if (path) {
      return (
        `${SUPABASE_URL}/storage/v1/object/public/media/${path}`
      );
    }

  }

  return entity?.image || null;

}

function escapeOgText(value) {

  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\s+/g, ' ')
    .trim();

}

function buildOgDescription(value, fallback) {

  const plain =
    escapeOgText(
      String(value ?? '')
        .replace(/<[^>]+>/g, ' ')
    );

  if (plain) {
    return plain.slice(0, 200);
  }

  return escapeOgText(fallback || '');

}

async function fetchTable(table){

const response =
await fetch(
`${SUPABASE_URL}/rest/v1/${table}?select=*`,
{
headers:{
apikey:SUPABASE_KEY,
Authorization:
`Bearer ${SUPABASE_KEY}`
}
}
);

if(!response.ok){

const error =
await response.text();

throw new Error(
`${table}: ${error}`
);

}

return response.json();

}

function createPage(
folder,
slug,
title,
description,
image,
target
){

if(
!slug
||
!title
){
return;
}

const dir =
path.join(
process.cwd(),
folder,
slug
);

fs.mkdirSync(
dir,
{recursive:true}
);

const imageUrl =

image

? image

: `${SITE_URL}/assets/images/hero.jpeg`;

const safeTitle =
  escapeOgText(title);

const safeDescription =
  buildOgDescription(
    description,
    title
  );

const html=
`
<!doctype html>

<html>

<head>

<meta charset="utf-8">

<title>${safeTitle} · MTB Werdohl</title>

<meta
property="og:title"
content="${safeTitle}">

<meta
property="og:description"
content="${safeDescription}">

<meta
property="og:image"
content="${imageUrl}">

${
  image
    ? ''
    : `<meta
property="og:image:width"
content="1793">

<meta
property="og:image:height"
content="762">`
}

<meta
name="twitter:card"
content="summary_large_image">

<meta
name="twitter:title"
content="${safeTitle}">

<meta
name="twitter:description"
content="${safeDescription}">

<meta
name="twitter:image"
content="${imageUrl}">

<meta
property="og:type"
content="article">

<meta
property="og:url"
content="${SITE_URL}/${folder}/${slug}/">

<link
rel="canonical"
href="${SITE_URL}/${folder}/${slug}/">

</head>

<body>

<script>

(function () {

  var target =
    new URL(
      '${target}',
      window.location.origin
    );

  var incoming =
    new URLSearchParams(
      window.location.search
    );

  incoming.forEach(function (value, key) {

    target.searchParams.set(
      key,
      value
    );

  });

  window.location.replace(
    target.pathname
    + target.search
    + window.location.hash
  );

})();

</script>

Weiterleitung...

</body>

</html>
`;

fs.writeFileSync(
path.join(
dir,
"index.html"
),
html
);

}

async function build(){

const news =
await fetchTable(
TABLES.news
);

const termine =
await fetchTable(
TABLES.termine
);

for(
const article
of news.filter(item =>
  isPublicVisibility(item.sichtbarkeit)
    || (
      item.published === true
      && !item.sichtbarkeit
    )
)
){

createPage(

"news",

article.slug,

article.title,

article.excerpt,

resolveEntityImageUrl(article),

`/news-detail.html?slug=${article.slug}`

);

}

for(
const termin
of termine.filter(item =>
  isPublicVisibility(item.sichtbarkeit)
)
){

createPage(

"kalender",

termin.slug,

termin.title,

termin.content,

resolveEntityImageUrl(termin),

`/event.html?slug=${termin.slug}`

);

}

console.log(
`News: ${news.length}`
);

console.log(
`Termine: ${termine.length}`
);

}

build();