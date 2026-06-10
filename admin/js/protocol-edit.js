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

let storedFolderPaths =
  [];

let pendingSingleFiles =
  [];

let pendingFolderReplace =
  null;

function getProtocolEditRowSnapshot() {

  return {
    id: editId,
    protocol_pdf_path:
      existingProtocolFilePath,
    attachments:
      existingAttachments.map((item) => ({
        path: item.path
      }))
  };

}

function clearPendingFileInputs() {

  const fileInput =
    document.getElementById('protocol-add-file');

  const folderInput =
    document.getElementById('protocol-add-folder');

  if (fileInput) {
    fileInput.value = '';
  }

  if (folderInput) {
    folderInput.value = '';
  }

}

function updateProtocolPendingHint() {

  const hint =
    document.getElementById('protocol-folder-pending');

  if (!hint) {
    return;
  }

  if (pendingFolderReplace?.length) {

    hint.textContent =
      `Beim Speichern werden ${pendingFolderReplace.length} Dateien aus dem Ordner hochgeladen und ersetzen alle bisherigen Dateien in diesem Protokoll-Ordner.`;

    return;

  }

  if (pendingSingleFiles.length) {

    hint.textContent =
      `Beim Speichern werden ${pendingSingleFiles.length} Datei(en) in den Protokoll-Ordner gelegt: ${pendingSingleFiles.map((file) => file.name).join(', ')}.`;

    return;

  }

  hint.textContent = '';

}

async function refreshProtocolFolderPreview() {

  const container =
    document.getElementById('protocol-folder-tree');

  if (!container) {
    return;
  }

  const legacyPaths =
    collectProtocolLegacyPaths(
      getProtocolEditRowSnapshot()
    );

  let paths =
    [
      ...legacyPaths,
      ...storedFolderPaths
    ];

  if (pendingFolderReplace?.length) {

    paths =
      buildProtocolPendingPreviewPaths(
        [],
        pendingFolderReplace
      );

  } else if (pendingSingleFiles.length) {

    paths =
      [
        ...paths,
        ...buildProtocolPendingPreviewPaths(
          pendingSingleFiles,
          null
        )
      ];

  }

  await renderProtocolFolderTree(
    container,
    {
      mode: 'edit',
      documentId: editId,
      paths
    }
  );

  updateProtocolPendingHint();

}

function onProtocolSingleFilesSelected(
  event
) {

  const files =
    [
      ...(
        event.target.files
        || []
      )
    ];

  if (!files.length) {
    return;
  }

  pendingFolderReplace = null;
  pendingSingleFiles.push(...files);
  clearPendingFileInputs();
  refreshProtocolFolderPreview();

  if (window.adminUnsavedGuard) {
    window.adminUnsavedGuard.markDirty();
  }

}

function onProtocolFolderSelected(
  event
) {

  const files =
    [
      ...(
        event.target.files
        || []
      )
    ];

  if (!files.length) {
    return;
  }

  pendingSingleFiles = [];
  pendingFolderReplace = files;
  clearPendingFileInputs();
  refreshProtocolFolderPreview();

  if (window.adminUnsavedGuard) {
    window.adminUnsavedGuard.markDirty();
  }

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

    await refreshProtocolFolderPreview();

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
    data.meeting_label === 'Beschluss'
      ? 'Hauptversammlung'
      : (
        data.meeting_label
        || PROTOCOL_MEETING_LABELS[0]
      );

  document.getElementById('scope').value =
    data.scope
    || PROTOCOL_SCOPE_ABTEILUNG;

  document.getElementById('subject').value =
    data.subject || '';

  document.getElementById('content').value =
    data.content || '';

  existingProtocolFilePath =
    data.protocol_pdf_path || null;

  existingAttachments =
    normalizeProtocolAttachments(data.attachments)
      .map((item) => ({
        path: item.path
      }));

  storedFolderPaths =
    await listProtocolDocumentFiles(editId);

  await refreshProtocolFolderPreview();

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

  const subject =
    document
      .getElementById('subject')
      .value
      .trim();

  const hasFolderReplace =
    Boolean(pendingFolderReplace?.length);

  const hasPendingFiles =
    pendingSingleFiles.length > 0;

  const hasFileChanges =
    hasFolderReplace
    || hasPendingFiles;

  let savedId =
    editId;

  const payload = {
    meeting_date: meetingDate,
    meeting_label: meetingLabel,
    scope,
    subject,
    content,
    updated_at: new Date().toISOString()
  };

  if (editId) {

    if (hasFolderReplace) {

      payload.protocol_pdf_path = null;
      payload.attachments = [];

    } else {

      payload.protocol_pdf_path =
        existingProtocolFilePath;
      payload.attachments =
        existingAttachments.map((item) => ({
          path: item.path
        }));

    }

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

    payload.protocol_pdf_path = null;
    payload.attachments = [];

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

  if (hasFileChanges) {

    try {

      if (hasFolderReplace) {

        await deleteProtocolLegacyStorage({
          id: savedId,
          protocol_pdf_path:
            existingProtocolFilePath,
          attachments:
            existingAttachments
        });

        await uploadProtocolFolderReplace(
          savedId,
          pendingFolderReplace
        );

      } else if (hasPendingFiles) {

        await uploadProtocolFilesToFolder(
          savedId,
          pendingSingleFiles
        );

      }

    } catch (error) {

      console.error(error);

      alert('Dateien konnten nicht hochgeladen werden.');

      return;

    }

  }

  if (window.adminUnsavedGuard) {
    window.adminUnsavedGuard.markClean();
  }

  window.location.href =
    getProtocolViewUrl(savedId);

}

document
  .getElementById('protocol-add-file')
  ?.addEventListener(
    'change',
    onProtocolSingleFilesSelected
  );

document
  .getElementById('protocol-add-folder')
  ?.addEventListener(
    'change',
    onProtocolFolderSelected
  );

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
