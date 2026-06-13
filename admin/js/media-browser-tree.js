const mediaBrowserTreeCache =
  new Map();

const mediaBrowserTreeExpanded =
  new Set([
    'shared::shared'
  ]);

function getMediaBrowserNodeKey(
  rootId,
  folderPath
) {

  return (
    `${rootId}::${
      normalizeMediaStorageBrowserPath(
        folderPath
      )
    }`
  );

}

function invalidateMediaBrowserTreeCache(
  pathPrefix
) {

  if (!pathPrefix) {
    mediaBrowserTreeCache.clear();
    return;
  }

  const prefix =
    normalizeMediaStorageBrowserPath(
      pathPrefix
    );

  for (const key of mediaBrowserTreeCache.keys()) {

    if (
      key.endsWith(`::${prefix}`)
      || key.includes(`::${prefix}/`)
    ) {
      mediaBrowserTreeCache.delete(key);
    }

  }

}

async function loadMediaBrowserTreeContents(
  folderPath,
  rootId
) {

  const path =
    normalizeMediaStorageBrowserPath(
      folderPath
    );

  const cacheKey =
    getMediaBrowserNodeKey(
      rootId,
      path
    );

  if (mediaBrowserTreeCache.has(cacheKey)) {
    return mediaBrowserTreeCache.get(cacheKey);
  }

  const listing =
    await listMediaStorageEntries(
      path,
      {
        rootId,
        kindFilter:
          mediaBrowserCurrentFilter
      }
    );

  mediaBrowserTreeCache.set(
    cacheKey,
    listing
  );

  return listing;

}

function isMediaBrowserNodeExpanded(
  rootId,
  folderPath
) {

  return mediaBrowserTreeExpanded.has(
    getMediaBrowserNodeKey(
      rootId,
      folderPath
    )
  );

}

function toggleMediaBrowserNodeExpanded(
  rootId,
  folderPath
) {

  const nodeKey =
    getMediaBrowserNodeKey(
      rootId,
      folderPath
    );

  if (
    mediaBrowserTreeExpanded.has(
      nodeKey
    )
  ) {
    mediaBrowserTreeExpanded.delete(
      nodeKey
    );
    return false;
  }

  mediaBrowserTreeExpanded.add(
    nodeKey
  );

  return true;

}

function syncMediaBrowserTreeSelection() {

  const selectedPath =
    normalizeMediaStorageBrowserPath(
      mediaBrowserCurrentPath
    );

  const selectedKey =
    getMediaBrowserNodeKey(
      mediaBrowserCurrentRoot,
      selectedPath
    );

  document
    .querySelectorAll(
      '[data-media-tree-folder]'
    )
    .forEach((button) => {

      const nodeKey =
        button.dataset.mediaTreeFolder
        || '';

      button.classList.toggle(
        'is-selected',
        nodeKey === selectedKey
      );

    });

}

function renderMediaBrowserFileTreeNode(
  file,
  rootId,
  depth
) {

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

  const iconHtml =
    file.kind === 'image'
    && publicUrl
      ? `
<img
  class="admin-media-tree__mini-thumb"
  src="${escapeAdminHtml(publicUrl)}"
  alt="">
      `
      : `
<span class="admin-media-tree__file-icon">
  ${file.kind === 'gpx' ? 'GPX' : '📄'}
</span>
      `;

  return `
<li class="admin-media-tree__item admin-media-tree__item--file">

  <div
    class="admin-media-tree__row admin-media-explorer-item"
    style="--tree-depth:${depth}"
    data-media-file-path="${escapeAdminHtml(file.path)}"
    data-media-file-kind="${escapeAdminHtml(file.kind)}"
    draggable="${canMove ? 'true' : 'false'}">

    <span
      class="admin-media-tree__toggle admin-media-tree__toggle--spacer"
      aria-hidden="true">

    </span>

    ${
      canMove
        ? `
    <button
      type="button"
      class="admin-media-tree__handle"
      data-media-drag-handle
      aria-label="Verschieben"
      title="Verschieben">

      ☰

    </button>
        `
        : `
    <span class="admin-media-tree__handle admin-media-tree__handle--spacer"></span>
        `
    }

    ${iconHtml}

    <span class="admin-media-tree__label-text">
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
    </span>

    <button
      type="button"
      class="admin-media-tree__menu"
      data-media-context-trigger
      aria-label="Aktionen">

      ⋮

    </button>

  </div>

</li>
  `.trim();

}

