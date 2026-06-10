function escapePreviewBannerHtml(value) {

  if (value === null || value === undefined) {
    return '';
  }

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

}

function renderAdminPreviewBanner() {

  const container =
    document.getElementById(
      'admin-preview-banner'
    );

  if (!container) {
    return;
  }

  if (
    typeof isAdminPreviewActive
      !== 'function'
    || !isAdminPreviewActive()
  ) {

    container.hidden = true;
    container.innerHTML = '';
    document.body.classList.remove(
      'admin-preview-active'
    );

    return;

  }

  const label =
    typeof getAdminPreviewRoleLabel
      === 'function'
      ? getAdminPreviewRoleLabel()
      : 'Vorschau';

  document.body.classList.add(
    'admin-preview-active'
  );

  container.hidden = false;

  container.innerHTML = `
<div class="admin-preview-banner__inner">

  <p class="admin-preview-banner__text">
    <strong>Vorschau aktiv:</strong>
    ${escapePreviewBannerHtml(label)}
  </p>

  <button
    type="button"
    class="admin-preview-banner__end"
    data-preview-end>

    Vorschau beenden

  </button>

</div>
  `.trim();

  container
    .querySelector('[data-preview-end]')
    ?.addEventListener(
      'click',
      () => {

        if (
          typeof clearAdminPreviewRole
            === 'function'
        ) {
          clearAdminPreviewRole();
        }

        if (
          typeof syncContentViewerMember
            === 'function'
        ) {
          syncContentViewerMember();
        }

        renderAdminPreviewBanner();

        if (
          typeof dispatchAdminPreviewChanged
            === 'function'
        ) {
          dispatchAdminPreviewChanged();
        }

      }
    );

}

function initAdminPreviewBanner() {

  renderAdminPreviewBanner();

  window.addEventListener(
    'admin-preview-changed',
    renderAdminPreviewBanner
  );

  window.addEventListener(
    'member-session-ready',
    () => {

      if (
        typeof syncContentViewerMember
          === 'function'
      ) {
        syncContentViewerMember();
      }

      renderAdminPreviewBanner();

    }
  );

}

document.addEventListener(
  'DOMContentLoaded',
  initAdminPreviewBanner
);
