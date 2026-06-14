let recapEditState = {
  termin: null,
  recap: null,
  images: [],
  busy: false
};

function getRecapSection() {

  return document.getElementById(
    'recapSection'
  );

}

function setRecapStatusMessage(
  message,
  isError
) {

  const el =
    document.getElementById(
      'recapStatus'
    );

  if (!el) {
    return;
  }

  el.textContent = message || '';
  el.classList.toggle(
    'admin-recap-status--error',
    !!isError
  );

}

function updateRecapPublishButtons() {

  const publishBtn =
    document.getElementById(
      'publish-recap'
    );

  const unpublishBtn =
    document.getElementById(
      'unpublish-recap'
    );

  const isPublished =
    recapEditState.recap?.status
    === 'published';

  if (publishBtn) {
    publishBtn.hidden = isPublished;
  }

  if (unpublishBtn) {
    unpublishBtn.hidden = !isPublished;
  }

}

function renderRecapImagesList() {

  const container =
    document.getElementById(
      'recapImagesList'
    );

  if (!container) {
    return;
  }

  if (!recapEditState.images.length) {

    container.innerHTML =
      '<p class="admin-hint">Noch keine Bilder.</p>';

    return;

  }

  container.innerHTML =
    recapEditState.images
      .map((image, index) => {

        const url =
          resolveRecapImageUrl(image);

        const isCover =
          typeof getRecapCoverImageId
            === 'function'
            ? getRecapCoverImageId(
              recapEditState.images
            ) === image.id
            : index === 0;

        const coverBadge =
          isCover
            ? `
              <span class="admin-recap-image-cover-badge">
                Vorschaubild
              </span>
            `
            : '';

        const coverButton =
          isCover
            ? ''
            : `
              <button
                type="button"
                class="admin-recap-image-cover"
                data-image-id="${image.id}"
                title="Als Vorschaubild">

                ★ Vorschaubild

              </button>
            `;

        return `
          <div
            class="admin-recap-image-item${isCover ? ' admin-recap-image-item--cover' : ''}"
            data-image-id="${image.id}">

            <img
              src="${safeMediaUrl(url)}"
              alt=""
              class="admin-recap-image-thumb">

            ${coverBadge}

            ${coverButton}

            <button
              type="button"
              class="delete-button admin-recap-image-delete"
              data-image-id="${image.id}"
              title="Bild entfernen">

              🗑

            </button>

          </div>
        `;

      })
      .join('');

  container
    .querySelectorAll(
      '.admin-recap-image-delete'
    )
    .forEach((button) => {

      button.addEventListener(
        'click',
        () => {

          void handleDeleteRecapImage(
            Number(button.dataset.imageId)
          );

        }
      );

    });

  container
    .querySelectorAll(
      '.admin-recap-image-cover'
    )
    .forEach((button) => {

      button.addEventListener(
        'click',
        () => {

          void handleSetRecapCoverImage(
            Number(button.dataset.imageId)
          );

        }
      );

    });

}

function readRecapFormValues() {

  return {
    headline:
      document
        .getElementById('recapHeadline')
        ?.value
        ?.trim()
        || '',
    body:
      document
        .getElementById('recapBody')
        ?.value
        || ''
  };

}

function fillRecapForm(recap) {

  const headlineInput =
    document.getElementById(
      'recapHeadline'
    );

  const bodyInput =
    document.getElementById('recapBody');

  if (headlineInput) {
    headlineInput.value =
      recap?.headline || '';
  }

  if (bodyInput) {
    bodyInput.value =
      recap?.body || '';
  }

}

async function ensureRecapDraftExists() {

  if (recapEditState.recap?.id) {
    return recapEditState.recap;
  }

  const form =
    readRecapFormValues();

  const { data, error } =
    await saveRecapDraft({
      termin_id:
        recapEditState.termin.id,
      headline: form.headline,
      body: form.body
    });

  if (error) {
    throw error;
  }

  recapEditState.recap = data;

  return data;

}