async function renderMediaBrowserTreeNode(
  folderPath,
  rootId,
  depth
) {

  const path =
    normalizeMediaStorageBrowserPath(
      folderPath
    );

  const root =
    getMediaStorageRootConfig(
      rootId
    );

  const nodeKey =
    getMediaBrowserNodeKey(
      rootId,
      path
    );

  const isRootLevel =
    depth === 0;

  const label =
    isRootLevel
      ? root.label
      : path.split('/').pop()
      || path
      || root.label;

  const expanded =
    isMediaBrowserNodeExpanded(
      rootId,
      path
    );

  let childrenHtml =
    '';

  if (expanded) {

    const listing =
      await loadMediaBrowserTreeContents(
        path,
        rootId
      );

    const folderNodes =
      await Promise.all(
        (listing.folders || []).map(
          (folder) =>
            renderMediaBrowserTreeNode(
              folder.path,
              rootId,
              depth + 1
            )
        )
      );

    const fileNodes =
      (listing.files || []).map(
        (file) =>
          renderMediaBrowserFileTreeNode(
            file,
            rootId,
            depth + 1
          )
      );

    childrenHtml =
      [
        ...folderNodes,
        ...fileNodes
      ].join('');

  }

  const canDrop =
    canDropMediaFileOnFolderTarget(
      path
    );

  const isSelected =
    nodeKey
    === getMediaBrowserNodeKey(
      mediaBrowserCurrentRoot,
      mediaBrowserCurrentPath
    );

  return `
<li
  class="admin-media-tree__item admin-media-tree__item--folder"
  data-media-tree-item="${escapeAdminHtml(nodeKey)}">

  <div
    class="admin-media-tree__row admin-media-explorer-item admin-media-explorer-item--folder${
      canDrop
        ? ' admin-media-drop-target'
        : ''
    }"
    style="--tree-depth:${depth}"
    data-media-folder-path="${escapeAdminHtml(path)}"
    data-media-drop-folder="${escapeAdminHtml(path)}">

    <button
      type="button"
      class="admin-media-tree__toggle"
      data-media-tree-toggle="${escapeAdminHtml(nodeKey)}"
      data-media-tree-root="${escapeAdminHtml(rootId)}"
      data-media-tree-path="${escapeAdminHtml(path)}"
      aria-expanded="${expanded ? 'true' : 'false'}"
      aria-label="${escapeAdminHtml(label)} ${expanded ? 'einklappen' : 'aufklappen'}">

      ${expanded ? '▾' : '▸'}

    </button>

    <span
      class="admin-media-tree__folder-icon"
      aria-hidden="true">

      📁

    </span>

    <button
      type="button"
      class="admin-media-tree__folder${
        isSelected
          ? ' is-selected'
          : ''
      }"
      data-media-tree-folder="${escapeAdminHtml(nodeKey)}"
      data-media-tree-root="${escapeAdminHtml(rootId)}"
      data-media-tree-path="${escapeAdminHtml(path)}">

      ${escapeAdminHtml(label)}

    </button>

    <button
      type="button"
      class="admin-media-tree__menu"
      data-media-context-trigger
      aria-label="Aktionen">

      ⋮

    </button>

  </div>

  ${
    expanded
      ? `
  <ul class="admin-media-tree__children">
    ${childrenHtml}
  </ul>
      `
      : ''
  }

</li>
  `.trim();

}

