---
layout: default
title: News
permalink: /news/
---

<div id="news-list"
     class="news-list"></div>

<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>

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

function renderNews(news) {

  const container =
    document.getElementById('news-list');

  container.innerHTML = '';

  if (!news.length) {

    container.innerHTML = `

      <p>
        Aktuell sind keine News vorhanden.
      </p>

    `;

    return;

  }

  news.forEach(item => {

    const article =
      document.createElement('article');

    article.className =
      'news-card';

    article.innerHTML = `

      ${item.image
        ? `
          <img
            src="${item.image}"
            class="news-image"
            alt="${item.title}">
        `
        : ''
      }

      <div class="news-content">

        <h2>
          ${item.title}
        </h2>

        <div class="news-excerpt">

          ${marked.parse(
            item.excerpt || ''
          )}

        </div>

        <a
          class="news-more"
          href="/news-detail.html?slug=${item.slug}">

          Mehr lesen

        </a>

      </div>

    `;

    container.appendChild(article);

  });

}

loadNews();

</script>