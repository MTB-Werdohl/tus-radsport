const mediaBrowserTreeCache =
  new Map();

const mediaBrowserTreeExpanded =
  new Set([
    'shared'
  ]);

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
      key === prefix
      || key.startsWith(`${prefix}/`)
    ) {
      mediaBrowserTreeCache.delete(key);
    }

  }

}

async function loadMediaBrowserTreeFolders(
  folderPath,
  rootId
) {

  const path =
    normalizeMediaStorageBrowserPath(
      folderPath
    );

  const cacheKey =
    `${rootId}::${path}`;

  if (mediaBrowserTreeCache.has(cacheKey)) {
    return mediaBrowserTreeCache.get(cacheKey);
  }

  const listing =
    await listMediaStorageEntries(
      path,
      {
        rootId,
        kindFilter: 'all'
      }
    );

  const folders =
    listing.folders || [];

  mediaBrowserTreeCache.set(
    cacheKey,
    folders
  );

  return folders;

}

function isMediaBrowserTreePathExpanded(
  path
) {

  return mediaBrowserTreeExpanded.has(
    normalizeMediaStorageBrowserPath(
      path
    )
  );

}

function toggleMediaBrowserTreePathExpanded(
  path
) {

  const normalized =
    normalizeMediaStorageBrowserPath(
      path
    );

  if (
    mediaBrowserTreeExpanded.has(
      normalized
    )
  ) {
    mediaBrowserTreeExpanded.delete(
      normalized
    );
    return false;
  }

  mediaBrowserTreeExpanded.add(
    normalized
  );

  return true;

}

function syncMediaBrowserTreeSelection() {

  const selectedPath =
    normalizeMediaStorageBrowserPath(
      mediaBrowserCurrentPath
    );

  document
    .querySelectorAll(
      '[data-media-tree-label]'
    )
    .forEach((button) => {

      const nodePath =
        button.dataset.mediaTreeLabel
        || '';

      button.classList.toggle(
        'is-selected',
        nodePath === selectedPath
      );

    });

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

  const label =
    path === root.path
      || (
        root.path
        && path === root.path
      )
      ? root.label
      : path.split('/').pop()
      || path
      || root.label;

  const expanded =
    isMediaBrowserTreePathExpanded(
      path
    );

  const folders =
    expanded
      ? await loadMediaBrowserTreeFolders(
        path,
        rootId
      )
      : [];

  const childrenHtml =
    expanded
      ? (
        await Promise.all(
          folders.map((folder) =>
            renderMediaBrowserTreeNode(
              folder.path,
              rootId,
              depth + 1
            )
          )
        )
      ).join('')
      : '';

  const canDrop =
    canDropMediaFileOnFolderTarget(
      path
    );

  return `
<li
  class="admin-media-tree__item"
  data-media-tree-item="${escapeAdminHtml(path)}">

  <div
    class="admin-media-tree__row"
    style="--tree-depth:${depth}">

    <button
      type="button"
      class="admin-media-tree__toggle"
      data-media-tree-toggle="${escapeAdminHtml(path)}"
      aria-expanded="${expanded ? 'true' : 'false'}"
      aria-label="Ordner ${escapeAdminHtml(label)} ${expanded ? 'einklappen' : 'aufklappen'}">

      ${expanded ? '▾' : '▸'}

    </button>

    <button
      type="button"
      class="admin-media-tree__label${
        path === mediaBrowserCurrentPath
          ? ' is-selected'
          : ''
      }${
        canDrop
          ? ' admin-media-drop-target'
          : ''
      }"
      data-media-tree-label="${escapeAdminHtml(path)}"
      data-media-drop-folder="${escapeAdminHtml(path)}">

      <span class="admin-media-tree__icon" aria-hidden="true">📁</span>
      <span class="admin-media-tree__text">${escapeAdminHtml(label)}</span>

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

  if (!container) {
    return;
  }

  container.innerHTML =
    '<p class="admin-hint">Ordner werden geladen …</p>';

  try {

    const root =
      getMediaStorageRootConfig(
        mediaBrowserCurrentRoot
      );

    const html =
      await renderMediaBrowserTreeNode(
        root.path,
        mediaBrowserCurrentRoot,
        0
      );

    container.innerHTML = `
<ul class="admin-media-tree">
  ${html}
</ul>
    `.trim();

    bindMediaBrowserTreeEvents(
      container
    );

    syncMediaBrowserTreeSelection();

  } catch (error) {

    console.error(error);

    container.innerHTML = `
<p class="admin-hint admin-hint--error">
  ${escapeAdminHtml(
    error.message
    || 'Ordnerbaum konnte nicht geladen werden.'
  )}
</p>
    `.trim();

  }

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

          const path =
            button.dataset.mediaTreeToggle
            || '';

          toggleMediaBrowserTreePathExpanded(
            path
          );

          await renderMediaBrowserTree();

        }
      );

    });

  container
    .querySelectorAll(
      '[data-media-tree-label]'
    )
    .forEach((button) => {

      button.addEventListener(
        'click',
        async () => {

          const path =
            button.dataset.mediaTreeLabel
            || '';

          mediaBrowserCurrentPath =
            path;

          mediaBrowserCurrentRoot =
            inferMediaStorageRootId(
              path
            );

          renderMediaBrowserRoots();
          syncMediaBrowserTreeSelection();
          await loadMediaBrowserView();

          closeMediaBrowserTreeDrawer();

        }
      );

    });

}

function openMediaBrowserTreeDrawer() {

  document
    .getElementById(
      'media-browser-tree-panel'
    )
    ?.classList.add('is-open');

  document
    .getElementById(
      'media-browser-tree-backdrop'
    )
    ?.classList.add('is-open');

}

function closeMediaBrowserTreeDrawer() {

  document
    .getElementById(
      'media-browser-tree-panel'
    )
    ?.classList.remove('is-open');

  document
    .getElementById(
      'media-browser-tree-backdrop'
    )
    ?.classList.remove('is-open');

}

function bindMediaBrowserTreeDrawer() {

  document
    .getElementById(
      'media-browser-tree-toggle'
    )
    ?.addEventListener('click', () => {

      const panel =
        document.getElementById(
          'media-browser-tree-panel'
        );

      if (
        panel?.classList.contains(
          'is-open'
        )
      ) {
        closeMediaBrowserTreeDrawer();
      } else {
        openMediaBrowserTreeDrawer();
      }

    });

  document
    .getElementById(
      'media-browser-tree-backdrop'
    )
    ?.addEventListener('click', () => {
      closeMediaBrowserTreeDrawer();
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
