function getMediaBrowserKindLabel(
  kind
) {

  if (kind === 'image') {
    return 'Bild';
  }

  if (kind === 'gpx') {
    return 'GPX';
  }

  return 'Datei';

}

function buildMediaBrowserReferenceLinksHtml(
  references
) {

  const items = [];

  (references.termine || []).forEach((ref) => {

    items.push(`
<li>

  <a href="/admin/termine_edit.html?id=${encodeURIComponent(ref.id)}">

    Termin: ${escapeAdminHtml(ref.title || ref.id)}
    (${escapeAdminHtml(ref.kind || 'Medien')})

  </a>

</li>
    `.trim());

  });

  (references.news || []).forEach((ref) => {

    items.push(`
<li>

  <a href="/admin/news_edit.html?id=${encodeURIComponent(ref.id)}">

    News: ${escapeAdminHtml(ref.title || ref.id)}

  </a>

</li>
    `.trim());

  });

  (references.gallery || []).forEach((ref) => {

    const galleryId =
      ref.gallery_id
      || ref.galleryId
      || ref.id;

    items.push(`
<li>

  <a href="/admin/galerie_edit.html?id=${encodeURIComponent(galleryId)}">

    Galerie #${escapeAdminHtml(String(galleryId))}

  </a>

</li>
    `.trim());

  });

  if (!items.length) {

    return `
<p class="admin-hint">
  Nicht referenziert
</p>
    `.trim();

  }

  return `
<ul class="admin-media-detail__refs">
  ${items.join('')}
</ul>
  `.trim();

}

function renderMediaBrowserDetailPreview(
  file,
  publicUrl
) {

  if (
    file.kind === 'image'
    && publicUrl
  ) {

    return `
<div class="admin-media-detail__preview">

  <img
    class="admin-media-detail__image"
    src="${escapeAdminHtml(publicUrl)}"
    alt="">

</div>
    `.trim();

  }

  const typeLabel =
    file.kind === 'gpx'
      ? 'GPX'
      : 'Datei';

  const openLink =
    publicUrl
      ? `
<a
  class="secondary-button"
  href="${escapeAdminHtml(publicUrl)}"
  target="_blank"
  rel="noopener">

  Datei öffnen

</a>
      `.trim()
      : '';

  return `
<div class="admin-media-detail__preview admin-media-detail__preview--file">

  <span class="admin-media-detail__file-type">
    ${typeLabel}
  </span>

  ${openLink}

</div>
  `.trim();

}

function renderMediaBrowserFolderDetail() {

  const path =
    normalizeMediaStorageBrowserPath(
      mediaBrowserCurrentPath
    );

  const root =
    getMediaStorageRootConfig(
      mediaBrowserCurrentRoot
    );

  const label =
    path.split('/').pop()
    || root?.label
    || path
    || 'Ordner';

  return `
<div class="admin-media-detail__empty">

  <p class="admin-media-detail__folder-label">
    📁 ${escapeAdminHtml(label)}
  </p>

  <p class="admin-hint">
    Datei im Baum auswählen für Vorschau und Details.
  </p>

  ${
    path
      ? `
  <dl class="admin-media-detail__meta">

    <dt>
      Pfad
    </dt>

    <dd>
      ${escapeAdminHtml(path)}
    </dd>

  </dl>
      `.trim()
      : ''
  }

</div>
  `.trim();

}

function renderMediaBrowserDetailEmpty() {

  return `
<div class="admin-media-detail__empty">

  <p class="admin-hint">
    Datei im Baum auswählen.
  </p>

</div>
  `.trim();

}

async function renderMediaBrowserDetail() {

  const container =
    document.getElementById(
      'media-browser-detail'
    );

  if (!container) {
    return;
  }

  if (!mediaBrowserSelectedFilePath) {

    container.innerHTML =
      mediaBrowserCurrentPath
        ? renderMediaBrowserFolderDetail()
        : renderMediaBrowserDetailEmpty();

    return;

  }

  const filePath =
    mediaBrowserSelectedFilePath;

  const fileKind =
    classifyMediaStoragePath(
      filePath
    );

  const file = {
    path: filePath,
    kind: fileKind,
    name:
      formatMediaFileLabel(
        filePath
      )
  };

  const publicUrl =
    resolveMediaPublicUrl(
      filePath
    ) || '';

  const isLegacy =
    !filePath.includes('/');

  container.innerHTML =
    '<p class="admin-hint">Details werden geladen …</p>';

  let referencesHtml =
    '<p class="admin-hint">Referenzen werden geladen …</p>';

  try {

    const references =
      await fetchMediaReferencesRpc(
        filePath
      );

    referencesHtml =
      buildMediaBrowserReferenceLinksHtml(
        references
      );

  } catch (error) {

    console.error(error);

    referencesHtml = `
<p class="admin-hint admin-hint--error">
  ${escapeAdminHtml(
    error.message
    || 'Referenzen konnten nicht geladen werden.'
  )}
</p>
    `.trim();

  }

  container.innerHTML = `
${renderMediaBrowserDetailPreview(
  file,
  publicUrl
)}

<h2 class="admin-media-detail__title">
  ${escapeAdminHtml(file.name)}
  ${
    isLegacy
      ? '<span class="admin-media-badge admin-media-badge--legacy">Legacy</span>'
      : ''
  }
</h2>

<dl class="admin-media-detail__meta">

  <dt>
    Pfad
  </dt>

  <dd>
    ${escapeAdminHtml(filePath)}
  </dd>

  <dt>
    Typ
  </dt>

  <dd>
    ${escapeAdminHtml(
      getMediaBrowserKindLabel(
        fileKind
      )
    )}
  </dd>

  ${
    publicUrl
      ? `
  <dt>
    URL
  </dt>

  <dd class="admin-media-detail__url">

    <a
      href="${escapeAdminHtml(publicUrl)}"
      target="_blank"
      rel="noopener">

      ${escapeAdminHtml(publicUrl)}

    </a>

  </dd>
      `.trim()
      : ''
  }

</dl>

<section class="admin-media-detail__section">

  <h3 class="admin-media-detail__heading">
    Verwendung
  </h3>

  ${referencesHtml}

</section>
  `.trim();

}

function selectMediaBrowserFile(
  file
) {

  mediaBrowserSelectedFilePath =
    file?.path || null;

  syncMediaBrowserFileSelection();
  renderMediaBrowserDetail();

}

function clearMediaBrowserFileSelection() {

  mediaBrowserSelectedFilePath =
    null;

  syncMediaBrowserFileSelection();

}

function syncMediaBrowserFileSelection() {

  const selectedPath =
    mediaBrowserSelectedFilePath
    || '';

  document
    .querySelectorAll(
      '[data-media-tree-file-select]'
    )
    .forEach((row) => {

      const filePath =
        row.dataset.mediaTreeFileSelect
        || '';

      row.classList.toggle(
        'is-selected',
        !!selectedPath
        && filePath === selectedPath
      );

    });

}
