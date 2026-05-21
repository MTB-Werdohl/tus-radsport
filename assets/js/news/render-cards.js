function renderNewsCards(news){

  const container =
    document.getElementById(
      'news-cards'
    );

  if(!container){
    return;
  }

  container.innerHTML='';

  if(!news?.length){

    container.innerHTML=`

      <div class="event-card">

        Keine News vorhanden

      </div>

    `;

    return;

  }

  news.forEach(item=>{

    const card =
      document.createElement(
        'article'
      );

    card.className=
      'event-card';

    card.style.cursor =
      'pointer';

    card.onclick=()=>{

      window.location.href=

        '/news-detail.html?slug='
        + item.slug;

    };

    card.innerHTML=`

      <div class="event-header">

        <div>

          <strong>

            ${item.title}

          </strong>

          <div
            class="event-meta"
          >

            ${
              item.excerpt
              ||
              'Keine Beschreibung'
            }

          </div>

        </div>

      </div>

    `;

    container.appendChild(
      card
    );

  });

}