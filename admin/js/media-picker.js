let activeMediaPickerDialog = null;

function removeMediaPickerDialog() {

  activeMediaPickerDialog?.remove();
  activeMediaPickerDialog = null;

}

function getMediaPickerKindLabel(
  kind
) {

  if (kind === 'gpx') {
    return 'GPX';
  }

  if (kind === 'image') {
    return 'Bild';
  }

  return 'Datei';

}

function renderAdminSelectedMediaPreview(
  containerId,
  kind,
  selection
) {

  const container =
    document.getElementById(
      containerId
    );

  if (!container) {
    return;
  }

  if (
    !selection
    || !selection.storagePath
  ) {
    container.innerHTML = '';
    return;
  }

  const publicUrl =
    selection.publicUrl
    || resolveMediaPublicUrl(
      selection.storagePath
    );

  const pathHint = `
<p class="admin-media-path">
  Pfad: ${escapeAdminHtml(selection.storagePath)}
</p>
  `.trim();

  if (
    kind === 'image'
    && publicUrl
  ) {

    container.innerHTML = `
<p>Aus Mediathek gewählt:</p>
<img
  src="${safeMediaUrl(publicUrl)}"
  class="preview-image"
  alt="">
${pathHint}
    `.trim();

    return;

  }

  container.innerHTML = `
<p>Aus Mediathek gewählt:</p>
<div class="gpx-name">
  ${escapeAdminHtml(
    selection.label
    || formatMediaFileLabel(
      selection.storagePath
    )
  )}
</div>
${pathHint}
  `.trim();

}

function readMediaPickerHiddenPath(
  hiddenInputId
) {

  const value =
    document
      .getElementById(hiddenInputId)
      ?.value
      ?.trim();

  return value || null;

}

function writeMediaPickerHiddenPath(
  hiddenInputId,
  storagePath
) {

  const input =
    document.getElementById(
      hiddenInputId
    );

  if (!input) {
    return;
  }

  input.value =
    storagePath || '';

}

function clearMediaPickerSelection(
  config
) {

  writeMediaPickerHiddenPath(
    config.hiddenInputId,
    ''
  );

  renderAdminSelectedMediaPreview(
    config.previewContainerId,
    config.kind,
    null
  );

  if (config.fileInputId) {

    const fileInput =
      document.getElementById(
        config.fileInputId
      );

    if (fileInput) {
      fileInput.value = '';
    }

  }

}

function applyMediaPickerSelection(
  config,
  selection
) {

  if (
    !selection
    || !selection.storagePath
  ) {
    return;
  }

  if (config.fileInputId) {

    const fileInput =
      document.getElementById(
        config.fileInputId
      );

    if (fileInput) {
      fileInput.value = '';
    }

  }

  writeMediaPickerHiddenPath(
    config.hiddenInputId,
    selection.storagePath
  );

  renderAdminSelectedMediaPreview(
    config.previewContainerId,
    config.kind,
    selection
  );

  if (
    typeof config.onSelect
      === 'function'
  ) {
    config.onSelect(selection);
  }

  const root =
    document.querySelector('#admin');

  if (root) {
    root.dispatchEvent(
      new Event('change', {
        bubbles: true
      })
    );
  }

}

function renderMediaPickerRecentItems(
  container,
  kind,
  onSelect
) {

  const items =
    buildRecentlyUsedMediaPaths(
      kind,
      20
    );

  if (!items.length) {

    container.innerHTML = `
<p class="admin-hint">
  Noch keine ${escapeAdminHtml(
    getMediaPickerKindLabel(kind)
  )}-Dateien in Terminen oder News.
</p>
    `.trim();

    return;

  }

  container.innerHTML =
    items
      .map((item) => {

        const publicUrl =
          resolveMediaPublicUrl(
            item.path
          ) || '';

        const preview =
          item.kind === 'image'
          && publicUrl
            ? `
<img
  class="admin-media-picker__thumb"
  src="${escapeAdminHtml(publicUrl)}"
  alt="">
            `
            : `
<span class="admin-media-picker__thumb admin-media-picker__thumb--file">
  ${item.kind === 'gpx' ? 'GPX' : 'Datei'}
</span>
            `;

        return `
<button
  type="button"
  class="admin-media-picker__item"
  data-media-path="${escapeAdminHtml(item.path)}">

  ${preview}

  <span class="admin-media-picker__item-copy">

    <strong>
      ${escapeAdminHtml(item.label)}
    </strong>

    <span class="admin-media-picker__item-path">
      ${escapeAdminHtml(item.path)}
    </span>

  </span>

</button>
        `.trim();

      })
      .join('');

  container
    .querySelectorAll('[data-media-path]')
    .forEach((button) => {

      button.addEventListener('click', () => {

        const selection =
          resolveMediaSelectionFromPath(
            button.dataset.mediaPath
          );

        if (selection) {
          onSelect(selection);
        }

      });

    });

}

