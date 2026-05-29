function initAdminUnsavedGuard(options = {}) {

  let dirty = false;

  const root =
    document.querySelector(
      options.rootSelector
      || '#admin'
    );

  if (!root) {
    return { markClean() {} };
  }

  function markDirty() {
    dirty = true;
  }

  root.addEventListener('input', markDirty);
  root.addEventListener('change', markDirty);

  window.addEventListener('beforeunload', (event) => {

    if (!dirty) {
      return;
    }

    event.preventDefault();
    event.returnValue = '';

  });

  root
    .querySelectorAll(
      options.linkSelector
      || 'a.back-button, a[href^="/admin/"]'
    )
    .forEach((link) => {

      link.addEventListener('click', (event) => {

        if (!dirty) {
          return;
        }

        const message =
          options.message
          || 'Ohne Speichern verlassen?';

        if (!window.confirm(message)) {
          event.preventDefault();
        }

      });

    });

  return {
    markClean() {
      dirty = false;
    }
  };

}

window.initAdminUnsavedGuard =
  initAdminUnsavedGuard;

function escapeAdminHtml(value) {

  if (value === null || value === undefined) {
    return '';
  }

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

}

function normalizeMemberId(value) {

  const trimmed =
    String(value || '').trim();

  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed);
  }

  return trimmed;

}

function extractStoragePath(url) {

  const split =
    url.split('/storage/v1/object/public/media/');

  return split[1] || null;

}

function safeMediaUrl(url) {

  if (!url || typeof url !== 'string') {
    return '';
  }

  if (url.startsWith('/')) {
    return escapeAdminHtml(url);
  }

  try {

    const parsed =
      new URL(url);

    if (parsed.protocol !== 'https:') {
      return '';
    }

    const supabaseHost =
      new URL(window.siteConfig.supabaseUrl).hostname;

    if (
      parsed.hostname !== supabaseHost
      || !parsed.pathname.includes('/storage/v1/object/public/media/')
    ) {
      return '';
    }

    return escapeAdminHtml(url);

  } catch (error) {

    return '';

  }

}

const ADMIN_LIST_PAGE_SIZE = 10;

function normalizeAdminListPage(
  page,
  totalItems,
  pageSize
) {

  const size =
    pageSize || ADMIN_LIST_PAGE_SIZE;

  const totalPages =
    Math.max(
      1,
      Math.ceil(totalItems / size)
    );

  const safePage =
    Math.min(
      Math.max(page || 1, 1),
      totalPages
    );

  return {
    page: safePage,
    totalPages,
    pageSize: size
  };

}

function paginateAdminListItems(
  items,
  page,
  pageSize
) {

  const totalItems =
    items.length;

  const normalized =
    normalizeAdminListPage(
      page,
      totalItems,
      pageSize
    );

  const startIndex =
    (normalized.page - 1)
    * normalized.pageSize;

  return {
    items:
      items.slice(
        startIndex,
        startIndex + normalized.pageSize
      ),
    page: normalized.page,
    totalPages: normalized.totalPages,
    totalItems,
    pageSize: normalized.pageSize
  };

}

function renderAdminPagination(
  options
) {

  const containerId =
    options.containerId;

  const totalItems =
    options.totalItems;

  const currentPage =
    options.currentPage;

  const pageSize =
    options.pageSize
    || ADMIN_LIST_PAGE_SIZE;

  const onPageChange =
    options.onPageChange;

  const container =
    document.getElementById(containerId);

  if (!container) {
    return;
  }

  const normalized =
    normalizeAdminListPage(
      currentPage,
      totalItems,
      pageSize
    );

  if (totalItems <= pageSize) {

    container.innerHTML = '';

    return;

  }

  container.innerHTML = `

<div class="admin-pagination">

  <button
    type="button"
    class="secondary-button admin-pagination-prev"
    ${normalized.page <= 1 ? 'disabled' : ''}>

    ← Zurück

  </button>

  <span class="admin-pagination-info">
    Seite ${normalized.page} von ${normalized.totalPages}
    (${totalItems} Einträge)
  </span>

  <button
    type="button"
    class="secondary-button admin-pagination-next"
    ${normalized.page >= normalized.totalPages ? 'disabled' : ''}>

    Weiter →

  </button>

</div>

`;

  container
    .querySelector('.admin-pagination-prev')
    ?.addEventListener('click', () => {

      if (normalized.page <= 1) {
        return;
      }

      onPageChange(normalized.page - 1);

    });

  container
    .querySelector('.admin-pagination-next')
    ?.addEventListener('click', () => {

      if (normalized.page >= normalized.totalPages) {
        return;
      }

      onPageChange(normalized.page + 1);

    });

}

function compareByCreatedDesc(a, b) {

  const aTime =
    a.created_at
      ? new Date(a.created_at).getTime()
      : 0;

  const bTime =
    b.created_at
      ? new Date(b.created_at).getTime()
      : 0;

  if (bTime !== aTime) {
    return bTime - aTime;
  }

  return (b.id || 0) - (a.id || 0);

}
