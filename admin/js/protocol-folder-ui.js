function createProtocolFolderDeleteButton(
  label,
  onClick
) {

  const button =
    document.createElement('button');

  button.type = 'button';
  button.className =
    'admin-protocol-folder-delete';
  button.title = label;
  button.setAttribute(
    'aria-label',
    label
  );
  button.textContent = '🗑';
  button.draggable = false;

  button.addEventListener('click', (event) => {

    event.preventDefault();
    event.stopPropagation();

    onClick();

  });

  return button;

}

function createProtocolFolderDragHandle() {

  const handle =
    document.createElement('span');

  handle.className =
    'admin-protocol-folder-drag-handle';
  handle.textContent = '☰';
  handle.setAttribute(
    'aria-hidden',
    'true'
  );
  handle.title =
    'Ziehen zum Verschieben';

  return handle;

}

function createProtocolFolderRowShell(
  className
) {

  const shell =
    document.createElement('div');

  shell.className =
    `admin-protocol-folder-row-shell ${className || ''}`.trim();

  return shell;

}

function appendProtocolFolderTreeNode(
  parent,
  node,
  options
) {

  const folderNames =
    Object.keys(node.folders)
      .sort((a, b) =>
        a.localeCompare(b, 'de')
      );

  folderNames.forEach((folderName) => {

    const folder =
      node.folders[folderName];

    sortProtocolManifestTree(folder);

    const details =
      document.createElement('details');

    details.className =
      'admin-protocol-folder-dir admin-protocol-folder-drop-target';

    details.open = true;

    details.dataset.dropFolder =
      folder.folderRelativePath || '';

    const summary =
      document.createElement('summary');

    summary.className =
      'admin-protocol-folder-dir-label admin-protocol-folder-draggable';

    summary.dataset.folderPath =
      folder.folderRelativePath || '';

    summary.draggable =
      options.mode === 'edit';

    const title =
      document.createElement('span');

    title.className =
      'admin-protocol-folder-dir-title';
    title.textContent =
      `📁 ${folderName}`;

    const summaryShell =
      createProtocolFolderRowShell(
        'admin-protocol-folder-dir-shell'
      );

    summaryShell.appendChild(
      createProtocolFolderDragHandle()
    );

    summaryShell.appendChild(title);

    if (options.mode === 'edit') {

      summaryShell.appendChild(
        createProtocolFolderDeleteButton(
          `Ordner ${folderName} löschen`,
          () => {
            options.onDeleteFolder?.(
              folder.folderRelativePath
            );
          }
        )
      );

    }

    summary.appendChild(summaryShell);
    details.appendChild(summary);

    const children =
      document.createElement('div');

    children.className =
      'admin-protocol-folder-dir-children admin-protocol-folder-drop-target';

    children.dataset.dropFolder =
      folder.folderRelativePath || '';

    appendProtocolFolderTreeNode(
      children,
      folder,
      options
    );

    details.appendChild(children);
    parent.appendChild(details);

  });

  node.files.forEach((file) => {

    const row =
      createProtocolFolderRowShell(
        'admin-protocol-folder-file-row admin-protocol-folder-draggable'
      );

    if (options.mode === 'edit') {

      row.draggable = true;
      row.dataset.entryKey =
        file.entryKey;

    }

    const isPending =
      file.kind === 'pending';

    if (
      options.mode === 'view'
      && !isPending
    ) {

      const link =
        document.createElement('a');

      link.className =
        'admin-protocol-folder-file';
      link.target = '_blank';
      link.rel =
        'noopener noreferrer';
      link.textContent =
        `📄 ${file.name}`;

      if (options.urlMap?.[file.path]) {

        link.href =
          options.urlMap[file.path];

      } else {

        link.classList.add(
          'admin-protocol-folder-file--missing'
        );
        link.removeAttribute('href');
        link.textContent =
          `📄 ${file.name} (Datei nicht erreichbar)`;

      }

      row.appendChild(link);

    } else {

      row.appendChild(
        createProtocolFolderDragHandle()
      );

      const label =
        document.createElement('span');

      label.className =
        isPending
          ? 'admin-protocol-folder-file admin-protocol-folder-file--pending'
          : 'admin-protocol-folder-file';
      label.textContent =
        isPending
          ? `📄 ${file.name} (neu)`
          : `📄 ${file.name}`;

      row.appendChild(label);

      if (options.mode === 'edit') {

        row.appendChild(
          createProtocolFolderDeleteButton(
            `Datei ${file.name} löschen`,
            () => {
              options.onDeleteEntry?.(
                file.entryKey
              );
            }
          )
        );

      }

    }

    parent.appendChild(row);

  });

}

