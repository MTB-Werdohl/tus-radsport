const MEDIA_STORAGE_ROOTS = [

  {
    id: 'shared',
    label: 'Shared',
    path: 'shared'
  }

];

const mediaStoragePathResolveCache =
  new Map();

function mediaStorageBaseFileName(
  fileName
) {

  return String(
    fileName || ''
  ).replace(
    /^[0-9]+-/,
    ''
  );

}

function mediaStorageNamesMatch(
  leftName,
  rightName
) {

  if (
    !leftName
    || !rightName
  ) {
    return false;
  }

  if (leftName === rightName) {
    return true;
  }

  return (
    mediaStorageBaseFileName(
      leftName
    )
    === mediaStorageBaseFileName(
      rightName
    )
  );

}

function getMediaStorageFileSize(
  item
) {

  const rawSize =
    item?.metadata?.size
    ?? item?.metadata?.contentLength
    ?? 0;

  const size =
    Number(rawSize);

  return Number.isFinite(size)
    ? size
    : 0;

}

function isMediaStorageShellFile(
  file
) {

  if (!file) {
    return false;
  }

  return (
    file.size === 0
    || file.size === '0'
  );

}

async function getMediaStorageFileEntry(
  path
) {

  const normalized =
    normalizeMediaStorageBrowserPath(
      path
    );

  if (!normalized) {
    return null;
  }

  const prefix =
    normalized.includes('/')
      ? normalized.slice(
        0,
        normalized.lastIndexOf('/')
      )
      : '';

  const rootId =
    inferMediaStorageRootId(
      normalized
    );

  try {

    const listing =
      await listMediaStorageEntries(
        prefix,
        { rootId }
      );

    return (
      listing.files.find(
        (file) =>
          file.path === normalized
      )
      || null
    );

  } catch (error) {

    console.error(error);

    return null;

  }

}

async function discoverMediaStoragePathCandidates(
  storagePath
) {

  const normalized =
    normalizeMediaStorageBrowserPath(
      storagePath
    );

  if (!normalized) {
    return [];
  }

  const fileName =
    normalized.split('/').pop();

  const discovered = [];

  const searchLocations = [
    { prefix: 'shared', rootId: 'shared' },
    { prefix: '', rootId: 'legacy' }
  ];

  for (const location of searchLocations) {

    try {

      const listing =
        await listMediaStorageEntries(
          location.prefix,
          {
            rootId:
              location.rootId
          }
        );

      listing.files.forEach(
        (file) => {

          if (
            mediaStorageNamesMatch(
              file.name,
              fileName
            )
          ) {
            discovered.push(
              file.path
            );
          }

        }
      );

    } catch (error) {

      console.error(error);

    }

  }

  return [
    ...new Set(
      discovered.filter(Boolean)
    )
  ];

}

async function resolveActualMediaStoragePath(
  storagePath
) {

  const normalized =
    normalizeMediaStorageBrowserPath(
      storagePath
    );

  if (!normalized) {
    return storagePath;
  }

  if (
    mediaStoragePathResolveCache.has(
      normalized
    )
  ) {
    return mediaStoragePathResolveCache.get(
      normalized
    );
  }

  const discovered =
    await discoverMediaStoragePathCandidates(
      normalized
    );

  const candidates =
    [
      ...new Set(
        [
          normalized,
          ...discovered,
          ...buildMediaStoragePathCandidates(
            normalized
          )
        ]
      )
    ];

  let emptyFallback =
    null;

  for (const candidate of candidates) {

    const entry =
      await getMediaStorageFileEntry(
        candidate
      );

    if (!entry) {
      continue;
    }

    if (entry.size > 0) {

      mediaStoragePathResolveCache.set(
        normalized,
        candidate
      );

      return candidate;

    }

    if (!emptyFallback) {
      emptyFallback =
        candidate;
    }

  }

  const resolved =
    emptyFallback
    || normalized;

  mediaStoragePathResolveCache.set(
    normalized,
    resolved
  );

  return resolved;

}

function invalidateMediaStoragePathResolveCache() {

  mediaStoragePathResolveCache.clear();

}

let mediaStorageReferenceIndex = null;

let mediaStorageReferencePromise = null;

function normalizeMediaStorageBrowserPath(
  value
) {

  return String(value || '')
    .trim()
    .replace(/^\/+|\/+$/g, '');

}

function isMediaStorageFolderEntry(
  item
) {

  return !item?.id;

}

