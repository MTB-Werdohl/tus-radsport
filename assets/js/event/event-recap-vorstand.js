function ensureEventRecapEditModal() {

  const id = 'event-recap-edit-modal';

  const modal =
    ensureEventVorstandModal(
      id,
      'Rückblick bearbeiten',
      'member-feedback-modal__dialog--wide'
    );

  const body =
    modal.querySelector(
      '[data-event-vorstand-modal-body]'
    );

  if (body.dataset.initialized === 'true') {
    return modal;
  }

  body.dataset.initialized = 'true';

  body.innerHTML = `
<div class="news-vorstand-edit-form">

<label class="admin-field admin-field--required">
  Überschrift
  <input
    id="event-recap-headline"
    type="text"
    required
    placeholder="Überschrift">
</label>

<label class="admin-field admin-field--required">
  Text
  <textarea
    id="event-recap-body"
    rows="10"
    required
    placeholder="Rückblick …"></textarea>
</label>

<p
  id="event-recap-edit-status"
  class="admin-hint"
  hidden>

</p>

<div class="member-feedback-modal__actions">

  <button
    type="button"
    class="member-edit-btn member-edit-btn--secondary"
    data-close-event-vorstand-modal="true">

    Abbrechen

  </button>

  <button
    type="button"
    class="member-edit-btn member-edit-btn--secondary"
    id="event-recap-save-draft">

    Entwurf speichern

  </button>

  <button
    type="button"
    class="member-edit-btn"
    id="event-recap-publish">

    Veröffentlichen

  </button>

</div>

</div>
  `;

  document
    .getElementById('event-recap-save-draft')
    ?.addEventListener('click', () => {
      void saveEventRecapFromModal(false);
    });

  document
    .getElementById('event-recap-publish')
    ?.addEventListener('click', () => {
      void saveEventRecapFromModal(true);
    });

  return modal;

}

function setEventRecapEditStatus(
  message,
  isError
) {

  const el =
    document.getElementById(
      'event-recap-edit-status'
    );

  if (!el) {
    return;
  }

  el.textContent = message || '';
  el.hidden = !message;
  el.classList.toggle(
    'admin-hint--error',
    !!isError
  );

}

async function loadRecapIntoVorstandModal(
  terminId,
  recap
) {

  const loaded =
    recap
    || (
      typeof loadRecapByTerminId === 'function'
        ? await loadRecapByTerminId(
          terminId
        )
        : null
    );

  document
    .getElementById('event-recap-headline')
    .value =
      loaded?.headline || '';

  document
    .getElementById('event-recap-body')
    .value =
      loaded?.body || '';

  const modal =
    ensureEventRecapEditModal();

  modal.dataset.terminId =
    String(terminId);

  modal.dataset.recapId =
    loaded?.id
      ? String(loaded.id)
      : '';

  setEventRecapEditStatus('');

  return loaded;

}

async function saveEventRecapFromModal(
  publish
) {

  const modal =
    ensureEventRecapEditModal();

  const terminId =
    parseInt(
      modal.dataset.terminId,
      10
    );

  if (!terminId) {
    return;
  }

  const headline =
    document
      .getElementById('event-recap-headline')
      ?.value
      ?.trim();

  const body =
    document
      .getElementById('event-recap-body')
      ?.value
      ?.trim();

  if (
    !headline
    || !body
  ) {

    setEventRecapEditStatus(
      'Bitte Überschrift und Text ausfüllen.',
      true
    );

    return;

  }

  if (
    publish
    && typeof validateRecapForPublish
      === 'function'
  ) {

    const recapId =
      parseInt(
        modal.dataset.recapId,
        10
      ) || null;

    let imageCount = 0;

    if (
      recapId
      && typeof listRecapImages === 'function'
    ) {

      const images =
        await listRecapImages(recapId);

      imageCount = images.length;

    }

    const validation =
      validateRecapForPublish(
        { body },
        imageCount
      );

    if (!validation.valid) {

      setEventRecapEditStatus(
        typeof formatRecapValidationErrors
          === 'function'
          ? formatRecapValidationErrors(
            validation
          )
          : validation.errors.join(' '),
        true
      );

      return;

    }

  }

  if (
    typeof saveRecapDraft
      !== 'function'
  ) {

    alert(
      'Rückblick konnte nicht gespeichert werden.'
    );

    return;

  }

  const recapId =
    parseInt(
      modal.dataset.recapId,
      10
    ) || null;

  const result =
    await saveRecapDraft({
      id: recapId,
      termin_id: terminId,
      headline,
      body
    });

  if (result?.error) {

    setEventRecapEditStatus(
      result.error.message,
      true
    );

    return;

  }

  const savedId =
    result?.data?.id
    || recapId;

  if (savedId) {
    modal.dataset.recapId =
      String(savedId);
  }

  if (
    publish
    && savedId
    && typeof publishRecap === 'function'
  ) {

    const publishResult =
      await publishRecap(savedId);

    if (publishResult?.error) {

      setEventRecapEditStatus(
        publishResult.error.message,
        true
      );

      return;

    }

  }

  closeEventVorstandModal(
    'event-recap-edit-modal'
  );

  if (
    typeof reloadAfterVorstandContentSave
      === 'function'
  ) {
    reloadAfterVorstandContentSave();
  } else {
    window.location.reload();
  }

}

async function openEventRecapEditModal(
  terminId,
  recap
) {

  openEventVorstandModal(
    'event-recap-edit-modal',
    'Erlebtes bearbeiten'
  );

  const body =
    ensureEventRecapEditModal()
      .querySelector(
        '[data-event-vorstand-modal-body]'
      );

  if (body) {
    body.classList.add('is-loading');
  }

  await loadRecapIntoVorstandModal(
    terminId,
    recap
  );

  if (body) {
    body.classList.remove('is-loading');
  }

}

function renderEventRecapVorstandActions(
  event,
  recap,
  options = {}
) {

  const container =
    document.getElementById(
      'event-recap-vorstand-actions'
    );

  if (
    !container
    || !event
    || !recap
  ) {
    return;
  }

  const showRecapEdit =
    options.fromErlebtes === true;

  if (!showRecapEdit) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = `
<button
  type="button"
  class="news-vorstand-btn"
  data-event-recap-edit
  data-termin-id="${event.id}">

  Bearbeiten

</button>
  `;

  container
    .querySelector('[data-event-recap-edit]')
    ?.addEventListener('click', () => {

      void openEventRecapEditModal(
        event.id,
        recap
      );

    });

}

function initEventRecapVorstand(
  eventData,
  recap,
  member,
  options = {}
) {

  if (
    !eventData
    || !recap
    || !canShowEventVorstandTools(member)
  ) {
    return;
  }

  renderEventRecapVorstandActions(
    eventData,
    recap,
    options
  );

}
