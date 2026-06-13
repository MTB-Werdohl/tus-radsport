let mediaBrowserContextMenuEl = null;
let mediaBrowserDragPayload = null;
let mediaBrowserDraggedElement = null;
let mediaBrowserActiveDropFolder = null;
let mediaBrowserLongPressTimer = null;
let mediaBrowserLongPressPoint = null;
let mediaBrowserSuppressClickUntil = 0;

function ensureMediaBrowserContextMenu() {

  if (mediaBrowserContextMenuEl) {
    return mediaBrowserContextMenuEl;
  }

  mediaBrowserContextMenuEl =
    document.createElement('div');

  mediaBrowserContextMenuEl.id =
    'media-browser-context-menu';

  mediaBrowserContextMenuEl.className =
    'admin-media-context-menu';

  mediaBrowserContextMenuEl.hidden =
    true;

  document.body.appendChild(
    mediaBrowserContextMenuEl
  );

  document.addEventListener('click', (event) => {

    if (
      !mediaBrowserContextMenuEl
      || mediaBrowserContextMenuEl.hidden
    ) {
      return;
    }

    if (
      mediaBrowserContextMenuEl.contains(
        event.target
      )
    ) {
      return;
    }

    hideMediaBrowserContextMenu();

  });

  document.addEventListener('keydown', (event) => {

    if (
      event.key === 'Escape'
      && mediaBrowserContextMenuEl
      && !mediaBrowserContextMenuEl.hidden
    ) {
      hideMediaBrowserContextMenu();
    }

  });

  window.addEventListener('scroll', () => {
    hideMediaBrowserContextMenu();
  }, true);

  return mediaBrowserContextMenuEl;

}

function hideMediaBrowserContextMenu() {

  if (!mediaBrowserContextMenuEl) {
    return;
  }

  mediaBrowserContextMenuEl.hidden =
    true;

  mediaBrowserContextMenuEl.innerHTML =
    '';

  mediaBrowserContextMenuEl.classList.remove(
    'is-sheet'
  );

}

function showMediaBrowserContextMenu(
  options
) {

  const menu =
    ensureMediaBrowserContextMenu();

  const items =
    options.items || [];

  if (!items.length) {
    return;
  }

  menu.innerHTML =
    items
      .map((item) => {

        if (item.separator) {
          return '<div class="admin-media-context-menu__sep" role="separator"></div>';
        }

        const disabled =
          item.disabled
            ? ' disabled'
            : '';

        const dangerClass =
          item.danger
            ? ' admin-media-context-menu__item--danger'
            : '';

        return `
<button
  type="button"
  class="admin-media-context-menu__item${dangerClass}"
  data-menu-action="${escapeAdminHtml(item.id)}"
  ${disabled}>

  ${escapeAdminHtml(item.label)}

</button>
        `.trim();

      })
      .join('');

  menu.hidden = false;

  const useSheet =
    options.sheet
    || window.matchMedia(
      '(max-width: 760px)'
    ).matches
    || options.forceSheet;

  if (useSheet) {

    menu.classList.add('is-sheet');

  } else {

    menu.classList.remove('is-sheet');

    const x =
      Math.min(
        options.x || 0,
        window.innerWidth - menu.offsetWidth - 8
      );

    const y =
      Math.min(
        options.y || 0,
        window.innerHeight - menu.offsetHeight - 8
      );

    menu.style.left = `${Math.max(8, x)}px`;
    menu.style.top = `${Math.max(8, y)}px`;

  }

  menu
    .querySelectorAll('[data-menu-action]')
    .forEach((button) => {

      button.addEventListener('click', async () => {

        if (button.disabled) {
          return;
        }

        const actionId =
          button.dataset.menuAction;

        const item =
          items.find(
            (entry) =>
              entry.id === actionId
          );

        hideMediaBrowserContextMenu();

        if (
          item
          && typeof item.action
            === 'function'
        ) {
          await item.action();
        }

      });

    });

}

