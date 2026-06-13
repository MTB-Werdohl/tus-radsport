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

  const { data, error } =
    await window.supabaseClient
      .rpc(
        'move_media_object',
        {
          p_old_path: oldPath,
          p_new_path: newPath
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

  const { data, error } =
    await window.supabaseClient
      .rpc(
        'delete_media_object',
        {
          p_path: storagePath,
          p_force: force
        }
      );

  if (error) {
    throw error;
  }

  return data;

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

  await loadMediaStorageReferenceIndex(
    true
  );

  await loadMediaBrowserView();

}

async function promptMoveMediaStorageFile(
  file
) {

  const currentPath =
    normalizeMediaStorageBrowserPath(
      file.path
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

  const currentPath =
    normalizeMediaStorageBrowserPath(
      file.path
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

  const currentPath =
    normalizeMediaStorageBrowserPath(
      file.path
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
