const MEDIA_REFERENCED_ERROR =
  'MEDIA_REFERENCED';

function isMediaReferencedRpcError(
  error
) {

  if (!error) {
    return false;
  }

  if (
    error.message
    === MEDIA_REFERENCED_ERROR
  ) {
    return true;
  }

  if (
    String(error.message || '')
      .includes(MEDIA_REFERENCED_ERROR)
  ) {
    return true;
  }

  return false;

}

function parseMediaReferencesRpcError(
  error
) {

  if (
    error?.details
    && typeof error.details === 'string'
  ) {

    try {
      return JSON.parse(
        error.details
      );
    } catch (parseError) {
      console.warn(parseError);
    }

  }

  return null;

}

async function fetchMediaReferencesRpc(
  storagePath
) {

  const { data, error } =
    await window.supabaseClient
      .rpc(
        'get_media_references',
        {
          p_path: storagePath
        }
      );

  if (error) {
    throw error;
  }

  return data;

}

async function moveMediaObjectRpc(
  oldPath,
  newPath
) {

  const oldNormalized =
    normalizeMediaStorageBrowserPath(
      oldPath
    );

  const newNormalized =
    normalizeMediaStorageBrowserPath(
      newPath
    );

  const bucket =
    getMediaStorageBucket();

  const { error: moveError } =
    await window.supabaseClient
      .storage
      .from(bucket)
      .move(
        oldNormalized,
        newNormalized
      );

  if (moveError) {
    throw moveError;
  }

  const { data, error } =
    await window.supabaseClient
      .rpc(
        'sync_media_object_references',
        {
          p_old_path: oldNormalized,
          p_new_path: newNormalized
        }
      );

  if (error) {
    throw error;
  }

  return data;

}

async function deleteMediaObjectRpc(
  storagePath,
  force = false
) {

  const path =
    normalizeMediaStorageBrowserPath(
      storagePath
    );

  if (!path) {
    throw new Error('Pfad fehlt');
  }

  if (!force) {

    const references =
      await fetchMediaReferencesRpc(
        path
      );

    const total =
      references?.counts?.total || 0;

    if (total > 0) {

      const rpcError =
        new Error(MEDIA_REFERENCED_ERROR);

      rpcError.details =
        JSON.stringify(references);

      throw rpcError;

    }

  }

  const { error } =
    await window.supabaseClient
      .storage
      .from(getMediaStorageBucket())
      .remove([path]);

  if (error) {
    throw error;
  }

  return {
    ok: true,
    path,
    forced: force
  };

}

function isLegacyRootMediaPath(
  storagePath
) {

  const path =
    normalizeMediaStorageBrowserPath(
      storagePath
    );

  if (!path) {
    return false;
  }

  return !path.includes('/');

}

function isSharedManagedMediaPath(
  storagePath
) {

  const path =
    normalizeMediaStorageBrowserPath(
      storagePath
    );

  return !!path
    && path.startsWith('shared/');

}

function canMoveMediaStoragePath(
  storagePath
) {

  const path =
    normalizeMediaStorageBrowserPath(
      storagePath
    );

  if (!path) {
    return false;
  }

  if (
    path.startsWith('protocols/')
    || path.startsWith('galleries/')
    || path.startsWith('recaps/')
  ) {
    return false;
  }

  return (
    isSharedManagedMediaPath(path)
    || isLegacyRootMediaPath(path)
  );

}

function canDeleteMediaStoragePath(
  storagePath
) {

  const path =
    normalizeMediaStorageBrowserPath(
      storagePath
    );

  if (!path) {
    return false;
  }

  return !path.startsWith('protocols/');

}

function buildMediaPathWithNewFileName(
  currentPath,
  newFileName
) {

  const safeName =
    sanitizeMediaStorageFilename(
      newFileName
    );

  const parts =
    normalizeMediaStorageBrowserPath(
      currentPath
    ).split('/');

  parts[parts.length - 1] =
    safeName;

  return parts.join('/');

}

function buildMediaPathFromPromptInput(
  inputPath
) {

  return normalizeMediaStorageBrowserPath(
    inputPath
  );

}

function summarizeMediaReferencesPayload(
  references
) {

  if (!references) {
    return 'Keine Referenzen';
  }

  const localRefs = {
    termine:
      references.termine || [],
    news:
      references.news || [],
    gallery:
      references.gallery || []
  };

  return renderMediaStorageReferenceSummary(
    localRefs
  );

}

