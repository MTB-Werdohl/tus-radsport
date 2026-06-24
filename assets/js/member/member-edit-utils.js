const memberNewsExcerptMaxLength = 200;

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

async function isNewsSlugTaken(
  slug,
  excludeId
) {

  if (!slug) {
    return false;
  }

  let query =
    window.supabaseClient
      .from(window.siteConfig.tables.news)
      .select('id')
      .eq('slug', slug);

  if (excludeId) {

    query =
      query.neq(
        'id',
        excludeId
      );

  }

  const { data, error } =
    await query.limit(1);

  if (error) {

    console.error(error);

    return false;

  }

  return (data || []).length > 0;

}

async function resolveUniqueNewsSlug(
  baseSlug,
  excludeId
) {

  let candidate =
    baseSlug
    || 'news';

  if (
    !await isNewsSlugTaken(
      candidate,
      excludeId
    )
  ) {
    return candidate;
  }

  let suffix = 2;

  while (suffix < 1000) {

    candidate =
      `${baseSlug}-${suffix}`;

    if (
      !await isNewsSlugTaken(
        candidate,
        excludeId
      )
    ) {
      return candidate;
    }

    suffix += 1;

  }

  if (excludeId) {
    return `${baseSlug}-${excludeId}`;
  }

  return `${baseSlug}-${Date.now()}`;

}

async function isTerminSlugTaken(
  slug,
  excludeId
) {

  if (!slug) {
    return false;
  }

  let query =
    window.supabaseClient
      .from(window.siteConfig.tables.termine)
      .select('id')
      .eq('slug', slug);

  if (excludeId) {

    query =
      query.neq(
        'id',
        excludeId
      );

  }

  const { data, error } =
    await query.limit(1);

  if (error) {

    console.error(error);

    return false;

  }

  return (data || []).length > 0;

}

async function resolveUniqueTerminSlug(
  baseSlug,
  excludeId
) {

  let candidate =
    baseSlug
    || 'termin';

  if (
    !await isTerminSlugTaken(
      candidate,
      excludeId
    )
  ) {
    return candidate;
  }

  let suffix = 2;

  while (suffix < 1000) {

    candidate =
      `${baseSlug}-${suffix}`;

    if (
      !await isTerminSlugTaken(
        candidate,
        excludeId
      )
    ) {
      return candidate;
    }

    suffix += 1;

  }

  if (excludeId) {
    return `${baseSlug}-${excludeId}`;
  }

  return `${baseSlug}-${Date.now()}`;

}

function buildMemberNewsExcerpt(
  content,
  title
) {

  const plain =
    String(content || '')
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`[^`]*`/g, ' ')
      .replace(
        /!\[[^\]]*\]\([^)]*\)/g,
        ' '
      )
      .replace(
        /\[([^\]]*)\]\([^)]*\)/g,
        '$1'
      )
      .replace(/^#+\s+/gm, '')
      .replace(/[*_~>#-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const source =
    plain
    || String(title || '').trim();

  if (!source) {
    return '';
  }

  if (
    source.length
    <= memberNewsExcerptMaxLength
  ) {
    return source;
  }

  return (
    source
      .slice(
        0,
        memberNewsExcerptMaxLength - 1
      )
      .trim()
    + '…'
  );

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

function sanitizeMemberMediaStorageFilename(
  name
) {

  const raw =
    String(name || 'datei').trim();

  const dotIndex =
    raw.lastIndexOf('.');

  const extension =
    dotIndex > 0
      ? raw.slice(dotIndex + 1)
      : '';

  const baseName =
    dotIndex > 0
      ? raw.slice(0, dotIndex)
      : raw;

  let safeBase =
    baseName
      .toLowerCase()
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss')
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

  if (!safeBase) {
    safeBase = 'datei';
  }

  const safeExtension =
    extension
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '')
      .slice(0, 10);

  if (!safeExtension) {
    return safeBase.slice(0, 120);
  }

  return (
    `${safeBase}.${safeExtension}`
      .slice(0, 120)
  );

}

function buildMemberMediaStoragePath(
  folderPrefix,
  fileName
) {

  const folder =
    String(folderPrefix || '')
      .trim()
      .replace(/^\/+|\/+$/g, '');

  const fileKey =
    `${Date.now()}-${
      sanitizeMemberMediaStorageFilename(
        fileName
      )
    }`;

  if (!folder) {
    return fileKey;
  }

  return `${folder}/${fileKey}`;

}

async function uploadMemberMediaStorageFile(
  folderPrefix,
  file
) {

  if (!file) {
    return {
      error: new Error('Keine Datei'),
      storagePath: null,
      publicUrl: null
    };
  }

  const normalizedFolder =
    String(folderPrefix || '')
      .trim()
      .replace(/^\/+|\/+$/g, '');

  const allowedPrefixes = [
    window.MEDIA_STORAGE_FOLDERS?.sharedImages
    || 'shared/images',
    window.MEDIA_STORAGE_FOLDERS?.sharedRoutes
    || 'shared/routes'
  ];

  const allowed =
    allowedPrefixes.some(
      (prefix) =>
        normalizedFolder === prefix
        || normalizedFolder.startsWith(
          `${prefix}/`
        )
    );

  if (!allowed) {
    return {
      error: new Error(
        'Upload in diesen Ordner ist nicht erlaubt.'
      ),
      storagePath: null,
      publicUrl: null
    };
  }

  let uploadFile = file;

  if (
    typeof compressImageFileToWebp
      === 'function'
  ) {

    uploadFile =
      await compressImageFileToWebp(file);

  }

  const storagePath =
    buildMemberMediaStoragePath(
      normalizedFolder,
      uploadFile.name
    );

  const bucket =
    window.siteConfig?.storage?.media
    || 'media';

  const uploadOptions =
    uploadFile.type === 'image/webp'
      ? {
        contentType: 'image/webp',
        cacheControl: '3600'
      }
      : undefined;

  const { error } =
    await window.supabaseClient
      .storage
      .from(bucket)
      .upload(
        storagePath,
        uploadFile,
        uploadOptions
      );

  if (error) {
    return {
      error,
      storagePath: null,
      publicUrl: null
    };
  }

  const publicUrl =
    typeof resolveMediaPublicUrl === 'function'
      ? resolveMediaPublicUrl(storagePath)
      : window.supabaseClient
        .storage
        .from(bucket)
        .getPublicUrl(storagePath)
        .data?.publicUrl
      || null;

  return {
    error: null,
    storagePath,
    publicUrl
  };

}
