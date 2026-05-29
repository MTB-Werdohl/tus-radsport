let galleriesListPage = 1;

function formatGalleryDate(dateString) {

  if (!dateString) {
    return '—';
  }

  const date =
    new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleDateString('de-DE');

}

function compareGalleriesByDateDesc(a, b) {

  const aTime =
    a.event_date
      ? new Date(a.event_date).getTime()
      : 0;

  const bTime =
    b.event_date
      ? new Date(b.event_date).getTime()
      : 0;

  if (bTime !== aTime) {
    return bTime - aTime;
  }

  return (b.id || 0) - (a.id || 0);

}

function bindGalleryListActions(container) {

  container.querySelectorAll('[data-open-id]').forEach(button => {

    button.addEventListener('click', () => {

      openGallery(button.dataset.openId);

    });

  });

  container.querySelectorAll('[data-delete-id]').forEach(button => {

    button.addEventListener('click', () => {

      deleteGallery(button.dataset.deleteId);

    });

  });

}

async function loadGalleries() {

  const { data, error } =
    await window.supabaseClient
      .from(window.siteConfig.tables.galleries)
      .select('*')
      .order('event_date', { ascending: false })
      .order('id', { ascending: false });

  if (error) {

    console.error(error);

    alert(
      'Galerien konnten nicht geladen werden: '
      + error.message
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

        return item.title
          ?.toLowerCase()
          .includes(search)

          ||

          item.slug
            ?.toLowerCase()
            .includes(search);

      })
      .sort(compareGalleriesByDateDesc);

  const paged =
    paginateAdminListItems(
      filtered,
      galleriesListPage
    );

  galleriesListPage = paged.page;

  const container =
    document.getElementById('galleries');

  container.innerHTML = '';

  if (!paged.items.length) {

    container.innerHTML =
      paged.totalItems
        ? '<p class="admin-hint">Keine Treffer auf dieser Seite.</p>'
        : '<p class="admin-hint">Noch keine Galerien angelegt.</p>';

    renderAdminPagination({
      containerId: 'galleries-pagination',
      totalItems: paged.totalItems,
      currentPage: paged.page,
      onPageChange(page) {
        galleriesListPage = page;
        loadGalleries();
      }
    });

    return;

  }

  paged.items.forEach(item => {

    const title =
      escapeAdminHtml(item.title || '—');

    const slug =
      escapeAdminHtml(item.slug || '—');

    const date =
      escapeAdminHtml(
        formatGalleryDate(item.event_date)
      );

    container.innerHTML += `

      <div class="event-card">

        <div class="event-header">

          <div>

            <strong>
              ${title}
            </strong>

            <div class="event-meta">

              ${date}

              · /galerie/${slug}

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

  bindGalleryListActions(container);

  renderAdminPagination({
    containerId: 'galleries-pagination',
    totalItems: paged.totalItems,
    currentPage: paged.page,
    onPageChange(page) {
      galleriesListPage = page;
      loadGalleries();
    }
  });

}

async function deleteGallery(id) {

  const confirmDelete =
    confirm(
      'Galerie wirklich löschen? Alle Bilder werden entfernt.'
    );

  if (!confirmDelete) {
    return;
  }

  const { data: images, error: imagesError } =
    await window.supabaseClient
      .from(window.siteConfig.tables.galleryImages)
      .select('id, image_path')
      .eq('gallery_id', id);

  if (imagesError) {

    console.error(imagesError);

    alert(imagesError.message);

    return;

  }

  const storagePaths =
    (images || [])
      .map(image => extractStoragePath(image.image_path))
      .filter(Boolean);

  if (storagePaths.length > 0) {

    const { error: storageError } =
      await window.supabaseClient
        .storage
        .from(window.siteConfig.storage.media)
        .remove(storagePaths);

    if (storageError) {

      console.error(storageError);

      alert(storageError.message);

      return;

    }

  }

  const { error: deleteImagesError } =
    await window.supabaseClient
      .from(window.siteConfig.tables.galleryImages)
      .delete()
      .eq('gallery_id', id);

  if (deleteImagesError) {

    console.error(deleteImagesError);

    alert(deleteImagesError.message);

    return;

  }

  const { error } =
    await window.supabaseClient
      .from(window.siteConfig.tables.galleries)
      .delete()
      .eq('id', id);

  if (error) {

    console.error(error);

    alert(error.message);

    return;

  }

  loadGalleries();

}

function newGallery() {

  window.location.href =
    '/admin/galerie_edit.html';

}

function openGallery(id) {

  window.location.href =
    '/admin/galerie_edit.html?id=' + id;

}

document
  .getElementById('search')
  ?.addEventListener('input', () => {

    galleriesListPage = 1;
    loadGalleries();

  });

document
  .getElementById('new-gallery')
  ?.addEventListener('click', newGallery);
