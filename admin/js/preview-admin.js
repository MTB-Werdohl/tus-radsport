function updatePreviewAdminStatus() {

  const statusEl =
    document.getElementById(
      'admin-preview-status'
    );

  const endBtn =
    document.querySelector(
      '[data-preview-end]'
    );

  if (
    !statusEl
    || typeof isAdminPreviewActive
      !== 'function'
  ) {
    return;
  }

  if (isAdminPreviewActive()) {

    statusEl.hidden = false;

    statusEl.textContent =
      `Aktive Vorschau: ${
        getAdminPreviewRoleLabel()
      }`;

    if (endBtn) {
      endBtn.hidden = false;
    }

    return;

  }

  statusEl.hidden = true;
  statusEl.textContent = '';

  if (endBtn) {
    endBtn.hidden = true;
  }

}

function bindPreviewAdminActions() {

  document
    .querySelectorAll('[data-preview-role]')
    .forEach((button) => {

      button.addEventListener(
        'click',
        () => {

          const role =
            button.dataset.previewRole;

          if (
            !role
            || typeof setAdminPreviewRole
              !== 'function'
          ) {
            return;
          }

          setAdminPreviewRole(role);

          if (
            typeof syncContentViewerMember
              === 'function'
          ) {
            syncContentViewerMember();
          }

          if (
            typeof dispatchAdminPreviewChanged
              === 'function'
          ) {
            dispatchAdminPreviewChanged();
          }

          updatePreviewAdminStatus();

          window.location.href = '/';

        }
      );

    });

  document
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

        if (
          typeof dispatchAdminPreviewChanged
            === 'function'
        ) {
          dispatchAdminPreviewChanged();
        }

        updatePreviewAdminStatus();

      }
    );

}

function initPreviewAdminPage() {

  bindPreviewAdminActions();
  updatePreviewAdminStatus();

}
