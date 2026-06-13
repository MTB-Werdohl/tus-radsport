const mediaBrowserTreeCache =

  new Map();



const mediaBrowserTreeExpanded =

  new Set([

    'shared::shared'

  ]);



function getMediaBrowserNodeKey(

  rootId,

  folderPath

) {



  return (

    `${rootId}::${

      normalizeMediaStorageBrowserPath(

        folderPath

      )

    }`

  );



}



function invalidateMediaBrowserTreeCache(

  pathPrefix

) {



  if (!pathPrefix) {

    mediaBrowserTreeCache.clear();

    return;

  }



  const prefix =

    normalizeMediaStorageBrowserPath(

      pathPrefix

    );



  for (const key of mediaBrowserTreeCache.keys()) {



    if (

      key.endsWith(`::${prefix}`)

      || key.includes(`::${prefix}/`)

    ) {

      mediaBrowserTreeCache.delete(key);

    }



  }



}



async function loadMediaBrowserTreeContents(

  folderPath,

  rootId

) {



  const path =

    normalizeMediaStorageBrowserPath(

      folderPath

    );



  const cacheKey =

    getMediaBrowserNodeKey(

      rootId,

      path

    );



  if (mediaBrowserTreeCache.has(cacheKey)) {

    return mediaBrowserTreeCache.get(cacheKey);

  }



  const listing =

    await listMediaStorageEntries(

      path,

      {

        rootId,

        kindFilter:

          mediaBrowserCurrentFilter

      }

    );



  mediaBrowserTreeCache.set(

    cacheKey,

    listing

  );



  return listing;



}



function isMediaBrowserNodeExpanded(

  rootId,

  folderPath

) {



  return mediaBrowserTreeExpanded.has(

    getMediaBrowserNodeKey(

      rootId,

      folderPath

    )

  );



}



function toggleMediaBrowserNodeExpanded(

  rootId,

  folderPath

) {



  const nodeKey =

    getMediaBrowserNodeKey(

      rootId,

      folderPath

    );



  if (

    mediaBrowserTreeExpanded.has(

      nodeKey

    )

  ) {

    mediaBrowserTreeExpanded.delete(

      nodeKey

    );

    return false;

  }



  mediaBrowserTreeExpanded.add(

    nodeKey

  );



  return true;



}



function syncMediaBrowserTreeSelection() {



  const selectedKey =

    getMediaBrowserNodeKey(

      mediaBrowserCurrentRoot,

      mediaBrowserCurrentPath

    );



  document

    .querySelectorAll(

      '[data-media-tree-select]'

    )

    .forEach((row) => {



      const nodeKey =

        row.dataset.mediaTreeSelect

        || '';



      row.classList.toggle(

        'is-selected',

        nodeKey === selectedKey

      );



    });



}



function renderMediaBrowserTreeIcon(

  file

) {



  const publicUrl =

    resolveMediaPublicUrl(

      file.path

    ) || '';



  if (

    file.kind === 'image'

    && publicUrl

  ) {



    return `

<span class="admin-media-tree__icon admin-media-tree__icon--thumb">



  <img

    class="admin-media-tree__thumb"

    src="${escapeAdminHtml(publicUrl)}"

    alt="">



</span>

    `.trim();



  }



  const label =

    file.kind === 'gpx'

      ? 'GPX'

      : '📄';



  return `

<span class="admin-media-tree__icon admin-media-tree__icon--file">



  ${label}



</span>

  `.trim();



}



function renderMediaBrowserFileTreeNode(

  file,

  rootId,

  depth

) {



  const isLegacy =

    !file.path.includes('/');



  const canMove =

    canMoveMediaStoragePath(

      file.path

    );



  const fileName =

    escapeAdminHtml(

      formatMediaFileLabel(

        file.path

      )

    );



  const legacyBadge =

    isLegacy

      ? '<span class="admin-media-badge admin-media-badge--legacy">Legacy</span>'

      : '';



  const handleHtml =

    canMove

      ? `

<button

  type="button"

  class="admin-media-tree__handle"

  data-media-drag-handle

  aria-label="Verschieben"

  title="Verschieben">



  ☰



</button>

      `.trim()

      : '';



  const isFileSelected =

    mediaBrowserSelectedFilePath

    === file.path;



  return `

<li class="admin-media-tree__node admin-media-tree__node--file">



  <div

    class="admin-media-tree__row admin-media-explorer-item${

      isFileSelected

        ? ' is-selected'

        : ''

    }"

    style="--tree-depth:${depth}"

    data-media-file-path="${escapeAdminHtml(file.path)}"

    data-media-file-kind="${escapeAdminHtml(file.kind)}"

    data-media-tree-file-select="${escapeAdminHtml(file.path)}"

    draggable="${canMove ? 'true' : 'false'}">



    <span

      class="admin-media-tree__chevron admin-media-tree__chevron--spacer"

      aria-hidden="true">



    </span>



    ${renderMediaBrowserTreeIcon(file)}



    <span class="admin-media-tree__label">

      ${fileName}

      ${legacyBadge}

    </span>



    <span class="admin-media-tree__actions">



      ${handleHtml}



      <button

        type="button"

        class="admin-media-tree__menu"

        data-media-context-trigger

        aria-label="Aktionen">



        ⋮



      </button>



    </span>



  </div>



</li>

  `.trim();



}