function buildMediaFileContextMenuItems(
  file
) {

  const publicUrl =
    resolveMediaPublicUrl(
      file.path
    ) || '';

  const canMove =
    canMoveMediaStoragePath(
      file.path
    );

  const canDelete =
    canDeleteMediaStoragePath(
      file.path
    );

  const items = [];

  if (publicUrl) {

    items.push({
      id: 'open',
      label: 'Öffnen',
      action: () => {
        window.open(
          publicUrl,
          '_blank',
          'noopener'
        );
      }
    });

  }

  items.push({
    id: 'copy-path',
    label: 'Pfad kopieren',
    action: () => {
      copyTextToClipboard(
        file.path,
        'Pfad kopiert.'
      );
    }
  });

  if (publicUrl) {

    items.push({
      id: 'copy-url',
      label: 'URL kopieren',
      action: () => {
        copyTextToClipboard(
          publicUrl,
          'URL kopiert.'
        );
      }
    });

  }

  if (canMove) {

    items.push(
      { separator: true },
      {
        id: 'rename',
        label: 'Umbenennen',
        action: () => {
          promptRenameMediaStorageFile(
            file
          );
        }
      },
      {
        id: 'move',
        label: 'Verschieben …',
        action: () => {
          promptMoveMediaStorageFile(
            file
          );
        }
      }
    );

  }

  if (canDelete) {

    items.push(
      { separator: true },
      {
        id: 'delete',
        label: 'Löschen',
        danger: true,
        action: () => {
          promptDeleteMediaStorageFile(
            file
          );
        }
      }
    );

  }

  return items;

}

function buildMediaFolderContextMenuItems(
  folderPath
) {

  const path =
    normalizeMediaStorageBrowserPath(
      folderPath
    );

  const canUpload =
    canDropMediaFileOnFolderTarget(
      path
    );

  const items = [
    {
      id: 'open',
      label: 'Ordner öffnen',
      action: async () => {

        mediaBrowserCurrentPath =
          path;

        mediaBrowserCurrentRoot =
          inferMediaStorageRootId(
            path
          );

        renderMediaBrowserRoots();
        syncMediaBrowserTreeSelection();
        await loadMediaBrowserView();
        closeMediaBrowserTreeDrawer();

      }
    },
    {
      id: 'copy-path',
      label: 'Pfad kopieren',
      action: () => {
        copyTextToClipboard(
          path,
          'Pfad kopiert.'
        );
      }
    }
  ];

  if (canUpload) {

    items.push({
      id: 'upload',
      label: 'Dateien hochladen …',
      action: () => {
        triggerMediaBrowserUpload(
          path
        );
      }
    });

  }

  return items;

}

function openMediaFileContextMenu(
  file,
  clientX,
  clientY
) {

  showMediaBrowserContextMenu({
    x: clientX,
    y: clientY,
    items:
      buildMediaFileContextMenuItems(
        file
      )
  });

}

function openMediaFolderContextMenu(
  folderPath,
  clientX,
  clientY
) {

  showMediaBrowserContextMenu({
    x: clientX,
    y: clientY,
    items:
      buildMediaFolderContextMenuItems(
        folderPath
      )
  });

}

function clearMediaBrowserDropTargets() {

  document
    .querySelectorAll(
      '.admin-media-drop-target--active'
    )
    .forEach((element) => {
      element.classList.remove(
        'admin-media-drop-target--active'
      );
    });

  mediaBrowserActiveDropFolder =
    null;

}

function resolveMediaBrowserDropFolderFromPoint(
  clientX,
  clientY
) {

  const element =
    document.elementFromPoint(
      clientX,
      clientY
    );

  if (!element) {
    return null;
  }

  const target =
    element.closest(
      '[data-media-drop-folder]'
    );

  if (!target) {
    return null;
  }

  const folderPath =
    target.dataset.mediaDropFolder
    || '';

  if (
    !canDropMediaFileOnFolderTarget(
      folderPath
    )
  ) {
    return null;
  }

  return folderPath;

}

function updateMediaBrowserDropTargetFromPoint(
  clientX,
  clientY
) {

  clearMediaBrowserDropTargets();

  const folderPath =
    resolveMediaBrowserDropFolderFromPoint(
      clientX,
      clientY
    );

  if (!folderPath) {
    return;
  }

  document
    .querySelectorAll(
      `[data-media-drop-folder="${CSS.escape(folderPath)}"]`
    )
    .forEach((element) => {
      element.classList.add(
        'admin-media-drop-target--active'
      );
    });

  mediaBrowserActiveDropFolder =
    folderPath;

}

