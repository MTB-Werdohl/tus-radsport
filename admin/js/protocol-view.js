const viewParams =
  new URLSearchParams(
    window.location.search
  );

const viewId =
  viewParams.get('id');

async function renderProtocolFileButtons(row) {

  const container =
    document.getElementById('protocol-file-buttons');

  if (!container) {
    return;
  }

  container.innerHTML = '';

  const paths =
    collectProtocolFilePaths(row);

  if (!paths.length) {

    container.innerHTML =
      '<p class="admin-hint">Keine Dateien hinterlegt.</p>';

    return;

  }

  const buttons =
    document.createDocumentFragment();

  for (const path of paths) {

    const url =
      await getProtocolSignedUrl(path);

    const label =
      getProtocolFileLabel(path);

    if (url) {

      const link =
        document.createElement('a');

      link.href = url;
      link.className =
        'admin-protocol-file-button';
      link.target = '_blank';
      link.rel =
        'noopener noreferrer';
      link.textContent =
        `📎 ${label}`;

      buttons.appendChild(link);

      continue;

    }

    const fallback =
      document.createElement('span');

    fallback.className =
      'admin-protocol-file-button admin-protocol-file-button--missing';
    fallback.textContent =
      `📎 ${label} (Datei nicht erreichbar)`;

    buttons.appendChild(fallback);

  }

  container.appendChild(buttons);

}

async function initProtocolView() {

  if (!viewId) {

    window.location.href =
      '/admin/protokolle.html';

    return;

  }

  const { data, error } =
    await window.supabaseClient
      .from(getProtocolTableName())
      .select('*')
      .eq('id', viewId)
      .single();

  if (error) {

    console.error(error);

    document
      .getElementById('protocol-view-body')
      .innerHTML =
        '<p class="admin-hint">Protokoll nicht gefunden.</p>';

    return;

  }

  document
    .getElementById('protocol-view-title')
    .textContent =
      formatProtocolTitle(data);

  document
    .getElementById('protocol-view-scope')
    .textContent =
      getProtocolScopeLabel(data.scope);

  document
    .getElementById('protocol-view-edit')
    .href =
      getProtocolEditUrl(data.id);

  await renderProtocolFileButtons(data);

  const body =
    document.getElementById('protocol-view-body');

  if (body) {

    const content =
      data.content?.trim()
      || '';

    body.innerHTML =
      content
        ? window.marked.parse(content)
        : '<p class="admin-hint">Kein Textinhalt hinterlegt.</p>';

  }

}
