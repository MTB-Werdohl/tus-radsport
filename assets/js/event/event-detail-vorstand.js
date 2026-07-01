function escapeEventVorstandHtml(value) {

  if (value === null || value === undefined) {
    return '';
  }

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

}

function canShowEventVorstandTools(member) {

  return (
    typeof isVorstand === 'function'
    && isVorstand(member)
  );

}

function eventVorstandExtractTimeFromDate(
  value
) {

  if (!value) {
    return '';
  }

  const text =
    String(value);

  if (text.length < 16) {
    return '';
  }

  const timePart =
    text.slice(11, 16);

  if (timePart === '00:00') {
    return '';
  }

  return timePart;

}

function eventVorstandCombineDateTime(
  dateOnly,
  time
) {

  if (!dateOnly) {
    return null;
  }

  const datePart =
    dateOnly.slice(0, 10);

  if (time) {
    return `${datePart}T${time}`;
  }

  return `${datePart}T00:00:00`;

}

function ensureEventVorstandModal(
  id,
  title,
  dialogClass
) {

  let modal =
    document.getElementById(id);

  if (modal) {
    return modal;
  }

  modal =
    document.createElement('div');

  modal.id = id;
  modal.className = 'member-feedback-modal';
  modal.hidden = true;
  modal.setAttribute('aria-hidden', 'true');

  modal.innerHTML = `
<div
  class="member-feedback-modal__backdrop"
  data-close-event-vorstand-modal="true">

</div>

<div
  class="member-feedback-modal__dialog ${dialogClass || ''}"
  role="dialog"
  aria-modal="true"
  aria-labelledby="${id}-title">

  <button
    type="button"
    class="member-feedback-modal__close"
    data-close-event-vorstand-modal="true"
    aria-label="Schließen">

    ×

  </button>

  <h2
    id="${id}-title"
    class="member-feedback-modal__title">

    ${escapeEventVorstandHtml(title)}

  </h2>

  <div
    class="news-vorstand-modal__body"
    data-event-vorstand-modal-body>

  </div>

</div>
  `;

  document.body.appendChild(modal);

  modal
    .querySelectorAll(
      '[data-close-event-vorstand-modal="true"]'
    )
    .forEach((el) => {

      el.addEventListener('click', () => {
        closeEventVorstandModal(id);
      });

    });

  return modal;

}

function openEventVorstandModal(
  id,
  title
) {

  const modal =
    ensureEventVorstandModal(
      id,
      title
    );

  const titleEl =
    modal.querySelector(
      `#${id}-title`
    );

  if (titleEl) {
    titleEl.textContent = title;
  }

  modal.hidden = false;
  modal.removeAttribute('hidden');
  modal.setAttribute('aria-hidden', 'false');

  document.body.classList.add(
    'member-feedback-modal-open'
  );

}

function closeEventVorstandModal(id) {

  const modal =
    document.getElementById(id);

  if (!modal) {
    return;
  }

  modal.hidden = true;
  modal.setAttribute('aria-hidden', 'true');

  document.body.classList.remove(
    'member-feedback-modal-open'
  );

}

function renderKalenderTerminVorstandActionsHtml(
  event
) {

  return `
<div class="calendar-card__vorstand-actions">

<button
  type="button"
  class="news-vorstand-btn"
  data-kalender-vorstand-edit
  data-event-id="${event.id}">

  Bearbeiten

</button>

<button
  type="button"
  class="news-vorstand-btn"
  data-kalender-vorstand-results
  data-event-id="${event.id}"
  data-event-title="${escapeEventVorstandHtml(event.title || '')}">

  Auswertung

</button>

<button
  type="button"
  class="news-vorstand-btn news-vorstand-btn--danger"
  data-kalender-vorstand-delete
  data-event-id="${event.id}">

  Löschen

</button>

</div>
  `.trim();

}

async function openEventFeedbackResultsForTermin(
  eventId,
  title
) {

  const feedbackModule =
    await fetchFeedbackModule(
      window.siteConfig.feedback.entityTypes.event,
      eventId
    );

  if (!feedbackModule?.id) {

    alert(
      'Für diesen Termin gibt es noch keine Rückmeldungen.'
    );

    return;

  }

  await openEventFeedbackResultsModal(
    feedbackModule.id,
    title
  );

}