function appendProtocolViewTreeNode(
  parent,
  node,
  options
) {

  const folderNames =
    Object.keys(node.folders)
      .sort((a, b) =>
        a.localeCompare(b, 'de')
      );

  folderNames.forEach((folderName) => {

    const folder =
      node.folders[folderName];

    sortProtocolTreeNodes(folder);

    const details =
      document.createElement('details');

    details.className =
      'admin-protocol-folder-dir';

    details.open = true;

    const summary =
      document.createElement('summary');

    summary.className =
      'admin-protocol-folder-dir-label';
    summary.textContent =
      `📁 ${folderName}`;

    details.appendChild(summary);

    const children =
      document.createElement('div');

    children.className =
      'admin-protocol-folder-dir-children';

    appendProtocolViewTreeNode(
      children,
      folder,
      options
    );

    details.appendChild(children);
    parent.appendChild(details);

  });

  node.files.forEach((file) => {

    const row =
      createProtocolFolderRowShell(
        'admin-protocol-folder-file-row admin-protocol-folder-row-shell--view'
      );

    const link =
      document.createElement('a');

    link.className =
      'admin-protocol-folder-file';
    link.target = '_blank';
    link.rel =
      'noopener noreferrer';
    link.textContent =
      `📄 ${file.name}`;

    if (options.urlMap?.[file.path]) {

      link.href =
        options.urlMap[file.path];

    } else {

      link.classList.add(
        'admin-protocol-folder-file--missing'
      );
      link.removeAttribute('href');
      link.textContent =
        `📄 ${file.name} (Datei nicht erreichbar)`;

    }

    row.appendChild(link);
    parent.appendChild(row);

  });

}

function getProtocolFolderDropTarget(
  element
) {

  const target =
    element?.closest(
      '.admin-protocol-folder-drop-target'
    );

  if (!target) {
    return null;
  }

  return String(
    target.dataset.dropFolder ?? ''
  );

}

function resolveProtocolFolderDropTarget(
  clientX,
  clientY
) {

  if (
    typeof clientX !== 'number'
    || typeof clientY !== 'number'
  ) {
    return null;
  }

  const element =
    document.elementFromPoint(
      clientX,
      clientY
    );

  return getProtocolFolderDropTarget(
    element
  );

}