async function executeMediaBrowserInternalDrop() {

  if (
    !mediaBrowserDragPayload
    || mediaBrowserDragPayload.type
      !== 'file'
    || !mediaBrowserActiveDropFolder
  ) {
    return false;
  }

  const sourcePath =
    mediaBrowserDragPayload.path;

  const targetFolder =
    mediaBrowserActiveDropFolder;

  try {

    await moveMediaStorageFileToFolder(
      sourcePath,
      targetFolder,
      mediaBrowserDragPayload.kind
    );

    await refreshMediaBrowserAfterMutation();

    return true;

  } catch (error) {

    console.error(error);

    window.alert(
      error.message
      || 'Verschieben fehlgeschlagen.'
    );

    return false;

  }

}

async function executeMediaBrowserExternalDrop(
  folderPath,
  fileList
) {

  const target =
    normalizeMediaStorageBrowserPath(
      folderPath
    );

  if (
    !canDropMediaFileOnFolderTarget(
      target
    )
  ) {
    window.alert(
      'Upload nur in shared/-Ordner möglich.'
    );
    return;
  }

  try {

    await uploadFilesToMediaFolder(
      target,
      fileList
    );

    await refreshMediaBrowserAfterMutation();

    window.alert(
      `${fileList.length} Datei(en) hochgeladen.`
    );

  } catch (error) {

    console.error(error);

    window.alert(
      error.message
      || 'Upload fehlgeschlagen.'
    );

  }

}

function finishMediaBrowserDrag() {

  if (mediaBrowserDraggedElement) {
    mediaBrowserDraggedElement.classList.remove(
      'admin-media-explorer-item--dragging'
    );
  }

  mediaBrowserDragPayload = null;
  mediaBrowserDraggedElement = null;

  clearMediaBrowserDropTargets();

}

