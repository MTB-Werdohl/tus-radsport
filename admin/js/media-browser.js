let mediaBrowserCurrentRoot =
  'shared';

let mediaBrowserCurrentPath =
  'shared';

let mediaBrowserCurrentFilter =
  'all';

function renderMediaBrowserReferenceLinks(
  references
) {

  const links = [];

  references.termine.forEach((item) => {

    links.push(`
<a href="/admin/termine_edit.html?id=${item.id}">
  Termin: ${escapeAdminHtml(item.title)}${
    item.kind
      ? ` (${escapeAdminHtml(item.kind)})`
      : ''
  }
</a>
    `.trim());

  });

  references.news.forEach((item) => {

    links.push(`
<a href="/admin/news_edit.html?id=${item.id}">
  News: ${escapeAdminHtml(item.title)}
</a>
    `.trim());

  });

  references.gallery.forEach((item) => {

    links.push(`
<a href="/admin/galerie_edit.html?id=${item.galleryId}">
  Galerie #${item.galleryId}
</a>
    `.trim());

  });

  if (!links.length) {
    return '';
  }

  return `
<ul class="admin-media-browser__refs">
  ${links.map((link) => `<li>${link}</li>`).join('')}
</ul>
  `.trim();

}

function renderMediaBrowserRoots() {

  const container =
    document.getElementById(
      'media-browser-roots'
    );

  if (!container) {
    return;
  }

  container.innerHTML =
    MEDIA_STORAGE_ROOTS
      .map((root) => `

<button
  type="button"
  class="admin-media-browser__root${
    root.id === mediaBrowserCurrentRoot
      ? ' is-active'
      : ''
  }"
  data-media-root="${escapeAdminHtml(root.id)}">

  ${escapeAdminHtml(root.label)}

</button>

      `.trim())
      .join('');

  container
    .querySelectorAll('[data-media-root]')
    .forEach((button) => {

      button.addEventListener('click', () => {

        const rootId =
          button.dataset.mediaRoot;

        const root =
          getMediaStorageRootConfig(
            rootId
          );

        mediaBrowserCurrentRoot =
          root.id;

        mediaBrowserCurrentPath =
          root.path;

        renderMediaBrowserRoots();
        loadMediaBrowserView();

      });

    });

}

function renderMediaBrowserBreadcrumb() {

  const container =
    document.getElementById(
      'media-browser-breadcrumb'
    );

  if (!container) {
    return;
  }

  const root =
    getMediaStorageRootConfig(
      mediaBrowserCurrentRoot
    );

  const currentPath =
    normalizeMediaStorageBrowserPath(
      mediaBrowserCurrentPath
    );

  const crumbs = [];

  crumbs.push(`
<button
  type="button"
  class="admin-media-browser__crumb"
  data-media-path="${escapeAdminHtml(root.path)}">

  ${escapeAdminHtml(root.label)}

</button>
  `.trim());

  let relativePath =
    currentPath;

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

  const parts =
    relativePath
      ? relativePath.split('/')
      : [];

  let builtPath =
    root.path;

  parts.forEach((part) => {

    builtPath =
      builtPath
        ? `${builtPath}/${part}`
        : part;

    crumbs.push(`
<button
  type="button"
  class="admin-media-browser__crumb"
  data-media-path="${escapeAdminHtml(builtPath)}">

  ${escapeAdminHtml(part)}

</button>
    `.trim());

  });

  container.innerHTML =
    crumbs.join('<span aria-hidden="true"> / </span>');

  container
    .querySelectorAll('[data-media-path]')
    .forEach((button) => {

      button.addEventListener('click', () => {

        mediaBrowserCurrentPath =
          button.dataset.mediaPath || '';

        loadMediaBrowserView();

      });

    });

}

async function copyTextToClipboard(
  value,
  successMessage
) {

  try {

    await navigator.clipboard.writeText(
      value
    );

    if (successMessage) {
      window.alert(successMessage);
    }

  } catch (error) {

    console.error(error);

    window.prompt(
      'Kopieren:',
      value
    );

  }

}

function renderMediaBrowserFileRow(
  file
) {

  const references =
    findMediaStorageReferences(
      file.path
    );

  const publicUrl =
    resolveMediaPublicUrl(
      file.path
    ) || '';

  const isLegacy =
    !file.path.includes('/');

  const canMove =
    canMoveMediaStoragePath(
      file.path
    );

  const canDelete =
    canDeleteMediaStoragePath(
      file.path
    );

  const manageActionsHtml =
    canMove || canDelete
      ? `
    ${
      canMove
        ? `
    <button
      type="button"
      class="secondary-button"
      data-media-rename="${escapeAdminHtml(file.path)}">

      Umbenennen

    </button>

    <button
      type="button"
      class="secondary-button"
      data-media-move="${escapeAdminHtml(file.path)}">

      Verschieben

    </button>
        `
        : ''
    }

    ${
      canDelete
        ? `
    <button
      type="button"
      class="danger-button"
      data-media-delete="${escapeAdminHtml(file.path)}">

      Löschen

    </button>
        `
        : ''
    }
      `
      : '';

  const previewHtml =
    file.kind === 'image'
      && publicUrl
      ? `
<img
  class="admin-media-browser__thumb"
  src="${escapeAdminHtml(publicUrl)}"
  alt="">
      `
      : `
<span class="admin-media-browser__thumb admin-media-browser__thumb--file">
  ${file.kind === 'gpx' ? 'GPX' : 'Datei'}
</span>
      `;

  return `
<article class="admin-media-browser__row">

  ${previewHtml}

  <div class="admin-media-browser__meta">

    <h2 class="admin-media-browser__name">
      ${escapeAdminHtml(
        formatMediaFileLabel(
          file.path
        )
      )}
      ${
        isLegacy
          ? '<span class="admin-media-badge admin-media-badge--legacy">Legacy</span>'
          : ''
      }
    </h2>

    <p class="admin-media-browser__path">
      ${escapeAdminHtml(file.path)}
    </p>

    <p class="admin-media-browser__refs-summary">
      ${escapeAdminHtml(
        renderMediaStorageReferenceSummary(
          references
        )
      )}
    </p>

    ${renderMediaBrowserReferenceLinks(
      references
    )}

  </div>

  <div class="admin-media-browser__actions">

    <button
      type="button"
      class="secondary-button"
      data-copy-path="${escapeAdminHtml(file.path)}">

      Pfad kopieren

    </button>

    ${
      publicUrl
        ? `
    <button
      type="button"
      class="secondary-button"
      data-copy-url="${escapeAdminHtml(publicUrl)}">

      URL kopieren

    </button>

    <a
      class="secondary-button"
      href="${escapeAdminHtml(publicUrl)}"
      target="_blank"
      rel="noopener">

      Öffnen

    </a>
        `
        : ''
    }

    ${manageActionsHtml}

  </div>

</article>
  `.trim();

}

