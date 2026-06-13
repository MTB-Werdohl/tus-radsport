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

      button.addEventListener('click', async () => {

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

        mediaBrowserTreeExpanded.clear();

        if (root.path) {
          mediaBrowserTreeExpanded.add(
            root.path
          );
        }

        renderMediaBrowserRoots();
        await renderMediaBrowserTree();
        await loadMediaBrowserView();

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

      button.addEventListener('click', async () => {

        mediaBrowserCurrentPath =
          button.dataset.mediaPath || '';

        syncMediaBrowserTreeSelection();
        await loadMediaBrowserView();

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
<article
  class="admin-media-browser__row admin-media-explorer-item"
  data-media-file-path="${escapeAdminHtml(file.path)}"
  data-media-file-kind="${escapeAdminHtml(file.kind)}"
  draggable="${canMove ? 'true' : 'false'}">

  ${
    canMove
      ? `
  <button
    type="button"
    class="admin-media-explorer-item__handle"
    data-media-drag-handle
    aria-label="Verschieben"
    title="Ziehen zum Verschieben">

    ☰

  </button>
      `
      : `
  <span class="admin-media-explorer-item__handle admin-media-explorer-item__handle--spacer"></span>
      `
  }

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

  <button
    type="button"
    class="admin-media-explorer-item__menu"
    data-media-context-trigger
    aria-label="Aktionen"
    title="Aktionen">

    ⋮

  </button>

</article>
  `.trim();

}

function renderMediaBrowserFolderRow(
  folder
) {

  const canDrop =
    canDropMediaFileOnFolderTarget(
      folder.path
    );

  return `
<article
  class="admin-media-browser__folder admin-media-explorer-item admin-media-explorer-item--folder${
    canDrop
      ? ' admin-media-drop-target'
      : ''
  }"
  data-media-folder-path="${escapeAdminHtml(folder.path)}"
  data-media-drop-folder="${escapeAdminHtml(folder.path)}">

  <span
    class="admin-media-explorer-item__handle admin-media-explorer-item__handle--spacer"
    aria-hidden="true">

  </span>

  <span
    class="admin-media-explorer-item__folder-icon"
    aria-hidden="true">

    📁

  </span>

  <button
    type="button"
    class="admin-media-explorer-item__folder-open"
    data-media-folder-open="${escapeAdminHtml(folder.path)}">

    ${escapeAdminHtml(folder.name)}

  </button>

  <button
    type="button"
    class="admin-media-explorer-item__menu"
    data-media-context-trigger
    aria-label="Aktionen"
    title="Aktionen">

    ⋮

  </button>

</article>
  `.trim();

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
  updateMediaBrowserUploadButtonState();
  syncMediaBrowserTreeSelection();

  statusEl.textContent =
    'Medien werden geladen …';

  listEl.innerHTML = '';

  const currentCanDrop =
    canDropMediaFileOnFolderTarget(
      mediaBrowserCurrentPath
    );

  listEl.classList.toggle(
    'admin-media-drop-target',
    currentCanDrop
  );

  if (currentCanDrop) {
    listEl.dataset.mediaDropFolder =
      mediaBrowserCurrentPath;
  } else {
    delete listEl.dataset.mediaDropFolder;
  }

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
  ${
    currentCanDrop
      ? ' Dateien hierher ziehen zum Hochladen.'
      : ''
  }
</p>
      `.trim();

    bindMediaBrowserExplorerRoot(
      document.getElementById(
        'media-browser-workspace'
      )
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
  bindMediaBrowserTreeDrawer();
  bindMediaBrowserUploadControl();
  bindMediaBrowserTreeDropTargets();

  document
    .getElementById('media-browser-filter')
    ?.addEventListener('change', (event) => {

      mediaBrowserCurrentFilter =
        event.target.value || 'all';

      loadMediaBrowserView();

    });

  bindMediaBrowserExplorerRoot(
    document.getElementById(
      'media-browser-workspace'
    )
  );

  try {

    await ensureMediaStorageReferenceIndex();

  } catch (error) {

    console.error(error);

    document
      .getElementById('media-browser-status')
      .textContent =
        'Referenzen konnten nicht geladen werden.';

  }

  await renderMediaBrowserTree();
  await loadMediaBrowserView();

}
