const memberTerminEditParams =
  new URLSearchParams(
    window.location.search
  );

const memberTerminEditId =
  memberTerminEditParams.get('id');

function memberTerminExtractTimeFromDate(
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

function memberTerminCombineDateTime(
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

async function memberTerminAssertEditable(
  member
) {

  if (!memberTerminEditId) {
    return true;
  }

  const { data, error } =
    await window.supabaseClient
      .from(window.siteConfig.tables.termine)
      .select(
        'id, created_by, sichtbarkeit'
      )
      .eq('id', memberTerminEditId)
      .single();

  if (error || !data) {

    alert(
      'Termin konnte nicht geladen werden.'
    );

    window.location.href =
      '/profil/?tab=content';

    return false;

  }

  const draft =
    window.siteConfig.visibility.draft;

  if (
    data.created_by !== member.id
    || data.sichtbarkeit !== draft
  ) {

    alert(
      'Dieser Termin kann nicht mehr bearbeitet werden.'
    );

    window.location.href =
      '/profil/?tab=content';

    return false;

  }

  return true;

}

async function loadMemberTerminEdit() {

  if (!memberTerminEditId) {
    return;
  }

  document
    .getElementById('form-title')
    .innerText =
      'Termin bearbeiten';

  const { data, error } =
    await window.supabaseClient
      .from(window.siteConfig.tables.termine)
      .select('*')
      .eq('id', memberTerminEditId)
      .single();

  if (error) {

    console.error(error);

    alert(
      'Termin konnte nicht geladen werden.'
    );

    return;

  }

  document.getElementById('title').value =
    data.title || '';

  document.getElementById('date').value =
    data.date
      ? data.date.substring(0, 10)
      : '';

  document.getElementById('location').value =
    data.location || '';

  document.getElementById('startTime').value =
    data.startTime
    || memberTerminExtractTimeFromDate(
      data.date
    );

  document.getElementById('komoot').value =
    data.komoot || '';

  document.getElementById('content').value =
    data.content || '';

  if (data.image_storage_path) {

    applyMemberEditMediaSelection(
      'currentImage',
      'image',
      data.image_storage_path,
      'imageStoragePathPick'
    );

  }

  if (data.gpx_storage_path) {

    applyMemberEditMediaSelection(
      'currentGpx',
      'gpx',
      data.gpx_storage_path,
      'gpxStoragePathPick'
    );

  }

}

function memberTerminClearFieldErrors() {

  document
    .querySelectorAll(
      '.member-edit-field--invalid'
    )
    .forEach((element) => {
      element.classList.remove(
        'member-edit-field--invalid'
      );
    });

}

function validateMemberTerminRequiredFields() {

  memberTerminClearFieldErrors();

  const missing = [];

  const titleInput =
    document.getElementById('title');

  const dateInput =
    document.getElementById('date');

  const startTimeInput =
    document.getElementById('startTime');

  const locationInput =
    document.getElementById('location');

  const title =
    titleInput?.value.trim() || '';

  const date =
    dateInput?.value || '';

  const startTime =
    startTimeInput?.value || '';

  const location =
    locationInput?.value.trim() || '';

  if (!title) {
    missing.push('Titel');
    titleInput?.classList.add(
      'member-edit-field--invalid'
    );
  }

  if (!date) {
    missing.push('Datum');
    dateInput?.classList.add(
      'member-edit-field--invalid'
    );
  }

  if (!startTime) {
    missing.push('Uhrzeit');
    startTimeInput?.classList.add(
      'member-edit-field--invalid'
    );
  }

  if (!location) {
    missing.push('Ort');
    locationInput?.classList.add(
      'member-edit-field--invalid'
    );
  }

  if (missing.length) {

    alert(
      `Bitte ausfüllen: ${missing.join(', ')}`
    );

    const firstFieldId = {
      Titel: 'title',
      Datum: 'date',
      Uhrzeit: 'startTime',
      Ort: 'location'
    }[missing[0]];

    document
      .getElementById(firstFieldId)
      ?.focus();

    return false;

  }

  return true;

}

async function saveMemberTerminEdit(
  member
) {

  if (!validateMemberTerminRequiredFields()) {
    return;
  }

  const title =
    document
      .getElementById('title')
      .value
      .trim();

  const date =
    document
      .getElementById('date')
      .value;

  const startTime =
    document
      .getElementById('startTime')
      .value;

  const location =
    document
      .getElementById('location')
      .value
      .trim();

  const komoot =
    document
      .getElementById('komoot')
      .value
      .trim();

  const content =
    document
      .getElementById('content')
      .value
      .trim();

  const slug =
    buildMemberContentSlug(title);

  let imageStoragePath =
    readMediaPickerHiddenPath(
      'imageStoragePathPick'
    );

  let gpxStoragePath =
    readMediaPickerHiddenPath(
      'gpxStoragePathPick'
    );

  const pickedImage =
    resolveMediaPickerSelectionForSave(
      'imageStoragePathPick',
      imageStoragePath,
      null
    );

  imageStoragePath =
    pickedImage.storagePath;

  const pickedGpx =
    resolveMediaPickerSelectionForSave(
      'gpxStoragePathPick',
      gpxStoragePath,
      null
    );

  gpxStoragePath =
    pickedGpx.storagePath;

  const payload = {

    title,

    date:
      memberTerminCombineDateTime(
        date,
        startTime
      ),

    location,

    komoot,

    content,

    startTime:
      startTime || null,

    slug,

    recurring: false,

    category: 'vereinsleben',

    sichtbarkeit:
      window.siteConfig.visibility.draft,

    created_by: member.id

  };

  if (imageStoragePath) {
    payload.image_storage_path =
      imageStoragePath;
  }

  if (gpxStoragePath) {
    payload.gpx_storage_path =
      gpxStoragePath;
  }

  let error;

  if (memberTerminEditId) {

    ({ error } =
      await window.supabaseClient
        .from(window.siteConfig.tables.termine)
        .update(payload)
        .eq('id', memberTerminEditId));

  } else {

    ({ error } =
      await window.supabaseClient
        .from(window.siteConfig.tables.termine)
        .insert([payload]));

  }

  if (error) {

    console.error(error);

    alert(error.message);

    return;

  }

  if (window.memberEditUnsavedGuard) {
    window.memberEditUnsavedGuard.markClean();
  }

  window.location.href =
    '/profil/?tab=content';

}

async function initMemberTerminEditPage() {

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

  const editable =
    await memberTerminAssertEditable(
      member
    );

  if (!editable) {
    return;
  }

  if (
    typeof renderMemberEditMediaPreview
      === 'function'
  ) {
    renderAdminSelectedMediaPreview =
      renderMemberEditMediaPreview;
  }

  bindMediaPickerButton('pick-image-btn', {
    kind: 'image',
    hiddenInputId: 'imageStoragePathPick',
    previewContainerId: 'currentImage',
    title: 'Bild aus Mediathek'
  });

  bindMediaPickerButton('pick-gpx-btn', {
    kind: 'gpx',
    hiddenInputId: 'gpxStoragePathPick',
    previewContainerId: 'currentGpx',
    title: 'GPX aus Mediathek'
  });

  window.memberEditUnsavedGuard =
    initMemberEditUnsavedGuard();

  await loadMemberTerminEdit();

  document
    .getElementById('save-event')
    ?.addEventListener(
      'click',
      () => {
        void saveMemberTerminEdit(member);
      }
    );

}
