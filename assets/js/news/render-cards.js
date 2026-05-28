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

          Keine News

        </h3>

        <p>

          Aktuell gibt es
          nichts Neues.

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
      'calendar-card';

    card.innerHTML=`

<a
href="/news-detail.html?slug=${encodeURIComponent(item.slug)}"
>

<div>

<h3>

${item.title}

</h3>

<p>

${
item.excerpt
||
'Mehr lesen'
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