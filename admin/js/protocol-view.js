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

  const files = [];

  if (row.protocol_pdf_path) {

    files.push({
      path: row.protocol_pdf_path
    });

  }

  normalizeProtocolAttachments(row.attachments)
    .forEach((item) => {

      files.push({
        path: item.path
      });

    });

  if (!files.length) {

    container.innerHTML =
      '<p class="admin-hint">Keine Dateien hinterlegt.</p>';

    return;

  }

  for (const file of files) {

    const url =
      await getProtocolSignedUrl(file.path);

    if (!url) {
      continue;
    }

    const label =
      getProtocolFileLabel(file.path);

    container.innerHTML += `

      <a
        href="${escapeAdminHtml(url)}"
        class="admin-protocol-file-button"
        target="_blank"
        rel="noopener noreferrer"
      >
        📎 ${escapeAdminHtml(label)}
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
