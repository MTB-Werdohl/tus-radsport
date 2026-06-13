const MEDIA_BROWSER_ROOTS = [

  {
    id: 'shared',
    label: 'Shared',
    path: 'shared'
  },

  {
    id: 'galleries',
    label: 'Galerien',
    path: 'galleries'
  },

  {
    id: 'legacy',
    label: 'Legacy (Root)',
    path: ''
  }

];

let mediaBrowserReferenceIndex = null;

let mediaBrowserCurrentRoot =
  'shared';

let mediaBrowserCurrentPath =
  'shared';

let mediaBrowserCurrentFilter =
  'all';

function isMediaBrowserFolderEntry(
  item
) {

  return !item?.id;

}

function getMediaBrowserRootConfig(
  rootId
) {

  return MEDIA_BROWSER_ROOTS.find(
    (root) => root.id === rootId
  ) || MEDIA_BROWSER_ROOTS[0];

}

function normalizeMediaBrowserPath(
  value
) {

  return String(value || '')
    .trim()
    .replace(/^\/+|\/+$/g, '');

}

function isTopLevelManagedFolder(
  name
) {

  return [
    'shared',
    'galleries',
    'protocols'
  ].includes(name);

}

async function listMediaBrowserEntries(
  relativePath
) {

  const bucket =
    getMediaStorageBucket();

  const prefix =
    normalizeMediaBrowserPath(
      relativePath
    );

  const { data, error } =
    await window.supabaseClient
      .storage
      .from(bucket)
      .list(
        prefix || '',
        {
          limit: 100,
          sortBy: {
            column: 'name',
            order: 'asc'
          }
        }
      );

  if (error) {
    throw error;
  }

  const folders = [];
  const files = [];

  (data || []).forEach((item) => {

    if (
      item.name === '.emptyFolderPlaceholder'
    ) {
      return;
    }

    const itemPath =
      prefix
        ? `${prefix}/${item.name}`
        : item.name;

    if (
      isMediaBrowserExcludedPath(
        itemPath
      )
    ) {
      return;
    }

    if (isMediaBrowserFolderEntry(item)) {

      if (
        !prefix
        && mediaBrowserCurrentRoot === 'legacy'
      ) {
        return;
      }

      if (
        !prefix
        && isTopLevelManagedFolder(
          item.name
        )
        && item.name !== 'shared'
        && item.name !== 'galleries'
      ) {
        return;
      }

      folders.push({
        name: item.name,
        path: itemPath
      });

      return;

    }

    files.push({
      name: item.name,
      path: itemPath,
      updatedAt:
        item.updated_at
        || item.created_at
        || null,
      kind:
        classifyMediaStoragePath(
          itemPath
        )
    });

  });

  return {
    folders,
    files
  };

}

async function loadMediaBrowserReferenceIndex() {

  const termineTable =
    window.siteConfig.tables.termine;

  const newsTable =
    window.siteConfig.tables.news;

  const [
    termineResult,
    newsResult,
    galleryResult
  ] =
    await Promise.all([

      window.supabaseClient
        .from(termineTable)
        .select(
          'id,title,slug,image,gpx,image_storage_path,gpx_storage_path'
        ),

      window.supabaseClient
        .from(newsTable)
        .select(
          'id,title,slug,image,image_storage_path'
        ),

      window.supabaseClient
        .from('gallery_images')
        .select(
          'id,gallery_id,image_path'
        )

    ]);

  if (termineResult.error) {
    throw termineResult.error;
  }

  if (newsResult.error) {
    throw newsResult.error;
  }

  if (galleryResult.error) {
    throw galleryResult.error;
  }

  mediaBrowserReferenceIndex = {
    termine:
      termineResult.data || [],
    news:
      newsResult.data || [],
    gallery:
      galleryResult.data || []
  };

}

function findMediaBrowserReferences(
  storagePath
) {

  const references = {
    termine: [],
    news: [],
    gallery: []
  };

  if (
    !mediaBrowserReferenceIndex
    || !storagePath
  ) {
    return references;
  }

  mediaBrowserReferenceIndex
    .termine
    .forEach((termin) => {

      if (
        mediaPathMatchesReference(
          storagePath,
          termin.image_storage_path,
          termin.image
        )
      ) {

        references.termine.push({
          id: termin.id,
          title: termin.title,
          kind: 'Bild'
        });

      }

      if (
        mediaPathMatchesReference(
          storagePath,
          termin.gpx_storage_path,
          termin.gpx
        )
      ) {

        references.termine.push({
          id: termin.id,
          title: termin.title,
          kind: 'GPX'
        });

      }

    });

  mediaBrowserReferenceIndex
    .news
    .forEach((news) => {

      if (
        mediaPathMatchesReference(
          storagePath,
          news.image_storage_path,
          news.image
        )
      ) {

        references.news.push({
          id: news.id,
          title: news.title
        });

      }

    });

  mediaBrowserReferenceIndex
    .gallery
    .forEach((image) => {

      if (
        mediaPathMatchesReference(
          storagePath,
          extractMediaStoragePath(
            image.image_path
          ),
          image.image_path
        )
      ) {

        references.gallery.push({
          id: image.id,
          galleryId:
            image.gallery_id
        });

      }

    });

  return references;

}

function countMediaBrowserReferences(
  references
) {

  return (
    references.termine.length
    + references.news.length
    + references.gallery.length
  );

}

function renderMediaBrowserReferenceSummary(
  references
) {

  const parts = [];

  if (references.termine.length) {

    parts.push(
      `${references.termine.length} Termin${
        references.termine.length === 1
          ? ''
          : 'e'
      }`
    );

  }

  if (references.news.length) {

    parts.push(
      `${references.news.length} News`
    );

  }

  if (references.gallery.length) {

    parts.push(
      `${references.gallery.length} Galerie${
        references.gallery.length === 1
          ? ''
          : 'n'
      }`
    );

  }

  if (!parts.length) {
    return 'Nicht referenziert';
  }

  return `Verwendet in: ${parts.join(', ')}`;

}

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
    MEDIA_BROWSER_ROOTS
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
          getMediaBrowserRootConfig(
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
    getMediaBrowserRootConfig(
      mediaBrowserCurrentRoot
    );

  const currentPath =
    normalizeMediaBrowserPath(
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

function mediaBrowserPassesFilter(
  kind
) {

  if (
    mediaBrowserCurrentFilter === 'all'
  ) {
    return true;
  }

  return kind === mediaBrowserCurrentFilter;

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
    findMediaBrowserReferences(
      file.path
    );

  const publicUrl =
    resolveMediaPublicUrl(
      file.path
    ) || '';

  const isLegacy =
    !file.path.includes('/');

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
        renderMediaBrowserReferenceSummary(
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
  container
) {

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
      await listMediaBrowserEntries(
        mediaBrowserCurrentPath
      );

    const folders =
      listing.folders;

    const files =
      listing.files.filter((file) =>
        mediaBrowserPassesFilter(
          file.kind
        )
      );

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
      listEl
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

    await loadMediaBrowserReferenceIndex();

  } catch (error) {

    console.error(error);

    document
      .getElementById('media-browser-status')
      .textContent =
        'Referenzen konnten nicht geladen werden.';

  }

  await loadMediaBrowserView();

}
