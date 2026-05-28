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
