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

  container.innerHTML =
    '<p class="admin-hint">Details werden geladen …</p>';

  const resolvedPath =
    await resolveActualMediaStoragePath(
      filePath
    );

  const [
    targetEntry,
    resolvedEntry
  ] =
    await Promise.all([
      getMediaStorageFileEntry(
        filePath
      ),
      getMediaStorageFileEntry(
        resolvedPath
      )
    ]);

  const targetSize =
    targetEntry?.size || 0;

  const resolvedSize =
    resolvedEntry?.size || 0;

  const isShell =
    isMediaStorageShellFile(
      { size: targetSize }
    );

  const repairSource =
    isShell
      ? await findMediaRepairSourcePath(
        filePath
      )
      : null;

  const fileKind =
    classifyMediaStoragePath(
      resolvedPath
    );

  const file = {
    path: filePath,
    kind: fileKind,
    name:
      resolvedPath.split('/').pop()
      || formatMediaFileLabel(
        resolvedPath
      )
  };

  const publicUrl =
    resolveMediaPublicUrl(
      resolvedPath
    ) || '';

  const isLegacy =
    !resolvedPath.includes('/');

  const pathMismatch =
    resolvedPath !== filePath;

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

  ${
    pathMismatch
      ? `
  <dt>
    Referenz
  </dt>

  <dd>
    ${escapeAdminHtml(filePath)}
  </dd>
      `.trim()
      : ''
  }

  <dt>
    ${pathMismatch ? 'Speicherort' : 'Pfad'}
  </dt>

  <dd>
    ${escapeAdminHtml(resolvedPath)}
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

  <dt>
    Größe
  </dt>

  <dd>
    ${escapeAdminHtml(
      formatMediaStorageFileSize(
        targetSize
      )
    )}
    ${
      isShell
        ? ' <span class="admin-media-badge admin-media-badge--shell">Leer</span>'
        : ''
    }
  </dd>

  ${
    pathMismatch
    && resolvedSize > 0
      ? `
  <dt>
    Vorschau aus
  </dt>

  <dd>
    ${escapeAdminHtml(resolvedPath)}
    (${escapeAdminHtml(
      formatMediaStorageFileSize(
        resolvedSize
      )
    )})
  </dd>
      `.trim()
      : ''
  }

  ${
    isShell
      ? `
<p class="admin-hint admin-hint--error">
  ${
    repairSource
      ? `Leere Datei (0 Byte) — typisch nach Backfill-Move. Original vermutlich unter <strong>${escapeAdminHtml(repairSource)}</strong>. Rechtsklick → „Inhalt wiederherstellen“.`
      : 'Leere Datei (0 Byte) — kein Original im Storage gefunden. Bild neu hochladen oder aus Backup importieren.'
  }
</p>
      `.trim()
      : ''
  }

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

${
  publicUrl
    ? ''
    : `
<p class="admin-hint admin-hint--error">
  Keine öffentliche URL — Datei im Storage nicht gefunden.
</p>
    `.trim()
}

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
