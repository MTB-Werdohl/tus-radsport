const MEDIA_STORAGE_ROOTS = [

  {
    id: 'shared',
    label: 'Shared',
    path: 'shared'
  },

  {
    id: 'recaps',
    label: 'Rückblicke',
    path: 'recaps'
  },

  {
    id: 'galleries',
    label: 'Galerien',
    path: 'galleries'
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
    'galleries',
    'protocols',
    'recaps'
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

  if (path.startsWith('galleries/')) {
    return 'galleries';
  }

  if (path.startsWith('recaps/')) {
    return 'recaps';
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
        && item.name !== 'galleries'
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

  const newsTable =
    window.siteConfig.tables.news;

  const [
    termineResult,
    newsResult,
    galleryResult
  ] =
    await Promise.all([

      window.supabaseClient
        .from(termineTable)
        .select(
          'id,title,slug,image,gpx,image_storage_path,gpx_storage_path,updated_at'
        ),

      window.supabaseClient
        .from(newsTable)
        .select(
          'id,title,slug,image,image_storage_path,updated_at'
        ),

      window.supabaseClient
        .from('gallery_images')
        .select(
          'id,gallery_id,image_path'
        )

    ]);

  if (termineResult.error) {
    throw termineResult.error;
  }

  if (newsResult.error) {
    throw newsResult.error;
  }

  if (galleryResult.error) {
    throw galleryResult.error;
  }

  mediaStorageReferenceIndex = {
    termine:
      termineResult.data || [],
    news:
      newsResult.data || [],
    gallery:
      galleryResult.data || []
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
    termine: [],
    news: [],
    gallery: []
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

  index.news.forEach((news) => {

    if (
      mediaPathMatchesReference(
        storagePath,
        news.image_storage_path,
        news.image
      )
    ) {

      references.news.push({
        id: news.id,
        title: news.title
      });

    }

  });

  index.gallery.forEach((image) => {

    if (
      mediaPathMatchesReference(
        storagePath,
        extractMediaStoragePath(
          image.image_path
        ),
        image.image_path
      )
    ) {

      references.gallery.push({
        id: image.id,
        galleryId:
          image.gallery_id
      });

    }

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

  if (references.news.length) {

    parts.push(
      `${references.news.length} News`
    );

  }

  if (references.gallery.length) {

    parts.push(
      `${references.gallery.length} Galerie${
        references.gallery.length === 1
          ? ''
          : 'n'
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

  mediaStorageReferenceIndex
    .news
    .forEach((news) => {

      const score =
        Number(news.id) || 0;

      if (news.image_storage_path) {

        registerRecentlyUsedMediaPath(
          map,
          news.image_storage_path,
          { kindFilter, score }
        );

      } else if (news.image) {

        registerRecentlyUsedMediaPath(
          map,
          extractMediaStoragePath(
            news.image
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