function bindMediaBrowserExplorerRoot(
  root
) {

  if (
    !root
    || root.dataset.explorerBound
      === '1'
  ) {
    return;
  }

  root.dataset.explorerBound =
    '1';

  root.addEventListener('contextmenu', (event) => {

    const fileRow =
      event.target.closest(
        '[data-media-file-path]'
      );

    const folderRow =
      event.target.closest(
        '[data-media-folder-path]'
      );

    if (fileRow) {

      event.preventDefault();

      const file =
        getMediaBrowserFileFromElement(
          fileRow
        );

      if (file) {
        openMediaFileContextMenu(
          file,
          event.clientX,
          event.clientY
        );
      }

      return;

    }

    if (folderRow) {

      event.preventDefault();

      openMediaFolderContextMenu(
        folderRow.dataset.mediaFolderPath,
        event.clientX,
        event.clientY
      );

    }

  });

  root.addEventListener('dragstart', (event) => {

    const row =
      event.target.closest(
        '[data-media-file-path]'
      );

    const handle =
      event.target.closest(
        '[data-media-drag-handle]'
      );

    if (
      !row
      || !handle
    ) {
      event.preventDefault();
      return;
    }

    const file =
      getMediaBrowserFileFromElement(
        row
      );

    if (
      !file
      || !canMoveMediaStoragePath(
        file.path
      )
    ) {
      event.preventDefault();
      return;
    }

    mediaBrowserDragPayload = {
      type: 'file',
      path: file.path,
      kind: file.kind
    };

    mediaBrowserDraggedElement =
      row;

    row.classList.add(
      'admin-media-explorer-item--dragging'
    );

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed =
        'move';
      event.dataTransfer.setData(
        'text/plain',
        file.path
      );
    }

  });

  root.addEventListener('dragend', () => {
    finishMediaBrowserDrag();
  });

  root.addEventListener('dragover', (event) => {

    const hasInternal =
      !!mediaBrowserDragPayload;

    const hasExternal =
      !!event.dataTransfer
      ?.types?.includes('Files');

    if (
      !hasInternal
      && !hasExternal
    ) {
      return;
    }

    event.preventDefault();

    if (hasInternal) {
      updateMediaBrowserDropTargetFromPoint(
        event.clientX,
        event.clientY
      );
    }

    if (
      hasExternal
      && event.dataTransfer
    ) {
      event.dataTransfer.dropEffect =
        'copy';
    }

  });

  root.addEventListener('drop', async (event) => {

    event.preventDefault();

    if (mediaBrowserDragPayload) {

      await executeMediaBrowserInternalDrop();
      finishMediaBrowserDrag();
      return;

    }

    const folderTarget =
      event.target.closest(
        '[data-media-drop-folder]'
      );

    const files =
      event.dataTransfer?.files;

    if (
      !folderTarget
      || !files
      || !files.length
    ) {
      return;
    }

    await executeMediaBrowserExternalDrop(
      folderTarget.dataset.mediaDropFolder,
      files
    );

  });

  root.addEventListener('click', (event) => {

    if (
      Date.now()
      < mediaBrowserSuppressClickUntil
    ) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    const menuButton =
      event.target.closest(
        '[data-media-context-trigger]'
      );

    if (menuButton) {

      event.preventDefault();
      event.stopPropagation();

      const fileRow =
        menuButton.closest(
          '[data-media-file-path]'
        );

      const folderRow =
        menuButton.closest(
          '[data-media-folder-path]'
        );

      const rect =
        menuButton.getBoundingClientRect();

      if (fileRow) {

        const file =
          getMediaBrowserFileFromElement(
            fileRow
          );

        if (file) {
          openMediaFileContextMenu(
            file,
            rect.left,
            rect.bottom + 4
          );
        }

        return;

      }

      if (folderRow) {

        openMediaFolderContextMenu(
          folderRow.dataset.mediaFolderPath,
          rect.left,
          rect.bottom + 4
        );

      }

      return;

    }

    const folderOpen =
      event.target.closest(
        '[data-media-folder-open]'
      );

    if (folderOpen) {

      mediaBrowserCurrentPath =
        folderOpen.dataset.mediaFolderOpen
        || '';

      loadMediaBrowserView();
      syncMediaBrowserTreeSelection();

    }

  });

  root.addEventListener('touchstart', (event) => {

    const dragHandle =
      event.target.closest(
        '[data-media-drag-handle]'
      );

    if (dragHandle) {

      clearTimeout(
        mediaBrowserLongPressTimer
      );

      mediaBrowserLongPressTimer =
        null;

      const row =
        dragHandle.closest(
          '[data-media-file-path]'
        );

      if (!row) {
        return;
      }

      const file =
        getMediaBrowserFileFromElement(
          row
        );

      if (
        !file
        || !canMoveMediaStoragePath(
          file.path
        )
      ) {
        return;
      }

      mediaBrowserDragPayload = {
        type: 'file',
        path: file.path,
        kind: file.kind
      };

      mediaBrowserDraggedElement =
        row;

      row.classList.add(
        'admin-media-explorer-item--dragging'
      );

      return;

    }

    const target =
      event.target.closest(
        '[data-media-file-path], [data-media-folder-path]'
      );

    if (!target) {
      return;
    }

    const touch =
      event.changedTouches[0]
      || event.touches[0];

    if (!touch) {
      return;
    }

    mediaBrowserLongPressPoint = {
      x: touch.clientX,
      y: touch.clientY
    };

    clearTimeout(
      mediaBrowserLongPressTimer
    );

    mediaBrowserLongPressTimer =
      window.setTimeout(() => {

        mediaBrowserSuppressClickUntil =
          Date.now() + 400;

        if (
          target.matches(
            '[data-media-file-path]'
          )
          || target.closest(
            '[data-media-file-path]'
          )
        ) {

          const row =
            target.closest(
              '[data-media-file-path]'
            ) || target;

          const file =
            getMediaBrowserFileFromElement(
              row
            );

          if (file) {
            openMediaFileContextMenu(
              file,
              touch.clientX,
              touch.clientY
            );
          }

          return;

        }

        const folderRow =
          target.closest(
            '[data-media-folder-path]'
          ) || target;

        openMediaFolderContextMenu(
          folderRow.dataset.mediaFolderPath,
          touch.clientX,
          touch.clientY
        );

      }, 550);

  }, {
    passive: true
  });

  root.addEventListener('touchmove', (event) => {

    if (mediaBrowserLongPressTimer) {

      clearTimeout(
        mediaBrowserLongPressTimer
      );

      mediaBrowserLongPressTimer =
        null;

    }

    if (!mediaBrowserDragPayload) {
      return;
    }

    event.preventDefault();

    const touch =
      event.changedTouches[0]
      || event.touches[0];

    if (!touch) {
      return;
    }

    updateMediaBrowserDropTargetFromPoint(
      touch.clientX,
      touch.clientY
    );

  }, {
    passive: false
  });

  root.addEventListener('touchend', async (event) => {

    if (mediaBrowserLongPressTimer) {

      clearTimeout(
        mediaBrowserLongPressTimer
      );

      mediaBrowserLongPressTimer =
        null;

    }

    if (!mediaBrowserDragPayload) {
      return;
    }

    event.preventDefault();

    const touch =
      event.changedTouches[0]
      || event.touches[0];

    if (touch) {
      updateMediaBrowserDropTargetFromPoint(
        touch.clientX,
        touch.clientY
      );
    }

    await executeMediaBrowserInternalDrop();
    finishMediaBrowserDrag();

  });

  root.addEventListener('touchcancel', () => {

    clearTimeout(
      mediaBrowserLongPressTimer
    );

    mediaBrowserLongPressTimer =
      null;

    finishMediaBrowserDrag();

  });

  document.addEventListener('dragover', (event) => {

    if (!mediaBrowserDragPayload) {
      return;
    }

    event.preventDefault();

    updateMediaBrowserDropTargetFromPoint(
      event.clientX,
      event.clientY
    );

  });

  document.addEventListener('drop', async (event) => {

    if (!mediaBrowserDragPayload) {
      return;
    }

    if (
      !root.contains(
        event.target
      )
      && !event.target.closest(
        '#media-browser-tree-panel'
      )
    ) {
      return;
    }

    event.preventDefault();

    await executeMediaBrowserInternalDrop();
    finishMediaBrowserDrag();

  });

}