function formatMediaMoveResultMessage(
  result
) {

  if (!result?.updated) {
    return 'Datei verschoben.';
  }

  const parts = [];

  Object.entries(result.updated)
    .forEach(([key, value]) => {

      if (value > 0) {
        parts.push(`${key}: ${value}`);
      }

    });

  if (!parts.length) {
    return 'Datei verschoben (keine DB-Referenzen geändert).';
  }

  return `Datei verschoben. Aktualisiert: ${parts.join(', ')}`;

}

async function refreshMediaBrowserAfterMutation() {

  invalidateMediaStorageReferenceIndex();

  await refreshMediaBrowserTree();

  if (mediaBrowserSelectedFilePath) {

    const stillVisible =

      document.querySelector(

        `[data-media-tree-file-select="${CSS.escape(

          mediaBrowserSelectedFilePath

        )}"]`

      );

    if (!stillVisible) {

      clearMediaBrowserFileSelection();

    }

  }

  await renderMediaBrowserDetail();

}

async function moveMediaStorageFileToFolder(
  sourcePath,
  targetFolderPath,
  fileKind
) {

  const resolvedSource =
    await resolveActualMediaStoragePath(
      sourcePath
    );

  const currentPath =
    normalizeMediaStorageBrowserPath(
      resolvedSource
    );

  const targetFolder =
    normalizeMediaStorageBrowserPath(
      targetFolderPath
    );

  if (
    !canMoveMediaStoragePath(
      currentPath
    )
  ) {
    throw new Error(
      'Diese Datei kann nicht verschoben werden.'
    );
  }

  if (
    !canDropMediaFileOnFolderTarget(
      targetFolder
    )
  ) {
    throw new Error(
      'Zielordner nicht erlaubt.'
    );
  }

  const fileName =
    currentPath.split('/').pop()
    || currentPath;

  let newPath =
    buildMediaPathInFolder(
      targetFolder,
      fileName
    );

  if (
    isLegacyRootMediaPath(currentPath)
  ) {

    const folder =
      fileKind === 'gpx'
        ? (
          window.MEDIA_STORAGE_FOLDERS
            ?.sharedRoutes
          || 'shared/routes'
        )
        : (
          window.MEDIA_STORAGE_FOLDERS
            ?.sharedImages
          || 'shared/images'
        );

    newPath =
      `${folder}/${sanitizeMediaStorageFilename(fileName)}`;

  }

  if (
    !newPath.startsWith('shared/')
  ) {
    throw new Error(
      'Zielpfad muss mit shared/ beginnen.'
    );
  }

  if (newPath === currentPath) {
    return {
      skipped: true
    };
  }

  if (
    isLegacyRootMediaPath(currentPath)
  ) {

    const confirmed =
      window.confirm(
        'Legacy-Datei verschieben: Alle Referenzen werden aktualisiert. Fortfahren?'
      );

    if (!confirmed) {
      throw new Error('Abgebrochen.');
    }

  }

  const result =
    await moveMediaObjectRpc(
      currentPath,
      newPath
    );

  if (
    mediaBrowserSelectedFilePath
    === currentPath
    || mediaBrowserSelectedFilePath
    === sourcePath
  ) {
    mediaBrowserSelectedFilePath =
      newPath;
  }

  return result;

}

async function uploadFilesToMediaFolder(
  folderPath,
  fileList
) {

  const folder =
    normalizeMediaStorageBrowserPath(
      folderPath
    );

  if (
    !canDropMediaFileOnFolderTarget(
      folder
    )
  ) {
    throw new Error(
      'Upload nur in shared/-Ordner möglich.'
    );
  }

  const uploads = [];

  for (const file of fileList) {

    if (!file) {
      continue;
    }

    const upload =
      await uploadMediaStorageFile(
        folder,
        file
      );

    if (upload.error) {
      throw upload.error;
    }

    uploads.push(upload);

  }

  return uploads;

}