async function reloadRecapState() {

  const recap =
    await loadRecapByTerminId(
      recapEditState.termin.id
    );

  recapEditState.recap = recap;
  recapEditState.images =
    recap?.images || [];

  fillRecapForm(recap);
  renderRecapImagesList();
  updateRecapPublishButtons();

  if (recap?.status === 'published') {
    setRecapStatusMessage(
      'Veröffentlicht'
    );
  } else if (recap?.id) {
    setRecapStatusMessage(
      'Entwurf'
    );
  } else {
    setRecapStatusMessage('');
  }

}

function showRecapSection(termin) {

  const section =
    getRecapSection();

  if (!section) {
    return;
  }

  if (
    !terminAllowsRecapClient(termin)
  ) {

    section.classList.add('hidden');
    recapEditState.termin = null;
    return;

  }

  section.classList.remove('hidden');
  recapEditState.termin = termin;

  void reloadRecapState();

}

async function handleSaveRecapDraft() {

  if (
    recapEditState.busy
    || !recapEditState.termin
  ) {
    return;
  }

  recapEditState.busy = true;
  setRecapStatusMessage(
    'Speichert …'
  );

  try {

    const form =
      readRecapFormValues();

    const { data, error } =
      await saveRecapDraft({
        id:
          recapEditState.recap?.id,
        termin_id:
          recapEditState.termin.id,
        headline: form.headline,
        body: form.body
      });

    if (error) {
      throw error;
    }

    recapEditState.recap = data;

    setRecapStatusMessage(
      'Entwurf gespeichert.'
    );

    updateRecapPublishButtons();

    if (window.adminUnsavedGuard) {
      window.adminUnsavedGuard.markClean();
    }

  } catch (error) {

    console.error(error);

    setRecapStatusMessage(
      error.message
      || 'Speichern fehlgeschlagen.',
      true
    );

  } finally {

    recapEditState.busy = false;

  }

}

async function handlePublishRecap() {

  if (
    recapEditState.busy
    || !recapEditState.termin
  ) {
    return;
  }

  recapEditState.busy = true;
  setRecapStatusMessage(
    'Veröffentlicht …'
  );

  try {

    const recap =
      await ensureRecapDraftExists();

    const form =
      readRecapFormValues();

    const { data: saved, error: saveError } =
      await saveRecapDraft({
        id: recap.id,
        termin_id:
          recapEditState.termin.id,
        headline: form.headline,
        body: form.body
      });

    if (saveError) {
      throw saveError;
    }

    recapEditState.recap = saved;

    const images =
      await listRecapImages(saved.id);

    recapEditState.images = images;

    const validation =
      validateRecapForPublish(
        saved,
        images.length
      );

    if (!validation.valid) {

      setRecapStatusMessage(
        formatRecapValidationErrors(
          validation
        ),
        true
      );

      return;

    }

    const { data, error } =
      await publishRecap(saved.id);

    if (error) {
      throw error;
    }

    recapEditState.recap = data;

    setRecapStatusMessage(
      'Rückblick veröffentlicht.'
    );

    updateRecapPublishButtons();

    if (window.adminUnsavedGuard) {
      window.adminUnsavedGuard.markClean();
    }

  } catch (error) {

    console.error(error);

    setRecapStatusMessage(
      error.message
      || 'Veröffentlichen fehlgeschlagen.',
      true
    );

  } finally {

    recapEditState.busy = false;

  }

}

async function handleUnpublishRecap() {

  if (
    recapEditState.busy
    || !recapEditState.recap?.id
  ) {
    return;
  }

  const confirmed =
    confirm(
      'Rückblick zurück auf Entwurf setzen?'
    );

  if (!confirmed) {
    return;
  }

  recapEditState.busy = true;

  try {

    const { data, error } =
      await unpublishRecap(
        recapEditState.recap.id
      );

    if (error) {
      throw error;
    }

    recapEditState.recap = data;

    setRecapStatusMessage(
      'Zurück auf Entwurf.'
    );

    updateRecapPublishButtons();

  } catch (error) {

    console.error(error);

    setRecapStatusMessage(
      error.message
      || 'Zurückziehen fehlgeschlagen.',
      true
    );

  } finally {

    recapEditState.busy = false;

  }

}

