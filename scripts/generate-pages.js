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

throw new Error(
`${table} konnte nicht geladen werden`
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

const html =
`
<!doctype html>

<html>

<head>

<meta charset="utf-8">

<title>
${title}
· MTB Werdohl
</title>

<meta
property="og:title"
content="${title}">

<meta
property="og:description"
content="${
description||""
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

const events =
await fetchTable(
"Termine"
);

for(
const article
of news
){

if(
!article.slug
||
!article.title
){
continue;
}

createPage(

"news",

article.slug,

article.title,

article.summary
||
article.description
||
"",

article.image
||
article.image_url
||
"",

`/news-detail.html?slug=${article.slug}`

);

}

for(
const event
of events
){

if(
!event.slug
||
!event.title
){
continue;
}

createPage(

"events",

event.slug,

event.title,

event.description
||
event.summary
||
"",

event.image
||
event.image_url
||
"",

`/event.html?slug=${event.slug}`

);

}

}

build();