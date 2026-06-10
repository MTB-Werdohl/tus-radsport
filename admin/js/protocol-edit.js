const params =
  new URLSearchParams(
    window.location.search
  );

let protocolEditId =
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

let protocolFilesSaving =
  false;

function getProtocolEditRowSnapshot() {

  return {
    id: protocolEditId,
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

function getProtocolEditFormValues() {

  return {
    meeting_date:
      document
        .getElementById('meeting_date')
        ?.value
      || '',
    meeting_label:
      document
        .getElementById('meeting_label')
        ?.value
      || PROTOCOL_MEETING_LABELS[0],
    scope:
      document
        .getElementById('scope')
        ?.value
      || PROTOCOL_SCOPE_ABTEILUNG,
    subject:
      document
        .getElementById('subject')
        ?.value
        .trim()
      || '',
    content:
      document
        .getElementById('content')
        ?.value
      || ''
  };

}

function updateProtocolPendingHint(
  message
) {

  const hint =
    document.getElementById('protocol-folder-pending');

  if (!hint) {
    return;
  }

  if (message) {
    hint.textContent = message;
    return;
  }

  if (protocolFilesSaving) {
    hint.textContent =
      'Dateien werden gespeichert …';
    return;
  }

  hint.textContent =
    summarizeProtocolManifestChanges(
      protocolFileManifest,
      deletedStoragePaths,
      protocolManifestSnapshot
    );

}

async function ensureProtocolDocumentId() {

  if (protocolEditId) {
    return protocolEditId;
  }

  const formValues =
    getProtocolEditFormValues();

  if (!formValues.meeting_date) {

    alert(
      'Bitte zuerst ein Sitzungsdatum angeben, bevor Dateien gespeichert werden können.'
    );

    return null;

  }

  const payload = {
    meeting_date:
      formValues.meeting_date,
    meeting_label:
      formValues.meeting_label,
    scope:
      formValues.scope,
    subject:
      formValues.subject,
    content:
      formValues.content,
    protocol_pdf_path: null,
    attachments: []
  };

  const { data, error } =
    await window.supabaseClient
      .from(getProtocolTableName())
      .insert(payload)
      .select('id')
      .single();

  if (error) {

    console.error(error);

    alert(
      'Eintrag konnte nicht angelegt werden. Dateien wurden nicht gespeichert.'
    );

    return null;

  }

  protocolEditId =
    String(data.id);

  window.history.replaceState(
    null,
    '',
    getProtocolEditUrl(protocolEditId)
  );

  document
    .getElementById('form-title')
    .innerText =
      'Protokoll bearbeiten';

  return protocolEditId;

}

async function persistProtocolFiles() {

  if (protocolFilesSaving) {
    return false;
  }

  if (
    !protocolManifestHasChanges(
      protocolFileManifest,
      deletedStoragePaths,
      protocolManifestSnapshot
    )
  ) {
    updateProtocolPendingHint();
    return true;

  }

  const documentId =
    await ensureProtocolDocumentId();

  if (!documentId) {
    return false;

  }

  protocolFilesSaving = true;
  updateProtocolPendingHint();

  try {

    await applyProtocolManifestChanges(
      documentId,
      protocolFileManifest,
      deletedStoragePaths
    );

    const { error } =
      await window.supabaseClient
        .from(getProtocolTableName())
        .update({
          protocol_pdf_path: null,
          attachments: [],
          updated_at:
            new Date().toISOString()
        })
        .eq('id', documentId);

    if (error) {
      throw error;
    }

    existingProtocolFilePath = null;
    existingAttachments = [];
    deletedStoragePaths =
      new Set();

    protocolManifestSnapshot =
      snapshotProtocolManifest(
        protocolFileManifest
      );

    return true;

  } catch (error) {

    console.error(error);

    alert(
      'Dateien konnten nicht gespeichert werden.'
    );

    return false;

  } finally {

    protocolFilesSaving = false;
    updateProtocolPendingHint();

  }

}

async function afterProtocolFileManifestChange() {

  await refreshProtocolFolderPreview();
  await persistProtocolFiles();

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
      documentId: protocolEditId,
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

        void afterProtocolFileManifestChange();

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

        void afterProtocolFileManifestChange();

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
      getEntry(entryKey) {

        return protocolFileManifest.find((entry) =>
          entry.key === entryKey
        );

      },
      onChange() {

        void afterProtocolFileManifestChange();

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
  void afterProtocolFileManifestChange();

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
  void afterProtocolFileManifestChange();

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
      documentId: protocolEditId,
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

  if (!protocolEditId) {

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
      .eq('id', protocolEditId)
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
    await listProtocolDocumentFiles(
      protocolEditId
    );

  resetProtocolFileManifest(
    collectProtocolLegacyPaths(
      getProtocolEditRowSnapshot()
    ),
    storedPaths
  );

  await refreshProtocolFolderPreview();

}

async function saveProtocolEdit() {

  const formValues =
    getProtocolEditFormValues();

  if (!formValues.meeting_date) {

    alert('Bitte ein Sitzungsdatum angeben.');

    return;

  }

  const payload = {
    meeting_date:
      formValues.meeting_date,
    meeting_label:
      formValues.meeting_label,
    scope:
      formValues.scope,
    subject:
      formValues.subject,
    content:
      formValues.content,
    updated_at:
      new Date().toISOString()
  };

  let savedId =
    protocolEditId;

  if (protocolEditId) {

    payload.protocol_pdf_path = null;
    payload.attachments = [];

    const { error } =
      await window.supabaseClient
        .from(getProtocolTableName())
        .update(payload)
        .eq('id', protocolEditId);

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
      String(data.id);

  }

  if (
    protocolManifestHasChanges(
      protocolFileManifest,
      deletedStoragePaths,
      protocolManifestSnapshot
    )
  ) {

    const persisted =
      await persistProtocolFiles();

    if (!persisted) {
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