async function renderMediaPickerBrowseView(
  container,
  state,
  kind,
  onSelect
) {

  container.innerHTML = `
<p class="admin-hint">
  Medien werden geladen …
</p>
  `.trim();

  try {

    const listing =
      await listMediaStorageEntries(
        state.currentPath,
        {
          rootId: state.rootId,
          kindFilter: kind
        }
      );

    const crumbs = [];
    const root =
      getMediaStorageRootConfig(
        state.rootId
      );

    crumbs.push(`
<button
  type="button"
  class="admin-media-picker__crumb"
  data-media-picker-path="${escapeAdminHtml(root.path)}">

  ${escapeAdminHtml(root.label)}

</button>
    `.trim());

    let relativePath =
      normalizeMediaStorageBrowserPath(
        state.currentPath
      );

    if (
      root.path
      && (
        relativePath === root.path
        || relativePath.startsWith(
          `${root.path}/`
        )
      )
    ) {

      relativePath =
        relativePath === root.path
          ? ''
          : relativePath.slice(
            root.path.length + 1
          );

    }

    let builtPath =
      root.path;

    relativePath
      .split('/')
      .filter(Boolean)
      .forEach((part) => {

        builtPath =
          builtPath
            ? `${builtPath}/${part}`
            : part;

        crumbs.push(`
<button
  type="button"
  class="admin-media-picker__crumb"
  data-media-picker-path="${escapeAdminHtml(builtPath)}">

  ${escapeAdminHtml(part)}

</button>
        `.trim());

      });

    const foldersHtml =
      listing.folders
        .map((folder) => `
<button
  type="button"
  class="admin-media-picker__folder"
  data-media-picker-path="${escapeAdminHtml(folder.path)}">

  📁 ${escapeAdminHtml(folder.name)}

</button>
        `.trim())
        .join('');

    const filesHtml =
      listing.files
        .map((file) => {

          const publicUrl =
            resolveMediaPublicUrl(
              file.path
            ) || '';

          const preview =
            file.kind === 'image'
            && publicUrl
              ? `
<img
  class="admin-media-picker__thumb"
  src="${escapeAdminHtml(publicUrl)}"
  alt="">
              `
              : `
<span class="admin-media-picker__thumb admin-media-picker__thumb--file">
  GPX
</span>
              `;

          return `
<button
  type="button"
  class="admin-media-picker__item"
  data-media-path="${escapeAdminHtml(file.path)}">

  ${preview}

  <span class="admin-media-picker__item-copy">

    <strong>
      ${escapeAdminHtml(
        formatMediaFileLabel(
          file.path
        )
      )}
    </strong>

    <span class="admin-media-picker__item-path">
      ${escapeAdminHtml(file.path)}
    </span>

  </span>

</button>
          `.trim();

        })
        .join('');

    container.innerHTML = `
<nav
  class="admin-media-picker__breadcrumb"
  aria-label="Ordnerpfad">

  ${crumbs.join('<span aria-hidden="true"> / </span>')}

</nav>

<div class="admin-media-picker__list">

  ${foldersHtml}
  ${filesHtml}

</div>
    `.trim();

    if (
      !listing.folders.length
      && !listing.files.length
    ) {

      container.querySelector(
        '.admin-media-picker__list'
      ).innerHTML = `
<p class="admin-hint">
  Keine passenden Dateien in diesem Ordner.
</p>
      `.trim();

    }

    container
      .querySelectorAll(
        '[data-media-picker-path]'
      )
      .forEach((button) => {

        button.addEventListener('click', () => {

          state.currentPath =
            button.dataset.mediaPickerPath
            || '';

          state.rootId =
            inferMediaStorageRootId(
              state.currentPath
            );

          renderMediaPickerBrowseView(
            container,
            state,
            kind,
            onSelect
          );

        });

      });

    container
      .querySelectorAll('[data-media-path]')
      .forEach((button) => {

        button.addEventListener('click', () => {

          const selection =
            resolveMediaSelectionFromPath(
              button.dataset.mediaPath
            );

          if (selection) {
            onSelect(selection);
          }

        });

      });

  } catch (error) {

    console.error(error);

    container.innerHTML = `
<p class="admin-hint admin-hint--error">
  ${escapeAdminHtml(
    error.message || 'Unbekannter Fehler'
  )}
</p>
    `.trim();

  }

}

async function renderMediaPickerPanel(
  panelEl,
  tab,
  state,
  options,
  onSelect
) {

  if (tab === 'recent') {

    renderMediaPickerRecentItems(
      panelEl,
      options.kind,
      onSelect
    );

    return;

  }

  await renderMediaPickerBrowseView(
    panelEl,
    state,
    options.kind,
    onSelect
  );

}

