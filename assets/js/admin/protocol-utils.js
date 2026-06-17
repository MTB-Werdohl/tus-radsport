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
  'Hauptversammlung'
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

  const rawLabel =
    row?.meeting_label
    || 'Vorstandssitzung';

  const label =
    rawLabel === 'Beschluss'
      ? 'Hauptversammlung'
      : rawLabel;

  const dateLabel =
    formatProtocolDate(row?.meeting_date);

  const baseTitle =
    `${label} vom ${dateLabel}`;

  const subject =
    String(row?.subject || '')
      .trim();

  if (!subject) {
    return baseTitle;
  }

  return `${baseTitle} - ${subject}`;

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

  if (typeof value === 'string') {

    try {
      value = JSON.parse(value);
    } catch (error) {
      return [];
    }

  }

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

function getProtocolStorageFolder(documentId) {

  return `protocols/${documentId}`;

}

function isProtocolStorageFolderPath(
  path,
  documentId
) {

  if (!documentId) {
    return false;
  }

  const folder =
    `${getProtocolStorageFolder(documentId)}/`;

  return String(path || '')
    .startsWith(folder);

}

function collectProtocolLegacyPaths(row) {

  const paths = [];

  if (row?.protocol_pdf_path) {
    paths.push(
      String(row.protocol_pdf_path).trim()
    );
  }

  normalizeProtocolAttachments(row?.attachments)
    .forEach((item) => {
      paths.push(item.path);
    });

  return [
    ...new Set(
      paths.filter(Boolean)
    )
  ];

}

function collectProtocolFilePaths(row) {

  return collectProtocolLegacyPaths(row);

}

async function collectProtocolAllFilePaths(row) {

  const paths =
    new Set(
      collectProtocolLegacyPaths(row)
    );

  if (row?.id) {

    const folderFiles =
      await listProtocolDocumentFiles(row.id);

    folderFiles.forEach((path) => {
      paths.add(path);
    });

  }

  return [
    ...paths
  ];

}

function getProtocolFileLabel(
  path,
  documentId
) {

  if (
    documentId
    && isProtocolStorageFolderPath(
      path,
      documentId
    )
  ) {

    return String(path)
      .slice(
        getProtocolStorageFolder(documentId).length + 1
      );

  }

  const name =
    String(path || '')
      .split('/')
      .pop()
      || 'Datei';

  const withRandomPrefix =
    name.match(
      /^\d+-\d+-[a-z0-9]+-(.+)$/i
    );

  if (withRandomPrefix) {
    return withRandomPrefix[1];
  }

  const withTimestampPrefix =
    name.match(/^\d+-(.+)$/);

  return withTimestampPrefix
    ? withTimestampPrefix[1]
    : name;

}

function normalizeFolderUploadRelativePath(
  relativePath
) {

  const parts =
    String(relativePath || '')
      .split(/[/\\]+/)
      .filter(Boolean)
      .map((part) =>
        sanitizeProtocolFilename(part)
      )
      .filter(Boolean);

  if (!parts.length) {
    return 'datei';
  }

  if (parts.length === 1) {
    return parts[0];
  }

  return parts.slice(1).join('/');

}

function getProtocolTreeLabel(
  path,
  documentId
) {

  if (
    String(path || '')
      .startsWith('pending://')
  ) {

    return String(path)
      .slice('pending://'.length);

  }

  return getProtocolFileLabel(
    path,
    documentId
  );

}

function buildProtocolPathTree(
  paths,
  documentId
) {

  const root = {
    folders: {},
    files: []
  };

  paths.forEach((path) => {

    const label =
      getProtocolTreeLabel(
        path,
        documentId
      );

    const parts =
      String(label || '')
        .split('/')
        .filter(Boolean);

    if (!parts.length) {
      return;
    }

    let node = root;

    parts.forEach((part, index) => {

      const isFile =
        index === parts.length - 1;

      if (isFile) {

        node.files.push({
          name: part,
          path
        });

        return;

      }

      if (!node.folders[part]) {

        node.folders[part] = {
          name: part,
          folders: {},
          files: []
        };

      }

      node =
        node.folders[part];

    });

  });

  return root;

}

function sortProtocolTreeNodes(node) {

  node.files.sort((a, b) =>
    a.name.localeCompare(
      b.name,
      'de'
    )
  );

  Object.values(node.folders)
    .forEach((folder) => {
      sortProtocolTreeNodes(folder);
    });

}

function buildProtocolPendingPreviewPaths(
  pendingFiles,
  pendingFolderReplace
) {

  const paths = [];

  if (pendingFolderReplace?.length) {

    pendingFolderReplace.forEach((file) => {

      paths.push(
        `pending://${normalizeFolderUploadRelativePath(
          file.webkitRelativePath
          || file.name
        )}`
      );

    });

    return paths;

  }

  (pendingFiles || []).forEach((file) => {

    paths.push(
      `pending://${sanitizeProtocolFilename(file.name)}`
    );

  });

  return paths;

}

function sanitizeProtocolFilename(name) {

  return String(name || 'datei')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 120);

}

function isProtocolStorageFolderEntry(item) {

  return !item?.id;

}

