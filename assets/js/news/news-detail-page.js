async function initNews(){

let slug=

new URLSearchParams(
window.location.search
)

.get(
'slug'
);

if(!slug){

const parts=

window.location.pathname
.split('/')
.filter(Boolean);

slug=

parts[
parts.length-1
];

}

if(!slug){
return;
}

const data=

await fetchNews(
slug
);

if(!data){
return;
}

document.title=

`${data.title}
· MTB Werdohl`;

renderNewsDetail(
data
);

window.history.replaceState(
  {},
  '',
  `/news/${data.slug}`
);

}

initNews();