async function deleteEventFromVorstand(
  eventId
) {

  if (
    !eventId
    || !confirm(
      'Termin wirklich löschen?'
    )
  ) {
    return;
  }

  const { error } =
    await window.supabaseClient
      .from(window.siteConfig.tables.termine)
      .delete()
      .eq('id', eventId);

  if (error) {

    console.error(error);

    alert(
      'Termin konnte nicht gelöscht werden.'
    );

    return;

  }

  if (
    typeof reloadAfterVorstandContentSave
      === 'function'
  ) {

    reloadAfterVorstandContentSave();

  } else if (
    typeof invalidateTermineCache
      === 'function'
  ) {

    invalidateTermineCache();

    if (
      typeof loadAllUpcomingTerminCards
        === 'function'
    ) {
      void loadAllUpcomingTerminCards();
    }

  } else {

    window.location.reload();

  }

}

function bindKalenderVorstandActions(
  container
) {

  if (
    !container
    || container.dataset.kalenderVorstandBound
      === 'true'
  ) {
    return;
  }

  container.dataset.kalenderVorstandBound =
    'true';

  container.addEventListener(
    'click',
    (clickEvent) => {

      const target =
        clickEvent.target;

      const editButton =
        target.closest(
          '[data-kalender-vorstand-edit]'
        );

      if (editButton) {

        clickEvent.preventDefault();
        clickEvent.stopPropagation();

        const eventId =
          parseInt(
            editButton.dataset.eventId,
            10
          );

        if (eventId) {
          void openEventEditModal(eventId);
        }

        return;

      }

      const resultsButton =
        target.closest(
          '[data-kalender-vorstand-results]'
        );

      if (resultsButton) {

        clickEvent.preventDefault();
        clickEvent.stopPropagation();

        const eventId =
          parseInt(
            resultsButton.dataset.eventId,
            10
          );

        if (eventId) {

          void openEventFeedbackResultsForTermin(
            eventId,
            resultsButton.dataset.eventTitle
              || ''
          );

        }

        return;

      }

      const deleteButton =
        target.closest(
          '[data-kalender-vorstand-delete]'
        );

      if (deleteButton) {

        clickEvent.preventDefault();
        clickEvent.stopPropagation();

        const eventId =
          parseInt(
            deleteButton.dataset.eventId,
            10
          );

        if (eventId) {
          void deleteEventFromVorstand(
            eventId
          );
        }

      }

    }
  );

}

function renderEventVorstandToolbar(
  eventData,
  feedbackModule,
  showResults
) {

  const actions =
    document.getElementById(
      'event-vorstand-actions'
    );

  if (actions) {
    actions.innerHTML = '';
  }

}

