const memberRecapEditParams =
  new URLSearchParams(
    window.location.search
  );

const memberRecapTerminId =
  Number(
    memberRecapEditParams.get(
      'termin_id'
    )
  ) || null;

let memberRecapEditState = {
  termin: null,
  recap: null,
  images: [],
  busy: false
};

function showMemberRecapEditError(
  message
) {

  const section =
    document.querySelector(
      '.member-content-edit-section'
    );

  if (!section) {
    return;
  }

  section.innerHTML = `

<div class="member-content-edit-header">

  <div>

    <h1>Rückblick</h1>

    <p class="member-recap-edit-error">
      ${escapeMemberHtml(message)}
    </p>

  </div>

  <a href="/profil/?tab=content"
     class="back-link member-logout-btn">

    ← Content

  </a>

</div>

  `.trim();

}

function setMemberRecapStatusMessage(
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
  el.hidden = !message;

  el.classList.toggle(
    'member-recap-status--error',
    !!isError
  );

}

function readMemberRecapFormValues() {

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

function fillMemberRecapForm(recap) {

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

function renderMemberRecapImagesList() {

  const container =
    document.getElementById(
      'recapImagesList'
    );

  if (!container) {
    return;
  }

  if (!memberRecapEditState.images.length) {

    container.innerHTML =
      '<p class="member-recap-images-empty">Noch keine Bilder.</p>';

    return;

  }

  container.innerHTML =
    memberRecapEditState.images
      .map((image) => {

        const url =
          resolveRecapImageUrl(image);

        return `
          <div
            class="member-recap-image-item"
            data-image-id="${image.id}">

            <img
              src="${safeMediaUrl(url)}"
              alt=""
              class="member-recap-image-thumb">

            <button
              type="button"
              class="member-recap-image-delete"
              data-image-id="${image.id}"
              title="Bild entfernen">

              Entfernen

            </button>

          </div>
        `;

      })
      .join('');

  container
    .querySelectorAll(
      '.member-recap-image-delete'
    )
    .forEach((button) => {

      button.addEventListener(
        'click',
        () => {

          void handleMemberDeleteRecapImage(
            Number(button.dataset.imageId)
          );

        }
      );

    });

}

async function reloadMemberRecapState() {

  const recap =
    await loadRecapByTerminId(
      memberRecapEditState.termin.id
    );

  memberRecapEditState.recap = recap;
  memberRecapEditState.images =
    recap?.images || [];

  fillMemberRecapForm(recap);
  renderMemberRecapImagesList();

  if (recap?.status === 'published') {

    setMemberRecapStatusMessage(
      'Dieser Rückblick wurde veröffentlicht und kann nicht mehr bearbeitet werden.'
    );

    document
      .querySelector('.member-content-edit-form')
      ?.classList.add(
        'member-recap-form--readonly'
      );

    document
      .getElementById('save-recap-draft')
      ?.setAttribute('hidden', '');

    document
      .getElementById('recapImageFile')
      ?.setAttribute('disabled', '');

  } else if (recap?.id) {

    setMemberRecapStatusMessage(
      'Entwurf — wird vom Vorstand geprüft.'
    );

  } else {

    setMemberRecapStatusMessage('');

  }

}

async function ensureMemberRecapDraftExists() {

  if (memberRecapEditState.recap?.id) {
    return memberRecapEditState.recap;
  }

  const form =
    readMemberRecapFormValues();

  const { data, error } =
    await saveRecapDraft({
      termin_id:
        memberRecapEditState.termin.id,
      headline: form.headline,
      body: form.body
    });

  if (error) {
    throw error;
  }

  memberRecapEditState.recap = data;

  return data;

}

async function handleMemberSaveRecapDraft() {

  if (
    memberRecapEditState.busy
    || !memberRecapEditState.termin
    || memberRecapEditState.recap?.status
      === 'published'
  ) {
    return;
  }

  memberRecapEditState.busy = true;
  setMemberRecapStatusMessage(
    'Speichert …'
  );

  try {

    const form =
      readMemberRecapFormValues();

    const { data, error } =
      await saveRecapDraft({
        id:
          memberRecapEditState.recap?.id,
        termin_id:
          memberRecapEditState.termin.id,
        headline: form.headline,
        body: form.body
      });

    if (error) {
      throw error;
    }

    memberRecapEditState.recap = data;

    setMemberRecapStatusMessage(
      'Entwurf gespeichert.'
    );

    if (window.memberEditUnsavedGuard) {
      window.memberEditUnsavedGuard.markClean();
    }

    window.location.href =
      '/profil/?tab=content';

  } catch (error) {

    console.error(error);

    setMemberRecapStatusMessage(
      error.message
      || 'Speichern fehlgeschlagen.',
      true
    );

  } finally {

    memberRecapEditState.busy = false;

  }

}

async function handleMemberRecapImageUpload(
  fileList
) {

  if (
    memberRecapEditState.busy
    || !memberRecapEditState.termin
    || !fileList?.length
    || memberRecapEditState.recap?.status
      === 'published'
  ) {
    return;
  }

  memberRecapEditState.busy = true;
  setMemberRecapStatusMessage(
    'Bilder werden hochgeladen …'
  );

  try {

    const recap =
      await ensureMemberRecapDraftExists();

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
          memberRecapEditState.termin.id,
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

    await reloadMemberRecapState();

    setMemberRecapStatusMessage(
      'Bilder hinzugefügt.'
    );

  } catch (error) {

    console.error(error);

    setMemberRecapStatusMessage(
      error.message
      || 'Upload fehlgeschlagen.',
      true
    );

  } finally {

    memberRecapEditState.busy = false;

    const input =
      document.getElementById(
        'recapImageFile'
      );

    if (input) {
      input.value = '';
    }

  }

}

async function handleMemberDeleteRecapImage(
  imageId
) {

  if (
    memberRecapEditState.busy
    || !imageId
    || memberRecapEditState.recap?.status
      === 'published'
  ) {
    return;
  }

  const confirmed =
    window.confirm(
      'Bild wirklich entfernen?'
    );

  if (!confirmed) {
    return;
  }

  memberRecapEditState.busy = true;

  try {

    const { error } =
      await deleteRecapImage(imageId);

    if (error) {
      throw error;
    }

    await reloadMemberRecapState();

    setMemberRecapStatusMessage(
      'Bild entfernt.'
    );

  } catch (error) {

    console.error(error);

    setMemberRecapStatusMessage(
      error.message
      || 'Löschen fehlgeschlagen.',
      true
    );

  } finally {

    memberRecapEditState.busy = false;

  }

}

function memberRecapEditFailureReason(
  termin,
  member
) {

  if (!termin) {
    return 'Termin nicht gefunden.';
  }

  if (termin.created_by !== member.id) {
    return 'Du bist nicht als Ersteller dieses Termins eingetragen.';
  }

  if (termin.recurring) {
    return 'Für Serientermine gibt es keinen Rückblick.';
  }

  const draft =
    window.siteConfig.visibility.draft;

  if (termin.sichtbarkeit === draft) {
    return 'Der Termin ist noch nicht freigegeben.';
  }

  if (
    typeof isTerminStillUpcoming
      === 'function'
    && isTerminStillUpcoming(termin)
  ) {
    return 'Rückblicke sind erst nach dem Termin möglich.';
  }

  return null;

}

async function loadMemberRecapEditTermin(
  member
) {

  if (!memberRecapTerminId) {

    showMemberRecapEditError(
      'Kein Termin angegeben.'
    );

    return false;

  }

  const { data, error } =
    await window.supabaseClient
      .from(window.siteConfig.tables.termine)
      .select('*')
      .eq('id', memberRecapTerminId)
      .maybeSingle();

  if (error) {

    console.error(error);

    showMemberRecapEditError(
      'Termin konnte nicht geladen werden.'
    );

    return false;

  }

  const failure =
    memberRecapEditFailureReason(
      data,
      member
    );

  if (failure) {

    showMemberRecapEditError(failure);

    return false;

  }

  memberRecapEditState.termin = data;

  const titleEl =
    document.getElementById('form-title');

  const subtitleEl =
    document.getElementById(
      'form-subtitle'
    );

  if (titleEl) {
    titleEl.textContent =
      `Rückblick: ${data.title || 'Termin'}`;
  }

  if (subtitleEl) {
    subtitleEl.textContent =
      'Entwurf wird vom Vorstand geprüft und veröffentlicht.';
  }

  await reloadMemberRecapState();

  return true;

}

function bindMemberRecapEditUi() {

  document
    .getElementById('save-recap-draft')
    ?.addEventListener(
      'click',
      () => {
        void handleMemberSaveRecapDraft();
      }
    );

  document
    .getElementById('recapImageFile')
    ?.addEventListener(
      'change',
      (event) => {

        void handleMemberRecapImageUpload(
          event.target.files
        );

      }
    );

}

async function initMemberRecapEditPage() {

  const member =
    await ensureMemberSession({
      strict: true
    });

  if (
    !member
    || typeof isClubMember !== 'function'
    || !isClubMember(member)
  ) {

    window.location.href =
      '/profil/';

    return;

  }

  window.memberEditUnsavedGuard =
    initMemberEditUnsavedGuard();

  bindMemberRecapEditUi();

  const loaded =
    await loadMemberRecapEditTermin(
      member
    );

  if (!loaded) {
    return;
  }

}