function getMediaStorageRootConfig(
  rootId
) {

  return MEDIA_STORAGE_ROOTS.find(
    (root) => root.id === rootId
  ) || MEDIA_STORAGE_ROOTS[0];

}

function isTopLevelManagedFolder(
  name
) {

  return [
    'shared',
    'protocols'
  ].includes(name);

}

function mediaStorageKindMatchesFilter(
  kind,
  filter
) {

  if (
    !filter
    || filter === 'all'
  ) {
    return true;
  }

  return kind === filter;

}

function getDefaultMediaBrowsePathForKind(
  kind
) {

  if (kind === 'gpx') {
    return (
      window.MEDIA_STORAGE_FOLDERS?.sharedRoutes
      || 'shared/routes'
    );
  }

  if (kind === 'image') {
    return (
      window.MEDIA_STORAGE_FOLDERS?.sharedImages
      || 'shared/images'
    );
  }

  return 'shared';

}

function inferMediaStorageRootId(
  relativePath
) {

  const path =
    normalizeMediaStorageBrowserPath(
      relativePath
    );

  if (
    !path
    || !path.includes('/')
  ) {
    return 'legacy';
  }

  if (path.startsWith('shared/')) {
    return 'shared';
  }

  return 'shared';

}

async function listMediaStorageEntries(
  relativePath,
  options = {}
) {

  const rootId =
    options.rootId
    || inferMediaStorageRootId(
      relativePath
    );

  const bucket =
    getMediaStorageBucket();

  const prefix =
    normalizeMediaStorageBrowserPath(
      relativePath
    );

  const { data, error } =
    await window.supabaseClient
      .storage
      .from(bucket)
      .list(
        prefix || '',
        {
          limit: 100,
          sortBy: {
            column: 'name',
            order: 'asc'
          }
        }
      );

  if (error) {
    throw error;
  }

  const folders = [];
  const files = [];

  (data || []).forEach((item) => {

    if (
      item.name === '.emptyFolderPlaceholder'
    ) {
      return;
    }

    const itemPath =
      prefix
        ? `${prefix}/${item.name}`
        : item.name;

    if (
      isMediaBrowserExcludedPath(
        itemPath
      )
    ) {
      return;
    }

    if (isMediaStorageFolderEntry(item)) {

      if (
        !prefix
        && rootId === 'legacy'
      ) {
        return;
      }

      if (
        !prefix
        && isTopLevelManagedFolder(
          item.name
        )
        && item.name !== 'shared'
      ) {
        return;
      }

      folders.push({
        name: item.name,
        path: itemPath
      });

      return;

    }

    const kind =
      classifyMediaStoragePath(
        itemPath
      );

    if (
      !mediaStorageKindMatchesFilter(
        kind,
        options.kindFilter
      )
    ) {
      return;
    }

    files.push({
      name: item.name,
      path: itemPath,
      size:
        getMediaStorageFileSize(
          item
        ),
      updatedAt:
        item.updated_at
        || item.created_at
        || null,
      kind
    });

  });

  return {
    folders,
    files
  };

}

async function loadMediaStorageReferenceIndex(
  force = false
) {

  if (
    mediaStorageReferenceIndex
    && !force
  ) {
    return mediaStorageReferenceIndex;
  }

  const termineTable =
    window.siteConfig.tables.termine;

  const termineResult =
    await window.supabaseClient
      .from(termineTable)
      .select(
        'id,title,slug,image,gpx,image_storage_path,gpx_storage_path,updated_at'
      );

  if (termineResult.error) {
    throw termineResult.error;
  }

  const stagesResult =
    await window.supabaseClient
      .from(
        window.siteConfig.tables
          .terminRouteStages
        || 'termin_route_stages'
      )
      .select(
        'id,termin_id,sort_order,gpx,gpx_storage_path'
      );

  if (stagesResult.error) {
    throw stagesResult.error;
  }

  mediaStorageReferenceIndex = {
    termine:
      termineResult.data || [],
    terminRouteStages:
      stagesResult.data || []
  };

  mediaStorageReferencePromise = null;

  return mediaStorageReferenceIndex;

}

async function ensureMediaStorageReferenceIndex() {

  if (mediaStorageReferenceIndex) {
    return mediaStorageReferenceIndex;
  }

  if (!mediaStorageReferencePromise) {

    mediaStorageReferencePromise =
      loadMediaStorageReferenceIndex();

  }

  return mediaStorageReferencePromise;

}

function invalidateMediaStorageReferenceIndex() {

  mediaStorageReferenceIndex = null;
  mediaStorageReferencePromise = null;

}

