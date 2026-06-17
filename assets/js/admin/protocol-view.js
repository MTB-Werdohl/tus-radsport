const viewParams =
  new URLSearchParams(
    window.location.search
  );

const viewId =
  viewParams.get('id');

async function renderProtocolFileTree(row) {

  const container =
    document.getElementById('protocol-file-buttons');

  if (!container) {
    return;
  }

  const paths =
    await collectProtocolAllFilePaths(row);

  await renderProtocolFolderTree(
    container,
    {
      mode: 'view',
      documentId: row?.id || null,
      paths
    }
  );

}

async function initProtocolView() {

  if (!viewId) {

    window.location.href =
      '/profil/?tab=verwaltung';

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

  await renderProtocolFileTree(data);

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