async function renderMediaBrowserTree() {

  const container =
    document.getElementById(
      'media-browser-tree'
    );

  const statusEl =
    document.getElementById(
      'media-browser-status'
    );

  if (!container) {
    return;
  }

  container.innerHTML =
    '<p class="admin-hint">Medien werden geladen …</p>';

  if (statusEl) {
    statusEl.textContent =
      'Medien werden geladen …';
  }

  try {

    const rootNodes =
      await Promise.all(
        MEDIA_STORAGE_ROOTS.map(
          (root) =>
            renderMediaBrowserTreeNode(
              root.path,
              root.id,
              0
            )
        )
      );

    container.innerHTML = `
<ul class="admin-media-tree">
  ${rootNodes.join('')}
</ul>
    `.trim();

    bindMediaBrowserTreeEvents(
      container
    );

    syncMediaBrowserTreeSelection();
    updateMediaBrowserUploadButtonState();

    if (statusEl) {
      statusEl.textContent =
        'Rechtsklick oder Long-Press für Aktionen. ☰ ziehen zum Verschieben.';
    }

  } catch (error) {

    console.error(error);

    container.innerHTML = `
<p class="admin-hint admin-hint--error">
  ${escapeAdminHtml(
    error.message
    || 'Explorer konnte nicht geladen werden.'
  )}
</p>
    `.trim();

    if (statusEl) {
      statusEl.textContent =
        'Laden fehlgeschlagen.';
    }

  }

}

function selectMediaBrowserFolder(
  rootId,
  folderPath
) {

  mediaBrowserCurrentRoot =
    rootId;

  mediaBrowserCurrentPath =
    normalizeMediaStorageBrowserPath(
      folderPath
    );

  syncMediaBrowserTreeSelection();
  updateMediaBrowserUploadButtonState();

}

function bindMediaBrowserTreeEvents(
  container
) {

  container
    .querySelectorAll(
      '[data-media-tree-toggle]'
    )
    .forEach((button) => {

      button.addEventListener(
        'click',
        async (event) => {

          event.stopPropagation();

          toggleMediaBrowserNodeExpanded(
            button.dataset.mediaTreeRoot
            || mediaBrowserCurrentRoot,
            button.dataset.mediaTreePath
            || ''
          );

          await renderMediaBrowserTree();

        }
      );

    });

  container
    .querySelectorAll(
      '[data-media-tree-folder]'
    )
    .forEach((button) => {

      button.addEventListener(
        'click',
        async () => {

          selectMediaBrowserFolder(
            button.dataset.mediaTreeRoot
            || mediaBrowserCurrentRoot,
            button.dataset.mediaTreePath
            || ''
          );

          toggleMediaBrowserNodeExpanded(
            button.dataset.mediaTreeRoot
            || mediaBrowserCurrentRoot,
            button.dataset.mediaTreePath
            || ''
          );

          await renderMediaBrowserTree();

        }
      );

    });

}

async function refreshMediaBrowserTree() {

  invalidateMediaBrowserTreeCache();

  await renderMediaBrowserTree();

}

function canDropMediaFileOnFolderTarget(
  folderPath
) {

  const path =
    normalizeMediaStorageBrowserPath(
      folderPath
    );

  if (!path) {
    return false;
  }

  if (path.startsWith('protocols/')) {
    return false;
  }

  if (path.startsWith('galleries/')) {
    return false;
  }

  return (
    path.startsWith('shared/')
    || path === 'shared'
  );

}

function buildMediaPathInFolder(
  folderPath,
  fileName
) {

  const folder =
    normalizeMediaStorageBrowserPath(
      folderPath
    );

  const safeName =
    sanitizeMediaStorageFilename(
      fileName
    );

  if (!folder) {
    return safeName;
  }

  return `${folder}/${safeName}`;

}
