async function initNews(){

const member =
  await ensureContentViewerMember();

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

await fetchNewsBySlug(
  slug,
  member
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

await initFeedbackModule({
  entityType:
    window.siteConfig.feedback.entityTypes.news,
  entityId: data.id,
  container: 'news-feedback'
});

window.history.replaceState(
  {},
  '',
  getNewsUrl(data.slug)
);

}

document.addEventListener(
  'DOMContentLoaded',
  initNews
);