function renderMediaBrowserFolderRow(
  folder
) {

  return `
<button
  type="button"
  class="admin-media-browser__folder"
  data-media-folder="${escapeAdminHtml(folder.path)}">

  📁 ${escapeAdminHtml(folder.name)}

</button>
  `.trim();

}

function bindMediaBrowserListActions(
  container,
  files
) {

  const fileByPath =
    new Map(
      (files || []).map((file) => [
        file.path,
        file
      ])
    );

  container
    .querySelectorAll('[data-media-folder]')
    .forEach((button) => {

      button.addEventListener('click', () => {

        mediaBrowserCurrentPath =
          button.dataset.mediaFolder || '';

        loadMediaBrowserView();

      });

    });

  container
    .querySelectorAll('[data-copy-path]')
    .forEach((button) => {

      button.addEventListener('click', () => {

        copyTextToClipboard(
          button.dataset.copyPath,
          'Pfad kopiert.'
        );

      });

    });

  container
    .querySelectorAll('[data-copy-url]')
    .forEach((button) => {

      button.addEventListener('click', () => {

        copyTextToClipboard(
          button.dataset.copyUrl,
          'URL kopiert.'
        );

      });

    });

  container
    .querySelectorAll('[data-media-rename]')
    .forEach((button) => {

      button.addEventListener('click', () => {

        const file =
          fileByPath.get(
            button.dataset.mediaRename
          );

        if (file) {
          promptRenameMediaStorageFile(
            file
          );
        }

      });

    });

  container
    .querySelectorAll('[data-media-move]')
    .forEach((button) => {

      button.addEventListener('click', () => {

        const file =
          fileByPath.get(
            button.dataset.mediaMove
          );

        if (file) {
          promptMoveMediaStorageFile(
            file
          );
        }

      });

    });

  container
    .querySelectorAll('[data-media-delete]')
    .forEach((button) => {

      button.addEventListener('click', () => {

        const file =
          fileByPath.get(
            button.dataset.mediaDelete
          );

        if (file) {
          promptDeleteMediaStorageFile(
            file
          );
        }

      });

    });

}

async function loadMediaBrowserView() {

  const statusEl =
    document.getElementById(
      'media-browser-status'
    );

  const listEl =
    document.getElementById(
      'media-browser-list'
    );

  if (
    !statusEl
    || !listEl
  ) {
    return;
  }

  renderMediaBrowserBreadcrumb();

  statusEl.textContent =
    'Medien werden geladen …';

  listEl.innerHTML = '';

  try {

    const listing =
      await listMediaStorageEntries(
        mediaBrowserCurrentPath,
        {
          rootId:
            mediaBrowserCurrentRoot,
          kindFilter:
            mediaBrowserCurrentFilter
        }
      );

    const folders =
      listing.folders;

    const files =
      listing.files;

    const totalItems =
      folders.length
      + files.length;

    statusEl.textContent =
      totalItems
        ? `${totalItems} Einträge in ${
          mediaBrowserCurrentPath
            || 'Root'
        }`
        : 'Keine Einträge in diesem Ordner.';

    const html = [
      ...folders.map(
        renderMediaBrowserFolderRow
      ),
      ...files.map(
        renderMediaBrowserFileRow
      )
    ].join('');

    listEl.innerHTML =
      html
      || `
<p class="admin-hint">
  Keine passenden Dateien für den gewählten Filter.
</p>
      `.trim();

    bindMediaBrowserListActions(
      listEl,
      files
    );

  } catch (error) {

    console.error(error);

    statusEl.textContent =
      'Medien konnten nicht geladen werden.';

    listEl.innerHTML = `
<p class="admin-hint admin-hint--error">
  ${escapeAdminHtml(
    error.message || 'Unbekannter Fehler'
  )}
</p>
    `.trim();

  }

}

async function initMediaBrowser() {

  renderMediaBrowserRoots();

  document
    .getElementById('media-browser-filter')
    ?.addEventListener('change', (event) => {

      mediaBrowserCurrentFilter =
        event.target.value || 'all';

      loadMediaBrowserView();

    });

  try {

    await ensureMediaStorageReferenceIndex();

  } catch (error) {

    console.error(error);

    document
      .getElementById('media-browser-status')
      .textContent =
        'Referenzen konnten nicht geladen werden.';

  }

  await loadMediaBrowserView();

}
