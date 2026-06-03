const PROTOCOL_SCOPE_ABTEILUNG =
  'abteilung';

const PROTOCOL_SCOPE_HAUPTVEREIN =
  'hauptverein';

const PROTOCOL_SCOPE_LABELS = {
  [PROTOCOL_SCOPE_ABTEILUNG]:
    'Abteilung',
  [PROTOCOL_SCOPE_HAUPTVEREIN]:
    'Hauptverein / Beirat'
};

const PROTOCOL_MEETING_LABELS = [
  'Vorstandssitzung',
  'Beiratssitzung',
  'Information',
  'Beschluss'
];

function getProtocolTableName() {

  return window.siteConfig.tables.boardDocuments;

}

function formatProtocolDate(value) {

  if (!value) {
    return '—';
  }

  const date =
    new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

}

function formatProtocolTitle(row) {

  const label =
    row?.meeting_label
    || 'Vorstandssitzung';

  const dateLabel =
    formatProtocolDate(row?.meeting_date);

  return `${label} vom ${dateLabel}`;

}

function getProtocolScopeLabel(scope) {

  return PROTOCOL_SCOPE_LABELS[scope]
    || PROTOCOL_SCOPE_LABELS[PROTOCOL_SCOPE_ABTEILUNG];

}

function getProtocolScopeCardClass(scope) {

  return scope === PROTOCOL_SCOPE_HAUPTVEREIN
    ? 'admin-protocol-card--hauptverein'
    : 'admin-protocol-card--abteilung';

}

function normalizeProtocolAttachments(value) {

  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {

      if (typeof item === 'string') {
        return item.trim();
      }

      return String(item?.path || '')
        .trim();

    })
    .filter(Boolean)
    .map((path) => ({ path }));

}

function getProtocolFileLabel(path) {

  const name =
    String(path || '')
      .split('/')
      .pop()
      || 'Datei';

  const withoutTimestamp =
    name.match(/^\d+-(.+)$/);

  return withoutTimestamp
    ? withoutTimestamp[1]
    : name;

}

function sanitizeProtocolFilename(name) {

  return String(name || 'datei')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 120);

}

async function uploadProtocolFile(file) {

  if (!file) {
    return null;
  }

  const path =
    `protocols/${Date.now()}-${sanitizeProtocolFilename(file.name)}`;

  const { error } =
    await window.supabaseClient
      .storage
      .from(window.siteConfig.storage.media)
      .upload(
        path,
        file,
        {
          cacheControl: '3600',
          upsert: false
        }
      );

  if (error) {
    throw error;
  }

  return path;

}

async function uploadProtocolPdf(file) {

  return uploadProtocolFile(file);

}

async function getProtocolSignedUrl(
  storagePath
) {

  if (!storagePath) {
    return null;
  }

  const { data, error } =
    await window.supabaseClient
      .storage
      .from(window.siteConfig.storage.media)
      .createSignedUrl(
        storagePath,
        60 * 60
      );

  if (error) {

    console.error(error);

    return null;

  }

  return data?.signedUrl || null;

}

async function deleteProtocolStoragePath(
  storagePath
) {

  if (!storagePath) {
    return;
  }

  const { error } =
    await window.supabaseClient
      .storage
      .from(window.siteConfig.storage.media)
      .remove([storagePath]);

  if (error) {
    console.error(error);
  }

}

function getProtocolViewUrl(id) {

  return `/admin/protokoll.html?id=${encodeURIComponent(String(id))}`;

}

function getProtocolEditUrl(id) {

  if (!id) {
    return '/admin/protokoll_edit.html';
  }

  return `/admin/protokoll_edit.html?id=${encodeURIComponent(String(id))}`;

}