async function listProtocolStoragePaths(prefix) {

  const bucket =
    window.siteConfig.storage.media;

  const paths = [];

  async function walk(relativePath) {

    const { data, error } =
      await window.supabaseClient
        .storage
        .from(bucket)
        .list(relativePath, {
          limit: 1000,
          sortBy: {
            column: 'name',
            order: 'asc'
          }
        });

    if (error) {
      throw error;
    }

    for (const item of (data || [])) {

      if (
        item.name === '.emptyFolderPlaceholder'
      ) {
        continue;
      }

      const itemPath =
        relativePath
          ? `${relativePath}/${item.name}`
          : item.name;

      if (isProtocolStorageFolderEntry(item)) {

        await walk(itemPath);

        continue;

      }

      paths.push(itemPath);

    }

  }

  await walk(prefix);

  return paths;

}

async function listProtocolDocumentFiles(
  documentId
) {

  if (!documentId) {
    return [];
  }

  const folder =
    getProtocolStorageFolder(documentId);

  try {

    return await listProtocolStoragePaths(
      folder
    );

  } catch (error) {

    console.error(error);

    return [];

  }

}

async function removeProtocolStoragePaths(
  paths
) {

  const bucket =
    window.siteConfig.storage.media;

  const uniquePaths =
    [
      ...new Set(
        (paths || []).filter(Boolean)
      )
    ];

  if (!uniquePaths.length) {
    return;
  }

  for (
    let index = 0;
    index < uniquePaths.length;
    index += 100
  ) {

    const batch =
      uniquePaths.slice(
        index,
        index + 100
      );

    const { error } =
      await window.supabaseClient
        .storage
        .from(bucket)
        .remove(batch);

    if (error) {
      throw error;
    }

  }

}

async function clearProtocolStorageFolder(
  documentId
) {

  if (!documentId) {
    return;
  }

  const folder =
    getProtocolStorageFolder(documentId);

  const paths =
    await listProtocolStoragePaths(folder);

  await removeProtocolStoragePaths(paths);

}

async function deleteProtocolLegacyStorage(row) {

  const documentId =
    row?.id || null;

  const legacyPaths =
    collectProtocolLegacyPaths(row)
      .filter((path) =>
        !isProtocolStorageFolderPath(
          path,
          documentId
        )
      );

  await removeProtocolStoragePaths(
    legacyPaths
  );

}

async function deleteProtocolDocumentStorage(
  documentId,
  row
) {

  if (documentId) {

    await clearProtocolStorageFolder(
      documentId
    );

  }

  await deleteProtocolLegacyStorage(row);

}

async function uploadProtocolFileToFolder(
  documentId,
  file,
  relativePath
) {

  if (!file || !documentId) {
    return null;
  }

  const relative =
    relativePath
    || sanitizeProtocolFilename(file.name);

  const storagePath =
    `${getProtocolStorageFolder(documentId)}/${relative}`;

  await removeProtocolStoragePaths(
    [storagePath]
  );

  const { error } =
    await window.supabaseClient
      .storage
      .from(window.siteConfig.storage.media)
      .upload(
        storagePath,
        file,
        {
          cacheControl: '3600',
          upsert: false
        }
      );

  if (error) {
    throw error;
  }

  return storagePath;

}

async function uploadProtocolFilesToFolder(
  documentId,
  files
) {

  const uploaded = [];

  for (const file of (files || [])) {

    if (!file) {
      continue;
    }

    uploaded.push(
      await uploadProtocolFileToFolder(
        documentId,
        file
      )
    );

  }

  return uploaded;

}

async function moveProtocolStoragePath(
  fromPath,
  toPath
) {

  if (
    !fromPath
    || !toPath
    || fromPath === toPath
  ) {
    return toPath;
  }

  const bucket =
    window.siteConfig.storage.media;

  const storage =
    window.supabaseClient
      .storage
      .from(bucket);

  const { error: moveError } =
    await storage.move(
      fromPath,
      toPath
    );

  if (!moveError) {
    return toPath;
  }

  console.warn(
    'Storage move fehlgeschlagen, Copy-Fallback:',
    moveError
  );

  const { data, error: downloadError } =
    await storage.download(fromPath);

  if (downloadError) {
    throw downloadError;
  }

  await removeProtocolStoragePaths(
    [toPath]
  );

  const { error: uploadError } =
    await storage.upload(
      toPath,
      data,
      {
        cacheControl: '3600',
        upsert: false
      }
    );

  if (uploadError) {
    throw uploadError;
  }

  const { error: removeError } =
    await storage.remove([fromPath]);

  if (removeError) {
    throw removeError;
  }

  return toPath;

}

async function uploadProtocolFolderMerge(
  documentId,
  files
) {

  const uploaded = [];

  for (const file of (files || [])) {

    if (!file) {
      continue;
    }

    uploaded.push(
      await uploadProtocolFileToFolder(
        documentId,
        file,
        normalizeFolderUploadRelativePath(
          file.webkitRelativePath
          || file.name
        )
      )
    );

  }

  return uploaded;

}

async function uploadProtocolFolderReplace(
  documentId,
  files
) {

  await clearProtocolStorageFolder(
    documentId
  );

  return uploadProtocolFolderMerge(
    documentId,
    files
  );

}

let protocolUploadCounter = 0;

async function uploadProtocolFile(file) {

  if (!file) {
    return null;
  }

  protocolUploadCounter += 1;

  const path =
    `protocols/${Date.now()}-${protocolUploadCounter}-${Math.random().toString(36).slice(2, 8)}-${sanitizeProtocolFilename(file.name)}`;

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

  return `/protokoll/?id=${encodeURIComponent(String(id))}`;

}

function getProtocolEditUrl(id) {

  if (!id) {
    return '/protokoll-bearbeiten/';
  }

  return `/protokoll-bearbeiten/?id=${encodeURIComponent(String(id))}`;

}
