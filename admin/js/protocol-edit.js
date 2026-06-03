const params =
  new URLSearchParams(
    window.location.search
  );

const editId =
  params.get('id');

let existingProtocolFilePath =
  null;

let existingAttachments =
  [];

function renderAttachmentRows() {

  const container =
    document.getElementById('attachments-list');

  if (!container) {
    return;
  }

  container.innerHTML = '';

  existingAttachments.forEach((item, index) => {

    const currentFile =
      item.path
        ? getProtocolFileLabel(item.path)
        : null;

    container.innerHTML += `

      <div
        class="admin-protocol-attachment-row"
        data-index="${index}"
      >

        ${currentFile
          ? `<p class="admin-hint">Aktuelle Datei: ${escapeAdminHtml(currentFile)}</p>`
          : ''}

        <label>
          ${currentFile
            ? 'Datei ersetzen'
            : 'Datei auswählen'}
          <input
            type="file"
            class="attachment-file"
          >
        </label>

        <button
          type="button"
          class="delete-button attachment-remove"
        >
          Anhang entfernen
        </button>

      </div>

    `;

  });

  container.querySelectorAll('.attachment-remove').forEach((button) => {

    button.addEventListener('click', () => {

      const row =
        button.closest('.admin-protocol-attachment-row');

      const index =
        Number(row?.dataset.index);

      if (Number.isNaN(index)) {
        return;
      }

      existingAttachments.splice(index, 1);
      renderAttachmentRows();

    });

  });

}

function addAttachmentRow() {

  existingAttachments.push({
    path: ''
  });

  renderAttachmentRows();

}

function fillMeetingLabelOptions() {

  const select =
    document.getElementById('meeting_label');

  if (!select) {
    return;
  }

  select.innerHTML =
    PROTOCOL_MEETING_LABELS
      .map((label) => `

        <option value="${escapeAdminHtml(label)}">
          ${escapeAdminHtml(label)}
        </option>

      `)
      .join('');

}

async function loadProtocolEdit() {

  fillMeetingLabelOptions();

  if (!editId) {
    return;
  }

  document
    .getElementById('form-title')
    .innerText =
      'Protokoll bearbeiten';

  const { data, error } =
    await window.supabaseClient
      .from(getProtocolTableName())
      .select('*')
      .eq('id', editId)
      .single();

  if (error) {

    console.error(error);

    return;

  }

  document.getElementById('meeting_date').value =
    data.meeting_date || '';

  document.getElementById('meeting_label').value =
    data.meeting_label
    || PROTOCOL_MEETING_LABELS[0];

  document.getElementById('scope').value =
    data.scope
    || PROTOCOL_SCOPE_ABTEILUNG;

  document.getElementById('content').value =
    data.content || '';

  existingProtocolFilePath =
    data.protocol_pdf_path || null;

  existingAttachments =
    normalizeProtocolAttachments(data.attachments);

  const currentFile =
    document.getElementById('currentProtocolFile');

  if (currentFile) {

    currentFile.innerHTML =
      existingProtocolFilePath
        ? `<p class="admin-hint">Aktuelle Protokoll-Datei: ${escapeAdminHtml(getProtocolFileLabel(existingProtocolFilePath))}</p>`
        : '';

  }

  renderAttachmentRows();

}

async function saveProtocolEdit() {

  const meetingDate =
    document
      .getElementById('meeting_date')
      .value;

  if (!meetingDate) {

    alert('Bitte ein Sitzungsdatum angeben.');

    return;

  }

  const meetingLabel =
    document
      .getElementById('meeting_label')
      .value;

  const scope =
    document
      .getElementById('scope')
      .value;

  const content =
    document
      .getElementById('content')
      .value;

  const protocolFile =
    document
      .getElementById('protocolFile')
      ?.files[0];

  let protocolPdfPath =
    existingProtocolFilePath;

  if (protocolFile) {

    try {

      protocolPdfPath =
        await uploadProtocolFile(protocolFile);

    } catch (error) {

      console.error(error);

      alert('Protokoll-Datei konnte nicht hochgeladen werden.');

      return;

    }

  }

  const attachmentRows =
    document.querySelectorAll(
      '.admin-protocol-attachment-row'
    );

  const nextAttachments = [];

  for (const row of attachmentRows) {

    const index =
      Number(row.dataset.index);

    const existing =
      existingAttachments[index]
      || { path: '' };

    const file =
      row.querySelector('.attachment-file')
        ?.files[0];

    let path =
      existing.path || '';

    if (file) {

      try {

        path =
          await uploadProtocolFile(file);

      } catch (error) {

        console.error(error);

        alert('Anhang konnte nicht hochgeladen werden.');

        return;

      }

    }

    if (path) {
      nextAttachments.push({ path });
    }

  }

  const payload = {
    meeting_date: meetingDate,
    meeting_label: meetingLabel,
    scope,
    content,
    protocol_pdf_path: protocolPdfPath,
    attachments: nextAttachments,
    updated_at: new Date().toISOString()
  };

  let savedId =
    editId;

  if (editId) {

    const { error } =
      await window.supabaseClient
        .from(getProtocolTableName())
        .update(payload)
        .eq('id', editId);

    if (error) {

      console.error(error);

      alert('Protokoll konnte nicht gespeichert werden.');

      return;

    }

  } else {

    const { data, error } =
      await window.supabaseClient
        .from(getProtocolTableName())
        .insert(payload)
        .select('id')
        .single();

    if (error) {

      console.error(error);

      alert('Protokoll konnte nicht angelegt werden.');

      return;

    }

    savedId =
      data.id;

  }

  if (window.adminUnsavedGuard) {
    window.adminUnsavedGuard.markClean();
  }

  window.location.href =
    getProtocolViewUrl(savedId);

}

document
  .getElementById('add-attachment')
  ?.addEventListener('click', addAttachmentRow);

document
  .getElementById('save-protocol')
  ?.addEventListener('click', saveProtocolEdit);

function initProtocolEdit() {

  window.adminUnsavedGuard =
    initAdminUnsavedGuard({
      message:
        'Sicher, dass du ohne Speichern zurück willst?'
    });

  loadProtocolEdit();

}
