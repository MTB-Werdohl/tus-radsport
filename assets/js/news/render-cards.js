function renderNewsCards(news){

  const wrapper =
    document.getElementById(
      'news-cards'
    );

  if(!wrapper){
    return;
  }

  wrapper.innerHTML='';

  if(!news?.length){

    wrapper.innerHTML=`

      <article
        class="calendar-card"
      >

        <h3>

          Kein Internes

        </h3>

        <p>

          Aktuell keine internen Beiträge.

        </p>

      </article>

    `;

    return;

  }

  news.forEach(item=>{

    const card =
      document.createElement(
        'article'
      );

    card.className=
      contentVisibilityCardClass(
        item.sichtbarkeit
      );

    card.innerHTML=`

<a
href="${getNewsUrl(item.slug)}"
>

<div>

<h3>

${formatContentCardTitle(
  item.title,
  item.sichtbarkeit
)}

</h3>

<p>

${
item.excerpt
||
'Mehr lesen'
}${
  item.creator_label
    ? ` · 👤 ${escapeContentCreatorHtml(item.creator_label)}`
    : ''
}

</p>

</div>

</a>

`;

    wrapper.appendChild(
      card
    );

  });

}