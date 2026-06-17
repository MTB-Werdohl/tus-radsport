let protocolManifestCounter = 0;

function createProtocolManifestKey(prefix) {

  protocolManifestCounter += 1;

  return `${prefix}:${Date.now()}-${protocolManifestCounter}-${Math.random().toString(36).slice(2, 8)}`;

}

function createProtocolManifestFromSources(
  options
) {

  const documentId =
    options.documentId || null;

  const legacyPaths =
    options.legacyPaths || [];

  const storedPaths =
    options.storedPaths || [];

  const storedRelativePaths =
    new Set(
      storedPaths.map((path) =>
        getProtocolFileLabel(
          path,
          documentId
        )
      )
    );

  const manifest = [];

  legacyPaths.forEach((path) => {

    const relativePath =
      getProtocolFileLabel(
        path,
        documentId
      );

    if (
      documentId
      && (
        isProtocolStorageFolderPath(
          path,
          documentId
        )
        || storedRelativePaths.has(relativePath)
      )
    ) {
      return;
    }

    manifest.push({
      key: createProtocolManifestKey('legacy'),
      kind: 'legacy',
      storagePath: path,
      relativePath,
      originalRelativePath: relativePath,
      file: null
    });

  });

  storedPaths.forEach((path) => {

    const relativePath =
      getProtocolFileLabel(
        path,
        documentId
      );

    manifest.push({
      key: createProtocolManifestKey('stored'),
      kind: 'stored',
      storagePath: path,
      relativePath,
      originalRelativePath: relativePath,
      file: null
    });

  });

  return manifest;

}

function snapshotProtocolManifest(manifest) {

  return (manifest || [])
    .map((entry) => ({
      key: entry.key,
      kind: entry.kind,
      relativePath: entry.relativePath,
      storagePath: entry.storagePath,
      originalRelativePath:
        entry.originalRelativePath
    }))
    .sort((a, b) =>
      a.relativePath.localeCompare(
        b.relativePath,
        'de'
      )
    );

}

function protocolManifestHasChanges(
  manifest,
  deletedStoragePaths,
  initialSnapshot
) {

  if (deletedStoragePaths?.size > 0) {
    return true;
  }

  if (
    (manifest || []).some((entry) =>
      entry.kind === 'pending'
    )
  ) {
    return true;
  }

  return JSON.stringify(
    snapshotProtocolManifest(manifest)
  ) !== JSON.stringify(
    initialSnapshot || []
  );

}

function trackProtocolManifestDeletion(
  entry,
  deletedStoragePaths
) {

  if (
    !entry?.storagePath
    || !deletedStoragePaths
  ) {
    return;
  }

  if (
    entry.kind === 'stored'
    || entry.kind === 'legacy'
  ) {
    deletedStoragePaths.add(
      entry.storagePath
    );
  }

}

function removeProtocolManifestEntry(
  manifest,
  entryKey,
  deletedStoragePaths
) {

  const index =
    manifest.findIndex((entry) =>
      entry.key === entryKey
    );

  if (index < 0) {
    return false;
  }

  trackProtocolManifestDeletion(
    manifest[index],
    deletedStoragePaths
  );

  manifest.splice(index, 1);

  return true;

}

function removeProtocolManifestFolder(
  manifest,
  folderRelativePath,
  deletedStoragePaths
) {

  const normalizedFolder =
    String(folderRelativePath || '')
      .replace(/^\/+|\/+$/g, '');

  const prefix =
    normalizedFolder
      ? `${normalizedFolder}/`
      : '';

  const keys =
    manifest
      .filter((entry) => {

        if (!normalizedFolder) {
          return !entry.relativePath.includes('/');
        }

        return entry.relativePath.startsWith(prefix);

      })
      .map((entry) => entry.key);

  keys.forEach((key) => {
    removeProtocolManifestEntry(
      manifest,
      key,
      deletedStoragePaths
    );
  });

  return keys.length > 0;

}

