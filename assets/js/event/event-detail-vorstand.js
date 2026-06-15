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

function renderEventVorstandToolbar(
  eventData
) {

  const actions =
    document.getElementById(
      'event-vorstand-actions'
    );

  if (!actions) {
    return;
  }

  actions.innerHTML = `
<div class="news-vorstand-actions__inner">

<button
  type="button"
  class="news-vorstand-btn"
  data-event-vorstand-edit
  data-event-id="${eventData.id}">

  Bearbeiten

</button>

</div>
  `;

  actions
    .querySelector('[data-event-vorstand-edit]')
    ?.addEventListener('click', () => {

      void openEventEditModal(
        eventData.id
      );

    });

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

<label class="admin-field">
  Komoot
  <input
    id="event-vorstand-komoot"
    type="url"
    placeholder="https://…">
</label>

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
  GPX
  <input
    id="event-vorstand-gpx-path"
    type="hidden">
  <div class="admin-media-field-actions">
    <button
      id="event-vorstand-pick-gpx"
      type="button"
      class="secondary-button">

      GPX aus Mediathek

    </button>
  </div>
  <div id="event-vorstand-current-gpx"></div>
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
    class="member-edit-btn member-edit-btn--secondary"
    data-close-event-vorstand-modal="true">

    Abbrechen

  </button>

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

    bindMediaPickerButton(
      'event-vorstand-pick-gpx',
      {
        kind: 'gpx',
        hiddenInputId:
          'event-vorstand-gpx-path',
        previewContainerId:
          'event-vorstand-current-gpx',
        title: 'GPX aus Mediathek'
      }
    );

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
    .getElementById('event-vorstand-komoot')
    .value =
      data.komoot || '';

  document
    .getElementById('event-vorstand-content')
    .value =
      data.content || '';

  document
    .getElementById('event-vorstand-sichtbarkeit')
    .value =
      data.sichtbarkeit
      || window.siteConfig.visibility.draft;

  const imagePreview =
    document.getElementById(
      'event-vorstand-current-image'
    );

  const gpxPreview =
    document.getElementById(
      'event-vorstand-current-gpx'
    );

  if (imagePreview) {
    imagePreview.innerHTML = '';
  }

  if (gpxPreview) {
    gpxPreview.innerHTML = '';
  }

  document
    .getElementById('event-vorstand-image-path')
    .value = '';

  document
    .getElementById('event-vorstand-gpx-path')
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

  if (
    data.gpx_storage_path
    && typeof applyMemberEditMediaSelection
      === 'function'
  ) {

    applyMemberEditMediaSelection(
      'event-vorstand-current-gpx',
      'gpx',
      data.gpx_storage_path,
      'event-vorstand-gpx-path'
    );

  }

  ensureEventEditModal().dataset.eventId =
    String(eventId);

  ensureEventEditModal().dataset.recurring =
    data.recurring === true
      ? 'true'
      : 'false';

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

  const komoot =
    document
      .getElementById('event-vorstand-komoot')
      ?.value
      ?.trim()
    || '';

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
    typeof buildMemberContentSlug === 'function'
      ? buildMemberContentSlug(title)
      : title
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-');

  const { data: existing } =
    await window.supabaseClient
      .from(window.siteConfig.tables.termine)
      .select('*')
      .eq('id', editId)
      .single();

  let imageStoragePath =
    existing?.image_storage_path || null;

  let gpxStoragePath =
    existing?.gpx_storage_path || null;

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

    const pickedGpx =
      resolveMediaPickerSelectionForSave(
        'event-vorstand-gpx-path',
        gpxStoragePath,
        null
      );

    gpxStoragePath =
      pickedGpx.storagePath;

  }

  const recurring =
    modal.dataset.recurring === 'true';

  const payload = {
    title,
    slug,
    date:
      eventVorstandCombineDateTime(
        date,
        startTime
      ),
    startTime,
    location,
    komoot,
    content,
    sichtbarkeit,
    recurring,
    category:
      existing?.category || 'vereinsleben',
    updated_at:
      new Date().toISOString()
  };

  if (imageStoragePath) {
    payload.image_storage_path =
      imageStoragePath;
  }

  if (gpxStoragePath) {
    payload.gpx_storage_path =
      gpxStoragePath;
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

  closeEventVorstandModal(
    'event-vorstand-edit-modal'
  );

  window.location.reload();

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

function initEventDetailVorstand(
  eventData,
  member,
  options = {}
) {

  if (
    !eventData
    || !canShowEventVorstandTools(member)
    || options.fromErlebtes === true
  ) {
    return;
  }

  renderEventVorstandToolbar(
    eventData
  );

}
