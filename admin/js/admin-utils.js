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

function buildAdminSlug(title) {

  return String(title || '')
    .trim()
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replaceAll(' ', '-')
    .replace(/[^\w-]+/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

}

function sanitizeMediaStorageFilename(
  name
) {

  const raw =
    String(name || 'datei').trim();

  const dotIndex =
    raw.lastIndexOf('.');

  const extension =
    dotIndex > 0
      ? raw.slice(dotIndex + 1)
      : '';

  const baseName =
    dotIndex > 0
      ? raw.slice(0, dotIndex)
      : raw;

  let safeBase =
    baseName
      .toLowerCase()
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss')
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

  if (!safeBase) {
    safeBase = 'datei';
  }

  const safeExtension =
    extension
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '')
      .slice(0, 10);

  if (!safeExtension) {
    return safeBase.slice(0, 120);
  }

  return (
    `${safeBase}.${safeExtension}`
      .slice(0, 120)
  );

}

function buildMediaStorageKey(
  fileName
) {

  return (
    `${Date.now()}-${
      sanitizeMediaStorageFilename(
        fileName
      )
    }`
  );

}

function buildMediaStoragePath(
  folderPrefix,
  fileName
) {

  const folder =
    String(folderPrefix || '')
      .trim()
      .replace(/^\/+|\/+$/g, '');

  const fileKey =
    buildMediaStorageKey(fileName);

  if (!folder) {
    return fileKey;
  }

  return `${folder}/${fileKey}`;

}

async function uploadMediaStorageFile(
  folderPrefix,
  file
) {

  if (!file) {
    return {
      error: new Error('Keine Datei'),
      storagePath: null,
      publicUrl: null
    };
  }

  const storagePath =
    buildMediaStoragePath(
      folderPrefix,
      file.name
    );

  const bucket =
    window.siteConfig?.storage?.media
    || 'media';

  const { error } =
    await window.supabaseClient
      .storage
      .from(bucket)
      .upload(storagePath, file);

  if (error) {
    return {
      error,
      storagePath: null,
      publicUrl: null
    };
  }

  const publicUrl =
    typeof resolveMediaPublicUrl === 'function'
      ? resolveMediaPublicUrl(storagePath)
      : window.supabaseClient
        .storage
        .from(bucket)
        .getPublicUrl(storagePath)
        .data?.publicUrl
      || null;

  return {
    error: null,
    storagePath,
    publicUrl
  };

}

function formatMemberLastLogin(value) {

  if (!value) {
    return 'Noch nie';
  }

  const date =
    new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Noch nie';
  }

  return date.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

}

function formatAdminContentCreatorLabel(
  member
) {

  if (!member) {
    return 'Unbekannt';
  }

  if (member.anonymized_at) {
    return 'Anonym (gelöscht)';
  }

  const parts = [
    member.vorname,
    member.nachname
  ].filter(Boolean);

  if (parts.length) {
    return parts.join(' ');
  }

  if (member.email) {
    return member.email;
  }

  return 'Unbekannt';

}

async function fetchAdminMembersByIds(
  memberIds
) {

  const ids = [
    ...new Set(
      (memberIds || [])
        .filter((id) => id != null)
    )
  ];

  if (!ids.length) {
    return new Map();
  }

  const { data, error } =
    await window.supabaseClient
      .from(
        window.siteConfig.tables.members
      )
      .select(
        'id, vorname, nachname, email, anonymized_at'
      )
      .in('id', ids);

  if (error) {

    console.error(error);

    return new Map();

  }

  const map = new Map();

  (data || []).forEach((member) => {
    map.set(member.id, member);
  });

  return map;

}

function resolveAdminContentCreatorLabel(
  memberId,
  creatorMap
) {

  if (!memberId) {
    return null;
  }

  return formatAdminContentCreatorLabel(
    creatorMap?.get(memberId)
  );

}

function showAdminContentCreatorHint(
  memberId,
  creatorMap
) {

  const hint =
    document.querySelector(
      '#admin .page-header p'
    );

  if (!hint || !memberId) {
    return;
  }

  const label =
    resolveAdminContentCreatorLabel(
      memberId,
      creatorMap
    );

  if (!label) {
    return;
  }

  hint.textContent =
    `Erstellt von ${label}`;

}

function memberHasLoggedIn(member) {

  return !!member?.last_login_at;

}

function extractStoragePath(url) {

  if (
    typeof extractMediaStoragePath
      === 'function'
  ) {
    return extractMediaStoragePath(url);
  }

  const split =
    String(url || '')
      .split('/storage/v1/object/public/media/');

  return split[1]?.split('?')[0] || null;

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
