async function initNews(){

  const params=

    new URLSearchParams(
      window.location.search
    );

  const slug=

    params.get(
      'slug'
    );

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

}

initNews();