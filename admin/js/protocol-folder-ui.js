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
      document.createElement('div');

    row.className =
      'admin-protocol-folder-file-row';

    const isPending =
      String(file.path || '')
        .startsWith('pending://');

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

    }

    parent.appendChild(row);

  });

}

async function renderProtocolFolderTree(
  container,
  options
) {

  if (!container) {
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

  appendProtocolFolderTreeNode(
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
