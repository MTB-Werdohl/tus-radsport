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
    document.querySelector('#vorstand-page');

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

function getMediaPickerKindRootPath(
  kind
) {

  return getDefaultMediaBrowsePathForKind(
    kind
  );

}

function isMemberMediaPicker(
  options
) {

  return options?.pickerMode === 'member';

}

function buildMemberMediaPickerBreadcrumbs(
  state,
  kind
) {

  const kindRoot =
    getMediaPickerKindRootPath(kind);

  const currentPath =
    normalizeMediaStorageBrowserPath(
      state.currentPath
    );

  if (
    !currentPath
    || currentPath === kindRoot
  ) {
    return [];
  }

  if (
    !currentPath.startsWith(
      `${kindRoot}/`
    )
  ) {
    return [];
  }

  const relative =
    currentPath.slice(
      kindRoot.length + 1
    );

  const parts =
    relative
      .split('/')
      .filter(Boolean);

  const crumbs = [
    {
      label: '← Zurück',
      path: kindRoot
    }
  ];

  let builtPath =
    kindRoot;

  parts.forEach((part) => {

    builtPath =
      `${builtPath}/${part}`;

    crumbs.push({
      label: part,
      path: builtPath
    });

  });

  return crumbs;

}

function buildMediaPickerBreadcrumbs(
  state,
  options
) {

  if (isMemberMediaPicker(options)) {

    return buildMemberMediaPickerBreadcrumbs(
      state,
      options.kind
    );

  }

  const crumbs = [];

  const root =
    getMediaStorageRootConfig(
      state.rootId
    );

  crumbs.push({
    label: root.label,
    path: root.path
  });

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

      crumbs.push({
        label: part,
        path: builtPath
      });

    });

  return crumbs;

}

function renderMediaPickerFileItemHtml(
  file,
  options
) {

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

  const pathMarkup =
    isMemberMediaPicker(options)
      ? ''
      : `
    <span class="admin-media-picker__item-path">
      ${escapeAdminHtml(file.path)}
    </span>
      `.trim();

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

    ${pathMarkup}

  </span>

</button>
  `.trim();

}

async function renderMediaPickerBrowseView(
  container,
  state,
  kind,
  onSelect,
  options = {}
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

    const breadcrumbItems =
      buildMediaPickerBreadcrumbs(
        state,
        {
          ...options,
          kind
        }
      );

    const crumbsHtml =
      breadcrumbItems
        .map((crumb) => `
<button
  type="button"
  class="admin-media-picker__crumb"
  data-media-picker-path="${escapeAdminHtml(crumb.path)}">

  ${escapeAdminHtml(crumb.label)}

</button>
        `.trim())
        .join('<span aria-hidden="true"> / </span>');

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
        .map((file) =>
          renderMediaPickerFileItemHtml(
            file,
            options
          )
        )
        .join('');

    const breadcrumbMarkup =
      crumbsHtml
        ? `
<nav
  class="admin-media-picker__breadcrumb"
  aria-label="Ordnerpfad">

  ${crumbsHtml}

</nav>
        `.trim()
        : '';

    container.innerHTML = `
${breadcrumbMarkup}

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
            onSelect,
            options
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
    onSelect,
    options
  );

}

async function openMediaPicker(
  options
) {

  await ensureMediaStorageReferenceIndex();

  removeMediaPickerDialog();

  const memberPicker =
    isMemberMediaPicker(options);

  const dialog =
    document.createElement('dialog');

  dialog.className =
    memberPicker
      ? 'admin-media-picker admin-media-picker--member'
      : 'admin-media-picker';

  dialog.id =
    'media-picker-dialog';

  const kindLabel =
    getMediaPickerKindLabel(
      options.kind
    );

  const tabsMarkup =
    memberPicker
      ? ''
      : `
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
      `.trim();

  const adminUploadMarkup =
    options.fileInputId
      ? `
    <button
      type="button"
      class="secondary-button"
      data-media-picker-upload>

      Neue Datei hochladen

    </button>
        `
      : '';

  const memberUploadMarkup =
    memberPicker
      ? `
    <button
      type="button"
      class="member-edit-btn member-edit-btn--secondary"
      data-media-picker-member-upload>

      Hochladen

    </button>
        `
      : '';

  const cancelButtonClass =
    memberPicker
      ? 'member-edit-btn member-edit-btn--secondary'
      : 'secondary-button';

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

  ${tabsMarkup}

  <div
    class="admin-media-picker__panel"
    id="media-picker-panel">

  </div>

  <div class="admin-media-picker__footer">

    ${adminUploadMarkup}

    <button
      type="button"
      class="${cancelButtonClass}"
      data-media-picker-close>

      Abbrechen

    </button>

    ${memberUploadMarkup}

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

  let activeTab =
    memberPicker
      ? 'browse'
      : 'recent';

  const handleSelect = (selection) => {

    applyMediaPickerSelection(
      options,
      selection
    );

    dialog.close();
    removeMediaPickerDialog();

  };

  const renderActivePanel = async () => {

    if (!memberPicker) {

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

    }

    await renderMediaPickerPanel(
      panelEl,
      activeTab,
      browseState,
      options,
      handleSelect
    );

  };

  if (!memberPicker) {

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

  }

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

  if (memberPicker) {

    const memberFileInput =
      document.createElement('input');

    memberFileInput.type = 'file';
    memberFileInput.hidden = true;
    memberFileInput.accept =
      options.kind === 'gpx'
        ? '.gpx,application/gpx+xml'
        : 'image/*';

    dialog
      .querySelector('.admin-media-picker__form')
      ?.appendChild(memberFileInput);

    dialog
      .querySelector(
        '[data-media-picker-member-upload]'
      )
      ?.addEventListener('click', () => {
        memberFileInput.click();
      });

    memberFileInput.addEventListener(
      'change',
      async () => {

        const file =
          memberFileInput.files?.[0];

        memberFileInput.value = '';

        if (!file) {
          return;
        }

        if (
          options.kind === 'gpx'
          && !/\.gpx$/i.test(file.name)
        ) {

          window.alert(
            'Bitte eine GPX-Datei wählen.'
          );

          return;

        }

        if (
          options.kind === 'image'
          && !file.type.startsWith('image/')
        ) {

          window.alert(
            'Bitte eine Bilddatei wählen.'
          );

          return;

        }

        if (
          typeof uploadMemberMediaStorageFile
            !== 'function'
        ) {

          window.alert(
            'Upload ist derzeit nicht verfügbar.'
          );

          return;

        }

        const uploadButton =
          dialog.querySelector(
            '[data-media-picker-member-upload]'
          );

        if (uploadButton) {
          uploadButton.disabled = true;
          uploadButton.textContent =
            'Wird hochgeladen …';
        }

        const upload =
          await uploadMemberMediaStorageFile(
            browseState.currentPath,
            file
          );

        if (uploadButton) {
          uploadButton.disabled = false;
          uploadButton.textContent =
            'Hochladen';
        }

        if (upload.error) {

          console.error(upload.error);

          window.alert(
            upload.error.message
            || 'Upload fehlgeschlagen.'
          );

          return;

        }

        await renderActivePanel();

      }
    );

  }

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