async function handleRecapImageUpload(
  fileList
) {

  if (
    recapEditState.busy
    || !recapEditState.termin
    || !fileList?.length
  ) {
    return;
  }

  recapEditState.busy = true;
  setRecapStatusMessage(
    'Bilder werden hochgeladen …'
  );

  try {

    const recap =
      await ensureRecapDraftExists();

    const existing =
      await listRecapImages(recap.id);

    let nextOrder =
      existing.reduce(
        (max, image) =>
          Math.max(
            max,
            image.sort_order || 0
          ),
        -1
      ) + 1;

    for (const file of fileList) {

      const upload =
        await uploadRecapImage(
          recapEditState.termin.id,
          file
        );

      if (upload.error) {
        throw upload.error;
      }

      const { error } =
        await addRecapImage(
          recap.id,
          upload.storagePath,
          nextOrder
        );

      if (error) {
        throw error;
      }

      nextOrder += 1;

    }

    await reloadRecapState();

    setRecapStatusMessage(
      'Bilder hinzugefügt.'
    );

  } catch (error) {

    console.error(error);

    setRecapStatusMessage(
      error.message
      || 'Upload fehlgeschlagen.',
      true
    );

  } finally {

    recapEditState.busy = false;

    const input =
      document.getElementById(
        'recapImageFile'
      );

    if (input) {
      input.value = '';
    }

  }

}

async function handleSetRecapCoverImage(
  imageId
) {

  if (
    recapEditState.busy
    || !imageId
    || !recapEditState.recap?.id
  ) {
    return;
  }

  recapEditState.busy = true;

  try {

    const { error } =
      await setRecapCoverImage(
        recapEditState.recap.id,
        imageId
      );

    if (error) {
      throw error;
    }

    await reloadRecapState();

    setRecapStatusMessage(
      'Vorschaubild gesetzt.'
    );

  } catch (error) {

    console.error(error);

    setRecapStatusMessage(
      error.message
      || 'Vorschaubild konnte nicht gesetzt werden.',
      true
    );

  } finally {

    recapEditState.busy = false;

  }

}

async function handleDeleteRecapImage(
  imageId
) {

  if (
    recapEditState.busy
    || !imageId
  ) {
    return;
  }

  const confirmed =
    confirm('Bild wirklich entfernen?');

  if (!confirmed) {
    return;
  }

  recapEditState.busy = true;

  try {

    const { error } =
      await deleteRecapImage(imageId);

    if (error) {
      throw error;
    }

    await reloadRecapState();

    setRecapStatusMessage(
      'Bild entfernt.'
    );

  } catch (error) {

    console.error(error);

    setRecapStatusMessage(
      error.message
      || 'Löschen fehlgeschlagen.',
      true
    );

  } finally {

    recapEditState.busy = false;

  }

}

function bindRecapEditUi() {

  document
    .getElementById('save-recap-draft')
    ?.addEventListener(
      'click',
      () => {
        void handleSaveRecapDraft();
      }
    );

  document
    .getElementById('publish-recap')
    ?.addEventListener(
      'click',
      () => {
        void handlePublishRecap();
      }
    );

  document
    .getElementById('unpublish-recap')
    ?.addEventListener(
      'click',
      () => {
        void handleUnpublishRecap();
      }
    );

  document
    .getElementById('recapImageFile')
    ?.addEventListener(
      'change',
      (event) => {

        void handleRecapImageUpload(
          event.target.files
        );

      }
    );

}

function initTerminRecapEdit() {

  bindRecapEditUi();

}

window.showRecapSection =
  showRecapSection;

window.initTerminRecapEdit =
  initTerminRecapEdit;
