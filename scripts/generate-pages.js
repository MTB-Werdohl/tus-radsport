const fs = require("fs");
const path = require("path");

const SUPABASE_URL =
process.env.SUPABASE_URL;

const SUPABASE_KEY =
process.env.SUPABASE_KEY;

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
content="${
image||""
}">

<meta
property="og:type"
content="article">

<meta
property="og:url"
content="https://mtb-werdohl.de/${folder}/${slug}/">

<link
rel="canonical"
href="https://mtb-werdohl.de/${folder}/${slug}/">

<meta
http-equiv="refresh"
content="0;url=${target}">

</head>

<body>

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
"News"
);

const termine =
await fetchTable(
"Termine"
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