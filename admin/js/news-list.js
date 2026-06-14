let newsListPage = 1;

function formatNewsCreatedAt(value) {

  if (!value) {
    return '—';
  }

  const date =
    new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

}

function bindNewsListActions(container) {

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

async function loadNews() {

  const { data, error } =
    await window.supabaseClient
      .from(window.siteConfig.tables.news)
      .select('*')
      .order(
        'created_at',
        { ascending: false, nullsFirst: false }
      )
      .order(
        'id',
        { ascending: false }
      );

  if (error) {

    console.error(error);

    alert(
      'Internes konnten nicht geladen werden.'
    );

    return;

  }

  const search =
    document
      .getElementById('search')
      ?.value
      .toLowerCase()
      .trim()
      || '';

  const filtered =
    (data || [])
      .filter(item => {

        if (!search) {
          return true;
        }

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
      .sort(compareByCreatedDesc);

  const paged =
    paginateAdminListItems(
      filtered,
      newsListPage
    );

  newsListPage = paged.page;

  const container =
    document.getElementById('news');

  if (!container) {
    return;
  }

  container.innerHTML = '';

  if (!paged.items.length) {

    container.innerHTML =
      paged.totalItems
        ? '<p class="admin-hint">Keine Treffer auf dieser Seite.</p>'
        : '<p class="admin-hint">Noch kein Internes angelegt.</p>';

    renderAdminPagination({
      containerId: 'news-pagination',
      totalItems: paged.totalItems,
      currentPage: paged.page,
      onPageChange(page) {
        newsListPage = page;
        loadNews();
      }
    });

    return;

  }

  paged.items.forEach(item => {

    container.innerHTML += `

      <div class="event-card">

        <div class="event-header">

          <div>

            <strong>
              ${escapeAdminHtml(item.title)}
            </strong>

            <div class="event-meta">

              ${escapeAdminHtml(formatNewsCreatedAt(item.created_at))}

              ·

              ${escapeAdminHtml(visibilityListLabel(item.sichtbarkeit))}

              ·

              /news/${escapeAdminHtml(item.slug)}

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

  bindNewsListActions(container);

  renderAdminPagination({
    containerId: 'news-pagination',
    totalItems: paged.totalItems,
    currentPage: paged.page,
    onPageChange(page) {
      newsListPage = page;
      loadNews();
    }
  });

}

async function deleteNews(id) {

  const confirmDelete =
    confirm(
      'Internes löschen?'
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

    alert(
      'Internes konnte nicht gelöscht werden.'
    );

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
  ?.addEventListener('input', () => {

    newsListPage = 1;
    loadNews();

  });

document
  .getElementById('new-news')
  ?.addEventListener('click', newNews);