function bindProtocolFolderTreeEdit(
  root,
  callbacks
) {

  if (!root || root.dataset.editBound === '1') {
    return;
  }

  root.dataset.editBound = '1';

  let dragPayload = null;
  let touchDragPayload = null;
  let draggedElement = null;
  let hasActiveDropTarget = false;
  let activeDropFolder = null;
  let dropHandled = false;

  function onDocumentDragOver(event) {

    if (!dragPayload) {
      return;
    }

    event.preventDefault();

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }

    updateDropTargetFromPoint(
      event.clientX,
      event.clientY
    );

  }

  function onDocumentDrop(event) {

    if (!dragPayload) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    dropHandled = true;

    handleDrop(
      hasActiveDropTarget
        ? activeDropFolder
        : null
    );

  }

  function startDocumentDragListeners() {

    document.addEventListener(
      'dragover',
      onDocumentDragOver,
      true
    );

    document.addEventListener(
      'drop',
      onDocumentDrop,
      true
    );

  }

  function stopDocumentDragListeners() {

    document.removeEventListener(
      'dragover',
      onDocumentDragOver,
      true
    );

    document.removeEventListener(
      'drop',
      onDocumentDrop,
      true
    );

  }

  function clearDropTargets() {

    root.querySelectorAll(
      '.admin-protocol-folder-drop-target--active'
    ).forEach((element) => {
      element.classList.remove(
        'admin-protocol-folder-drop-target--active'
      );
    });

    hasActiveDropTarget = false;
    activeDropFolder = null;

  }

  function isValidDropTarget(
    payload,
    targetFolderRelativePath
  ) {

    if (
      targetFolderRelativePath === null
      || !payload
    ) {
      return false;
    }

    if (payload.type !== 'folder') {
      return true;
    }

    const sourceFolder =
      payload.folderRelativePath || '';

    if (!sourceFolder) {
      return true;
    }

    if (targetFolderRelativePath === sourceFolder) {
      return false;
    }

    return !targetFolderRelativePath.startsWith(
      `${sourceFolder}/`
    );

  }

  function highlightDropTarget(
    targetFolderRelativePath
  ) {

    clearDropTargets();

    const payload =
      dragPayload
      || touchDragPayload;

    if (
      !isValidDropTarget(
        payload,
        targetFolderRelativePath
      )
    ) {
      return;
    }

    hasActiveDropTarget = true;
    activeDropFolder =
      targetFolderRelativePath;

    const selector =
      targetFolderRelativePath === ''
        ? '.admin-protocol-folder-tree-body.admin-protocol-folder-drop-target'
        : `.admin-protocol-folder-drop-target[data-drop-folder="${CSS.escape(targetFolderRelativePath)}"]`;

    root.querySelectorAll(selector)
      .forEach((element) => {
        element.classList.add(
          'admin-protocol-folder-drop-target--active'
        );
      });

  }

  function finishDrag() {

    if (draggedElement) {
      draggedElement.style.pointerEvents = '';
      draggedElement.classList.remove(
        'admin-protocol-folder-draggable--dragging'
      );
      draggedElement = null;
    }

    dragPayload = null;
    touchDragPayload = null;
    dropHandled = false;
    clearDropTargets();
    stopDocumentDragListeners();

  }

  function handleDrop(
    targetFolderRelativePath
  ) {

    const payload =
      dragPayload
      || touchDragPayload;

    if (
      !payload
      || !isValidDropTarget(
        payload,
        targetFolderRelativePath
      )
    ) {
      finishDrag();
      return;
    }

    let changed = false;

    if (payload.type === 'file') {

      changed =
        callbacks.onMoveEntry?.(
          payload.entryKey,
          targetFolderRelativePath
        ) || false;

    } else if (payload.type === 'folder') {

      changed =
        callbacks.onMoveFolder?.(
          payload.folderRelativePath,
          targetFolderRelativePath
        ) || false;

    }

    finishDrag();

    if (changed) {
      callbacks.onChange?.();
    }

  }

  function resolveDropTargetFromPoint(
    clientX,
    clientY
  ) {

    if (
      typeof clientX !== 'number'
      || typeof clientY !== 'number'
    ) {
      return null;
    }

    const previousPointerEvents =
      draggedElement
        ? draggedElement.style.pointerEvents
        : null;

    if (draggedElement) {
      draggedElement.style.pointerEvents =
        'none';
    }

    const element =
      document.elementFromPoint(
        clientX,
        clientY
      );

    if (draggedElement) {
      draggedElement.style.pointerEvents =
        previousPointerEvents || '';
    }

    return getProtocolFolderDropTarget(
      element
    );

  }

  function updateDropTargetFromPoint(
    clientX,
    clientY
  ) {

    highlightDropTarget(
      resolveDropTargetFromPoint(
        clientX,
        clientY
      )
    );

  }

  root.addEventListener('dragstart', (event) => {

    if (
      event.target.closest(
        '.admin-protocol-folder-delete'
      )
    ) {
      event.preventDefault();
      return;
    }

    dropHandled = false;

    const fileRow =
      event.target.closest(
        '[data-entry-key]'
      );

    if (fileRow) {

      dragPayload = {
        type: 'file',
        entryKey:
          fileRow.dataset.entryKey
      };

      draggedElement = fileRow;
      startDocumentDragListeners();

      fileRow.classList.add(
        'admin-protocol-folder-draggable--dragging'
      );

      window.requestAnimationFrame(() => {
        if (draggedElement) {
          draggedElement.style.pointerEvents =
            'none';
        }
      });

      event.dataTransfer.effectAllowed =
        'move';

      event.dataTransfer.setData(
        'text/plain',
        dragPayload.entryKey
      );

      return;

    }

    const folderSummary =
      event.target.closest(
        '[data-folder-path]'
      );

    if (folderSummary) {

      dragPayload = {
        type: 'folder',
        folderRelativePath:
          folderSummary.dataset.folderPath
      };

      draggedElement =
        folderSummary;
      startDocumentDragListeners();

      folderSummary.classList.add(
        'admin-protocol-folder-draggable--dragging'
      );

      window.requestAnimationFrame(() => {
        if (draggedElement) {
          draggedElement.style.pointerEvents =
            'none';
        }
      });

      event.dataTransfer.effectAllowed =
        'move';

      event.dataTransfer.setData(
        'text/plain',
        dragPayload.folderRelativePath
      );

    }

  });

  root.addEventListener('dragend', () => {

    if (!dropHandled) {
      finishDrag();
    }

  });

  root.addEventListener('touchstart', (event) => {

    if (touchDragPayload) {
      return;
    }

    const handle =
      event.target.closest(
        '.admin-protocol-folder-drag-handle'
      );

    if (!handle) {
      return;
    }

    const draggable =
      handle.closest(
        '.admin-protocol-folder-draggable'
      );

    if (!draggable) {
      return;
    }

    const fileRow =
      draggable.closest(
        '[data-entry-key]'
      );

    if (fileRow) {

      touchDragPayload = {
        type: 'file',
        entryKey:
          fileRow.dataset.entryKey
      };

      dragPayload =
        touchDragPayload;
      draggedElement = fileRow;

      fileRow.classList.add(
        'admin-protocol-folder-draggable--dragging'
      );

      return;

    }

    const folderSummary =
      draggable.closest(
        '[data-folder-path]'
      );

    if (folderSummary) {

      touchDragPayload = {
        type: 'folder',
        folderRelativePath:
          folderSummary.dataset.folderPath
      };

      dragPayload =
        touchDragPayload;
      draggedElement =
        folderSummary;

      folderSummary.classList.add(
        'admin-protocol-folder-draggable--dragging'
      );

    }

  }, {
    passive: true
  });

  root.addEventListener('touchmove', (event) => {

    if (!touchDragPayload) {
      return;
    }

    event.preventDefault();

    const touch =
      event.changedTouches[0]
      || event.touches[0];

    if (!touch) {
      return;
    }

    dragPayload =
      touchDragPayload;

    updateDropTargetFromPoint(
      touch.clientX,
      touch.clientY
    );

  }, {
    passive: false
  });

  root.addEventListener('touchend', (event) => {

    if (!touchDragPayload) {
      return;
    }

    event.preventDefault();

    dragPayload =
      touchDragPayload;

    handleDrop(
      hasActiveDropTarget
        ? activeDropFolder
        : null
    );

  });

  root.addEventListener('touchcancel', finishDrag);

}

