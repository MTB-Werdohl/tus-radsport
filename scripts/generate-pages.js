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

: `${SITE_URL}/assets/images/icon-512.png`;

const html=
`
<!doctype html>

<html>

<head>

<meta charset="utf-8">

<title>${title} · MTB Werdohl</title>

<meta
property="og:title"
content="${title}">

<meta
property="og:description"
content="${
(description||"")
.replace(/"/g,"'")
}">

<meta
property="og:image"
content="${imageUrl}">

<meta
property="og:image:width"
content="512">

<meta
property="og:image:height"
content="512">

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

window.location.replace(
'${target}'
);

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
of news
){

createPage(

"news",

article.slug,

article.title,

article.excerpt,

article.image,

`/news-detail.html?slug=${article.slug}`

);

}

for(
const termin
of termine
){

createPage(

"kalender",

termin.slug,

termin.title,

termin.content,

termin.image,

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