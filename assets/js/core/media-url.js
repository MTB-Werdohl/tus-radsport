window.MEDIA_STORAGE_FOLDERS = {

  sharedImages: 'shared/images',

  sharedRoutes: 'shared/routes'

};

window.MEDIA_BROWSER_EXCLUDE_PREFIXES = [

  'protocols/'

];

function normalizeMediaStoragePath(
  storagePath
) {

  if (
    storagePath === null
    || storagePath === undefined
  ) {
    return null;
  }

  const trimmed =
    String(storagePath).trim()
      .replace(/^\/+/, '');

  return trimmed || null;

}

function getMediaStorageBucket() {

  return (
    window.siteConfig?.storage?.media
    || 'media'
  );

}

function extractMediaStoragePath(
  publicUrl
) {

  if (
    !publicUrl
    || typeof publicUrl !== 'string'
  ) {
    return null;
  }

  const trimmed =
    publicUrl.trim();

  if (!trimmed) {
    return null;
  }

  const withoutQuery =
    trimmed
      .split('#')[0]
      .split('?')[0];

  const markers = [
    '/storage/v1/object/public/media/',
    '/storage/v1/render/image/public/media/'
  ];

  for (const marker of markers) {

    const markerIndex =
      withoutQuery.indexOf(marker);

    if (markerIndex === -1) {
      continue;
    }

    const rawPath =
      withoutQuery
        .slice(markerIndex + marker.length);

    try {
      return decodeURIComponent(rawPath);
    } catch (error) {
      return rawPath;
    }

  }

  if (
    /^https?:\/\//i.test(withoutQuery)
    || withoutQuery.startsWith('/')
  ) {
    return null;
  }

  return normalizeMediaStoragePath(
    withoutQuery
  );

}

function resolveMediaPublicUrl(
  storagePath,
  options = {}
) {

  const path =
    normalizeMediaStoragePath(
      storagePath
    );

  if (!path) {
    return null;
  }

  if (
    !window.supabaseClient
    || typeof window.supabaseClient.storage
      !== 'object'
  ) {
    return null;
  }

  const { data } =
    window.supabaseClient
      .storage
      .from(getMediaStorageBucket())
      .getPublicUrl(path);

  let url =
    data?.publicUrl || null;

  if (
    !url
    && window.siteConfig?.supabaseUrl
  ) {

    const encodedPath =
      path
        .split('/')
        .map(encodeURIComponent)
        .join('/');

    url =
      `${window.siteConfig.supabaseUrl.replace(/\/$/, '')}`
      + `/storage/v1/object/public/${getMediaStorageBucket()}/${encodedPath}`;

  }

  if (
    url
    && options.updatedAt
  ) {

    const timestamp =
      new Date(options.updatedAt).getTime();

    if (!Number.isNaN(timestamp)) {
      url = `${url}?t=${timestamp}`;
    }

  }

  return url;

}

function resolveTerminImage(
  event
) {

  if (!event) {
    return null;
  }

  if (event.image_storage_path) {

    return (
      resolveMediaPublicUrl(
        event.image_storage_path
      )
      || event.image
      || null
    );

  }

  return event.image || null;

}

function resolveTerminGpx(
  event
) {

  if (!event) {
    return null;
  }

  if (event.gpx_storage_path) {

    return (
      resolveMediaPublicUrl(
        event.gpx_storage_path
      )
      || event.gpx
      || null
    );

  }

  return event.gpx || null;

}

function resolveNewsImage(
  news
) {

  if (!news) {
    return null;
  }

  if (news.image_storage_path) {

    return (
      resolveMediaPublicUrl(
        news.image_storage_path
      )
      || news.image
      || null
    );

  }

  return news.image || null;

}

function formatMediaFileLabel(
  storagePath
) {

  const path =
    normalizeMediaStoragePath(
      storagePath
    );

  if (!path) {
    return '';
  }

  const fileName =
    path.split('/').pop() || path;

  return fileName.replace(
    /^[0-9]+-/,
    ''
  );

}

function isMediaBrowserExcludedPath(
  storagePath
) {

  const path =
    normalizeMediaStoragePath(
      storagePath
    );

  if (!path) {
    return true;
  }

  return MEDIA_BROWSER_EXCLUDE_PREFIXES
    .some((prefix) =>
      path === prefix.replace(/\/$/, '')
      || path.startsWith(prefix)
    );

}

function classifyMediaStoragePath(
  storagePath
) {

  const path =
    normalizeMediaStoragePath(
      storagePath
    );

  if (!path) {
    return 'other';
  }

  const lower =
    path.toLowerCase();

  if (lower.endsWith('.gpx')) {
    return 'gpx';
  }

  if (
    /\.(jpe?g|png|gif|webp|avif|svg)$/.test(lower)
  ) {
    return 'image';
  }

  return 'other';

}

function mediaPathMatchesReference(
  storagePath,
  referencePath,
  legacyUrl
) {

  const path =
    normalizeMediaStoragePath(
      storagePath
    );

  if (
    path
    && referencePath
    && path === normalizeMediaStoragePath(
      referencePath
    )
  ) {
    return true;
  }

  if (
    !path
    || !legacyUrl
  ) {
    return false;
  }

  const legacyPath =
    extractMediaStoragePath(
      legacyUrl
    );

  if (
    legacyPath
    && legacyPath === path
  ) {
    return true;
  }

  return legacyUrl.includes(path);

}