function getMediaBrowserFileFromElement(
  element
) {

  if (!element) {
    return null;
  }

  const path =
    element.dataset.mediaFilePath;

  if (!path) {
    return null;
  }

  return {
    path,
    kind:
      element.dataset.mediaFileKind
      || classifyMediaStoragePath(
        path
      ),
    name:
      formatMediaFileLabel(path)
  };

}

let mediaBrowserUploadTargetPath =
  null;

function triggerMediaBrowserUpload(
  folderPath
) {

  mediaBrowserUploadTargetPath =
    normalizeMediaStorageBrowserPath(
      folderPath
    );

  document
    .getElementById(
      'media-browser-upload-input'
    )
    ?.click();

}

function bindMediaBrowserUploadControl() {

  const input =
    document.getElementById(
      'media-browser-upload-input'
    );

  const button =
    document.getElementById(
      'media-browser-upload-btn'
    );

  button
    ?.addEventListener('click', () => {

      triggerMediaBrowserUpload(
        mediaBrowserCurrentPath
      );

    });

  input
    ?.addEventListener('change', async () => {

      const files =
        input.files;

      if (
        !files
        || !files.length
      ) {
        return;
      }

      const target =
        mediaBrowserUploadTargetPath
        || mediaBrowserCurrentPath;

      try {

        await uploadFilesToMediaFolder(
          target,
          files
        );

        await refreshMediaBrowserAfterMutation();

        window.alert(
          `${files.length} Datei(en) hochgeladen.`
        );

      } catch (error) {

        console.error(error);

        window.alert(
          error.message
          || 'Upload fehlgeschlagen.'
        );

      }

      input.value = '';

    });

}

function updateMediaBrowserUploadButtonState() {

  const button =
    document.getElementById(
      'media-browser-upload-btn'
    );

  if (!button) {
    return;
  }

  const enabled =
    canDropMediaFileOnFolderTarget(
      mediaBrowserCurrentPath
    );

  button.disabled = !enabled;

}

function bindMediaBrowserTreeDropTargets() {

  const treePanel =
    document.getElementById(
      'media-browser-tree-panel'
    );

  if (
    !treePanel
    || treePanel.dataset.dropBound
      === '1'
  ) {
    return;
  }

  treePanel.dataset.dropBound =
    '1';

  treePanel.addEventListener('dragover', (event) => {

    if (
      !mediaBrowserDragPayload
      && !event.dataTransfer
        ?.types?.includes('Files')
    ) {
      return;
    }

    event.preventDefault();

    if (mediaBrowserDragPayload) {
      updateMediaBrowserDropTargetFromPoint(
        event.clientX,
        event.clientY
      );
    }

  });

  treePanel.addEventListener('drop', async (event) => {

    event.preventDefault();

    if (mediaBrowserDragPayload) {

      await executeMediaBrowserInternalDrop();
      finishMediaBrowserDrag();
      return;

    }

    const folderTarget =
      event.target.closest(
        '[data-media-drop-folder]'
      );

    const files =
      event.dataTransfer?.files;

    if (
      !folderTarget
      || !files
      || !files.length
    ) {
      return;
    }

    await executeMediaBrowserExternalDrop(
      folderTarget.dataset.mediaDropFolder,
      files
    );

  });

}
