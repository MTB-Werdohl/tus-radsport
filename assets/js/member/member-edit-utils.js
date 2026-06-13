function buildMemberContentSlug(
  title
) {

  return String(title || '')
    .trim()
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replaceAll(' ', '-')
    .replace(/[^\w-]+/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

}

function escapeAdminHtml(
  value
) {

  return escapeMemberContentHtml(value);

}

function escapeMemberContentHtml(
  value
) {

  if (value === null || value === undefined) {
    return '';
  }

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

}

function renderMemberEditMediaPreview(
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
    || (
      typeof resolveMediaPublicUrl === 'function'
        ? resolveMediaPublicUrl(
          selection.storagePath
        )
        : null
    );

  const pathHint = `
<p class="member-edit-media-path">
  Pfad: ${escapeMemberContentHtml(selection.storagePath)}
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
  class="member-edit-preview-image"
  alt="">
${pathHint}
    `.trim();

    return;

  }

  container.innerHTML = `
<p>Aus Mediathek gewählt:</p>
<div class="member-edit-gpx-name">
  ${escapeMemberContentHtml(
    selection.label
    || (
      typeof formatMediaFileLabel === 'function'
        ? formatMediaFileLabel(
          selection.storagePath
        )
        : selection.storagePath
    )
  )}
</div>
${pathHint}
  `.trim();

}

function safeMediaUrl(
  url
) {

  if (!url || typeof url !== 'string') {
    return '';
  }

  if (url.startsWith('/')) {
    return escapeMemberContentHtml(url);
  }

  try {

    const parsed =
      new URL(url);

    if (parsed.protocol !== 'https:') {
      return '';
    }

    const supabaseHost =
      new URL(window.siteConfig.supabaseUrl).hostname;

    if (
      parsed.hostname !== supabaseHost
      || !parsed.pathname.includes('/storage/v1/object/public/media/')
    ) {
      return '';
    }

    return escapeMemberContentHtml(url);

  } catch (error) {

    return '';

  }

}

function applyMemberEditMediaSelection(
  previewContainerId,
  kind,
  storagePath,
  hiddenInputId
) {

  if (!storagePath) {
    return;
  }

  if (hiddenInputId) {

    const input =
      document.getElementById(
        hiddenInputId
      );

    if (input) {
      input.value = storagePath;
    }

  }

  const selection =
    typeof resolveMediaSelectionFromPath === 'function'
      ? resolveMediaSelectionFromPath(
        storagePath
      )
      : {
        storagePath,
        publicUrl:
          typeof resolveMediaPublicUrl === 'function'
            ? resolveMediaPublicUrl(
              storagePath
            )
            : null
      };

  if (!selection) {
    return;
  }

  renderMemberEditMediaPreview(
    previewContainerId,
    kind,
    selection
  );

}