function renderProtocolFolderTreeEdit(
  container,
  options
) {

  container.innerHTML = '';

  const manifest =
    options.manifest || [];

  if (!manifest.length) {

    container.innerHTML =
      '<p class="admin-hint">Noch keine Dateien hinterlegt.</p>';

    return;

  }

  const tree =
    buildProtocolManifestTree(manifest);

  sortProtocolManifestTree(tree);

  const root =
    document.createElement('div');

  root.className =
    'admin-protocol-folder-tree';

  if (options.documentId) {

    const heading =
      document.createElement('p');

    heading.className =
      'admin-protocol-folder-root-label';
    heading.textContent =
      `Ordner: ${getProtocolStorageFolder(options.documentId)}/`;

    root.appendChild(heading);

  }

  const hint =
    document.createElement('p');

  hint.className =
    'admin-hint admin-protocol-folder-edit-hint';
  hint.textContent =
    'Mit ☰ ziehen und auf einen markierten Ordner loslassen. Mit 🗑 löschen.';

  root.appendChild(hint);

  const body =
    document.createElement('div');

  body.className =
    'admin-protocol-folder-tree-body admin-protocol-folder-drop-target';
  body.dataset.dropFolder = '';

  appendProtocolFolderTreeNode(
    body,
    tree,
    {
      mode: 'edit',
      onDeleteEntry:
        options.onDeleteEntry,
      onDeleteFolder:
        options.onDeleteFolder
    }
  );

  root.appendChild(body);
  container.appendChild(root);

  bindProtocolFolderTreeEdit(
    root,
    {
      onMoveEntry:
        options.onMoveEntry,
      onMoveFolder:
        options.onMoveFolder,
      onChange:
        options.onChange
    }
  );

}

async function renderProtocolFolderTree(
  container,
  options
) {

  if (!container) {
    return;
  }

  if (
    options.mode === 'edit'
    && options.manifest
  ) {

    renderProtocolFolderTreeEdit(
      container,
      options
    );

    return;

  }

  container.innerHTML = '';

  const paths =
    options.paths || [];

  if (!paths.length) {

    container.innerHTML =
      '<p class="admin-hint">Noch keine Dateien hinterlegt.</p>';

    return;

  }

  const tree =
    buildProtocolPathTree(
      paths,
      options.documentId || null
    );

  sortProtocolTreeNodes(tree);

  const urlMap = {};

  if (
    options.mode === 'view'
  ) {

    for (const path of paths) {

      if (
        String(path)
          .startsWith('pending://')
      ) {
        continue;
      }

      urlMap[path] =
        await getProtocolSignedUrl(path);

    }

  }

  const root =
    document.createElement('div');

  root.className =
    'admin-protocol-folder-tree';

  if (options.documentId) {

    const heading =
      document.createElement('p');

    heading.className =
      'admin-protocol-folder-root-label';
    heading.textContent =
      `Ordner: ${getProtocolStorageFolder(options.documentId)}/`;

    root.appendChild(heading);

  }

  const body =
    document.createElement('div');

  body.className =
    'admin-protocol-folder-tree-body';

  appendProtocolViewTreeNode(
    body,
    tree,
    {
      mode: options.mode,
      urlMap
    }
  );

  root.appendChild(body);
  container.appendChild(root);

}
