const viewParams =
  new URLSearchParams(
    window.location.search
  );

const viewId =
  viewParams.get('id');

async function renderProtocolPdfButtons(row) {

  const container =
    document.getElementById('protocol-pdf-buttons');

  if (!container) {
    return;
  }

  container.innerHTML = '';

  const files = [];

  if (row.protocol_pdf_path) {

    files.push({
      label: 'Protokoll (PDF)',
      path: row.protocol_pdf_path
    });

  }

  normalizeProtocolAttachments(row.attachments)
    .forEach((item) => {

      files.push({
        label: item.label,
        path: item.path
      });

    });

  if (!files.length) {

    container.innerHTML =
      '<p class="admin-hint">Keine PDF-Dateien hinterlegt.</p>';

    return;

  }

  for (const file of files) {

    const url =
      await getProtocolSignedUrl(file.path);

    if (!url) {
      continue;
    }

    container.innerHTML += `

      <a
        href="${escapeAdminHtml(url)}"
        class="admin-protocol-pdf-button"
        target="_blank"
        rel="noopener noreferrer"
      >
        📄 ${escapeAdminHtml(file.label)}
      </a>

    `;

  }

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
      .getElementById('protocol-view-content')
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

  await renderProtocolPdfButtons(data);

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