async function renderMediaBrowserTreeNode(

  folderPath,

  rootId,

  depth

) {



  const path =

    normalizeMediaStorageBrowserPath(

      folderPath

    );



  const root =

    getMediaStorageRootConfig(

      rootId

    );



  const nodeKey =

    getMediaBrowserNodeKey(

      rootId,

      path

    );



  const isRootLevel =

    depth === 0;



  const label =

    isRootLevel

      ? root.label

      : path.split('/').pop()

      || path

      || root.label;



  const expanded =

    isMediaBrowserNodeExpanded(

      rootId,

      path

    );



  let childrenHtml =

    '';



  const listing =

    await loadMediaBrowserTreeContents(

      path,

      rootId

    );



  const hasChildren =

    !!(

      (listing.folders || []).length

      || (listing.files || []).length

    );



  if (expanded) {



    const folderNodes =

      await Promise.all(

        (listing.folders || []).map(

          (folder) =>

            renderMediaBrowserTreeNode(

              folder.path,

              rootId,

              depth + 1

            )

        )

      );



    const fileNodes =

      (listing.files || []).map(

        (file) =>

          renderMediaBrowserFileTreeNode(

            file,

            rootId,

            depth + 1

          )

      );



    childrenHtml =

      [

        ...folderNodes,

        ...fileNodes

      ].join('');



  }



  const canDrop =

    canDropMediaFileOnFolderTarget(

      path

    );



  const isSelected =

    nodeKey

    === getMediaBrowserNodeKey(

      mediaBrowserCurrentRoot,

      mediaBrowserCurrentPath

    );



  const chevronLabel =

    expanded

      ? 'einklappen'

      : 'aufklappen';



  const chevronSymbol =

    hasChildren

      ? (expanded ? '▾' : '▸')

      : '';



  return `

<li

  class="admin-media-tree__node admin-media-tree__node--folder"

  data-media-tree-item="${escapeAdminHtml(nodeKey)}">



  <div

    class="admin-media-tree__row admin-media-explorer-item admin-media-explorer-item--folder${

      canDrop

        ? ' admin-media-drop-target'

        : ''

    }${

      isSelected

        ? ' is-selected'

        : ''

    }"

    style="--tree-depth:${depth}"

    data-media-folder-path="${escapeAdminHtml(path)}"

    data-media-drop-folder="${escapeAdminHtml(path)}"

    data-media-tree-select="${escapeAdminHtml(nodeKey)}"

    data-media-tree-root="${escapeAdminHtml(rootId)}"

    data-media-tree-path="${escapeAdminHtml(path)}">



    <button

      type="button"

      class="admin-media-tree__chevron${

        hasChildren

          ? ''

          : ' admin-media-tree__chevron--empty'

      }"

      data-media-tree-toggle="${escapeAdminHtml(nodeKey)}"

      data-media-tree-root="${escapeAdminHtml(rootId)}"

      data-media-tree-path="${escapeAdminHtml(path)}"

      aria-expanded="${expanded ? 'true' : 'false'}"

      aria-label="${escapeAdminHtml(label)} ${chevronLabel}"

      ${hasChildren ? '' : 'tabindex="-1"'}>



      ${chevronSymbol}



    </button>



    <span

      class="admin-media-tree__icon admin-media-tree__icon--folder"

      aria-hidden="true">



      📁



    </span>



    <span class="admin-media-tree__label">

      ${escapeAdminHtml(label)}

    </span>



    <span class="admin-media-tree__actions">



      <button

        type="button"

        class="admin-media-tree__menu"

        data-media-context-trigger

        aria-label="Aktionen">



        ⋮



      </button>



    </span>



  </div>



  ${

    expanded

    && childrenHtml

      ? `

  <ul class="admin-media-tree__children">

    ${childrenHtml}

  </ul>

      `

      : ''

  }



</li>

  `.trim();



}



