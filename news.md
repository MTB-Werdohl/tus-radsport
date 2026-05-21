---
layout: default
title: News
permalink: /news/
---

<div id="news-cards"></div>

<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

<script src="/assets/js/push/config.js"></script>

<script src="/assets/js/core/supabase.js"></script>

<script>

async function loadNews() {

  const { data, error } =
    await supabaseClient
      .from('News')
      .select('*')
      .eq('published', true)
      .order(
        'created_at',
        { ascending: false }
      );

  if (error) {

    console.error(error);

    return;

  }

  renderNews(data);

}

function renderNews(news){

  const container =
    document.getElementById(
      'news-cards'
    );

  container.innerHTML='';

  if(!news.length){

    container.innerHTML=`

      <p>
        Aktuell sind keine News vorhanden.
      </p>

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

    card.onclick=()=>{

      window.location.href=

      '/news-detail.html?slug='
      + item.slug;

    };

    container.appendChild(
      card
    );

  });

}

loadNews();

</script>