async function promptMoveMediaStorageFile(
  file
) {

  const resolvedPath =
    await resolveActualMediaStoragePath(
      file.path
    );

  const currentPath =
    normalizeMediaStorageBrowserPath(
      resolvedPath
    );

  if (
    !canMoveMediaStoragePath(
      currentPath
    )
  ) {
    window.alert(
      'Diese Datei kann hier nicht verschoben werden.'
    );
    return;
  }

  const defaultTarget =
    isLegacyRootMediaPath(currentPath)
      ? `${file.kind === 'gpx'
        ? (
          window.MEDIA_STORAGE_FOLDERS
            ?.sharedRoutes
          || 'shared/routes'
        )
        : (
          window.MEDIA_STORAGE_FOLDERS
            ?.sharedImages
          || 'shared/images'
        )}/${formatMediaFileLabel(currentPath)}`
      : currentPath;

  const input =
    window.prompt(
      'Neuer Pfad (unter shared/…):',
      defaultTarget
    );

  if (input === null) {
    return;
  }

  const newPath =
    buildMediaPathFromPromptInput(
      input
    );

  if (
    !newPath
    || newPath === currentPath
  ) {
    return;
  }

  if (
    !newPath.startsWith('shared/')
  ) {
    window.alert(
      'Zielpfad muss mit shared/ beginnen.'
    );
    return;
  }

  if (
    isLegacyRootMediaPath(currentPath)
    && !window.confirm(
      'Legacy-Datei verschieben: Alle Referenzen in Terminen, News und Galerien werden aktualisiert. Fortfahren?'
    )
  ) {
    return;
  }

  try {

    const result =
      await moveMediaObjectRpc(
        currentPath,
        newPath
      );

    if (
      mediaBrowserSelectedFilePath
      === currentPath
    ) {
      mediaBrowserSelectedFilePath =
        newPath;
    }

    await refreshMediaBrowserAfterMutation();

    window.alert(
      formatMediaMoveResultMessage(
        result
      )
    );

  } catch (error) {

    console.error(error);

    window.alert(
      error.message
      || 'Verschieben fehlgeschlagen.'
    );

  }

}

async function promptRenameMediaStorageFile(
  file
) {

  const resolvedPath =
    await resolveActualMediaStoragePath(
      file.path
    );

  const currentPath =
    normalizeMediaStorageBrowserPath(
      resolvedPath
    );

  if (
    !canMoveMediaStoragePath(
      currentPath
    )
  ) {
    window.alert(
      'Diese Datei kann hier nicht umbenannt werden.'
    );
    return;
  }

  const currentName =
    currentPath.split('/').pop()
    || currentPath;

  const input =
    window.prompt(
      'Neuer Dateiname:',
      currentName
    );

  if (
    input === null
    || !input.trim()
  ) {
    return;
  }

  let newPath;

  if (
    isLegacyRootMediaPath(currentPath)
  ) {

    const folder =
      file.kind === 'gpx'
        ? (
          window.MEDIA_STORAGE_FOLDERS
            ?.sharedRoutes
          || 'shared/routes'
        )
        : (
          window.MEDIA_STORAGE_FOLDERS
            ?.sharedImages
          || 'shared/images'
        );

    newPath =
      `${folder}/${sanitizeMediaStorageFilename(input)}`;

  } else {

    newPath =
      buildMediaPathWithNewFileName(
        currentPath,
        input
      );

  }

  if (newPath === currentPath) {
    return;
  }

  if (
    !newPath.startsWith('shared/')
  ) {
    window.alert(
      'Zielpfad muss mit shared/ beginnen.'
    );
    return;
  }

  if (
    isLegacyRootMediaPath(currentPath)
    && !window.confirm(
      'Legacy-Datei umbenennen: Alle Referenzen werden aktualisiert. Fortfahren?'
    )
  ) {
    return;
  }

  try {

    const result =
      await moveMediaObjectRpc(
        currentPath,
        newPath
      );

    if (
      mediaBrowserSelectedFilePath
      === currentPath
    ) {
      mediaBrowserSelectedFilePath =
        newPath;
    }

    await refreshMediaBrowserAfterMutation();

    window.alert(
      formatMediaMoveResultMessage(
        result
      )
    );

  } catch (error) {

    console.error(error);

    window.alert(
      error.message
      || 'Umbenennen fehlgeschlagen.'
    );

  }

}

async function promptDeleteMediaStorageFile(
  file
) {

  const resolvedPath =
    await resolveActualMediaStoragePath(
      file.path
    );

  const currentPath =
    normalizeMediaStorageBrowserPath(
      resolvedPath
    );

  if (
    !canDeleteMediaStoragePath(
      currentPath
    )
  ) {
    window.alert(
      'Diese Datei kann hier nicht gelöscht werden.'
    );
    return;
  }

  let references;

  try {

    references =
      await fetchMediaReferencesRpc(
        currentPath
      );

  } catch (error) {

    console.error(error);

    window.alert(
      error.message
      || 'Referenzen konnten nicht geladen werden.'
    );

    return;

  }

  const total =
    references?.counts?.total || 0;

  if (total > 0) {

    const summary =
      summarizeMediaReferencesPayload(
        references
      );

    if (
      !window.confirm(
        `Datei wird noch verwendet (${summary}).\n\nTrotzdem löschen? Betroffene Inhalte verlieren das Medium.`
      )
    ) {
      return;
    }

    if (
      !window.confirm(
        'Letzte Warnung: Datei wirklich löschen?'
      )
    ) {
      return;
    }

    try {

      await deleteMediaObjectRpc(
        currentPath,
        true
      );

      await refreshMediaBrowserAfterMutation();

      window.alert(
        'Datei gelöscht (Referenzen können jetzt defekt sein).'
      );

    } catch (error) {

      console.error(error);

      window.alert(
        error.message
        || 'Löschen fehlgeschlagen.'
      );

    }

    return;

  }

  if (
    !window.confirm(
      'Datei unwiderruflich aus dem Storage löschen?'
    )
  ) {
    return;
  }

  try {

    await deleteMediaObjectRpc(
      currentPath,
      false
    );

    await refreshMediaBrowserAfterMutation();

    window.alert('Datei gelöscht.');

  } catch (error) {

    console.error(error);

    if (isMediaReferencedRpcError(error)) {

      window.alert(
        'Löschen abgebrochen: Datei wird noch verwendet.'
      );

      return;

    }

    window.alert(
      error.message
      || 'Löschen fehlgeschlagen.'
    );

  }

}