async function renderMediaBrowserTree() {



  const container =

    document.getElementById(

      'media-browser-tree'

    );



  if (!container) {

    return;

  }



  container.innerHTML =

    '<p class="admin-hint">Medien werden geladen …</p>';



  try {



    const rootNodes =

      await Promise.all(

        MEDIA_STORAGE_ROOTS.map(

          (root) =>

            renderMediaBrowserTreeNode(

              root.path,

              root.id,

              0

            )

        )

      );



    container.innerHTML = `

<ul class="admin-media-tree">

  ${rootNodes.join('')}

</ul>

    `.trim();



    bindMediaBrowserTreeEvents(

      container

    );



    syncMediaBrowserTreeSelection();

    syncMediaBrowserFileSelection();



  } catch (error) {



    console.error(error);



    container.innerHTML = `

<p class="admin-hint admin-hint--error">

  ${escapeAdminHtml(

    error.message

    || 'Explorer konnte nicht geladen werden.'

  )}

</p>

    `.trim();



  }



}



function selectMediaBrowserFolder(

  rootId,

  folderPath

) {



  mediaBrowserCurrentRoot =

    rootId;



  mediaBrowserCurrentPath =

    normalizeMediaStorageBrowserPath(

      folderPath

    );



  syncMediaBrowserTreeSelection();

  updateMediaBrowserUploadButtonState();

  clearMediaBrowserFileSelection();

}



function bindMediaBrowserTreeEvents(

  container

) {



  container

    .querySelectorAll(

      '[data-media-tree-toggle]'

    )

    .forEach((button) => {



      if (

        button.classList.contains(

          'admin-media-tree__chevron--empty'

        )

      ) {

        return;

      }



      button.addEventListener(

        'click',

        async (event) => {



          event.stopPropagation();



          toggleMediaBrowserNodeExpanded(

            button.dataset.mediaTreeRoot

            || mediaBrowserCurrentRoot,

            button.dataset.mediaTreePath

            || ''

          );



          await renderMediaBrowserTree();



        }

      );



    });



  container

    .querySelectorAll(

      '[data-media-tree-select]'

    )

    .forEach((row) => {



      row.addEventListener(

        'click',

        async (event) => {



          if (

            event.target.closest(

              '[data-media-context-trigger], [data-media-drag-handle], [data-media-tree-toggle]'

            )

          ) {

            return;

          }



          const rootId =

            row.dataset.mediaTreeRoot

            || mediaBrowserCurrentRoot;



          const folderPath =

            row.dataset.mediaTreePath

            || '';



          selectMediaBrowserFolder(

            rootId,

            folderPath

          );



          if (

            !isMediaBrowserNodeExpanded(

              rootId,

              folderPath

            )

          ) {

            toggleMediaBrowserNodeExpanded(

              rootId,

              folderPath

            );

            await renderMediaBrowserTree();

          }



        }

      );



    });



  container

    .querySelectorAll(

      '[data-media-tree-file-select]'

    )

    .forEach((row) => {



      row.addEventListener(

        'click',

        (event) => {



          if (

            event.target.closest(

              '[data-media-context-trigger], [data-media-drag-handle]'

            )

          ) {

            return;

          }



          const file =

            getMediaBrowserFileFromElement(

              row

            );



          if (file) {

            selectMediaBrowserFile(

              file

            );

          }



        }

      );



    });



}



async function refreshMediaBrowserTree() {



  invalidateMediaBrowserTreeCache();



  await renderMediaBrowserTree();



}



function canDropMediaFileOnFolderTarget(

  folderPath

) {



  const path =

    normalizeMediaStorageBrowserPath(

      folderPath

    );



  if (!path) {

    return false;

  }



  if (path.startsWith('protocols/')) {

    return false;

  }



  if (path.startsWith('galleries/')) {

    return false;

  }



  return (

    path.startsWith('shared/')

    || path === 'shared'

  );



}



function buildMediaPathInFolder(

  folderPath,

  fileName

) {



  const folder =

    normalizeMediaStorageBrowserPath(

      folderPath

    );



  const safeName =

    sanitizeMediaStorageFilename(

      fileName

    );



  if (!folder) {

    return safeName;

  }



  return `${folder}/${safeName}`;



}