async function openMediaPicker(
  options
) {

  await ensureMediaStorageReferenceIndex();

  removeMediaPickerDialog();

  const dialog =
    document.createElement('dialog');

  dialog.className =
    'admin-media-picker';

  dialog.id =
    'media-picker-dialog';

  const kindLabel =
    getMediaPickerKindLabel(
      options.kind
    );

  dialog.innerHTML = `
<form method="dialog" class="admin-media-picker__form">

  <div class="admin-media-picker__header">

    <h2 class="admin-media-picker__title">
      ${escapeAdminHtml(
        options.title
        || `${kindLabel} aus Mediathek`
      )}
    </h2>

    <button
      type="button"
      class="admin-media-picker__close"
      data-media-picker-close
      aria-label="Schließen">

      ✕

    </button>

  </div>

  <div class="admin-media-picker__tabs">

    <button
      type="button"
      class="admin-media-picker__tab is-active"
      data-media-picker-tab="recent">

      Zuletzt verwendet

    </button>

    <button
      type="button"
      class="admin-media-picker__tab"
      data-media-picker-tab="browse">

      Storage

    </button>

  </div>

  <div
    class="admin-media-picker__panel"
    id="media-picker-panel">

  </div>

  <div class="admin-media-picker__footer">

    ${
      options.fileInputId
        ? `
    <button
      type="button"
      class="secondary-button"
      data-media-picker-upload>

      Neue Datei hochladen

    </button>
        `
        : ''
    }

    <button
      type="button"
      class="secondary-button"
      data-media-picker-close>

      Abbrechen

    </button>

  </div>

</form>
  `.trim();

  document.body.appendChild(dialog);

  activeMediaPickerDialog = dialog;

  const panelEl =
    dialog.querySelector(
      '#media-picker-panel'
    );

  const browseState = {
    rootId: 'shared',
    currentPath:
      getDefaultMediaBrowsePathForKind(
        options.kind
      )
  };

  let activeTab = 'recent';

  const handleSelect = (selection) => {

    applyMediaPickerSelection(
      options,
      selection
    );

    dialog.close();
    removeMediaPickerDialog();

  };

  const renderActivePanel = async () => {

    dialog
      .querySelectorAll(
        '[data-media-picker-tab]'
      )
      .forEach((button) => {

        button.classList.toggle(
          'is-active',
          button.dataset.mediaPickerTab
            === activeTab
        );

      });

    await renderMediaPickerPanel(
      panelEl,
      activeTab,
      browseState,
      options,
      handleSelect
    );

  };

  dialog
    .querySelectorAll(
      '[data-media-picker-tab]'
    )
    .forEach((button) => {

      button.addEventListener('click', () => {

        activeTab =
          button.dataset.mediaPickerTab
          || 'recent';

        renderActivePanel();

      });

    });

  dialog
    .querySelectorAll(
      '[data-media-picker-close]'
    )
    .forEach((button) => {

      button.addEventListener('click', () => {

        dialog.close();
        removeMediaPickerDialog();

      });

    });

  dialog
    .querySelector(
      '[data-media-picker-upload]'
    )
    ?.addEventListener('click', () => {

      dialog.close();
      removeMediaPickerDialog();

      const fileInput =
        document.getElementById(
          options.fileInputId
        );

      if (fileInput) {
        fileInput.click();
      }

    });

  dialog.addEventListener('close', () => {
    removeMediaPickerDialog();
  });

  await renderActivePanel();

  if (
    typeof dialog.showModal === 'function'
  ) {
    dialog.showModal();
  }

}

function bindMediaPickerButton(
  buttonId,
  config
) {

  const button =
    document.getElementById(
      buttonId
    );

  if (!button) {
    return;
  }

  button.addEventListener('click', () => {

    openMediaPicker(config)
      .catch((error) => {

        console.error(error);

        window.alert(
          'Mediathek konnte nicht geöffnet werden.'
        );

      });

  });

  if (config.fileInputId) {

    document
      .getElementById(
        config.fileInputId
      )
      ?.addEventListener('change', () => {

        clearMediaPickerSelection(
          config
        );

      });

  }

}

function applySavedMediaPickerSelection(
  config,
  storagePath
) {

  if (!storagePath) {
    return;
  }

  const selection =
    resolveMediaSelectionFromPath(
      storagePath
    );

  if (!selection) {
    return;
  }

  writeMediaPickerHiddenPath(
    config.hiddenInputId,
    selection.storagePath
  );

  renderAdminSelectedMediaPreview(
    config.previewContainerId,
    config.kind,
    selection
  );

}

function resolveMediaPickerSelectionForSave(
  hiddenInputId,
  existingStoragePath,
  existingPublicUrl
) {

  const pickedPath =
    readMediaPickerHiddenPath(
      hiddenInputId
    );

  if (pickedPath) {

    return {
      storagePath: pickedPath,
      publicUrl:
        resolveMediaPublicUrl(
          pickedPath
        )
        || existingPublicUrl
        || null
    };

  }

  if (existingStoragePath) {

    return {
      storagePath:
        existingStoragePath,
      publicUrl:
        existingPublicUrl
        || resolveMediaPublicUrl(
          existingStoragePath
        )
        || null
    };

  }

  return {
    storagePath: null,
    publicUrl:
      existingPublicUrl || null
  };

}
