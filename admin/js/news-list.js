async function loadNews() {

  const { data, error } =
    await window.supabaseClient
      .from(window.siteConfig.tables.news)
      .select('*')
      .order(
        'created_at',
        { ascending: false }
      );

  if (error) {

    console.error(error);

    return;

  }

  const search =
    document
      .getElementById('search')
      .value
      .toLowerCase();

  const container =
    document.getElementById('news');

  container.innerHTML = '';

  data

    .filter(item => {

      return (

        item.title
          ?.toLowerCase()
          .includes(search)

        ||

        item.excerpt
          ?.toLowerCase()
          .includes(search)

      );

    })

    .forEach(item => {

      container.innerHTML += `

        <div class="event-card">

          <div class="event-header">

            <div>

              <strong>
                ${item.title}
              </strong>

              <div class="event-meta">

                ${
                  item.published
                    ? '✅ Veröffentlicht'
                    : '📝 Entwurf'
                }

                ·

                /news/${item.slug}

              </div>

            </div>

            <div class="actions">

              <button type="button" data-open-id="${item.id}">
                ✏
              </button>

              <button type="button" class="delete-button" data-delete-id="${item.id}">
                🗑
              </button>

            </div>

          </div>

        </div>

      `;

    });

  container.querySelectorAll('[data-open-id]').forEach(button => {

    button.addEventListener('click', () => {

      openNews(button.dataset.openId);

    });

  });

  container.querySelectorAll('[data-delete-id]').forEach(button => {

    button.addEventListener('click', () => {

      deleteNews(button.dataset.deleteId);

    });

  });

}

async function deleteNews(id) {

  const confirmDelete =
    confirm(
      'News löschen?'
    );

  if (!confirmDelete) {
    return;
  }

  const { error } =
    await window.supabaseClient
      .from(window.siteConfig.tables.news)
      .delete()
      .eq('id', id);

  if (error) {

    console.error(error);

    return;

  }

  loadNews();

}

function newNews() {

  window.location.href =
    '/admin/news_edit.html';

}

function openNews(id) {

  window.location.href =
    '/admin/news_edit.html?id=' + id;

}

document
  .getElementById('search')
  ?.addEventListener('input', loadNews);

document
  .getElementById('new-news')
  ?.addEventListener('click', newNews);