function upsertProtocolManifestFile(
  manifest,
  file,
  relativePath,
  deletedStoragePaths
) {

  const normalizedPath =
    String(relativePath || '')
      .replace(/^\/+|\/+$/g, '');

  const existingIndex =
    manifest.findIndex((entry) =>
      entry.relativePath === normalizedPath
    );

  if (existingIndex >= 0) {

    trackProtocolManifestDeletion(
      manifest[existingIndex],
      deletedStoragePaths
    );

    manifest.splice(existingIndex, 1);

  }

  manifest.push({
    key: createProtocolManifestKey('pending'),
    kind: 'pending',
    storagePath: null,
    relativePath: normalizedPath,
    originalRelativePath: null,
    file
  });

}

function addProtocolManifestFiles(
  manifest,
  files,
  deletedStoragePaths
) {

  (files || []).forEach((file) => {

    if (!file) {
      return;
    }

    upsertProtocolManifestFile(
      manifest,
      file,
      sanitizeProtocolFilename(file.name),
      deletedStoragePaths
    );

  });

}

function mergeProtocolManifestFolder(
  manifest,
  files,
  deletedStoragePaths
) {

  (files || []).forEach((file) => {

    if (!file) {
      return;
    }

    upsertProtocolManifestFile(
      manifest,
      file,
      normalizeFolderUploadRelativePath(
        file.webkitRelativePath
        || file.name
      ),
      deletedStoragePaths
    );

  });

}

function getProtocolEntryParentFolder(
  relativePath
) {

  const parts =
    String(relativePath || '')
      .split('/')
      .filter(Boolean);

  if (parts.length <= 1) {
    return '';
  }

  return parts.slice(0, -1).join('/');

}

function moveProtocolManifestEntry(
  manifest,
  entryKey,
  targetFolderRelativePath
) {

  const entry =
    manifest.find((item) =>
      item.key === entryKey
    );

  if (!entry) {
    return false;
  }

  const targetFolder =
    String(targetFolderRelativePath ?? '')
      .replace(/^\/+|\/+$/g, '');

  const currentParent =
    getProtocolEntryParentFolder(
      entry.relativePath
    );

  if (targetFolder === currentParent) {
    return false;
  }

  const fileName =
    entry.relativePath.split('/').pop();

  const newRelativePath =
    targetFolder
      ? `${targetFolder}/${fileName}`
      : fileName;

  if (
    manifest.some((item) =>
      item.key !== entryKey
      && item.relativePath === newRelativePath
    )
  ) {

    alert(
      'Im Zielordner existiert bereits eine Datei mit diesem Namen.'
    );

    return false;

  }

  entry.relativePath =
    newRelativePath;

  return true;

}

function moveProtocolManifestFolder(
  manifest,
  folderRelativePath,
  targetFolderRelativePath
) {

  const sourceFolder =
    String(folderRelativePath || '')
      .replace(/^\/+|\/+$/g, '');

  if (!sourceFolder) {
    return false;
  }

  const targetFolder =
    String(targetFolderRelativePath || '')
      .replace(/^\/+|\/+$/g, '');

  const folderName =
    sourceFolder.split('/').pop();

  const newPrefix =
    targetFolder
      ? `${targetFolder}/${folderName}`
      : folderName;

  if (newPrefix === sourceFolder) {
    return false;
  }

  if (
    newPrefix.startsWith(`${sourceFolder}/`)
  ) {

    alert(
      'Ein Ordner kann nicht in sich selbst verschoben werden.'
    );

    return false;

  }

  const sourcePrefix =
    `${sourceFolder}/`;

  const affected =
    manifest.filter((entry) =>
      entry.relativePath.startsWith(sourcePrefix)
    );

  if (!affected.length) {
    return false;
  }

  const plannedPaths =
    affected.map((entry) => {

      const suffix =
        entry.relativePath.slice(
          sourceFolder.length
        );

      return `${newPrefix}${suffix}`;

    });

  if (
    new Set(plannedPaths).size
    !== plannedPaths.length
  ) {

    alert(
      'Beim Verschieben entstehen doppelte Dateinamen.'
    );

    return false;

  }

  const plannedSet =
    new Set(plannedPaths);

  const conflict =
    manifest.some((entry) =>
      !affected.includes(entry)
      && plannedSet.has(entry.relativePath)
    );

  if (conflict) {

    alert(
      'Im Zielordner existieren bereits Dateien mit gleichen Namen.'
    );

    return false;

  }

  affected.forEach((entry, index) => {
    entry.relativePath = plannedPaths[index];
  });

  return true;

}