function ensureEventEditModal() {

  const id = 'event-vorstand-edit-modal';

  const modal =
    ensureEventVorstandModal(
      id,
      'Termin bearbeiten',
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
  Titel
  <input
    id="event-vorstand-title"
    type="text"
    required
    placeholder="Titel">
</label>

<label class="admin-field admin-field--required">
  Datum
  <input
    id="event-vorstand-date"
    type="date"
    required>
</label>

<label class="admin-field">
  Ende (optional)
  <input
    id="event-vorstand-end-date"
    type="date">
</label>

<label class="admin-field admin-field--required">
  Uhrzeit
  <input
    id="event-vorstand-start-time"
    type="time"
    required>
</label>

<label class="admin-field admin-field--required">
  Ort
  <input
    id="event-vorstand-location"
    type="text"
    required
    placeholder="Ort">
</label>

${renderTerminRouteStagesEditorShell()}

<label class="admin-field">
  Beschreibung
  <textarea
    id="event-vorstand-content"
    rows="6"
    placeholder="Beschreibung"></textarea>
</label>

<label class="admin-field">
  Bild
  <input
    id="event-vorstand-image-path"
    type="hidden">
  <div class="admin-media-field-actions">
    <button
      id="event-vorstand-pick-image"
      type="button"
      class="secondary-button">

      Aus Mediathek

    </button>
  </div>
  <div id="event-vorstand-current-image"></div>
</label>

<label class="admin-field">
  Sichtbarkeit
  <select id="event-vorstand-sichtbarkeit">

    <option value="draft">
      Entwurf (nur Vorstand)
    </option>

    <option value="members">
      Nur Mitglieder
    </option>

    <option value="public">
      Öffentlich
    </option>

  </select>
</label>

<div class="member-feedback-modal__actions">

  <button
    type="button"
    class="member-edit-btn"
    id="event-vorstand-save">

    Speichern

  </button>

</div>

</div>
  `;

  if (
    typeof renderMemberEditMediaPreview
      === 'function'
  ) {
    renderAdminSelectedMediaPreview =
      renderMemberEditMediaPreview;
  }

  if (
    typeof bindMediaPickerButton
      === 'function'
  ) {

    bindMediaPickerButton(
      'event-vorstand-pick-image',
      {
        kind: 'image',
        hiddenInputId:
          'event-vorstand-image-path',
        previewContainerId:
          'event-vorstand-current-image',
        title: 'Bild aus Mediathek'
      }
    );

    if (
      typeof initTerminRouteStagesEditor
        === 'function'
    ) {

      initTerminRouteStagesEditor({
        pickerMode: 'vorstand'
      });

    }

  }

  document
    .getElementById('event-vorstand-save')
    ?.addEventListener('click', () => {
      void saveEventFromVorstandModal();
    });

  return modal;

}

async function loadEventIntoVorstandModal(
  eventId
) {

  const { data, error } =
    await window.supabaseClient
      .from(window.siteConfig.tables.termine)
      .select('*')
      .eq('id', eventId)
      .single();

  if (error || !data) {

    alert(
      'Termin konnte nicht geladen werden.'
    );

    return null;

  }

  document
    .getElementById('event-vorstand-title')
    .value =
      data.title || '';

  document
    .getElementById('event-vorstand-date')
    .value =
      data.date
        ? data.date.substring(0, 10)
        : '';

  document
    .getElementById('event-vorstand-end-date')
    .value =
      data.endDate || '';

  document
    .getElementById('event-vorstand-start-time')
    .value =
      data.startTime
      || eventVorstandExtractTimeFromDate(
        data.date
      );

  document
    .getElementById('event-vorstand-location')
    .value =
      data.location || '';

  document
    .getElementById('event-vorstand-content')
    .value =
      data.content || '';

  const routeStages =
    await loadTerminRouteStages(
      eventId
    );

  populateTerminRouteStagesEditor(
    routeStages.length
      ? routeStages
      : buildTerminRouteStagesFromLegacy(
        data
      ),
    {
      pickerMode: 'vorstand'
    }
  );

  document
    .getElementById('event-vorstand-sichtbarkeit')
    .value =
      data.sichtbarkeit
      || window.siteConfig.visibility.draft;

  const imagePreview =
    document.getElementById(
      'event-vorstand-current-image'
    );

  if (imagePreview) {
    imagePreview.innerHTML = '';
  }

  document
    .getElementById('event-vorstand-image-path')
    .value = '';

  if (
    data.image_storage_path
    && typeof applyMemberEditMediaSelection
      === 'function'
  ) {

    applyMemberEditMediaSelection(
      'event-vorstand-current-image',
      'image',
      data.image_storage_path,
      'event-vorstand-image-path'
    );

  }

  ensureEventEditModal().dataset.eventId =
    String(eventId);

  return data;

}

async function saveEventFromVorstandModal() {

  const modal =
    ensureEventEditModal();

  const editId =
    parseInt(
      modal.dataset.eventId,
      10
    );

  if (!editId) {
    return;
  }

  const title =
    document
      .getElementById('event-vorstand-title')
      ?.value
      ?.trim();

  const date =
    document
      .getElementById('event-vorstand-date')
      ?.value;

  const endDate =
    document
      .getElementById('event-vorstand-end-date')
      ?.value
    || '';

  const startTime =
    document
      .getElementById('event-vorstand-start-time')
      ?.value;

  const location =
    document
      .getElementById('event-vorstand-location')
      ?.value
      ?.trim();

  if (
    !title
    || !date
    || !startTime
    || !location
  ) {

    alert(
      'Bitte Titel, Datum, Uhrzeit und Ort ausfüllen.'
    );

    return;

  }

  if (
    date
    && endDate
    && typeof parseTerminDateOnly === 'function'
  ) {

    const startDay =
      parseTerminDateOnly(date);

    const endDay =
      parseTerminDateOnly(endDate);

    if (
      startDay
      && endDay
      && endDay < startDay
    ) {

      alert(
        'Das Enddatum muss am oder nach dem Start liegen.'
      );

      return;

    }

  }

  const routeStages =
    collectTerminRouteStagesFromEditor();

  const content =
    document
      .getElementById('event-vorstand-content')
      ?.value
      || '';

  const sichtbarkeit =
    document
      .getElementById('event-vorstand-sichtbarkeit')
      ?.value
    || window.siteConfig.visibility.draft;

  const slug =
    await resolveUniqueTerminSlug(
      typeof buildMemberContentSlug === 'function'
        ? buildMemberContentSlug(title)
        : title
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-'),
      parseInt(editId, 10)
    );

  const { data: existing } =
    await window.supabaseClient
      .from(window.siteConfig.tables.termine)
      .select('*')
      .eq('id', editId)
      .single();

  let imageStoragePath =
    existing?.image_storage_path || null;

  if (
    typeof resolveMediaPickerSelectionForSave
      === 'function'
  ) {

    const pickedImage =
      resolveMediaPickerSelectionForSave(
        'event-vorstand-image-path',
        imageStoragePath,
        null
      );

    imageStoragePath =
      pickedImage.storagePath;

  }

  const payload = {
    title,
    slug,
    date:
      eventVorstandCombineDateTime(
        date,
        startTime
      ),
    endDate:
      endDate || null,
    startTime,
    location,
    komoot: null,
    content,
    sichtbarkeit,
    category:
      existing?.category || 'vereinsleben',
    updated_at:
      new Date().toISOString(),
    gpx: null,
    gpx_storage_path: null
  };

  if (imageStoragePath) {
    payload.image_storage_path =
      imageStoragePath;
  }

  const { error } =
    await window.supabaseClient
      .from(window.siteConfig.tables.termine)
      .update(payload)
      .eq('id', editId);

  if (error) {

    console.error(error);
    alert(error.message);
    return;

  }

  const stagesResult =
    await saveTerminRouteStages(
      editId,
      routeStages
    );

  if (!stagesResult.ok) {

    alert(
      stagesResult.error?.message
      || 'Routen konnten nicht gespeichert werden.'
    );

    return;

  }

  closeEventVorstandModal(
    'event-vorstand-edit-modal'
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

async function openEventEditModal(eventId) {

  openEventVorstandModal(
    'event-vorstand-edit-modal',
    'Termin bearbeiten'
  );

  const body =
    ensureEventEditModal()
      .querySelector(
        '[data-event-vorstand-modal-body]'
      );

  if (body) {

    body.classList.add('is-loading');

  }

  await loadEventIntoVorstandModal(
    eventId
  );

  if (body) {
    body.classList.remove('is-loading');
  }

}

async function openEventFeedbackResultsModal(
  moduleId,
  title
) {

  const modalId =
    'event-vorstand-results-modal';

  ensureEventVorstandModal(
    modalId,
    title || 'Rückmeldungen',
    'member-feedback-modal__dialog--results'
  );

  const modal =
    document.getElementById(modalId);

  const body =
    modal?.querySelector(
      '[data-event-vorstand-modal-body]'
    );

  if (!body) {
    return;
  }

  body.innerHTML = `
<p class="admin-hint">
  Auswertung wird geladen …
</p>
  `;

  openEventVorstandModal(
    modalId,
    title || 'Rückmeldungen'
  );

  if (
    typeof loadFeedbackResultsForModule
      !== 'function'
  ) {

    body.innerHTML = `
<p class="admin-hint admin-hint--error">
  Auswertung konnte nicht geladen werden.
</p>
    `;

    return;

  }

  await loadFeedbackResultsForModule(
    moduleId,
    body,
    {
      showSummary: false,
      showFreeTextList: false,
      hideEmailColumn: true,
      editable: true,
      onParticipantsChanged: () => {

        window.dispatchEvent(
          new CustomEvent(
            'feedback-module-refresh'
          )
        );

      }
    }
  );

}

function initEventDetailVorstand(
  eventData,
  member,
  options = {}
) {

  renderEventVorstandToolbar(
    eventData,
    null,
    false
  );

}

async function initEventDetailVorstandAsync(
  eventData,
  member
) {

  renderEventVorstandToolbar(
    eventData,
    null,
    false
  );

}

window.addEventListener(
  'member-session-ready',
  () => {

    const list =
      document.getElementById(
        'event-cards'
      );

    const member =
      typeof getCurrentMember === 'function'
        ? getCurrentMember()
        : null;

    if (
      list
      && canShowEventVorstandTools(member)
    ) {

      bindKalenderVorstandActions(list);

      if (
        typeof invalidateTermineCache
          === 'function'
      ) {
        invalidateTermineCache();
      }

      if (
        typeof loadAllUpcomingTerminCards
          === 'function'
      ) {

        void loadAllUpcomingTerminCards({
          vorstandActions: true
        });

      }

      return;

    }

    const eventRoot =
      document.getElementById('event');

    if (
      !eventRoot
      || !eventRoot.dataset.eventId
    ) {
      return;
    }

    if (!canShowEventVorstandTools(member)) {
      return;
    }

    void initEventDetailVorstandAsync(
      {
        id:
          parseInt(
            eventRoot.dataset.eventId,
            10
          ),
        title:
          eventRoot.dataset.eventTitle
          || ''
      },
      member
    );

  }
);