function formatMediaStorageFileSize(
  size
) {

  const bytes =
    Number(size) || 0;

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;

}

function guessMediaStorageContentType(
  path
) {

  const lower =
    String(path || '')
      .toLowerCase();

  if (lower.endsWith('.png')) {
    return 'image/png';
  }

  if (
    lower.endsWith('.jpg')
    || lower.endsWith('.jpeg')
  ) {
    return 'image/jpeg';
  }

  if (lower.endsWith('.webp')) {
    return 'image/webp';
  }

  if (lower.endsWith('.gif')) {
    return 'image/gif';
  }

  if (lower.endsWith('.gpx')) {
    return 'application/gpx+xml';
  }

  return 'application/octet-stream';

}

async function copyMediaStorageBlob(
  sourcePath,
  targetPath
) {

  const source =
    normalizeMediaStorageBrowserPath(
      sourcePath
    );

  const target =
    normalizeMediaStorageBrowserPath(
      targetPath
    );

  const bucket =
    getMediaStorageBucket();

  const { data, error } =
    await window.supabaseClient
      .storage
      .from(bucket)
      .download(source);

  if (error) {
    throw error;
  }

  const { error: uploadError } =
    await window.supabaseClient
      .storage
      .from(bucket)
      .upload(
        target,
        data,
        {
          upsert: true,
          contentType:
            data.type
            || guessMediaStorageContentType(
              target
            )
        }
      );

  if (uploadError) {
    throw uploadError;
  }

}

async function findMediaRepairSourcePath(
  targetPath
) {

  const target =
    normalizeMediaStorageBrowserPath(
      targetPath
    );

  const candidates =
    [
      ...new Set(
        [
          ...(await discoverMediaStoragePathCandidates(
            target
          )),
          ...buildMediaStoragePathCandidates(
            target
          )
        ]
      )
    ];

  for (const candidate of candidates) {

    if (candidate === target) {
      continue;
    }

    const entry =
      await getMediaStorageFileEntry(
        candidate
      );

    if (
      entry
      && entry.size > 0
    ) {
      return candidate;
    }

  }

  return null;

}

async function repairMediaStorageShell(
  targetPath
) {

  const target =
    normalizeMediaStorageBrowserPath(
      targetPath
    );

  const sourcePath =
    await findMediaRepairSourcePath(
      target
    );

  if (!sourcePath) {
    throw new Error(
      'Keine Quelldatei mit Inhalt gefunden. Prüfe shared/ (z. B. Datei mit Zeitstempel-Prefix) oder lade das Bild neu hoch.'
    );
  }

  await copyMediaStorageBlob(
    sourcePath,
    target
  );

  invalidateMediaStoragePathResolveCache();

  return {
    sourcePath,
    targetPath: target
  };

}

async function promptRepairMediaStorageFile(
  file
) {

  const targetPath =
    normalizeMediaStorageBrowserPath(
      file.path
    );

  const sourcePath =
    await findMediaRepairSourcePath(
      targetPath
    );

  if (!sourcePath) {
    window.alert(
      'Keine Quelldatei mit Inhalt gefunden.\n\nTypisch nach Backfill: Original liegt noch unter shared/ mit Zeitstempel (z. B. 1731378609-datei.png). Alternativ Bild neu hochladen.'
    );
    return;
  }

  if (
    !window.confirm(
      `Leere Datei reparieren?\n\nQuelle: ${sourcePath}\nZiel: ${targetPath}`
    )
  ) {
    return;
  }

  try {

    await repairMediaStorageShell(
      targetPath
    );

    await refreshMediaBrowserAfterMutation();

    window.alert(
      'Inhalt wiederhergestellt.'
    );

  } catch (error) {

    console.error(error);

    window.alert(
      error.message
      || 'Reparatur fehlgeschlagen.'
    );

  }

}
