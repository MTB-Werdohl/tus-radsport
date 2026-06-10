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

let protocolFileManifest =
  [];

let protocolManifestSnapshot =
  [];

let deletedStoragePaths =
  new Set();

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

function markProtocolFilesDirty() {

  if (window.adminUnsavedGuard) {
    window.adminUnsavedGuard.markDirty();
  }

}

function updateProtocolPendingHint() {

  const hint =
    document.getElementById('protocol-folder-pending');

  if (!hint) {
    return;
  }

  hint.textContent =
    summarizeProtocolManifestChanges(
      protocolFileManifest,
      deletedStoragePaths,
      protocolManifestSnapshot
    );

}

async function refreshProtocolFolderPreview() {

  const container =
    document.getElementById('protocol-folder-tree');

  if (!container) {
    return;
  }

  container.dataset.editBound = '';

  await renderProtocolFolderTree(
    container,
    {
      mode: 'edit',
      documentId: editId,
      manifest: protocolFileManifest,
      onDeleteEntry(entryKey) {

        if (
          !confirm(
            'Diese Datei wirklich entfernen?'
          )
        ) {
          return;
        }

        removeProtocolManifestEntry(
          protocolFileManifest,
          entryKey,
          deletedStoragePaths
        );

        markProtocolFilesDirty();
        refreshProtocolFolderPreview();

      },
      onDeleteFolder(folderRelativePath) {

        const folderLabel =
          folderRelativePath
          || 'alle Dateien in der Wurzel';

        if (
          !confirm(
            `Ordner „${folderLabel}“ mit allen Dateien darin wirklich entfernen?`
          )
        ) {
          return;
        }

        removeProtocolManifestFolder(
          protocolFileManifest,
          folderRelativePath,
          deletedStoragePaths
        );

        markProtocolFilesDirty();
        refreshProtocolFolderPreview();

      },
      onMoveEntry(entryKey, targetFolderRelativePath) {

        return moveProtocolManifestEntry(
          protocolFileManifest,
          entryKey,
          targetFolderRelativePath
        );

      },
      onMoveFolder(folderRelativePath, targetFolderRelativePath) {

        return moveProtocolManifestFolder(
          protocolFileManifest,
          folderRelativePath,
          targetFolderRelativePath
        );

      },
      onChange() {

        markProtocolFilesDirty();
        refreshProtocolFolderPreview();

      }
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

  addProtocolManifestFiles(
    protocolFileManifest,
    files,
    deletedStoragePaths
  );

  clearPendingFileInputs();
  markProtocolFilesDirty();
  refreshProtocolFolderPreview();

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

  mergeProtocolManifestFolder(
    protocolFileManifest,
    files,
    deletedStoragePaths
  );

  clearPendingFileInputs();
  markProtocolFilesDirty();
  refreshProtocolFolderPreview();

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

function resetProtocolFileManifest(
  legacyPaths,
  storedPaths
) {

  protocolFileManifest =
    createProtocolManifestFromSources({
      documentId: editId,
      legacyPaths,
      storedPaths
    });

  protocolManifestSnapshot =
    snapshotProtocolManifest(
      protocolFileManifest
    );

  deletedStoragePaths =
    new Set();

}

async function loadProtocolEdit() {

  fillMeetingLabelOptions();

  if (!editId) {

    resetProtocolFileManifest(
      [],
      []
    );

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

  const storedPaths =
    await listProtocolDocumentFiles(editId);

  resetProtocolFileManifest(
    collectProtocolLegacyPaths(
      getProtocolEditRowSnapshot()
    ),
    storedPaths
  );

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

  const hasFileChanges =
    protocolManifestHasChanges(
      protocolFileManifest,
      deletedStoragePaths,
      protocolManifestSnapshot
    );

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

  if (hasFileChanges) {

    payload.protocol_pdf_path = null;
    payload.attachments = [];

  } else if (editId) {

    payload.protocol_pdf_path =
      existingProtocolFilePath;
    payload.attachments =
      existingAttachments.map((item) => ({
        path: item.path
      }));

  } else {

    payload.protocol_pdf_path = null;
    payload.attachments = [];

  }

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

  if (hasFileChanges) {

    try {

      await applyProtocolManifestChanges(
        savedId,
        protocolFileManifest,
        deletedStoragePaths
      );

    } catch (error) {

      console.error(error);

      alert('Dateien konnten nicht gespeichert werden.');

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