function buildProtocolManifestTree(manifest) {

  const root = {
    folders: {},
    files: []
  };

  (manifest || []).forEach((entry) => {

    const parts =
      String(entry.relativePath || '')
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
          entryKey: entry.key,
          kind: entry.kind,
          relativePath: entry.relativePath
        });

        return;

      }

      if (!node.folders[part]) {

        node.folders[part] = {
          name: part,
          folderRelativePath:
            parts.slice(0, index + 1).join('/'),
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

function sortProtocolManifestTree(node) {

  node.files.sort((a, b) =>
    a.name.localeCompare(
      b.name,
      'de'
    )
  );

  Object.values(node.folders)
    .forEach((folder) => {
      sortProtocolManifestTree(folder);
    });

}

function summarizeProtocolManifestChanges(
  manifest,
  deletedStoragePaths,
  initialSnapshot
) {

  return summarizeProtocolManifestPendingMessage(
    manifest,
    deletedStoragePaths,
    initialSnapshot
  );

}

function summarizeProtocolManifestPendingMessage(
  manifest,
  deletedStoragePaths,
  initialSnapshot
) {

  if (
    !protocolManifestHasChanges(
      manifest,
      deletedStoragePaths,
      initialSnapshot
    )
  ) {
    return '';
  }

  const parts = [];

  const pendingCount =
    (manifest || []).filter((entry) =>
      entry.kind === 'pending'
    ).length;

  const movedCount =
    (manifest || []).filter((entry) =>
      entry.kind !== 'pending'
      && entry.relativePath
      !== entry.originalRelativePath
    ).length;

  const deletedCount =
    deletedStoragePaths?.size || 0;

  if (pendingCount) {
    parts.push(
      `${pendingCount} neue Datei(en)`
    );
  }

  if (deletedCount) {
    parts.push(
      `${deletedCount} Datei(en) zum Löschen`
    );
  }

  if (movedCount) {
    parts.push(
      `${movedCount} verschobene Datei(en)`
    );
  }

  if (!parts.length) {
    return 'Dateistruktur geändert';
  }

  return `Noch nicht gespeichert: ${parts.join(', ')}.`;

}

async function applyProtocolManifestChanges(
  documentId,
  manifest,
  deletedStoragePaths
) {

  await removeProtocolStoragePaths(
    [
      ...deletedStoragePaths
    ]
  );

  for (const entry of (manifest || [])) {

    if (
      entry.kind === 'pending'
      || !entry.storagePath
    ) {
      continue;
    }

    const targetPath =
      `${getProtocolStorageFolder(documentId)}/${entry.relativePath}`;

    if (entry.storagePath === targetPath) {
      continue;
    }

    await moveProtocolStoragePath(
      entry.storagePath,
      targetPath
    );

    entry.storagePath = targetPath;
    entry.kind = 'stored';
    entry.originalRelativePath =
      entry.relativePath;

  }

  for (const entry of (manifest || [])) {

    if (entry.kind !== 'pending') {
      continue;
    }

    entry.storagePath =
      await uploadProtocolFileToFolder(
        documentId,
        entry.file,
        entry.relativePath
      );

    entry.kind = 'stored';
    entry.file = null;
    entry.originalRelativePath =
      entry.relativePath;

  }

}
