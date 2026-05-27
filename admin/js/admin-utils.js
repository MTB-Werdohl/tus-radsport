function escapeAdminHtml(value) {

  if (value === null || value === undefined) {
    return '';
  }

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

}

function extractStoragePath(url) {

  const split =
    url.split('/storage/v1/object/public/media/');

  return split[1] || null;

}

function safeMediaUrl(url) {

  if (!url || typeof url !== 'string') {
    return '';
  }

  if (url.startsWith('/')) {
    return escapeAdminHtml(url);
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

    return escapeAdminHtml(url);

  } catch (error) {

    return '';

  }

}