function findMediaStorageReferences(
  storagePath,
  index = mediaStorageReferenceIndex
) {

  const references = {
    termine: []
  };

  if (
    !index
    || !storagePath
  ) {
    return references;
  }

  index.termine.forEach((termin) => {

    if (
      mediaPathMatchesReference(
        storagePath,
        termin.image_storage_path,
        termin.image
      )
    ) {

      references.termine.push({
        id: termin.id,
        title: termin.title,
        kind: 'Bild'
      });

    }

    if (
      mediaPathMatchesReference(
        storagePath,
        termin.gpx_storage_path,
        termin.gpx
      )
    ) {

      references.termine.push({
        id: termin.id,
        title: termin.title,
        kind: 'GPX'
      });

    }

  });

  (index.terminRouteStages || []).forEach((stage) => {

    if (
      !mediaPathMatchesReference(
        storagePath,
        stage.gpx_storage_path,
        stage.gpx
      )
    ) {
      return;
    }

    const termin =
      index.termine.find(
        (row) => row.id === stage.termin_id
      );

    references.termine.push({
      id: stage.termin_id,
      title:
        termin?.title
        || `Termin #${stage.termin_id}`,
      kind:
        `GPX Tag ${stage.sort_order}`
    });

  });

  return references;

}

function renderMediaStorageReferenceSummary(
  references
) {

  const parts = [];

  if (references.termine.length) {

    parts.push(
      `${references.termine.length} Termin${
        references.termine.length === 1
          ? ''
          : 'e'
      }`
    );

  }

  if (!parts.length) {
    return 'Nicht referenziert';
  }

  return `Verwendet in: ${parts.join(', ')}`;

}

function registerRecentlyUsedMediaPath(
  map,
  storagePath,
  meta
) {

  const path =
    normalizeMediaStoragePath(
      storagePath
    );

  if (
    !path
    || isMediaBrowserExcludedPath(path)
  ) {
    return;
  }

  const kind =
    classifyMediaStoragePath(path);

  if (
    !mediaStorageKindMatchesFilter(
      kind,
      meta.kindFilter
    )
  ) {
    return;
  }

  const existing =
    map.get(path);

  if (
    existing
    && existing.score >= meta.score
  ) {
    return;
  }

  map.set(path, {
    path,
    kind,
    label:
      formatMediaFileLabel(path),
    score: meta.score
  });

}

function buildRecentlyUsedMediaPaths(
  kindFilter,
  limit = 20
) {

  if (!mediaStorageReferenceIndex) {
    return [];
  }

  const map = new Map();

  mediaStorageReferenceIndex
    .termine
    .forEach((termin) => {

      const score =
        Number(termin.id) || 0;

      if (termin.image_storage_path) {

        registerRecentlyUsedMediaPath(
          map,
          termin.image_storage_path,
          { kindFilter, score }
        );

      } else if (termin.image) {

        registerRecentlyUsedMediaPath(
          map,
          extractMediaStoragePath(
            termin.image
          ),
          { kindFilter, score }
        );

      }

      if (termin.gpx_storage_path) {

        registerRecentlyUsedMediaPath(
          map,
          termin.gpx_storage_path,
          { kindFilter, score }
        );

      } else if (termin.gpx) {

        registerRecentlyUsedMediaPath(
          map,
          extractMediaStoragePath(
            termin.gpx
          ),
          { kindFilter, score }
        );

      }

    });

  (mediaStorageReferenceIndex
    .terminRouteStages || [])
    .forEach((stage) => {

      const score =
        (Number(stage.termin_id) || 0)
        + (Number(stage.sort_order) || 0)
          / 100;

      if (stage.gpx_storage_path) {

        registerRecentlyUsedMediaPath(
          map,
          stage.gpx_storage_path,
          { kindFilter, score }
        );

      } else if (stage.gpx) {

        registerRecentlyUsedMediaPath(
          map,
          extractMediaStoragePath(
            stage.gpx
          ),
          { kindFilter, score }
        );

      }

    });

  return Array.from(map.values())
    .sort((left, right) =>
      right.score - left.score
    )
    .slice(0, limit);

}

function resolveMediaSelectionFromPath(
  storagePath
) {

  const path =
    normalizeMediaStoragePath(
      storagePath
    );

  if (!path) {
    return null;
  }

  return {
    storagePath: path,
    publicUrl:
      resolveMediaPublicUrl(path)
      || null,
    label:
      formatMediaFileLabel(path)
  };

}
